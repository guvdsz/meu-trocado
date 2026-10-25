ALTER TABLE "balance_adjustments" DROP CONSTRAINT "balance_adjustments_account_id_accounts_id_fkey";--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_account_id_accounts_id_fkey";--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "google_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "balance_adjustments" ADD COLUMN "google_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "google_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_id_google_id_unique" UNIQUE("id","google_id");--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_google_id_key" UNIQUE("google_id");--> statement-breakpoint
ALTER TABLE "balance_adjustments" ADD CONSTRAINT "balance_adjustments_account_google_owner_fk" FOREIGN KEY ("account_id","google_id") REFERENCES "accounts"("id","google_id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_google_owner_fk" FOREIGN KEY ("account_id","google_id") REFERENCES "accounts"("id","google_id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_google_id_not_empty" CHECK (length(btrim("google_id")) > 0);