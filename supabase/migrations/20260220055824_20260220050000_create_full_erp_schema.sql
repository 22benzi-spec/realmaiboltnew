/*
  # 揽麦ERP完整数据库结构

  ## 新建表
  - stores: 店铺表
  - orders: 订单主表（ERP业务）
  - order_keywords: 订单关键词
  - order_schedules: 排期表
  - sub_orders: 子订单表
  - staff: 业务员表
  - business_wechat_accounts: 商务微信账号
  - buyers: 买手表（重建，符合ERP结构）
  - gift_card_batches: 礼品卡批次
  - gift_cards: 礼品卡
  - usd_fund_batches: 美金库批次
  - paypal_accounts: PayPal账号
  - paypal_refunds: PayPal退款记录
  - refund_requests: 退款申请
  - client_companies: 客户公司
  - client_contacts: 客户联系人
  - grab_hall_logs: 抢单日志

  ## 说明
  - 所有表均启用RLS
  - 允许匿名用户进行增删改查（内部ERP系统）
  - 保留原有 buyers/orders/transactions/user_profiles 表不删除
*/

-- ==================== stores ====================
CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='stores' AND policyname='stores_all_anon') THEN
    CREATE POLICY "stores_all_anon" ON stores FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ==================== erp_orders ====================
CREATE TABLE IF NOT EXISTS erp_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number text UNIQUE,
  asin text NOT NULL DEFAULT '',
  product_image text DEFAULT '',
  product_name text DEFAULT '',
  store_name text NOT NULL DEFAULT '',
  brand_name text DEFAULT '',
  product_price numeric DEFAULT 0,
  review_type text DEFAULT '普通测评',
  review_mode text DEFAULT '免评模式',
  country text DEFAULT '美国',
  exchange_rate numeric DEFAULT 7.25,
  price_no_review numeric DEFAULT 0,
  price_text numeric DEFAULT 0,
  price_image numeric DEFAULT 0,
  price_video numeric DEFAULT 0,
  price_feedback numeric DEFAULT 0,
  order_type text DEFAULT '免评',
  order_quantity integer DEFAULT 1,
  product_cost_cny numeric DEFAULT 0,
  commission_fee numeric DEFAULT 0,
  unit_price numeric DEFAULT 0,
  total_price numeric DEFAULT 0,
  total_orders integer DEFAULT 0,
  total_amount numeric DEFAULT 0,
  fixed_daily_orders integer DEFAULT 0,
  new_daily_orders integer DEFAULT 0,
  notes text DEFAULT '',
  daily_feedback boolean DEFAULT true,
  comprehensive_label boolean DEFAULT false,
  delivery_label boolean DEFAULT false,
  seller text DEFAULT '',
  category text DEFAULT '',
  review_level text DEFAULT '',
  variant_info text DEFAULT '',
  customer_name text DEFAULT '',
  customer_id_str text DEFAULT '',
  sales_person text DEFAULT '',
  status text DEFAULT '待处理',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE erp_orders ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='erp_orders' AND policyname='erp_orders_all') THEN
    CREATE POLICY "erp_orders_all" ON erp_orders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ==================== order_keywords ====================
CREATE TABLE IF NOT EXISTS order_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES erp_orders(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE order_keywords ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='order_keywords' AND policyname='order_keywords_all') THEN
    CREATE POLICY "order_keywords_all" ON order_keywords FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ==================== staff ====================
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text DEFAULT '',
  email text DEFAULT '',
  role text DEFAULT '业务员',
  status text DEFAULT '在职',
  department text DEFAULT '',
  wechat_id text DEFAULT '',
  join_date date,
  avatar_color text DEFAULT '#2563eb',
  total_assigned integer DEFAULT 0,
  total_completed integer DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='staff' AND policyname='staff_all') THEN
    CREATE POLICY "staff_all" ON staff FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ==================== business_wechat_accounts ====================
CREATE TABLE IF NOT EXISTS business_wechat_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES staff(id) ON DELETE CASCADE,
  wechat_id text NOT NULL,
  wechat_nickname text DEFAULT '',
  status text DEFAULT '在用',
  client_count integer DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE business_wechat_accounts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='business_wechat_accounts' AND policyname='bwa_all') THEN
    CREATE POLICY "bwa_all" ON business_wechat_accounts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ==================== erp_buyers ====================
