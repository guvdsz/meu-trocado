"use client";

import { useFinancialFormat } from "@/app/(private)/_components/preferences-context";

import { PageHeading, PageActions, SummaryGrid, OverviewGrid, AnalysisGrid } from "@/app/(private)/_components/finance-layout";

import { useState } from "react";
import { NavigationLink as Link } from "./navigation-link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Info,
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
import { fromCents, toCents } from "@/lib/financial";
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
  const { formatMoney } = useFinancialFormat();
  const { busy, navigate } = useFinanceRefresh();
  const [mode, setMode] = useState<"income" | "expense" | "balance" | null>(
    null,
  );
  const net = toCents(data.income) - toCents(data.expense);
  return (
    <div className="finance-page">
      <PageHeading>
        <div>
          <h1>Olá, {name}.</h1>
          <p>Resumo das suas finanças</p>
        </div>
      </PageHeading>
      <PageActions>
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
          <ArrowUpRight aria-hidden="true" />
          Adicionar saída
        </Button>
      </PageActions>
      <div aria-busy={busy}>
        {busy ? (
          <DataSkeleton />
        ) : (
          <>
            <SummaryGrid>
              <section className="finance-balance grid min-h-[220px] grid-cols-[minmax(0,1fr)] grid-rows-[44px_minmax(52px,auto)_40px] gap-4 rounded-2xl border border-primary bg-primary p-6 text-white max-[1050px]:px-[18px] max-[1050px]:py-[22px] max-[950px]:col-span-full min-[651px]:max-[800px]:col-auto max-[650px]:min-h-[218px] max-[650px]:p-[22px] [&>p]:m-0 [&>p]:self-start [&>p]:text-[clamp(28px,2.5vw,36px)] [&>p]:leading-[1.2] [&>p]:font-[550] [&>p]:tracking-[-1px] [&>p]:wrap-anywhere [&>p]:tabular-nums max-[1050px]:[&>p]:text-[clamp(25px,2.5vw,34px)] max-[950px]:[&>p]:text-[36px] min-[651px]:max-[800px]:[&>p]:text-[clamp(23px,3.5vw,28px)]">
                <div className="balance-label flex h-11 min-w-0 items-center justify-between gap-2.5 text-[15px] [&>span]:flex [&>span]:items-center [&>span]:gap-2.5 [&>span_svg]:w-[21px] [&>span_svg]:text-[#d6e8b4]">
                  <span>
                    <Wallet aria-hidden="true" />
                    Saldo atual
                  </span>
                </div>
                <p>{formatMoney(data.account.balance)}</p>
                <Button
                  variant="ghost"
                  className="balance-edit min-h-10 justify-self-start gap-2! border border-[#ffffff18] bg-[#ffffff10] px-3! py-2! text-sm! text-[#e2edd1]! hover:bg-[#ffffff1a]! hover:text-white! [&_svg]:w-[17px]"
                  onClick={() => setMode("balance")}
                >
                  <SlidersHorizontal aria-hidden="true" />
                  Ajustar saldo
                </Button>
              </section>
              <section className="finance-metric grid min-h-[220px] grid-cols-[minmax(0,1fr)] grid-rows-[44px_minmax(52px,auto)_40px] justify-normal gap-4 rounded-2xl border bg-white p-6 max-[1050px]:px-[18px] max-[1050px]:py-[22px] max-[950px]:min-h-40 max-[950px]:grid-rows-[44px_minmax(45px,auto)] min-[651px]:max-[800px]:min-h-[220px] min-[651px]:max-[800px]:grid-rows-[44px_minmax(52px,auto)_40px] max-[650px]:min-h-[150px] max-[650px]:grid-rows-[40px_minmax(42px,auto)] max-[650px]:gap-3.5 max-[650px]:px-4 max-[650px]:py-[18px] [&>div]:flex [&>div]:h-11 [&>div]:min-w-0 [&>div]:items-center [&>div]:justify-between [&>div]:gap-2.5 [&>div]:text-[15px] [&>div]:text-[#4d6045] max-[650px]:[&>div]:text-sm [&_svg]:w-[22px] [&_svg]:text-[#567844] [&:last-child_svg]:text-[#a85f3f] max-[650px]:[&_svg]:w-[18px] max-[650px]:[&_svg]:shrink-0 [&>p]:m-0 [&>p]:self-start [&>p]:text-[clamp(28px,2.5vw,36px)] [&>p]:leading-[1.2] [&>p]:font-[550] [&>p]:tracking-[-1px] [&>p]:wrap-anywhere [&>p]:tabular-nums max-[1050px]:[&>p]:text-[clamp(25px,2.5vw,34px)] min-[651px]:max-[800px]:[&>p]:text-[clamp(23px,3.5vw,28px)] max-[650px]:[&>p]:text-[clamp(23px,5.5vw,30px)] max-[360px]:[&>p]:text-[22px]">
                <div>
                  <span>Entradas no período</span>
                  <ArrowDownLeft aria-hidden="true" />
                </div>
                <p>{formatMoney(data.income)}</p>
              </section>
              <section className="finance-metric grid min-h-[220px] grid-cols-[minmax(0,1fr)] grid-rows-[44px_minmax(52px,auto)_40px] justify-normal gap-4 rounded-2xl border bg-white p-6 max-[1050px]:px-[18px] max-[1050px]:py-[22px] max-[950px]:min-h-40 max-[950px]:grid-rows-[44px_minmax(45px,auto)] min-[651px]:max-[800px]:min-h-[220px] min-[651px]:max-[800px]:grid-rows-[44px_minmax(52px,auto)_40px] max-[650px]:min-h-[150px] max-[650px]:grid-rows-[40px_minmax(42px,auto)] max-[650px]:gap-3.5 max-[650px]:px-4 max-[650px]:py-[18px] [&>div]:flex [&>div]:h-11 [&>div]:min-w-0 [&>div]:items-center [&>div]:justify-between [&>div]:gap-2.5 [&>div]:text-[15px] [&>div]:text-[#4d6045] max-[650px]:[&>div]:text-sm [&_svg]:w-[22px] [&_svg]:text-[#567844] [&:last-child_svg]:text-[#a85f3f] max-[650px]:[&_svg]:w-[18px] max-[650px]:[&_svg]:shrink-0 [&>p]:m-0 [&>p]:self-start [&>p]:text-[clamp(28px,2.5vw,36px)] [&>p]:leading-[1.2] [&>p]:font-[550] [&>p]:tracking-[-1px] [&>p]:wrap-anywhere [&>p]:tabular-nums max-[1050px]:[&>p]:text-[clamp(25px,2.5vw,34px)] min-[651px]:max-[800px]:[&>p]:text-[clamp(23px,3.5vw,28px)] max-[650px]:[&>p]:text-[clamp(23px,5.5vw,30px)] max-[360px]:[&>p]:text-[22px]">
                <div>
                  <span>Saídas no período</span>
                  <ArrowUpRight aria-hidden="true" />
                </div>
                <p>{formatMoney(data.expense)}</p>
              </section>
            </SummaryGrid>
            <OverviewGrid>
              <section className="finance-panel overflow-hidden rounded-2xl border finance-result flex min-h-[204px] flex-col bg-[#eff3e6] [&>.finance-section-heading]:pb-0 [&>strong]:mx-6 [&>strong]:mt-auto [&>strong]:mb-2.5 [&>strong]:text-[30px] [&>strong]:leading-[1.2] [&>strong]:font-[550] [&>strong]:tracking-[-1px] [&>strong]:wrap-anywhere [&>strong]:tabular-nums [&>p]:mx-6 [&>p]:mt-0 [&>p]:mb-6 [&>p]:text-[15px] [&>p]:text-[#536849] max-[650px]:min-h-[178px] max-[650px]:[&>strong]:mx-[18px] max-[650px]:[&>strong]:mt-3 max-[650px]:[&>strong]:text-[28px] max-[650px]:[&>p]:mx-[18px] max-[650px]:[&>p]:mb-5">
                <div className="finance-section-heading flex items-center justify-between gap-4 p-6 [&_h2]:m-0 [&_h2]:text-lg [&_h2]:leading-[1.3] [&_h2]:font-semibold [&_h2]:tracking-[-0.35px] [&>span]:text-sm [&>span]:text-[#59694f] max-[1150px]:px-5 max-[1150px]:py-[22px] max-[1150px]:[&_h2]:text-[17px] max-[1150px]:[&>span]:text-[13px] max-[950px]:[&>span]:text-sm max-[650px]:px-[18px] max-[650px]:py-5 max-[650px]:[&>span]:text-[13px] max-[650px]:[&_[data-slot=button]]:px-[5px]">
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
                <strong className={net < BigInt(0) ? "result-negative text-[#a05236]" : ""}>
                  {formatMoney(fromCents(net))}
                </strong>
                <p>
                  {data.count}{" "}
                  {data.count === 1 ? "movimentação" : "movimentações"}
                </p>
              </section>
              <section className="finance-panel overflow-hidden rounded-2xl border bg-white latest-activity-panel flex flex-col [&>.finance-section-heading]:pb-3">
                <div className="finance-section-heading flex items-center justify-between gap-4 p-6 [&_h2]:m-0 [&_h2]:text-lg [&_h2]:leading-[1.3] [&_h2]:font-semibold [&_h2]:tracking-[-0.35px] [&>span]:text-sm [&>span]:text-[#59694f] max-[1150px]:px-5 max-[1150px]:py-[22px] max-[1150px]:[&_h2]:text-[17px] max-[1150px]:[&>span]:text-[13px] max-[950px]:[&>span]:text-sm max-[650px]:px-[18px] max-[650px]:py-5 max-[650px]:[&>span]:text-[13px] max-[650px]:[&_[data-slot=button]]:px-[5px]">
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
            </OverviewGrid>
            <AnalysisGrid>
              <MonthlyCharts rows={data.chart} month={month} />
              <ExpenseCategoriesChart
                categories={data.categories}
                total={data.expense}
              />
              <MonthlyAnalysis data={data} />
            </AnalysisGrid>
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
