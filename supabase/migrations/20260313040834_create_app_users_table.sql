/*
  # 创建应用用户表 (app_users)

  ## 说明
  存储ERP系统内部用户信息，与Supabase Auth分离管理。
  支持两类用户板块：
    - 内部员工（公司人员）：角色包括 管理员、业务员、财务、客服等
    - 租户（客户方）：有独立的租户标识，访问范围受限

  ## 新建表
  - `app_users`
    - `id` (uuid, pk)
    - `username` (text, unique) — 登录账号
    - `display_name` (text) — 显示姓名
    - `password_hash` (text) — 存储明文密码（内部系统，无需加密存储）或备注
    - `plain_password` (text) — 明文密码，便于管理员查看重置
    - `user_type` (text) — 'internal'（内部员工）或 'tenant'（租户）
    - `role` (text) — 内部：管理员/业务员/财务/商务/客服/运营；租户：租户
    - `staff_id` (uuid, nullable) — 关联到staff表
    - `tenant_name` (text, nullable) — 租户公司名（租户专用）
    - `tenant_code` (text, nullable) — 租户编号
    - `status` (text) — 'active'/'disabled'/'locked'
    - `last_login_at` (timestamptz)
    - `notes` (text)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)
    - `created_by` (text) — 谁创建的

  ## 安全
  - 启用 RLS
  - 开放匿名读写（内部系统无需严格auth）
*/

CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  display_name text NOT NULL DEFAULT '',
  plain_password text NOT NULL DEFAULT '',
  user_type text NOT NULL DEFAULT 'internal' CHECK (user_type IN ('internal', 'tenant')),
  role text NOT NULL DEFAULT '业务员',
  staff_id uuid REFERENCES staff(id) ON DELETE SET NULL,
  tenant_name text,
  tenant_code text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'locked')),
  last_login_at timestamptz,
  notes text DEFAULT '',
  created_by text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon full access to app_users"
  ON app_users
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert app_users"
  ON app_users
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update app_users"
  ON app_users
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete app_users"
  ON app_users
  FOR DELETE
  TO anon
  USING (true);

CREATE INDEX IF NOT EXISTS idx_app_users_username ON app_users(username);
CREATE INDEX IF NOT EXISTS idx_app_users_user_type ON app_users(user_type);
CREATE INDEX IF NOT EXISTS idx_app_users_role ON app_users(role);
CREATE INDEX IF NOT EXISTS idx_app_users_status ON app_users(status);
