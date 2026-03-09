/*
  # 调整 sim_cards 和 pingme_numbers 表字段

  ## sim_cards 变更
  - 删除 carrier（运营商）字段
  - 续费周期默认改为年付
  - 新增 purchase_account（购买账号）字段，记录号码归属的账号

  ## pingme_numbers 变更
  - 删除 monthly_fee（月租费）字段
  - 删除 receive_fee_rate（收码费率）字段
  - 删除 supplier（供应商）字段
  - 新增 balance（余额）字段，记录账号当前余额（元）
  - 新增 recharge_logs（充值记录，JSONB 数组），格式：[{date, amount, operator, notes}]

  ## servers 表变更
  - server_name 字段置空/不强制（已存在），UI 层去掉
  - phone_number 字段 UI 层去掉（字段保留，不删除数据）
*/

-- sim_cards: 新增 purchase_account，续费周期默认改为年付
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sim_cards' AND column_name = 'purchase_account'
  ) THEN
    ALTER TABLE sim_cards ADD COLUMN purchase_account text DEFAULT '';
  END IF;
END $$;

-- 将 sim_cards 的 renew_cycle 默认值改为年付
ALTER TABLE sim_cards ALTER COLUMN renew_cycle SET DEFAULT '年付';

-- pingme_numbers: 新增 balance 和 recharge_logs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pingme_numbers' AND column_name = 'balance'
  ) THEN
    ALTER TABLE pingme_numbers ADD COLUMN balance numeric(10,2) DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pingme_numbers' AND column_name = 'recharge_logs'
  ) THEN
    ALTER TABLE pingme_numbers ADD COLUMN recharge_logs jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
