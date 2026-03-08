/*
  # Gift Card Operator & Refund Tracking Fields

  ## Summary
  Adds fields to track who used a gift card and who processed any refund related to it.
  Also adds a void_reason field (replaces the separate invalid_reason for a unified voiding workflow).

  ## Changes to gift_cards
  - `used_by_operator` (text): name/ID of the staff member who assigned/used this card
  - `refund_operator` (text): name/ID of the staff member who processed the refund
  - `refund_at` (timestamptz): when the refund was processed
  - `void_reason` (text): reason for voiding (invalid card, manual void, etc.)

  ## Notes
  - '已失效' status is being merged into '已作废' in the application layer
  - void_reason replaces invalid_reason for all void scenarios
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gift_cards' AND column_name = 'used_by_operator'
  ) THEN
    ALTER TABLE gift_cards ADD COLUMN used_by_operator text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gift_cards' AND column_name = 'refund_operator'
  ) THEN
    ALTER TABLE gift_cards ADD COLUMN refund_operator text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gift_cards' AND column_name = 'refund_at'
  ) THEN
    ALTER TABLE gift_cards ADD COLUMN refund_at timestamptz;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gift_cards' AND column_name = 'void_reason'
  ) THEN
    ALTER TABLE gift_cards ADD COLUMN void_reason text DEFAULT '';
  END IF;
END $$;

UPDATE gift_cards SET status = '已作废', void_reason = COALESCE(invalid_reason, '') WHERE status = '已失效';
