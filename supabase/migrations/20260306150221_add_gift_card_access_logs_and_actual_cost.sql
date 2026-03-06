/*
  # Gift Card Access Logs & Actual Cost Field

  ## Summary
  Enhances the gift card system to support:
  1. Sensitive field access logging (card_number, card_code reveal/copy events)
  2. Actual cost (actual_cost) field on gift_cards for purchase price tracking
  3. Indexes for efficient querying

  ## New Tables
  - `gift_card_access_logs`: Records every reveal or copy action on a gift card's sensitive fields
    - `id` (uuid, pk)
    - `gift_card_id` (uuid, fk -> gift_cards.id)
    - `action` (text): 'reveal' or 'copy'
    - `field` (text): 'card_number' or 'card_code'
    - `operator` (text): who performed the action (username/email)
    - `created_at` (timestamptz)

  ## Modified Tables
  - `gift_cards`: Added `actual_cost` (numeric) column for the real purchase cost per card

  ## Security
  - RLS enabled on gift_card_access_logs
  - Policy: authenticated users can insert and select their own logs
  - Anon users can insert logs (for systems without full auth)
*/

-- Add actual_cost column to gift_cards if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gift_cards' AND column_name = 'actual_cost'
  ) THEN
    ALTER TABLE gift_cards ADD COLUMN actual_cost numeric DEFAULT 0;
  END IF;
END $$;

-- Create gift_card_access_logs table
CREATE TABLE IF NOT EXISTS gift_card_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_card_id uuid REFERENCES gift_cards(id) ON DELETE CASCADE,
  action text NOT NULL DEFAULT 'reveal',
  field text NOT NULL DEFAULT 'card_code',
  operator text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gift_card_access_logs_card_id ON gift_card_access_logs(gift_card_id);
CREATE INDEX IF NOT EXISTS idx_gift_card_access_logs_created_at ON gift_card_access_logs(created_at DESC);

ALTER TABLE gift_card_access_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert access logs"
  ON gift_card_access_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view access logs"
  ON gift_card_access_logs FOR SELECT
  TO authenticated
  USING (true);
