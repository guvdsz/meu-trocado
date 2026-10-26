import { expect, test } from "@playwright/test";

test("seletor mostra o mês escolhido enquanto os dados ainda carregam", async ({ page }) => {
  for (const path of ["/", "/transactions"]) {
    await page.goto(`${path}?navigationDelay=1400`);
    const picker = page.getByRole("button", { name: /Alterar período/ });
    await picker.click();
    await page.getByRole("button", { name: "set", exact: true }).click();
    await expect(picker).toHaveText("Setembro de 2026", { timeout: 700 });
    await expect(page.locator(".data-skeleton")).toBeVisible();
    expect(new URL(page.url()).searchParams.get("month")).toBeNull();
    await expect(page).toHaveURL(/month=2026-09/);
    await expect(page.locator(".data-skeleton")).toHaveCount(0);
    await expect(picker).toHaveText("Setembro de 2026");
    await picker.click();
    await expect(page.getByRole("button", { name: "set", exact: true })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Mês atual", exact: true }).click();
    await expect(picker).toHaveText("Outubro de 2026");
  }
});

test("navegação mostra a aba e o skeleton antes da resposta do servidor", async ({
  page,
}) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [title, path] of [
      ["Movimentações", "/transactions"],
      ["Recorrências", "/recurrences"],
      ["Configurações", "/settings"],
    ]) {
      await page.goto("/?navigationDelay=1400");
      if (width < 800)
        await page.getByRole("button", { name: "Abrir navegação" }).click();
      await page
        .getByRole("link", { name: title, exact: true })
        .last()
        .click();
      await expect(page.locator(".page-skeleton")).toBeVisible({
        timeout: 700,
      });
      await expect(page.locator(".topbar-page-title")).toHaveText(title);
      await expect(page.locator("#main-content h1")).toHaveCount(0);
      await expect(page.locator("#main-content .finance-panel")).toHaveCount(0);
      expect(new URL(page.url()).pathname).toBe("/");
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.locator(".page-skeleton")).toHaveCount(0);
    }
  }
});

test("salvar entrada ou saída mantém carregamento e mostra o saldo atualizado ao fechar o modal", async ({
  page,
}) => {
  for (const [action, save, amount, expectedBalance] of [
    ["Adicionar entrada", "Salvar entrada", "10000", "R$ 4.380,50"],
    ["Adicionar saída", "Salvar saída", "10000", "R$ 4.180,50"],
  ]) {
    await page.goto("/");
    await page.getByRole("button", { name: action, exact: true }).click();
    const dialog = page.getByRole("dialog", { name: action, exact: true });
    await dialog.getByLabel("Qual é o valor?").fill(amount);
    await dialog
      .getByLabel("Descrição", { exact: true })
      .fill("Movimentação de teste");
    await dialog.getByRole("button", { name: save, exact: true }).click();
    await expect(page.locator(".data-skeleton")).toBeVisible();
    await expect(page.locator(".finance-balance")).toHaveCount(0);
    await expect(dialog).not.toBeVisible();
    await expect(page.locator(".finance-balance")).toContainText(
      expectedBalance,
    );
    await expect(page.locator(".data-skeleton")).toHaveCount(0);
  }
});
