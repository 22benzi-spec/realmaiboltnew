import dayjs from 'dayjs'

export type ReviewTypeEnumMap = Record<string, string>

export function parseProductImage(value: unknown) {
  if (!value) return ''
  const raw = String(value).trim()
  if (!raw) return ''
  if (raw.includes(',')) return raw.split(',').map(item => item.trim()).find(Boolean) || ''
  return raw
}

export function getReviewTypeLabel(key: string, enumMap: ReviewTypeEnumMap = {}) {
  const label = enumMap[key] || key
  if (key === 'pic' || key === 'image' || label === 'pic' || label === 'image') return '图片'
  return label || '—'
}

export function getReviewTypes(record: any, enumMap: ReviewTypeEnumMap = {}) {
  const raw = record.review_types
  if (Array.isArray(raw) && raw.length) {
    return raw.map((item: string) => getReviewTypeLabel(String(item), enumMap))
  }
  const text = String(record.actual_review_type || '').trim()
  if (!text) return []
  return text.split(',').map(item => getReviewTypeLabel(item.trim(), enumMap)).filter(Boolean)
}

export function getCountryName(record: any) {
  return record.country?.country
    || record.task_basic?.country?.country
    || record.site_task_country
    || '—'
}

export function getTypeQty(record: any, typeKey: string, enumMap: ReviewTypeEnumMap = {}) {
  const summary = record.review_quantity_summary
  if (summary && typeof summary === 'object') {
    if (summary[typeKey] !== undefined) return Number(summary[typeKey] || 0)
    const label = getReviewTypeLabel(typeKey, enumMap)
    if (summary[label] !== undefined) return Number(summary[label] || 0)
  }
  const types = Array.isArray(record.review_types) ? record.review_types : []
  if (types.length <= 1) return Number(record.total_order_quantity || 0)
  return Math.round(Number(record.total_order_quantity || 0) / types.length)
}

export function hasMultipleTypes(record: any) {
  const types = Array.isArray(record.review_types) ? record.review_types : []
  return types.length > 1
}

export function getFirstBill(record: any) {
  if (Array.isArray(record.bill)) return record.bill[0] || null
  return record.bill || null
}

export function getFeedbackDetail(record: any) {
  if (record._feedbackDetail) return record._feedbackDetail
  if (record.feedback && !Array.isArray(record.feedback)) return record.feedback
  if (Array.isArray(record.feedback)) return record.feedback[0] || null
  return null
}

export function isBasicBillIncomplete(record: any) {
  const bill = getFirstBill(record)
  return Number(bill?.basic_bill_status) === 2 || bill?.basic_bill_status_label === '未完成'
}

export function getBasicBillStatusLabel(record: any) {
  const bill = getFirstBill(record)
  if (bill?.basic_bill_status_label) return bill.basic_bill_status_label
  if (Number(bill?.basic_bill_status) === 2) return '未完成'
  if (Number(bill?.basic_bill_status) === 1) return '已完成'
  return '已完成'
}

export function getFeedbackStatusLabel(record: any, field: 'order' | 'comment') {
  const detail = getFeedbackDetail(record)
  const labelKey = field === 'order' ? 'order_feedback_status_label' : 'comment_feedback_status_label'
  const statusKey = field === 'order' ? 'order_feedback_status' : 'comment_feedback_status'
  if (detail?.[labelKey]) return detail[labelKey]
  if (Number(detail?.[statusKey]) === 2) return '已反馈'
  return '未反馈'
}

export function isFeedbackDone(record: any, field: 'order' | 'comment') {
  return getFeedbackStatusLabel(record, field) === '已反馈'
}

export function shortenCustomerCompanyName(name: unknown, limit = 7) {
  const chars = Array.from(String(name ?? ''))
  if (chars.length <= limit) return chars.join('')
  return `${chars.slice(0, limit).join('')}...`
}

export function listArrearsUsdText(record: any) {
  const value = getFirstBill(record)?.arrears_usd_amount
  if (value === undefined || value === null || value === '') return ''
  return String(value)
}

export function hasListUsdArrears(record: any) {
  const text = listArrearsUsdText(record)
  if (!text) return false
  const amount = Number(text)
  return Number.isFinite(amount) && amount !== 0
}

function isDebtBill(record: any) {
  const bill = getFirstBill(record)
  return Number(bill?.payment_status) === 2 || bill?.payment_status_label === '有欠款'
}

function isSurplusBill(record: any) {
  const bill = getFirstBill(record)
  return Number(bill?.payment_status) === 3 || bill?.payment_status_label === '有余款'
}

export function showListDebtAmount(record: any) {
  return isDebtBill(record) && (hasRealDebt(record) || hasListUsdArrears(record))
}