CREATE TABLE IF NOT EXISTS erp_buyers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text DEFAULT '',
  email text DEFAULT '',
  platform_account text DEFAULT '',
  country text DEFAULT '美国',
  level text DEFAULT '普通',
  status text DEFAULT '活跃',
  tags text[] DEFAULT '{}',
  total_completed integer DEFAULT 0,
  success_rate numeric DEFAULT 0,
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  staff_name text DEFAULT '',
  facebook_name text DEFAULT '',
  facebook_link text DEFAULT '',
  chat_account text DEFAULT '',
  paypal_email text DEFAULT '',
  backup_contact text DEFAULT '',
  birthday date,
  last_order_date date,
  purchased_asins text DEFAULT '',
  purchased_stores text DEFAULT '',
  amazon_profile text DEFAULT '',
  review_history text DEFAULT '',
  buyer_paid_amount numeric DEFAULT 0,
  actual_refund_amount numeric DEFAULT 0,
  extra_commission numeric DEFAULT 0,
  notes text DEFAULT '',
  blacklist_reason text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE erp_buyers ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='erp_buyers' AND policyname='erp_buyers_all') THEN
    CREATE POLICY "erp_buyers_all" ON erp_buyers FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ==================== sub_orders ====================
CREATE TABLE IF NOT EXISTS sub_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES erp_orders(id) ON DELETE CASCADE,
  sub_order_number text NOT NULL DEFAULT '',
  scheduled_date date,
  asin text DEFAULT '',
  store_name text DEFAULT '',
  country text DEFAULT '美国',
  order_type text DEFAULT '免评',
  product_price numeric DEFAULT 0,
  unit_price numeric DEFAULT 0,
  keyword text DEFAULT '',
  product_image text DEFAULT '',
  product_name text DEFAULT '',
  brand_name text DEFAULT '',
  category text DEFAULT '',
  review_level text DEFAULT '',
  review_type text DEFAULT '',
  variant_info text DEFAULT '',
  task_notes text DEFAULT '',
  customer_name text DEFAULT '',
  customer_id_str text DEFAULT '',
  sales_person text DEFAULT '',
  commission_fee numeric DEFAULT 0,
  exchange_rate numeric DEFAULT 7.25,
  status text DEFAULT '待分配',
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  staff_name text DEFAULT '',
  buyer_id uuid REFERENCES erp_buyers(id) ON DELETE SET NULL,
  buyer_name text DEFAULT '',
  amazon_order_id text DEFAULT '',
  notes text DEFAULT '',
  review_screenshot_url text DEFAULT '',
  delivery_confirmed_at timestamptz,
  review_submitted_at timestamptz,
  buyer_assigned_at timestamptz,
  amazon_order_placed_at timestamptz,
  refund_status text DEFAULT '无需退款',
  refund_method text DEFAULT '',
  refund_sequence text DEFAULT '',
  refund_amount numeric DEFAULT 0,
  refund_date date,
  cancel_reason text DEFAULT '',
  released_to_hall boolean DEFAULT false,
  released_at timestamptz,
  released_by_staff_id uuid,
  released_by_staff_name text DEFAULT '',
  release_reason text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sub_orders_order_id ON sub_orders(order_id);
CREATE INDEX IF NOT EXISTS idx_sub_orders_staff_id ON sub_orders(staff_id);
CREATE INDEX IF NOT EXISTS idx_sub_orders_status ON sub_orders(status);
ALTER TABLE sub_orders ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sub_orders' AND policyname='sub_orders_all') THEN
    CREATE POLICY "sub_orders_all" ON sub_orders FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ==================== gift_card_batches ====================
CREATE TABLE IF NOT EXISTS gift_card_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number text UNIQUE NOT NULL,
  supplier text DEFAULT '',
  purchase_date date DEFAULT CURRENT_DATE,
  exchange_rate numeric DEFAULT 7.25,
  total_face_value_usd numeric DEFAULT 0,
  total_cost_cny numeric DEFAULT 0,
  card_count integer DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE gift_card_batches ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gift_card_batches' AND policyname='gcb_all') THEN
    CREATE POLICY "gcb_all" ON gift_card_batches FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ==================== gift_cards ====================
CREATE TABLE IF NOT EXISTS gift_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_number text UNIQUE NOT NULL,
  batch_id uuid REFERENCES gift_card_batches(id) ON DELETE CASCADE,
  face_value_usd numeric NOT NULL,
  cost_cny numeric DEFAULT 0,
  card_code text DEFAULT '',
  status text DEFAULT '未使用',
  used_by_buyer_id uuid,
  used_by_buyer_name text DEFAULT '',
  used_for_sub_order_id uuid,
  used_at timestamptz,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gift_cards_status ON gift_cards(status);
CREATE INDEX IF NOT EXISTS idx_gift_cards_batch_id ON gift_cards(batch_id);
ALTER TABLE gift_cards ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gift_cards' AND policyname='gc_all') THEN
    CREATE POLICY "gc_all" ON gift_cards FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ==================== usd_fund_batches ====================
