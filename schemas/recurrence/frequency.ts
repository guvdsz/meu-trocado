export const recurrenceFrequencies = [
  "monthly",
  "yearly",
  "semiannual",
  "fortnightly",
] as const;
export type RecurrenceFrequency = (typeof recurrenceFrequencies)[number];
export const recurrenceLabels: Record<RecurrenceFrequency, string> = {
  monthly: "Mensal",
  yearly: "Anual",
  semiannual: "Semestral",
  fortnightly: "Quinzenal (a cada 15 dias)",
};
