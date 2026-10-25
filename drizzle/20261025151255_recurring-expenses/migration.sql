CREATE TYPE "recurrence_frequency" AS ENUM('monthly', 'yearly', 'semiannual', 'fortnightly');--> statement-breakpoint
CREATE TABLE "recurring_expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"account_id" uuid NOT NULL,
	"google_id" text NOT NULL,
	"request_id" uuid NOT NULL UNIQUE,
	"creation_hash" varchar(64) NOT NULL,
	"description" varchar(160) NOT NULL,
	"amount" numeric(15,2) NOT NULL,
	"category" "transaction_category" DEFAULT 'other'::"transaction_category" NOT NULL,
	"frequency" "recurrence_frequency" NOT NULL,
	"starts_on" date NOT NULL,
	"next_due_on" date NOT NULL,
	"next_occurrence" integer DEFAULT 0 NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_expenses_id_owner_unique" UNIQUE("id","account_id","google_id"),
	CONSTRAINT "recurring_amount_positive" CHECK ("amount" between 0.01 and 9999999999999.99),
	CONSTRAINT "recurring_description_not_empty" CHECK (length(btrim("description")) > 0),
	CONSTRAINT "recurring_progress_valid" CHECK ("next_occurrence" >= 0 and "version" >= 0 and "next_due_on" >= "starts_on")
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "recurrence_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurrence_date_unique" UNIQUE("recurrence_id","occurred_on");--> statement-breakpoint
CREATE INDEX "recurring_expenses_due_idx" ON "recurring_expenses" ("next_due_on") WHERE "ended_at" is null;--> statement-breakpoint
CREATE INDEX "recurring_expenses_account_idx" ON "recurring_expenses" ("account_id","google_id");--> statement-breakpoint
ALTER TABLE "recurring_expenses" ADD CONSTRAINT "recurring_expenses_owner_fk" FOREIGN KEY ("account_id","google_id") REFERENCES "accounts"("id","google_id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurrence_owner_fk" FOREIGN KEY ("recurrence_id","account_id","google_id") REFERENCES "recurring_expenses"("id","account_id","google_id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurrence_expense_only" CHECK ("recurrence_id" is null or "type" = 'expense');
--> statement-breakpoint
CREATE FUNCTION recurrence_occurrence_on(p_start date, p_frequency recurrence_frequency, p_occurrence integer)
RETURNS date LANGUAGE sql IMMUTABLE STRICT AS $$
  SELECT CASE WHEN p_frequency = 'fortnightly' THEN p_start + 15 * p_occurrence
    ELSE (p_start + make_interval(months => p_occurrence * CASE p_frequency
      WHEN 'monthly' THEN 1 WHEN 'semiannual' THEN 6 ELSE 12 END))::date END
$$;
--> statement-breakpoint
-- Every mutation locks the account before its schedules. This also serializes
-- the worker with manual balance adjustments and ordinary transactions.
CREATE FUNCTION process_account_recurrences(p_account uuid, p_google text, p_today date)
RETURNS integer LANGUAGE plpgsql AS $$
DECLARE
  rule recurring_expenses%ROWTYPE;
  due date;
  occurrence integer;
  inserted integer;
  generated integer := 0;
  debit numeric := 0;
BEGIN
  PERFORM 1 FROM accounts WHERE id = p_account AND google_id = p_google FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account not found' USING ERRCODE = 'P0002'; END IF;
  FOR rule IN SELECT * FROM recurring_expenses
    WHERE account_id = p_account AND google_id = p_google
      AND ended_at IS NULL AND next_due_on <= p_today ORDER BY id FOR UPDATE
  LOOP
    due := rule.next_due_on;
    occurrence := rule.next_occurrence;
    WHILE due <= p_today LOOP
      INSERT INTO transactions (account_id, google_id, request_id, type, category, amount, description, occurred_on, recurrence_id)
      VALUES (p_account, p_google, CASE WHEN occurrence = 0 THEN rule.request_id ELSE gen_random_uuid() END,
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
      WHERE id = p_account AND google_id = p_google;
  END IF;
  RETURN generated;
END $$;
--> statement-breakpoint
CREATE FUNCTION create_recurring_expense(p_account uuid, p_google text, p_clerk text,
  p_request uuid, p_hash text, p_description text, p_amount numeric,
  p_category transaction_category, p_frequency recurrence_frequency, p_start date, p_today date)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE existing recurring_expenses%ROWTYPE; result uuid;
BEGIN
  PERFORM 1 FROM accounts WHERE id = p_account AND google_id = p_google AND clerk_user_id = p_clerk FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account not found' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO existing FROM recurring_expenses WHERE request_id = p_request;
  IF FOUND THEN
    IF existing.account_id <> p_account OR existing.google_id <> p_google OR existing.creation_hash <> p_hash THEN
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
  INSERT INTO recurring_expenses (account_id, google_id, request_id, creation_hash,
    description, amount, category, frequency, starts_on, next_due_on)
  VALUES (p_account, p_google, p_request, p_hash, p_description, p_amount,
    p_category, p_frequency, p_start, p_start) RETURNING id INTO result;
  UPDATE accounts SET version = version + 1, updated_at = now() WHERE id = p_account;
  PERFORM process_account_recurrences(p_account, p_google, p_today);
  RETURN result;
END $$;
--> statement-breakpoint
CREATE FUNCTION manage_recurring_expense(p_account uuid, p_google text, p_clerk text,
  p_id uuid, p_version integer, p_end boolean, p_description text,
  p_amount numeric, p_category transaction_category, p_today date)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE rule recurring_expenses%ROWTYPE;
BEGIN
  PERFORM 1 FROM accounts WHERE id = p_account AND google_id = p_google AND clerk_user_id = p_clerk FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account not found' USING ERRCODE = 'P0002'; END IF;
  SELECT * INTO rule FROM recurring_expenses
    WHERE id = p_id AND account_id = p_account AND google_id = p_google FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Recurrence not found' USING ERRCODE = 'P0002'; END IF;
  IF p_end AND rule.ended_at IS NOT NULL THEN RETURN; END IF;
  IF rule.ended_at IS NOT NULL OR rule.version <> p_version THEN
    RAISE EXCEPTION 'Recurrence changed' USING ERRCODE = 'P0001';
  END IF;
  -- Charge dates already due with the previous terms before changing future ones.
  PERFORM process_account_recurrences(p_account, p_google, p_today);
  IF p_end THEN
    UPDATE recurring_expenses SET ended_at = now(), version = version + 1, updated_at = now() WHERE id = p_id;
  ELSE
    UPDATE recurring_expenses SET description = p_description, amount = p_amount, category = p_category,
      version = version + 1, updated_at = now() WHERE id = p_id;
  END IF;
  UPDATE accounts SET version = version + 1, updated_at = now() WHERE id = p_account;
END $$;
