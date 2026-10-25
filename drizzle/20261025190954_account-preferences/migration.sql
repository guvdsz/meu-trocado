CREATE TABLE "account_settings_requests" (
	"request_id" uuid PRIMARY KEY,
	"account_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"payload" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_currency_brl";--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "currency_configured_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "time_zone" text DEFAULT 'America/Sao_Paulo' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "locale" varchar(10) DEFAULT 'pt-BR' NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "settings_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "currency" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "currency" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "account_settings_requests" ADD CONSTRAINT "account_settings_requests_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id");--> statement-breakpoint
ALTER TABLE "account_settings_requests" ADD CONSTRAINT "account_settings_requests_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_currency_supported" CHECK ("currency" in ('BRL','USD','EUR','GBP','CAD','AUD'));--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_currency_confirmation" CHECK ("currency_configured_at" is null or "currency" is not null);--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_settings_version_non_negative" CHECK ("settings_version" >= 0);