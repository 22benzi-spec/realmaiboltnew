import dayjs from 'dayjs'
import { formatReviewLevelText } from './reviewLevel'
import { generateMockOrders } from './mockData'
import { getPrototypeSubmissions } from '../../components/create-task/dataSource'
import type { ApiResponse, ReceiveListParams, ReceiveFeedbackSavePayload, ReceiveBillStatusPayload, ReceiveBillRecordPayload } from './types'
export type { ReceiveListItem, ReceiveStatisticsData } from './types'
export { normalizeReceiveEmployeeIds } from './types'

// These are local prototype records and option IDs, not a remote API contract.
const countries = ['美国', '德国', '英国', '加拿大'].map((country, index) => ({ id: index + 1, country, country_code: ['US', 'DE', 'UK', 'CA'][index] }))
const reviewTypes: Record<string, string> = { free_review: '免评', words: '文字', image: '图片', video: '视频', feedback: 'Feedback' }
const statusNames = ['', '待分配', '进行中', '已完成', '已暂停', '已截单']
const basicNames = ['', '已完成', '未完成', '富余']
const paymentNames = ['', '无异常', '有欠款', '有余款', '已结清']
const reviewKey = (label: string) => ({ '免评': 'free_review', '文字评': 'words', '文字': 'words', '图片评': 'image', '视频评': 'video', Feedback: 'feedback' }[label] || 'words')
const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0
const money = (value: unknown) => number(value).toFixed(2)
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value))
interface PrototypeState { orders: any[]; imported: string[]; deleted: number[]; operations: any[]; nextId: number }

