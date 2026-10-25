import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("top 5 mantém número compacto, descrição e categoria separados e valor legível", async ({
  page,
}) => {
  for (const width of [320, 390, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/?single=1");
    const row = page.locator(".top-expenses li").first();
    await row.scrollIntoViewIfNeeded();
    const rank = await row.locator(".expense-rank").boundingBox();
    const description = await row
      .locator(".top-expense-details > strong")
      .boundingBox();
    const metadata = await row
      .locator(".top-expense-details > span")
      .boundingBox();
    const amount = await row.locator(":scope > strong").boundingBox();
    expect(rank!.width).toBeLessThan(80);
    expect(rank!.width).toBeCloseTo(rank!.height, 0);
    expect(rank!.y).toBe(description!.y);
    expect(rank!.x + rank!.width).toBeLessThan(description!.x);
    expect(metadata!.y).toBeGreaterThanOrEqual(
      description!.y + description!.height,
    );
    expect(amount!.x + amount!.width).toBeLessThanOrEqual(width);
    if (width >= 1440) {
      expect(amount!.x).toBeGreaterThanOrEqual(
        description!.x + description!.width,
      );
      expect(amount!.y).toBeLessThan(metadata!.y + metadata!.height);
    }
    if (width === 390 || width === 1440)
      await page
        .locator(".monthly-analysis")
        .screenshot({ path: `test-results/top-expenses-${width}.png` });
  }
});

test("visão geral tem três gráficos, última movimentação em card e análises do mês", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("[data-slot=chart]")).toHaveCount(3);
  await expect(page.locator(".latest-activity h3")).toHaveText(
    "Último registro demonstrativo",
  );
  await expect(page.locator(".ledger-table")).toHaveCount(0);
  await expect(page.locator(".monthly-findings")).toContainText("Moradia");
  await expect(page.locator(".monthly-findings")).toContainText("54,1%");
  await expect(page.locator(".monthly-findings")).toContainText("R$ 250,00");
  await expect(page.locator(".top-expenses li")).toHaveCount(5);
  await expect(page.locator(".top-expenses li").first()).toContainText(
    "Aluguel",
  );
  await expect(page.locator(".category-breakdown li")).toHaveCount(5);
  await page
    .locator(".finance-chart")
    .first()
    .locator(".recharts-bar-rectangle")
    .first()
    .hover();
  await expect(page.locator(".finance-chart-tooltip")).toBeVisible();
  await expect(page.locator(".finance-chart-tooltip")).toContainText(
    "R$ 4.200,00",
  );
});

test("categoria segue o tamanho dos campos e é salva no card e histórico", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Adicionar saída", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Adicionar saída" });
  await dialog.evaluate(async (element) => {
    await Promise.all(
      element
        .getAnimations({ subtree: true })
        .map((animation) => animation.finished.catch(() => {})),
    );
  });
  const category = dialog.getByRole("combobox", { name: "Categoria" });
  await expect(category).toContainText("Outros(as)");
  const box = await category.boundingBox();
  const description = await dialog
    .getByLabel("Descrição", { exact: true })
    .boundingBox();
  expect(box!.height).toBe(48);
  expect(box!.width).toBe(description!.width);
  await category.click();
  await page.getByRole("option", { name: "Alimentação", exact: true }).click();
  await dialog.getByLabel("Qual é o valor?").fill("18,90");
  await dialog
    .getByLabel("Descrição", { exact: true })
    .fill("Lanche com categoria");
  await page.screenshot({ path: "test-results/category-modal.png" });
  await dialog.getByRole("button", { name: "Salvar saída" }).click();
  await expect(page.locator(".latest-activity")).toContainText("Alimentação");
  await page.getByRole("link", { name: "Ver histórico" }).click();
  await expect(page.locator(".ledger-table tbody tr").first()).toContainText(
    "Alimentação",
  );
});

