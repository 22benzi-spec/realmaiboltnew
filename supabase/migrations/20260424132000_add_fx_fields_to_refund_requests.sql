/*
  # 付款审批其他付款增加外币字段

  让礼品卡 / 信用卡类其他付款申请可以保存 USD 金额与汇率，
  并在后续转交易流水时复用同一套字段。
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'refund_requests' AND column_name = 'refund_amount_usd'
  ) THEN
    ALTER TABLE refund_requests ADD COLUMN refund_amount_usd numeric(12,2) DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'refund_requests' AND column_name = 'exchange_rate'
  ) THEN
    ALTER TABLE refund_requests ADD COLUMN exchange_rate numeric(8,4) DEFAULT 7.25;
  END IF;
END $$;
