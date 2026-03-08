/*
  # 创建交易流水表

  用于记录系统中所有资金变动，形成完整的资金账本。

  ## 1. 新增表: financial_transactions

  核心字段:
  - `id` (uuid, 主键)
  - `transaction_no` (text, 流水号，唯一)
  - `transaction_type` (text, 交易类型: 订单收入/客户充值/退款支出/返佣支出/礼品卡采购/美金购汇/其他)
  - `direction` (text, 方向: 收入/支出)
  - `amount_cny` (numeric, 金额CNY)
  - `amount_usd` (numeric, 金额USD，可选)
  - `exchange_rate` (numeric, 汇率)
  - `customer_name` (text, 关联客户)
  - `customer_id_str` (text, 客户ID)
  - `order_id` (uuid, 关联主订单)
  - `order_number` (text, 订单号冗余)
  - `sub_order_id` (uuid, 关联子订单)
  - `sub_order_number` (text, 子订单号冗余)
  - `refund_request_id` (uuid, 关联退款申请)
  - `gift_card_batch_id` (uuid, 关联礼品卡批次)
  - `usd_batch_id` (uuid, 关联美金批次)
  - `staff_name` (text, 操作业务员)
  - `handler_name` (text, 处理人/审批人)
  - `status` (text, 状态: 已确认/待审批/已取消)
  - `notes` (text, 备注)
  - `transaction_date` (date, 交易日期)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## 2. 安全
  - 启用 RLS
  - anon 角色完整读写权限（与系统一致）

  ## 3. 索引
  - transaction_date 用于按日期查询
  - transaction_type 用于按类型筛选
  - customer_name 用于按客户查询
*/

CREATE TABLE IF NOT EXISTS financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_no text UNIQUE NOT NULL,
  transaction_type text NOT NULL DEFAULT '订单收入',
  direction text NOT NULL DEFAULT '收入',
  amount_cny numeric(12,2) NOT NULL DEFAULT 0,
  amount_usd numeric(12,2) DEFAULT 0,
  exchange_rate numeric(8,4) DEFAULT 7.25,
  customer_name text,
  customer_id_str text,
  order_id uuid,
  order_number text,
  sub_order_id uuid,
  sub_order_number text,
  refund_request_id uuid,
  gift_card_batch_id uuid,
  usd_batch_id uuid,
  staff_name text,
  handler_name text,
  status text NOT NULL DEFAULT '已确认',
  notes text,
  transaction_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can select financial_transactions"
  ON financial_transactions FOR SELECT TO anon USING (true);

CREATE POLICY "anon can insert financial_transactions"
  ON financial_transactions FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon can update financial_transactions"
  ON financial_transactions FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon can delete financial_transactions"
  ON financial_transactions FOR DELETE TO anon USING (true);

CREATE INDEX IF NOT EXISTS idx_ft_date ON financial_transactions (transaction_date);
CREATE INDEX IF NOT EXISTS idx_ft_type ON financial_transactions (transaction_type);
CREATE INDEX IF NOT EXISTS idx_ft_customer ON financial_transactions (customer_name);
CREATE INDEX IF NOT EXISTS idx_ft_order ON financial_transactions (order_id);

-- 流水号序列（FT-20260308-0001 格式）
CREATE SEQUENCE IF NOT EXISTS financial_transaction_seq START 1;

CREATE OR REPLACE FUNCTION generate_transaction_no()
RETURNS text AS $$
  SELECT 'FT-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-' || lpad(nextval('financial_transaction_seq')::text, 4, '0');
$$ LANGUAGE sql;
