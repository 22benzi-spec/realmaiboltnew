import { supabase } from './supabase'
import type { SubOrder } from '../types'
import type {
  HarnessCase,
  HarnessCaseRun,
  HarnessIssue,
  HarnessReview,
  HarnessRun,
  HarnessRunReviewRecord,
  HarnessRunStatus,
  HarnessRunStep,
  HarnessRiskLevel,
  HarnessToolCatalogItem,
  ReviewVerdict,
} from '../types/harness'

export const harnessToolCatalog: HarnessToolCatalogItem[] = [
  {
    id: 'count_buyers',
    label: '统计买手数量',
    description_zh: '统计当前买手总数或活跃买手数量',
    risk_level: 'low',
    requires_approval: false,
    input_template: {
      status: '活跃',
    },
  },
  {
    id: 'list_staff_tasks',
    label: '查询业务员任务',
    description_zh: '查询某业务员当前任务列表',
    risk_level: 'low',
    requires_approval: false,
    input_template: {
      staff_id: '',
      status: '',
      limit: 20,
    },
  },
  {
    id: 'assign_buyer',
    label: '分配买手',
    description_zh: '给子订单分配买手',
    risk_level: 'medium',
    requires_approval: false,
    input_template: {
      sub_order_id: '',
      buyer_id: '',
      operator_name: '',
    },
  },
  {
    id: 'set_refund_method',
    label: '设置退款方式',
    description_zh: '设置退款方式和退款时序',
    risk_level: 'medium',
    requires_approval: false,
    input_template: {
      sub_order_id: '',
      refund_method: 'PayPal',
      refund_sequence: '先给单后退款',
    },
  },
  {
    id: 'submit_refund_request',
    label: '提交退款申请',
    description_zh: '向财务提交退款申请',
    risk_level: 'high',
    requires_approval: true,
    input_template: {
      sub_order_id: '',
      refund_amount_usd: 0,
      notes: '',
      buyer_paypal_email: '',
    },
  },
  {
    id: 'return_sub_order',
    label: '回转子订单',
    description_zh: '把子订单回转给管理员',
    risk_level: 'high',
    requires_approval: true,
    input_template: {
      sub_order_id: '',
      reason: '',
      clear_buyer: true,
      operator_id: '',
      operator_name: '',
    },
  },
]

export interface HarnessStaffOption {
  id: string
  name: string
  role?: string
  status?: string
}

const STORAGE_KEYS = {
  runs: 'local_harness_runs',
  steps: 'local_harness_run_steps',
  reviews: 'local_harness_run_reviews',
  cases: 'local_harness_cases',
  caseRuns: 'local_harness_case_runs',
} as const

type RequestedBy = {
  id?: string
  name?: string
  role?: string
}

