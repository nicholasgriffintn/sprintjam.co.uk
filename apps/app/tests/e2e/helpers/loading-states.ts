import { expect, type Locator, type Page } from "@playwright/test";

function createDeferredResponse() {
  let release!: () => void;
  const wait = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { release, wait };
}

export async function delayPostResponse(
  page: Page,
  url: string,
  payload: unknown,
): Promise<() => void> {
  const deferred = createDeferredResponse();

  await page.route(url, async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    await deferred.wait;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(payload),
    });
  });

  return deferred.release;
}

export async function expectButtonLoading(button: Locator) {
  await expect(button.locator(".animate-spin")).toBeVisible();
}

export function roomResponse(key: string, moderator: string) {
  return {
    room: {
      key,
      moderator,
      users: [moderator],
      votes: {},
      connectedUsers: { [moderator]: true },
      status: "active",
      settings: {},
      createdAt: Date.now(),
    },
  };
}

export function standupResponse(key: string, moderator: string) {
  return {
    success: true,
    standup: {
      key,
      moderator,
      users: [moderator],
      connectedUsers: { [moderator]: true },
      respondedUsers: [],
      responses: [],
      status: "active",
      createdAt: Date.now(),
    },
  };
}

export function retroResponse(key: string, moderator: string) {
  return {
    success: true,
    retro: {
      key,
      moderator,
      users: [moderator],
      connectedUsers: { [moderator]: true },
      columns: [],
      cards: [],
      votes: {},
      phase: "input",
      template: "start-stop-continue",
      status: "active",
      createdAt: Date.now(),
    },
  };
}
