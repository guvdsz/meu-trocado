-- Development reset explicitly requested: existing financial records are discarded.
TRUNCATE TABLE transactions, balance_adjustments, recurring_expenses, accounts;
--> statement-breakpoint
DROP FUNCTION process_account_recurrences(uuid, text, date);
--> statement-breakpoint
DROP FUNCTION create_recurring_expense(uuid, text, text, uuid, text, text, numeric, transaction_category, recurrence_frequency, date, date);
--> statement-breakpoint
DROP FUNCTION manage_recurring_expense(uuid, text, text, uuid, integer, boolean, text, numeric, transaction_category, date);
--> statement-breakpoint
ALTER TABLE transactions DROP CONSTRAINT transactions_recurrence_owner_fk;
--> statement-breakpoint
ALTER TABLE recurring_expenses DROP CONSTRAINT recurring_expenses_owner_fk;
--> statement-breakpoint
ALTER TABLE recurring_expenses DROP CONSTRAINT recurring_expenses_id_owner_unique;
--> statement-breakpoint
DROP INDEX recurring_expenses_account_idx;
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"provider_id" text NOT NULL UNIQUE,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_provider_id_not_empty" CHECK (length(btrim("provider_id")) > 0)
);
--> statement-breakpoint
ALTER TABLE "balance_adjustments" DROP CONSTRAINT "balance_adjustments_account_google_owner_fk";
--> statement-breakpoint
ALTER TABLE "transactions" DROP CONSTRAINT "transactions_account_google_owner_fk";
--> statement-breakpoint
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_clerk_user_id_key";
--> statement-breakpoint
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_id_google_id_unique";
--> statement-breakpoint
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_google_id_key";
--> statement-breakpoint
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_owner_not_empty";
--> statement-breakpoint
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_google_id_not_empty";
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "user_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "balance_adjustments" ADD COLUMN "user_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD COLUMN "user_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "user_id" uuid NOT NULL;
--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "clerk_user_id";
--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "google_id";
--> statement-breakpoint
ALTER TABLE "balance_adjustments" DROP COLUMN "google_id";
--> statement-breakpoint
ALTER TABLE "recurring_expenses" DROP COLUMN "google_id";
--> statement-breakpoint
ALTER TABLE "transactions" DROP COLUMN "google_id";
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_id_user_id_unique" UNIQUE("id","user_id");
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_key" UNIQUE("user_id");
--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_id_owner_unique" UNIQUE("id","account_id","user_id");
--> statement-breakpoint
CREATE INDEX "recurring_expenses_account_idx" ON "recurring_expenses" ("account_id","user_id");
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "balance_adjustments" ADD CONSTRAINT "balance_adjustments_account_user_owner_fk" FOREIGN KEY ("account_id","user_id") REFERENCES "accounts"("id","user_id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_user_owner_fk" FOREIGN KEY ("account_id","user_id") REFERENCES "accounts"("id","user_id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_owner_fk" FOREIGN KEY ("account_id","user_id") REFERENCES "accounts"("id","user_id") ON DELETE RESTRICT;
--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurrence_owner_fk" FOREIGN KEY ("recurrence_id","account_id","user_id") REFERENCES "recurring_expenses"("id","account_id","user_id") ON DELETE RESTRICT;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION recurrence_occurrence_on(p_start date, p_frequency recurrence_frequency, p_occurrence integer)
RETURNS date LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT CASE WHEN p_frequency = 'fortnightly' THEN p_start + 15 * p_occurrence
    ELSE (p_start + make_interval(months => p_occurrence * CASE p_frequency
      WHEN 'monthly' THEN 1 WHEN 'semiannual' THEN 6 ELSE 12 END))::date END
$$;
--> statement-breakpoint
-- Every mutation locks the account before its schedules. This also serializes
-- the worker with manual balance adjustments and ordinary transactions.
CREATE OR REPLACE FUNCTION process_account_recurrences(p_account uuid, p_user uuid, p_today date)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  rule recurring_expenses%ROWTYPE;
  due date;
  occurrence integer;
  inserted integer;
  generated integer := 0;
  debit numeric := 0;
BEGIN
  PERFORM 1 FROM accounts WHERE id = p_account AND user_id = p_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account not found' USING ERRCODE = 'P0002'; END IF;
  FOR rule IN SELECT * FROM recurring_expenses
    WHERE account_id = p_account AND user_id = p_user
      AND ended_at IS NULL AND next_due_on <= p_today ORDER BY id FOR UPDATE
  LOOP
    due := rule.next_due_on;
    occurrence := rule.next_occurrence;
    WHILE due <= p_today LOOP
      INSERT INTO transactions (account_id, user_id, request_id, type, category, amount, description, occurred_on, recurrence_id)
      VALUES (p_account, p_user, CASE WHEN occurrence = 0 THEN rule.request_id ELSE gen_random_uuid() END,
        'expense', rule.category, rule.amount, rule.description, due, rule.id)
      ON CONFLICT (recurrence_id, occurred_on) DO NOTHING;
      GET DIAGNOSTICS inserted = ROW_COUNT;
      generated := generated + inserted;
      debit := debit + rule.amount * inserted;
      occurrence := occurrence + 1;
      due := recurrence_occurrence_on(rule.starts_on, rule.frequency, occurrence);
    END LOOP;
    UPDATE recurring_expenses SET next_due_on = due, next_occurrence = occurrence,
      version = version + 1, updated_at = now() WHERE id = rule.id;
  END LOOP;
  IF generated > 0 THEN
    UPDATE accounts SET balance = balance - debit, version = version + 1, updated_at = now()
      WHERE id = p_account AND user_id = p_user;
  END IF;
  RETURN generated;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION create_recurring_expense(p_account uuid, p_user uuid,
  p_request uuid, p_hash text, p_description text, p_amount numeric,
  p_category transaction_category, p_frequency recurrence_frequency, p_start date, p_today date)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE existing recurring_expenses%ROWTYPE; result uuid;
BEGIN
  PERFORM 1 FROM accounts WHERE id = p_account AND user_id = p_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account not found' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO existing FROM recurring_expenses WHERE request_id = p_request;
  IF FOUND THEN
    IF existing.account_id <> p_account OR existing.user_id <> p_user OR existing.creation_hash <> p_hash THEN
      RAISE EXCEPTION 'Request already used' USING ERRCODE = 'P0001';
    END IF;
    RETURN existing.id;
  END IF;
  IF EXISTS (SELECT 1 FROM transactions WHERE request_id = p_request) THEN
    RAISE EXCEPTION 'Request already used' USING ERRCODE = 'P0001';
  END IF;
  IF p_start < p_today OR p_start > '2099-12-31'::date THEN
    RAISE EXCEPTION 'Invalid start date' USING ERRCODE = '22007';
  END IF;
  INSERT INTO recurring_expenses (account_id, user_id, request_id, creation_hash,
    description, amount, category, frequency, starts_on, next_due_on)
  VALUES (p_account, p_user, p_request, p_hash, p_description, p_amount,
    p_category, p_frequency, p_start, p_start) RETURNING id INTO result;
  UPDATE accounts SET version = version + 1, updated_at = now() WHERE id = p_account;
  PERFORM process_account_recurrences(p_account, p_user, p_today);
  RETURN result;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION manage_recurring_expense(p_account uuid, p_user uuid,
  p_id uuid, p_version integer, p_end boolean, p_description text,
  p_amount numeric, p_category transaction_category, p_today date)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE rule recurring_expenses%ROWTYPE;
BEGIN
  PERFORM 1 FROM accounts WHERE id = p_account AND user_id = p_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account not found' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO rule FROM recurring_expenses
    WHERE id = p_id AND account_id = p_account AND user_id = p_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Recurrence not found' USING ERRCODE = 'P0002'; END IF;
  IF p_end AND rule.ended_at IS NOT NULL THEN RETURN; END IF;
  IF rule.ended_at IS NOT NULL OR rule.version <> p_version THEN
    RAISE EXCEPTION 'Recurrence changed' USING ERRCODE = 'P0001';
  END IF;
  -- Charge dates already due with the previous terms before changing future ones.
  PERFORM process_account_recurrences(p_account, p_user, p_today);
  IF p_end THEN
    UPDATE recurring_expenses SET ended_at = now(), version = version + 1, updated_at = now() WHERE id = p_id;
  ELSE
    UPDATE recurring_expenses SET description = p_description, amount = p_amount, category = p_category,
      version = version + 1, updated_at = now() WHERE id = p_id;
  END IF;
  UPDATE accounts SET version = version + 1, updated_at = now() WHERE id = p_account;
END $$;

