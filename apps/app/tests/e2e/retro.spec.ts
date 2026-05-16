import { test } from "@playwright/test";

import { enterTextField } from "./helpers/form-fields";
import {
  delayPostResponse,
  expectButtonLoading,
  retroResponse,
} from "./helpers/loading-states";

test.describe("Retro — create and join", () => {
  test("create and join submits show loading while requests are pending", async ({
    page,
  }) => {
    await page.goto("/retro/create");
    await enterTextField(page.locator("#retro-create-name"), "Retro Host");

    const releaseCreate = await delayPostResponse(
      page,
      "**/api/retros",
      retroResponse("RET123", "Retro Host"),
    );
    const createSubmit = page.getByRole("button", { name: /create retro/i });
    await createSubmit.click();
    await expectButtonLoading(createSubmit);
    releaseCreate();

    await page.goto("/retro/join/RET123");
    await enterTextField(page.locator("#retro-join-name"), "Retro Guest");

    const releaseJoin = await delayPostResponse(
      page,
      "**/api/retros/join",
      retroResponse("RET123", "Retro Host"),
    );
    const joinSubmit = page.getByRole("button", { name: /join retro/i });
    await joinSubmit.click();
    await expectButtonLoading(joinSubmit);
    releaseJoin();
  });
});
