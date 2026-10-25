"use client";

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
import { formatMoney, toCents } from "@/lib/financial";
import type { CategoryTotal, MonthlyTotal } from "@/db/queries/dashboard-sql";

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

function axisMoney(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function MonthlyTooltip(props: ComponentProps<typeof ChartTooltipContent>) {
  return (
    <ChartTooltipContent
      {...props}
      className="finance-chart-tooltip"
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
          <div className="financial-tooltip-row">
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
  const series = monthlySeries(rows, month);
  const hasIncome = series.some((row) => toCents(row.income) > BigInt(0));
  const hasExpense = series.some((row) => toCents(row.expense) > BigInt(0));
  const empty = series.every(
    (row) =>
      toCents(row.income) === BigInt(0) && toCents(row.expense) === BigInt(0),
  );
  return (
    <>
      <section
        className="finance-panel finance-chart"
        aria-labelledby="income-expense-title"
      >
        <div className="financial-chart-heading">
          <div>
            <h2 id="income-expense-title">Entradas e saídas</h2>
            <p>Últimos seis meses · valores em R$</p>
          </div>
        </div>
        <div className="financial-chart-legend">
          <span>
            <i style={{ background: monthlyConfig.incomeValue.color }} />
            Entradas
          </span>
          <span>
            <i style={{ background: monthlyConfig.expenseValue.color }} />
            Saídas
          </span>
        </div>
        <div className="financial-plot">
          <ChartContainer
            config={monthlyConfig}
            className="financial-chart-canvas"
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
                tickFormatter={axisMoney}
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
            <p className="financial-chart-empty">
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
        className="finance-panel finance-chart"
        aria-labelledby="monthly-net-title"
      >
        <div className="financial-chart-heading">
          <div>
            <h2 id="monthly-net-title">Evolução mensal</h2>
            <p>Entradas menos saídas · sem ajustes de saldo</p>
          </div>
        </div>
        <div className="financial-chart-legend">
          <span>
            <i style={{ background: monthlyConfig.netValue.color }} />
            Resultado do mês
          </span>
        </div>
        <div className="financial-plot">
          <ChartContainer
            config={monthlyConfig}
            className="financial-chart-canvas"
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
                tickFormatter={axisMoney}
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
            <p className="financial-chart-empty">
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
      className="finance-panel finance-chart expense-categories"
      aria-labelledby="category-chart-title"
    >
      <div className="financial-chart-heading">
        <div>
          <h2 id="category-chart-title">Despesas por categoria</h2>
          <p>Distribuição dos gastos do mês selecionado</p>
        </div>
      </div>
      <div className="category-chart-area">
        <div className="financial-plot">
          {slices.length ? (
            <ChartContainer
              config={config}
              className="financial-chart-canvas category-chart-canvas"
            >
              <PieChart accessibilityLayer>
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      className="finance-chart-tooltip"
                      hideLabel
                      formatter={(_, name, item) => (
                        <div className="financial-tooltip-row">
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
            <div className="category-empty-ring" aria-hidden="true" />
          )}
        </div>
        <div className="category-chart-total">
          <span>Total de saídas</span>
          <strong>{formatMoney(total)}</strong>
        </div>
      </div>
      {categories.length ? (
        <ul className="category-breakdown">
          {categories.map((row) => (
            <li key={row.category}>
              <span className="category-breakdown-label">
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
        <p className="financial-no-expenses">
          Nenhuma saída no mês selecionado.
        </p>
      )}
    </section>
  );
}
