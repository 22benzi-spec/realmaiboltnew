/*
  # 字段调整

  1. pingme_numbers 新增 account_name 字段
     - 表示购买该账号余额对应的账号名称（总余额归属账号）
     
  2. chat_accounts 新增 disabled_reason 字段
     - 停用时记录具体原因（文字说明）
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'pingme_numbers' AND column_name = 'account_name'
  ) THEN
    ALTER TABLE pingme_numbers ADD COLUMN account_name text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chat_accounts' AND column_name = 'disabled_reason'
  ) THEN
    ALTER TABLE chat_accounts ADD COLUMN disabled_reason text DEFAULT '';
  END IF;
END $$;
