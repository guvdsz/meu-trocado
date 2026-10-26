import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("popover segue o padding dos cards e inputs têm foco discreto com transição", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Como o resultado é calculado" })
    .click();
  const popover = page.locator("[data-slot=popover-content]");
  await expect(popover).toBeVisible();
  expect(
    await popover.evaluate((element) => getComputedStyle(element).padding),
  ).toBe("24px");
  await page.goto("/transactions");
  const input = page.getByRole("searchbox", { name: "Buscar por descrição" });
  const border = () =>
    input.evaluate((element) => getComputedStyle(element).borderColor);
  const initial = await border();
  await input.hover();
  await expect.poll(border).not.toBe(initial);
  await input.focus();
  await expect.poll(border).toBe("rgb(85, 122, 67)");
  const focus = await input.evaluate((element) => {
    const css = getComputedStyle(element);
    return {
      outline: css.outlineStyle,
      shadow: css.boxShadow,
      duration: css.transitionDuration,
    };
  });
  expect(focus.outline).toBe("none");
  expect(focus.duration).toContain("0.18s");
  expect(focus.shadow).not.toContain("3px");
  await page
    .getByRole("heading", { name: "Movimentações", exact: true })
    .click();
  await expect.poll(border).toBe(initial);
});

test("visão geral mostra só a última movimentação e mantém o menu lateral", async ({
  page,
}) => {
  const buttonWarnings: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes("nativeButton"))
      buttonWarnings.push(message.text());
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Última movimentação" }),
  ).toBeVisible();
  await expect(page.locator(".latest-activity")).toHaveCount(1);
  await expect(page.locator(".ledger-table")).toHaveCount(0);
  const positions = await page
    .locator(".finance-summary section > p")
    .evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().top),
    );
  expect(Math.max(...positions) - Math.min(...positions)).toBeLessThan(1);
  await expect(page.getByText("De pouquinho")).toHaveCount(0);
  await expect(
    page.getByRole("navigation", { name: "Navegação principal" }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/dashboard.png", fullPage: true });
  await page.getByRole("link", { name: "Ver histórico" }).click();
  await expect(page).toHaveURL(/\/transactions/);
  await expect(page.locator(".ledger-table tbody tr")).toHaveCount(20);
  await page.getByRole("button", { name: "Próxima" }).click();
  await expect(page.locator(".ledger-table tbody tr")).toHaveCount(6);
  await page
    .getByRole("searchbox", { name: "Buscar por descrição" })
    .fill("Registro 26");
  await page.getByRole("button", { name: "Buscar", exact: true }).click();
  await expect(page.locator(".ledger-table tbody tr")).toHaveCount(1);
  expect(buttonWarnings).toEqual([]);
});

test("modais mantêm campos alinhados e ações com tamanho consistente", async ({
  page,
}) => {
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 1050 });
    await page.goto("/");
    for (const action of [
      "Ajustar saldo",
      "Adicionar entrada",
      "Adicionar saída",
    ]) {
      await page.getByRole("button", { name: action, exact: true }).click();
      const dialog = page.getByRole("dialog", { name: action });
      await dialog.evaluate(async (element) => {
        await Promise.all(
          element
            .getAnimations({ subtree: true })
            .map((animation) => animation.finished.catch(() => {})),
        );
      });
      const fields = await dialog
        .locator(".finance-field")
        .evaluateAll((nodes) =>
          nodes.map((node) => {
            const label = node.querySelector("label")!.getBoundingClientRect();
            const control = node
              .querySelector(
                ".money-input, input, .date-trigger, [data-slot=select-trigger]",
              )!
              .getBoundingClientRect();
            return {
              labelX: label.x,
              x: control.x,
              height: control.height,
              right: control.right,
            };
          }),
        );
      for (const field of fields) {
        expect(field.x).toBe(fields[0].x);
        expect(field.labelX).toBe(field.x);
        expect(field.height).toBe(48);
        expect(field.right).toBeLessThanOrEqual(width);
      }
      const submit = await dialog.locator(".finance-submit").boundingBox();
      expect(submit!.height).toBe(44);
      if (width === 1440 && action === "Ajustar saldo")
        await page.screenshot({ path: "test-results/balance-modal.png" });
      await dialog
        .getByRole("button", { name: "Cancelar", exact: true })
        .click();
      await expect(dialog).not.toBeVisible();
    }
  }
});

