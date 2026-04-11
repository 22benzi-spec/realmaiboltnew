import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { buildReview } from '../_shared/harness/review.ts'
import type { RunStepRecord } from '../_shared/harness/types.ts'

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: '缺少 Supabase 服务端环境变量' }, 500)
    }

    const { run_id } = await req.json()
    if (!run_id) return jsonResponse({ error: '缺少 run_id' }, 400)

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const { data: runRecord, error: runError } = await supabase
      .from('harness_runs')
      .select('*')
      .eq('id', run_id)
      .maybeSingle()
    if (runError) throw runError
    if (!runRecord) return jsonResponse({ error: '未找到对应 run' }, 404)

    const { data: stepRecords, error: stepError } = await supabase
      .from('harness_run_steps')
      .select('*')
      .eq('run_id', run_id)
      .order('step_index', { ascending: true })
    if (stepError) throw stepError

    const guardStep = (stepRecords || []).find((step: any) => step.step_type === 'guard')
    const stepsForReview: RunStepRecord[] = (stepRecords || []).map((step: any) => ({
      step_type: step.step_type,
      title: step.title,
      status: step.status,
      tool_id: step.tool_id,
      input_payload: step.input_payload,
      output_payload: step.output_payload,
      error_message: step.error_message,
    }))

    const review = await buildReview({
      taskText: runRecord.task_text,
      selectedToolId: runRecord.selected_tool_id,
      guard: {
        allowed: guardStep?.status === 'completed',
        risk_level: guardStep?.output_payload?.risk_level || runRecord.risk_level || 'low',
        requires_approval: Boolean(guardStep?.output_payload?.requires_approval || runRecord.human_review_required),
        reasons: guardStep?.output_payload?.reasons || [],
      },
      steps: stepsForReview,
      finalOutput: runRecord.final_output || {},
    })

    const { data: reviewRecord, error: reviewError } = await supabase
      .from('harness_run_reviews')
      .insert({
        run_id,
        attempt_number: (stepRecords?.length || 0) + 1,
        verdict: review.verdict,
        confidence: review.confidence,
        risk_level: review.risk_level,
        human_review_required: review.human_review_required,
        issues: review.issues,
        repair_instructions: review.repair_instructions,
        review_payload: {
          reviewer: review.reviewer,
          rerun: true,
        },
      })
      .select()
      .maybeSingle()
    if (reviewError) throw reviewError

    await supabase
      .from('harness_runs')
      .update({
        review_verdict: review.verdict,
        human_review_required: review.human_review_required,
        risk_level: review.risk_level,
        updated_at: new Date().toISOString(),
      })
      .eq('id', run_id)

    return jsonResponse({
      run_id,
      review,
      review_record: reviewRecord,
    })
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'review-harness-run failed' }, 500)
  }
})
