import { test, expect } from "@playwright/test";

test.describe("Casual SMS Token Pages", () => {
  test.describe("Verify Invite Page", () => {
    test("shows loading state initially", async ({ page }) => {
      await page.route("**/casual/verify", async () => {
        // Don't fulfill - let it hang to test loading state
      });

      await page.goto("/casual/verify/test-token");

      await expect(page.getByText(/verifying your invite/i)).toBeVisible();
    });

    test("shows success message after verification", async ({ page }) => {
      await page.route("**/casual/verify", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            casualName: "John Doe",
            poolName: "Morning Crew",
          }),
        });
      });

      await page.goto("/casual/verify/valid-token");

      await expect(page.getByText(/you're verified/i)).toBeVisible();
      await expect(page.getByText(/john doe/i)).toBeVisible();
      await expect(page.getByText(/morning crew/i)).toBeVisible();
    });

    test("shows error message when verification fails", async ({ page }) => {
      await page.route("**/casual/verify", async (route) => {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Token expired or invalid",
          }),
        });
      });

      await page.goto("/casual/verify/expired-token");

      await expect(page.getByText(/verification failed/i)).toBeVisible();
      await expect(page.getByText(/token expired or invalid/i)).toBeVisible();
    });
  });

  test.describe("Claim By Token Page", () => {
    test("shows loading state initially", async ({ page }) => {
      // Only intercept fetch requests, not page navigations
      await page.route("**/casual/claim/*", async (route) => {
        if (route.request().resourceType() === "document") {
          await route.continue(); // Let page navigation through
          return;
        }
        // Don't fulfill API request - let it hang to test loading state
      });

      await page.goto("/casual/claim/test-token");

      await expect(page.getByText(/claiming your shift/i)).toBeVisible();
    });

    test("shows success message after claiming", async ({ page }) => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);

      const endTime = new Date(tomorrow);
      endTime.setHours(17, 0, 0, 0);

      await page.route("**/casual/claim/*", async (route) => {
        if (route.request().resourceType() === "document") {
          await route.continue();
          return;
        }
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            casualName: "Jane Smith",
            phoneNumber: "+61400111222",
            shift: {
              id: "test-shift-id",
              startsAt: tomorrow.toISOString(),
              endsAt: endTime.toISOString(),
              spotsNeeded: 3,
              spotsRemaining: 2,
              status: "Open",
            },
          }),
        });
      });

      await page.goto("/casual/claim/valid-token");

      await expect(page.getByRole("heading", { name: /shift claimed/i })).toBeVisible();
      await expect(page.getByText(/jane smith/i)).toBeVisible();
    });

    test("shows conflict error when shift is already filled", async ({ page }) => {
      await page.route("**/casual/claim/*", async (route) => {
        if (route.request().resourceType() === "document") {
          await route.continue();
          return;
        }
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Sorry, this shift was just filled. Try another!",
          }),
        });
      });

      await page.goto("/casual/claim/late-token");

      await expect(page.getByRole("heading", { name: /shift already filled/i })).toBeVisible();
    });

    test("shows error when token is invalid", async ({ page }) => {
      await page.route("**/casual/claim/*", async (route) => {
        if (route.request().resourceType() === "document") {
          await route.continue();
          return;
        }
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error: "Invalid or expired token",
          }),
        });
      });

      await page.goto("/casual/claim/invalid-token");

      await expect(page.getByRole("heading", { name: /claim failed/i })).toBeVisible();
    });
  });

  test.describe("Opt Out Page", () => {
    test("shows success message after opting out", async ({ page }) => {
      await page.route("**/casual/opt-out", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            message: "You have been successfully unsubscribed",
          }),
        });
      });

      await page.goto("/casual/opt-out/valid-token");

      await expect(page.locator("body")).toContainText(/unsubscribed|opted out/i);
    });
  });
});
