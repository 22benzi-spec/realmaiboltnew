export interface ReceiveListParams {
  page?: number
  page_size?: number
  keyword?: string
  status?: number
  country_id?: number | string
  review_type?: string
  /**
   * 客户 id，支持多选。
   * POST /admin/receive/list 类型为 integer[]，未选传 []。
   * （lyx 改；Apifox 拉取 2026-10-23T04:25:45.813Z）
   */
  employee_id?: number | number[] | string | Array<number | string>
  /** 商务id（对应列表行的 creator 下单人） */
  order_clerk_id?: number | string
  /** 基础入账状态：1已完成，2未完成 */
  basic_bill_status?: number | string
  /** 账款情况：1无异常，2有欠款，3有余款，4已结清 */
  payment_status?: number | string
  /** 创建时间筛选，格式 `2026-10-15 ~ 2026-10-28`；也可传日期数组 */
  time_range?: string | Array<string | null | undefined> | null
  [key: string]: any
}

export interface ReceiveBill {
  arrears_amount?: string
  /** POST /admin/receive/list 的 bill[].arrears_usd_amount，integer，描述「差价金额(美元)」（lyx 2026-11-09 改；Apifox 拉取 2026-11-09T08:49:02.299Z） */
  arrears_usd_amount?: number
  basic_bill_status?: number
  basic_bill_status_label?: string
  id?: number
  marked_business?: string
  payment_status?: number
  payment_status_label?: string
  task_id?: number
  [key: string]: any
}

export interface ReceiveCountry {
  country: string
  country_code: string
  id: number
  level_label?: string
  status_label?: string
  [key: string]: any
}

export interface ReceiveCreator {
  id: number
  real_name: string
  wechat_account?: string
  wechat_nickname?: string
  [key: string]: any
}

export interface ReceiveCustomer {
  customer_no: string
  feedback_type: string
  id: number
  name: string
  [key: string]: any
}

export interface ReceiveEmployee {
  employee_no: string
  id: number
  name: string
  [key: string]: any
}

export interface ReceiveFeedback {
  comment_feedback_date?: string | null
  comment_feedback_status?: number
  comment_feedback_status_label?: string
  id?: number
  order_feedback_date?: string
  order_feedback_status?: number
  order_feedback_status_label?: string
  task_id?: number
  [key: string]: any
}

export interface ReceiveProduct {
  asin: string
  brand_name: string
  category: string
  id: number
  product_images: string
  store_name: string
  [key: string]: any
}

export interface ReceiveReviewQuantitySummary {
  free_review?: number
  feedback?: number
  words?: number
  [key: string]: any
}

export interface ReceiveTaskBasic {
  business_remark?: string
  country: ReceiveCountry
  country_id: number
  id: number
  task_basics_no: string
  total_task: number
  [key: string]: any
}

export interface ReceiveTotalCommission {
  task_usd_commission: number | string
  task_cny_commission: number | string
  [key: string]: any
}

export interface ReceiveListItem {
  business_remark?: string
  actual_receivable_amount: string
  actual_review_type?: string
  bill?: ReceiveBill[]
  buyer_commission_quantity: number
  buyer_commission_usd?: string
  certificate_label?: string
  country?: ReceiveCountry
  country_id?: number
  created_at?: string
  creator?: ReceiveCreator
  customer?: ReceiveCustomer
  customer_id?: number
  employee?: ReceiveEmployee
  employee_id?: number
  exchange_rate?: string
  feedback?: ReceiveFeedback[]
  id?: number
  order_clerk_id?: number
  pause_reason?: number
  pause_reason_label?: string
  product?: ReceiveProduct
  product_id?: number
  product_price?: string
  rating_count?: number
  review_level?: number
  review_level_label?: string
  review_quantity_summary?: ReceiveReviewQuantitySummary
  service_commission_cny?: string
  star_rating?: string
  status?: number
  status_label?: string
  task_basic?: ReceiveTaskBasic
  task_basic_id?: number
  task_cny_amount?: string
  task_contact_label?: string
  task_no?: string
  task_remark?: string
  task_usd_amount?: string
  total_commission?: ReceiveTotalCommission
  total_order_quantity?: number
  variant_mode_label?: string
  [key: string]: any
}

export interface ReceiveListData {
  last_page: number
  list: ReceiveListItem[]
  page: number
  page_size: number
  total: number
  [key: string]: any
}

