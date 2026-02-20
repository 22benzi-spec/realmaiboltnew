
/*
  # 为 business_managers 表添加入职时间字段

  ## 变更
  - business_managers 表新增 join_date (date) 字段，记录商务经理入职日期
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'business_managers' AND column_name = 'join_date'
  ) THEN
    ALTER TABLE business_managers ADD COLUMN join_date date;
  END IF;
END $$;
