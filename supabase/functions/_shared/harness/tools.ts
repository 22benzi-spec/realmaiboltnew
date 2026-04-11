import type { RequestedBy, ToolDefinition } from './types.ts'

function asString(value: unknown, field: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`缺少有效参数: ${field}`)
  }
  return value.trim()
}

function asOptionalString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function asNumber(value: unknown, field: string) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    throw new Error(`缺少有效数值参数: ${field}`)
  }
  return numeric
}

function normalizeRefundSequence(raw: string) {
  if (raw === '先退款后给单号') return '先退款后给单'
  if (raw === '先给单号后退款') return '先给单后退款'
  return raw
}

async function fetchSubOrder(supabase: any, subOrderId: string) {
  const { data, error } = await supabase
    .from('sub_orders')
    .select('*')
    .eq('id', subOrderId)
    .maybeSingle()
  if (error) throw error
  if (!data) throw new Error('未找到对应子订单')
  return data
}

async function listStaffTasksExecute(args: { supabase: any; input: Record<string, unknown> }) {
  const staffId = asString(args.input.staff_id, 'staff_id')
  const status = asOptionalString(args.input.status)
  const limit = Math.max(1, Math.min(100, Number(args.input.limit || 20)))

  let query = args.supabase
    .from('sub_orders')
    .select('id, sub_order_number, asin, product_name, buyer_name, status, scheduled_date, refund_method, refund_sequence')
    .eq('staff_id', staffId)
    .order('scheduled_date', { ascending: true, nullsFirst: false })
    .limit(limit)

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) throw error

  return {
    summary: `查询到 ${data?.length || 0} 条任务`,
    data: {
      count: data?.length || 0,
      tasks: data || [],
    },
  }
}

