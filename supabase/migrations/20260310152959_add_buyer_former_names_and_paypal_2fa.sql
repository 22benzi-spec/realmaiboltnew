/*
  # 添加买手曾用名和PayPal二步验证码字段

  1. 修改 erp_buyers 表
     - 添加 former_names (text[]) 字段：存储曾用名数组

  2. 修改 paypal_accounts 表
     - 添加 totp_secret (text) 字段：二步验证码/TOTP密钥
     - 删除 risk_level 字段（不再使用）
     - 删除 account_alias 字段（不再使用）
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'erp_buyers' AND column_name = 'former_names'
  ) THEN
    ALTER TABLE erp_buyers ADD COLUMN former_names text[] DEFAULT '{}';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'paypal_accounts' AND column_name = 'totp_secret'
  ) THEN
    ALTER TABLE paypal_accounts ADD COLUMN totp_secret text DEFAULT '';
  END IF;
END $$;
