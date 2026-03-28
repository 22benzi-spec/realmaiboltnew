/*
  # Add fb_link and actual_paid fields to sub_orders

  1. Modified Tables
    - `sub_orders`
      - `fb_link` (text) - Facebook review link for the sub order
      - `actual_paid` (numeric) - Actual amount paid by the buyer

  2. Important Notes
    - fb_link stores the Facebook link associated with the review task
    - actual_paid records the real amount the buyer spent (may differ from product_price)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sub_orders' AND column_name = 'fb_link'
  ) THEN
    ALTER TABLE sub_orders ADD COLUMN fb_link text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sub_orders' AND column_name = 'actual_paid'
  ) THEN
    ALTER TABLE sub_orders ADD COLUMN actual_paid numeric DEFAULT 0;
  END IF;
END $$;