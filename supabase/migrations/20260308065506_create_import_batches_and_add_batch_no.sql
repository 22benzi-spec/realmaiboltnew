/*
  # Import Batches & Batch Number on Gift Cards

  ## Summary
  Adds an import batch tracking system so every bulk or single-card import is
  recorded as a batch, making it easy to audit exactly what was imported when.

  ## New Tables
  - `gift_card_import_batches`
    - `id` (uuid, PK)
    - `batch_no` (text, unique) — human-readable batch code, e.g. GC-20260308-001
    - `country` (text)
    - `face_value_usd` (numeric)
    - `supplier` (text)
    - `exchange_rate` (numeric)
    - `actual_cost` (numeric) — per-card cost in CNY
    - `card_count` (int) — number of cards in this batch
    - `operator` (text) — who imported this batch
    - `notes` (text)
    - `created_at` (timestamptz)

  ## Changes to gift_cards
  - `batch_no` (text) — references the batch this card belongs to

  ## Security
  - RLS enabled on import_batches with anon access policy (matching existing gift_cards pattern)
*/

CREATE TABLE IF NOT EXISTS gift_card_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_no text UNIQUE NOT NULL,
  country text NOT NULL DEFAULT '',
  face_value_usd numeric(10,2) NOT NULL DEFAULT 0,
  supplier text DEFAULT '',
  exchange_rate numeric(10,4) DEFAULT 7.25,
  actual_cost numeric(10,2) DEFAULT 0,
  card_count integer DEFAULT 0,
  operator text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE gift_card_import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon full access to gift_card_import_batches"
  ON gift_card_import_batches
  FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert gift_card_import_batches"
  ON gift_card_import_batches
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update gift_card_import_batches"
  ON gift_card_import_batches
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gift_cards' AND column_name = 'batch_no'
  ) THEN
    ALTER TABLE gift_cards ADD COLUMN batch_no text DEFAULT '';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_gift_cards_batch_no ON gift_cards(batch_no);
CREATE INDEX IF NOT EXISTS idx_import_batches_country ON gift_card_import_batches(country);
CREATE INDEX IF NOT EXISTS idx_import_batches_created_at ON gift_card_import_batches(created_at DESC);
