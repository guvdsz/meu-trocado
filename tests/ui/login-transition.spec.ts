import { expect, test } from "@playwright/test";

test("login mantém o loader na ativação e até terminar o redirecionamento", async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/auth/sign-in/factor-one");
    await page.getByRole("button", { name: "Concluir login de teste" }).click();
    const loader = page.getByRole("status");
    await expect(loader).toBeVisible();
    await expect(page.locator(".login-clerk")).toHaveAttribute("aria-busy", "true");
    await expect(loader).toHaveText("Abrindo sua visão geral…");
    await expect(loader.locator(".spinner")).toBeVisible();
    expect(new URL(page.url()).pathname).toBe("/auth/sign-in/factor-one");
    await page.locator(".login-clerk").screenshot({ path: `test-results/login-redirect-${width}.png` });
    await expect(page).toHaveURL(/\/$/);
    await expect(page.locator(".finance-balance")).toBeVisible();
    await expect(page.locator(".login-clerk")).toHaveCount(0);
  }
});
