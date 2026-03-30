/*
  # 添加群组名称字段到 erp_orders

  1. 新增字段
    - `group_name` (text): 群组名称，当反馈方式为群组时填写，如"广州贸易-瑞麦测评群1"

  2. 填充测试数据
    - 给已有群组方式的订单填充群组名称
    - 给更多订单填充 feedback_channel 和 group_name 数据
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'erp_orders' AND column_name = 'group_name'
  ) THEN
    ALTER TABLE erp_orders ADD COLUMN group_name text;
  END IF;
END $$;

UPDATE erp_orders SET
  feedback_channel = '群组',
  group_name = '深圳星辰科技-瑞麦测评群1'
WHERE customer_name = '深圳星辰科技' AND feedback_channel IS NULL;

UPDATE erp_orders SET
  feedback_channel = '群组',
  group_name = '广州优品贸易-瑞麦测评群2'
WHERE customer_name = '广州优品贸易' AND feedback_channel IS NULL;

UPDATE erp_orders SET
  feedback_channel = '群组',
  group_name = '杭州灯饰-瑞麦测评群1'
WHERE customer_name = '杭州灯饰集团' AND feedback_channel IS NULL;

UPDATE erp_orders SET
  group_name = '深圳星辰科技-瑞麦测评群1'
WHERE customer_name = '深圳星辰科技' AND feedback_channel = '群组' AND group_name IS NULL;

UPDATE erp_orders SET
  group_name = '广州优品贸易-瑞麦测评群2'
WHERE customer_name = '广州优品贸易' AND feedback_channel = '群组' AND group_name IS NULL;

UPDATE erp_orders SET
  group_name = '杭州灯饰-瑞麦测评群1'
WHERE customer_name = '杭州灯饰集团' AND feedback_channel = '群组' AND group_name IS NULL;

UPDATE erp_orders SET feedback_channel = '私聊'
WHERE feedback_channel IS NULL;
