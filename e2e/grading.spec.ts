import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { acceptDialogs, signIn } from "./helpers";

test("gradebook rejects a score above the maximum and saves nothing", async ({ page }) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const { rows } = await pool.query(
    `select s.id from sections s
       join users u on u.id = s.instructor_id
       join terms t on t.id = s.term_id
      where u.email = 'professor@swan.edu' and t.is_current and s.grade_status = 'DRAFT'
      limit 1`,
  );
  await pool.end();
  await signIn(page, "professor@swan.edu");
  await page.goto(`/professor/sections/${rows[0].id}`);
  // No assessment allows more than 1000 points.
  await page.getByRole("textbox").first().fill("5000");
  await page.getByRole("button", { name: "Save scores" }).click();
  await expect(page.getByText(/need fixing; nothing was saved/)).toBeVisible();
});

test("submit, approve, and the student sees the final grade", async ({ browser }) => {
  // Registrar approves the section the seed left in "submitted" state.
  const reg = await browser.newPage();
  acceptDialogs(reg);
  await signIn(reg, "registrar@swan.edu");
  await reg.goto("/registrar/grades");
  const link = reg.locator("a[href^='/registrar/grades/']").first();
  const sectionName = (await link.textContent())!;
  await link.click();
  await reg.getByRole("button", { name: "Approve grades" }).click();
  await expect(reg.getByText(/Approved grades for .* students were notified\./)).toBeVisible();
  await reg.close();

  // The demo student is in that section: the grade is final and a notification arrived.
  const stu = await browser.newPage();
  await signIn(stu, "student@swan.edu");
  await expect(stu.getByLabel(/Notifications, \d+ unread/)).toBeVisible();
  await stu.goto("/student/grades");
  const code = sectionName.split(" ")[0];
  // The innermost section is the course card; once approved it shows the final result.
  const card = stu.locator("section").filter({ has: stu.locator(`#${code}`) }).last();
  await expect(card.getByText(/Final result \d+(\.\d+)?%/)).toBeVisible();
  await expect(card.getByText("Awaiting registrar approval")).toHaveCount(0);
  await stu.close();
});
