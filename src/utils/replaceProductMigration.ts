export type ReplaceProductMigrationOptions = {
  supabase: any
  sourceSubOrder: any
  targetSubOrderKey: string
  sourceContinue?: boolean
  operatorName?: string
  note?: string
  targetActualPaid?: number
  targetRefundMethod?: string
  targetRefundAmount?: number
  targetPaypalFee?: number
  targetPaypalEmail?: string
}

export type ReplaceProductLookupResult = {
  subOrder: any
  order: any
}

const CLOSED_TASK_STATUSES = ['已完成', '已完结', '已截单']
const SOURCE_CANCEL_STATUS = '已取消'
const SOURCE_REOPEN_STATUS = '待分配'
const RUNNING_TASK_STATUS = '进行中'
const CUTOFF_TASK_STATUS = '已截单'
const TARGET_DONE_STATUS = '已完成'
const DONE_SUB_STATUSES = ['已完成', '已留评']
const TERMINAL_SUB_STATUSES = ['已完成', '已留评', '已取消', '已退款', '不下单', '无此订单', '已掉评', '无法完成']

function text(value: any) {
  return String(value || '').trim()
}

function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function normalizeMainTaskStatus(status: any) {
  const raw = text(status)
  return raw === '暂停中' ? '已暂停' : raw
}

export function isClosedMainTaskStatus(status: any) {
  return CLOSED_TASK_STATUSES.includes(normalizeMainTaskStatus(status))
}

export function needsSourceContinueDecision(status: any) {
  return isClosedMainTaskStatus(status)
}

export function canUseTargetSubOrder(target: any, sourceId?: string) {
  if (!target?.id) return { ok: false, reason: '未找到目标子订单' }
  if (sourceId && target.id === sourceId) return { ok: false, reason: '不能迁移到当前子订单本身' }
  if (target.amazon_order_id) return { ok: false, reason: '目标子订单已经填写 Amazon 订单号，不能作为更换目标' }
  if (target.review_screenshot_url || target.review_link || target.fb_image_url || target.fb_link) {
    return { ok: false, reason: '目标子订单已经有留评或 Feedback 凭证，不能作为更换目标' }
  }
  if (target.buyer_id || text(target.buyer_name)) return { ok: false, reason: '目标子订单已经分配买手，请让商务提供未开始的子订单ID' }
  if (['已完成', '已取消', '已退款', '已掉评', '无法完成'].includes(text(target.status))) {
    return { ok: false, reason: '目标子订单已处于终态，不能作为更换目标' }
  }
  return { ok: true, reason: '' }
}

export async function lookupReplaceProductTarget(supabase: any, key: string): Promise<ReplaceProductLookupResult> {
  const normalizedKey = text(key)
  if (!normalizedKey) throw new Error('请先填写目标子订单ID')

  let query = supabase.from('sub_orders').select('*')
  query = isUuidLike(normalizedKey) ? query.eq('id', normalizedKey) : query.eq('sub_order_number', normalizedKey)
  const { data: subOrder, error } = await query.maybeSingle()
  if (error) throw error
  if (!subOrder) throw new Error('未找到目标子订单，请核对商务提供的子订单ID')

  const { data: order, error: orderError } = await supabase
    .from('erp_orders')
    .select('*')
    .eq('id', subOrder.order_id)
    .maybeSingle()
  if (orderError) throw orderError

  return { subOrder, order }
}

function buildTargetOperationalPayload(source: any, target: any, options: ReplaceProductMigrationOptions) {
  const nextStatus = text(source.status) && text(source.status) !== '待分配'
    ? source.status
    : (source.buyer_id || text(source.buyer_name) ? '已分配' : (target.status || '待分配'))
  const targetActualPaid = Number(options.targetActualPaid || 0)
  const targetRefundMethod = text(options.targetRefundMethod) || source.refund_method || ''

  return {
    staff_id: source.staff_id || null,
    staff_name: source.staff_name || '',
    buyer_id: source.buyer_id || null,
    buyer_name: source.buyer_name || '',
    buyer_assigned_at: source.buyer_assigned_at || null,
    buyer_paypal_email: source.buyer_paypal_email || '',
    refund_sequence: source.refund_sequence || '',
    refund_method: targetRefundMethod,
    refund_status: source.refund_status || '未返款',
    refund_amount: Number(source.refund_amount || 0),
    refund_date: source.refund_date || null,
    actual_paid: targetActualPaid || Number(source.actual_paid || source.actual_paid_usd || 0),
    status: nextStatus,
    notes: [target.notes, source.notes ? `原子订单备注：${source.notes}` : '', `由 ${source.sub_order_number || source.id} 更换产品迁移而来`]
      .filter(Boolean)
      .join('；'),
  }
}

