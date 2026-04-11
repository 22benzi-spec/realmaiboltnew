import type { ExecuteHarnessPayload } from './types.ts'

export interface ResolvedContext {
  context_keys: string[]
  system_brief: string
  task_brief: string
}

function detectTaskKeys(payload: ExecuteHarnessPayload) {
  const text = (payload.task_text || '').toLowerCase()
  const keys = ['agnts_entry']

  if (payload.selected_tool_id) keys.push(`tool:${payload.selected_tool_id}`)
  if (text.includes('买手') || text.includes('buyer')) keys.push('business:buyer')
  if (text.includes('退款') || text.includes('refund')) keys.push('business:refund')
  if (text.includes('回转') || text.includes('return')) keys.push('business:return')
  if (text.includes('任务') || text.includes('task')) keys.push('business:task')
  if (payload.case_id) keys.push('eval:case')

  return [...new Set(keys)]
}

export function buildContext(payload: ExecuteHarnessPayload): ResolvedContext {
  const contextKeys = detectTaskKeys(payload)
  const taskBrief = payload.task_text?.trim() || '未提供任务描述'

  return {
    context_keys: contextKeys,
    system_brief: [
      '你是 ERP Harness 的执行器。',
      '优先选择受控工具，不直接自由推断数据库写入。',
      '对人输出用中文，稳定字段和 tool id 用英文。',
      '如果缺少关键参数，应明确指出并停止高风险动作。',
    ].join('\n'),
    task_brief: taskBrief,
  }
}
