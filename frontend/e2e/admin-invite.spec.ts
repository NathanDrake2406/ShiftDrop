import { test, expect } from "@playwright/test";

const enableE2EAuth = async (page: { addInitScript: (fn: () => void) => Promise<void> }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("shiftdrop:e2e-auth-bypass", "true");
  });
};

const stubPoolDetailsRoutes = async (page: {
  route: (url: string | RegExp, handler: (route: any) => Promise<void>) => Promise<void>;
}) => {
  await page.route("**/pools/**", async (route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      await route.fallback();
      return;
    }

    const path = new URL(request.url()).pathname;

    if (path.match(/\/pools\/[^/]+\/stats$/)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          totalShiftsPosted: 0,
          shiftsFilled: 0,
          shiftsCancelled: 0,
          shiftsOpen: 0,
          totalSpotsClaimed: 0,
          fillRatePercent: 0,
          activeCasuals: 0,
          totalCasuals: 0,
        }),
      });
      return;
    }

    if (path.match(/\/pools\/[^/]+\/shifts$/)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
      return;
    }

    if (path.match(/\/pools\/[^/]+\/admins$/)) {
      await route.fallback();
      return;
    }

    if (path.match(/\/pools\/[^/]+$/)) {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "pool-1",
          name: "Morning Crew",
          createdAt: new Date().toISOString(),
          casuals: [],
        }),
      });
      return;
    }

    await route.fallback();
  });
};

test.describe("Admin Invite Acceptance", () => {
  test.beforeEach(async ({ page }) => {
    await enableE2EAuth(page);
  });

  test("shows loading state while accepting invite", async ({ page }) => {
    await page.route("**/pool-admins/accept/*", async () => {
      // Intentionally hang to keep loading state visible
    });

    await page.goto("/admin/accept/test-token");

    await expect(page.getByText(/accepting invite/i)).toBeVisible();
    await expect(page.getByText(/please wait while we add you to the pool/i)).toBeVisible();
  });

  test("shows success message after accepting invite", async ({ page }) => {
    await page.route("**/pool-admins/accept/*", async (route) => {
      const authHeader = route.request().headers()["authorization"];
      expect(authHeader).toBe("Bearer e2e-token");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          poolName: "Morning Crew",
          message: "You are now an admin of Morning Crew",
        }),
      });
    });

    await page.goto("/admin/accept/valid-token");

    await expect(page.getByRole("heading", { name: /welcome to the team/i })).toBeVisible();
    await expect(page.getByText(/morning crew/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /go to dashboard/i })).toBeVisible();
  });

  test("shows error message when invite is invalid or expired", async ({ page }) => {
    await page.route("**/pool-admins/accept/*", async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({
          error: "Invalid or expired invite token",
        }),
      });
    });

    await page.goto("/admin/accept/expired-token");

    await expect(page.getByRole("heading", { name: /invite failed/i })).toBeVisible();
    await expect(page.getByText(/invalid or expired invite token/i)).toBeVisible();
  });
});

test.describe("Manager Admin Invitations (2IC)", () => {
  test.beforeEach(async ({ page }) => {
    await enableE2EAuth(page);
    await stubPoolDetailsRoutes(page);
  });

  test("invites a new admin and shows pending status", async ({ page }) => {
    const admins = [
      {
        id: "admin-1",
        phoneNumber: "+61400000001",
        name: "Alex Admin",
        invitedAt: new Date().toISOString(),
        acceptedAt: null,
        isAccepted: false,
      },
    ];

    await page.route("**/pools/*/admins", async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(admins),
        });
        return;
      }

      if (request.method() === "POST") {
        const authHeader = request.headers()["authorization"];
        expect(authHeader).toBe("Bearer e2e-token");

        const body = JSON.parse(request.postData() ?? "{}");
        expect(body).toMatchObject({
          phoneNumber: "+61400111222",
          name: "Taylor Boss",
        });

        const createdAdmin = {
          id: "admin-2",
          phoneNumber: "+61400111222",
          name: "Taylor Boss",
          invitedAt: new Date().toISOString(),
          acceptedAt: null,
          isAccepted: false,
        };
        admins.push(createdAdmin);

        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(createdAdmin),
        });
        return;
      }

      await route.fallback();
    });

    await page.goto("/manager/pool/pool-1");
    await page.getByRole("button", { name: /team/i }).click();
    await page.getByRole("button", { name: /\+ add admin/i }).click();
    await page.getByLabel(/admin name/i).fill("Taylor Boss");
    await page.getByLabel(/phone number/i).fill("+61400111222");
    await page.getByRole("button", { name: "Add Admin", exact: true }).click();

    await expect(page.getByText(/invite sent to \+61400111222/i)).toBeVisible();
    await expect(page.getByText(/taylor boss/i)).toBeVisible();
    // Both admins show as Pending, so just verify there are pending badges
    await expect(page.getByText("Pending").first()).toBeVisible();
  });

  test("shows clear error when admin already exists", async ({ page }) => {
    await page.route("**/pools/*/admins", async (route) => {
      const request = route.request();
      if (request.method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "admin-1",
              phoneNumber: "+61400000001",
              name: "Alex Admin",
              invitedAt: new Date().toISOString(),
              acceptedAt: null,
              isAccepted: false,
            },
          ]),
        });
        return;
      }

      if (request.method() === "POST") {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error: "An admin with this phone number already exists",
          }),
        });
        return;
      }

      await route.fallback();
    });

    await page.goto("/manager/pool/pool-1");
    await page.getByRole("button", { name: /team/i }).click();
    await page.getByRole("button", { name: /\+ add admin/i }).click();
    await page.getByLabel(/admin name/i).fill("Alex Admin");
    await page.getByLabel(/phone number/i).fill("+61400000001");
    await page.getByRole("button", { name: "Add Admin", exact: true }).click();

    await expect(page.getByText(/already exists/i)).toBeVisible();
  });
});
