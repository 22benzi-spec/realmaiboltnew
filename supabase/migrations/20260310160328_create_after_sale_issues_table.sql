/*
  # 创建售后问题单表 (after_sale_issues)

  1. 新建表
    - `after_sale_issues` - 售后问题单管理
      - `id` (uuid, 主键) - 唯一标识
      - `issue_number` (text, 唯一) - 问题单编号，自动生成 ASI-YYYYMMDD-XXXXXX
      - `sub_order_id` (uuid, FK -> sub_orders) - 关联子订单
      - `sub_order_number` (text) - 子订单号(冗余)
      - `order_id` (uuid, FK -> erp_orders) - 关联主订单
      - `order_number` (text) - 主订单号(冗余)
      - `task_id` (uuid) - 关联任务(预留)
      - `buyer_id` (uuid, FK -> erp_buyers) - 关联买手
      - `buyer_name` (text) - 买手名(冗余)
      - `staff_id` (uuid, FK -> staff) - 负责业务员
      - `staff_name` (text) - 业务员名(冗余)
      - `customer_name` (text) - 客户名(冗余)
      - `asin` (text) - ASIN
      - `store_name` (text) - 店铺名
      - `product_price` (numeric) - 产品价格
      - `issue_type` (text) - 问题类型：不下单/取消/退款/无此订单
      - `issue_status` (text) - 处理状态：待处理/处理中/已替换订单/需补单/已补单/已确认损失/已关闭
      - `principal_stolen` (boolean) - 本金是否被骗
      - `principal_amount` (numeric) - 被骗本金金额
      - `old_amazon_order_id` (text) - 旧亚马逊订单号
      - `new_amazon_order_id` (text) - 新亚马逊订单号(替换后)
      - `replacement_buyer_id` (uuid, FK -> erp_buyers) - 补单买手ID
      - `replacement_buyer_name` (text) - 补单买手名
      - `replacement_sub_order_id` (uuid) - 补单新子订单ID
      - `replacement_sub_order_number` (text) - 补单新子订单号
      - `profit_diff` (numeric) - 差价盈利(退款少退的部分)
      - `loss_amount` (numeric) - 损失金额
      - `description` (text) - 问题描述
      - `resolution_notes` (text) - 处理备注
      - `resolved_at` (timestamptz) - 处理完成时间
      - `created_at` (timestamptz) - 创建时间
      - `updated_at` (timestamptz) - 更新时间

  2. 索引
    - sub_order_id, buyer_id, staff_id, issue_status, issue_type

  3. 安全
    - 启用 RLS
    - 允许 anon 角色完整读写(内部ERP系统)

  4. 编号生成
    - 添加 after_sale_issue 类型到每日计数器
    - 创建触发器自动生成 ASI-YYYYMMDD-XXXXXX 格式编号
*/

CREATE TABLE IF NOT EXISTS after_sale_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_number text UNIQUE NOT NULL DEFAULT '',
  sub_order_id uuid REFERENCES sub_orders(id) ON DELETE SET NULL,
  sub_order_number text DEFAULT '',
  order_id uuid REFERENCES erp_orders(id) ON DELETE SET NULL,
  order_number text DEFAULT '',
  task_id uuid,
  buyer_id uuid REFERENCES erp_buyers(id) ON DELETE SET NULL,
  buyer_name text DEFAULT '',
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  staff_name text DEFAULT '',
  customer_name text DEFAULT '',
  asin text DEFAULT '',
  store_name text DEFAULT '',
  product_price numeric DEFAULT 0,
  issue_type text NOT NULL DEFAULT '不下单',
  issue_status text NOT NULL DEFAULT '待处理',
  principal_stolen boolean DEFAULT false,
  principal_amount numeric DEFAULT 0,
  old_amazon_order_id text DEFAULT '',
  new_amazon_order_id text DEFAULT '',
  replacement_buyer_id uuid REFERENCES erp_buyers(id) ON DELETE SET NULL,
  replacement_buyer_name text DEFAULT '',
  replacement_sub_order_id uuid REFERENCES sub_orders(id) ON DELETE SET NULL,
  replacement_sub_order_number text DEFAULT '',
  profit_diff numeric DEFAULT 0,
  loss_amount numeric DEFAULT 0,
  description text DEFAULT '',
  resolution_notes text DEFAULT '',
  resolved_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_after_sale_issues_sub_order ON after_sale_issues(sub_order_id);
CREATE INDEX IF NOT EXISTS idx_after_sale_issues_buyer ON after_sale_issues(buyer_id);
CREATE INDEX IF NOT EXISTS idx_after_sale_issues_staff ON after_sale_issues(staff_id);
CREATE INDEX IF NOT EXISTS idx_after_sale_issues_status ON after_sale_issues(issue_status);
CREATE INDEX IF NOT EXISTS idx_after_sale_issues_type ON after_sale_issues(issue_type);

ALTER TABLE after_sale_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select after_sale_issues"
  ON after_sale_issues FOR SELECT TO anon
  USING (true);

CREATE POLICY "Allow anon insert after_sale_issues"
  ON after_sale_issues FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update after_sale_issues"
  ON after_sale_issues FOR UPDATE TO anon
  USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete after_sale_issues"
  ON after_sale_issues FOR DELETE TO anon
  USING (true);

-- 创建编号自动生成函数
CREATE OR REPLACE FUNCTION generate_after_sale_issue_number()
RETURNS trigger AS $$
DECLARE
  today text;
  seq_val integer;
BEGIN
  today := to_char(now(), 'YYYYMMDD');

  INSERT INTO id_daily_counters (counter_date, counter_type, counter_value)
  VALUES (CURRENT_DATE, 'after_sale_issue', 1)
  ON CONFLICT (counter_date, counter_type)
  DO UPDATE SET counter_value = id_daily_counters.counter_value + 1
  RETURNING counter_value INTO seq_val;

  NEW.issue_number := 'ASI-' || today || '-' || lpad(seq_val::text, 6, '0');
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_generate_after_sale_issue_number
  BEFORE INSERT ON after_sale_issues
  FOR EACH ROW
  WHEN (NEW.issue_number = '' OR NEW.issue_number IS NULL)
  EXECUTE FUNCTION generate_after_sale_issue_number();

-- 更新时间触发器
CREATE OR REPLACE FUNCTION update_after_sale_issues_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_after_sale_issues_updated_at
  BEFORE UPDATE ON after_sale_issues
  FOR EACH ROW
  EXECUTE FUNCTION update_after_sale_issues_updated_at();
