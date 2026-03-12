
/*
  # 创建业务员月度目标表

  1. 新表
    - `staff_monthly_targets`
      - `id` (uuid, 主键)
      - `staff_id` (uuid, 关联 staff.id)
      - `year_month` (text, 如 '2026-03', 年月标识)
      - `monthly_target` (integer, 当月目标单量)
      - `notes` (text, 备注)
      - `created_at` / `updated_at`

  2. 唯一约束：同一业务员同一月份只有一条目标记录

  3. 安全
    - 启用 RLS
    - 允许已认证用户读写自己所在组织的目标（当前配合 anon 开放策略）
*/

CREATE TABLE IF NOT EXISTS staff_monthly_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  year_month text NOT NULL,
  monthly_target integer NOT NULL DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (staff_id, year_month)
);

ALTER TABLE staff_monthly_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can select staff_monthly_targets"
  ON staff_monthly_targets FOR SELECT TO anon USING (true);

CREATE POLICY "anon can insert staff_monthly_targets"
  ON staff_monthly_targets FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon can update staff_monthly_targets"
  ON staff_monthly_targets FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon can delete staff_monthly_targets"
  ON staff_monthly_targets FOR DELETE TO anon USING (true);
