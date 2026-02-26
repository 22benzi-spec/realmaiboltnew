/*
  # 客户公司地址与拜访记录

  ## 背景
  - 客户公司和员工都需要有唯一编码ID
  - 需要记录公司地址（非强制，客户不一定愿意提供）
  - 需要记录拜访记录，区分"待拜访"和"已拜访"
  - 不是每个公司都有拜访意愿，需要标记"不接受拜访"

  ## 变更内容

  ### client_companies 表新增字段
  1. `visit_status` - 拜访状态：未接触/待拜访/已拜访/不接受拜访，默认「未接触」
  2. `address_province` - 省/州
  3. `address_city` - 城市
  4. `address_detail` - 详细地址（可选，客户不一定提供）
  5. `address_country` - 国家

  ### client_visit_records 表（新建）
  记录每次拜访的详细信息
  - `id` uuid 主键
  - `company_id` - 关联公司
  - `visit_date` - 拜访日期
  - `visit_type` - 拜访方式：上门拜访/视频拜访/电话拜访
  - `visitor_name` - 拜访人（我方）
  - `contact_names` - 被拜访员工名字（文本）
  - `purpose` - 拜访目的
  - `summary` - 拜访小结
  - `next_visit_date` - 下次预约拜访日期
  - `created_at` - 记录时间
*/

-- 给公司表加地址和拜访状态字段
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_companies' AND column_name = 'visit_status') THEN
    ALTER TABLE client_companies ADD COLUMN visit_status text NOT NULL DEFAULT '未接触';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_companies' AND column_name = 'address_country') THEN
    ALTER TABLE client_companies ADD COLUMN address_country text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_companies' AND column_name = 'address_province') THEN
    ALTER TABLE client_companies ADD COLUMN address_province text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_companies' AND column_name = 'address_city') THEN
    ALTER TABLE client_companies ADD COLUMN address_city text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_companies' AND column_name = 'address_detail') THEN
    ALTER TABLE client_companies ADD COLUMN address_detail text DEFAULT '';
  END IF;
END $$;

-- 创建拜访记录表
CREATE TABLE IF NOT EXISTS client_visit_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES client_companies(id) ON DELETE CASCADE,
  visit_date date NOT NULL,
  visit_type text NOT NULL DEFAULT '上门拜访',
  visitor_name text NOT NULL DEFAULT '',
  contact_names text DEFAULT '',
  purpose text DEFAULT '',
  summary text DEFAULT '',
  next_visit_date date,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE client_visit_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select on client_visit_records"
  ON client_visit_records FOR SELECT TO anon USING (true);

CREATE POLICY "Allow anon insert on client_visit_records"
  ON client_visit_records FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Allow anon update on client_visit_records"
  ON client_visit_records FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon delete on client_visit_records"
  ON client_visit_records FOR DELETE TO anon USING (true);

CREATE INDEX IF NOT EXISTS idx_client_visit_records_company_id ON client_visit_records(company_id);
CREATE INDEX IF NOT EXISTS idx_client_visit_records_visit_date ON client_visit_records(visit_date DESC);
