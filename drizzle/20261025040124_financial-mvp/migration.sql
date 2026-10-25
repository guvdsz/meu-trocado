CREATE TYPE "transaction_type" AS ENUM('income', 'expense');--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"clerk_user_id" text NOT NULL UNIQUE,
	"currency" varchar(3) DEFAULT 'BRL' NOT NULL,
	"balance" numeric(15,2) DEFAULT '0.00' NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_currency_brl" CHECK ("currency" = 'BRL'),
	CONSTRAINT "accounts_owner_not_empty" CHECK (length(btrim("clerk_user_id")) > 0),
	CONSTRAINT "accounts_version_non_negative" CHECK ("version" >= 0),
	CONSTRAINT "accounts_balance_range" CHECK ("balance" between -9999999999999.99 and 9999999999999.99)
);
--> statement-breakpoint
CREATE TABLE "balance_adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"account_id" uuid NOT NULL,
	"request_id" uuid NOT NULL UNIQUE,
	"previous_balance" numeric(15,2) NOT NULL,
	"new_balance" numeric(15,2) NOT NULL,
	"reason" varchar(240) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "balance_adjustments_changed" CHECK ("previous_balance" <> "new_balance"),
	CONSTRAINT "balance_adjustments_reason_not_empty" CHECK (length(btrim("reason")) > 0),
	CONSTRAINT "balance_adjustments_previous_range" CHECK ("previous_balance" between -9999999999999.99 and 9999999999999.99),
	CONSTRAINT "balance_adjustments_new_range" CHECK ("new_balance" between -9999999999999.99 and 9999999999999.99)
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"account_id" uuid NOT NULL,
	"request_id" uuid NOT NULL UNIQUE,
	"type" "transaction_type" NOT NULL,
	"amount" numeric(15,2) NOT NULL,
	"description" varchar(160) NOT NULL,
	"occurred_on" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_amount_positive" CHECK ("amount" between 0.01 and 9999999999999.99),
	CONSTRAINT "transactions_description_not_empty" CHECK (length(btrim("description")) > 0)
);
--> statement-breakpoint
CREATE INDEX "balance_adjustments_account_timeline_idx" ON "balance_adjustments" ("account_id","created_at","id");--> statement-breakpoint
CREATE INDEX "transactions_account_timeline_idx" ON "transactions" ("account_id","occurred_on","created_at","id");--> statement-breakpoint
CREATE INDEX "transactions_account_type_date_idx" ON "transactions" ("account_id","type","occurred_on");--> statement-breakpoint
ALTER TABLE "balance_adjustments" ADD CONSTRAINT "balance_adjustments_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE RESTRICT;