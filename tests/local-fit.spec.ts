import { test, expect } from "@playwright/test";

const PAGES = ["/demo", "/support", "/cart", "/checkout", "/merchant", "/rider", "/admin"];

test.describe("Local fit check (no data dependency)", () => {
  for (const path of PAGES) {
    test(`no horizontal overflow and header visible: ${path}`, async ({ page }, testInfo) => {
      await page.goto(path);
      // Ensure header exists
      const header = page.locator("header");
      await expect(header).toHaveCount(1);
      // Overflow check
      const hasOverflow = await page.evaluate(() => {
        const sw = document.documentElement.scrollWidth;
        const vw = window.innerWidth;
        return sw > vw;
      });
      expect(hasOverflow, "Expected no horizontal overflow").toBeFalsy();
      // Clip check: header top should be within viewport
      const topInView = await header.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return r.top >= -1 && r.bottom > 0;
      });
      expect(topInView, "Header should be visible and not clipped").toBeTruthy();
      await page.screenshot({
        path: `artifacts/screenshots/${testInfo.project.name}-${path.replace(/\//g, "_")}.png`,
        fullPage: true,
      });
    });
  }
});

