import { callJsonModel } from './model.ts'
import type { GuardResult, ReviewIssue, ReviewResult, RunStepRecord } from './types.ts'

interface ReviewInput {
  taskText: string
  selectedToolId?: string
  guard: GuardResult
  steps: RunStepRecord[]
  finalOutput: Record<string, unknown>
}

function heuristicIssues(input: ReviewInput) {
  const issues: ReviewIssue[] = []
  const failedSteps = input.steps.filter((step) => step.status === 'failed')
  if (!input.guard.allowed) {
    issues.push({
      code: 'guard_blocked',
      message: input.guard.reasons.join('；') || 'Guard 未通过',
      severity: 'high',
    })
  }
  if (!input.selectedToolId) {
    issues.push({
      code: 'missing_tool',
      message: '未能解析出可执行的受控工具',
      severity: 'high',
    })
  }
  if (failedSteps.length > 0) {
    issues.push({
      code: 'tool_failed',
      message: `存在 ${failedSteps.length} 个失败步骤`,
      severity: 'medium',
    })
  }
  if (input.guard.requires_approval) {
    issues.push({
      code: 'approval_required',
      message: '该运行包含高风险动作，需要人工审批',
      severity: 'medium',
    })
  }
  return issues
}

function fallbackReview(input: ReviewInput): ReviewResult {
  const issues = heuristicIssues(input)
  if (!input.guard.allowed) {
    return {
      verdict: 'blocked',
      confidence: 0.9,
      risk_level: input.guard.risk_level,
      issues,
      repair_instructions: '先修复 Guard 拦截原因，再重新执行。',
      human_review_required: true,
      reviewer: 'heuristic',
    }
  }

  const failedSteps = input.steps.some((step) => step.status === 'failed')
  if (failedSteps || !input.selectedToolId) {
    return {
      verdict: 'needs_revision',
      confidence: 0.72,
      risk_level: input.guard.risk_level,
      issues,
      repair_instructions: '补齐关键参数或修复失败步骤后重试。',
      human_review_required: input.guard.requires_approval,
      reviewer: 'heuristic',
    }
  }

  return {
    verdict: input.guard.requires_approval ? 'approved' : 'approved',
    confidence: input.guard.requires_approval ? 0.78 : 0.88,
    risk_level: input.guard.risk_level,
    issues,
    repair_instructions: input.guard.requires_approval ? '动作已完成，但进入人工审批队列。' : '无需修复。',
    human_review_required: input.guard.requires_approval,
    reviewer: 'heuristic',
  }
}

export async function buildReview(input: ReviewInput): Promise<ReviewResult> {
  const modelResult = await callJsonModel<ReviewResult>([
    {
      role: 'system',
      content: [
        '你是 ERP Harness 的 Observer Reviewer。',
        '请只输出 JSON。',
        '必须包含 verdict, confidence, risk_level, issues, repair_instructions, human_review_required。',
        'verdict 只能是 approved / needs_revision / blocked。',
        'issues 必须是数组，每项包含 code, message, severity。',
        '所有 message 与 repair_instructions 用中文。',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify(input),
    },
  ])

  if (modelResult.ok && modelResult.data) {
    return {
      ...modelResult.data,
      reviewer: 'ai',
    }
  }

  return fallbackReview(input)
}
