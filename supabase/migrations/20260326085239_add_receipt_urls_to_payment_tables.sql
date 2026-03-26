/*
  # Add receipt_urls to payment tables

  1. Changes
    - `financial_transactions`: add `receipt_urls` (text[]) to store uploaded receipt image/PDF URLs
    - `batch_payments`: add `receipt_urls` (text[]) for same purpose
    - `payment_groups`: add `receipt_urls` (text[])
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financial_transactions' AND column_name = 'receipt_urls'
  ) THEN
    ALTER TABLE financial_transactions ADD COLUMN receipt_urls text[] DEFAULT '{}';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batch_payments' AND column_name = 'receipt_urls'
  ) THEN
    ALTER TABLE batch_payments ADD COLUMN receipt_urls text[] DEFAULT '{}';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payment_groups' AND column_name = 'receipt_urls'
  ) THEN
    ALTER TABLE payment_groups ADD COLUMN receipt_urls text[] DEFAULT '{}';
  END IF;
END $$;