export function showListSurplusAmount(record: any) {
  return isSurplusBill(record) && (hasRealSurplus(record) || hasListUsdArrears(record))
}

export function hasRealDebt(record: any) {
  const bill = getFirstBill(record)
  return (Number(bill?.payment_status) === 2 || bill?.payment_status_label === '有欠款') && Number(bill?.arrears_amount || 0) > 0
}

export function hasRealSurplus(record: any) {
  const bill = getFirstBill(record)
  return (Number(bill?.payment_status) === 3 || bill?.payment_status_label === '有余款') && Number(bill?.arrears_amount || 0) > 0
}

export function isPaymentCleared(record: any) {
  const bill = getFirstBill(record)
  return Number(bill?.payment_status) === 4 || bill?.payment_status_label === '已结清'
}

const COMMISSION_RATE_ALIASES: Record<string, string[]> = {
  free_review: ['free_review', 'ranking', 'ranking_commission', 'free_review_commission'],
  words: ['words', 'words_commission'],
  pic: ['pic', 'image', 'pic_commission', 'image_commission'],
  image: ['image', 'pic', 'image_commission', 'pic_commission'],
  video: ['video', 'video_commission'],
  feedback: ['feedback', 'feedback_commission'],
}

function getReviewTypeKeysForCommission(record: any): string[] {
  if (Array.isArray(record.review_types) && record.review_types.length) {
    return record.review_types.map((item: any) => String(item)).filter(Boolean)
  }
  if (Array.isArray(record.review_type) && record.review_type.length) {
    return record.review_type.map((item: any) => String(item)).filter(Boolean)
  }
  return String(record.actual_review_type || record.review_type || '')
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
}

function getCommissionRate(record: any, typeKey: string) {
  const rates = record.commission_rates
  if (!rates || typeof rates !== 'object') return null
  const candidates = [typeKey, ...(COMMISSION_RATE_ALIASES[typeKey] || [])]
  const matchedKey = candidates.find(key => rates[key] !== undefined && rates[key] !== null && rates[key] !== '')
  return matchedKey ? Number(rates[matchedKey] || 0) : null
}

export function getCommissionUnitPrice(record: any) {
  const typeKeys = getReviewTypeKeysForCommission(record)
  if (typeKeys.length === 1) {
    const rate = getCommissionRate(record, typeKeys[0])
    if (rate !== null) return rate
  }
  const qty = Number(record.total_order_quantity || 0)
  const total = Number(record.total_commission?.task_cny_commission ?? record.service_commission_cny ?? 0)
  if (qty > 0 && total > 0) return total / qty
  return total
}

export function getTypeUnitPrice(record: any, typeKey: string) {
  const rate = getCommissionRate(record, typeKey)
  if (rate !== null) return rate
  return getCommissionUnitPrice(record)
}

export function getServiceCommissionCny(record: any, enumMap: ReviewTypeEnumMap = {}) {
  const directAmount = Number(record.total_commission?.task_cny_commission ?? record.service_commission_cny ?? 0)
  if (directAmount > 0) return directAmount

  const typeKeys = getReviewTypeKeysForCommission(record)
  const amount = typeKeys.reduce((sum, typeKey) => {
    const rate = getCommissionRate(record, typeKey)
    if (rate === null) return sum
    return sum + getTypeQty(record, typeKey, enumMap) * rate
  }, 0)
  return amount
}

export function getTaskCommissionUsd(record: any) {
  return Number(record.total_commission?.task_usd_commission ?? record.buyer_commission_usd ?? 0)
}

export function getReviewTypeColor(type: string) {
  const map: Record<string, string> = {
    免评: 'default',
    文字: 'blue',
    文字评: 'blue',
    图片: 'cyan',
    图片评: 'cyan',
    视频: 'geekblue',
    视频评: 'geekblue',
    Feedback: 'orange',
    普通测评: 'blue',
    高等测评: 'cyan',
    极高度测评: 'green',
    极高等测评: 'green',
  }
  return map[type] || 'default'
}

export function getStatusColor(status: string) {
  const map: Record<string, string> = {
    待分发: 'default',
    待分配: 'default',
    进行中: 'blue',
    已完成: 'green',
    已截单: 'red',
    已暂停: 'orange',
    暂停中: 'orange',
  }
  return map[status] || 'default'
}

export function getOrderTypeColor(type: string) {
  return getReviewTypeColor(type)
}

export function getPaymentTypeColor(type: string) {
  const map: Record<string, string> = { 基础收款: 'green', 补款: 'cyan', 退款: 'red', 账面抵消: 'blue' }
  return map[type] || 'green'
}

export function getPaymentDirectionColor(direction: string) {
  const map: Record<string, string> = { 收入: 'green', 支出: 'red', 账面抵消: 'blue' }
  return map[direction] || 'default'
}

