/*
  # Deduct PayPal refunds from USD fund batches

  ## Summary
  When a PayPal refund request is marked as '已处理', the refund amount should be
  deducted from the most recent USD fund batch's remaining_usd balance.

  ## Changes
  1. Create a function `deduct_usd_for_refund` that deducts the refund amount from
     the oldest batch that still has sufficient remaining balance (FIFO).
  2. Create a trigger on `refund_requests` that fires AFTER UPDATE when status changes
     to '已处理' and refund_method is 'PayPal', calling the deduction function.
  3. Retroactively deduct any existing '已处理' PayPal refunds that haven't been 
     accounted for yet.

  ## Notes
  - Uses FIFO deduction: deducts from oldest batch first
  - If no single batch covers the full amount, deducts across multiple batches
  - remaining_usd will never go below 0 per batch
*/

CREATE OR REPLACE FUNCTION deduct_usd_for_refund()
RETURNS TRIGGER AS $$
DECLARE
  remaining_to_deduct NUMERIC;
  batch RECORD;
  deduct_now NUMERIC;
BEGIN
  IF NEW.status = '已处理' AND NEW.refund_method = 'PayPal' AND
     (OLD.status IS DISTINCT FROM '已处理') THEN
    remaining_to_deduct := COALESCE(NEW.refund_amount_usd, 0);

    FOR batch IN
      SELECT id, remaining_usd
      FROM usd_fund_batches
      WHERE remaining_usd > 0
      ORDER BY purchase_date ASC, created_at ASC
    LOOP
      EXIT WHEN remaining_to_deduct <= 0;
      deduct_now := LEAST(batch.remaining_usd, remaining_to_deduct);
      UPDATE usd_fund_batches
        SET remaining_usd = remaining_usd - deduct_now,
            updated_at = now()
        WHERE id = batch.id;
      remaining_to_deduct := remaining_to_deduct - deduct_now;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_deduct_usd_on_refund ON refund_requests;
CREATE TRIGGER trg_deduct_usd_on_refund
  AFTER UPDATE ON refund_requests
  FOR EACH ROW
  EXECUTE FUNCTION deduct_usd_for_refund();

DO $$
DECLARE
  r RECORD;
  remaining_to_deduct NUMERIC;
  batch RECORD;
  deduct_now NUMERIC;
BEGIN
  FOR r IN
    SELECT id, refund_amount_usd
    FROM refund_requests
    WHERE status = '已处理' AND refund_method = 'PayPal'
  LOOP
    remaining_to_deduct := COALESCE(r.refund_amount_usd, 0);
    FOR batch IN
      SELECT id, remaining_usd
      FROM usd_fund_batches
      WHERE remaining_usd > 0
      ORDER BY purchase_date ASC, created_at ASC
    LOOP
      EXIT WHEN remaining_to_deduct <= 0;
      deduct_now := LEAST(batch.remaining_usd, remaining_to_deduct);
      UPDATE usd_fund_batches
        SET remaining_usd = remaining_usd - deduct_now,
            updated_at = now()
        WHERE id = batch.id;
      remaining_to_deduct := remaining_to_deduct - deduct_now;
    END LOOP;
  END LOOP;
END $$;
