"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Info,
  Plus,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";
import { Button } from "@/app/_components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/app/_components/ui/popover";
import { toast } from "@/app/_components/ui/toast";
import { FinanceDialog } from "./finance-dialog";
import { MonthPicker } from "./month-picker";
import { LatestActivity } from "./latest-activity";
import { MonthlyCharts, ExpenseCategoriesChart } from "./financial-charts";
import { MonthlyAnalysis } from "./monthly-analysis";
import { DataSkeleton } from "./data-skeleton";
import { useFinanceRefresh } from "./refresh-context";
import { formatMoney, fromCents, toCents } from "@/lib/financial";
import type { DashboardData } from "@/db/queries/dashboard";

export function Dashboard({
  data,
  name,
  today,
  month,
}: {
  data: DashboardData;
  name: string;
  today: string;
  month: string;
}) {
  const { busy, navigate } = useFinanceRefresh();
  const [mode, setMode] = useState<"income" | "expense" | "balance" | null>(
    null,
  );
  const net = toCents(data.income) - toCents(data.expense);
  return (
    <div className="finance-page">
      <div className="finance-page-heading">
        <div>
          <h1>Olá, {name}.</h1>
          <p>Resumo das suas finanças</p>
        </div>
      </div>
      <div className="finance-actions">
        <MonthPicker
          value={month}
          today={today}
          onChange={(month) => navigate(`/?month=${month}`)}
        />
        <Button
          variant="outline"
          onClick={() => setMode("income")}
          disabled={busy}
        >
          <ArrowDownLeft aria-hidden="true" />
          Adicionar entrada
        </Button>
        <Button onClick={() => setMode("expense")} disabled={busy}>
          <Plus aria-hidden="true" />
          Adicionar saída
        </Button>
      </div>
      <div aria-busy={busy}>
        {busy ? (
          <DataSkeleton />
        ) : (
          <>
            <div className="finance-summary">
              <section className="finance-balance">
                <div className="balance-label">
                  <span>
                    <Wallet aria-hidden="true" />
                    Saldo atual
                  </span>
                </div>
                <p>{formatMoney(data.account.balance)}</p>
                <Button
                  variant="ghost"
                  className="balance-edit"
                  onClick={() => setMode("balance")}
                >
                  <SlidersHorizontal aria-hidden="true" />
                  Ajustar saldo
                </Button>
              </section>
              <section className="finance-metric">
                <div>
                  <span>Entradas no período</span>
                  <ArrowDownLeft aria-hidden="true" />
                </div>
                <p>{formatMoney(data.income)}</p>
              </section>
              <section className="finance-metric">
                <div>
                  <span>Saídas no período</span>
                  <ArrowUpRight aria-hidden="true" />
                </div>
                <p>{formatMoney(data.expense)}</p>
              </section>
            </div>
            <div className="finance-overview-row">
              <section className="finance-panel finance-result">
                <div className="finance-section-heading">
                  <h2>Resultado do período</h2>
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Como o resultado é calculado"
                        />
                      }
                    >
                      <Info aria-hidden="true" />
                    </PopoverTrigger>
                    <PopoverContent align="end">
                      <PopoverTitle>Resultado do período</PopoverTitle>
                      <p>
                        Entradas menos saídas do mês selecionado. Ajustes
                        manuais de saldo ficam fora desse cálculo.
                      </p>
                    </PopoverContent>
                  </Popover>
                </div>
                <strong className={net < BigInt(0) ? "result-negative" : ""}>
                  {formatMoney(fromCents(net))}
                </strong>
                <p>
                  {data.count}{" "}
                  {data.count === 1 ? "movimentação" : "movimentações"}
                </p>
              </section>
              <section className="finance-panel latest-activity-panel">
                <div className="finance-section-heading">
                  <h2>Última movimentação</h2>
                  <Button
                    variant="link"
                    nativeButton={false}
                    role="link"
                    render={<Link href="/transactions" />}
                  >
                    Ver histórico
                  </Button>
                </div>
                <LatestActivity activity={data.lastActivity} />
              </section>
            </div>
            <div className="finance-analysis-grid">
              <MonthlyCharts rows={data.chart} month={month} />
              <ExpenseCategoriesChart
                categories={data.categories}
                total={data.expense}
              />
              <MonthlyAnalysis data={data} />
            </div>
          </>
        )}
      </div>
      {mode && (
        <FinanceDialog
          mode={mode}
          today={today}
          balance={data.account.balance}
          version={data.account.version}
          onClose={() => setMode(null)}
          onSuccess={() => {
            toast.add({
              title:
                mode === "balance"
                  ? "Saldo atualizado"
                  : mode === "income"
                    ? "Entrada salva"
                    : "Saída salva",
              type: "success",
            });
            setMode(null);
          }}
        />
      )}
    </div>
  );
}
