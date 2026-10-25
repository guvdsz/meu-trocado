import type { RecurrenceFrequency } from "@schemas/recurrence/frequency";
import type { TransactionCategory } from "@schemas/transaction/category";

export type RecurringExpense = {
  id: string;
  description: string;
  amount: string;
  category: TransactionCategory;
  frequency: RecurrenceFrequency;
  startsOn: string;
  nextDueOn: string;
  version: number;
  endedAt: string | null;
};

// Calendar arithmetic always starts from the original date, so February does not
// shift a charge scheduled for the 31st to the 28th in subsequent months.
export function recurrenceDate(
  start: string,
  frequency: RecurrenceFrequency,
  occurrence: number,
): string {
  if (!Number.isInteger(occurrence) || occurrence < 0)
    throw new Error("Invalid occurrence");
  const [year, month, day] = start.split("-").map(Number);
  if (frequency === "fortnightly")
    return new Date(Date.UTC(year, month - 1, day + occurrence * 15))
      .toISOString()
      .slice(0, 10);
  const step = frequency === "yearly" ? 12 : frequency === "semiannual" ? 6 : 1;
  const first = new Date(Date.UTC(year, month - 1 + occurrence * step, 1));
  const lastDay = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  first.setUTCDate(Math.min(day, lastDay));
  return first.toISOString().slice(0, 10);
}

export function formatRecurrenceDate(date: string) {
  return date.split("-").reverse().join("/");
}
