/*
  # Add batch_date and label to order_batches

  1. Changes
    - `order_batches`: add `batch_date` (date) for when the batch was created
    - `order_batches`: add `label` (text) for a short display name/tag
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_batches' AND column_name = 'batch_date'
  ) THEN
    ALTER TABLE order_batches ADD COLUMN batch_date date DEFAULT CURRENT_DATE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_batches' AND column_name = 'label'
  ) THEN
    ALTER TABLE order_batches ADD COLUMN label text DEFAULT '';
  END IF;
END $$;
