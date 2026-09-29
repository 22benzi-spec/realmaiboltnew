/*
  # client_companies 增加群聊名称列表

  ## 变更内容
  1. 修改 client_companies 表
     - 新增 `group_names` (text[]): 反馈方式为群聊时可填写多个群聊名称

  ## 说明
  - 不破坏现有数据，默认空数组
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_companies' AND column_name = 'group_names'
  ) THEN
    ALTER TABLE client_companies ADD COLUMN group_names text[] DEFAULT '{}';
  END IF;
END $$;
