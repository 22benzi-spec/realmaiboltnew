import { getToolDefinition } from './tools.ts'
import type { GuardResult, RequestedBy } from './types.ts'

export function evaluateGuard(args: {
  toolId?: string
  requestedBy?: RequestedBy
}): GuardResult {
  const tool = args.toolId ? getToolDefinition(args.toolId) : undefined

  if (!tool) {
    return {
      allowed: false,
      risk_level: 'high',
      requires_approval: true,
      reasons: ['未匹配到可执行的受控工具'],
    }
  }

  const role = args.requestedBy?.role?.trim()
  const roleAllowed = !role || tool.allowed_roles.includes(role)
  if (!roleAllowed) {
    return {
      allowed: false,
      risk_level: tool.risk_level,
      requires_approval: tool.requires_approval,
      reasons: [`当前角色 ${role} 无权调用 ${tool.id}`],
    }
  }

  return {
    allowed: true,
    risk_level: tool.risk_level,
    requires_approval: tool.requires_approval,
    reasons: tool.requires_approval ? ['高风险动作，需人工审批'] : [],
  }
}
