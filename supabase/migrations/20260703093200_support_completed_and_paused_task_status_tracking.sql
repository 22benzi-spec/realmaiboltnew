/*
  # Support current task status labels

  Keeps status tracking fields working for the current "已暂停" task label while
  still preserving reasons for legacy rows that may use "暂停中".
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
    IF NEW.status NOT IN ('已暂停', '暂停中', '已截单') THEN
      NEW.status_reason := NULL;
    END IF;

    v_reason := NULLIF(BTRIM(COALESCE(NEW.status_reason, '')), '');
    IF NEW.status IN ('已暂停', '暂停中', '已截单') THEN
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

NOTIFY pgrst, 'reload schema';
