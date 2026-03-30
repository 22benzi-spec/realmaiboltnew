/*
  # Add feedback_channel to erp_orders

  1. Changes
    - Add `feedback_channel` column to `erp_orders` table
      - Values: '群组' or '私聊'
      - Indicates how the customer communicates feedback
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'erp_orders' AND column_name = 'feedback_channel'
  ) THEN
    ALTER TABLE erp_orders ADD COLUMN feedback_channel text DEFAULT NULL;
  END IF;
END $$;
