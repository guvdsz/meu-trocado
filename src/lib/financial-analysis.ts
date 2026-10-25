import { fromCents, toCents } from "./financial";
import type { MonthlyTotal } from "@/db/queries/financial-types";

export function monthlySeries(rows: MonthlyTotal[], month: string, locale = "pt-BR") {
  const end = new Date(`${month}-01T12:00:00Z`);
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(end);
    date.setUTCMonth(date.getUTCMonth() - 5 + index);
    const key = date.toISOString().slice(0, 7);
    const row = rows.find((item) => item.month === key);
    const income = row?.income ?? "0.00";
    const expense = row?.expense ?? "0.00";
    const net = fromCents(toCents(income) - toCents(expense));
    return {
      month: key,
      label: date
        .toLocaleDateString(locale, { month: "short", timeZone: "UTC" })
        .replace(".", ""),
      fullLabel: date.toLocaleDateString(locale, {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }),
      income,
      expense,
      net,
      // Floating point is used only for SVG geometry; labels and arithmetic use exact decimal strings.
      incomeValue: Number(toCents(income)) / 100,
      expenseValue: Number(toCents(expense)) / 100,
      netValue: Number(toCents(net)) / 100,
    };
  });
}

export function expenseShare(amount: string, total: string) {
  const divisor = toCents(total);
  if (divisor <= BigInt(0)) return "0%";
  const tenths =
    (toCents(amount) * BigInt(1000) + divisor / BigInt(2)) / divisor;
  return `${(Number(tenths) / 10).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}
