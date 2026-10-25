import assert from "node:assert/strict";
import test from "node:test";
import { expenseShare, monthlySeries } from "@/lib/financial-analysis";

test("série mensal cruza o ano, preenche lacunas e preserva resultado negativo", () => {
  const series = monthlySeries(
    [
      { month: "2026-01", income: "100.10", expense: "200.20" },
      { month: "2025-08", income: "9999999999999.99", expense: "0.01" },
      { month: "2025-07", income: "999.00", expense: "0.00" },
    ],
    "2026-01",
  );
  assert.deepEqual(
    series.map((row) => row.month),
    ["2025-08", "2025-09", "2025-10", "2025-11", "2025-12", "2026-01"],
  );
  assert.equal(series[0].net, "9999999999999.98");
  assert.equal(series[1].income, "0.00");
  assert.equal(series[5].net, "-100.10");
  assert.equal(series[5].netValue, -100.1);
});

test("percentuais de categoria arredondam com precisão e aceitam mês sem despesas", () => {
  assert.equal(expenseShare("1.00", "3.00"), "33,3%");
  assert.equal(expenseShare("1000.00", "1675.00"), "59,7%");
  assert.equal(expenseShare("0.00", "0.00"), "0%");
  assert.equal(expenseShare("9999999999999.99", "9999999999999.99"), "100%");
});
