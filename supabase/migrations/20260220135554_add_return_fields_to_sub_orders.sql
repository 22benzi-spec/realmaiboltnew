/*
  # Add return (回转) fields to sub_orders

  1. Changes
    - `sub_orders`
      - `return_reason` (text) - reason for returning the order to admin
      - `returned_at` (timestamptz) - timestamp when returned

  2. Notes
    - These fields track when a staff member returns a sub-order back to admin for reassignment
    - Status is set back to '待分配' and staff is cleared on return
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sub_orders' AND column_name = 'return_reason'
  ) THEN
    ALTER TABLE sub_orders ADD COLUMN return_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sub_orders' AND column_name = 'returned_at'
  ) THEN
    ALTER TABLE sub_orders ADD COLUMN returned_at timestamptz;
  END IF;
END $$;
