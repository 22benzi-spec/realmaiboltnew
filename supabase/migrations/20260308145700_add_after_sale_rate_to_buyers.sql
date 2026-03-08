/*
  # 买手表增加售后率字段

  ## 说明
  - 添加 `after_sale_rate` (numeric) 售后率字段，默认 0
  - 原 success_rate 字段保留，不删除数据
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='erp_buyers' AND column_name='after_sale_rate') THEN
    ALTER TABLE erp_buyers ADD COLUMN after_sale_rate numeric DEFAULT 0;
  END IF;
END $$;
