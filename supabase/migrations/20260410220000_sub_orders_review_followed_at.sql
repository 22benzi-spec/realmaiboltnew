/*
  # sub_orders.review_followed_at
  记录业务员在评论跟进中点击「催评」的时间，便于工作台展示最近催评日期。
*/
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'sub_orders' AND column_name = 'review_followed_at'
  ) THEN
    ALTER TABLE sub_orders ADD COLUMN review_followed_at timestamptz;
  END IF;
END $$;
