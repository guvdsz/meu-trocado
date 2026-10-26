"use client";

import { useFinancialFormat, usePreferences } from "@/app/(private)/_components/preferences-context";

import { categoryLabels } from "@schemas/transaction/category";
import { expenseShare } from "@/lib/financial-analysis";
import { fromCents, toCents } from "@/lib/financial";
import type { DashboardData } from "@/db/queries/dashboard";
import { IconText } from "@/app/_components/shared/icon-text";

export function MonthlyAnalysis({ data }: { data: DashboardData }) {
  const { formatMoney, formatDay } = useFinancialFormat();
  const { locale } = usePreferences();
  const leading = data.categories[0];
  const largest = data.topExpenses[0];
  const change = toCents(data.expense) - toCents(data.previousExpense);
  const difference = fromCents(change < BigInt(0) ? -change : change);
  return (
    <section
      className="finance-panel overflow-hidden rounded-2xl border bg-white monthly-analysis"
      aria-labelledby="monthly-analysis-title"
    >
      <div className="financial-chart-heading px-6 pt-6 pb-4 [&_h2]:m-0 [&_h2]:text-lg [&_h2]:leading-[1.4] [&_h2]:font-semibold [&_h2]:tracking-[-0.35px] [&_p]:mt-1.5 [&_p]:text-sm [&_p]:leading-normal [&_p]:text-muted-foreground max-[650px]:px-[18px] max-[650px]:pt-5 max-[650px]:[&_h2]:text-[17px]">
        <div>
          <h2 id="monthly-analysis-title">Seu mês em detalhes</h2>
          <p>Comparações do mês selecionado</p>
        </div>
      </div>
      <dl className="monthly-findings m-0 px-6 [&>div]:border-b [&>div]:py-3 [&_dt]:mb-1 [&_dt]:text-sm [&_dt]:text-muted-foreground [&_dd]:m-0 [&_dd]:text-base [&_dd]:font-[550] [&_dd]:wrap-anywhere [&_dd>span]:block [&_dd>span]:text-sm [&_dd>span]:leading-normal [&_dd>span]:font-normal [&_dd>span]:text-muted-foreground max-[650px]:px-[18px]">
        <div>
          <dt>Categoria com mais gastos</dt>
          <dd className="monthly-finding-value flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 [&>strong]:font-[inherit]">
            {leading ? (
              <>
                <strong>{categoryLabels[leading.category]}</strong>
                <span>
                  {expenseShare(leading.amount, data.expense)} das despesas
                </span>
              </>
            ) : (
              "Nenhuma saída neste mês"
            )}
          </dd>
        </div>
        <div>
          <dt>Maior despesa</dt>
          <dd className="monthly-finding-value flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 [&>strong]:font-[inherit]">
            {largest ? (
              <>
                <strong>{largest.description}</strong>
                <span>{formatMoney(largest.amount)}</span>
              </>
            ) : (
              "Nenhuma despesa registrada"
            )}
          </dd>
        </div>
        <div>
          <dt>Em relação ao mês anterior</dt>
          <dd>
            {change === BigInt(0) ? (
              "O total de gastos se manteve igual"
            ) : (
              <>
                {formatMoney(difference)}{" "}
                {change > BigInt(0) ? "a mais" : "a menos"} em saídas
              </>
            )}
          </dd>
        </div>
      </dl>
      <div className="top-expenses px-6 pt-5 pb-6 [&_h3]:mt-0 [&_h3]:mb-2.5 [&_h3]:text-base [&_h3]:font-semibold [&_ol]:m-0 [&_ol]:list-none [&_ol]:p-0 [&_li]:grid [&_li]:grid-cols-[minmax(0,1fr)_auto] [&_li]:items-center [&_li]:gap-3 [&_li]:border-b [&_li]:border-muted [&_li]:py-3 [&_li:last-child]:border-0 [&_li:last-child]:pb-0 [&_strong]:text-sm [&_strong]:leading-normal [&_strong]:font-[550] [&>p]:text-sm [&>p]:text-muted-foreground [&_li>strong]:text-right [&_li>strong]:tabular-nums max-[650px]:px-[18px] max-[650px]:pb-5 max-[650px]:[&_li]:grid-cols-[minmax(0,1fr)] max-[650px]:[&_li]:gap-2 max-[650px]:[&_li>strong]:text-left">
        <h3>Top 5 despesas</h3>
        {data.topExpenses.length ? (
          <ol>
            {data.topExpenses.map((expense, index) => (
              <li key={expense.id}>
                <IconText
                  className="top-expense-summary [--text-icon-size:46px] grid min-w-0 grid-cols-[var(--text-icon-size)_minmax(0,1fr)] items-start gap-3"
                  textClassName="top-expense-details grid min-w-0 gap-1 text-sm leading-normal wrap-anywhere [&>strong]:block [&>span]:block [&>span]:text-muted-foreground"
                  icon={
                    <span
                      className="expense-rank grid size-(--text-icon-size) max-h-28 max-w-28 place-items-center rounded-lg bg-muted text-sm text-[#53634b]"
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                  }
                >
                  <div className="top-expense-heading flex min-w-0 items-baseline gap-2">
                    <strong className="min-w-0 text-sm!">{expense.description}</strong>
                    <strong className="top-expense-mobile-amount shrink-0 whitespace-nowrap text-sm! tabular-nums min-[651px]:hidden">
                      {formatMoney(expense.amount)}
                    </strong>
                  </div>
                  <span>
                    {categoryLabels[expense.category]} ·{" "}
                    <time dateTime={expense.day} title={formatDay(expense.day)}>
                      <span className="max-[650px]:hidden">{formatDay(expense.day)}</span>
                      <span className="min-[651px]:hidden">
                        {new Date(`${expense.day}T12:00:00Z`).toLocaleDateString(locale, {
                          day: "numeric",
                          month: "short",
                          timeZone: "UTC",
                        })}
                      </span>
                    </time>
                  </span>
                </IconText>
                <strong className="max-[650px]:hidden">{formatMoney(expense.amount)}</strong>
              </li>
            ))}
          </ol>
        ) : (
          <p>Suas maiores despesas aparecerão aqui.</p>
        )}
      </div>
    </section>
  );
}