function seedState(): PrototypeState {
  const orders = generateMockOrders().map((source, index) => {
    const country = countries.find(item => item.country === source.country)!
    const mixed = index % 4 === 1
    const groupId = index < 12 ? Math.floor(index / 3) + 1 : index + 1
    const quantity = source.order_quantity
    const types = source.order_types.map(reviewKey)
    const quantities = Object.fromEntries(types.map((type: string, i: number) => [type, source.type_quantities?.[source.order_types[i]] ?? (i === 0 ? quantity : 0)]))
    const cny = mixed ? source.commission_fee * quantity : number(source.total_amount)
    const usd = mixed ? number(source.product_price) * quantity : 0
    const payment = index % 4 === 0 ? 2 : index % 4 === 1 ? 3 : index % 4 === 2 ? 4 : 1
    const difference = payment === 2 ? 120 : payment === 3 ? 60 : 0
    const received = Math.max(0, cny + (payment === 2 ? -difference : payment === 3 ? difference : 0))
    const basic = { id: groupId, task_basics_no: `TASK_BASIC-2026-${String(groupId).padStart(4, '0')}`, total_task: index < 12 ? 3 : 1,
      payment_mode: mixed ? 'mixed' : 'pure_cny', actual_cny_amount: money(received), actual_usd_amount: money(usd),
      customer_name: source.customer_name, employee_name: `原型客户${index % 5 + 1}`, country, country_id: country.id,
      business_remark: source.notes, created_at: source.created_at }
    const bill = { id: index + 1, task_id: index + 1, basic_bill_status: index % 3 === 0 ? 2 : 1,
      payment_status: payment, payment_status_label: paymentNames[payment], arrears_amount: money(difference), arrears_usd_amount: 0,
      marked_business: source.sales_person, remark: source.debt_notes }
    return { id: index + 1, task_no: source.order_number, task_basic_id: groupId, task_basic: basic,
      product: { id: index + 1, asin: source.asin, product_name: source.product_name, product_images: source.product_image,
        store_name: source.store_name, brand_name: source.brand_name, category: '原型产品' }, country, country_id: country.id,
      customer: { id: 100 + index % 5, customer_no: `C${index % 5 + 1}`, name: source.customer_name, feedback_type: source.feedback_channel === '群组' ? 'group_chat' : 'private_chat', group_chat_name: source.group_name },
      employee: { id: 1001 + index % 5, name: `原型客户${index % 5 + 1}`, employee_no: `E${index % 5 + 1}` }, employee_id: 1001 + index % 5,
      creator: { id: 2001 + index % 5, real_name: source.sales_person, wechat_nickname: `${source.sales_person}商务`, wechat_account: `prototype_${index % 5 + 1}` }, order_clerk_id: 2001 + index % 5,
      status: (index % 5) + 1, status_label: statusNames[(index % 5) + 1], review_level: index % 3 + 1,
      review_level_label: ['普通测评', '高等测评', '极高等测评'][index % 3], review_quantity_summary: quantities, review_types: types,
      total_order_quantity: quantity, product_price: source.product_price, exchange_rate: source.exchange_rate, usd_buy_rate: '7.25',
      base_receivable_amount: cny, actual_receivable_amount: money(cny), task_cny_amount: money(cny), task_usd_amount: money(usd),
      total_commission: { task_cny_commission: source.commission_fee * quantity, task_usd_commission: 0 },
      commission_rates: Object.fromEntries(types.map((type: string) => [type, source.commission_fee])),
      buyer_commission_quantity: 0, buyer_commission_usd: '0', service_commission_cny: '0',
      star_rating: '4.5', rating_count: 128, certificate_label: '不需要', variant_mode_label: '无（默认）', task_contact_label: '无特殊关联',
      daily_feedback: 0, bill: [bill], feedback: [{ task_id: index + 1, order_feedback_status: source.order_feedback_status === '已反馈' ? 2 : 1,
        order_feedback_date: source.order_feedback_date || '', comment_feedback_status: source.review_feedback_status === '已反馈' ? 2 : 1,
        comment_feedback_date: source.review_feedback_date || '', remark: source.feedback_notes }],
      business_remark: source.notes, task_remark: source.notes, created_at: source.created_at,
      bill_details: { base_receivable_amount: cny, actual_receivable_amount: cny, income_flow_amount: received,
        offset_amount: 0, refund_amount: 0, settled_amount: received, pending_settlement_diff: payment === 2 ? -difference : difference, bill_record: [] }, transaction_flows: [] }
  })
  // The same task group shares its basic receipt, as it does in the target page.
  for (const row of orders) if (row.id <= 12) row.task_basic = orders.find(item => item.task_basic_id === row.task_basic_id)!.task_basic
  return { orders, imported: [], deleted: [], operations: [], nextId: 10000 }
}
function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('realmai-orders-prototype', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('state')
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}
async function readState(): Promise<PrototypeState> {
  const db = await openDb()
  try { return await new Promise((resolve, reject) => {
    const request = db.transaction('state', 'readonly').objectStore('state').get('current')
    request.onsuccess = () => resolve(request.result || seedState())
    request.onerror = () => reject(request.error)
  }) } finally { db.close() }
}
async function writeState(state: PrototypeState) {
  const db = await openDb()
  try { await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction('state', 'readwrite')
    transaction.objectStore('state').put(copy(state), 'current')
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error || new Error('本地保存已取消'))
  }) } finally { db.close() }
}
async function importCreatedTasks(state: PrototypeState) {
  const submissions = await getPrototypeSubmissions()
  for (const entry of submissions) {
    if (state.imported.includes(entry.id)) continue
    const basicId = state.nextId++
    const basic = { id: basicId, task_basics_no: `TASK_BASIC-${basicId}`, total_task: entry.payload.tasks.length,
      payment_mode: entry.payload.payment_mode, actual_cny_amount: money(entry.payload.actual_cny_amount), actual_usd_amount: money(entry.payload.actual_usd_amount),
      customer_name: entry.snapshot.basic.customer_name, employee_name: entry.snapshot.basic.customer_name, country: countries[0], country_id: 1,
      created_at: entry.createdAt, water_bill_path: entry.payload.water_bill_path, business_remark: entry.payload.business_remark }
    entry.payload.tasks.forEach((task, index) => {
      const raw = entry.snapshot.tasks[entry.snapshot.panes[index].key]
      const country = countries.find(item => item.id === task.country_id) || countries[0]
      const quantity = number(task.total_order_quantity)
      const principal = number(task.product_price) * quantity * number(task.exchange_rate)
      const summary: Record<string, number> = {}
      for (const schedule of task.schedules || []) for (const count of schedule.type_counts) summary[count.review] = (summary[count.review] || 0) + count.schedule_num
      if (!Object.keys(summary).length) summary[task.review_type?.[0] || 'free_review'] = quantity
      const commission = Object.entries(summary).reduce((sum, [type, count]) => sum + count * number(task.commission_rates?.[type]), 0)
      const cny = entry.payload.payment_mode === 'mixed' ? commission + number(task.service_commission_cny) : principal + commission + number(task.service_commission_cny)
      const id = state.nextId++
      state.orders.push({ id, task_no: `TASK-${dayjs(entry.createdAt).format('YYYYMMDDHHmmss')}-${index + 1}`, task_basic_id: basicId, task_basic: copy(basic),
        product: { id, asin: task.asin, product_name: raw.product_name, product_images: task.product_images, store_name: task.store_name, brand_name: task.brand_name, category: task.category },
        ...task, country, country_id: country.id, product_price: String(task.product_price), exchange_rate: String(task.exchange_rate), usd_buy_rate: '7.25',
        customer: { id: entry.payload.employee_id, name: entry.snapshot.basic.customer_name, feedback_type: entry.payload.group_chat_name ? 'group_chat' : 'private_chat', group_chat_name: entry.payload.group_chat_name },
        employee: { id: entry.payload.employee_id, name: entry.snapshot.basic.customer_name, employee_no: String(entry.payload.employee_id) }, employee_id: entry.payload.employee_id,
        creator: { id: 2000, real_name: '管理员' }, order_clerk_id: 2000,
        status: 1, status_label: '待分配', review_quantity_summary: summary, review_types: task.review_type,
        base_receivable_amount: cny, actual_receivable_amount: money(cny), task_cny_amount: money(cny), task_usd_amount: money(number(task.product_price) * quantity),
        total_commission: { task_cny_commission: commission, task_usd_commission: number(task.buyer_commission_usd) * number(task.buyer_commission_quantity) },
        bill: [{ task_id: id, basic_bill_status: entry.payload.account_status, payment_status: 1, arrears_amount: '0', arrears_usd_amount: 0 }],
        feedback: [{ task_id: id, order_feedback_status: 1, comment_feedback_status: 1 }],
        bill_details: { base_receivable_amount: cny, actual_receivable_amount: cny, income_flow_amount: entry.payload.actual_cny_amount / entry.payload.tasks.length,
          offset_amount: 0, refund_amount: 0, settled_amount: entry.payload.actual_cny_amount / entry.payload.tasks.length, pending_settlement_diff: 0, bill_record: [] },
        business_remark: entry.payload.business_remark, created_at: entry.createdAt, _creationSnapshot: raw })
    })
    state.imported.push(entry.id)
  }
}
let queue: Promise<unknown> = Promise.resolve()
function transact<T>(action: (state: PrototypeState) => T | Promise<T>): Promise<T> {
  const job = queue.then(async () => {
    const state = await readState()
    await importCreatedTasks(state)
    for (const row of state.orders) row.base_receivable_amount = number(money(row.base_receivable_amount))
    const result = await action(state)
    await writeState(state)
    return copy(result)
  })
  queue = job.catch(() => undefined)
  return job
}
const ok = <T>(data: T): ApiResponse<T> => ({ code: 200, data, msg: '' })
function target(state: PrototypeState, id: number | string) {
  const row = state.orders.find(row => row.id === Number(id) && !state.deleted.includes(row.id))
  if (!row) throw new Error('任务不存在或已删除')
  return row
}
function filtered(state: PrototypeState, params: ReceiveListParams = {}) {
  const ids = Array.isArray(params.employee_id) ? params.employee_id.map(Number) : number(params.employee_id) ? [number(params.employee_id)] : []
  const range = Array.isArray(params.time_range) ? params.time_range : typeof params.time_range === 'string' ? params.time_range.split(' ~ ') : []
  return state.orders.filter(row => !state.deleted.includes(row.id)
    && (!params.keyword || `${row.task_no} ${row.product.asin} ${row.product.store_name} ${row.product.product_name || ''}`.toLowerCase().includes(params.keyword.toLowerCase()))
    && (!number(params.status) || row.status === number(params.status))
    && (!number(params.country_id) || row.country_id === number(params.country_id))
    && (!params.review_type || Object.prototype.hasOwnProperty.call(row.review_quantity_summary, params.review_type))
    && (!ids.length || ids.includes(row.employee_id))
    && (!number(params.order_clerk_id) || row.order_clerk_id === number(params.order_clerk_id))
    && (!number(params.basic_bill_status) || row.bill[0].basic_bill_status === number(params.basic_bill_status))
    && (!number(params.payment_status) || row.bill[0].payment_status === number(params.payment_status))
    && (!range[0] || dayjs(row.created_at).format('YYYY-MM-DD') >= range[0])
    && (!range[1] || dayjs(row.created_at).format('YYYY-MM-DD') <= range[1]))
    .sort((a, b) => b.created_at.localeCompare(a.created_at) || b.task_basic_id - a.task_basic_id || a.id - b.id)
}
export async function getReceiveList(params: ReceiveListParams = {}) {
  return transact(state => { const rows = filtered(state, params); const size = number(params.page_size) || 50; const page = number(params.page) || 1
    return ok({ list: rows.slice((page - 1) * size, page * size), total: rows.length, page, page_size: size, last_page: Math.ceil(rows.length / size) }) })
}
export async function getReceiveDetail(id: number | string) { return transact(state => ok(target(state, id))) }
export async function getReceiveBillDetail(id: number | string) { return transact(state => { const row = target(state, id); return ok({ bill: row.bill, bill_details: row.bill_details }) }) }
export async function getReceiveFeedbackDetail(id: number | string) { return transact(state => ok(target(state, id).feedback[0])) }
export async function saveReceiveFeedback(payload: ReceiveFeedbackSavePayload) { return transact(state => {
  const row = target(state, payload.task_id); row.feedback = [copy(payload)]; state.operations.push({ type: 'feedback', payload, at: new Date().toISOString() }); return ok(row.feedback[0])
}) }
export async function updateReceiveBusinessRemark(payload: { task_id: number; business_remark: string }) { return transact(state => {
  target(state, payload.task_id).business_remark = payload.business_remark; state.operations.push({ type: 'businessRemark', payload, at: new Date().toISOString() }); return ok(payload)
}) }
export async function saveReceiveBillStatus(payload: ReceiveBillStatusPayload) { return transact(state => {
  const row = target(state, payload.task_id); row.bill = [{ ...row.bill[0], ...payload, basic_bill_status_label: basicNames[payload.basic_bill_status], payment_status_label: paymentNames[payload.payment_status] }]
  row.actual_receivable_amount = payload.actual_receivable_amount
  row.bill_details.actual_receivable_amount = number(payload.actual_receivable_amount)
  state.operations.push({ type: 'billStatus', payload, at: new Date().toISOString() }); return ok(row.bill[0])
}) }
export async function deleteReceive(id: number | string) { return transact(state => { target(state, id); state.deleted.push(Number(id)); state.operations.push({ type: 'delete', id, at: new Date().toISOString() }); return ok({ id }) }) }
export async function getReceiveEnums(): Promise<ApiResponse> { return ok({ review_type: reviewTypes }) }
export async function getCommonOptions(params: { types: string; prefix?: string }): Promise<ApiResponse> {
  return transact(state => ok({ country: countries, admin: Array.from(new Map(state.orders.map(row => [row.creator.id, row.creator])).values()), employee: Array.from(new Map(state.orders.map(row => [row.employee.id, row.employee])).values()) }))
}
export async function searchCommonEmployees(params: { keyword?: string }) { return transact(state => ok(Array.from(new Map(state.orders.map(row => [row.employee.id, row.employee])).values()).filter(row => !params.keyword || `${row.name} ${row.id}`.includes(params.keyword)))) }
export async function searchTaskGroup(params: any) { const keyword = typeof params === 'string' ? params : params?.task_basics_no || ''; return transact(state => ok(Array.from(new Map(state.orders.map(row => [row.task_basic_id, row.task_basic])).values()).filter(row => row.task_basics_no === keyword))) }
export async function getTransactionFlowEnums() { return ok({ transaction_type: { 1: '业务收入', 2: '业务支出', 3: '业务结算', 4: '其他收入' }, flow_type: { 1: { 1: '任务收入', 2: '补款收入' }, 2: { 3: '截单退款', 4: '退佣金', 5: '退本金差价' }, 3: { 6: '账面抵消' }, 4: { 7: '其他收入' } } }) }
export async function uploadCommonFile(file: File, onProgress?: (event: { loaded: number; total: number }) => void) {
  const url = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('读取图片失败')); reader.readAsDataURL(file) })
  onProgress?.({ loaded: file.size, total: file.size }); return { ...ok({ url, path: url }), message: '' }
}

