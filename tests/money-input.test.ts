import assert from "node:assert/strict";
import test from "node:test";
import {
  caretFromRight,
  formatMoneyInput,
  moneyFromInput,
} from "@/lib/money-input";
import { createTransactionSchema } from "@schemas/transaction/create-transaction";

test("digitação monetária desloca centavos e mantém o valor como string decimal exata", () => {
  for (const [typed, stored, displayed] of [
    ["1", "0.01", "0,01"],
    ["12", "0.12", "0,12"],
    ["123", "1.23", "1,23"],
    ["12345", "123.45", "123,45"],
    ["123456", "1234.56", "1.234,56"],
    ["0001234", "12.34", "12,34"],
    ["R$ 1.234,56", "1234.56", "1.234,56"],
    ["999999999999999", "9999999999999.99", "9.999.999.999.999,99"],
  ]) {
    assert.equal(moneyFromInput(typed), stored);
    assert.equal(formatMoneyInput(stored), displayed);
  }
  assert.equal(moneyFromInput("1000000000000000"), null);
  assert.equal(moneyFromInput("1e3"), null);
  assert.equal(moneyFromInput("NaN"), null);
  assert.equal(moneyFromInput(""), "");
});

test("saldo permite sinal negativo sem aceitar saídas com sinal incorreto", () => {
  assert.equal(moneyFromInput("-12345", true), "-123.45");
  assert.equal(formatMoneyInput("-1234.56"), "-1.234,56");
  assert.equal(moneyFromInput("-12345"), null);
  assert.equal(moneyFromInput("-", true), "-");
  assert.equal(formatMoneyInput("-"), "-");
});

test("a máscara envia o decimal sem separadores de milhar ao schema do submit", () => {
  const parsed = createTransactionSchema.parse({
    requestId: "73a19904-3547-4ad9-8c32-542228839add",
    type: "expense",
    amount: moneyFromInput("1.234,56"),
    description: "Mercado",
    occurredOn: "2026-10-25",
  });
  assert.equal(parsed.amount, "1234.56");
  assert.equal(caretFromRight("1.234,56", 2), 6);
  assert.equal(caretFromRight("1.234,56", 0), 8);
});
