import { expect, type Locator } from "@playwright/test";

export async function enterTextField(field: Locator, value: string) {
  await expect(field).toBeVisible();
  await field.fill(value);
  await expect(field).toHaveValue(value);
  await field.blur();
}
