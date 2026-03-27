
/*
  # 创建买手校验规则表

  ## 说明
  本迁移创建买手校验规则（buyer_restrictions）体系，支持多维度的买手准入/禁止规则管理。

  ## 新增表
  - `buyer_restrictions`: 买手校验规则主表
    - `id`: 主键
    - `rule_type`: 规则类型 (allow=白名单/deny=黑名单)
    - `dimension`: 规则维度 (buyer/asin/store/brand/client_contact/client_company)
    - `buyer_name`: 被校验的买手名称（支持模糊匹配）
    - `target_value`: 目标维度的值（如店铺名、ASIN、品牌名、客户名、公司名）
    - `reason`: 规则原因说明
    - `created_by`: 创建人
    - `is_active`: 是否启用
    - `created_at`: 创建时间

  ## 安全
  - 启用 RLS
  - anon 和 authenticated 均可读写（沿用本项目策略）
*/

CREATE TABLE IF NOT EXISTS buyer_restrictions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_type text NOT NULL DEFAULT 'deny' CHECK (rule_type IN ('allow', 'deny')),
  dimension text NOT NULL CHECK (dimension IN ('asin', 'store', 'brand', 'client_contact', 'client_company')),
  buyer_name text NOT NULL,
  target_value text NOT NULL,
  reason text DEFAULT '',
  created_by text DEFAULT '',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_buyer_restrictions_buyer_name ON buyer_restrictions (buyer_name);
CREATE INDEX IF NOT EXISTS idx_buyer_restrictions_dimension ON buyer_restrictions (dimension);
CREATE INDEX IF NOT EXISTS idx_buyer_restrictions_target ON buyer_restrictions (target_value);

ALTER TABLE buyer_restrictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select buyer_restrictions"
  ON buyer_restrictions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Allow anon insert buyer_restrictions"
  ON buyer_restrictions FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Allow anon update buyer_restrictions"
  ON buyer_restrictions FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon delete buyer_restrictions"
  ON buyer_restrictions FOR DELETE
  TO anon
  USING (true);
