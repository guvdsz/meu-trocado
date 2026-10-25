"use client";

import { useFinancialFormat } from "@/app/(private)/_components/preferences-context";

import { ArrowDownLeft, ArrowUpRight, SlidersHorizontal } from "lucide-react";
import { toCents } from "@/lib/financial";
import type { Activity } from "@/db/queries/financial-types";
import { categoryLabels } from "@schemas/transaction/category";

export function ActivityTable({
  activity,
  label = "Movimentações",
}: {
  activity: Activity[];
  label?: string;
}) {
  const { formatMoney, formatDay } = useFinancialFormat();
  return (
    <div
      className="ledger-scroll overflow-x-auto border-t"
      tabIndex={0}
      role="region"
      aria-label={label}
    >
      <table className="ledger-table w-full min-w-[650px] border-collapse text-left [&_th]:border-b [&_th]:bg-[#fafbf7] [&_th]:px-6 [&_th]:py-3.5 [&_th]:text-sm [&_th]:font-[550] [&_th]:text-[#53674a] [&_td]:border-b [&_td]:border-[#e9eee2] [&_td]:px-6 [&_td]:py-5 [&_td]:text-[15px] [&_tbody_tr:last-child_td]:border-b-0 [&_th:last-child]:text-right [&_th:last-child]:whitespace-nowrap [&_td:last-child]:text-right [&_td:last-child]:whitespace-nowrap [&_tbody_tr:hover]:bg-[#fcfdf9] max-[650px]:block max-[650px]:min-w-0 max-[650px]:[&_thead]:sr-only max-[650px]:[&_tbody]:block max-[650px]:[&_tbody_tr]:grid max-[650px]:[&_tbody_tr]:grid-cols-[minmax(0,1fr)_max-content] max-[650px]:[&_tbody_tr]:items-center max-[650px]:[&_tbody_tr]:gap-3.5 max-[650px]:[&_tbody_tr]:border-b max-[650px]:[&_tbody_tr]:px-[18px] max-[650px]:[&_tbody_tr]:py-5 max-[650px]:[&_tbody_tr:last-child]:border-0 max-[650px]:[&_td]:min-w-0 max-[650px]:[&_td]:border-0 max-[650px]:[&_td]:p-0 max-[650px]:[&_td.ledger-amount]:col-start-2 max-[650px]:[&_td.ledger-amount]:row-start-1 max-[650px]:[&_td.ledger-amount]:self-center max-[650px]:[&_td.ledger-amount]:text-base max-[360px]:[&_tbody_tr]:gap-2.5 max-[360px]:[&_tbody_tr]:px-3.5 max-[360px]:[&_tbody_tr]:py-[18px] max-[360px]:[&_td.ledger-amount]:text-sm">
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
                <td className="ledger-main-cell max-[650px]:col-start-1 max-[650px]:row-start-1 max-[650px]:m-0">
                  <div className="ledger-description flex items-center gap-3.5 [&>div]:min-w-0 [&_strong]:block [&_strong]:min-w-[140px] [&_strong]:max-w-[350px] [&_strong]:text-[15px] [&_strong]:font-[550] [&_strong]:wrap-anywhere [&_div>span]:mt-[5px] [&_div>span]:block [&_div>span]:text-[13px] [&_div>span]:text-[#586b4d] [&_.ledger-mobile-meta]:hidden max-[650px]:items-start max-[650px]:gap-[11px] max-[650px]:[&_strong]:min-w-0 max-[650px]:[&_strong]:max-w-none max-[650px]:[&_strong]:leading-normal max-[650px]:[&_div>span]:leading-[1.6] max-[650px]:[&_.ledger-mobile-meta]:flex max-[650px]:[&_.ledger-mobile-meta]:flex-wrap max-[650px]:[&_.ledger-mobile-meta]:items-center max-[650px]:[&_.ledger-mobile-meta]:gap-1.5 max-[650px]:[&_.ledger-mobile-meta]:text-[#526548] max-[360px]:gap-[9px] max-[360px]:[&_strong]:text-sm">
                    <span className={`ledger-icon grid size-[42px] shrink-0 place-items-center rounded-xl bg-[#edf3e4] text-[#557e36] [&.expense]:bg-[#faf0e7] [&.expense]:text-[#a65b39] [&.adjustment]:bg-[#eef1e9] [&.adjustment]:text-[#556b4c] max-[650px]:size-[38px] max-[650px]:rounded-[11px] max-[360px]:size-[34px] ${item.type}`}>
                      <Symbol size={20} aria-hidden="true" />
                    </span>
                    <div>
                      <strong>{item.description}</strong>
                      {item.type !== "adjustment" && (
                        <span className="ledger-category mt-[3px] block text-sm text-muted-foreground">
                          {categoryLabels[item.category ?? "other"]}
                          {item.recurrenceId ? " · Recorrente" : ""}
                        </span>
                      )}
                      {item.type === "adjustment" && (
                        <span>
                          Novo saldo: {formatMoney(item.newBalance ?? "0")}
                        </span>
                      )}
                      <span className="ledger-mobile-meta max-[650px]:[&_.ledger-type]:text-[13px] max-[650px]:[&_time]:text-[13px] max-[650px]:[&_time]:whitespace-nowrap">
                        <span className={`ledger-type text-sm whitespace-nowrap ${item.type}`}>
                          {type}
                        </span>
                        <span aria-hidden="true">·</span>
                        <time dateTime={item.day}>{formatDay(item.day)}</time>
                      </span>
                    </div>
                  </div>
                </td>
                <td className="ledger-type-cell max-[650px]:hidden">
                  <span className={`ledger-type text-sm whitespace-nowrap ${item.type}`}>{type}</span>
                </td>
                <td className="ledger-date-cell max-[650px]:hidden">
                  <time dateTime={item.day}>{formatDay(item.day)}</time>
                </td>
                <td className={`ledger-amount font-semibold tabular-nums [&.income]:text-[#456f2e] [&.expense]:text-[#9d5536] ${item.type}`}>
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
