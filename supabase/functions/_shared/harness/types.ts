export type HarnessMode = 'agent' | 'tool' | 'case'
export type HarnessRiskLevel = 'low' | 'medium' | 'high'
export type HarnessReviewVerdict = 'approved' | 'needs_revision' | 'blocked'
export type HarnessRunStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'needs_revision'
  | 'blocked'
  | 'pending_approval'
  | 'failed'

export interface RequestedBy {
  id?: string
  name?: string
  role?: string
}

export interface ExecuteHarnessPayload {
  task_text?: string
  mode?: HarnessMode
  selected_tool_id?: string
  tool_input?: Record<string, unknown>
  case_id?: string
  requested_by?: RequestedBy
  max_retries?: number
}

export interface GuardResult {
  allowed: boolean
  risk_level: HarnessRiskLevel
  requires_approval: boolean
  reasons: string[]
}

export interface ReviewIssue {
  code: string
  message: string
  severity: 'low' | 'medium' | 'high'
}

export interface ReviewResult {
  verdict: HarnessReviewVerdict
  confidence: number
  risk_level: HarnessRiskLevel
  issues: ReviewIssue[]
  repair_instructions: string
  human_review_required: boolean
  reviewer: 'ai' | 'heuristic'
}

export interface RunStepRecord {
  step_type: string
  title: string
  status: string
  tool_id?: string
  input_payload?: Record<string, unknown>
  output_payload?: Record<string, unknown>
  error_message?: string
}

export interface ToolExecutionResult {
  summary: string
  data: Record<string, unknown>
}

export interface ToolDefinition {
  id: string
  description_zh: string
  risk_level: HarnessRiskLevel
  requires_approval: boolean
  allowed_roles: string[]
  side_effects: boolean
  input_schema: Record<string, unknown>
  execute: (args: {
    supabase: any
    input: Record<string, unknown>
    requestedBy?: RequestedBy
  }) => Promise<ToolExecutionResult>
}
