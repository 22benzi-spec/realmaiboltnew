/*
  # 新增商务经理角色及相关表

  ## 变更说明
  1. 新增 `business_managers` 表 - 存储商务经理信息
     - id, name, phone, email, wechat_id, status, notes, avatar_color
  2. 修改 `business_wechat_accounts` 表 - 新增 manager_id 字段，关联到商务经理
  3. 新增 `wechat_clients` 表 - 存储微信号下的客户信息
     - id, wechat_account_id, client_name, client_wechat, remark, status, notes
  4. 安全：所有新表启用 RLS，仅 authenticated 用户可操作
*/

CREATE TABLE IF NOT EXISTS business_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text DEFAULT '',
  email text DEFAULT '',
  wechat_id text DEFAULT '',
  status text NOT NULL DEFAULT '在职',
  avatar_color text DEFAULT '#2563eb',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE business_managers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select business_managers"
  ON business_managers FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert business_managers"
  ON business_managers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update business_managers"
  ON business_managers FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete business_managers"
  ON business_managers FOR DELETE TO authenticated USING (true);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'business_wechat_accounts' AND column_name = 'manager_id'
  ) THEN
    ALTER TABLE business_wechat_accounts ADD COLUMN manager_id uuid REFERENCES business_managers(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS wechat_clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wechat_account_id uuid NOT NULL REFERENCES business_wechat_accounts(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_wechat text DEFAULT '',
  remark text DEFAULT '',
  status text NOT NULL DEFAULT '活跃',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE wechat_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select wechat_clients"
  ON wechat_clients FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert wechat_clients"
  ON wechat_clients FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update wechat_clients"
  ON wechat_clients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete wechat_clients"
  ON wechat_clients FOR DELETE TO authenticated USING (true);
