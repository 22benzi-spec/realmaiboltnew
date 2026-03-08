/*
  # Gift Card Invalid Status & Replacement Support

  ## Summary
  Supports the workflow where a gift card is discovered to be invalid only after use,
  and a supplier provides a replacement card (new card number/code).

  ## Changes to gift_cards table
  - New status value '已失效' for cards found invalid after attempted use
  - `replacement_for_id` (uuid): points to the original invalid card this card replaces
  - `invalid_reason` (text): reason recorded when marking a card as invalid
  - `used_for_sub_order_no` (text): human-readable sub order number for display

  ## Notes
  - Status flow: 未使用 → 已使用 (normal) | 已使用 → 已失效 (discovered invalid after use)
  - Replacement card: new card inserted with replacement_for_id = original card id, inherits sub_order link
  - existing status values: 未使用, 已使用, 已作废, now adding 已失效
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gift_cards' AND column_name = 'replacement_for_id'
  ) THEN
    ALTER TABLE gift_cards ADD COLUMN replacement_for_id uuid REFERENCES gift_cards(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gift_cards' AND column_name = 'invalid_reason'
  ) THEN
    ALTER TABLE gift_cards ADD COLUMN invalid_reason text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gift_cards' AND column_name = 'used_for_sub_order_no'
  ) THEN
    ALTER TABLE gift_cards ADD COLUMN used_for_sub_order_no text DEFAULT '';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gift_cards_replacement_for_id ON gift_cards(replacement_for_id);
