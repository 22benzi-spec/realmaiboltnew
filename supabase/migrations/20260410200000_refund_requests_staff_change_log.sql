/*
  # refund_requests.staff_change_log
  业务员对待审核返款单的修改留痕（JSON 数组），每次「更新返款申请」若有字段变更则追加一条。
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'refund_requests' AND column_name = 'staff_change_log') THEN
    ALTER TABLE refund_requests ADD COLUMN staff_change_log jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
