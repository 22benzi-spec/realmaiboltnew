/*
  # wechat_clients 增加归属公司和反馈方式字段

  ## 变更内容
  1. 修改 wechat_clients 表
     - 新增 `company_name` (text): 客户归属的公司名称
     - 新增 `feedback_type` (text): 反馈方式，枚举值：群聊 / 私发，默认 '私发'

  ## 说明
  - 不破坏现有数据，新增字段均有默认值或允许为 NULL
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wechat_clients' AND column_name = 'company_name'
  ) THEN
    ALTER TABLE wechat_clients ADD COLUMN company_name text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'wechat_clients' AND column_name = 'feedback_type'
  ) THEN
    ALTER TABLE wechat_clients ADD COLUMN feedback_type text DEFAULT '私发';
  END IF;
END $$;
