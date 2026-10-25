import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("configuração é obrigatória em todas as rotas e não fecha por Escape ou clique externo", async ({ page }) => {
  for (const route of ["/", "/transactions", "/recurrences", "/settings"]) {
    await page.goto(`${route}?unconfigured`);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await page.mouse.click(2, 2);
    await expect(dialog).toBeVisible();
    await expect(page.getByRole("button", { name: "Salvar configurações" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Adicionar entrada" })).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Fechar", exact: true })).toHaveCount(0);
  }
  await page.getByLabel("Moeda", { exact: true }).selectOption("BRL");
  await page.getByRole("button", { name: "Salvar configurações" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("troca informa todas as exclusões, exige confirmação e libera a nova moeda", async ({ page }) => {
  await page.goto("/settings");
  await page.getByLabel("Moeda", { exact: true }).selectOption("USD");
  await expect(page.getByRole("alert")).toContainText("recorrências");
  const save = page.getByRole("button", { name: "Excluir dados e trocar moeda" });
  await expect(save).toBeDisabled();
  await page.getByLabel("Entendi e confirmo a exclusão dos dados.").check();
  await save.click();
  await expect(page.getByLabel("Moeda", { exact: true })).toHaveValue("USD");
  await page.getByRole("link", { name: "Visão geral" }).click();
  await expect(page.locator(".finance-summary")).toContainText("USD 0,00");
  await page.getByRole("button", { name: "Adicionar entrada" }).click();
  await expect(page.locator(".money-input")).toContainText("USD");
});

test("falha mantém modal obrigatório, moeda escolhida e possibilidade de tentar novamente", async ({ page }) => {
  await page.goto("/?unconfigured&settingsError");
  await page.getByLabel("Moeda", { exact: true }).selectOption("BRL");
  await page.getByRole("button", { name: "Salvar configurações" }).click();
  await expect(page.getByRole("status")).toContainText("Não foi possível salvar");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByLabel("Moeda", { exact: true })).toHaveValue("BRL");
  await expect(page.getByRole("button", { name: "Salvar configurações" })).toBeEnabled();
});

test("modal funciona no celular e USD respeita a localidade com datas completas", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/?unconfigured");
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: "test-results/settings-mobile.png", fullPage: true });
  await page.goto("/transactions?currency=USD&locale=en-US");
  await expect(page.locator(".ledger-table")).toContainText("USD 500.00");
  await expect(page.locator(".ledger-table time").first()).toContainText("2026");
  await expect(page.locator(".ledger-table time").first()).toContainText("Saturday");
});

test.describe("sugestão de fuso do dispositivo", () => {
  test.use({ timezoneId: "America/Los_Angeles" });

  test("sugere o fuso americano sem escolher a moeda e persiste após confirmar", async ({ page }) => {
    await page.goto("/?unconfigured");
    await expect(page.getByLabel("Fuso horário", { exact: true })).toHaveValue("America/Los_Angeles");
    await expect(page.getByLabel("Moeda", { exact: true })).toHaveValue("");
    await page.getByLabel("Moeda", { exact: true }).selectOption("BRL");
    await page.getByRole("button", { name: "Salvar configurações" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("link", { name: "Configurações", exact: true }).click();
    await expect(page.getByLabel("Fuso horário", { exact: true })).toHaveValue("America/Los_Angeles");
  });
});
