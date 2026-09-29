/*
  # Add country to refund requests

  Other-payment applications under 运营支出 can optionally record a country.
  The value is display-only for that category and is not required.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'refund_requests' AND column_name = 'country'
  ) THEN
    ALTER TABLE refund_requests ADD COLUMN country text DEFAULT '';
  END IF;
END $$;
