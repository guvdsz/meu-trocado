import { expect, test } from "@playwright/test";

test("categoria combina com tipo e busca, reinicia a página e permite limpar os filtros", async ({ page }) => {
  await page.goto("/transactions?month=2026-10&type=expense&q=Registro&page=2");
  const category = page.getByRole("combobox", { name: "Categoria", exact: true });
  await expect(category).toContainText("Todas as categorias");
  await category.click();
  await page.getByRole("option", { name: "Alimentação", exact: true }).click();
  await expect(page).toHaveURL(/category=food/);
  const params = new URL(page.url()).searchParams;
  expect(params.get("page")).toBe("1");
  expect(params.get("month")).toBe("2026-10");
  expect(params.get("type")).toBe("expense");
  expect(params.get("q")).toBe("Registro");
  await expect(page.locator(".ledger-table tbody tr").first()).toBeVisible();
  for (const row of await page.locator(".ledger-table tbody tr").all()) {
    await expect(row).toContainText("Alimentação");
    await expect(row).toContainText("Saída");
  }
  await page.getByRole("searchbox", { name: "Buscar por descrição" }).fill("Sem resultado");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(category).toContainText("Alimentação");
  await expect(page.getByRole("heading", { name: "Nenhuma movimentação encontrada" })).toBeVisible();
  await page.getByRole("button", { name: "Limpar filtros" }).click();
  await expect(category).toContainText("Todas as categorias");
  await expect(page.getByRole("combobox", { name: "Tipo de movimentação" })).toContainText("Todos os tipos");
  await expect(page.getByRole("searchbox", { name: "Buscar por descrição" })).toHaveValue("");
});

test("filtros e skeleton de página cabem no desktop e no mobile", async ({ page }) => {
  for (const width of [320, 390, 900, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/transactions?category=salary");
    await expect(page.getByRole("combobox", { name: "Categoria", exact: true })).toContainText("Salário");
    const toolbar = page.locator(".history-toolbar");
    await expect(page.getByRole("button", { name: /Adicionar (entrada|saída)/ })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    for (const control of await toolbar.locator("input[type=search], [data-slot=select-trigger], .period-trigger").all()) {
      const bounds = await control.boundingBox();
      expect(bounds!.height).toBe(44);
      expect(bounds!.x).toBeGreaterThanOrEqual(0);
      expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    }
    if (width === 1440) {
      const period = await toolbar.locator(".period-trigger").boundingBox();
      const type = await toolbar.locator("#history-type").boundingBox();
      const category = await toolbar.locator("#history-category").boundingBox();
      const search = await toolbar.locator("#history-search").boundingBox();
      expect(period!.y).toBe(type!.y);
      expect(category!.y).toBe(type!.y);
      expect(search!.y).toBe(type!.y);
      expect(period!.width).toBe(195);
      expect(type!.width).toBe(200);
      expect(category!.width).toBe(220);
      await toolbar.screenshot({ path: "test-results/history-filters-desktop.png" });
    }
    if (width === 390)
      await toolbar.screenshot({ path: "test-results/history-filters-mobile.png" });
    await page.goto("/transactions?loading=1");
    await expect(page.locator(".page-skeleton")).toBeVisible();
    await expect(toolbar).toHaveCount(0);
    await expect(page.locator("#main-content h1")).toHaveCount(0);
    await expect(page.locator(".history-panel")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});