export interface ReceiveFeedbackSavePayload {
  task_id: number
  order_feedback_status: number
  order_feedback_date: string
  comment_feedback_status: number
  comment_feedback_date: string
  remark: string
}

export interface ReceiveBillStatusPayload {
  task_id: number
  actual_receivable_amount: string
  basic_bill_status: number
  payment_status: number
  arrears_amount: string
  arrears_usd_amount: number | string
  remark: string
  marked_business: string
}

export interface ReceiveBillRemarkPayload {
  task_basic_id: number
  remark: string
}

export interface ReceiveStatisticsParams {
  keyword?: string
  status?: number
  review_type?: string
  country_id?: number
  /** 入参可带多个客户 id；请求体仍按统计/导出文档收成单个整数（lyx 改；Apifox 拉取 2026-10-23T04:25:45.813Z） */
  employee_id?: number | number[]
  order_clerk_id?: number
  basic_bill_status?: number
  payment_status?: number
}

export interface ReceiveStatisticsData {
  has_filter: boolean
  total_order_quantity: number
  total_commission: {
    task_usd_commission: number
    task_cny_commission: number
  }
  base_receivable_amount: number
  actual_base_amount: {
    task_usd_amount: number
    task_cny_amount: number
  }
  arrears_amount: number
  /** POST /admin/receive/statistics 的 data.arrears_usd_amount，integer，描述「差价金额（美元）」（lyx 2026-11-09 改；Apifox 拉取 2026-11-09T09:08:20.196Z） */
  arrears_usd_amount?: number | string
  [key: string]: any
}

export interface ReceiveBillRecordTaskItem {
  task_id: number
  amount: number
}

export interface ReceiveBillRecordOffsetBasic {
  task_basic_id: number
  amount: number
}

export interface ReceiveBillRecordOffsetDetail {
  surplus_type?: 1 | 2 | 3
  country_id: number
  review_type: string
  quantity: number
}

export interface ReceiveBillRecordRefundDetail {
  country_id: number
  review_type: string
  order_count: number
}

export interface ReceiveBillRecordPayload {
  bill_type: number
  /** 抵消类型：非抵消 0，截单抵消 1，余额抵消 2，补款抵消 3（禅道 #177） */
  offset_type?: number
  surplus_type?: number[]
  /** 单任务提交时使用，与 task_items 二选一（Apifox 拉取 2026-10-14T03:45:21.925Z；李运侠 改） */
  task_id?: number
  /** 批量任务提交时使用，与 task_id 二选一（Apifox 拉取 2026-10-14T03:45:21.925Z；李运侠 改） */
  task_items?: ReceiveBillRecordTaskItem[]
  offset_task_basics?: ReceiveBillRecordOffsetBasic[]
  offset_details?: ReceiveBillRecordOffsetDetail[]
  refund_details?: ReceiveBillRecordRefundDetail[]
  transaction_type: number
  flow_type: number[]
  bill_cny_amount: number
  bill_usd_amount: number
  payment_date: string
  transfer_channel: number
  receive_account: string
  surname: string
  receive_name: string
  voucher_path: string
  status_action: number
  remark: string
  /** 账款标记的任务 id。确认结清传入勾选任务，文档未列入 required。（lyx 2026-11-12 改；Apifox 拉取 2026-11-12T09:49:26.678Z） */
  bill_task_ids?: number[]
}

export function normalizeReceiveEmployeeIds(value: unknown): number[] {
  const source = Array.isArray(value)
    ? value
    : (value === undefined || value === null || value === '' ? [] : [value])
  const ids: number[] = []
  for (const item of source) {
    const id = Number(item)
    if (!Number.isInteger(id) || id <= 0 || ids.includes(id))
      continue
    ids.push(id)
  }
  return ids
}

export function singleReceiveEmployeeId(value: unknown): number {
  const ids = normalizeReceiveEmployeeIds(value)
  return ids.length === 1 ? ids[0] : 0
}

export interface ReceiveBatchBillListItem {
  id: number
  task_id: number
  basic_bill_status: number
  payment_status: number
  arrears_amount: string
  created_at: string
  task_no: string
  asin: string
  basic_bill_status_label: string
  payment_status_label: string
}

export interface ReceiveBusinessRemarkPayload {
  task_id: number
  business_remark: string
}

export interface ApiResponse<T = any> { code: number; data: T; msg?: string; message?: string }
