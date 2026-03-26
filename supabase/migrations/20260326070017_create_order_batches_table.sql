/*
  # 创建订单批次表（order_batches）

  ## 背景
  客户常常一次性为多个 ASIN 下单并整体付款，但各 ASIN 的任务是陆续完成的。
  需要一个"批次"概念来管理一组订单的整体收款与最终结算。

  ## 新增内容

  ### order_batches 表
  用于表示一次客户合作的"批次"，可包含多个 ASIN 订单。

  | 字段 | 说明 |
  |---|---|
  | id | 主键 |
  | batch_number | 批次编号，如 BATCH-20260326-0001 |
  | company_id | 关联客户公司 |
  | customer_name | 客户名称（冗余，便于搜索） |
  | sales_person | 对接商务 |
  | prepaid_amount | 客户预付款金额（元），下单时收取 |
  | actual_amount | 所有订单实际应收总金额（元），全部任务完成后汇总 |
  | settled_amount | 已实际收到金额（元），用于精确对账 |
  | balance | 差额 = actual_amount - prepaid_amount，正数=客户欠款需补，负数=我方溢收需退 |
  | settlement_type | 结算类型：'supplement'=补款，'refund'=退款（溢款），'balanced'=刚好 |
  | batch_status | 批次状态：'active'进行中，'pending_settlement'待结算，'settled'已结清 |
  | settlement_notes | 结算备注（如税费明细、差价说明等） |
  | settled_by | 结算操作商务 |
  | settled_at | 结算时间 |
  | notes | 备注 |
  | created_at / updated_at | 时间戳 |

  ### erp_orders 表新增字段
  - `batch_id` (uuid): 关联批次 ID
  - `batch_number` (text): 批次编号（冗余，便于展示）

  ## 安全
  - 启用 RLS，anon 角色可读写（与系统其他表保持一致）
*/

CREATE TABLE IF NOT EXISTS order_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number text UNIQUE NOT NULL,
  company_id uuid REFERENCES client_companies(id),
  customer_name text,
  customer_id_str text,
  sales_person text,
  prepaid_amount numeric(12,2) NOT NULL DEFAULT 0,
  actual_amount numeric(12,2) DEFAULT 0,
  settled_amount numeric(12,2) DEFAULT 0,
  balance numeric(12,2) DEFAULT 0,
  settlement_type text DEFAULT 'balanced',
  batch_status text NOT NULL DEFAULT 'active',
  settlement_notes text,
  settled_by text,
  settled_at timestamptz,
  notes text,
  order_count integer DEFAULT 0,
  completed_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE order_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can select order_batches"
  ON order_batches FOR SELECT TO anon USING (true);

CREATE POLICY "anon can insert order_batches"
  ON order_batches FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon can update order_batches"
  ON order_batches FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon can delete order_batches"
  ON order_batches FOR DELETE TO anon USING (true);

CREATE INDEX IF NOT EXISTS idx_order_batches_company ON order_batches(company_id);
CREATE INDEX IF NOT EXISTS idx_order_batches_status ON order_batches(batch_status);
CREATE INDEX IF NOT EXISTS idx_order_batches_created ON order_batches(created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'erp_orders' AND column_name = 'batch_id'
  ) THEN
    ALTER TABLE erp_orders ADD COLUMN batch_id uuid REFERENCES order_batches(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'erp_orders' AND column_name = 'batch_number'
  ) THEN
    ALTER TABLE erp_orders ADD COLUMN batch_number text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_erp_orders_batch ON erp_orders(batch_id);

CREATE SEQUENCE IF NOT EXISTS order_batch_seq START 1;

CREATE OR REPLACE FUNCTION generate_batch_number()
RETURNS text AS $$
  SELECT 'BATCH-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || lpad(nextval('order_batch_seq')::text, 4, '0');
$$ LANGUAGE sql;
