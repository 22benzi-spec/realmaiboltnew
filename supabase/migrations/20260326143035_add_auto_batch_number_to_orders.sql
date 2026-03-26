/*
  # 为所有订单自动生成 batch_number

  ## 背景
  之前 batch_number 仅在"创建任务组"时才赋值，单条任务的 batch_number 为 null。
  这导致账目、补款、退款接口出现不统一问题，且无法对单条任务做批次管理。

  ## 本次改动
  1. 为所有现有 batch_number 为 null 的任务生成唯一批次号（格式：B-YYYYMMDD-任务号后6位）
  2. 不修改已有 batch_number（已加入任务组的任务保持原有批次号）
  3. 不破坏任何现有数据
*/

DO $$
DECLARE
  r RECORD;
  new_batch_number TEXT;
BEGIN
  FOR r IN
    SELECT id, order_number, created_at
    FROM erp_orders
    WHERE batch_number IS NULL OR batch_number = ''
  LOOP
    new_batch_number := 'B-'
      || TO_CHAR(COALESCE(r.created_at::date, CURRENT_DATE), 'YYYYMMDD')
      || '-'
      || RIGHT(REPLACE(r.order_number, 'ORD', ''), 6);
    
    UPDATE erp_orders
    SET batch_number = new_batch_number
    WHERE id = r.id;
  END LOOP;
END $$;
