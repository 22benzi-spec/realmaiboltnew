/*
  # 客户店铺与ASIN管理体系

  ## 背景
  当前系统中店铺和ASIN都是散列在公司/员工字段里的文本数组，
  无法实现"公司→店铺→ASIN→品牌"的完整层级关联，也无法从订单快速引用。

  ## 新建表

  ### client_stores（客户店铺表）
  - 一个客户公司可以有多个店铺
  - 店铺与公司和员工关联（哪个员工负责该店铺）
  - 字段：id, company_id, contact_id（负责员工，可选）, store_name, store_code, platform,
           country, status, notes

  ### client_store_asins（店铺下的ASIN）
  - 一个店铺可以有多个ASIN
  - 每个ASIN有对应的品牌、产品名、图片等信息
  - 字段：id, store_id, company_id（冗余，方便查询）, asin, brand_name,
           product_name, product_image, product_price, is_active, notes

  ## 订单表变更
  - erp_orders 表新增 company_id（关联客户公司）和 store_id（关联店铺）字段
  - 便于订单快速关联到客户库
*/

-- 创建店铺表
CREATE TABLE IF NOT EXISTS client_stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES client_companies(id) ON DELETE CASCADE,
  contact_id uuid REFERENCES client_contacts(id) ON DELETE SET NULL,
  store_name text NOT NULL DEFAULT '',
  store_code text DEFAULT '',
  platform text NOT NULL DEFAULT '亚马逊',
  country text DEFAULT '',
  status text NOT NULL DEFAULT '活跃',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_stores_company_id ON client_stores(company_id);
CREATE INDEX IF NOT EXISTS idx_client_stores_contact_id ON client_stores(contact_id);

ALTER TABLE client_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select on client_stores"
  ON client_stores FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert on client_stores"
  ON client_stores FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update on client_stores"
  ON client_stores FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete on client_stores"
  ON client_stores FOR DELETE TO anon USING (true);

-- 创建店铺ASIN表
CREATE TABLE IF NOT EXISTS client_store_asins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES client_stores(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES client_companies(id) ON DELETE CASCADE,
  asin text NOT NULL DEFAULT '',
  brand_name text DEFAULT '',
  product_name text DEFAULT '',
  product_image text DEFAULT '',
  product_price numeric(10,2) DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_store_asins_store_id ON client_store_asins(store_id);
CREATE INDEX IF NOT EXISTS idx_client_store_asins_company_id ON client_store_asins(company_id);
CREATE INDEX IF NOT EXISTS idx_client_store_asins_asin ON client_store_asins(asin);

ALTER TABLE client_store_asins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select on client_store_asins"
  ON client_store_asins FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert on client_store_asins"
  ON client_store_asins FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update on client_store_asins"
  ON client_store_asins FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete on client_store_asins"
  ON client_store_asins FOR DELETE TO anon USING (true);

-- 给订单表添加 company_id 和 store_id 字段（关联客户库）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'erp_orders' AND column_name = 'company_id') THEN
    ALTER TABLE erp_orders ADD COLUMN company_id uuid REFERENCES client_companies(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'erp_orders' AND column_name = 'store_id') THEN
    ALTER TABLE erp_orders ADD COLUMN store_id uuid REFERENCES client_stores(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_erp_orders_company_id ON erp_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_erp_orders_store_id ON erp_orders(store_id);
