/*
  # 退款申请增加财务分类

  供退款审批页中的“其他退款”使用，区分佣金退款、任务退款、其他业务退款等类型。
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'refund_requests' AND column_name = 'refund_category'
  ) THEN
    ALTER TABLE refund_requests ADD COLUMN refund_category text DEFAULT '';
  END IF;
END $$;
