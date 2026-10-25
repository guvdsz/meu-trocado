import "dotenv/config";
import { expect, test } from "@playwright/test";

test("Clerk exige senha e não oferece conexões sociais", async ({ request }) => {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!;
  const domain = Buffer.from(key.split("_").slice(2).join("_"), "base64").toString().replace(/\$$/, "");
  const response = await request.get(`https://${domain}/v1/environment`);
  expect(response.ok()).toBe(true);
  const environment = await response.json();
  const settings = environment.response?.user_settings ?? environment.user_settings;
  expect(settings.attributes.email_address.enabled).toBe(true);
  expect(settings.attributes.password.enabled).toBe(true);
  expect(settings.attributes.password.required).toBe(true);
  expect(Object.values(settings.social ?? {}).some((provider) => (provider as { enabled: boolean }).enabled)).toBe(false);
});

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
      await expect(page.getByRole("textbox", { name: /e-mail/i })).toBeVisible({
        timeout: 45_000,
      });
      await expect(loader).toHaveCount(0);
      // Clerk asks for the identifier before presenting the password step.
      await expect(page.getByRole("button", { name: /continuar/i })).toBeVisible();
      await expect(
        page.locator('[data-localization-key*="socialButtons"]'),
      ).toHaveCount(0);
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
