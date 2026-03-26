/*
  # 重构收款系统：支持多订单合并收款、区分收款类型

  1. 修改表
    - `batch_payments`
      - 新增 `payment_type` (text) - 收款类型：基础收款/补款/退款
      - 新增 `payment_group_id` (uuid) - 关联的合并收款组
      
  2. 新建表
    - `payment_groups` - 合并收款组（一笔收款覆盖同一客户多个订单）
      - `id` (uuid, 主键)
      - `group_number` (text) - 收款组编号
      - `customer_name` (text) - 客户名称
      - `total_amount` (numeric) - 收款总金额
      - `payment_date` (date)
      - `payment_method` (text)
      - `payer_name` (text)
      - `recorded_by` (text)
      - `notes` (text)
      - `created_at`, `updated_at`
      
    - `payment_group_orders` - 收款组与订单的多对多关联
      - `id` (uuid, 主键)
      - `payment_group_id` (uuid) FK -> payment_groups
      - `order_id` (uuid) FK -> erp_orders
      - `allocated_amount` (numeric) - 分配给该订单的金额

  3. 安全
    - 所有新表启用 RLS
    - 基于 anon 角色的策略（当前系统使用 anon 访问）
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batch_payments' AND column_name = 'payment_type'
  ) THEN
    ALTER TABLE batch_payments ADD COLUMN payment_type text NOT NULL DEFAULT '基础收款';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'batch_payments' AND column_name = 'payment_group_id'
  ) THEN
    ALTER TABLE batch_payments ADD COLUMN payment_group_id uuid;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS payment_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_number text NOT NULL DEFAULT '',
  customer_name text NOT NULL DEFAULT '',
  total_amount numeric NOT NULL DEFAULT 0,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_method text DEFAULT '银行转账',
  payer_name text,
  recorded_by text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE payment_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read payment_groups"
  ON payment_groups FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert payment_groups"
  ON payment_groups FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update payment_groups"
  ON payment_groups FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can delete payment_groups"
  ON payment_groups FOR DELETE TO anon USING (true);

CREATE TABLE IF NOT EXISTS payment_group_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_group_id uuid NOT NULL REFERENCES payment_groups(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES erp_orders(id) ON DELETE CASCADE,
  allocated_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payment_group_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read payment_group_orders"
  ON payment_group_orders FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can insert payment_group_orders"
  ON payment_group_orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update payment_group_orders"
  ON payment_group_orders FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can delete payment_group_orders"
  ON payment_group_orders FOR DELETE TO anon USING (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'batch_payments_payment_group_id_fkey'
  ) THEN
    ALTER TABLE batch_payments 
      ADD CONSTRAINT batch_payments_payment_group_id_fkey 
      FOREIGN KEY (payment_group_id) REFERENCES payment_groups(id) ON DELETE SET NULL;
  END IF;
END $$;
