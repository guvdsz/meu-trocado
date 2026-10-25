type ExternalAccount = {
  provider: string;
  providerUserId: string;
};

export function getGoogleId(
  externalAccounts: readonly ExternalAccount[],
): string | null {
  const accounts = externalAccounts.filter(
    (account) =>
      (account.provider === "oauth_google" || account.provider === "google") &&
      account.providerUserId.trim().length > 0,
  );
  // Do not silently switch financial ownership when several Google accounts are linked.
  const ids = [...new Set(accounts.map((account) => account.providerUserId))];
  return ids.length === 1 ? ids[0] : null;
}
