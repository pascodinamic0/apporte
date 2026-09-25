import type { PlaywrightTestConfig } from "@playwright/test";
import { devices } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "https://apporte.vercel.app";

const config: PlaywrightTestConfig = {
  testDir: "./tests",
  use: {
    baseURL: BASE_URL,
    trace: "off",
    screenshot: "only-on-failure",
    video: "off",
  },
  projects: [
    { name: "iphone-se", use: { ...devices["iPhone SE"] } },
    { name: "iphone-14-pro-max", use: { ...devices["iPhone 14 Pro Max"] } },
    { name: "iphone-13", use: { ...devices["iPhone 13"] } },
    { name: "pixel-7", use: { ...devices["Pixel 7"] } },
    { name: "pixel-5", use: { ...devices["Pixel 5"] } },
    // Width-specific checks (no device emulation) to verify overflow/clipping
    {
      name: "w375",
      use: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    },
    {
      name: "w390",
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
    },
    {
      name: "w430",
      use: { viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 },
    },
    {
      name: "w360",
      use: { viewport: { width: 360, height: 800 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
    },
    {
      name: "w412",
      use: { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.5 },
    },
  ],
  reporter: [["list"]],
  outputDir: "artifacts/playwright",
};
export default config;

