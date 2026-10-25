import { z } from "zod";

export const historyFiltersSchema = z.object({
  type: z.enum(["all", "income", "expense", "adjustment"]).catch("all"),
  query: z.string().trim().max(160).catch(""),
  page: z.coerce.number().int().min(1).max(1_000_000).catch(1),
});
