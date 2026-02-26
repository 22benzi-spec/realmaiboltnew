/*
  # 下单类型多选支持

  ## 变更说明
  将下单类型从单一文本字段升级为支持多种类型的数组字段，
  同时在排期表中增加每天可指定下单类型的字段。

  ## 变更内容

  ### erp_orders 表
  - 新增 `order_types` 列 (text[])：存储多种下单类型，如 ['免评','文字评','Feedback']
  - 保留原 `order_type` 列不变（兼容旧数据）
  - 将现有 order_type 数据迁移到 order_types 数组

  ### order_schedules 表
  - 新增 `order_types` 列 (text[])：该排期日当天需操作的下单类型列表
  - 新增 `type_quantities` 列 (jsonb)：每种类型当天的数量，如 {"免评":3,"文字评":2}

  ## 安全说明
  - 不删除任何现有列，保持向后兼容
*/

-- 1. erp_orders: 新增 order_types 数组列
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'erp_orders' AND column_name = 'order_types'
  ) THEN
    ALTER TABLE erp_orders ADD COLUMN order_types text[] DEFAULT '{}';
  END IF;
END $$;

-- 2. 将已有 order_type 数据迁移到 order_types 数组（仅对 order_types 为空的行）
UPDATE erp_orders
SET order_types = ARRAY[order_type]
WHERE order_types = '{}' AND order_type IS NOT NULL AND order_type <> '';

-- 3. order_schedules: 新增 order_types 和 type_quantities 列
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_schedules' AND column_name = 'order_types'
  ) THEN
    ALTER TABLE order_schedules ADD COLUMN order_types text[] DEFAULT '{}';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_schedules' AND column_name = 'type_quantities'
  ) THEN
    ALTER TABLE order_schedules ADD COLUMN type_quantities jsonb DEFAULT '{}';
  END IF;
END $$;