async function assignBuyerExecute(args: {
  supabase: any
  input: Record<string, unknown>
  requestedBy?: RequestedBy
}) {
  const subOrderId = asString(args.input.sub_order_id, 'sub_order_id')
  const buyerId = asString(args.input.buyer_id, 'buyer_id')
  const operatorName = asOptionalString(args.input.operator_name) || args.requestedBy?.name || ''

  const subOrder = await fetchSubOrder(args.supabase, subOrderId)
  const { data: buyer, error: buyerError } = await args.supabase
    .from('erp_buyers')
    .select('id, name')
    .eq('id', buyerId)
    .maybeSingle()
  if (buyerError) throw buyerError
  if (!buyer) throw new Error('未找到对应买手')

  const payload = {
    buyer_id: buyer.id,
    buyer_name: buyer.name,
    status: subOrder.status === '待分配' ? '已分配' : subOrder.status,
    buyer_assigned_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const { error } = await args.supabase.from('sub_orders').update(payload).eq('id', subOrderId)
  if (error) throw error

  return {
    summary: `已为子订单分配买手 ${buyer.name}`,
    data: {
      sub_order_id: subOrderId,
      buyer_id: buyer.id,
      buyer_name: buyer.name,
      operator_name: operatorName,
      status: payload.status,
    },
  }
}

async function setRefundMethodExecute(args: { supabase: any; input: Record<string, unknown> }) {
  const subOrderId = asString(args.input.sub_order_id, 'sub_order_id')
  const refundMethod = asString(args.input.refund_method, 'refund_method')
  const refundSequence = normalizeRefundSequence(asString(args.input.refund_sequence, 'refund_sequence'))

  if (!['礼品卡', 'PayPal'].includes(refundMethod)) {
    throw new Error('refund_method 仅支持 礼品卡 或 PayPal')
  }

  const payload = {
    refund_method: refundMethod,
    refund_sequence: refundSequence,
    updated_at: new Date().toISOString(),
  }
  const { error } = await args.supabase.from('sub_orders').update(payload).eq('id', subOrderId)
  if (error) throw error

  return {
    summary: `已设置退款方式为 ${refundMethod}`,
    data: {
      sub_order_id: subOrderId,
      refund_method: refundMethod,
      refund_sequence: refundSequence,
    },
  }
}

async function submitRefundRequestExecute(args: {
  supabase: any
  input: Record<string, unknown>
  requestedBy?: RequestedBy
}) {
  const subOrderId = asString(args.input.sub_order_id, 'sub_order_id')
  const refundAmountUsd = asNumber(args.input.refund_amount_usd, 'refund_amount_usd')
  const notes = asOptionalString(args.input.notes)
  const buyerPaypalEmail = asOptionalString(args.input.buyer_paypal_email)
  const subOrder = await fetchSubOrder(args.supabase, subOrderId)

  const payload = {
    sub_order_id: subOrder.id,
    order_id: subOrder.order_id,
    sub_order_number: subOrder.sub_order_number,
    buyer_name: subOrder.buyer_name || '',
    buyer_paypal_email: buyerPaypalEmail,
    refund_amount: refundAmountUsd,
    refund_amount_usd: refundAmountUsd,
    refund_method: subOrder.refund_method || 'PayPal',
    refund_sequence: subOrder.refund_sequence || '',
    product_name: subOrder.product_name || '',
    product_price: Number(subOrder.product_price || 0),
    asin: subOrder.asin || '',
    store_name: subOrder.store_name || '',
    staff_name: args.requestedBy?.name || '',
    notes,
    status: '待处理',
  }

  const { data, error } = await args.supabase.from('refund_requests').insert(payload).select().maybeSingle()
  if (error) throw error

  return {
    summary: '退款申请已提交',
    data: {
      request_id: data?.id || '',
      sub_order_id: subOrder.id,
      refund_amount_usd: refundAmountUsd,
      refund_method: payload.refund_method,
      status: payload.status,
    },
  }
}

async function returnSubOrderExecute(args: {
  supabase: any
  input: Record<string, unknown>
  requestedBy?: RequestedBy
}) {
  const subOrderId = asString(args.input.sub_order_id, 'sub_order_id')
  const reason = asString(args.input.reason, 'reason')
  const clearBuyer = Boolean(args.input.clear_buyer ?? true)
  const operatorId = asOptionalString(args.input.operator_id) || args.requestedBy?.id || ''
  const operatorName = asOptionalString(args.input.operator_name) || args.requestedBy?.name || ''
  const updateData: Record<string, unknown> = {
    status: '待分配',
    staff_id: null,
    staff_name: null,
    return_reason: reason,
    returned_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  if (clearBuyer) {
    updateData.buyer_id = null
    updateData.buyer_name = null
    updateData.buyer_assigned_at = null
  }

  const subOrder = await fetchSubOrder(args.supabase, subOrderId)
  const { error } = await args.supabase.from('sub_orders').update(updateData).eq('id', subOrderId)
  if (error) throw error

  await args.supabase.from('grab_hall_logs').insert({
    sub_order_id: subOrderId,
    sub_order_number: subOrder.sub_order_number,
    action: '回转',
    from_staff_id: operatorId || null,
    from_staff_name: operatorName,
    reason,
  })

  return {
    summary: '子订单已回转给管理员',
    data: {
      sub_order_id: subOrderId,
      clear_buyer: clearBuyer,
      reason,
      operator_name: operatorName,
    },
  }
}

export const toolRegistry: ToolDefinition[] = [
  {
    id: 'list_staff_tasks',
    description_zh: '查询某业务员当前任务列表',
    risk_level: 'low',
    requires_approval: false,
    allowed_roles: ['业务员', '商务', '财务', '管理员'],
    side_effects: false,
    input_schema: {
      type: 'object',
      required: ['staff_id'],
      properties: {
        staff_id: { type: 'string', description: '业务员 ID' },
        status: { type: 'string', description: '可选状态过滤' },
        limit: { type: 'number', description: '返回条数，默认 20' },
      },
    },
    execute: listStaffTasksExecute,
  },
  {
    id: 'assign_buyer',
    description_zh: '给子订单分配买手',
    risk_level: 'medium',
    requires_approval: false,
    allowed_roles: ['业务员', '管理员'],
    side_effects: true,
    input_schema: {
      type: 'object',
      required: ['sub_order_id', 'buyer_id'],
      properties: {
        sub_order_id: { type: 'string' },
        buyer_id: { type: 'string' },
        operator_name: { type: 'string' },
      },
    },
    execute: assignBuyerExecute,
  },
  {
    id: 'set_refund_method',
    description_zh: '设置退款方式和退款时序',
    risk_level: 'medium',
    requires_approval: false,
    allowed_roles: ['业务员', '管理员'],
    side_effects: true,
    input_schema: {
      type: 'object',
      required: ['sub_order_id', 'refund_method', 'refund_sequence'],
      properties: {
        sub_order_id: { type: 'string' },
        refund_method: { type: 'string', enum: ['礼品卡', 'PayPal'] },
        refund_sequence: { type: 'string' },
      },
    },
    execute: setRefundMethodExecute,
  },
  {
    id: 'submit_refund_request',
    description_zh: '向财务提交退款申请',
    risk_level: 'high',
    requires_approval: true,
    allowed_roles: ['业务员', '管理员'],
    side_effects: true,
    input_schema: {
      type: 'object',
      required: ['sub_order_id', 'refund_amount_usd'],
      properties: {
        sub_order_id: { type: 'string' },
        refund_amount_usd: { type: 'number' },
        notes: { type: 'string' },
        buyer_paypal_email: { type: 'string' },
      },
    },
    execute: submitRefundRequestExecute,
  },
  {
    id: 'return_sub_order',
    description_zh: '把子订单回转给管理员',
    risk_level: 'high',
    requires_approval: true,
    allowed_roles: ['业务员', '管理员'],
    side_effects: true,
    input_schema: {
      type: 'object',
      required: ['sub_order_id', 'reason'],
      properties: {
        sub_order_id: { type: 'string' },
        reason: { type: 'string' },
        clear_buyer: { type: 'boolean' },
        operator_id: { type: 'string' },
        operator_name: { type: 'string' },
      },
    },
    execute: returnSubOrderExecute,
  },
]

export function getToolDefinition(toolId: string) {
  return toolRegistry.find((tool) => tool.id === toolId)
}

export function listToolCatalog() {
  return toolRegistry.map((tool) => ({
    id: tool.id,
    description_zh: tool.description_zh,
    risk_level: tool.risk_level,
    requires_approval: tool.requires_approval,
    allowed_roles: tool.allowed_roles,
    side_effects: tool.side_effects,
    input_schema: tool.input_schema,
  }))
}
