"use client";

import { usePreferences, useFinancialFormat } from "@/app/(private)/_components/preferences-context";

import type { ComponentProps } from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/app/_components/ui/chart";
import {
  categoryLabels,
  type TransactionCategory,
} from "@schemas/transaction/category";
import { expenseShare, monthlySeries } from "@/lib/financial-analysis";
import { toCents } from "@/lib/financial";
import type { CategoryTotal, MonthlyTotal } from "@/db/queries/financial-types";

const monthlyConfig = {
  incomeValue: { label: "Entradas", color: "#719252" },
  expenseValue: { label: "Saídas", color: "#bd7751" },
  netValue: { label: "Resultado", color: "#254b3e" },
} satisfies ChartConfig;

const categoryColors: Record<TransactionCategory, string> = {
  food: "#719252",
  housing: "#254b3e",
  transport: "#bd7751",
  health: "#8e6f91",
  education: "#527f8b",
  leisure: "#be9b47",
  shopping: "#b46b70",
  bills: "#829775",
  salary: "#416e50",
  freelance: "#9d8d53",
  investments: "#679c8b",
  sales: "#94745c",
  refunds: "#637992",
  other: "#8a9083",
};

function axisMoney(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function MonthlyTooltip(props: ComponentProps<typeof ChartTooltipContent>) {
  const { formatMoney } = useFinancialFormat();
  return (
    <ChartTooltipContent
      {...props}
      className="finance-chart-tooltip max-w-[min(300px,calc(100vw-40px))] rounded-xl bg-white p-5 text-sm shadow-[0_4px_14px_#263c3214]"
      labelFormatter={(_, payload) => payload[0]?.payload.fullLabel}
      formatter={(_, name, item) => {
        const key =
          name === "incomeValue"
            ? "income"
            : name === "expenseValue"
              ? "expense"
              : "net";
        const label = monthlyConfig[name as keyof typeof monthlyConfig]?.label;
        return (
          <div className="financial-tooltip-row flex w-full items-center justify-between gap-5 text-sm [&>span]:flex [&>span]:items-center [&>span]:gap-2 [&_i]:inline-block [&_i]:size-2.5 [&_i]:shrink-0 [&_i]:rounded-[3px] [&_strong]:font-semibold [&_strong]:tabular-nums">
            <span>
              <i style={{ background: item.color }} />
              {label}
            </span>
            <strong>{formatMoney(item.payload[key])}</strong>
          </div>
        );
      }}
    />
  );
}

export function MonthlyCharts({
  rows,
  month,
}: {
  rows: MonthlyTotal[];
  month: string;
}) {
  const { formatMoney } = useFinancialFormat();
  const { locale, currency } = usePreferences();
  const series = monthlySeries(rows, month, locale);
  const hasIncome = series.some((row) => toCents(row.income) > BigInt(0));
  const hasExpense = series.some((row) => toCents(row.expense) > BigInt(0));
  const empty = series.every(
    (row) =>
      toCents(row.income) === BigInt(0) && toCents(row.expense) === BigInt(0),
  );
  return (
    <>
      <section
        className="finance-panel overflow-hidden rounded-2xl border bg-white finance-chart relative min-h-80"
        aria-labelledby="income-expense-title"
      >
        <div className="financial-chart-heading px-6 pt-6 pb-4 [&_h2]:m-0 [&_h2]:text-lg [&_h2]:leading-[1.4] [&_h2]:font-semibold [&_h2]:tracking-[-0.35px] [&_p]:mt-1.5 [&_p]:text-sm [&_p]:leading-normal [&_p]:text-muted-foreground max-[650px]:px-[18px] max-[650px]:pt-5 max-[650px]:[&_h2]:text-[17px]">
          <div>
            <h2 id="income-expense-title">Entradas e saídas</h2>
            <p>Últimos seis meses · valores em {currency}</p>
          </div>
        </div>
        <div className="financial-chart-legend leading-normal flex items-center gap-5 px-6 pb-3 text-sm text-muted-foreground [&_span]:flex [&_span]:items-center [&_span]:gap-2 [&_i]:inline-block [&_i]:size-2.5 [&_i]:shrink-0 [&_i]:rounded-[3px] max-[650px]:px-[18px] max-[650px]:pb-2.5">
          <span>
            <i style={{ background: monthlyConfig.incomeValue.color }} />
            Entradas
          </span>
          <span>
            <i style={{ background: monthlyConfig.expenseValue.color }} />
            Saídas
          </span>
        </div>
        <div className="financial-plot relative pr-3.5 pb-5 pl-2 max-[650px]:pr-2 max-[650px]:pl-0">
          <ChartContainer
            config={monthlyConfig}
            className="financial-chart-canvas h-[260px] w-full aspect-auto text-[13px] max-[650px]:h-[250px]"
          >
            <BarChart
              accessibilityLayer
              data={series}
              margin={{ top: 12, right: 12, bottom: 0, left: 0 }}
              barGap={4}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={12}
                interval={0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={value => axisMoney(value, locale)}
                width={48}
                tickCount={5}
              />
              <ChartTooltip
                content={<MonthlyTooltip />}
                cursor={{ fill: "#edf1e8" }}
              />
              {hasIncome && (
                <Bar
                  dataKey="incomeValue"
                  fill="var(--color-incomeValue)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                  isAnimationActive={false}
                />
              )}
              {hasExpense && (
                <Bar
                  dataKey="expenseValue"
                  fill="var(--color-expenseValue)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                  isAnimationActive={false}
                />
              )}
            </BarChart>
          </ChartContainer>
          {empty && (
            <p className="financial-chart-empty absolute top-1/4 right-6 left-6 m-0 rounded-[10px] bg-[#fffffff0] p-3 text-center text-[15px] text-muted-foreground">
              Nenhuma movimentação nesses seis meses.
            </p>
          )}
        </div>
        <table className="sr-only">
          <caption>Entradas e saídas nos últimos seis meses</caption>
          <thead>
            <tr>
              <th>Mês</th>
              <th>Entradas</th>
              <th>Saídas</th>
            </tr>
          </thead>
          <tbody>
            {series.map((row) => (
              <tr key={row.month}>
                <th>{row.fullLabel}</th>
                <td>{formatMoney(row.income)}</td>
                <td>{formatMoney(row.expense)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      <section
        className="finance-panel overflow-hidden rounded-2xl border bg-white finance-chart relative min-h-80"
        aria-labelledby="monthly-net-title"
      >
        <div className="financial-chart-heading px-6 pt-6 pb-4 [&_h2]:m-0 [&_h2]:text-lg [&_h2]:leading-[1.4] [&_h2]:font-semibold [&_h2]:tracking-[-0.35px] [&_p]:mt-1.5 [&_p]:text-sm [&_p]:leading-normal [&_p]:text-muted-foreground max-[650px]:px-[18px] max-[650px]:pt-5 max-[650px]:[&_h2]:text-[17px]">
          <div>
            <h2 id="monthly-net-title">Evolução mensal</h2>
            <p>Entradas menos saídas · sem ajustes de saldo</p>
          </div>
        </div>
        <div className="financial-chart-legend flex items-center gap-5 px-6 pb-3 text-sm text-muted-foreground [&_span]:flex [&_span]:items-center [&_span]:gap-2 [&_i]:inline-block [&_i]:size-2.5 [&_i]:shrink-0 [&_i]:rounded-[3px] max-[650px]:px-[18px] max-[650px]:pb-2.5">
          <span>
            <i style={{ background: monthlyConfig.netValue.color }} />
            Resultado do mês
          </span>
        </div>
        <div className="financial-plot relative pr-3.5 pb-5 pl-2 max-[650px]:pr-2 max-[650px]:pl-0">
          <ChartContainer
            config={monthlyConfig}
            className="financial-chart-canvas h-[260px] w-full aspect-auto text-[13px] max-[650px]:h-[250px]"
          >
            <LineChart
              accessibilityLayer
              data={series}
              margin={{ top: 12, right: 16, bottom: 0, left: 0 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tickMargin={12}
                interval={0}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={value => axisMoney(value, locale)}
                width={48}
                tickCount={5}
              />
              <ReferenceLine y={0} stroke="#9fae94" strokeDasharray="4 4" />
              <ChartTooltip content={<MonthlyTooltip />} />
              <Line
                dataKey="netValue"
                type="linear"
                stroke="var(--color-netValue)"
                strokeWidth={3}
                dot={{ r: 4, strokeWidth: 2, fill: "#fff" }}
                activeDot={{ r: 6 }}
                isAnimationActive={false}
              />
            </LineChart>
          </ChartContainer>
          {empty && (
            <p className="financial-chart-empty absolute top-1/4 right-6 left-6 m-0 rounded-[10px] bg-[#fffffff0] p-3 text-center text-[15px] text-muted-foreground">
              Adicione entradas e saídas para acompanhar a evolução.
            </p>
          )}
        </div>
        <table className="sr-only">
          <caption>Resultado mensal nos últimos seis meses</caption>
          <thead>
            <tr>
              <th>Mês</th>
              <th>Entradas menos saídas</th>
            </tr>
          </thead>
          <tbody>
            {series.map((row) => (
              <tr key={row.month}>
                <th>{row.fullLabel}</th>
                <td>{formatMoney(row.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export function ExpenseCategoriesChart({
  categories,
  total,
}: {
  categories: CategoryTotal[];
  total: string;
}) {
  const { formatMoney } = useFinancialFormat();
  const config = Object.fromEntries(
    categories.map((row) => [
      row.category,
      {
        label: categoryLabels[row.category],
        color: categoryColors[row.category],
      },
    ]),
  ) satisfies ChartConfig;
  const slices = categories.map((row) => ({
    ...row,
    label: categoryLabels[row.category],
    value: Number(toCents(row.amount)) / 100,
    fill: categoryColors[row.category],
  }));
  return (
    <section
      className="finance-panel overflow-hidden rounded-2xl border bg-white finance-chart relative min-h-80 expense-categories"
      aria-labelledby="category-chart-title"
    >
      <div className="financial-chart-heading px-6 pt-6 pb-4 [&_h2]:m-0 [&_h2]:text-lg [&_h2]:leading-[1.4] [&_h2]:font-semibold [&_h2]:tracking-[-0.35px] [&_p]:mt-1.5 [&_p]:text-sm [&_p]:leading-normal [&_p]:text-muted-foreground max-[650px]:px-[18px] max-[650px]:pt-5 max-[650px]:[&_h2]:text-[17px]">
        <div>
          <h2 id="category-chart-title">Despesas por categoria</h2>
          <p>Distribuição dos gastos do mês selecionado</p>
        </div>
      </div>
      <div className="category-chart-area relative [&_.financial-plot]:z-10 [&_.financial-plot]:p-0">
        <div className="financial-plot relative pr-3.5 pb-5 pl-2 max-[650px]:pr-2 max-[650px]:pl-0">
          {slices.length ? (
            <ChartContainer
              config={config}
              className="financial-chart-canvas h-[260px] w-full aspect-auto text-[13px] max-[650px]:h-[250px] category-chart-canvas h-[270px]! max-[650px]:h-[270px]!"
            >
              <PieChart accessibilityLayer>
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      className="finance-chart-tooltip max-w-[min(300px,calc(100vw-40px))] rounded-xl bg-white p-5 text-sm shadow-[0_4px_14px_#263c3214]"
                      hideLabel
                      formatter={(_, name, item) => (
                        <div className="financial-tooltip-row flex w-full items-center justify-between gap-5 text-sm [&>span]:flex [&>span]:items-center [&>span]:gap-2 [&_i]:inline-block [&_i]:size-2.5 [&_i]:shrink-0 [&_i]:rounded-[3px] [&_strong]:font-semibold [&_strong]:tabular-nums">
                          <span>
                            <i style={{ background: item.payload.fill }} />
                            {categoryLabels[name as TransactionCategory]}
                          </span>
                          <strong>{formatMoney(item.payload.amount)}</strong>
                        </div>
                      )}
                    />
                  }
                />
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="category"
                  innerRadius="62%"
                  outerRadius="88%"
                  paddingAngle={slices.length > 1 ? 3 : 0}
                  stroke="none"
                  isAnimationActive={false}
                />
              </PieChart>
            </ChartContainer>
          ) : (
            <div className="category-empty-ring mx-auto my-[25px] size-[220px] rounded-full border-[30px] border-muted" aria-hidden="true" />
          )}
        </div>
        <div className="category-chart-total pointer-events-none absolute top-1/2 left-1/2 z-0 grid w-1/2 -translate-x-1/2 -translate-y-1/2 gap-1 text-center [&>span]:text-sm [&>span]:leading-normal [&>span]:text-muted-foreground [&_strong]:text-[clamp(17px,1.8vw,25px)] [&_strong]:font-semibold [&_strong]:tracking-[-0.6px] [&_strong]:wrap-anywhere max-[850px]:[&_strong]:text-2xl">
          <span>Total de saídas</span>
          <strong>{formatMoney(total)}</strong>
        </div>
      </div>
      {categories.length ? (
        <ul className="category-breakdown m-0 list-none px-6 pb-5 [&_li]:flex [&_li]:items-center [&_li]:justify-between [&_li]:gap-3 [&_li]:border-b [&_li]:border-muted [&_li]:py-3 [&_li]:text-sm [&_li]:leading-normal [&_li:last-child]:border-0 [&_li>div]:grid [&_li>div]:gap-[3px] [&_li>div]:text-right [&_li>div]:tabular-nums [&_li>div>span]:text-muted-foreground [&_strong]:font-[550] max-[650px]:px-[18px] max-[650px]:pb-[18px]">
          {categories.map((row) => (
            <li key={row.category}>
              <span className="category-breakdown-label flex items-center gap-2 [&_i]:inline-block [&_i]:size-2.5 [&_i]:shrink-0 [&_i]:rounded-[3px]">
                <i style={{ background: categoryColors[row.category] }} />
                {categoryLabels[row.category]}
              </span>
              <div>
                <strong>{formatMoney(row.amount)}</strong>
                <span>{expenseShare(row.amount, total)}</span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="financial-no-expenses m-0 px-6 pt-2 pb-6 text-center text-[15px] text-muted-foreground">
          Nenhuma saída no mês selecionado.
        </p>
      )}
    </section>
  );
}
