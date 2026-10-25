import { z } from "zod";

export const transactionCategories = [
  "salary",
  "freelance",
  "investments",
  "sales",
  "refunds",
  "food",
  "housing",
  "transport",
  "health",
  "education",
  "leisure",
  "shopping",
  "bills",
  "other",
] as const;

export type TransactionCategory = (typeof transactionCategories)[number];

export const categoryLabels: Record<TransactionCategory, string> = {
  salary: "Salário",
  freelance: "Trabalho extra",
  investments: "Investimentos",
  sales: "Vendas",
  refunds: "Reembolsos",
  food: "Alimentação",
  housing: "Moradia",
  transport: "Transporte",
  health: "Saúde",
  education: "Educação",
  leisure: "Lazer",
  shopping: "Compras",
  bills: "Contas e serviços",
  other: "Outros(as)",
};

export const transactionCategorySchema = z
  .enum(transactionCategories, {
    message: "Selecione uma categoria válida.",
  })
  .default("other");
