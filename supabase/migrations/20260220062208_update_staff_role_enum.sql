/*
  # 更新员工角色字段

  1. 修改说明
    - 将 staff 表的 role 字段改为支持固定的四个角色：业务员、商务、财务、管理员
    - 添加 role_enum 类型约束
    - 为现有无角色数据设置默认值 '业务员'

  2. 角色说明
    - 业务员：管理买手、执行任务、工作台
    - 商务：管理客户、下单、查看业绩
    - 财务：管理退款、PayPal、礼品卡
    - 管理员：全权限，人员管理、系统配置
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'staff_role') THEN
    CREATE TYPE staff_role AS ENUM ('业务员', '商务', '财务', '管理员');
  END IF;
END $$;

ALTER TABLE staff
  ALTER COLUMN role SET DEFAULT '业务员';

UPDATE staff SET role = '业务员' WHERE role IS NULL OR role = '';
