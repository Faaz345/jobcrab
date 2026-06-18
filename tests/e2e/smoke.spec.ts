import { test, expect } from "@playwright/test";

test("homepage redirects to dashboard", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/.*dashboard/);
});

test("dashboard page renders sidebar", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.locator("text=JobCrab")).toBeVisible();
  await expect(page.locator("text=Dashboard")).toBeVisible();
  await expect(page.locator("text=Jobs")).toBeVisible();
  await expect(page.locator("text=Resumes")).toBeVisible();
});
