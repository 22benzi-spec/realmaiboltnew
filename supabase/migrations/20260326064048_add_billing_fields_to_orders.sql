/*
  # 订单账单字段扩展

  ## 新增字段说明

  ### erp_orders 表新增字段

  1. **基础入账状态**
     - `billing_status` (text): 基础入账状态
       - '已完成': 入账已完成，正常
       - '未完成': 入账未完成，列表高亮提示

  2. **欠款相关**
     - `debt_status` (text): 欠款状态
       - 'none': 无欠款（默认）
       - 'owed': 有欠款，列表高亮提示
       - 'cleared': 欠款已清
     - `debt_amount` (numeric): 欠款金额（元）
     - `debt_notes` (text): 欠款备注明细，如「税费 ¥120 + 本金差价 ¥80」
     - `debt_marked_by` (text): 欠款由谁标记（商务名）
     - `debt_marked_at` (timestamptz): 欠款标记时间

  3. **多类型下单量**
     - `type_quantities` (jsonb): 各类型对应下单数量，如 `{"文字评":10,"图片评":5}`
       当只有一种类型时为 null，order_quantity 即为总量

  ## 安全
  - 无需新建 RLS（复用 erp_orders 表现有 RLS）
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'erp_orders' AND column_name = 'billing_status'
  ) THEN
    ALTER TABLE erp_orders ADD COLUMN billing_status text DEFAULT '已完成';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'erp_orders' AND column_name = 'debt_status'
  ) THEN
    ALTER TABLE erp_orders ADD COLUMN debt_status text DEFAULT 'none';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'erp_orders' AND column_name = 'debt_amount'
  ) THEN
    ALTER TABLE erp_orders ADD COLUMN debt_amount numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'erp_orders' AND column_name = 'debt_notes'
  ) THEN
    ALTER TABLE erp_orders ADD COLUMN debt_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'erp_orders' AND column_name = 'debt_marked_by'
  ) THEN
    ALTER TABLE erp_orders ADD COLUMN debt_marked_by text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'erp_orders' AND column_name = 'debt_marked_at'
  ) THEN
    ALTER TABLE erp_orders ADD COLUMN debt_marked_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'erp_orders' AND column_name = 'type_quantities'
  ) THEN
    ALTER TABLE erp_orders ADD COLUMN type_quantities jsonb;
  END IF;
END $$;