CREATE TABLE IF NOT EXISTS usd_fund_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number text UNIQUE NOT NULL,
  purchase_date date DEFAULT CURRENT_DATE,
  exchange_rate numeric DEFAULT 7.25,
  amount_usd numeric DEFAULT 0,
  cost_cny numeric DEFAULT 0,
  remaining_usd numeric DEFAULT 0,
  source text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE usd_fund_batches ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='usd_fund_batches' AND policyname='ufb_all') THEN
    CREATE POLICY "ufb_all" ON usd_fund_batches FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ==================== paypal_accounts ====================
CREATE TABLE IF NOT EXISTS paypal_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  account_alias text DEFAULT '',
  owner_name text DEFAULT '',
  phone text DEFAULT '',
  linked_bank text DEFAULT '',
  status text DEFAULT '正常',
  risk_level text DEFAULT '低风险',
  total_refunded_usd numeric DEFAULT 0,
  refund_count integer DEFAULT 0,
  notes text DEFAULT '',
  registered_at date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE paypal_accounts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='paypal_accounts' AND policyname='pa_all') THEN
    CREATE POLICY "pa_all" ON paypal_accounts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ==================== paypal_refunds ====================
CREATE TABLE IF NOT EXISTS paypal_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  paypal_account_id uuid REFERENCES paypal_accounts(id) ON DELETE SET NULL,
  usd_batch_id uuid REFERENCES usd_fund_batches(id) ON DELETE SET NULL,
  sub_order_id uuid REFERENCES sub_orders(id) ON DELETE SET NULL,
  buyer_name text DEFAULT '',
  buyer_paypal_email text DEFAULT '',
  amount_usd numeric NOT NULL DEFAULT 0,
  exchange_rate numeric DEFAULT 7.25,
  cost_cny numeric DEFAULT 0,
  refund_date date DEFAULT CURRENT_DATE,
  status text DEFAULT '待退款',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE paypal_refunds ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='paypal_refunds' AND policyname='pr_all') THEN
    CREATE POLICY "pr_all" ON paypal_refunds FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ==================== refund_requests ====================
CREATE TABLE IF NOT EXISTS refund_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_order_id uuid REFERENCES sub_orders(id) ON DELETE SET NULL,
  order_id uuid REFERENCES erp_orders(id) ON DELETE SET NULL,
  buyer_name text DEFAULT '',
  buyer_paypal_email text DEFAULT '',
  refund_amount numeric DEFAULT 0,
  refund_method text DEFAULT 'PayPal',
  status text DEFAULT '待处理',
  notes text DEFAULT '',
  assigned_gift_card_id uuid REFERENCES gift_cards(id) ON DELETE SET NULL,
  assigned_paypal_account_id uuid REFERENCES paypal_accounts(id) ON DELETE SET NULL,
  assigned_paypal_email text DEFAULT '',
  assigned_gift_card_number text DEFAULT '',
  assigned_gift_card_code text DEFAULT '',
  finance_notes text DEFAULT '',
  handled_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='refund_requests' AND policyname='rr_all') THEN
    CREATE POLICY "rr_all" ON refund_requests FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ==================== client_companies ====================
CREATE TABLE IF NOT EXISTS client_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  brand_names text[] DEFAULT '{}',
  registered_asins text[] DEFAULT '{}',
  country text DEFAULT '',
  industry text DEFAULT '',
  level text DEFAULT 'C',
  status text DEFAULT '活跃',
  business_owner_id uuid,
  business_owner_name text DEFAULT '',
  total_order_count integer DEFAULT 0,
  total_order_amount_cny numeric DEFAULT 0,
  last_order_date date,
  notes text DEFAULT '',
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE client_companies ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='client_companies' AND policyname='cc_all') THEN
    CREATE POLICY "cc_all" ON client_companies FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ==================== client_contacts ====================
CREATE TABLE IF NOT EXISTS client_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES client_companies(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  role text DEFAULT '联系人',
  phone text DEFAULT '',
  email text DEFAULT '',
  wechat text DEFAULT '',
  whatsapp text DEFAULT '',
  is_primary boolean DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE client_contacts ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='client_contacts' AND policyname='cont_all') THEN
    CREATE POLICY "cont_all" ON client_contacts FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- ==================== grab_hall_logs ====================
CREATE TABLE IF NOT EXISTS grab_hall_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_order_id uuid NOT NULL,
  sub_order_number text DEFAULT '',
  action text NOT NULL,
  from_staff_id uuid,
  from_staff_name text DEFAULT '',
  to_staff_id uuid,
  to_staff_name text DEFAULT '',
  reason text DEFAULT '',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE grab_hall_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='grab_hall_logs' AND policyname='ghl_all') THEN
    CREATE POLICY "ghl_all" ON grab_hall_logs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
