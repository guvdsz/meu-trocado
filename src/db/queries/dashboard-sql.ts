import { sql } from "drizzle-orm";
import { monthBounds } from "@/lib/financial";
import { activitySql } from "./history-sql";
import type { TransactionCategory } from "@schemas/transaction/category";

export type Activity = {
  id: string;
  type: "income" | "expense" | "adjustment";
  description: string;
  amount: string;
  day: string;
  newBalance: string | null;
  category: TransactionCategory | null;
};
export type MonthlyTotal = { month: string; income: string; expense: string };
export type CategoryTotal = { category: TransactionCategory; amount: string };
export type TopExpense = {
  id: string;
  description: string;
  amount: string;
  day: string;
  category: TransactionCategory;
};
export type DashboardSnapshot = {
  balance: string;
  version: number;
  income: string;
  expense: string;
  count: number;
  lastActivity: Activity | null;
  chart: MonthlyTotal[];
  categories: CategoryTotal[];
  previousExpense: string;
  topExpenses: TopExpense[];
};

export function dashboardSql(
  accountId: string,
  googleId: string,
  month: string,
) {
  const { start, end } = monthBounds(month);
  return sql`
        with owned_transactions as (
          select * from transactions where account_id = ${accountId}::uuid and google_id = ${googleId}
        ), month_transactions as (
          select * from owned_transactions where occurred_on >= ${start}::date and occurred_on < ${end}::date
        )
        select
            (select balance::text from accounts where id = ${accountId}::uuid and google_id = ${googleId}) as balance,
            (select version from accounts where id = ${accountId}::uuid and google_id = ${googleId}) as version,
            coalesce((select sum(amount) from month_transactions where type = 'income'), 0)::text as income,
            coalesce((select sum(amount) from month_transactions where type = 'expense'), 0)::text as expense,
            (select count(*)::int from month_transactions) as count,
            coalesce((select sum(amount) from owned_transactions where type = 'expense'
              and occurred_on >= (${start}::date - interval '1 month') and occurred_on < ${start}::date), 0)::text as "previousExpense",
            coalesce((select json_agg(json_build_object('category', c.category, 'amount', c.amount) order by c.amount_value desc, c.category) from (
              select category::text, sum(amount)::text as amount, sum(amount) as amount_value
              from month_transactions where type = 'expense' group by category
            ) c), '[]'::json) as categories,
            coalesce((select json_agg(json_build_object('id', t.id, 'description', t.description, 'amount', t.amount, 'day', t.day, 'category', t.category) order by t.amount_value desc, t.day desc, t.id desc) from (
              select id::text, description, amount::text, amount as amount_value, occurred_on::text as day, category::text
              from month_transactions where type = 'expense'
              order by amount_value desc, occurred_on desc, id desc limit 5
            ) t), '[]'::json) as "topExpenses",
            (select row_to_json(a) from (${activitySql(accountId, googleId)}) a
              order by a.created_at desc, a.id desc limit 1) as "lastActivity",
            coalesce((select json_agg(c order by c.month) from (
                select to_char(occurred_on, 'YYYY-MM') as month,
                    coalesce(sum(amount) filter (where type = 'income'), 0)::text as income,
                    coalesce(sum(amount) filter (where type = 'expense'), 0)::text as expense
                from owned_transactions where occurred_on >= (${start}::date - interval '5 months') and occurred_on < ${end}::date
                group by to_char(occurred_on, 'YYYY-MM')
            ) c), '[]'::json) as chart
    `;
}
