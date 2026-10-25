import { expect, test } from "@playwright/test";

test("manifesto e ícones são públicos e têm os tamanhos de instalação", async ({
  request,
}) => {
  const response = await request.get("/manifest.webmanifest", {
    maxRedirects: 0,
  });
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain(
    "application/manifest+json",
  );
  const manifest = await response.json();
  expect(manifest).toMatchObject({
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    name: "Meu Trocado",
  });
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sizes: "192x192", purpose: "any" }),
      expect.objectContaining({ sizes: "512x512", purpose: "any" }),
      expect.objectContaining({ sizes: "512x512", purpose: "maskable" }),
    ]),
  );
  for (const icon of [
    ...manifest.icons,
    { src: "/apple-icon.png", sizes: "180x180" },
  ]) {
    const image = await request.get(icon.src, { maxRedirects: 0 });
    expect(image.status()).toBe(200);
    expect(image.headers()["content-type"]).toContain("image/png");
    const body = await image.body();
    expect(`${body.readUInt32BE(16)}x${body.readUInt32BE(20)}`).toBe(
      icon.sizes,
    );
  }
  for (const url of ["/favicon.ico", "/icon.svg", "/brand/icon.svg"]) {
    const icon = await request.get(url, { maxRedirects: 0 });
    expect(icon.status()).toBe(200);
    expect(icon.headers()["content-type"]).toContain("image/");
  }
  const worker = await request.get("/sw.js", { maxRedirects: 0 });
  expect(worker.status()).toBe(200);
  expect(worker.headers()["cache-control"]).toContain("no-store");
  expect(worker.headers()["content-type"]).toContain("application/javascript");
});

test("worker antigo remove seu cache e se desativa", async ({ page }) => {
  await page.goto("/brand/icon.svg");
  await page.evaluate(async () => {
    const oldCache = await caches.open("meu-trocado-static-v1");
    await oldCache.put("/old-fixture", new Response("Arquivo público antigo"));
    await caches.open("other-application");
    await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    });
  });
  await expect
    .poll(() =>
      page.evaluate(
        async () => (await navigator.serviceWorker.getRegistrations()).length,
      ),
    )
    .toBe(0);
  expect(await page.evaluate(() => caches.keys())).toEqual([
    "other-application",
  ]);
});
