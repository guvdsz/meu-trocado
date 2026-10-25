import assert from "node:assert/strict";
import test from "node:test";
import { zodResolver } from "@hookform/resolvers/zod";
import { adjustBalanceSchema } from "@schemas/account/adjust-balance";
import { moneySchema, positiveMoneySchema } from "@schemas/shared/money";
import { createTransactionSchema } from "@schemas/transaction/create-transaction";

const transaction = {
  requestId: "73a19904-3547-4ad9-8c32-542228839add",
  type: "income" as const,
  amount: "125,50",
  description: "Salário",
  occurredOn: "2026-10-25",
};

test("categoria é opcional, usa Outros(as) e rejeita valores desconhecidos", () => {
  assert.equal(createTransactionSchema.parse(transaction).category, "other");
  assert.equal(
    createTransactionSchema.parse({
      ...transaction,
      type: "expense",
      category: "food",
    }).category,
    "food",
  );
  assert.equal(
    createTransactionSchema.safeParse({ ...transaction, category: "invalid" })
      .success,
    false,
  );
});

test("normaliza reais sem converter dinheiro para ponto flutuante", () => {
  for (const [input, expected] of [
    [" 125,5 ", "125.50"],
    ["0.01", "0.01"],
    ["0,10", "0.10"],
    ["-45,90", "-45.90"],
    ["0", "0.00"],
    ["-0,00", "0.00"],
    ["9999999999999,99", "9999999999999.99"],
    ["-9999999999999.99", "-9999999999999.99"],
  ]) {
    assert.equal(moneySchema.parse(input), expected);
  }
});

test("rejeita formatos ambíguos, perda de precisão e valores fora de numeric(15,2)", () => {
  for (const value of [
    "",
    "1.234",
    "1.234,56",
    "1,234.56",
    "1e3",
    "NaN",
    "Infinity",
    "10000000000000",
    "0.001",
    "01",
    10,
    null,
  ]) {
    assert.equal(moneySchema.safeParse(value).success, false, String(value));
  }
});

test("entradas e saídas recebem valores positivos; somente saldo aceita negativos e zero", () => {
  for (const value of ["0", "-0.00", "-0.01", "-100"]) {
    assert.equal(positiveMoneySchema.safeParse(value).success, false);
  }
  assert.equal(positiveMoneySchema.parse("0,01"), "0.01");
  assert.equal(
    createTransactionSchema.parse({ ...transaction, type: "expense" }).amount,
    "125.50",
  );
});

test("valida datas reais, tipo e descrição das movimentações", () => {
  assert.equal(
    createTransactionSchema.safeParse({
      ...transaction,
      occurredOn: "2024-02-29",
    }).success,
    true,
  );
  for (const patch of [
    { occurredOn: "2026-02-29" },
    { occurredOn: "2026-04-31" },
    { occurredOn: "25/10/2026" },
    { type: "adjustment" },
    { amount: "-125.50" },
    { description: "   " },
    { description: "a".repeat(161) },
    { requestId: "inválido" },
  ]) {
    assert.equal(
      createTransactionSchema.safeParse({ ...transaction, ...patch }).success,
      false,
    );
  }
});

test("ajuste exige motivo, chave da operação e versão válida; permite zerar ou negativar saldo", () => {
  const adjustment = {
    requestId: transaction.requestId,
    balance: "-100,50",
    reason: "  Conferência do saldo  ",
    expectedVersion: 0,
  };
  assert.deepEqual(adjustBalanceSchema.parse(adjustment), {
    ...adjustment,
    balance: "-100.50",
    reason: "Conferência do saldo",
  });
  assert.equal(
    adjustBalanceSchema.parse({ ...adjustment, balance: "0" }).balance,
    "0.00",
  );
  for (const patch of [
    { expectedVersion: -1 },
    { expectedVersion: 0.5 },
    { expectedVersion: "0" },
    { expectedVersion: 2_147_483_647 },
    { reason: " " },
    { reason: "a".repeat(241) },
  ]) {
    assert.equal(
      adjustBalanceSchema.safeParse({ ...adjustment, ...patch }).success,
      false,
    );
  }
});

test("resolver conecta Zod ao React Hook Form, normalizando valores e retornando erros por campo", async () => {
  const resolve = zodResolver(createTransactionSchema);
  const options = { fields: {}, shouldUseNativeValidation: false };
  const valid = await resolve(transaction, undefined, options);
  assert.deepEqual(valid.errors, {});
  assert.equal(valid.values.amount, "125.50");
  const invalid = await resolve(
    { ...transaction, amount: "0" },
    undefined,
    options,
  );
  assert.ok(invalid.errors.amount?.message);
  assert.deepEqual(invalid.values, {});
});
