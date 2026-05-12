/*
  # Add business detail fields to financial transactions

  Business ledger entries can now carry compact summary fields and a JSON
  breakdown for multi-country, multi-type scenarios such as refunds and
  book offsets.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_transactions' AND column_name = 'business_countries'
  ) THEN
    ALTER TABLE financial_transactions ADD COLUMN business_countries text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_transactions' AND column_name = 'business_types'
  ) THEN
    ALTER TABLE financial_transactions ADD COLUMN business_types text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_transactions' AND column_name = 'business_order_count'
  ) THEN
    ALTER TABLE financial_transactions ADD COLUMN business_order_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_transactions' AND column_name = 'business_breakdown'
  ) THEN
    ALTER TABLE financial_transactions ADD COLUMN business_breakdown jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_transactions' AND column_name = 'offset_source_type'
  ) THEN
    ALTER TABLE financial_transactions ADD COLUMN offset_source_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_transactions' AND column_name = 'offset_source_note'
  ) THEN
    ALTER TABLE financial_transactions ADD COLUMN offset_source_note text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batch_payments' AND column_name = 'business_countries'
  ) THEN
    ALTER TABLE batch_payments ADD COLUMN business_countries text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batch_payments' AND column_name = 'business_types'
  ) THEN
    ALTER TABLE batch_payments ADD COLUMN business_types text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batch_payments' AND column_name = 'business_order_count'
  ) THEN
    ALTER TABLE batch_payments ADD COLUMN business_order_count integer DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batch_payments' AND column_name = 'business_breakdown'
  ) THEN
    ALTER TABLE batch_payments ADD COLUMN business_breakdown jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batch_payments' AND column_name = 'offset_source_type'
  ) THEN
    ALTER TABLE batch_payments ADD COLUMN offset_source_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batch_payments' AND column_name = 'offset_source_note'
  ) THEN
    ALTER TABLE batch_payments ADD COLUMN offset_source_note text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ft_business_countries
  ON financial_transactions USING gin (business_countries);

CREATE INDEX IF NOT EXISTS idx_ft_business_types
  ON financial_transactions USING gin (business_types);
