import { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

export async function checkA11y(
  page: Page,
  options?: {
    disableRules?: string[];
    runOnly?: string[];
    context?: string | { include?: string[][]; exclude?: string[][] };
  },
) {
  const axeBuilder = new AxeBuilder({ page });

  if (options?.disableRules) {
    axeBuilder.disableRules(options.disableRules);
  }

  if (options?.runOnly) {
    axeBuilder.withTags(options.runOnly);
  }

  if (options?.context) {
    if (typeof options.context === "string") {
      axeBuilder.include(options.context);
    } else {
      if (options.context.include) {
        options.context.include.forEach((selector) =>
          axeBuilder.include(selector),
        );
      }
      if (options.context.exclude) {
        options.context.exclude.forEach((selector) =>
          axeBuilder.exclude(selector),
        );
      }
    }
  }

  return await axeBuilder.analyze();
}

export async function waitForA11yReady(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForLoadState("domcontentloaded");
  // Wait a bit for any animations to settle
  await page.waitForTimeout(300);
}

export async function scrollToBottom(page: Page) {
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
}
