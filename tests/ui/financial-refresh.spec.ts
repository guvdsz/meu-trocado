import { expect, test } from "@playwright/test";

test("navegação mostra a aba e o skeleton antes da resposta do servidor", async ({
  page,
}) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/?navigationDelay=1400");
    if (width < 800)
      await page.getByRole("button", { name: "Abrir navegação" }).click();
    await page
      .getByRole("link", { name: "Movimentações", exact: true })
      .last()
      .click();
    await expect(page.locator(".history-page-skeleton")).toBeVisible({
      timeout: 700,
    });
    await expect(page.locator(".topbar-page-title")).toHaveText(
      "Movimentações",
    );
    expect(new URL(page.url()).pathname).toBe("/");
    await expect(page).toHaveURL(/\/transactions$/);
    await expect(page.locator(".ledger-table")).toBeVisible();
    await expect(page.locator(".history-page-skeleton")).toHaveCount(0);
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
