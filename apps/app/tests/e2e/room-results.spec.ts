import { test, expect, type BrowserContext } from "@playwright/test";

import { createRoomWithParticipant } from "./helpers/room-journeys";

function createWorkspaceRouteMock() {
  const createdSessionNames: string[] = [];
  const createdSessionRoomKeys: string[] = [];
  let linkedSession:
    | {
        id: number;
        teamId: number;
        roomKey: string;
        name: string;
        createdById: number;
        createdAt: number;
        updatedAt: number | null;
        completedAt: number | null;
        metadata: null;
      }
    | null = null;

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

    await context.route("**/api/sessions/by-room?*", async (route) => {
      const roomKey = new URL(route.request().url()).searchParams.get("roomKey");
      if (!linkedSession || linkedSession.roomKey !== roomKey) {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({
            code: "not_found",
            message: "Session not found",
          }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ session: linkedSession }),
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
      linkedSession = {
        id: createdSessionNames.length + 1,
        teamId: 88,
        roomKey: nextRoomKey,
        name: nextName,
        createdById: 42,
        createdAt: Date.now(),
        updatedAt: null,
        completedAt: null,
        metadata: null,
      };
      createdSessionNames.push(nextName);
      createdSessionRoomKeys.push(nextRoomKey);

      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          session: linkedSession,
        }),
      });
    });

    await context.route("**/api/teams/*/sessions/*", async (route) => {
      if (route.request().method() !== "PUT") {
        await route.fallback();
        return;
      }

      const payload = (await route.request().postDataJSON()) as { name?: string };
      if (!linkedSession) {
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({
            code: "not_found",
            message: "Session not found",
          }),
        });
        return;
      }

      linkedSession = {
        ...linkedSession,
        name: payload.name?.trim() ?? linkedSession.name,
        updatedAt: Date.now(),
      };

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          session: linkedSession,
        }),
      });
    });

    await context.route("**/api/sessions/complete", async (route) => {
      const payload = (await route.request().postDataJSON()) as {
        roomKey?: string;
      };
      linkedSession = linkedSession
        ? {
            ...linkedSession,
            roomKey: payload.roomKey ?? linkedSession.roomKey,
            updatedAt: Date.now(),
            completedAt: Date.now(),
          }
        : null;

      route.fulfill({
        status: linkedSession ? 200 : 404,
        contentType: "application/json",
        body: JSON.stringify(
          linkedSession
            ? { session: linkedSession }
            : {
                code: "not_found",
                message: "Session not found",
              },
        ),
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

  test("saves a room once and lets the linked session be renamed", async ({
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
      await expect(saveModal).toBeHidden({ timeout: 5_000 });

      await expect(
        completeDialog.getByTestId("save-to-workspace-modal-button"),
      ).toHaveCount(0);
      await expect(
        completeDialog.getByRole("button", { name: "Rename workspace session" }),
      ).toBeVisible();

      await completeDialog.getByRole("button", { name: "Complete session" }).click();
      await expect(completeDialog).toBeHidden();
      await expect(page.getByText("Session summary")).toBeVisible();
      await expect(page.getByTestId("save-to-workspace-screen-button")).toHaveCount(0);

      await page
        .getByText("Session summary")
        .locator("..")
        .getByRole("button", { name: "Rename workspace session" })
        .click();
      const summarySaveModal = page.getByRole("dialog", {
        name: "Edit Workspace Session",
      });
      await expect(summarySaveModal).toBeVisible();
      await summarySaveModal.getByLabel("Session name").fill("Renamed after save");
      await summarySaveModal.getByRole("button", { name: "Update session" }).click();

      await expect
        .poll(() => createdSessionNames.length, { timeout: 5_000 })
        .toBe(1);
      await expect(page.getByText("Renamed after save")).toBeVisible();
      expect(createdSessionNames).toEqual(["Results save from complete modal"]);
      expect(createdSessionRoomKeys).toEqual([roomKey]);
    } finally {
      await cleanup();
    }
  });
});
