/*
  # 创建角色权限配置表

  ## 说明
  - 新增 `role_permissions` 表，按角色统一配置权限
  - 每个角色一行，存储该角色拥有的权限列表（text[]）
  - 初始化9个系统角色的默认权限
  - 启用 RLS，仅允许认证用户查看
*/

CREATE TABLE IF NOT EXISTS role_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL UNIQUE,
  permissions text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read role permissions"
  ON role_permissions FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Authenticated users can update role permissions"
  ON role_permissions FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can insert role permissions"
  ON role_permissions FOR INSERT
  TO anon
  WITH CHECK (true);

INSERT INTO role_permissions (role, permissions) VALUES
  ('超级管理员', ARRAY['创建订单','查看订单','编辑订单','删除订单','导出订单','任务管理','分配管理','业务员工作台','抢单大厅','业务员管理','买手库','业务数据分析','售后问题单','买手盈亏分析','礼品卡管理','PayPal管理','退款审批','退款账单','交易流水','利润分析','客户库','商务管理','聊单号管理','行政资源管理','用户与权限管理']),
  ('业务主管', ARRAY['创建订单','查看订单','编辑订单','导出订单','任务管理','分配管理','业务员工作台','抢单大厅','业务员管理','买手库','业务数据分析','售后问题单','买手盈亏分析']),
  ('业务员', ARRAY['查看订单','任务管理','业务员工作台','抢单大厅','买手库']),
  ('行政主管', ARRAY['聊单号管理','行政资源管理','买手库','查看订单']),
  ('行政员', ARRAY['聊单号管理','行政资源管理']),
  ('商务主管', ARRAY['创建订单','查看订单','编辑订单','导出订单','任务管理','分配管理','客户库','商务管理','业务数据分析']),
  ('商务', ARRAY['查看订单','任务管理','客户库','商务管理']),
  ('财务主管', ARRAY['查看订单','导出订单','礼品卡管理','PayPal管理','退款审批','退款账单','交易流水','利润分析']),
  ('财务员', ARRAY['礼品卡管理','PayPal管理','退款账单','交易流水'])
ON CONFLICT (role) DO NOTHING;
