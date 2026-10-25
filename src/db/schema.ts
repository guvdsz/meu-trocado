import { sql } from "drizzle-orm";
import { transactionCategories } from "../../schemas/transaction/category";
import {
  check,
  date,
  foreignKey,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const transactionType = pgEnum("transaction_type", [
  "income",
  "expense",
]);
export const transactionCategory = pgEnum(
  "transaction_category",
  transactionCategories,
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clerkUserId: text("clerk_user_id").notNull().unique(),
    googleId: text("google_id").notNull().unique(),
    currency: varchar("currency", { length: 3 }).notNull().default("BRL"),
    balance: numeric("balance", { precision: 15, scale: 2 })
      .notNull()
      .default("0.00"),
    version: integer("version").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique("accounts_id_google_id_unique").on(table.id, table.googleId),
    check(
      "accounts_google_id_not_empty",
      sql`length(btrim(${table.googleId})) > 0`,
    ),
    check("accounts_currency_brl", sql`${table.currency} = 'BRL'`),
    check(
      "accounts_owner_not_empty",
      sql`length(btrim(${table.clerkUserId})) > 0`,
    ),
    check("accounts_version_non_negative", sql`${table.version} >= 0`),
    check(
      "accounts_balance_range",
      sql`${table.balance} between -9999999999999.99 and 9999999999999.99`,
    ),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id").notNull(),
    googleId: text("google_id").notNull(),
    requestId: uuid("request_id").notNull().unique(),
    type: transactionType("type").notNull(),
    category: transactionCategory("category").notNull().default("other"),
    // Always positive: type determines whether to add or subtract.
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    description: varchar("description", { length: 160 }).notNull(),
    occurredOn: date("occurred_on", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "transactions_account_google_owner_fk",
      columns: [table.accountId, table.googleId],
      foreignColumns: [accounts.id, accounts.googleId],
    }).onDelete("restrict"),
    check(
      "transactions_amount_positive",
      sql`${table.amount} between 0.01 and 9999999999999.99`,
    ),
    check(
      "transactions_description_not_empty",
      sql`length(btrim(${table.description})) > 0`,
    ),
    index("transactions_account_timeline_idx").on(
      table.accountId,
      table.occurredOn,
      table.createdAt,
      table.id,
    ),
    index("transactions_account_type_date_idx").on(
      table.accountId,
      table.type,
      table.occurredOn,
    ),
  ],
);

export const balanceAdjustments = pgTable(
  "balance_adjustments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id").notNull(),
    googleId: text("google_id").notNull(),
    requestId: uuid("request_id").notNull().unique(),
    previousBalance: numeric("previous_balance", {
      precision: 15,
      scale: 2,
    }).notNull(),
    newBalance: numeric("new_balance", {
      precision: 15,
      scale: 2,
    }).notNull(),
    reason: varchar("reason", { length: 240 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "balance_adjustments_account_google_owner_fk",
      columns: [table.accountId, table.googleId],
      foreignColumns: [accounts.id, accounts.googleId],
    }).onDelete("restrict"),
    check(
      "balance_adjustments_changed",
      sql`${table.previousBalance} <> ${table.newBalance}`,
    ),
    check(
      "balance_adjustments_reason_not_empty",
      sql`length(btrim(${table.reason})) > 0`,
    ),
    check(
      "balance_adjustments_previous_range",
      sql`${table.previousBalance} between -9999999999999.99 and 9999999999999.99`,
    ),
    check(
      "balance_adjustments_new_range",
      sql`${table.newBalance} between -9999999999999.99 and 9999999999999.99`,
    ),
    index("balance_adjustments_account_timeline_idx").on(
      table.accountId,
      table.createdAt,
      table.id,
    ),
  ],
);

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type BalanceAdjustment = typeof balanceAdjustments.$inferSelect;
export type NewBalanceAdjustment = typeof balanceAdjustments.$inferInsert;
