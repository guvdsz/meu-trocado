import { expect, test } from "@playwright/test";

for (const width of [390, 1440]) {
  test(`login reserva espaço durante o carregamento real do Clerk em ${width}px`, async ({
    page,
  }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width, height: 1000 });
    let release!: () => void;
    const ready = new Promise<void>((resolve) => {
      release = resolve;
    });
    await page.route(
      (url) => /clerk|accounts\.dev/.test(url.hostname),
      async (route) => {
        await ready;
        await route.continue();
      },
    );
    try {
      await page.goto("/auth/sign-in", { waitUntil: "domcontentloaded" });
      const loader = page
        .getByRole("status")
        .filter({ hasText: "Preparando seu acesso" });
      await expect(loader).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      const positions = () =>
        page
          .locator(
            ".login-form-heading,.login-clerk,.login-trust,.login-form-footer",
          )
          .evaluateAll((elements) =>
            elements.map((element) => {
              const { x, y, width, height } = element.getBoundingClientRect();
              return { x, y, width, height };
            }),
          );
      const before = await positions();
      await page.screenshot({
        path: `test-results/login-loading-${width}.png`,
        fullPage: true,
      });
      release();
      await expect(page.getByRole("button", { name: /Google/i })).toBeVisible({
        timeout: 45_000,
      });
      await expect(loader).toHaveCount(0);
      expect(await positions()).toEqual(before);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(width);
      await page.screenshot({
        path: `test-results/login-ready-${width}.png`,
        fullPage: true,
      });
    } finally {
      release();
    }
  });
}
