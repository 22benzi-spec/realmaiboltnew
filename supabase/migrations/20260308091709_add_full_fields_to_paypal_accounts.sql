/*
  # Expand PayPal Accounts Table

  ## Summary
  Adds all fields needed for full PayPal account management:
  password, server IP/credentials, bank card details, lifecycle dates.

  ## New Columns on paypal_accounts
  - `password` (text) — PayPal login password (sensitive)
  - `server_ip` (text) — Proxy/server IP address
  - `server_username` (text) — Server login username
  - `server_password` (text) — Server login password (sensitive)
  - `bank_card_number` (text) — Linked bank card number (sensitive)
  - `bank_card_holder` (text) — Bank card holder name
  - `bank_name` (text) — Bank name
  - `started_at` (date) — Date account started being used
  - `died_at` (date) — Date account became unusable / was closed
  - `import_batch` (text) — Batch identifier for bulk imports
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='paypal_accounts' AND column_name='password') THEN
    ALTER TABLE paypal_accounts ADD COLUMN password text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='paypal_accounts' AND column_name='server_ip') THEN
    ALTER TABLE paypal_accounts ADD COLUMN server_ip text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='paypal_accounts' AND column_name='server_username') THEN
    ALTER TABLE paypal_accounts ADD COLUMN server_username text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='paypal_accounts' AND column_name='server_password') THEN
    ALTER TABLE paypal_accounts ADD COLUMN server_password text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='paypal_accounts' AND column_name='bank_card_number') THEN
    ALTER TABLE paypal_accounts ADD COLUMN bank_card_number text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='paypal_accounts' AND column_name='bank_card_holder') THEN
    ALTER TABLE paypal_accounts ADD COLUMN bank_card_holder text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='paypal_accounts' AND column_name='bank_name') THEN
    ALTER TABLE paypal_accounts ADD COLUMN bank_name text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='paypal_accounts' AND column_name='started_at') THEN
    ALTER TABLE paypal_accounts ADD COLUMN started_at date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='paypal_accounts' AND column_name='died_at') THEN
    ALTER TABLE paypal_accounts ADD COLUMN died_at date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='paypal_accounts' AND column_name='import_batch') THEN
    ALTER TABLE paypal_accounts ADD COLUMN import_batch text DEFAULT '';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_paypal_accounts_import_batch ON paypal_accounts(import_batch);
CREATE INDEX IF NOT EXISTS idx_paypal_accounts_status ON paypal_accounts(status);
