/*
  # 补充订单相关字段

  ## 新增字段
  - `sub_orders.order_status` - 订单状态（正常/不下单/无此订单/取消/退款），区别于 status（进度）
  - `sub_orders.fb_screenshot_url` - FB截图URL
  - `erp_orders.chat_order_id` - 聊单号

  ## 说明
  这些字段用于支持订单列表、任务管理等页面的完整链路展示。
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sub_orders' AND column_name = 'order_status'
  ) THEN
    ALTER TABLE sub_orders ADD COLUMN order_status text DEFAULT '正常';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sub_orders' AND column_name = 'fb_screenshot_url'
  ) THEN
    ALTER TABLE sub_orders ADD COLUMN fb_screenshot_url text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'erp_orders' AND column_name = 'chat_order_id'
  ) THEN
    ALTER TABLE erp_orders ADD COLUMN chat_order_id text;
  END IF;
END $$;
