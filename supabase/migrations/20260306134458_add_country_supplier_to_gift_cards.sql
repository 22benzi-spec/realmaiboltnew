/*
  # 礼品卡表扩展字段

  1. 修改表
    - `gift_cards`
      - 新增 `country` (text) - 礼品卡适用国家
      - 新增 `supplier` (text) - 供应商
      - 新增 `exchange_rate` (numeric) - 汇率
  2. 说明
    - country 用于区分 US/UK/DE/JP 等不同站点礼品卡
    - supplier/exchange_rate 支持单张导入时直接录入，不再强依赖批次
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gift_cards' AND column_name = 'country'
  ) THEN
    ALTER TABLE gift_cards ADD COLUMN country text DEFAULT 'US';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gift_cards' AND column_name = 'supplier'
  ) THEN
    ALTER TABLE gift_cards ADD COLUMN supplier text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gift_cards' AND column_name = 'exchange_rate'
  ) THEN
    ALTER TABLE gift_cards ADD COLUMN exchange_rate numeric DEFAULT 7.25;
  END IF;
END $$;
