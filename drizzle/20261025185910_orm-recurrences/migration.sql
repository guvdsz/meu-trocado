-- Rules now run through Drizzle transactions in the application.
-- Remove obsolete functions without changing tables or financial records.
DROP FUNCTION IF EXISTS create_recurring_expense(uuid, uuid, uuid, text, text, numeric, transaction_category, recurrence_frequency, date, date);
--> statement-breakpoint
DROP FUNCTION IF EXISTS manage_recurring_expense(uuid, uuid, uuid, integer, boolean, text, numeric, transaction_category, date);
--> statement-breakpoint
DROP FUNCTION IF EXISTS process_account_recurrences(uuid, uuid, date);
--> statement-breakpoint
DROP FUNCTION IF EXISTS recurrence_occurrence_on(date, recurrence_frequency, integer);
