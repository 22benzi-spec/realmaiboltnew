import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { buildContext } from '../_shared/harness/context.ts'
import { evaluateGuard } from '../_shared/harness/guard.ts'
import { callJsonModel } from '../_shared/harness/model.ts'
import { buildReview } from '../_shared/harness/review.ts'
import { getToolDefinition, listToolCatalog } from '../_shared/harness/tools.ts'
import type {
  ExecuteHarnessPayload,
  HarnessMode,
  HarnessRunStatus,
  ReviewResult,
  RunStepRecord,
} from '../_shared/harness/types.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function inferToolFromTask(taskText: string) {
  if (taskText.includes('退款') && taskText.includes('申请')) return 'submit_refund_request'
  if (taskText.includes('退款') && (taskText.includes('方式') || taskText.includes('时序') || taskText.includes('渠道'))) {
    return 'set_refund_method'
  }
  if (taskText.includes('回转')) return 'return_sub_order'
  if (taskText.includes('分配') && taskText.includes('买手')) return 'assign_buyer'
  if (taskText.includes('任务') || taskText.includes('列表') || taskText.includes('查询')) return 'list_staff_tasks'
  return ''
}

async function planTool(args: {
  taskText: string
  selectedToolId?: string
  toolInput: Record<string, unknown>
}) {
  if (args.selectedToolId) {
    return {
      selected_tool_id: args.selectedToolId,
      plan_summary: `使用显式指定工具 ${args.selectedToolId}`,
      planner: 'explicit' as const,
    }
  }

  const modelResult = await callJsonModel<{ selected_tool_id: string; plan_summary: string }>([
    {
      role: 'system',
      content: [
        '你是 Harness 的工具规划器。',
        '从候选工具中选择一个最合适的 tool。',
        '仅输出 JSON，字段必须包含 selected_tool_id 和 plan_summary。',
        '如果任务不适合任何工具，selected_tool_id 设为空字符串。',
        'plan_summary 用中文。',
      ].join('\n'),
    },
    {
      role: 'user',
      content: JSON.stringify({
        task_text: args.taskText,
        tool_input: args.toolInput,
        tools: listToolCatalog(),
      }),
    },
  ])

  if (modelResult.ok && modelResult.data) {
    return {
      selected_tool_id: modelResult.data.selected_tool_id || '',
      plan_summary: modelResult.data.plan_summary || '模型已生成执行计划',
      planner: 'ai' as const,
    }
  }

  const toolId = inferToolFromTask(args.taskText)
  return {
    selected_tool_id: toolId,
    plan_summary: toolId ? `启发式命中工具 ${toolId}` : '未匹配到合适工具',
    planner: 'heuristic' as const,
  }
}

async function insertRunStep(supabase: any, runId: string, stepIndex: number, step: RunStepRecord) {
  await supabase.from('harness_run_steps').insert({
    run_id: runId,
    step_index: stepIndex,
    step_type: step.step_type,
    title: step.title,
    status: step.status,
    tool_id: step.tool_id || '',
    input_payload: step.input_payload || {},
    output_payload: step.output_payload || {},
    error_message: step.error_message || '',
  })
}

async function resolveCaseInput(supabase: any, payload: ExecuteHarnessPayload) {
  if (!payload.case_id) return { payload, caseRecord: null }

  const { data: caseRecord, error } = await supabase
    .from('harness_cases')
    .select('*')
    .eq('id', payload.case_id)
    .maybeSingle()
  if (error) throw error
  if (!caseRecord) throw new Error('未找到指定 case')

  return {
    caseRecord,
    payload: {
      ...payload,
      task_text: payload.task_text || caseRecord.task_text,
      mode: (caseRecord.mode as HarnessMode) || payload.mode || 'case',
      selected_tool_id: payload.selected_tool_id || caseRecord.selected_tool_id,
      tool_input: Object.keys(payload.tool_input || {}).length ? payload.tool_input : caseRecord.tool_input || {},
    },
  }
}

function computeRunStatus(review: ReviewResult, stepFailed: boolean): HarnessRunStatus {
  if (review.verdict === 'blocked') return 'blocked'
  if (stepFailed) return 'failed'
  if (review.human_review_required) return 'pending_approval'
  if (review.verdict === 'needs_revision') return 'needs_revision'
  return 'completed'
}

