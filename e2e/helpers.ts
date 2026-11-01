import { expect, type Page } from "@playwright/test";

const PASSWORD = "swan-demo";

export async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login/);
}


/** Accept the confirm() dialogs some buttons show. */
export function acceptDialogs(page: Page) {
  page.on("dialog", (d) => d.accept());
}
