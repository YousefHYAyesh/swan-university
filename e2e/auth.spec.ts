import { expect, test } from "@playwright/test";
import { Pool } from "pg";
import { signIn } from "./helpers";

test("each role lands on its own portal", async ({ page }) => {
  for (const [email, path] of [
    ["student@swan.edu", "/student"],
    ["professor@swan.edu", "/professor"],
    ["registrar@swan.edu", "/registrar"],
    ["admin@swan.edu", "/admin"],
  ]) {
    await page.context().clearCookies();
    await signIn(page, email);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
  }
});

test("wrong password shows a clear error and stays on login", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("student@swan.edu");
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("That email and password don't match an active account.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("signed-out visitors are sent to login", async ({ page }) => {
  await page.goto("/registrar/students");
  await expect(page).toHaveURL(/\/login\?next=%2Fregistrar%2Fstudents/);
});

test("a student can't open other roles' areas", async ({ page }) => {
  await signIn(page, "student@swan.edu");
  for (const path of ["/admin/users", "/registrar/grades", "/professor"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/student$/);
  }
});

test("a professor can't open another instructor's section", async ({ page }) => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const { rows } = await pool.query(
    `select s.id from sections s join users u on u.id = s.instructor_id where u.email <> 'professor@swan.edu' limit 1`,
  );
  await pool.end();
  await signIn(page, "professor@swan.edu");
  const res = await page.goto(`/professor/sections/${rows[0].id}`);
  expect(res?.status()).toBe(404);
});
