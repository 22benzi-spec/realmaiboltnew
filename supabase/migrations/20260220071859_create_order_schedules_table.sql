/*
  # 创建订单排期表

  1. 新建表
    - `order_schedules`
      - `id` (uuid, 主键)
      - `order_id` (uuid, 关联 erp_orders)
      - `schedule_date` (date, 排期日期)
      - `quantity` (int, 当天下单数量)
      - `keywords` (text[], 当天使用关键词)
      - `created_at` (timestamp)

  2. 安全设置
    - 启用 RLS
    - 添加 authenticated 用户策略
*/

CREATE TABLE IF NOT EXISTS order_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES erp_orders(id) ON DELETE CASCADE,
  schedule_date date NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  keywords text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select order_schedules"
  ON order_schedules FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert order_schedules"
  ON order_schedules FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update order_schedules"
  ON order_schedules FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete order_schedules"
  ON order_schedules FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_order_schedules_order_id ON order_schedules(order_id);
CREATE INDEX IF NOT EXISTS idx_order_schedules_date ON order_schedules(schedule_date);
