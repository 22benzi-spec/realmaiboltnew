/*
  # Add payout QR code to refund requests

  Stores the recipient QR code URL submitted with other-payment applications.
  Payment receipt screenshots continue to use paypal_receipt_screenshot.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'refund_requests' AND column_name = 'payout_qr_code'
  ) THEN
    ALTER TABLE refund_requests ADD COLUMN payout_qr_code text DEFAULT '';
  END IF;
END $$;
