/*
  # Add chat_order_id to buyers table

  1. Modified Tables
    - `buyers`: add `chat_order_id` (text) - buyer's chat/contact account ID
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'buyers' AND column_name = 'chat_order_id'
  ) THEN
    ALTER TABLE buyers ADD COLUMN chat_order_id text DEFAULT '';
  END IF;
END $$;