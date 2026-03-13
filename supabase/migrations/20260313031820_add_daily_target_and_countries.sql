/*
  # 增加日目标单量和操作国家字段

  1. 修改表
    - `staff_monthly_targets`
      - 新增 `daily_target` (integer) — 手动填写的日目标单量
    - `staff`
      - 新增 `countries` (text[]) — 操作国家列表，默认含美国

  2. 说明
    - daily_target 独立于月目标，由用户手动填写，不做自动计算
    - countries 为数组类型，美国（US）为默认值，可额外选德国(DE)、英国(UK)、加拿大(CA)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff_monthly_targets' AND column_name = 'daily_target'
  ) THEN
    ALTER TABLE staff_monthly_targets ADD COLUMN daily_target integer DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff' AND column_name = 'countries'
  ) THEN
    ALTER TABLE staff ADD COLUMN countries text[] DEFAULT ARRAY['US'];
  END IF;
END $$;
