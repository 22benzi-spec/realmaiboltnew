/*
  # 客户联系人员工字段扩展

  ## 背景
  客户公司旗下有多个员工（对接人），需要记录每位员工的：
  - 在职/离职状态
  - 负责的店铺列表
  - 负责的品牌列表
  
  ## 设计原则
  - 员工离职后，其负责的店铺和品牌仍归属于该客户公司（不随员工走）
  - 离职员工保留记录，employment_status 标记为「离职」
  - 新对接人可以接手离职员工的店铺和品牌

  ## 变更内容
  1. 新增字段 `employment_status` - 在职状态（在职/离职/停止合作），默认「在职」
  2. 新增字段 `resigned_at` - 离职日期
  3. 新增字段 `responsible_stores` - 负责的店铺名称数组
  4. 新增字段 `responsible_brands` - 负责的品牌名称数组
  5. 新增字段 `join_date` - 入职/开始对接日期
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_contacts' AND column_name = 'employment_status'
  ) THEN
    ALTER TABLE client_contacts ADD COLUMN employment_status text NOT NULL DEFAULT '在职';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_contacts' AND column_name = 'resigned_at'
  ) THEN
    ALTER TABLE client_contacts ADD COLUMN resigned_at date;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_contacts' AND column_name = 'responsible_stores'
  ) THEN
    ALTER TABLE client_contacts ADD COLUMN responsible_stores text[] DEFAULT '{}';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_contacts' AND column_name = 'responsible_brands'
  ) THEN
    ALTER TABLE client_contacts ADD COLUMN responsible_brands text[] DEFAULT '{}';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_contacts' AND column_name = 'join_date'
  ) THEN
    ALTER TABLE client_contacts ADD COLUMN join_date date;
  END IF;
END $$;
