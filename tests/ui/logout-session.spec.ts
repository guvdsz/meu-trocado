import { expect, test } from "@playwright/test";

test("logout e novo login com a mesma conta limpam popup e estado de saída no layout preservado", async ({ page }) => {
  await page.goto("/?preserveShell");
  const account = page.getByRole("button", { name: "Abrir menu da conta de Gustavo" });
  for (let attempt = 0; attempt < 2; attempt++) {
    await account.click();
    await page.getByRole("button", { name: "Sair da conta", exact: true }).click();
    await expect(page.getByRole("button", { name: "Saindo…", exact: true })).toBeDisabled();
    await expect(page.getByRole("heading", { name: "Sessão encerrada" })).toBeVisible();
    await expect(page.locator(".account-popover")).not.toBeVisible();
    await page.getByRole("button", { name: "Entrar novamente", exact: true }).click();
    await expect(page.locator(".finance-balance")).toBeVisible();
    await expect(page.locator(".account-popover")).not.toBeVisible();
    await account.click();
    await expect(page.getByRole("button", { name: "Sair da conta", exact: true })).toBeEnabled();
    await expect(page.getByText("Saindo…", { exact: true })).toHaveCount(0);
    await account.click();
  }
});

test("falha no logout libera o botão e permite tentar novamente", async ({ page }) => {
  await page.goto("/?logoutError");
  await page.getByRole("button", { name: "Abrir menu da conta de Gustavo" }).click();
  await page.getByRole("button", { name: "Sair da conta", exact: true }).click();
  await expect(page.locator("[data-slot=toast]")).toContainText("Não foi possível sair. Tente novamente.");
  await expect(page.getByRole("button", { name: "Sair da conta", exact: true })).toBeEnabled();
  await expect(page.getByText("Saindo…", { exact: true })).toHaveCount(0);
  await expect(page.locator(".finance-balance")).toBeVisible();
});
