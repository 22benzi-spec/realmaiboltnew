/*
  # 重构 after_sale_issues 表字段

  1. 变更说明
    - 新增 `business_manager_name` - 商务名称(冗余)
    - 新增 `commission_fee` - 佣金金额(用于计算退款给客户总额)
    - 新增 `refund_to_client_method` - 返款给客户的方式: PayPal/礼品卡/转账/其他
    - 新增 `refund_to_client_amount` - 返款给客户金额(本金+佣金)
    - 新增 `refund_to_client_notes` - 返款备注
    - 新增 `refund_to_client_at` - 返款时间
    - 更新 issue_status 中不再需要 '已确认损失', 改为 '已退款给客户'
      (已有数据无需迁移, 新的状态枚举在应用层控制)

  2. 入口变更
    - 问题单不再单独新建，而是从子订单直接标记迁移
    - issue_number 字段保留但实际展示以子订单号为主标识

  3. 安全
    - 沿用已有 RLS 策略
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'after_sale_issues' AND column_name = 'business_manager_name'
  ) THEN
    ALTER TABLE after_sale_issues ADD COLUMN business_manager_name text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'after_sale_issues' AND column_name = 'commission_fee'
  ) THEN
    ALTER TABLE after_sale_issues ADD COLUMN commission_fee numeric DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'after_sale_issues' AND column_name = 'refund_to_client_method'
  ) THEN
    ALTER TABLE after_sale_issues ADD COLUMN refund_to_client_method text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'after_sale_issues' AND column_name = 'refund_to_client_amount'
  ) THEN
    ALTER TABLE after_sale_issues ADD COLUMN refund_to_client_amount numeric DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'after_sale_issues' AND column_name = 'refund_to_client_notes'
  ) THEN
    ALTER TABLE after_sale_issues ADD COLUMN refund_to_client_notes text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'after_sale_issues' AND column_name = 'refund_to_client_at'
  ) THEN
    ALTER TABLE after_sale_issues ADD COLUMN refund_to_client_at timestamptz;
  END IF;
END $$;