export function onImgError(e: Event) {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
  const placeholder = img.nextElementSibling as HTMLElement
  if (placeholder) placeholder.style.display = 'flex'
}

export function getRowClass(record: any): string {
  const classes: string[] = []
  if (record._isMultiBatch) {
    classes.push('row-in-batch')
    if (record._isFirstInBatch) classes.push('row-batch-first')
    if (record._isLastInBatch) classes.push('row-batch-last')
  }
  const billingIncomplete = isBasicBillIncomplete(record)
  if (billingIncomplete && hasRealDebt(record)) classes.push('row-billing-debt')
  else if (billingIncomplete) classes.push('row-billing-warn')
  else if (hasRealDebt(record)) classes.push('row-debt-warn')
  else if (hasRealSurplus(record)) classes.push('row-surplus-warn')
  return classes.join(' ')
}

export function isGroupFeedback(record: any) {
  return String(record.customer?.feedback_type || '') === 'group_chat'
}

export function getProductImage(record: any) {
  return parseProductImage(record.product?.product_images)
}

// 品名：接口实际返回 product.product_name（部分记录为空），部分接口用 product.name
// 缺失时显示占位，禁止用 brand_name 顶替
export function getProductName(record: any) {
  const name = record.product?.product_name ?? record.product?.name ?? record.product_name
  const text = String(name ?? '').trim()
  return text || '—'
}

export function getSettledAmount(record: any) {
  const fromDetails = record.bill_details?.settled_amount
  if (fromDetails !== undefined && fromDetails !== null && fromDetails !== '') {
    return Number(fromDetails || 0)
  }
  return Number(record.actual_receivable_amount || 0)
}

export function getReceivableCny(record: any) {
  return Number(record.task_cny_amount || 0)
}

export function getBatchGroupKey(record: any) {
  const taskBasic = record.task_basic
  if (taskBasic && Number(taskBasic.total_task) > 1 && taskBasic.id) {
    return `task_basic_${taskBasic.id}`
  }
  return `_solo_${record.id}`
}

export function getBatchGroupLabel(record: any) {
  return record.task_basic?.task_basics_no || ''
}

export function getPaymentCardClass(type: string) {
  if (type === '退款' || Number(type) === 2) return 'payment-card-refund'
  if (type === '补款' || Number(type) === 1) return 'payment-card-supplement'
  return ''
}

export function mapBillRecords(records: any[] = [], exchangeRate = 1) {
  return records.map((record: any) => {
    const amountUsd = Number(record.bill_usd_amount || 0)
    const amountCny = Number(record.bill_cny_amount || 0) || Number((amountUsd * exchangeRate).toFixed(2))
    const billType = Number(record.bill_type)
    return {
      id: String(record.id),
      amount_cny: amountCny,
      amount_usd: amountUsd,
      payment_date: record.payment_date || record.bill_date || '',
      payment_method: record.transfer_channel_label || '',
      payer_name: record.receive_name || record.payer_name || '',
      notes: record.remark || '',
      payment_type: record.bill_type_label || (billType === 2 ? '退款' : billType === 3 ? '账面抵消' : '补款'),
      voucher_path: record.voucher_path || '',
      created_at: record.created_at || '',
    }
  })
}

export function sumBillRecordsNet(records: any[] = []) {
  return records.reduce((sum: number, item: any) => {
    const amt = Number(item.amount_cny || item.bill_cny_amount || 0)
    const type = item.payment_type || item.bill_type_label
    const isRefund = type === '退款' || Number(item.bill_type) === 2
    return isRefund ? sum - amt : sum + amt
  }, 0)
}

export const TABLE_COLUMNS = [
  { title: '任务号', key: 'task_no', dataIndex: 'task_no', width: 175 },
  { title: '款项情况', key: 'billing', width: 180 },
  { title: '客户', key: 'customer', width: 160 },
  { title: '产品信息', key: 'product', width: 160 },
  { title: '国家', key: 'country', width: 65 },
  { title: '测评类型/量', key: 'order_types', width: 135 },
  { title: '应收基础款项', key: 'receivable_amount', width: 130 },
  { title: '实收基础款项', key: 'actual_received', width: 130 },
  { title: '反馈状态', key: 'feedback', width: 130 },
  { title: '商务备注', key: 'business_remark', width: 140 },
  { title: '商务', key: 'employee', width: 110 },
  { title: '任务状态', key: 'task_status', width: 95 },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 100,
    customRender: ({ text }: any) => (text ? dayjs(text).format('MM-DD HH:mm') : ''),
  },
  { title: '操作', key: 'action', width: 100, fixed: 'right' as const },
]
