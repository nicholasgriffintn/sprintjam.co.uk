import { test, expect, type BrowserContext } from "@playwright/test";

import { createRoomWithParticipant } from "./helpers/room-journeys";

function createWorkspaceRouteMock() {
  const createdSessionNames: string[] = [];
  const createdSessionRoomKeys: string[] = [];

  const setupRoutes = async (context: BrowserContext) => {
    await context.route("**/api/auth/me", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: 42,
            email: "qa@sprintjam.co.uk",
            name: "Workspace QA",
            organisationId: 7,
          },
          teams: [
            {
              id: 88,
              name: "QA Team",
              organisationId: 7,
              ownerId: 42,
              createdAt: Date.now(),
            },
          ],
        }),
      });
    });

    await context.route("**/api/teams/*/sessions", async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }

      const payload = (await route.request().postDataJSON()) as {
        name?: string;
        roomKey?: string;
      };
      const nextName = payload.name?.trim() ?? "";
      const nextRoomKey = payload.roomKey?.trim() ?? "";
      createdSessionNames.push(nextName);
      createdSessionRoomKeys.push(nextRoomKey);

      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session: {
            id: createdSessionNames.length,
            teamId: 88,
            roomKey: nextRoomKey,
            name: nextName,
            createdById: 42,
            createdAt: Date.now(),
            updatedAt: null,
            completedAt: null,
            metadata: null,
          },
        }),
      });
    });

    await context.route("**/api/sessions/complete", async (route) => {
      const payload = (await route.request().postDataJSON()) as {
        roomKey?: string;
      };
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session: {
            id: 999,
            teamId: 88,
            roomKey: payload.roomKey ?? "unknown",
            name: "Completed from room",
            createdById: 42,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            completedAt: Date.now(),
            metadata: null,
          },
        }),
      });
    });
  };

  return {
    setupRoutes,
    createdSessionNames,
    createdSessionRoomKeys,
  };
}

test.describe("Results", () => {
  test("complete session opens a read-only summary with history active", async ({
    browser,
  }) => {
    const setup = await createRoomWithParticipant(browser, {
      enableTicketQueue: true,
    });
    const { moderatorRoom, cleanup } = setup;

    try {
      const page = moderatorRoom.getPage();

      await page.getByTestId("complete-session-button").click();
      const dialog = page.getByRole("dialog", { name: "Complete session" });
      await expect(dialog).toBeVisible();
      await expect(dialog.getByTestId("queue-history-tab-panel")).toBeVisible();

      await dialog.getByTestId("queue-tab-queue").click();
      await expect(dialog.getByTestId("queue-toggle-add")).toHaveCount(0);
    } finally {
      await cleanup();
    }
  });

  test("saves room to workspace from complete modal and completed summary", async ({
    browser,
  }) => {
    const workspaceMock = createWorkspaceRouteMock();
    const setup = await createRoomWithParticipant(browser, {
      enableTicketQueue: true,
      setupModeratorRoutes: workspaceMock.setupRoutes,
    });
    const { moderatorRoom, cleanup, roomKey } = setup;
    const { createdSessionNames, createdSessionRoomKeys } = workspaceMock;

    try {
      const page = moderatorRoom.getPage();

      await page.getByTestId("complete-session-button").click();
      const completeDialog = page.getByRole("dialog", {
        name: "Complete session",
      });
      await expect(completeDialog).toBeVisible();

      await completeDialog.getByTestId("save-to-workspace-modal-button").click();
      const saveModal = page.getByRole("dialog", { name: "Save to Workspace" });
      await expect(saveModal).toBeVisible();
      await saveModal
        .getByLabel("Session name")
        .fill("Results save from complete modal");
      await saveModal.getByRole("button", { name: "Save to Workspace" }).click();

      await expect
        .poll(() => createdSessionNames.length, { timeout: 5_000 })
        .toBe(1);
      const successMessage = page.getByText("Saved to workspace");
      await expect(successMessage).toBeVisible();
      await expect(successMessage).toBeHidden({ timeout: 5_000 });

      await completeDialog.getByRole("button", { name: "Complete session" }).click();
      await expect(page.getByText("Session summary")).toBeVisible();

      await page.getByTestId("save-to-workspace-screen-button").click();
      const summarySaveModal = page.getByRole("dialog", {
        name: "Save to Workspace",
      });
      await expect(summarySaveModal).toBeVisible();
      await summarySaveModal
        .getByLabel("Session name")
        .fill("Results save from complete screen");
      await summarySaveModal
        .getByRole("button", { name: "Save to Workspace" })
        .click();

      await expect
        .poll(() => createdSessionNames.length, { timeout: 5_000 })
        .toBe(2);
      expect(createdSessionNames).toEqual([
        "Results save from complete modal",
        "Results save from complete screen",
      ]);
      expect(createdSessionRoomKeys).toEqual([roomKey, roomKey]);
    } finally {
      await cleanup();
    }
  });
});
