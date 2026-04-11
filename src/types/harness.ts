export type HarnessMode = 'agent' | 'tool' | 'case'
export type HarnessRiskLevel = 'low' | 'medium' | 'high'
export type HarnessRunStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'needs_revision'
  | 'blocked'
  | 'pending_approval'
  | 'failed'

export type ReviewVerdict = 'approved' | 'needs_revision' | 'blocked'

export interface HarnessIssue {
  code: string
  message: string
  severity: 'low' | 'medium' | 'high'
}

export interface HarnessReview {
  verdict: ReviewVerdict
  confidence: number
  risk_level: HarnessRiskLevel
  issues: HarnessIssue[]
  repair_instructions: string
  human_review_required: boolean
}

export interface HarnessRun {
  id: string
  case_id?: string | null
  task_text: string
  mode: HarnessMode
  status: HarnessRunStatus
  risk_level: HarnessRiskLevel
  review_verdict?: ReviewVerdict | ''
  human_review_required: boolean
  requested_by_id?: string
  requested_by_name?: string
  requested_by_role?: string
  selected_tool_id?: string
  plan_summary?: string
  final_output?: Record<string, unknown>
  context_keys?: string[]
  error_message?: string
  retry_count?: number
  started_at?: string
  finished_at?: string
  created_at?: string
}

export interface HarnessRunStep {
  id: string
  run_id: string
  step_index: number
  step_type: string
  title: string
  status: string
  tool_id?: string
  input_payload?: Record<string, unknown>
  output_payload?: Record<string, unknown>
  error_message?: string
  created_at?: string
}

export interface HarnessRunReviewRecord {
  id: string
  run_id: string
  attempt_number: number
  verdict: ReviewVerdict
  confidence: number
  risk_level: HarnessRiskLevel
  human_review_required: boolean
  issues: HarnessIssue[]
  repair_instructions: string
  created_at?: string
}

export interface HarnessCase {
  id: string
  case_key: string
  title: string
  description?: string
  mode: HarnessMode
  task_text: string
  selected_tool_id?: string
  tool_input?: Record<string, unknown>
  expected_tool_ids?: string[]
  expected_risk_level?: HarnessRiskLevel | ''
  expected_verdict?: ReviewVerdict | ''
  is_active: boolean
  created_at?: string
}

export interface HarnessCaseRun {
  id: string
  case_id: string
  run_id: string
  status: string
  verdict?: ReviewVerdict | ''
  passed: boolean
  score?: number
  notes?: string
  created_at?: string
}

export interface HarnessToolCatalogItem {
  id: string
  label: string
  description_zh: string
  risk_level: HarnessRiskLevel
  requires_approval: boolean
  input_template: Record<string, unknown>
}
