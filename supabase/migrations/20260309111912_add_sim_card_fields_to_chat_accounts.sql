/*
  # Add SIM card fields to chat_accounts

  ## Summary
  实体机需要绑定一张SIM卡，记录卡号和到期日期。

  1. 新增字段
    - `sim_card_number` (text) - SIM卡号（手机卡号码）
    - `sim_card_expire` (date) - SIM卡到期日期
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_accounts' AND column_name = 'sim_card_number') THEN
    ALTER TABLE chat_accounts ADD COLUMN sim_card_number text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_accounts' AND column_name = 'sim_card_expire') THEN
    ALTER TABLE chat_accounts ADD COLUMN sim_card_expire date;
  END IF;
END $$;