type ExecutePayload = {
  task_text?: string
  mode?: 'agent' | 'tool' | 'case'
  selected_tool_id?: string
  tool_input?: Record<string, unknown>
  case_id?: string
  requested_by?: RequestedBy
}

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readStore<T>(key: string, fallback: T): T {
  if (!canUseLocalStorage()) return fallback
  const raw = window.localStorage.getItem(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function writeStore<T>(key: string, value: T) {
  if (!canUseLocalStorage()) return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function randomId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID()}`
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

function nowIso() {
  return new Date().toISOString()
}

function getTool(toolId?: string) {
  return harnessToolCatalog.find((tool) => tool.id === toolId)
}

function inferToolFromTask(taskText: string) {
  if (taskText.includes('买手') && (taskText.includes('多少') || taskText.includes('几个') || taskText.includes('数量') || taskText.includes('总数'))) {
    return 'count_buyers'
  }
  if (taskText.includes('退款') && taskText.includes('申请')) return 'submit_refund_request'
  if (taskText.includes('退款') && (taskText.includes('方式') || taskText.includes('时序') || taskText.includes('渠道'))) {
    return 'set_refund_method'
  }
  if (taskText.includes('回转')) return 'return_sub_order'
  if (taskText.includes('分配') && taskText.includes('买手')) return 'assign_buyer'
  if (taskText.includes('任务') || taskText.includes('列表') || taskText.includes('查询')) return 'list_staff_tasks'
  return ''
}

function makeIssues(messages: Array<{ code: string; message: string; severity: HarnessIssue['severity'] }>): HarnessIssue[] {
  return messages.map((item) => ({
    code: item.code,
    message: item.message,
    severity: item.severity,
  }))
}

function buildGuardResult(toolId: string, requestedBy?: RequestedBy) {
  const tool = getTool(toolId)
  if (!tool) {
    return {
      allowed: false,
      risk_level: 'high' as HarnessRiskLevel,
      requires_approval: true,
      reasons: ['未找到匹配的受控工具'],
    }
  }

  if (requestedBy?.role && !['管理员'].includes(requestedBy.role) && tool.requires_approval) {
    return {
      allowed: true,
      risk_level: tool.risk_level,
      requires_approval: true,
      reasons: ['该动作属于高风险操作，需人工确认'],
    }
  }

  return {
    allowed: true,
    risk_level: tool.risk_level,
    requires_approval: tool.requires_approval,
    reasons: tool.requires_approval ? ['该动作会改写关键业务数据，需人工确认'] : [],
  }
}

function buildReview(args: {
  toolId?: string
  guard: { allowed: boolean; risk_level: HarnessRiskLevel; requires_approval: boolean; reasons: string[] }
  toolFailed: boolean
  finalOutput: Record<string, unknown>
}): HarnessReview {
  const issues: HarnessIssue[] = []

  if (!args.toolId) {
    issues.push(...makeIssues([{ code: 'missing_tool', message: '未能识别可执行工具', severity: 'high' }]))
  }
  if (!args.guard.allowed) {
    issues.push(...makeIssues([{ code: 'guard_blocked', message: args.guard.reasons.join('；') || 'Guard 拦截执行', severity: 'high' }]))
  }
  if (args.toolFailed) {
    issues.push(...makeIssues([{ code: 'tool_failed', message: String(args.finalOutput.message || '工具执行失败'), severity: 'medium' }]))
  }
  if (args.guard.requires_approval) {
    issues.push(...makeIssues([{ code: 'approval_required', message: '当前运行涉及高风险动作，需要人工确认', severity: 'medium' }]))
  }

  let verdict: ReviewVerdict = 'approved'
  if (!args.guard.allowed) verdict = 'blocked'
  else if (args.toolFailed || !args.toolId) verdict = 'needs_revision'

  return {
    verdict,
    confidence: verdict === 'approved' ? 0.86 : verdict === 'blocked' ? 0.92 : 0.74,
    risk_level: args.guard.risk_level,
    issues,
    repair_instructions:
      verdict === 'approved'
        ? (args.guard.requires_approval ? '结果已生成，但请先进行人工确认。' : '结果已生成，可继续查看运行记录。')
        : verdict === 'blocked'
          ? '请先解决 Guard 拦截原因，再重新执行。'
          : '请补齐参数或修复失败步骤后重试。',
    human_review_required: args.guard.requires_approval,
  }
}

function persistRunArtifacts(args: {
  run: HarnessRun
  steps: HarnessRunStep[]
  review: HarnessRunReviewRecord
}) {
  const runs = readStore<HarnessRun[]>(STORAGE_KEYS.runs, [])
  const steps = readStore<HarnessRunStep[]>(STORAGE_KEYS.steps, [])
  const reviews = readStore<HarnessRunReviewRecord[]>(STORAGE_KEYS.reviews, [])

  runs.unshift(args.run)
  steps.unshift(...args.steps.slice().reverse())
  reviews.unshift(args.review)

  writeStore(STORAGE_KEYS.runs, runs)
  writeStore(STORAGE_KEYS.steps, steps)
  writeStore(STORAGE_KEYS.reviews, reviews)
}

async function fetchSubOrder(subOrderId: string) {
  const { data, error } = await supabase.from('sub_orders').select('*').eq('id', subOrderId).maybeSingle()
  if (error) throw error
  if (!data) throw new Error('未找到对应子订单')
  return data as SubOrder & Record<string, unknown>
}

async function executeTool(toolId: string, input: Record<string, unknown>, requestedBy?: RequestedBy) {
  switch (toolId) {
    case 'count_buyers': {
      let query = supabase
        .from('erp_buyers')
        .select('id, name, status', { count: 'exact' })

      const status = String(input.status || '').trim()
      if (status) {
        query = query.eq('status', status)
      }

      const { data, error, count } = await query
      if (error) throw error

      return {
        summary: status ? `当前 ${status} 买手共 ${count || 0} 个` : `当前买手共 ${count || 0} 个`,
        result: {
          count: count || 0,
          status: status || '全部',
          sample: (data || []).slice(0, 10),
        },
      }
    }
    case 'list_staff_tasks': {
      const staffId = String(input.staff_id || '').trim()
      if (!staffId) throw new Error('缺少 staff_id')
      let query = supabase
        .from('sub_orders')
        .select('id, sub_order_number, asin, product_name, buyer_name, status, scheduled_date, refund_method, refund_sequence')
        .eq('staff_id', staffId)
        .order('scheduled_date', { ascending: true, nullsFirst: false })
        .limit(Math.max(1, Math.min(100, Number(input.limit || 20))))
      if (input.status) query = query.eq('status', String(input.status))
      const { data, error } = await query
      if (error) throw error
      return {
        summary: `查询到 ${data?.length || 0} 条任务`,
        result: {
          count: data?.length || 0,
          tasks: data || [],
        },
      }
    }
    case 'assign_buyer': {
      const subOrderId = String(input.sub_order_id || '').trim()
      const buyerId = String(input.buyer_id || '').trim()
      if (!subOrderId || !buyerId) throw new Error('缺少 sub_order_id 或 buyer_id')
      const subOrder = await fetchSubOrder(subOrderId)
      const { data: buyer, error: buyerError } = await supabase.from('erp_buyers').select('id, name').eq('id', buyerId).maybeSingle()
      if (buyerError) throw buyerError
      if (!buyer) throw new Error('未找到对应买手')
      const payload = {
        buyer_id: buyer.id,
        buyer_name: buyer.name,
        status: subOrder.status === '待分配' ? '已分配' : subOrder.status,
        buyer_assigned_at: nowIso(),
      }
      const { error } = await supabase.from('sub_orders').update(payload).eq('id', subOrderId)
      if (error) throw error
      return {
        summary: `已为子订单分配买手 ${buyer.name}`,
        result: payload,
      }
    }
    case 'set_refund_method': {
      const subOrderId = String(input.sub_order_id || '').trim()
      const refundMethod = String(input.refund_method || '').trim()
      const refundSequence = String(input.refund_sequence || '').trim()
      if (!subOrderId || !refundMethod || !refundSequence) throw new Error('缺少退款设置参数')
      const payload = {
        refund_method: refundMethod,
        refund_sequence: refundSequence,
      }
      const { error } = await supabase.from('sub_orders').update(payload).eq('id', subOrderId)
      if (error) throw error
      return {
        summary: `已设置退款方式为 ${refundMethod}`,
        result: payload,
      }
    }
    case 'submit_refund_request': {
      const subOrderId = String(input.sub_order_id || '').trim()
      const refundAmountUsd = Number(input.refund_amount_usd)
      if (!subOrderId || !Number.isFinite(refundAmountUsd)) throw new Error('缺少有效退款申请参数')
      const subOrder = await fetchSubOrder(subOrderId)
      const payload = {
        sub_order_id: subOrder.id,
        order_id: subOrder.order_id,
        sub_order_number: subOrder.sub_order_number,
        buyer_name: subOrder.buyer_name || '',
        buyer_paypal_email: String(input.buyer_paypal_email || ''),
        refund_amount: refundAmountUsd,
        refund_amount_usd: refundAmountUsd,
        refund_method: subOrder.refund_method || 'PayPal',
        refund_sequence: subOrder.refund_sequence || '',
        product_name: subOrder.product_name || '',
        product_price: Number(subOrder.product_price || 0),
        asin: subOrder.asin || '',
        store_name: subOrder.store_name || '',
        staff_name: requestedBy?.name || '',
        notes: String(input.notes || ''),
        status: '待处理',
      }
      const { data, error } = await supabase.from('refund_requests').insert(payload).select().maybeSingle()
      if (error) throw error
      return {
        summary: '退款申请已提交',
        result: {
          request_id: data?.id || '',
          ...payload,
        },
      }
    }
    case 'return_sub_order': {
      const subOrderId = String(input.sub_order_id || '').trim()
      const reason = String(input.reason || '').trim()
      const clearBuyer = Boolean(input.clear_buyer ?? true)
      if (!subOrderId || !reason) throw new Error('缺少回转参数')
      const subOrder = await fetchSubOrder(subOrderId)
      const updateData: Record<string, unknown> = {
        status: '待分配',
        staff_id: null,
        staff_name: null,
        return_reason: reason,
        returned_at: nowIso(),
      }
      if (clearBuyer) {
        updateData.buyer_id = null
        updateData.buyer_name = null
        updateData.buyer_assigned_at = null
      }
      const { error } = await supabase.from('sub_orders').update(updateData).eq('id', subOrderId)
      if (error) throw error
      await supabase.from('grab_hall_logs').insert({
        sub_order_id: subOrderId,
        sub_order_number: subOrder.sub_order_number,
        action: '回转',
        from_staff_id: requestedBy?.id || null,
        from_staff_name: requestedBy?.name || '',
        reason,
      })
      return {
        summary: '子订单已回转给管理员',
        result: updateData,
      }
    }
    default:
      throw new Error('当前本地模式不支持该工具')
  }
}

function getDefaultCases(): HarnessCase[] {
  return [
    {
      id: 'local_case_list_staff_tasks',
      case_key: 'local-list-staff-tasks',
      title: '查询业务员任务样例',
      description: '用于演练查询类低风险动作',
      mode: 'tool',
      task_text: '查询某业务员当前任务列表',
      selected_tool_id: 'list_staff_tasks',
      tool_input: { staff_id: '', status: '', limit: 20 },
      expected_tool_ids: ['list_staff_tasks'],
      expected_risk_level: 'low',
      expected_verdict: 'approved',
      is_active: true,
      created_at: nowIso(),
    },
  ]
}

async function runLocalHarness(payload: ExecutePayload) {
  const localCases = readStore<HarnessCase[]>(STORAGE_KEYS.cases, getDefaultCases())
  writeStore(STORAGE_KEYS.cases, localCases)

  const resolvedPayload = payload.case_id
    ? (() => {
        const matched = localCases.find((item) => item.id === payload.case_id)
        if (!matched) throw new Error('未找到本地 case')
        return {
          ...payload,
          task_text: payload.task_text || matched.task_text,
          mode: payload.mode || matched.mode,
          selected_tool_id: payload.selected_tool_id || matched.selected_tool_id,
          tool_input: Object.keys(payload.tool_input || {}).length > 0 ? payload.tool_input : matched.tool_input || {},
        }
      })()
    : payload

  const mode = resolvedPayload.mode || 'tool'
  const selectedToolId = resolvedPayload.selected_tool_id || inferToolFromTask(resolvedPayload.task_text || '')
  const tool = getTool(selectedToolId)
  const guard = buildGuardResult(selectedToolId, resolvedPayload.requested_by)

  const runId = randomId('run')
  const createdAt = nowIso()
  const steps: HarnessRunStep[] = []
  let stepIndex = 1
  let toolFailed = false
  let finalOutput: Record<string, unknown> = {}

  steps.push({
    id: randomId('step'),
    run_id: runId,
    step_index: stepIndex++,
    step_type: 'plan',
    title: '本地规划',
    status: selectedToolId ? 'completed' : 'failed',
    tool_id: selectedToolId,
    output_payload: {
      selected_tool_id: selectedToolId,
      plan_summary: selectedToolId ? `本地模式命中工具 ${selectedToolId}` : '未找到可执行工具',
      executor: 'local',
    },
    created_at: createdAt,
  })

  steps.push({
    id: randomId('step'),
    run_id: runId,
    step_index: stepIndex++,
    step_type: 'guard',
    title: '本地 Guard Check',
    status: guard.allowed ? 'completed' : 'failed',
    tool_id: selectedToolId,
    output_payload: guard,
    error_message: guard.allowed ? '' : guard.reasons.join('；'),
    created_at: createdAt,
  })

  if (guard.allowed && tool) {
    try {
      const result = await executeTool(selectedToolId, resolvedPayload.tool_input || {}, resolvedPayload.requested_by)
      finalOutput = result
      steps.push({
        id: randomId('step'),
        run_id: runId,
        step_index: stepIndex++,
        step_type: 'tool_call',
        title: `执行 ${selectedToolId}`,
        status: 'completed',
        tool_id: selectedToolId,
        input_payload: resolvedPayload.tool_input || {},
        output_payload: result,
        created_at: createdAt,
      })
    } catch (error: any) {
      toolFailed = true
      finalOutput = {
        message: error?.message || '本地工具执行失败',
      }
      steps.push({
        id: randomId('step'),
        run_id: runId,
        step_index: stepIndex++,
        step_type: 'tool_call',
        title: `执行 ${selectedToolId}`,
        status: 'failed',
        tool_id: selectedToolId,
        input_payload: resolvedPayload.tool_input || {},
        output_payload: finalOutput,
        error_message: String(finalOutput.message || ''),
        created_at: createdAt,
      })
    }
  } else {
    finalOutput = {
      message: guard.reasons.join('；') || '未找到可执行工具',
    }
  }

  const review = buildReview({
    toolId: selectedToolId,
    guard,
    toolFailed,
    finalOutput,
  })

  steps.push({
    id: randomId('step'),
    run_id: runId,
    step_index: stepIndex++,
    step_type: 'review',
    title: '本地 Reviewer 审查',
    status: review.verdict === 'blocked' ? 'failed' : 'completed',
    output_payload: {
      verdict: review.verdict,
      confidence: review.confidence,
      risk_level: review.risk_level,
      issues: review.issues,
      repair_instructions: review.repair_instructions,
      human_review_required: review.human_review_required,
    },
    created_at: createdAt,
  })

  const status: HarnessRunStatus =
    review.verdict === 'blocked'
      ? 'blocked'
      : toolFailed
        ? 'failed'
        : review.human_review_required
          ? 'pending_approval'
          : review.verdict === 'needs_revision'
            ? 'needs_revision'
            : 'completed'

  const run: HarnessRun = {
    id: runId,
    case_id: resolvedPayload.case_id || null,
    task_text: resolvedPayload.task_text || '',
    mode,
    status,
    risk_level: review.risk_level,
    review_verdict: review.verdict,
    human_review_required: review.human_review_required,
    requested_by_id: resolvedPayload.requested_by?.id || '',
    requested_by_name: resolvedPayload.requested_by?.name || '',
    requested_by_role: resolvedPayload.requested_by?.role || '',
    selected_tool_id: selectedToolId,
    plan_summary: selectedToolId ? `本地模式执行 ${selectedToolId}` : '本地模式未匹配工具',
    final_output: finalOutput,
    context_keys: ['local_mode'],
    error_message: toolFailed ? String(finalOutput.message || '') : '',
    retry_count: 0,
    started_at: createdAt,
    finished_at: nowIso(),
    created_at: createdAt,
  }

  const reviewRecord: HarnessRunReviewRecord = {
    id: randomId('review'),
    run_id: runId,
    attempt_number: 1,
    verdict: review.verdict,
    confidence: review.confidence,
    risk_level: review.risk_level,
    human_review_required: review.human_review_required,
    issues: review.issues,
    repair_instructions: review.repair_instructions,
    created_at: createdAt,
  }

  persistRunArtifacts({
    run,
    steps,
    review: reviewRecord,
  })

  if (resolvedPayload.case_id) {
    const caseRuns = readStore<HarnessCaseRun[]>(STORAGE_KEYS.caseRuns, [])
    caseRuns.unshift({
      id: randomId('case_run'),
      case_id: resolvedPayload.case_id,
      run_id: runId,
      status,
      verdict: review.verdict,
      passed: review.verdict === 'approved',
      score: review.verdict === 'approved' ? 1 : 0,
      notes: review.repair_instructions,
      created_at: createdAt,
    })
    writeStore(STORAGE_KEYS.caseRuns, caseRuns)
  }

  return {
    run_id: runId,
    status,
    selected_tool_id: selectedToolId,
    review,
    final_output: finalOutput,
    executor: 'local',
  }
}

export async function executeHarness(payload: Record<string, unknown>) {
  return runLocalHarness(payload as ExecutePayload)
}

export async function listHarnessStaffOptions(): Promise<HarnessStaffOption[]> {
  const { data, error } = await supabase
    .from('staff')
    .select('id, name, role, status')
    .in('status', ['在职', '休假'])
    .order('name')

  if (error) throw error

  return (data || []) as HarnessStaffOption[]
}

export async function reviewHarnessRun(runId: string) {
  const detail = await getHarnessRunDetail(runId)
  if (!detail.run) {
    throw new Error('未找到本地运行记录')
  }
  const review = detail.reviews[0]
  return {
    run_id: runId,
    review: review || null,
  }
}

export async function guardCheck(toolId: string, requestedBy?: Record<string, unknown>) {
  return buildGuardResult(toolId, requestedBy as RequestedBy | undefined)
}

export async function listHarnessRuns(limit = 20): Promise<HarnessRun[]> {
  return readStore<HarnessRun[]>(STORAGE_KEYS.runs, []).slice(0, limit)
}

export async function getHarnessRunDetail(runId: string) {
  const runs = readStore<HarnessRun[]>(STORAGE_KEYS.runs, [])
  const steps = readStore<HarnessRunStep[]>(STORAGE_KEYS.steps, [])
  const reviews = readStore<HarnessRunReviewRecord[]>(STORAGE_KEYS.reviews, [])

  return {
    run: (runs.find((item) => item.id === runId) || null) as HarnessRun | null,
    steps: steps.filter((item) => item.run_id === runId).sort((a, b) => a.step_index - b.step_index) as HarnessRunStep[],
    reviews: reviews.filter((item) => item.run_id === runId).sort((a, b) => a.attempt_number - b.attempt_number) as HarnessRunReviewRecord[],
  }
}

export async function listHarnessCases(): Promise<HarnessCase[]> {
  const cases = readStore<HarnessCase[]>(STORAGE_KEYS.cases, getDefaultCases())
  writeStore(STORAGE_KEYS.cases, cases)
  return cases.filter((item) => item.is_active)
}

export async function listHarnessCaseRuns(limit = 30): Promise<HarnessCaseRun[]> {
  return readStore<HarnessCaseRun[]>(STORAGE_KEYS.caseRuns, []).slice(0, limit)
}

export function getToolTemplate(toolId: string) {
  return harnessToolCatalog.find((tool) => tool.id === toolId)?.input_template || {}
}
