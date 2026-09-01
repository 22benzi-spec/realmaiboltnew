/*
  # refund_requests: 独立记录业务需返金额

  - refund_due_amount_usd: 业务确认需返给买手的金额，不含 PayPal 等支付渠道手续费
  - refund_amount_usd: 继续表示业务提交的申请金额（需返金额 + 渠道手续费）
  - 历史记录保留 NULL，由前端按申请金额减手续费兼容还原
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'refund_requests'
      AND column_name = 'refund_due_amount_usd'
  ) THEN
    ALTER TABLE refund_requests
      ADD COLUMN refund_due_amount_usd numeric(12,2);
  END IF;
END $$;

COMMENT ON COLUMN refund_requests.refund_due_amount_usd
  IS '业务需返金额（USD），不含支付渠道手续费';
