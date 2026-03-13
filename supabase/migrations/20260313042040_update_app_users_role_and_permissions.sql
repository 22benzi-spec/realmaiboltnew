/*
  # 更新app_users角色枚举和权限字段

  ## 变更说明
  1. 新增 `employment_status` 字段：在职/离职（人员在职状态，独立于账号状态）
  2. 新增 `permissions` 字段：text[]数组，存储手动勾选的权限列表
  3. 移除 notes 字段（不再使用）
  4. role 字段更新为新的角色体系

  ## 新角色体系
  超级管理员 / 业务主管 / 业务员 / 行政主管 / 行政员 / 商务主管 / 商务 / 财务主管 / 财务员 / 租户
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'employment_status'
  ) THEN
    ALTER TABLE app_users ADD COLUMN employment_status text NOT NULL DEFAULT '在职'
      CHECK (employment_status IN ('在职', '离职'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'app_users' AND column_name = 'permissions'
  ) THEN
    ALTER TABLE app_users ADD COLUMN permissions text[] NOT NULL DEFAULT '{}';
  END IF;
END $$;
