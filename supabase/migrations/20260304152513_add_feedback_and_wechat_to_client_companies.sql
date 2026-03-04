/*
  # client_companies 增加反馈方式和商务微信字段

  ## 变更内容
  1. 修改 client_companies 表
     - 新增 `feedback_type` (text): 公司反馈方式，枚举值：私聊 / 群聊，默认 '私聊'
     - 新增 `business_wechat_name` (text): 对接的商务微信名称（商务经理旗下某个微信号）

  ## 说明
  - 不破坏现有数据，新增字段均有默认值或允许为 NULL
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_companies' AND column_name = 'feedback_type'
  ) THEN
    ALTER TABLE client_companies ADD COLUMN feedback_type text DEFAULT '私聊';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_companies' AND column_name = 'business_wechat_name'
  ) THEN
    ALTER TABLE client_companies ADD COLUMN business_wechat_name text DEFAULT '';
  END IF;
END $$;
