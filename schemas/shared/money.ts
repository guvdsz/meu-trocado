import { z } from "zod";

// Up to 13 integer digits and two decimals, matching PostgreSQL numeric(15, 2).
// No thousands separator: "1.234" must not silently become "1234" or "1.23".
export const moneySchema = z
  .string()
  .trim()
  .regex(/^-?(?:0|[1-9]\d{0,12})(?:[.,]\d{1,2})?$/, {
    message:
      "Informe um valor com até 13 dígitos inteiros e 2 casas decimais, sem separador de milhar.",
  })
  .transform((value) => {
    const [integer, fraction = ""] = value.replace(",", ".").split(".");
    const normalized = `${integer}.${fraction.padEnd(2, "0")}`;
    return normalized === "-0.00" ? "0.00" : normalized;
  });

export const positiveMoneySchema = moneySchema.refine(
  (value) => !value.startsWith("-") && value !== "0.00",
  { message: "O valor deve ser maior que zero." },
);