test("calendário, validação, skeleton durante submit e confirmação temporária", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Adicionar saída", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Adicionar saída" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Salvar saída" }).click();
  await expect(dialog.getByText("Informe uma descrição.")).toBeVisible();
  await dialog.getByLabel("Qual é o valor?").fill("35,50");
  await dialog
    .getByLabel("Descrição", { exact: true })
    .fill("Gasto de teste de interface");
  await dialog.getByRole("button", { name: "Data da movimentação" }).click();
  await expect(page.getByRole("grid")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Salvar saída" }).click();
  await expect(page.locator(".data-skeleton")).toBeVisible();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByText("Gasto de teste de interface", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Saída salva", { exact: true })).toBeVisible();
  await expect(page.locator(".success-notice")).toHaveCount(0);
});

test("o container completo do usuário abre o menu e oferece logout", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Abrir menu da conta de Gustavo" })
    .click();
  await expect(
    page.getByRole("button", { name: "Sair da conta" }),
  ).toBeVisible();
  const email = page.locator(".account-text > span").first();
  await expect(email).toHaveAttribute(
    "title",
    "um.email.demonstrativo.com.nome.muito.grande@example.test",
  );
  const dimensions = await email.evaluate((element) => ({
    height: element.clientHeight,
    lineHeight: parseFloat(getComputedStyle(element).lineHeight),
    width: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }));
  expect(dimensions.height).toBeLessThanOrEqual(dimensions.lineHeight + 1);
  expect(dimensions.scrollWidth).toBeGreaterThan(dimensions.width);
  await expect(
    page.locator(".account-popover").getByRole("button"),
  ).toHaveCount(2);
  await expect(page.locator(".account-popover")).not.toContainText(
    "Minha conta",
  );
  await expect(page.locator(".account-popover")).not.toContainText(
    "example.test",
  );
  await page.getByRole("button", { name: "Sair da conta" }).click();
  await expect(
    page.getByRole("heading", { name: "Sessão encerrada" }),
  ).toBeVisible();
});

test("máscara monetária formata a digitação, colagem e saldo negativo", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Adicionar saída", exact: true })
    .click();
  const amount = page.getByLabel("Qual é o valor?");
  await amount.pressSequentially("123456");
  await expect(amount).toHaveValue("1.234,56");
  await amount.press("ControlOrMeta+A");
  await amount.press("Backspace");
  await expect(amount).toHaveValue("");
  await amount.fill("R$ 9.876,54");
  await expect(amount).toHaveValue("9.876,54");
  await amount.press("Home");
  await amount.press("ArrowRight");
  await amount.press("Delete");
  await expect(amount).toHaveValue("976,54");
  await page.getByRole("button", { name: "Fechar formulário" }).click();
  await page
    .getByRole("button", { name: "Ajustar saldo", exact: true })
    .click();
  const balance = page.getByLabel("Qual é seu saldo real agora?");
  await expect(balance).toHaveValue("4.280,50");
  await page.getByRole("button", { name: "Usar saldo negativo" }).click();
  await expect(balance).toHaveValue("-4.280,50");
});

test("sidebar móvel, teclado e largura de tela pequena", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Abrir navegação" }).click();
  const navigation = page.getByRole("dialog", {
    name: "Navegação",
    exact: true,
  });
  await expect(navigation).toBeVisible();
  await navigation.getByRole("link", { name: "Movimentações" }).click();
  await expect(
    page.getByRole("heading", { name: "Movimentações", exact: true }),
  ).toBeVisible();
  await expect(navigation).not.toBeVisible();
  const widths = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
  await page.screenshot({
    path: "test-results/mobile-history.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Adicionar saída", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("loader animado respeita preferência de movimento reduzido", async ({
  page,
}) => {
  await page.goto("/loader");
  await expect(page.getByRole("status")).toContainText(
    "Organizando seu trocado",
  );
  expect(
    await page
      .locator(".spinner")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("spin");
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page
      .locator(".spinner")
      .evaluate((element) => getComputedStyle(element).animationName),
  ).toBe("none");
});

test("skeleton cobre o conteúdo inteiro antes de mostrar o histórico", async ({
  page,
}) => {
  await page.goto("/transactions?loading=1");
  await expect(page.locator(".data-skeleton")).toHaveCount(1);
  await expect(page.locator(".page-skeleton")).toBeVisible();
  await expect(page.locator("#main-content h1")).toHaveCount(0);
  await expect(page.locator(".history-toolbar")).toHaveCount(0);
  await expect(page.locator(".history-panel")).toHaveCount(0);
  await page.goto("/transactions");
  await expect(page.locator(".page-skeleton")).toHaveCount(0);
  await expect(page.locator(".history-toolbar")).toBeVisible();
  await expect(page.locator(".ledger-table")).toBeVisible();
});

test("descrições e valores cabem nas telas menores sem rolagem lateral", async ({
  page,
}) => {
  for (const width of [320, 360, 390, 600, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/transactions");
    const dimensions = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(dimensions.width).toBeLessThanOrEqual(dimensions.viewport);
    const value = await page.locator(".ledger-amount").first().boundingBox();
    expect(value!.x + value!.width).toBeLessThanOrEqual(width);
    expect(value!.x).toBeGreaterThanOrEqual(0);
  }
});

test("telas e formulário sem violações automáticas WCAG AA", async ({
  page,
}) => {
  for (const route of ["/", "/transactions"]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  }
  await page
    .getByRole("button", { name: "Adicionar saída", exact: true })
    .click();
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(results.violations).toEqual([]);
  await page.keyboard.press("Escape");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/transactions");
  const mobile = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(mobile.violations).toEqual([]);
});
