import { expect, test } from "@playwright/test";

test("envio de senha mantém o loader até a resposta e permite tentar novamente", async ({ page }) => {
  await page.goto("/auth/sign-in");
  await expect(page.getByRole("textbox", { name: /e-mail/i })).toBeVisible();

  // Use the real pinned Clerk UI, but keep the entire sign-in attempt local.
  // No credentials, verification messages, or account changes reach Clerk.
  await page.route((url) => url.pathname.startsWith("/v1/"), (route) => route.abort());
  await page.evaluate(() => {
    const signIn = Reflect.get(window, "Clerk").client.signIn;
    signIn.fromJSON({
      object: "sign_in",
      id: "sia_local_preview",
      status: "needs_first_factor",
      supported_identifiers: ["email_address"],
      identifier: "preview@example.com",
      user_data: {},
      supported_first_factors: [{ strategy: "password" }],
      supported_second_factors: [],
      first_factor_verification: null,
      second_factor_verification: null,
      created_session_id: null,
      timezone: null,
    });
    signIn.attemptFirstFactor = () => new Promise((_resolve, reject) => {
      Reflect.set(window, "rejectPreviewSignIn", () => reject({
        constructor: { kind: "ClerkAPIResponseError" },
        clerkError: true,
        status: 422,
        errors: [{
          code: "form_password_incorrect",
          message: "Senha incorreta.",
          longMessage: "Senha incorreta.",
          meta: { paramName: "password" },
        }],
      }));
    });
    history.pushState({}, "", "/auth/sign-in/factor-one");
    dispatchEvent(new PopStateEvent("popstate"));
  });

  await page.getByLabel(/^senha$/i).fill("local-preview-only");
  const button = page.locator("button.cl-formButtonPrimary");
  const spinner = button.getByLabel("Loading");
  const initialSize = await button.boundingBox();
  await button.click();
  await expect(spinner).toBeVisible();
  await expect(button).toBeDisabled();
  await expect.poll(async () => (await button.boundingBox())?.height).toBe(initialSize?.height);

  await page.evaluate(() => Reflect.get(window, "rejectPreviewSignIn")());
  await expect(spinner).toHaveCount(0);
  await expect(button).toBeEnabled();
  await expect(page.getByTestId("form-feedback-error")).toHaveText("Senha incorreta.");

  // Submitting with Enter must use the same pending state after a failed attempt.
  await page.getByLabel(/^senha$/i).press("Enter");
  await expect(spinner).toBeVisible();
  await expect(button).toBeDisabled();
  await page.evaluate(() => Reflect.get(window, "rejectPreviewSignIn")());
  await expect(button).toBeEnabled();
});
