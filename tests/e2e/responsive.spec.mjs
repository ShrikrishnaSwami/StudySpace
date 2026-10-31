import { test, expect } from "@playwright/test";

const viewports = [
  { name: "small mobile", width: 320, height: 640 },
  { name: "standard mobile", width: 375, height: 812 },
  { name: "large mobile", width: 430, height: 932 },
  { name: "tablet portrait", width: 768, height: 1024 },
  { name: "laptop", width: 1366, height: 768 },
];

for (const viewport of viewports) {
  test(`landing and login pages fit ${viewport.name} (${viewport.width}px)`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    for (const route of ["/", "/login"]) {
      const response = await page.goto(route, { waitUntil: "domcontentloaded" });
      expect(response?.status(), `${route} should load at ${viewport.width}px`).toBeLessThan(400);

      const dimensions = await page.evaluate(() => ({
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        overflowers: Array.from(document.querySelectorAll("body *"))
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return { tag: element.tagName, id: element.id, className: typeof element.className === "string" ? element.className.slice(0, 100) : "", left: Math.round(rect.left), right: Math.round(rect.right), width: Math.round(rect.width) };
          })
          .filter((element) => element.right > window.innerWidth + 1 || element.left < -1)
          .slice(0, 12),
      }));
      expect(
        dimensions.documentWidth,
        `${route} has horizontal overflow at ${viewport.width}px: ${JSON.stringify(dimensions.overflowers)}`,
      ).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
      expect(
        dimensions.bodyWidth,
        `${route} body has horizontal overflow at ${viewport.width}px`,
      ).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
    }
  });
}
