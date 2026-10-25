import { categoryLabels } from "@schemas/transaction/category";
import { expenseShare } from "@/lib/financial-analysis";
import { formatDay, formatMoney, fromCents, toCents } from "@/lib/financial";
import type { DashboardData } from "@/db/queries/dashboard";
import { IconText } from "@/app/_components/shared/icon-text";
import styles from "./monthly-analysis.module.css";

export function MonthlyAnalysis({ data }: { data: DashboardData }) {
  const leading = data.categories[0];
  const largest = data.topExpenses[0];
  const change = toCents(data.expense) - toCents(data.previousExpense);
  const difference = fromCents(change < BigInt(0) ? -change : change);
  return (
    <section
      className="finance-panel monthly-analysis"
      aria-labelledby="monthly-analysis-title"
    >
      <div className="financial-chart-heading">
        <div>
          <h2 id="monthly-analysis-title">Seu mês em detalhes</h2>
          <p>Comparações do mês selecionado</p>
        </div>
      </div>
      <dl className="monthly-findings">
        <div>
          <dt>Categoria com mais gastos</dt>
          <dd className="monthly-finding-value">
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
          <dd className="monthly-finding-value">
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
      <div className={`top-expenses ${styles.topExpenses}`}>
        <h3>Top 5 despesas</h3>
        {data.topExpenses.length ? (
          <ol>
            {data.topExpenses.map((expense, index) => (
              <li key={expense.id}>
                <IconText
                  className={`top-expense-summary ${styles.summary}`}
                  textClassName={`top-expense-details ${styles.details}`}
                  icon={
                    <span
                      className={`expense-rank ${styles.rank}`}
                      aria-hidden="true"
                    >
                      {index + 1}
                    </span>
                  }
                >
                  <strong>{expense.description}</strong>
                  <span>
                    {categoryLabels[expense.category]} ·{" "}
                    <time dateTime={expense.day}>{formatDay(expense.day)}</time>
                  </span>
                </IconText>
                <strong>{formatMoney(expense.amount)}</strong>
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
