import { expect, test } from "@playwright/test";

test("cron exige autenticação própria e recorrências exigem login", async ({ request }) => {
  const attempts: Record<string, string>[] = [{}, { Authorization: "Bearer invalid-test-secret" }];
  for (const headers of attempts) {
    const response = await request.get("/api/cron/recurrences", { headers, maxRedirects: 0 });
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
  }
  for (const path of ["/recurrences", "/settings"]) {
    const privatePage = await request.get(path, { maxRedirects: 0 });
    expect([302, 303, 307]).toContain(privatePage.status());
    expect(privatePage.headers().location).toContain("/auth/sign-in");
  }
});
