import { test, expect } from "@playwright/test";

test.describe("Landing Page", () => {
  test("renders login page for unauthenticated users", async ({ page }) => {
    await page.goto("/");

    // Should show the login/landing content
    await expect(page.getByRole("heading", { name: /shiftdrop/i })).toBeVisible();
  });

  test("has working navigation to landing page", async ({ page }) => {
    await page.goto("/landing");

    // Should show the landing page content
    await expect(page.locator("body")).toContainText(/shift/i);
  });
});