function buildSourceContinuePayload(source: any, target: any, note: string) {
  return {
    status: source.staff_id ? '已分配' : SOURCE_REOPEN_STATUS,
    cancel_reason: null,
    staff_id: source.staff_id || null,
    staff_name: source.staff_name || '',
    buyer_id: null,
    buyer_name: '',
    buyer_assigned_at: null,
    buyer_paypal_email: '',
    amazon_order_id: '',
    amazon_order_placed_at: null,
    refund_sequence: '',
    refund_method: '',
    refund_status: '未返款',
    refund_amount: 0,
    refund_date: null,
    actual_paid: 0,
    review_link: '',
    review_screenshot_url: '',
    fb_link: '',
    fb_image_url: '',
    review_submitted_at: null,
    notes: [`更换产品后原产品继续补做，原执行记录已迁移至 ${target.sub_order_number || target.id}`, note].filter(Boolean).join('；'),
  }
}

function buildSourceClosePayload(source: any, target: any, note: string) {
  return {
    status: SOURCE_CANCEL_STATUS,
    cancel_reason: `已迁移到新子订单 ${target.sub_order_number || target.id}`,
    buyer_id: null,
    buyer_name: '',
    buyer_assigned_at: null,
    buyer_paypal_email: '',
    refund_sequence: '',
    refund_method: '',
    refund_status: '无需返款',
    refund_amount: 0,
    refund_date: null,
    actual_paid: 0,
    notes: [source.notes, `已迁移到新子订单 ${target.sub_order_number || target.id}`, note].filter(Boolean).join('；'),
  }
}

function isTargetOrderComplete(subOrders: any[]) {
  const rows = subOrders || []
  if (!rows.length) return false
  return rows.every(row => TERMINAL_SUB_STATUSES.includes(text(row.status)))
    && rows.some(row => DONE_SUB_STATUSES.includes(text(row.status)))
}

async function syncTargetOrderStatusAfterMigration(supabase: any, targetOrderId: string) {
  if (!targetOrderId) return
  const { data, error } = await supabase
    .from('sub_orders')
    .select('id, status')
    .eq('order_id', targetOrderId)
  if (error) throw error
  if (!isTargetOrderComplete(data || [])) return
  const { error: updateError } = await supabase
    .from('erp_orders')
    .update({ status: TARGET_DONE_STATUS, status_reason: null })
    .eq('id', targetOrderId)
  if (updateError) throw updateError
}

function sumProcessedRefundAmount(rows: any[]) {
  return (rows || [])
    .filter(row => row.status === '已处理')
    .reduce((sum, row) => sum + Number(row.refund_amount_usd || row.refund_amount || 0), 0)
}

async function insertTargetRefundDeltaRequest(params: {
  supabase: any
  sourceSubOrder: any
  targetSubOrder: any
  targetOrderId: string
  sourceRefundRequests: any[]
  targetActualPaid: number
  targetRefundMethod: string
  targetRefundAmount: number
  targetPaypalFee: number
  targetPaypalEmail: string
  operatorName: string
  note: string
}) {
  const {
    supabase,
    sourceSubOrder,
    targetSubOrder,
    targetOrderId,
    sourceRefundRequests,
    targetActualPaid,
    targetRefundMethod,
    targetRefundAmount,
    targetPaypalFee,
    targetPaypalEmail,
    operatorName,
    note,
  } = params
  const actualPaid = Number(targetActualPaid || 0)
  const paypalFee = targetRefundMethod === 'PayPal' ? Number(targetPaypalFee || 0) : 0
  const desiredRefundAmount = targetRefundMethod === 'PayPal'
    ? Number((actualPaid + paypalFee).toFixed(2))
    : Number(targetRefundAmount || actualPaid || 0)
  const processedTotal = sumProcessedRefundAmount(sourceRefundRequests)
  if (desiredRefundAmount <= 0 || desiredRefundAmount <= processedTotal) return null

  const delta = Number((desiredRefundAmount - processedTotal).toFixed(2))
  const requestType = processedTotal > 0 ? 'supplement' : 'initial'
  const { data, error } = await supabase
    .from('refund_requests')
    .insert({
      sub_order_id: targetSubOrder.id,
      order_id: targetOrderId,
      sub_order_number: targetSubOrder.sub_order_number || '',
      buyer_name: sourceSubOrder.buyer_name || '',
      buyer_paypal_email: targetRefundMethod === 'PayPal' ? targetPaypalEmail : '',
      status: '待处理',
      request_type: requestType,
      supplement_reason: requestType === 'supplement' ? '更换产品实付差额' : '',
      refund_method: targetRefundMethod || sourceSubOrder.refund_method || '礼品卡',
      refund_sequence: sourceSubOrder.refund_sequence || '预付',
      refund_amount_usd: delta,
      refund_amount: delta,
      gift_card_face_value_usd: targetRefundMethod === '礼品卡' ? delta : 0,
      actual_paid_usd: actualPaid,
      paypal_fee_usd: targetRefundMethod === 'PayPal' ? paypalFee : 0,
      product_name: targetSubOrder.product_name || '',
      product_price: targetSubOrder.product_price || 0,
      asin: targetSubOrder.asin || '',
      store_name: targetSubOrder.store_name || '',
      staff_name: operatorName,
      notes: [`更换产品后目标子单合计应返 $${desiredRefundAmount.toFixed(2)}，已返 $${processedTotal.toFixed(2)}，申请差额 $${delta.toFixed(2)}`, note].filter(Boolean).join('；'),
    })
    .select()
    .maybeSingle()
  if (error) throw error
  return data
}

