import { test, expect } from "@playwright/test";

test.describe("Feedback form", () => {
  test("submits feedback and shows issue link", async ({ page }) => {
    let capturedBody: unknown;
    await page.route("**/api/feedback", async (route) => {
      capturedBody = await route.request().postDataJSON();
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          issue: {
            key: "FEED-123",
            number: 123,
            repository: "sprintjam/project",
            url: "https://github.com/sprintjam/project/issues/123",
          },
        }),
      });
    });

    await page.goto("/");
    const footerButton = page.getByRole("button", { name: "Send feedback" });
    await footerButton.click();
    const modal = page.getByRole("dialog", { name: "Send feedback" });
    await expect(modal).toBeVisible();

    await modal.getByLabel("Title").fill("Great app, small nit");
    await modal.getByRole("button", { name: "Bug report" }).click();
    await modal
      .getByLabel("Details")
      .fill("Found a small layout issue on the welcome page.");
    await modal.getByLabel("Contact (optional)").fill("@qa-user");

    await modal.getByRole("button", { name: "Send feedback" }).click();
    await expect(modal.getByText(/Thank you for your feedback/i)).toBeVisible();
    await expect(modal.getByRole("link", { name: /FEED-123|#123/i })).toBeVisible();

    expect(capturedBody).toMatchObject({
      title: "Great app, small nit",
      labels: ["bug"],
      description: expect.stringContaining("layout issue"),
    });
  });

  test("enforces validation and surfaces backend errors", async ({ page }) => {
    await page.route("**/api/feedback", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Backend unavailable" }),
      }),
    );

    await page.goto("/");
    const footerButton = page.getByRole("button", { name: "Send feedback" });
    await footerButton.click();

    const modal = page.getByRole("dialog", { name: "Send feedback" });
    const submitButton = modal.getByRole("button", { name: "Send feedback" });
    await expect(submitButton).toBeDisabled();

    await modal.getByLabel("Title").fill("Validation QA");
    await modal.getByLabel("Details").fill("Testing backend failure path.");
    await expect(submitButton).toBeEnabled();

    await submitButton.click();
    await expect(
      modal.getByText(/Backend unavailable|Failed to send feedback/i),
    ).toBeVisible();
  });
});
