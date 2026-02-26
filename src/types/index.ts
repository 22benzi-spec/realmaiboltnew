export interface Order {
  id?: string
  order_number?: string
  asin: string
  product_image?: string
  product_name?: string
  store_name: string
  brand_name?: string
  product_price?: number
  review_type: '普通测评' | '变参测评' | '议定参测评'
  review_mode: '免评模式' | '首评模式' | '免评首评模式'
  country: '美国' | '德国' | '英国' | '加拿大'
  exchange_rate: number
  price_no_review: number
  price_text: number
  price_image: number
  price_video: number
  price_feedback: number
  order_type: '免评' | '文字评' | '图片评' | '视频评' | 'Feedback'
  order_quantity: number
  product_cost_cny: number
  commission_fee: number
  unit_price: number
  total_price: number
  total_orders: number
  total_amount: number
  fixed_daily_orders: number
  new_daily_orders: number
  notes?: string
  daily_feedback: boolean
  comprehensive_label: boolean
  delivery_label: boolean
  seller?: string
  category?: string
  review_level?: string
  variant_info?: string
  customer_name?: string
  customer_id_str?: string
  sales_person?: string
  status: string
  created_at?: string
  updated_at?: string
}

export interface OrderSchedule {
  id?: string
  order_id: string
  scheduled_date: string
  quantity: number
  keywords?: string[]
  status: '待执行' | '进行中' | '已完成'
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface SubOrder {
  id?: string
  order_id: string
  schedule_id?: string
  sub_order_number: string
  scheduled_date: string
  asin: string
  store_name: string
  country: string
  order_type: string
  product_price: number
  unit_price: number
  keyword?: string
  keyword_type?: 'keyword' | 'link'
  search_link?: string
  product_image?: string
  product_name?: string
  brand_name?: string
  category?: string
  review_level?: string
  review_type?: string
  variant_info?: string
  task_notes?: string
  customer_name?: string
  customer_id_str?: string
  sales_person?: string
  submit_date?: string
  operator_upload_info?: string
  commission_fee?: number
  exchange_rate?: number
  status: '待分配' | '已分配' | '进行中' | '已下单' | '已留评' | '已完成' | '已取消'
  staff_id?: string
  staff_name?: string
  buyer_id?: string
  buyer_name?: string
  amazon_order_id?: string
  notes?: string
  review_screenshot_url?: string
  delivery_confirmed_at?: string
  review_submitted_at?: string
  buyer_assigned_at?: string
  amazon_order_placed_at?: string
  refund_status?: '无需退款' | '待退款' | '已退款'
  refund_method?: '礼品卡' | 'PayPal'
  refund_sequence?: '先退款后给单号' | '先给单号后退款'
  refund_amount?: number
  refund_date?: string
  cancel_reason?: string
  released_to_hall?: boolean
  released_at?: string
  released_by_staff_id?: string
  released_by_staff_name?: string
  release_reason?: string
  created_at?: string
  updated_at?: string
}

export interface Buyer {
  id?: string
  name: string
  phone?: string
  email?: string
  platform_account?: string
  country?: string
  level?: string
  status?: '活跃' | '暂停' | '黑名单'
  tags?: string[]
  total_completed?: number
  success_rate?: number
  staff_id?: string
  staff_name?: string
  facebook_name?: string
  facebook_link?: string
  chat_account?: string
  paypal_email?: string
  backup_contact?: string
  birthday?: string
  last_order_date?: string
  purchased_asins?: string
  purchased_stores?: string
  amazon_profile?: string
  review_history?: string
  buyer_paid_amount?: number
  actual_refund_amount?: number
  extra_commission?: number
  notes?: string
  blacklist_reason?: string
  created_at?: string
  updated_at?: string
}

export const BUYER_TAG_PRESETS = [
  '出评快', '图片评', '视频评', '高权重Profile', 'Prime会员', '老账号',
  '配合度高', '响应快', '留评质量高', '新买手', '需跟进', '退款快',
  '大额单', '小额单', '多店铺经验', '直评', 'VP评', '关键词搜索',
  '指定变体', '复购买手',
] as const

export type StaffRole = '业务员' | '商务' | '财务' | '管理员'

export interface Staff {
  id?: string
  name: string
  phone?: string
  email?: string
  role?: StaffRole
  status?: '在职' | '离职' | '休假'
  department?: string
  wechat_id?: string
  join_date?: string
  avatar_color?: string
  total_assigned?: number
  total_completed?: number
  notes?: string
  created_at?: string
  updated_at?: string
  business_wechat_accounts?: BusinessWechatAccount[]
}

export interface BusinessWechatAccount {
  id?: string
  staff_id: string
  wechat_id: string
  wechat_nickname?: string
  status?: '在用' | '停用' | '封号'
  client_count?: number
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface GiftCardBatch {
  id?: string
  batch_number?: string
  supplier: string
  purchase_date: string
  exchange_rate: number
  total_face_value_usd?: number
  total_cost_cny?: number
  card_count?: number
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface GiftCard {
  id?: string
  card_number?: string
  batch_id: string
  face_value_usd: number
  cost_cny?: number
  card_code?: string
  status?: '未使用' | '已使用' | '已作废'
  used_by_buyer_id?: string
  used_by_buyer_name?: string
  used_for_sub_order_id?: string
  used_at?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface UsdFundBatch {
  id?: string
  batch_number?: string
  purchase_date?: string
  exchange_rate: number
  amount_usd: number
  cost_cny?: number
  remaining_usd?: number
  source?: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface PaypalAccount {
  id?: string
  email: string
  account_alias?: string
  owner_name?: string
  phone?: string
  linked_bank?: string
  status?: '正常' | '受限' | '已关闭'
  risk_level?: '低风险' | '中风险' | '高风险'
  total_refunded_usd?: number
  refund_count?: number
  notes?: string
  registered_at?: string
  suspended_at?: string
  created_at?: string
  updated_at?: string
}

export interface PaypalRefund {
  id?: string
  paypal_account_id?: string
  usd_batch_id?: string
  sub_order_id?: string
  buyer_name?: string
  buyer_paypal_email?: string
  amount_usd: number
  exchange_rate: number
  cost_cny?: number
  refund_date?: string
  status?: '待退款' | '已退款' | '失败'
  notes?: string
  created_at?: string
  paypal_accounts?: { email: string; account_alias?: string }
  usd_fund_batches?: { batch_number: string; exchange_rate: number }
}

export interface RefundRequestGiftCard {
  id?: string
  refund_request_id: string
  gift_card_id?: string
  card_number: string
  card_code: string
  face_value_usd: number
  created_at?: string
}

export interface RefundRequest {
  id?: string
  sub_order_id?: string
  order_id?: string
  buyer_name: string
  buyer_paypal_email: string
  refund_amount: number
  refund_method: '礼品卡' | 'PayPal'
  status?: '待处理' | '已处理' | '已取消'
  notes?: string
  assigned_gift_card_id?: string
  assigned_paypal_account_id?: string
  assigned_paypal_email?: string
  assigned_gift_card_number?: string
  assigned_gift_card_code?: string
  finance_notes?: string
  handled_at?: string
  paypal_screenshot_url?: string
  staff_confirmed?: boolean
  staff_confirmed_at?: string
  created_at?: string
  updated_at?: string
  sub_orders?: { sub_order_number: string; asin: string; store_name: string }
  gift_cards?: { card_number: string; card_code: string; face_value_usd: number }
  paypal_accounts?: { email: string; account_alias: string }
  refund_request_gift_cards?: RefundRequestGiftCard[]
}

export interface ClientContact {
  id?: string
  company_id: string
  name: string
  role?: string
  phone?: string
  email?: string
  wechat?: string
  whatsapp?: string
  is_primary?: boolean
  notes?: string
  created_at?: string
  updated_at?: string
}

export interface ClientCompany {
  id?: string
  company_name: string
  brand_names?: string[]
  registered_asins?: string[]
  country?: string
  industry?: string
  level?: 'S' | 'A' | 'B' | 'C'
  status?: '活跃' | '暂停' | '流失'
  business_owner_id?: string
  business_owner_name?: string
  total_order_count?: number
  total_order_amount_cny?: number
  last_order_date?: string
  notes?: string
  tags?: string[]
  created_at?: string
  updated_at?: string
  client_contacts?: ClientContact[]
}
