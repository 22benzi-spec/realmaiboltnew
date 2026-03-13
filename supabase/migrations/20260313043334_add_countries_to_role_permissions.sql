/*
  # 给角色权限表增加 countries 字段

  用于存储业务主管/业务员角色的可操作国家范围
  空数组代表默认全部国家
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'role_permissions' AND column_name = 'countries'
  ) THEN
    ALTER TABLE role_permissions ADD COLUMN countries text[] NOT NULL DEFAULT '{}';
  END IF;
END $$;
