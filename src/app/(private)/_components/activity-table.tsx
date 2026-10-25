import { ArrowDownLeft, ArrowUpRight, SlidersHorizontal } from "lucide-react";
import { formatDay, formatMoney, toCents } from "@/lib/financial";
import type { Activity } from "@/db/queries/dashboard-sql";
import { categoryLabels } from "@schemas/transaction/category";

export function ActivityTable({
  activity,
  label = "Movimentações",
}: {
  activity: Activity[];
  label?: string;
}) {
  return (
    <div
      className="ledger-scroll"
      tabIndex={0}
      role="region"
      aria-label={label}
    >
      <table className="ledger-table">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr>
            <th scope="col">Descrição</th>
            <th scope="col">Tipo</th>
            <th scope="col">Data</th>
            <th scope="col">Valor</th>
          </tr>
        </thead>
        <tbody>
          {activity.map((item) => {
            const type =
              item.type === "income"
                ? "Entrada"
                : item.type === "expense"
                  ? "Saída"
                  : "Ajuste";
            const Symbol =
              item.type === "income"
                ? ArrowDownLeft
                : item.type === "expense"
                  ? ArrowUpRight
                  : SlidersHorizontal;
            return (
              <tr key={item.id}>
                <td className="ledger-main-cell">
                  <div className="ledger-description">
                    <span className={`ledger-icon ${item.type}`}>
                      <Symbol size={20} aria-hidden="true" />
                    </span>
                    <div>
                      <strong>{item.description}</strong>
                      {item.type !== "adjustment" && (
                        <span className="ledger-category">
                          {categoryLabels[item.category ?? "other"]}
                        </span>
                      )}
                      {item.type === "adjustment" && (
                        <span>
                          Novo saldo: {formatMoney(item.newBalance ?? "0")}
                        </span>
                      )}
                      <span className="ledger-mobile-meta">
                        <span className={`ledger-type ${item.type}`}>
                          {type}
                        </span>
                        <span aria-hidden="true">·</span>
                        <time dateTime={item.day}>{formatDay(item.day)}</time>
                      </span>
                    </div>
                  </div>
                </td>
                <td className="ledger-type-cell">
                  <span className={`ledger-type ${item.type}`}>{type}</span>
                </td>
                <td className="ledger-date-cell">
                  <time dateTime={item.day}>{formatDay(item.day)}</time>
                </td>
                <td className={`ledger-amount ${item.type}`}>
                  {`${item.type === "expense" ? "− " : toCents(item.amount) > BigInt(0) ? "+ " : ""}${formatMoney(item.amount)}`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
