import { test, expect } from "@playwright/test";

const DEMO_USERS = [
  { id: "u_customer", role: "customer", dest: "/" },
  { id: "u_merchant", role: "merchant", dest: "/merchant" },
  { id: "u_rider", role: "rider", dest: "/rider" },
  { id: "u_admin", role: "admin", dest: "/admin" },
];

test.describe("Mobile fit smoke", () => {
  test("home fits without horizontal scroll and header visible", async ({ page }, testInfo) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Apporte/);
    // No horizontal scroll
    const width = await page.evaluate(() => document.documentElement.scrollWidth);
    const vw = await page.evaluate(() => window.innerWidth);
    expect(width).toBeLessThanOrEqual(vw);
    await page.screenshot({ path: `artifacts/screenshots/${testInfo.project.name}-home.png`, fullPage: true });
  });

  for (const u of DEMO_USERS) {
    test(`${u.role} login and landing fits`, async ({ page }, testInfo) => {
      await page.goto("/demo");
      // Click the corresponding button
      const locator = page.getByRole("button", { name: "Se connecter" }).nth(
        ["customer", "merchant", "rider", "admin"].indexOf(u.role)
      );
      await locator.click();
      await page.waitForURL(u.dest, { timeout: 10000 });
      // No horizontal scroll
      const width = await page.evaluate(() => document.documentElement.scrollWidth);
      const vw = await page.evaluate(() => window.innerWidth);
      expect(width).toBeLessThanOrEqual(vw);
      await page.screenshot({
        path: `artifacts/screenshots/${testInfo.project.name}-${u.role}.png`,
        fullPage: true,
      });
    });
  }
});