export async function migrateSubOrderToReplacement(options: ReplaceProductMigrationOptions) {
  const { supabase, sourceSubOrder, targetSubOrderKey } = options
  const sourceId = sourceSubOrder?.id
  if (!sourceId) throw new Error('缺少当前子订单信息')

  const [{ data: sourceOrder, error: sourceOrderError }, targetResult] = await Promise.all([
    supabase.from('erp_orders').select('*').eq('id', sourceSubOrder.order_id).maybeSingle(),
    lookupReplaceProductTarget(supabase, targetSubOrderKey),
  ])
  if (sourceOrderError) throw sourceOrderError

  const targetSubOrder = targetResult.subOrder
  const targetOrder = targetResult.order
  const targetValidation = canUseTargetSubOrder(targetSubOrder, sourceId)
  if (!targetValidation.ok) throw new Error(targetValidation.reason)
  if (!targetSubOrder.order_id || targetSubOrder.order_id === sourceSubOrder.order_id) {
    throw new Error('目标子订单必须属于另一个产品主任务')
  }

  const sourceStatus = normalizeMainTaskStatus(sourceOrder?.status || sourceSubOrder._order_status)
  if (needsSourceContinueDecision(sourceStatus) && typeof options.sourceContinue !== 'boolean') {
    throw new Error('原产品已完成或已截单，请记录商务确认是否继续补做少掉的这一单')
  }

  const operatorName = text(options.operatorName) || '业务员'
  const note = text(options.note)
  const nowIso = new Date().toISOString()
  const targetActualPaid = Number(options.targetActualPaid || 0)
  const targetRefundMethod = text(options.targetRefundMethod) || sourceSubOrder.refund_method || '礼品卡'
  const targetPaypalFee = Number(options.targetPaypalFee || 0)
  const targetPaypalEmail = text(options.targetPaypalEmail || sourceSubOrder.buyer_paypal_email || '')
  const targetRefundAmount = targetRefundMethod === 'PayPal'
    ? Number((targetActualPaid + targetPaypalFee).toFixed(2))
    : Number(options.targetRefundAmount || targetActualPaid || 0)
  const { data: sourceRefundRequests, error: refundLoadError } = await supabase
    .from('refund_requests')
    .select('*')
    .eq('sub_order_id', sourceId)
  if (refundLoadError) throw refundLoadError
  const shouldKeepSourceDoing = options.sourceContinue === true
  const sourcePayload = shouldKeepSourceDoing
    ? buildSourceContinuePayload(sourceSubOrder, targetSubOrder, note)
    : buildSourceClosePayload(sourceSubOrder, targetSubOrder, note)
  const targetPayload = buildTargetOperationalPayload(sourceSubOrder, targetSubOrder, options)

  const { data: updatedTarget, error: targetUpdateError } = await supabase
    .from('sub_orders')
    .update(targetPayload)
    .eq('id', targetSubOrder.id)
    .select()
    .maybeSingle()
  if (targetUpdateError) throw targetUpdateError

  const { data: updatedSource, error: sourceUpdateError } = await supabase
    .from('sub_orders')
    .update(sourcePayload)
    .eq('id', sourceId)
    .select()
    .maybeSingle()
  if (sourceUpdateError) throw sourceUpdateError

  const { error: refundMoveError } = await supabase
    .from('refund_requests')
    .update({
      sub_order_id: targetSubOrder.id,
      order_id: targetSubOrder.order_id,
      sub_order_number: targetSubOrder.sub_order_number || '',
    })
    .eq('sub_order_id', sourceId)
  if (refundMoveError) throw refundMoveError

  const createdRefundRequest = await insertTargetRefundDeltaRequest({
    supabase,
    sourceSubOrder,
    targetSubOrder,
    targetOrderId: targetSubOrder.order_id,
    sourceRefundRequests: sourceRefundRequests || [],
    targetActualPaid,
    targetRefundMethod,
    targetRefundAmount,
    targetPaypalFee,
    targetPaypalEmail,
    operatorName,
    note,
  })

  if (sourceOrder?.id && needsSourceContinueDecision(sourceStatus)) {
    const sourceOrderPayload = options.sourceContinue
      ? { status: RUNNING_TASK_STATUS, status_reason: null }
      : { status: CUTOFF_TASK_STATUS, status_reason: '更换产品后少一单，商务确认不再补做' }
    const { error } = await supabase.from('erp_orders').update(sourceOrderPayload).eq('id', sourceOrder.id)
    if (error) throw error
  }

  await syncTargetOrderStatusAfterMigration(supabase, targetSubOrder.order_id)

  return {
    sourceOrder,
    targetOrder,
    sourceSubOrder: updatedSource || { ...sourceSubOrder, ...sourcePayload },
    targetSubOrder: updatedTarget || { ...targetSubOrder, ...targetPayload },
    createdRefundRequest,
    migratedAt: nowIso,
    operatorName,
  }
}
