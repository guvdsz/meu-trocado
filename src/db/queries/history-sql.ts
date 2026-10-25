import { sql } from "drizzle-orm";
import { monthBounds } from "@/lib/financial";

export type HistoryFilters = {
  month: string;
  type: "all" | "income" | "expense" | "adjustment";
  query: string;
  page: number;
};
export const HISTORY_PAGE_SIZE = 20;

export function activitySql(accountId: string, googleId: string) {
  return sql`
    select id::text, type::text, description, amount::text,
      occurred_on::text as day, created_at, null::text as "newBalance", category::text
    from transactions where account_id = ${accountId}::uuid and google_id = ${googleId}
    union all
    select id::text, 'adjustment', reason, (new_balance - previous_balance)::text,
      (created_at at time zone 'America/Sao_Paulo')::date::text, created_at, new_balance::text, null::text
    from balance_adjustments where account_id = ${accountId}::uuid and google_id = ${googleId}
  `;
}

export function historySql(
  accountId: string,
  googleId: string,
  filters: HistoryFilters,
) {
  const { start, end } = monthBounds(filters.month);
  return sql`
    with filtered as (
      select * from (${activitySql(accountId, googleId)}) a
      where day::date >= ${start}::date and day::date < ${end}::date
        and (${filters.type} = 'all' or type = ${filters.type})
        and position(lower(${filters.query}) in lower(description)) > 0
    )
    select (select count(*)::int from filtered) as total,
      coalesce((select json_agg(p order by p.day desc, p.created_at desc, p.id desc) from (
        select * from filtered order by day desc, created_at desc, id desc
        limit ${HISTORY_PAGE_SIZE} offset ${(filters.page - 1) * HISTORY_PAGE_SIZE}
      ) p), '[]'::json) as activity
  `;
}
