
/*
  # 升级客户库数据结构

  ## 修改说明

  ### client_companies（客户组织）新增字段
  - `org_id`: 客户组织编号（自动生成，格式 ORG-XXXXXX），对外展示用
  - `client_asins`: 该客户名下的 ASIN 列表（数组），可录入多个
  - `order_frequency`: 下单频次描述（如"每周"、"不定期"等）
  - `monthly_order_count`: 月均下单次数

  ### client_contacts（对接人）新增字段
  - `client_id`: 对接人自己的客户编号（格式 CLI-XXXXXX），用于区分同一公司多个对接人
  - `contact_wechat_status`: 对接人微信状态（活跃/沉默/流失）
  - `monthly_budget_cny`: 该对接人月均预算（人民币）
  - `last_contact_date`: 最近联系日期

  ### 安全
  - 所有表已开启 RLS，策略维持不变（anon 可访问，参考现有策略）
*/

-- client_companies 新增字段
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='client_companies' AND column_name='org_id') THEN
    ALTER TABLE client_companies ADD COLUMN org_id text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='client_companies' AND column_name='client_asins') THEN
    ALTER TABLE client_companies ADD COLUMN client_asins text[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='client_companies' AND column_name='order_frequency') THEN
    ALTER TABLE client_companies ADD COLUMN order_frequency text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='client_companies' AND column_name='monthly_order_count') THEN
    ALTER TABLE client_companies ADD COLUMN monthly_order_count integer DEFAULT 0;
  END IF;
END $$;

-- client_contacts 新增字段
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='client_contacts' AND column_name='client_id') THEN
    ALTER TABLE client_contacts ADD COLUMN client_id text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='client_contacts' AND column_name='contact_wechat_status') THEN
    ALTER TABLE client_contacts ADD COLUMN contact_wechat_status text DEFAULT '活跃';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='client_contacts' AND column_name='monthly_budget_cny') THEN
    ALTER TABLE client_contacts ADD COLUMN monthly_budget_cny numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='client_contacts' AND column_name='last_contact_date') THEN
    ALTER TABLE client_contacts ADD COLUMN last_contact_date date;
  END IF;
END $$;

-- 为现有 client_companies 生成 org_id（如果为空）
UPDATE client_companies
SET org_id = 'ORG-' || UPPER(SUBSTRING(id::text, 1, 6))
WHERE org_id = '' OR org_id IS NULL;

-- 为现有 client_contacts 生成 client_id（如果为空）
UPDATE client_contacts
SET client_id = 'CLI-' || UPPER(SUBSTRING(id::text, 1, 6))
WHERE client_id = '' OR client_id IS NULL;
