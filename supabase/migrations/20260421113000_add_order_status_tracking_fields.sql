/*
  # Add status tracking fields to erp_orders

  1. New columns
    - `erp_orders.status_reason`
    - `erp_orders.status_changed_at`
    - `erp_orders.status_change_log`

  2. Trigger
    - when `erp_orders.status` changes, append a log entry
    - keep `status_changed_at` synced with the latest status transition
    - clear `status_reason` when the new status is not `暂停中` or `已截单`
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'erp_orders' AND column_name = 'status_reason'
  ) THEN
    ALTER TABLE erp_orders ADD COLUMN status_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'erp_orders' AND column_name = 'status_changed_at'
  ) THEN
    ALTER TABLE erp_orders ADD COLUMN status_changed_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'erp_orders' AND column_name = 'status_change_log'
  ) THEN
    ALTER TABLE erp_orders ADD COLUMN status_change_log jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;

UPDATE erp_orders
SET
  status_changed_at = COALESCE(status_changed_at, updated_at, created_at, now()),
  status_change_log = COALESCE(status_change_log, '[]'::jsonb)
WHERE status_changed_at IS NULL
   OR status_change_log IS NULL;

CREATE OR REPLACE FUNCTION public.track_erp_order_status_changes()
RETURNS trigger AS $$
DECLARE
  v_reason text;
  v_changed_at timestamptz;
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status NOT IN ('暂停中', '已截单') THEN
      NEW.status_reason := NULL;
    END IF;

    v_reason := NULLIF(BTRIM(COALESCE(NEW.status_reason, '')), '');
    IF NEW.status IN ('暂停中', '已截单') THEN
      NEW.status_reason := v_reason;
    END IF;

    v_changed_at := now();
    NEW.status_changed_at := v_changed_at;
    NEW.status_change_log := COALESCE(OLD.status_change_log, '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'from_status', COALESCE(OLD.status, ''),
        'to_status', COALESCE(NEW.status, ''),
        'reason', v_reason,
        'changed_at', to_char(v_changed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_track_erp_order_status_changes ON erp_orders;

CREATE TRIGGER trg_track_erp_order_status_changes
BEFORE UPDATE OF status, status_reason ON erp_orders
FOR EACH ROW
EXECUTE FUNCTION public.track_erp_order_status_changes();
