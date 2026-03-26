/*
  # Create batch_payments table and add order feedback fields

  1. New Tables
    - `batch_payments` - Records payments received for order batches
      - `id` (uuid, primary key)
      - `batch_id` (uuid, FK to order_batches)
      - `batch_number` (text)
      - `transaction_id` (uuid, FK to financial_transactions) - auto-created transaction link
      - `amount_cny` (numeric) - payment amount in CNY
      - `payment_date` (date) - when payment was received
      - `payment_method` (text) - e.g. bank transfer, WeChat, Alipay
      - `payer_name` (text) - who paid
      - `recorded_by` (text) - who recorded this payment
      - `notes` (text) - payment notes
      - `created_at` / `updated_at` (timestamptz)

  2. Modified Tables
    - `erp_orders` - Added feedback tracking fields
      - `order_feedback_status` (text) - order feedback status: pending/completed
      - `order_feedback_date` (date) - when order feedback was submitted
      - `review_feedback_status` (text) - review feedback status: pending/completed
      - `review_feedback_date` (date) - when review feedback was submitted
      - `feedback_notes` (text) - feedback notes

  3. Security
    - Enable RLS on `batch_payments` table
    - Add policy for authenticated access
*/

-- Create batch_payments table
CREATE TABLE IF NOT EXISTS batch_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid REFERENCES order_batches(id) ON DELETE CASCADE,
  batch_number text,
  transaction_id uuid,
  amount_cny numeric(12,2) NOT NULL DEFAULT 0,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text DEFAULT '银行转账',
  payer_name text,
  recorded_by text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE batch_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view batch payments"
  ON batch_payments FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert batch payments"
  ON batch_payments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update batch payments"
  ON batch_payments FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete batch payments"
  ON batch_payments FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Grant anon access (matching existing pattern in codebase)
GRANT ALL ON batch_payments TO anon;

-- Add feedback tracking fields to erp_orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'erp_orders' AND column_name = 'order_feedback_status'
  ) THEN
    ALTER TABLE erp_orders ADD COLUMN order_feedback_status text DEFAULT '未反馈';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'erp_orders' AND column_name = 'order_feedback_date'
  ) THEN
    ALTER TABLE erp_orders ADD COLUMN order_feedback_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'erp_orders' AND column_name = 'review_feedback_status'
  ) THEN
    ALTER TABLE erp_orders ADD COLUMN review_feedback_status text DEFAULT '未反馈';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'erp_orders' AND column_name = 'review_feedback_date'
  ) THEN
    ALTER TABLE erp_orders ADD COLUMN review_feedback_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'erp_orders' AND column_name = 'feedback_notes'
  ) THEN
    ALTER TABLE erp_orders ADD COLUMN feedback_notes text;
  END IF;
END $$;

-- Add batch_payment source type to financial_transactions for filtering
-- (no schema change needed, the transaction_type field is already text)