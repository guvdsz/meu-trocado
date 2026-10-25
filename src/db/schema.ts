import { sql } from "drizzle-orm";
import { transactionCategories } from "../../schemas/transaction/category";
import { recurrenceFrequencies } from "../../schemas/recurrence/frequency";
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
export const recurrenceFrequency = pgEnum(
  "recurrence_frequency",
  recurrenceFrequencies,
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    providerId: text("provider_id").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      "users_provider_id_not_empty",
      sql`length(btrim(${table.providerId})) > 0`,
    ),
  ],
);

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "restrict" }),
    currency: varchar("currency", { length: 3 }),
    currencyConfiguredAt: timestamp("currency_configured_at", { withTimezone: true }),
    timeZone: text("time_zone").notNull().default("America/Sao_Paulo"),
    locale: varchar("locale", { length: 10 }).notNull().default("pt-BR"),
    settingsVersion: integer("settings_version").notNull().default(0),
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
    unique("accounts_id_user_id_unique").on(table.id, table.userId),
    check("accounts_currency_supported", sql`${table.currency} in ('BRL','USD','EUR','GBP','CAD','AUD')`),
    check("accounts_currency_confirmation", sql`${table.currencyConfiguredAt} is null or ${table.currency} is not null`),
    check("accounts_settings_version_non_negative", sql`${table.settingsVersion} >= 0`),
    check("accounts_version_non_negative", sql`${table.version} >= 0`),
    check(
      "accounts_balance_range",
      sql`${table.balance} between -9999999999999.99 and 9999999999999.99`,
    ),
  ],
);

export const recurringExpenses = pgTable(
  "recurring_expenses",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id").notNull(),
    userId: uuid("user_id").notNull(),
    requestId: uuid("request_id").notNull().unique(),
    creationHash: varchar("creation_hash", { length: 64 }).notNull(),
    description: varchar("description", { length: 160 }).notNull(),
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    category: transactionCategory("category").notNull().default("other"),
    frequency: recurrenceFrequency("frequency").notNull(),
    startsOn: date("starts_on", { mode: "string" }).notNull(),
    nextDueOn: date("next_due_on", { mode: "string" }).notNull(),
    nextOccurrence: integer("next_occurrence").notNull().default(0),
    version: integer("version").notNull().default(0),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "recurring_expenses_owner_fk",
      columns: [table.accountId, table.userId],
      foreignColumns: [accounts.id, accounts.userId],
    }).onDelete("restrict"),
    unique("recurring_expenses_id_owner_unique").on(
      table.id,
      table.accountId,
      table.userId,
    ),
    check(
      "recurring_amount_positive",
      sql`${table.amount} between 0.01 and 9999999999999.99`,
    ),
    check(
      "recurring_description_not_empty",
      sql`length(btrim(${table.description})) > 0`,
    ),
    check(
      "recurring_progress_valid",
      sql`${table.nextOccurrence} >= 0 and ${table.version} >= 0 and ${table.nextDueOn} >= ${table.startsOn}`,
    ),
    index("recurring_expenses_due_idx")
      .on(table.nextDueOn)
      .where(sql`${table.endedAt} is null`),
    index("recurring_expenses_account_idx").on(table.accountId, table.userId),
  ],
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    accountId: uuid("account_id").notNull(),
    userId: uuid("user_id").notNull(),
    requestId: uuid("request_id").notNull().unique(),
    type: transactionType("type").notNull(),
    category: transactionCategory("category").notNull().default("other"),
    // Always positive: type determines whether to add or subtract.
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
    description: varchar("description", { length: 160 }).notNull(),
    occurredOn: date("occurred_on", { mode: "string" }).notNull(),
    recurrenceId: uuid("recurrence_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    foreignKey({
      name: "transactions_recurrence_owner_fk",
      columns: [table.recurrenceId, table.accountId, table.userId],
      foreignColumns: [
        recurringExpenses.id,
        recurringExpenses.accountId,
        recurringExpenses.userId,
      ],
    }).onDelete("restrict"),
    unique("transactions_recurrence_date_unique").on(
      table.recurrenceId,
      table.occurredOn,
    ),
    check(
      "transactions_recurrence_expense_only",
      sql`${table.recurrenceId} is null or ${table.type} = 'expense'`,
    ),
    foreignKey({
      name: "transactions_account_user_owner_fk",
      columns: [table.accountId, table.userId],
      foreignColumns: [accounts.id, accounts.userId],
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
    userId: uuid("user_id").notNull(),
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
      name: "balance_adjustments_account_user_owner_fk",
      columns: [table.accountId, table.userId],
      foreignColumns: [accounts.id, accounts.userId],
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

export const settingsRequests = pgTable("account_settings_requests", {
  requestId: uuid("request_id").primaryKey(),
  accountId: uuid("account_id").notNull().references(() => accounts.id),
  userId: uuid("user_id").notNull().references(() => users.id),
  payload: text("payload").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type BalanceAdjustment = typeof balanceAdjustments.$inferSelect;
export type NewBalanceAdjustment = typeof balanceAdjustments.$inferInsert;
