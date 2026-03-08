/*
  # 创建资产管理模块表

  ## 新增表

  ### 1. chat_accounts（聊单号管理）
  - id: 主键
  - account_no: 聊单号（唯一标识，如 WX001）
  - owner_type: 归属类型（业务员/买手）
  - owner_name: 归属人姓名
  - platform: 平台（微信/WhatsApp/其他）
  - bound_ip_id: 绑定的IP资源ID
  - phone_number: 绑定手机号
  - ads_power_id: AdsPower 环境ID
  - local_browser: 本地浏览器环境标识
  - status: 状态（在用/停用）
  - notes: 备注
  - created_at, updated_at

  ### 2. ip_resources（IP资源库）
  - id: 主键
  - ip_address: IP地址
  - ip_type: 类型（买手IP/服务器IP/其他）
  - supplier: 供应商名称
  - phone_number: 绑定手机号
  - renew_cycle: 续费周期（月付/季付/年付/不定期）
  - renew_price: 续费金额
  - last_renewed_at: 上次续费日期
  - next_renew_at: 下次到期日期
  - status: 状态（使用中/待续费/已停用/已替换）
  - assigned_to: 分配给（人名或用途说明）
  - notes: 备注
  - created_at, updated_at

  ### 3. servers（服务器管理）
  - id: 主键
  - server_name: 服务器名称/标识
  - ip_id: 关联的IP资源ID
  - supplier: 供应商
  - phone_number: 绑定手机号
  - renew_cycle: 续费周期
  - renew_price: 续费金额
  - last_renewed_at: 上次续费日期
  - next_renew_at: 下次到期日期
  - status: 状态（使用中/待续费/已停用/已替换）
  - usage_type: 用途（PayPal专用/混用/其他）
  - notes: 备注
  - created_at, updated_at

  ## 安全
  - 所有表启用 RLS
  - anon 角色读写权限（与系统其他表保持一致）
*/

-- ── IP资源库 ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ip_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address text NOT NULL,
  ip_type text NOT NULL DEFAULT '买手IP',
  supplier text,
  phone_number text,
  renew_cycle text NOT NULL DEFAULT '月付',
  renew_price numeric(10,2) DEFAULT 0,
  last_renewed_at date,
  next_renew_at date,
  status text NOT NULL DEFAULT '使用中',
  assigned_to text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE ip_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can select ip_resources"
  ON ip_resources FOR SELECT TO anon USING (true);

CREATE POLICY "anon can insert ip_resources"
  ON ip_resources FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon can update ip_resources"
  ON ip_resources FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon can delete ip_resources"
  ON ip_resources FOR DELETE TO anon USING (true);

-- ── 服务器管理 ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS servers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  server_name text NOT NULL,
  ip_id uuid REFERENCES ip_resources(id) ON DELETE SET NULL,
  supplier text,
  phone_number text,
  renew_cycle text NOT NULL DEFAULT '月付',
  renew_price numeric(10,2) DEFAULT 0,
  last_renewed_at date,
  next_renew_at date,
  status text NOT NULL DEFAULT '使用中',
  usage_type text DEFAULT 'PayPal专用',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE servers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can select servers"
  ON servers FOR SELECT TO anon USING (true);

CREATE POLICY "anon can insert servers"
  ON servers FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon can update servers"
  ON servers FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon can delete servers"
  ON servers FOR DELETE TO anon USING (true);

-- ── 聊单号管理 ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_no text NOT NULL,
  owner_type text NOT NULL DEFAULT '业务员',
  owner_name text,
  platform text NOT NULL DEFAULT '微信',
  ip_id uuid REFERENCES ip_resources(id) ON DELETE SET NULL,
  phone_number text,
  ads_power_id text,
  local_browser text,
  status text NOT NULL DEFAULT '在用',
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE chat_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can select chat_accounts"
  ON chat_accounts FOR SELECT TO anon USING (true);

CREATE POLICY "anon can insert chat_accounts"
  ON chat_accounts FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon can update chat_accounts"
  ON chat_accounts FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon can delete chat_accounts"
  ON chat_accounts FOR DELETE TO anon USING (true);
