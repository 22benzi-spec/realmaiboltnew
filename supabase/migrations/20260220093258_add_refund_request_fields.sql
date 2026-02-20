/*
  # 补充退款申请表字段

  ## 改动说明
  原退款申请表缺少财务处理结果所需字段：
  - PayPal退款：需要记录退款截图URL、公司付款PayPal账号
  - 礼品卡退款：需要记录礼品卡Code、面额
  - 退款时序：先退款后给单 / 先给单后退款
  - 退款金额使用USD

  ## 新增字段
  - refund_sequence: 退款时序（先退款后给单/先给单后退款）
  - refund_amount_usd: 退款金额（美金）
  - paypal_receipt_screenshot: PayPal退款截图URL
  - gift_card_face_value_usd: 礼品卡面额USD
  - sub_order_number: 子订单号（冗余，方便查询）
  - product_name: 产品名（冗余）
  - product_price: 产品价格USD
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'refund_requests' AND column_name = 'refund_sequence') THEN
    ALTER TABLE refund_requests ADD COLUMN refund_sequence text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'refund_requests' AND column_name = 'refund_amount_usd') THEN
    ALTER TABLE refund_requests ADD COLUMN refund_amount_usd numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'refund_requests' AND column_name = 'paypal_receipt_screenshot') THEN
    ALTER TABLE refund_requests ADD COLUMN paypal_receipt_screenshot text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'refund_requests' AND column_name = 'gift_card_face_value_usd') THEN
    ALTER TABLE refund_requests ADD COLUMN gift_card_face_value_usd numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'refund_requests' AND column_name = 'sub_order_number') THEN
    ALTER TABLE refund_requests ADD COLUMN sub_order_number text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'refund_requests' AND column_name = 'product_name') THEN
    ALTER TABLE refund_requests ADD COLUMN product_name text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'refund_requests' AND column_name = 'product_price') THEN
    ALTER TABLE refund_requests ADD COLUMN product_price numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'refund_requests' AND column_name = 'store_name') THEN
    ALTER TABLE refund_requests ADD COLUMN store_name text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'refund_requests' AND column_name = 'staff_name') THEN
    ALTER TABLE refund_requests ADD COLUMN staff_name text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'refund_requests' AND column_name = 'asin') THEN
    ALTER TABLE refund_requests ADD COLUMN asin text DEFAULT '';
  END IF;
END $$;
