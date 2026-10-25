export const currencies = ["BRL", "USD", "EUR", "GBP", "CAD", "AUD"] as const;
export type Currency = (typeof currencies)[number];
export const currencyNames: Record<Currency, string> = {
  BRL: "Real brasileiro", USD: "Dólar americano", EUR: "Euro",
  GBP: "Libra esterlina", CAD: "Dólar canadense", AUD: "Dólar australiano",
};
export type Preferences = {
  currency: string | null;
  configured: boolean;
  hasFinancialData?: boolean;
  timeZone: string;
  locale: string;
  settingsVersion: number;
};
export const defaultPreferences: Preferences = {
  currency: "BRL", configured: true, timeZone: "America/Sao_Paulo",
  locale: "pt-BR", settingsVersion: 0,
};
export class PreferencesConflict extends Error {
  constructor(message = "Suas configurações mudaram. Atualize a página e abra o formulário novamente.") { super(message); }
}
export function requireConfigured<T extends { currency: string | null; currencyConfiguredAt: Date | null; settingsVersion: number }>(account: T | undefined, expected?: number): asserts account is T {
  if (!account?.currencyConfiguredAt || !currencies.includes(account.currency as Currency))
    throw new PreferencesConflict("Configure sua moeda antes de utilizar a aplicação.");
  if (expected !== undefined && expected !== account.settingsVersion) throw new PreferencesConflict();
}
export function accountPreferences(account: { currency: string | null; currencyConfiguredAt: Date | null; timeZone: string; locale: string; settingsVersion: number }): Preferences {
  return { currency: account.currency, configured: !!account.currencyConfiguredAt,
    timeZone: account.timeZone, locale: account.locale, settingsVersion: account.settingsVersion };
}
