"use client";

import { useFinancialFormat } from "@/app/(private)/_components/preferences-context";

import {
    ArrowDownLeft,
    ArrowUpRight,
    SlidersHorizontal,
    Wallet,
} from "lucide-react";
import { categoryLabels } from "@schemas/transaction/category";
import { toCents } from "@/lib/financial";
import type { Activity } from "@/db/queries/financial-types";
import { IconText } from "@/app/_components/shared/icon-text";

export function LatestActivity({ activity }: { activity: Activity | null }) {
    const { formatMoney, formatDay } = useFinancialFormat();
    if (!activity)
        return (
            <div className="latest-activity latest-activity-empty flex flex-1 items-end px-6 pt-3 pb-6 text-muted-foreground max-[650px]:px-[18px] max-[650px]:pt-2 max-[650px]:pb-5">
                <div className="flex min-w-0 items-center gap-3.5 max-[650px]:gap-2.5">
                    <p className="m-0 text-[15px] leading-normal">
                        Nenhuma movimentação registrada.
                    </p>
                </div>
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
            className={`latest-activity grid flex-1 grid-cols-[minmax(0,1fr)_auto] items-center gap-3.5 px-6 pt-3 pb-6 [&_.ledger-icon]:aspect-square [&_.ledger-icon]:h-auto [&_.ledger-icon]:w-full [&_.ledger-icon]:self-stretch [&.expense_.latest-activity-value>strong]:text-[#a05236] max-[1100px]:grid-cols-[minmax(0,1fr)] max-[650px]:gap-2.5 max-[650px]:px-[18px] max-[650px]:pt-2 max-[650px]:pb-5 ${activity.type}`}
            aria-label="Última movimentação registrada"
        >
            <IconText
                className="latest-activity-summary min-w-0 gap-3.5"
                textClassName="latest-activity-details min-w-0 [&_h3]:mt-0 [&_h3]:mb-[5px] [&_h3]:text-[17px] [&_h3]:leading-[1.45] [&_h3]:font-semibold [&_h3]:wrap-anywhere [&_p]:m-0 [&_p]:text-sm [&_p]:leading-normal [&_p]:text-muted-foreground [&_time]:m-0 [&_time]:text-sm [&_time]:leading-normal [&_time]:text-muted-foreground"
                icon={
                    <span
                        className={`ledger-icon grid max-h-28 size-[42px] shrink-0 place-items-center rounded-xl bg-[#edf3e4] text-[#557e36] [&.expense]:bg-[#faf0e7] [&.expense]:text-[#a65b39] [&.adjustment]:bg-[#eef1e9] [&.adjustment]:text-[#556b4c] max-[650px]:size-[38px] max-[650px]:rounded-[11px] max-[360px]:size-[34px] ${activity.type}`}
                    >
                        <Symbol aria-hidden="true" />
                    </span>
                }
            >
                <h3>{activity.description}</h3>
                <p>
                    {type}
                    {activity.category
                        ? ` · ${categoryLabels[activity.category]}`
                        : ""}
                    {activity.recurrenceId ? " · Recorrente" : ""}
                </p>
                <time dateTime={activity.day}>{formatDay(activity.day)}</time>
            </IconText>
            <div className="latest-activity-value grid min-w-0 gap-1.5 text-right wrap-anywhere tabular-nums [&>strong]:text-xl [&>strong]:font-semibold [&>span]:text-sm [&>span]:text-muted-foreground max-[1100px]:pl-0 max-[1100px]:text-left">
                <strong>{value}</strong>
                {activity.newBalance !== null && (
                    <span>Novo saldo: {formatMoney(activity.newBalance)}</span>
                )}
            </div>
        </article>
    );
}
