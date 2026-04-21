/*
  # 创建汇率管理每日快照表

  ## 说明
  - 新增 `exchange_rate_daily_snapshots` 表，按日期记录美元现汇买入价/卖出价及整体备注
  - 新增 `exchange_rate_daily_items` 表，按国家记录实时汇率与建议接单汇率
  - 若当日波动不大，可在页面默认沿用前一日值，但仍保存为当天快照
  - 为商务、财务、管理员补充「汇率管理」权限项
*/

CREATE TABLE IF NOT EXISTS exchange_rate_daily_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_date date NOT NULL UNIQUE,
  usd_cash_buy_rate numeric(12,4) NOT NULL DEFAULT 0,
  usd_cash_sell_rate numeric(12,4) NOT NULL DEFAULT 0,
  notes text,
  copied_from_date date,
  operator_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exchange_rate_daily_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL REFERENCES exchange_rate_daily_snapshots(id) ON DELETE CASCADE,
  country_code text NOT NULL CHECK (country_code IN ('US', 'DE', 'UK', 'CA')),
  country_name text NOT NULL,
  currency_code text NOT NULL,
  realtime_rate numeric(12,4) NOT NULL DEFAULT 0,
  suggested_rate numeric(12,4) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (snapshot_id, country_code)
);

ALTER TABLE exchange_rate_daily_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rate_daily_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can select exchange_rate_daily_snapshots"
  ON exchange_rate_daily_snapshots FOR SELECT TO anon USING (true);

CREATE POLICY "anon can insert exchange_rate_daily_snapshots"
  ON exchange_rate_daily_snapshots FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon can update exchange_rate_daily_snapshots"
  ON exchange_rate_daily_snapshots FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon can delete exchange_rate_daily_snapshots"
  ON exchange_rate_daily_snapshots FOR DELETE TO anon USING (true);

CREATE POLICY "anon can select exchange_rate_daily_items"
  ON exchange_rate_daily_items FOR SELECT TO anon USING (true);

CREATE POLICY "anon can insert exchange_rate_daily_items"
  ON exchange_rate_daily_items FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon can update exchange_rate_daily_items"
  ON exchange_rate_daily_items FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon can delete exchange_rate_daily_items"
  ON exchange_rate_daily_items FOR DELETE TO anon USING (true);

CREATE INDEX IF NOT EXISTS idx_exchange_rate_snapshots_date
  ON exchange_rate_daily_snapshots (rate_date DESC);

CREATE INDEX IF NOT EXISTS idx_exchange_rate_items_snapshot
  ON exchange_rate_daily_items (snapshot_id);

CREATE INDEX IF NOT EXISTS idx_exchange_rate_items_country
  ON exchange_rate_daily_items (country_code);

UPDATE role_permissions
SET permissions = array_append(permissions, '汇率管理'),
    updated_at = now()
WHERE role IN ('超级管理员', '商务主管', '商务', '财务主管', '财务员')
  AND NOT ('汇率管理' = ANY(permissions));
