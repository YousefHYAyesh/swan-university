import { expect, test } from "@playwright/test";
import { acceptDialogs, signIn } from "./helpers";

test("student registers for a course and drops it again", async ({ page }) => {
  acceptDialogs(page);
  await signIn(page, "student@swan.edu");
  await page.goto("/student/registration?eligible=1");

  const row = page.getByRole("row").filter({ has: page.getByRole("button", { name: "Register" }) }).first();
  const code = (await row.locator("td").first().locator("div").first().textContent())!.split("·")[0].trim();
  await row.getByRole("button", { name: "Register" }).click();
  const mine = page.getByRole("row").filter({ hasText: code }).filter({ has: page.getByRole("button", { name: "Drop" }) });
  await expect(mine).toBeVisible();

  await mine.getByRole("button", { name: "Drop" }).click();
  await expect(mine).toHaveCount(0);
});

test("registration explains why a section is blocked", async ({ page }) => {
  await signIn(page, "student@swan.edu");
  // SEN312 needs SEN244, which the demo student hasn't taken yet.
  await page.goto("/student/registration?q=SEN312");
  await expect(page.getByText("Missing prerequisite: SEN244")).toBeVisible();
});

test("student pages render", async ({ page }) => {
  await signIn(page, "student@swan.edu");
  for (const [path, heading] of [
    ["/student/grades", "Grades"],
    ["/student/degree", "Degree progress"],
    ["/student/transcript", "Transcript"],
    ["/student/schedule", "Weekly schedule"],
    ["/student/requests", "Requests"],
  ]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
  }
});