export async function getReceiveStatistics(params: ReceiveListParams = {}) { return transact(state => {
  const rows = filtered(state, params); const sum = (f: (row: any) => number) => rows.reduce((total, row) => total + f(row), 0)
  const groups = Array.from(new Map(rows.map(row => [row.task_basic_id, row.task_basic])).values())
  return ok({ has_filter: true, total_order_quantity: sum(row => number(row.total_order_quantity)),
    total_commission: { task_usd_commission: sum(row => number(row.total_commission.task_usd_commission)), task_cny_commission: sum(row => number(row.total_commission.task_cny_commission)) },
    base_receivable_amount: sum(row => number(row.base_receivable_amount)),
    actual_base_amount: { task_usd_amount: groups.reduce((n, row) => n + number(row.actual_usd_amount), 0), task_cny_amount: groups.reduce((n, row) => n + number(row.actual_cny_amount), 0) },
    arrears_amount: sum(row => row.bill[0].payment_status === 2 ? -number(row.bill[0].arrears_amount) : row.bill[0].payment_status === 3 ? number(row.bill[0].arrears_amount) : 0), arrears_usd_amount: 0 })
}) }
function overviewTask(row: any) {
  return { ...copy(row), asin: row.product.asin, task_basics_no: row.task_basic.task_basics_no,
    ...row.bill[0], actual_receivable_amount: row.actual_receivable_amount, base_receivable_amount: row.base_receivable_amount,
    settled_amount: row.bill_details.settled_amount, income_flow_amount: row.bill_details.income_flow_amount,
    offset_amount: row.bill_details.offset_amount, refund_amount: row.bill_details.refund_amount,
    pending_settlement_diff: row.bill_details.pending_settlement_diff }
}
export async function postReceiveBatchBill(taskIds: number[]) { return transact(state => {
  const rows = [...new Set(taskIds.map(Number))].map(id => target(state, id)); if (!rows.length) throw new Error('请选择任务')
  const groups = Array.from(new Set(rows.map(row => row.task_basic_id))).map(id => {
    const members = rows.filter(row => row.task_basic_id === id)
    const sum = (key: string) => members.reduce((n, row) => n + number(row.bill_details[key]), 0)
    return { task_basic_id: id, task_basics_no: members[0].task_basic.task_basics_no, employee_name: members[0].employee.name,
      task_count: members.length, actual_receivable_amount: sum('actual_receivable_amount'), income_flow_amount: sum('income_flow_amount'),
      offset_amount: sum('offset_amount'), refund_amount: sum('refund_amount'), pending_settlement_diff: sum('pending_settlement_diff'), is_merge_operation: 0,
      tasks: members.map(overviewTask) }
  })
  const sum = (key: string) => groups.reduce((n, group: any) => n + number(group[key]), 0)
  return ok({ task_basic: rows[0].task_basic, bill_overview: { list: groups, total: { task_count: rows.length,
    actual_receivable_amount: sum('actual_receivable_amount'), income_flow_amount: sum('income_flow_amount'), offset_amount: sum('offset_amount'), refund_amount: sum('refund_amount'), pending_settlement_diff: sum('pending_settlement_diff') } },
    flow_links: rows.flatMap(row => row.bill_details.bill_record.map((record: any) => ({
      ...record, flow_id: record.id, flow_no: `FLOW-${record.id}`, task_no: row.task_no, task_id: row.id,
      cny_amount: record.bill_cny_amount, usd_amount: record.bill_usd_amount,
      finance_remark: record.remark,
      transaction_type_label: record.bill_type_label,
      direction: record.bill_type === 2 ? 2 : record.bill_type === 3 ? 3 : 1,
      direction_label: record.bill_type === 2 ? '支出' : record.bill_type === 3 ? '账面抵消' : '收入',
    }))) })
}) }
export async function createReceiveBillRecord(payload: ReceiveBillRecordPayload, trace?: (step: string, data?: any) => void) { return transact(state => {
  trace?.('prototype:save-start')
  const items = payload.task_items?.length ? payload.task_items : [{ task_id: Number(payload.task_id), amount: number(payload.bill_cny_amount) || number(payload.bill_usd_amount) }]
  const targets = items.map(item => ({ item, row: target(state, item.task_id) }))
  const amountCny = number(payload.bill_cny_amount), amountUsd = number(payload.bill_usd_amount)
  if (![1, 2, 3].includes(payload.bill_type) || amountCny < 0 || amountUsd < 0) throw new Error('账款类型或金额不正确')
  const weightSum = items.reduce((n, item) => n + Math.abs(number(item.amount)), 0)
  const offsetTotal = (payload.offset_task_basics || []).reduce((n, item) => n + number(item.amount), 0)
  for (const source of payload.offset_task_basics || []) if (!state.orders.some(row => row.task_basic_id === source.task_basic_id)) throw new Error('抵消来源任务组不存在')
  for (const { item, row } of targets) {
    const ratio = weightSum ? Math.abs(number(item.amount)) / weightSum : 1 / targets.length
    const cny = amountCny * ratio, usd = amountUsd * ratio
    const record = { ...copy(payload), id: state.nextId++, task_id: row.id, bill_cny_amount: money(cny), bill_usd_amount: money(usd),
      bill_type_label: ['', '补款', '退款', '账面抵消'][payload.bill_type], transfer_channel_label: ['', '银行转账', '支付宝', '微信支付', 'PayPal', '其他'][payload.transfer_channel], created_at: new Date().toISOString() }
    const details = row.bill_details
    details.bill_record.push(record)
    const equivalent = cny + usd * number(row.exchange_rate)
    if (payload.bill_type === 2) details.refund_amount += equivalent
    else if (payload.bill_type === 3) details.offset_amount += equivalent
    else { details.income_flow_amount += equivalent; details.offset_amount += offsetTotal * ratio }
    details.settled_amount = details.income_flow_amount + details.offset_amount - details.refund_amount
    details.pending_settlement_diff = details.settled_amount - details.actual_receivable_amount
    if (payload.status_action === 1 && (!payload.bill_task_ids?.length || payload.bill_task_ids.includes(row.id))) Object.assign(row.bill[0], { payment_status: 4, payment_status_label: '已结清', arrears_amount: '0', arrears_usd_amount: 0 })
    row.transaction_flows = copy(details.bill_record)
  }
  state.operations.push({ type: 'billRecord', payload: copy(payload), at: new Date().toISOString() })
  trace?.('prototype:save-complete'); return ok({ saved: targets.length })
}) }
export async function exportReceiveList(params: ReceiveListParams = {}) { return transact(state => {
  const rows = filtered(state, params)
  const amount = (cny: unknown, usd?: unknown) => `${money(cny)} CNY${number(usd) ? ` + ${money(usd)} USD` : ''}`
  return ok({ filename: `接单管理-${dayjs().format('YYYYMMDD-HHmmss')}.xlsx`, rows: [
    ['创建时间', '任务号', '客户', '国家', 'Asin', '品名', '测评类型', '测评等级', '接单量', '接单汇率', '应收基础款项', '实收基础款项', '基础入账状态', '差价金额', '反馈状态', '任务状态', '商务备注', '商务'],
    ...rows.map(row => [row.created_at, row.task_no, row.employee.name, row.country.country, row.product.asin, row.product.product_name,
      row.review_types.map((type: string) => reviewTypes[type] || type).join('、'), formatReviewLevelText(row.review_level), row.total_order_quantity, row.exchange_rate,
      row.task_basic.payment_mode === 'mixed' ? amount(row.task_cny_amount, row.task_usd_amount) : amount(row.base_receivable_amount),
      amount(row.task_basic.actual_cny_amount, row.task_basic.actual_usd_amount), basicNames[row.bill[0].basic_bill_status],
      amount(row.bill[0].arrears_amount, row.bill[0].arrears_usd_amount), `订单：${row.feedback[0]?.order_feedback_status === 2 ? '已反馈' : '未反馈'}；评论：${row.feedback[0]?.comment_feedback_status === 2 ? '已反馈' : '未反馈'}`,
      row.status_label, row.business_remark, row.creator.real_name]),
  ] })
}) }
