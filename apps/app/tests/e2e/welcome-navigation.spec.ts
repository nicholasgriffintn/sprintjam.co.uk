import { test, expect } from "@playwright/test";

import { WelcomePage } from "./pageObjects/welcome-page";

for (const destination of ["create", "join"] as const) {
  test(`welcome navigation tolerates a delayed ${destination} transition`, async ({
    page,
  }) => {
    await page.route("**/*", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `
          <button data-testid="${destination}-room-button">Continue</button>
          <script>
            const button = document.querySelector("button");
            let clicks = 0;
            button.addEventListener("click", () => {
              document.body.dataset.clicks = String(++clicks);
              button.disabled = true;
              setTimeout(() => {
                history.pushState({}, "", "/${destination}");
                button.remove();
                const submit = document.createElement("button");
                submit.dataset.testid = "${destination}-room-submit";
                submit.textContent = "Submit";
                document.body.append(submit);
              }, 4_000);
            });
          </script>
        `,
      }),
    );
    await page.goto("/");

    const welcome = new WelcomePage(page);
    if (destination === "create") {
      await welcome.startCreateRoom();
    } else {
      await welcome.startJoinRoom();
    }

    await expect(page.locator("body")).toHaveAttribute("data-clicks", "1");
  });
}
