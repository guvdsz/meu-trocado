import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("aviso do ajuste cabe em uma linha no mobile e desktop", async ({
  page,
}) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    await page.getByRole("button", { name: "Ajustar saldo" }).click();
    const note = page.getByText("Não altera entradas e saídas.", {
      exact: true,
    });
    await expect(note).toBeVisible();
    const dimensions = await note.evaluate((element) => ({
      height: element.getBoundingClientRect().height,
      line: Number.parseFloat(getComputedStyle(element).lineHeight),
      scroll: element.scrollWidth,
      width: element.clientWidth,
    }));
    expect(dimensions.height).toBeLessThanOrEqual(dimensions.line + 1);
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width);
    if (width === 390)
      await page.screenshot({ path: "test-results/balance-note-mobile.png" });
  }
});

test("cria recorrência com as quatro frequências e permite editar e encerrar", async ({
  page,
}) => {
  await page.goto("/recurrences");
  await page.getByRole("button", { name: "Adicionar recorrência" }).click();
  const dialog = page.getByRole("dialog");
  const repeat = dialog.getByRole("combobox", { name: "Repetição" });
  await expect(repeat).toContainText("Mensal");
  for (const label of [
    "Anual",
    "Semestral",
    "Quinzenal (a cada 15 dias)",
    "Mensal",
  ]) {
    await repeat.click();
    await page.getByRole("option", { name: label, exact: true }).click();
    await expect(repeat).toContainText(label);
  }
  await dialog.getByRole("textbox", { name: "Qual é o valor?" }).fill("2990");
  await dialog.getByRole("textbox", { name: "Descrição" }).fill("Streaming");
  await expect(
    dialog.getByRole("button", { name: "Primeiro lançamento" }),
  ).toHaveText("25/10/2026");
  await dialog.getByRole("button", { name: "Salvar saída" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Streaming" })).toBeVisible();
  await page.getByRole("button", { name: "Editar Streaming" }).click();
  await page
    .getByRole("textbox", { name: "Descrição", exact: true })
    .fill("Streaming atualizado");
  await page.getByRole("button", { name: "Salvar alterações" }).click();
  await expect(
    page.getByRole("heading", { name: "Streaming atualizado" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Encerrar Streaming atualizado" })
    .click();
  await expect(
    page.getByText("Os lançamentos anteriores ficam no histórico."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Streaming atualizado" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Encerrar Streaming atualizado" })
    .click();
  await page.getByRole("button", { name: "Encerrar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Streaming atualizado" }),
  ).toHaveCount(0);
});

test("recorrências são legíveis e acessíveis em telas pequenas", async ({
  page,
}) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/recurrences");
    await expect(
      page.getByRole("heading", { name: "Assinatura de internet" }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(width);
    await page.screenshot({
      path: `test-results/recurrences-${width}.png`,
      fullPage: true,
    });
    await page.getByRole("button", { name: "Adicionar recorrência" }).click();
    expect(
      (await new AxeBuilder({ page }).include('[role="dialog"]').analyze())
        .violations,
    ).toEqual([]);
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  }
});