test("gráficos e análises cabem em telas pequenas e possuem estados vazios", async ({
  page,
}) => {
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    await expect(page.locator("[data-slot=chart]")).toHaveCount(3);
    const iconBox = await page
      .locator(".latest-activity .ledger-icon")
      .boundingBox();
    const textBox = await page
      .locator(".latest-activity-details")
      .boundingBox();
    expect(iconBox!.y).toBe(textBox!.y);
    expect(iconBox!.height).toBeCloseTo(Math.min(textBox!.height, 112), 0);
    expect(iconBox!.width).toBeCloseTo(iconBox!.height, 0);
    expect(iconBox!.x + iconBox!.width).toBeLessThan(textBox!.x);
    const rankBox = await page.locator(".expense-rank").first().boundingBox();
    const expenseTextBox = await page
      .locator(".top-expense-details")
      .first()
      .boundingBox();
    expect(rankBox!.height).toBeCloseTo(Math.min(expenseTextBox!.height, 112), 0);
    expect(rankBox!.width).toBeCloseTo(rankBox!.height, 0);
    expect(rankBox!.x + rankBox!.width).toBeLessThan(expenseTextBox!.x);
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
      .toBeLessThanOrEqual(width);
    if (width === 390)
      await page.screenshot({
        path: "test-results/mobile-analysis.png",
        fullPage: true,
      });
  }
  await page.goto("/?empty=1");
  await expect(
    page.getByText("Nenhuma saída no mês selecionado."),
  ).toBeVisible();
  await expect(page.locator(".latest-activity")).toContainText(
    "Nenhuma movimentação",
  );
  await expect(page.locator(".top-expenses")).toContainText(
    "Suas maiores despesas aparecerão aqui.",
  );
});

test("estado genérico de erro tem card acessível e tenta novamente nas duas telas", async ({
  page,
}) => {
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const path of ["/", "/transactions"]) {
      await page.goto(`${path}?error=1`);
      const card = page.locator(".unavailable-state-card");
      await expect(card).toBeVisible();
      const box = await card.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(
        (
          await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
            .analyze()
        ).violations,
      ).toEqual([]);
      if (width === 1440 && path === "/")
        await page.screenshot({ path: "test-results/unavailable-state.png" });
      await page.getByRole("button", { name: "Tentar novamente" }).click();
      await expect(card).toHaveCount(0);
    }
  }
});

test("barra isolada fica centralizada e detalhes do mês mantêm sua altura natural", async ({
  page,
}) => {
  for (const path of ["/", "/?single=1"]) {
    await page.goto(path);
    const categories = await page.locator(".expense-categories").boundingBox();
    const details = await page.locator(".monthly-analysis").boundingBox();
    expect(details!.y).toBe(categories!.y);
    const content = await page.locator(".top-expenses").boundingBox();
    expect(
      details!.y + details!.height - content!.y - content!.height,
    ).toBeLessThan(2);
  }
  const chart = page.locator(".finance-chart").first();
  const bar = chart.locator(".recharts-bar-rectangle path").last();
  const tick = chart
    .locator("text.recharts-cartesian-axis-tick-value")
    .filter({ hasText: /^out$/ });
  const barBox = await bar.boundingBox();
  const tickBox = await tick.boundingBox();
  expect(
    Math.abs(barBox!.x + barBox!.width / 2 - tickBox!.x - tickBox!.width / 2),
  ).toBeLessThan(2);
  const donut = page.locator(".expense-categories");
  await donut.scrollIntoViewIfNeeded();
  const sector = donut.locator(".recharts-pie-sector").first();
  const sectorBox = await sector.boundingBox();
  await sector.hover({
    position: { x: sectorBox!.width - 10, y: sectorBox!.height / 2 },
  });
  await expect(donut.locator(".finance-chart-tooltip")).toContainText(
    "R$ 123,00",
  );
  await page.screenshot({ path: "test-results/single-expense-tooltip.png" });
});

test("menu mobile permanece no topo ao rolar e acompanha a página atual", async ({
  page,
}) => {
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/");
    const header = page.locator(".finance-topbar");
    const initial = await header.boundingBox();
    await page.evaluate(() => window.scrollTo(0, 1200));
    const scrolled = await header.boundingBox();
    expect(scrolled).toEqual(initial);
    expect(scrolled!.width).toBeLessThan(width - 32);
    await expect(header).toContainText("Visão geral");
    await page.getByRole("button", { name: "Abrir navegação" }).click();
    await page
      .getByRole("dialog")
      .getByRole("link", { name: "Movimentações" })
      .click();
    await expect(header).toContainText("Movimentações");
    await page.evaluate(() => window.scrollTo(0, 800));
    expect((await header.boundingBox())!.y).toBe(initial!.y);
    await page.getByRole("button", { name: "Abrir navegação" }).click();
    await expect(
      page.getByRole("dialog", { name: "Navegação", exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Fechar navegação" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    if (width === 390)
      await page.screenshot({
        path: "test-results/mobile-floating-header.png",
      });
  }
});