async function writeCaseRun(supabase: any, args: {
  caseRecord: any
  runId: string
  status: HarnessRunStatus
  review: ReviewResult
  selectedToolId: string
}) {
  if (!args.caseRecord) return

  const expectedVerdict = args.caseRecord.expected_verdict || ''
  const expectedRisk = args.caseRecord.expected_risk_level || ''
  const expectedTools: string[] = args.caseRecord.expected_tool_ids || []
  const verdictPass = !expectedVerdict || expectedVerdict === args.review.verdict
  const riskPass = !expectedRisk || expectedRisk === args.review.risk_level
  const toolPass = expectedTools.length === 0 || expectedTools.includes(args.selectedToolId)
  const passed = verdictPass && riskPass && toolPass
  const score = passed ? 1 : 0

  await supabase.from('harness_case_runs').insert({
    case_id: args.caseRecord.id,
    run_id: args.runId,
    status: args.status,
    verdict: args.review.verdict,
    passed,
    score,
    notes: passed ? 'Case expectations matched.' : 'Case expectations not fully matched.',
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: '缺少 SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY' }, 500)
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const rawPayload = (await req.json()) as ExecuteHarnessPayload
    const { payload, caseRecord } = await resolveCaseInput(supabase, rawPayload)
    const mode = payload.mode || (payload.selected_tool_id ? 'tool' : 'agent')
    const requestedBy = payload.requested_by || {}
    const context = buildContext(payload)

    const { data: runRecord, error: runInsertError } = await supabase
      .from('harness_runs')
      .insert({
        case_id: caseRecord?.id || null,
        task_text: payload.task_text || '',
        mode,
        status: 'running',
        risk_level: 'low',
        requested_by_id: requestedBy.id || '',
        requested_by_name: requestedBy.name || '',
        requested_by_role: requestedBy.role || '',
        selected_tool_id: payload.selected_tool_id || '',
        context_keys: context.context_keys,
        started_at: new Date().toISOString(),
      })
      .select()
      .maybeSingle()

    if (runInsertError || !runRecord) throw runInsertError || new Error('创建 run 失败')

    let stepIndex = 1
    let currentTaskText = payload.task_text || ''
    const maxRetries = Math.max(1, Math.min(2, payload.max_retries ?? (mode === 'agent' ? 2 : 1)))
    let finalReview: ReviewResult | null = null
    let finalOutput: Record<string, unknown> = {}
    let selectedToolId = payload.selected_tool_id || ''
    let planSummary = ''
    let stepFailed = false

    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
      const plan = await planTool({
        taskText: currentTaskText,
        selectedToolId: selectedToolId || payload.selected_tool_id,
        toolInput: payload.tool_input || {},
      })
      selectedToolId = plan.selected_tool_id
      planSummary = plan.plan_summary

      await insertRunStep(supabase, runRecord.id, stepIndex++, {
        step_type: 'plan',
        title: `第 ${attempt} 轮规划`,
        status: selectedToolId ? 'completed' : 'failed',
        tool_id: selectedToolId,
        input_payload: { task_text: currentTaskText, tool_input: payload.tool_input || {}, planner: plan.planner },
        output_payload: { selected_tool_id: selectedToolId, plan_summary: plan.plan_summary, context_keys: context.context_keys },
        error_message: selectedToolId ? '' : '未能规划出可执行工具',
      })

      const guard = evaluateGuard({ toolId: selectedToolId, requestedBy })
      await insertRunStep(supabase, runRecord.id, stepIndex++, {
        step_type: 'guard',
        title: `第 ${attempt} 轮 Guard Check`,
        status: guard.allowed ? 'completed' : 'failed',
        tool_id: selectedToolId,
        output_payload: {
          allowed: guard.allowed,
          risk_level: guard.risk_level,
          requires_approval: guard.requires_approval,
          reasons: guard.reasons,
        },
        error_message: guard.allowed ? '' : guard.reasons.join('；'),
      })

      const tool = selectedToolId ? getToolDefinition(selectedToolId) : undefined
      const stepsForReview: RunStepRecord[] = [
        { step_type: 'plan', title: '规划', status: selectedToolId ? 'completed' : 'failed', tool_id: selectedToolId },
        { step_type: 'guard', title: 'Guard', status: guard.allowed ? 'completed' : 'failed', tool_id: selectedToolId },
      ]

      if (!guard.allowed || !tool) {
        finalOutput = {
          message: guard.reasons.join('；') || '未找到可执行工具',
          selected_tool_id: selectedToolId,
        }
      } else {
        try {
          const result = await tool.execute({
            supabase,
            input: payload.tool_input || {},
            requestedBy,
          })
          finalOutput = {
            summary: result.summary,
            result: result.data,
          }
          stepsForReview.push({
            step_type: 'tool_call',
            title: `第 ${attempt} 轮执行 ${tool.id}`,
            status: 'completed',
            tool_id: tool.id,
            input_payload: payload.tool_input || {},
            output_payload: finalOutput,
          })
          await insertRunStep(supabase, runRecord.id, stepIndex++, {
            step_type: 'tool_call',
            title: `第 ${attempt} 轮执行 ${tool.id}`,
            status: 'completed',
            tool_id: tool.id,
            input_payload: payload.tool_input || {},
            output_payload: finalOutput,
          })
          stepFailed = false
        } catch (error) {
          stepFailed = true
          finalOutput = {
            message: error instanceof Error ? error.message : '工具执行失败',
            selected_tool_id: tool.id,
          }
          stepsForReview.push({
            step_type: 'tool_call',
            title: `第 ${attempt} 轮执行 ${tool.id}`,
            status: 'failed',
            tool_id: tool.id,
            input_payload: payload.tool_input || {},
            output_payload: finalOutput,
            error_message: finalOutput.message as string,
          })
          await insertRunStep(supabase, runRecord.id, stepIndex++, {
            step_type: 'tool_call',
            title: `第 ${attempt} 轮执行 ${tool.id}`,
            status: 'failed',
            tool_id: tool.id,
            input_payload: payload.tool_input || {},
            output_payload: finalOutput,
            error_message: finalOutput.message as string,
          })
        }
      }

      finalReview = await buildReview({
        taskText: currentTaskText,
        selectedToolId,
        guard,
        steps: stepsForReview,
        finalOutput,
      })

      await supabase.from('harness_run_reviews').insert({
        run_id: runRecord.id,
        attempt_number: attempt,
        verdict: finalReview.verdict,
        confidence: finalReview.confidence,
        risk_level: finalReview.risk_level,
        human_review_required: finalReview.human_review_required,
        issues: finalReview.issues,
        repair_instructions: finalReview.repair_instructions,
        review_payload: {
          reviewer: finalReview.reviewer,
          final_output: finalOutput,
        },
      })

      await insertRunStep(supabase, runRecord.id, stepIndex++, {
        step_type: 'review',
        title: `第 ${attempt} 轮 Observer 审查`,
        status: finalReview.verdict === 'blocked' ? 'failed' : 'completed',
        output_payload: {
          verdict: finalReview.verdict,
          confidence: finalReview.confidence,
          risk_level: finalReview.risk_level,
          human_review_required: finalReview.human_review_required,
          issues: finalReview.issues,
          repair_instructions: finalReview.repair_instructions,
          reviewer: finalReview.reviewer,
        },
      })

      if (finalReview.verdict !== 'needs_revision' || attempt === maxRetries || mode !== 'agent') {
        break
      }

      currentTaskText = `${payload.task_text || ''}\n\n修正要求：${finalReview.repair_instructions}`
      await insertRunStep(supabase, runRecord.id, stepIndex++, {
        step_type: 'system',
        title: `第 ${attempt} 轮回炉`,
        status: 'completed',
        output_payload: {
          message: '根据 Observer 建议准备重试',
          repair_instructions: finalReview.repair_instructions,
        },
      })
    }

    if (!finalReview) {
      throw new Error('未生成审查结果')
    }

    const finalStatus = computeRunStatus(finalReview, stepFailed)

    await supabase
      .from('harness_runs')
      .update({
        status: finalStatus,
        risk_level: finalReview.risk_level,
        review_verdict: finalReview.verdict,
        human_review_required: finalReview.human_review_required,
        selected_tool_id: selectedToolId,
        plan_summary: planSummary,
        final_output: finalOutput,
        retry_count: maxRetries - 1,
        error_message: finalStatus === 'failed' ? String(finalOutput.message || '执行失败') : '',
        finished_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', runRecord.id)

    await writeCaseRun(supabase, {
      caseRecord,
      runId: runRecord.id,
      status: finalStatus,
      review: finalReview,
      selectedToolId,
    })

    return jsonResponse({
      run_id: runRecord.id,
      status: finalStatus,
      selected_tool_id: selectedToolId,
      review: finalReview,
      final_output: finalOutput,
      context_keys: context.context_keys,
    })
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'execute-harness failed unexpectedly' },
      500
    )
  }
})
