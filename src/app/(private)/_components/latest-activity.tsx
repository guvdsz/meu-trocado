import {
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
import { categoryLabels } from "@schemas/transaction/category";
import { formatDay, formatMoney, toCents } from "@/lib/financial";
import type { Activity } from "@/db/queries/dashboard-sql";
import { IconText } from "@/app/_components/shared/icon-text";

export function LatestActivity({ activity }: { activity: Activity | null }) {
  if (!activity)
    return (
      <div className="latest-activity latest-activity-empty">
        <Wallet aria-hidden="true" />
        <p>Nenhuma movimentação registrada.</p>
      </div>
    );
  const Symbol =
    activity.type === "income"
      ? ArrowDownLeft
      : activity.type === "expense"
        ? ArrowUpRight
        : SlidersHorizontal;
  const type =
    activity.type === "income"
      ? "Entrada"
      : activity.type === "expense"
        ? "Saída"
        : "Ajuste de saldo";
  const value = `${activity.type === "expense" ? "− " : toCents(activity.amount) > BigInt(0) ? "+ " : ""}${formatMoney(activity.amount)}`;
  return (
    <article
      className={`latest-activity ${activity.type}`}
      aria-label="Última movimentação registrada"
    >
      <IconText
        className="latest-activity-summary"
        textClassName="latest-activity-details"
        icon={
          <span className={`ledger-icon ${activity.type}`}>
            <Symbol aria-hidden="true" />
          </span>
        }
      >
        <h3>{activity.description}</h3>
        <p>
          {type}
          {activity.category ? ` · ${categoryLabels[activity.category]}` : ""}
        </p>
        <time dateTime={activity.day}>{formatDay(activity.day)}</time>
      </IconText>
      <div className="latest-activity-value">
        <strong>{value}</strong>
        {activity.newBalance !== null && (
          <span>Novo saldo: {formatMoney(activity.newBalance)}</span>
        )}
      </div>
    </article>
  );
}
