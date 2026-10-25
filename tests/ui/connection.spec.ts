import { expect, test } from "@playwright/test";

test("aviso de conexão aparece ao ficar offline e some ao reconectar", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Última movimentação" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(
    await page.evaluate(
      async () => (await navigator.serviceWorker.getRegistrations()).length,
    ),
  ).toBe(0);
  await context.setOffline(true);
  const notice = page.getByRole("alert");
  await expect(notice).toContainText("Verifique sua conexão para continuar.");
  await expect(notice).toBeVisible();
  const box = await notice.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  await context.setOffline(false);
  await expect(notice).toHaveCount(0);
});
