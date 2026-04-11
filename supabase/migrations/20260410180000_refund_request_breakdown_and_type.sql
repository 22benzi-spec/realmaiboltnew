/*
  # refund_requests: 金额拆分明细与申请类型

  - actual_paid_usd: 业务员填写的实付金额（买手实际支付）
  - paypal_fee_usd: PayPal 返款时的手续费（计入合计返款）
  - request_type: initial | supplement | correction
  - supersedes_request_id: 更正申请时关联上一笔（财务已打款但信息有误等）
  - supplement_reason: 追加/更正原因说明（如产品涨价、邮箱更正）
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'refund_requests' AND column_name = 'actual_paid_usd') THEN
    ALTER TABLE refund_requests ADD COLUMN actual_paid_usd numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'refund_requests' AND column_name = 'paypal_fee_usd') THEN
    ALTER TABLE refund_requests ADD COLUMN paypal_fee_usd numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'refund_requests' AND column_name = 'request_type') THEN
    ALTER TABLE refund_requests ADD COLUMN request_type text DEFAULT 'initial';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'refund_requests' AND column_name = 'supersedes_request_id') THEN
    ALTER TABLE refund_requests ADD COLUMN supersedes_request_id uuid REFERENCES refund_requests(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'refund_requests' AND column_name = 'supplement_reason') THEN
    ALTER TABLE refund_requests ADD COLUMN supplement_reason text DEFAULT '';
  END IF;
END $$;
