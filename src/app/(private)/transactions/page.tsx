import { connection } from "next/server";
import { redirect } from "next/navigation";
import { requireGoogleIdentity } from "@/lib/auth";
import { localToday, resolveMonth } from "@/lib/financial";
import { historyFiltersSchema } from "@schemas/transaction/history-filters";
import { getHistory } from "@/db/queries/history";
import { HISTORY_PAGE_SIZE } from "@/db/queries/history-sql";
import { HistoryScreen } from "./_components/history-screen";

type Search = Promise<Record<string, string | string[] | undefined>>;
async function HistoryContent({ searchParams }: { searchParams: Search }) {
  await connection();
  const params = await searchParams;
  const today = localToday();
  const filters = {
    ...historyFiltersSchema.parse({
      type: params.type,
      query: params.q,
      page: params.page,
    }),
    month: resolveMonth(params.month, today),
  };
  const identity = await requireGoogleIdentity();
  const data = await getHistory(identity, filters);
  const lastPage = Math.max(1, Math.ceil(data.total / HISTORY_PAGE_SIZE));
  if (filters.page > lastPage) {
    const query = new URLSearchParams({
      month: filters.month,
      type: filters.type,
      q: filters.query,
      page: String(lastPage),
    });
    redirect(`/transactions?${query}`);
  }
  return <HistoryScreen data={data} filters={filters} today={today} />;
}

export default function TransactionsPage(props: { searchParams: Search }) {
  // The route's loading.tsx is the single loading boundary for this screen.
  return <HistoryContent {...props} />;
}
