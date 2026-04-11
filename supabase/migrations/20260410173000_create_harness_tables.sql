/*
  # Create harness tables

  ## Purpose
  Provide a first-class execution log for the Harness system:
  - runs
  - steps
  - observer reviews
  - eval cases
  - case runs
*/

CREATE TABLE IF NOT EXISTS harness_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid,
  task_text text NOT NULL DEFAULT '',
  mode text NOT NULL DEFAULT 'agent',
  status text NOT NULL DEFAULT 'queued',
  risk_level text NOT NULL DEFAULT 'low',
  review_verdict text DEFAULT '',
  human_review_required boolean NOT NULL DEFAULT false,
  requested_by_id text DEFAULT '',
  requested_by_name text DEFAULT '',
  requested_by_role text DEFAULT '',
  selected_tool_id text DEFAULT '',
  plan_summary text DEFAULT '',
  final_output jsonb DEFAULT '{}'::jsonb,
  context_keys text[] DEFAULT '{}'::text[],
  error_message text DEFAULT '',
  retry_count integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_harness_runs_status ON harness_runs(status);
CREATE INDEX IF NOT EXISTS idx_harness_runs_created_at ON harness_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_harness_runs_case_id ON harness_runs(case_id);

ALTER TABLE harness_runs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='harness_runs' AND policyname='harness_runs_all') THEN
    CREATE POLICY "harness_runs_all" ON harness_runs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS harness_run_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES harness_runs(id) ON DELETE CASCADE,
  step_index integer NOT NULL DEFAULT 0,
  step_type text NOT NULL DEFAULT 'system',
  title text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  tool_id text DEFAULT '',
  input_payload jsonb DEFAULT '{}'::jsonb,
  output_payload jsonb DEFAULT '{}'::jsonb,
  error_message text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_harness_run_steps_run_id ON harness_run_steps(run_id, step_index);

ALTER TABLE harness_run_steps ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='harness_run_steps' AND policyname='harness_run_steps_all') THEN
    CREATE POLICY "harness_run_steps_all" ON harness_run_steps FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS harness_run_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES harness_runs(id) ON DELETE CASCADE,
  attempt_number integer NOT NULL DEFAULT 1,
  verdict text NOT NULL DEFAULT 'needs_revision',
  confidence numeric NOT NULL DEFAULT 0,
  risk_level text NOT NULL DEFAULT 'low',
  human_review_required boolean NOT NULL DEFAULT false,
  issues jsonb DEFAULT '[]'::jsonb,
  repair_instructions text DEFAULT '',
  review_payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_harness_run_reviews_run_id ON harness_run_reviews(run_id, attempt_number);

ALTER TABLE harness_run_reviews ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='harness_run_reviews' AND policyname='harness_run_reviews_all') THEN
    CREATE POLICY "harness_run_reviews_all" ON harness_run_reviews FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS harness_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_key text UNIQUE NOT NULL,
  title text NOT NULL DEFAULT '',
  description text DEFAULT '',
  mode text NOT NULL DEFAULT 'agent',
  task_text text NOT NULL DEFAULT '',
  selected_tool_id text DEFAULT '',
  tool_input jsonb DEFAULT '{}'::jsonb,
  expected_tool_ids text[] DEFAULT '{}'::text[],
  expected_risk_level text DEFAULT '',
  expected_verdict text DEFAULT '',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_harness_cases_active ON harness_cases(is_active, created_at DESC);

ALTER TABLE harness_cases ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='harness_cases' AND policyname='harness_cases_all') THEN
    CREATE POLICY "harness_cases_all" ON harness_cases FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS harness_case_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES harness_cases(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES harness_runs(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'completed',
  verdict text DEFAULT '',
  passed boolean NOT NULL DEFAULT false,
  score numeric DEFAULT 0,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_harness_case_runs_case_id ON harness_case_runs(case_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_harness_case_runs_run_id ON harness_case_runs(run_id);

ALTER TABLE harness_case_runs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='harness_case_runs' AND policyname='harness_case_runs_all') THEN
    CREATE POLICY "harness_case_runs_all" ON harness_case_runs FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;
