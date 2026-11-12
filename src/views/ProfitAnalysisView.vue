<template>
  <div class="page-content">
    <div class="page-header">
      <h2 class="page-title">利润分析</h2>
    </div>

    <div class="filter-bar">
      <a-range-picker v-model:value="dateRange" @change="reload" style="width:260px" />
      <a-input v-model:value="customerFilter" placeholder="客户名称" style="width:180px" allow-clear @change="reload" />
      <a-button @click="reload" :loading="loading">查询</a-button>
    </div>

    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-val blue">¥{{ formatNum(overview.commissionProfit) }}</div>
        <div class="kpi-label">佣金利润</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val orange">¥{{ formatNum(overview.fxProfit) }}</div>
        <div class="kpi-label">汇率利润</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" :class="overview.principalNet >= 0 ? 'green' : 'red'">
          ¥{{ formatNum(overview.principalNet) }}
        </div>
        <div class="kpi-label">本金差额</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" :class="overview.grossProfit >= 0 ? 'green' : 'red'">
          ¥{{ formatNum(overview.grossProfit) }}
        </div>
        <div class="kpi-label">毛利润</div>
      </div>
    </div>

    <a-card size="small" style="margin-bottom:20px">
      <div class="formula">
        <span class="formula-label">产品维度口径：</span>
        <span class="formula-text">
          佣金利润 = 类型佣金 × 做单量（已下单起算，剔除问题单处理结果为无需处理/已关闭/已补单）；
          汇率利润 = (接单汇率 − 实际汇率) × 实付外币，实际汇率：PayPal取当日现汇卖出价，礼品卡取卡购买汇率/成本折算；
          本金差额 = 本金少返 − 已损失本金 − 本金多返；
          毛利润 = 三者相加
        </span>
      </div>
    </a-card>

    <a-tabs v-model:activeKey="activeTab">
      <a-tab-pane key="customer" tab="按客户汇总">
        <a-table
          :columns="customerColumns"
          :data-source="customerData"
          :loading="loading"
          :pagination="false"
          row-key="customer_name"
          size="middle"
          :scroll="{ x: 900 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="moneyKeys.includes(column.key)">
              <span :class="amountClass(record[column.key])">
                ¥{{ formatNum(record[column.key]) }}
              </span>
            </template>
          </template>
        </a-table>
      </a-tab-pane>

      <a-tab-pane key="order" tab="按订单明细">
        <a-table
          :columns="orderColumns"
          :data-source="orderData"
          :loading="loading"
          :pagination="{ current: orderPage, pageSize: 20, total: orderData.length, showTotal: (t:number) => `共 ${t} 条` }"
          row-key="id"
          size="middle"
          :scroll="{ x: 1100 }"
          @change="(p:any) => orderPage = p.current"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="moneyKeys.includes(column.key)">
              <span :class="amountClass(record[column.key])">
                ¥{{ formatNum(record[column.key]) }}
              </span>
            </template>
          </template>
        </a-table>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import type { Dayjs } from 'dayjs'

const loading = ref(false)
const dateRange = ref<[Dayjs, Dayjs] | null>(null)
const customerFilter = ref('')
const activeTab = ref('customer')
const orderPage = ref(1)

const overview = reactive({
  commissionProfit: 0,
  fxProfit: 0,
  principalNet: 0,
  grossProfit: 0,
})

interface CustomerRow {
  customer_name: string
  orderCount: number
  commissionProfit: number
  fxProfit: number
  principalNet: number
  grossProfit: number
}

interface OrderRow {
  id: string
  order_number: string
  customer_name: string
  product_name: string
  done_quantity: number
  commissionProfit: number
  fxProfit: number
  principalNet: number
  grossProfit: number
  created_at: string
}

const customerData = ref<CustomerRow[]>([])
const orderData = ref<OrderRow[]>([])
const moneyKeys = ['commissionProfit', 'fxProfit', 'principalNet', 'grossProfit']

const customerColumns = [
  { title: '客户', dataIndex: 'customer_name', key: 'customer_name', width: 140 },
  { title: '订单数', dataIndex: 'orderCount', key: 'orderCount', width: 80 },
  { title: '佣金利润', key: 'commissionProfit', width: 130 },
  { title: '汇率利润', key: 'fxProfit', width: 130 },
  { title: '本金差额', key: 'principalNet', width: 130 },
  { title: '毛利润', key: 'grossProfit', width: 130 },
]

const orderColumns = [
  { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 110, customRender: ({ text }: any) => text?.slice(0, 10) || '-' },
  { title: '任务号', dataIndex: 'order_number', key: 'order_number', width: 160 },
  { title: '客户', dataIndex: 'customer_name', key: 'customer_name', width: 120, ellipsis: true },
  { title: '产品信息', dataIndex: 'product_name', key: 'product_name', width: 160, ellipsis: true },
  { title: '做单量', dataIndex: 'done_quantity', key: 'done_quantity', width: 80 },
  { title: '佣金利润', key: 'commissionProfit', width: 120 },
  { title: '汇率利润', key: 'fxProfit', width: 120 },
  { title: '本金差额', key: 'principalNet', width: 120 },
  { title: '毛利润', key: 'grossProfit', width: 120 },
]

function formatNum(n: number) {
  return (n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function amountClass(n: number) {
  if (n > 0) return 'amount-in'
  if (n < 0) return 'amount-out'
  return 'text-muted'
}

function positive(n: any) {
  const v = Number(n || 0)
  return v > 0 ? v : 0
}

function hasMultipleTypes(order: any) {
  return Array.isArray(order?.order_types) && order.order_types.length > 1
}

function getTypeQty(order: any, type: string) {
  if (order?.type_quantities && order.type_quantities[type] !== undefined) {
    return Number(order.type_quantities[type] || 0)
  }
  const n = order?.order_types?.length || 1
  return n > 0 ? Number(order.order_quantity || 0) / n : Number(order.order_quantity || 0)
}

function getCommissionUnitPrice(order: any) {
  const cf = Number(order.commission_fee || 0)
  if (cf > 0) return cf
  const unitPrice = Number(order.unit_price || 0)
  const productCostCny = Number(order.product_price || 0) * Number(order.exchange_rate || 1)
  const derived = unitPrice - productCostCny
  return derived > 0 ? derived : 0
}

function getTypeUnitPrice(order: any, type: string) {
  const map: Record<string, string> = {
    '免评': 'price_no_review',
    '文字评': 'price_text',
    '图片评': 'price_image',
    '视频评': 'price_video',
    'Feedback': 'price_feedback',
  }
  const field = map[type]
  if (field && order[field] !== undefined) return Number(order[field] || 0)
  return getCommissionUnitPrice(order)
}

function getOrderPlannedCommission(order: any) {
  if (hasMultipleTypes(order)) {
    return (order.order_types || []).reduce((sum: number, type: string) => {
      return sum + getTypeQty(order, type) * getTypeUnitPrice(order, type)
    }, 0)
  }
  return getCommissionUnitPrice(order) * Number(order.order_quantity || 0)
}

/** 做单量：子单已下单/已留评/已完成，并剔除指定售后处理结果 */
const DONE_SUB_STATUSES = ['已下单', '已留评', '已完成']
const EXCLUDED_ISSUE_STATUSES = ['无需处理', '已关闭', '已补单']

function isDoneSubOrder(sub: any) {
  return DONE_SUB_STATUSES.includes(String(sub?.status || ''))
}

function isExcludedIssueStatus(status: any) {
  return EXCLUDED_ISSUE_STATUSES.includes(String(status || ''))
}

function getCommissionByDoneQty(order: any, doneQty: number) {
  if (doneQty <= 0) return 0
  const plannedQty = Number(order.order_quantity || 0)
  const plannedCommission = getOrderPlannedCommission(order)
  if (plannedQty > 0 && plannedCommission > 0) {
    return plannedCommission * (doneQty / plannedQty)
  }
  return getCommissionUnitPrice(order) * doneQty
}

function normalizePrincipalStatus(issue: any) {
  if (issue?.principal_status === '损失') return '已损失'
  if (issue?.principal_status) return issue.principal_status
  if (issue?.principal_stolen) return '已损失'
  if (positive(issue?.principal_amount) > 0) return '待确定'
  return '正常'
}

function getPrincipalAmount(issue: any) {
  return positive(issue?.principal_amount || issue?.loss_amount)
}

function getIssueLostPrincipal(issue: any) {
  return normalizePrincipalStatus(issue) === '已损失' || issue?.principal_stolen ? getPrincipalAmount(issue) : 0
}

function getIssueManualOverRefund(issue: any) {
  const status = normalizePrincipalStatus(issue)
  if (issue?.issue_type !== '本金多返') return 0
  if (!['待追回', '已损失', '损失'].includes(status)) return 0
  return getPrincipalAmount(issue)
}

function getIssueShortRefund(issue: any) {
  return positive(issue?.profit_diff) + positive(issue?.recovered_amount)
}

function getRefundPaidAmount(refund: any) {
  return positive(refund?.actual_paid_usd || refund?.actual_paid || refund?.product_price)
}

function getRefundReturnAmount(refund: any) {
  if (refund?.refund_method === '礼品卡') {
    return positive(refund?.gift_card_face_value_usd || refund?.refund_amount_usd || refund?.refund_amount)
  }
  return positive(refund?.refund_amount_usd || refund?.refund_amount)
}

function getRefundOverAmount(refund: any) {
  if (!['PayPal', '礼品卡'].includes(refund?.refund_method)) return 0
  const text = `${refund?.refund_category || ''} ${refund?.notes || ''} ${refund?.refund_reason || ''}`
  if (/裂变|推荐/.test(text)) return 0
  const paid = getRefundPaidAmount(refund)
  if (paid <= 0) return 0
  return positive(getRefundReturnAmount(refund) - paid)
}

function dateKey(value: any) {
  if (!value) return ''
  return String(value).slice(0, 10)
}

let rawOrders: any[] = []
let rawSubs: any[] = []
let rawIssues: any[] = []
let rawRefunds: any[] = []
let rawGiftCards: any[] = []
let sellRateByDate: Record<string, number> = {}
let latestSellRate = 0
let usingMockSellRate = false

/** 库表未就绪时，与汇率管理页同口径的示意卖出价，仅用于本页展示 */
const MOCK_SELL_RATES: Array<{ rate_date_offset: number; usd_cash_sell_rate: number }> = [
  { rate_date_offset: 1, usd_cash_sell_rate: 7.2789 },
  { rate_date_offset: 2, usd_cash_sell_rate: 7.2712 },
]

async function reload() {
  loading.value = true
  try {
    await Promise.all([
      loadOrders(),
      loadSubOrders(),
      loadPrincipalSources(),
      loadGiftCards(),
      loadSellRates(),
    ])
    computeAll()
  } finally {
    loading.value = false
  }
}

async function loadOrders() {
  let q = supabase
    .from('erp_orders')
    .select('id, order_number, customer_name, product_name, order_quantity, total_amount, product_cost_cny, exchange_rate, product_price, commission_fee, unit_price, order_type, order_types, type_quantities, price_no_review, price_text, price_image, price_video, price_feedback, created_at')
  if (dateRange.value) {
    q = q.gte('created_at', dateRange.value[0].format('YYYY-MM-DD'))
    q = q.lte('created_at', dateRange.value[1].format('YYYY-MM-DD') + 'T23:59:59')
  }
  if (customerFilter.value) q = q.ilike('customer_name', `%${customerFilter.value}%`)
  const { data } = await q.order('created_at', { ascending: false })
  rawOrders = data || []
}

async function loadSubOrders() {
  const { data, error } = await supabase
    .from('sub_orders')
    .select('id, order_id, status, actual_paid, product_price')
  if (error) {
    console.warn('利润分析加载子订单失败:', error.message)
    rawSubs = []
    return
  }
  rawSubs = data || []
}

async function loadPrincipalSources() {
  const [{ data: issues }, { data: refunds }] = await Promise.all([
    supabase.from('after_sale_issues').select('id, order_id, sub_order_id, issue_status, issue_type, principal_status, principal_amount, loss_amount, profit_diff, recovered_amount, principal_stolen, created_at'),
    supabase.from('refund_requests').select('id, order_id, sub_order_id, refund_method, refund_category, refund_reason, notes, actual_paid_usd, actual_paid, product_price, gift_card_face_value_usd, refund_amount_usd, refund_amount, created_at'),
  ])
  rawIssues = issues || []
  rawRefunds = refunds || []
}

async function loadGiftCards() {
  const { data } = await supabase
    .from('gift_cards')
    .select('id, exchange_rate, actual_cost, face_value_usd, used_for_sub_order_id, status')
    .not('used_for_sub_order_id', 'is', null)
  rawGiftCards = data || []
}

function applySellRateRows(rows: Array<{ rate_date: string; usd_cash_sell_rate: number }>, mock = false) {
  sellRateByDate = {}
  latestSellRate = 0
  usingMockSellRate = mock
  for (const row of rows) {
    const key = dateKey(row.rate_date)
    const rate = Number(row.usd_cash_sell_rate || 0)
    if (!key || rate <= 0) continue
    sellRateByDate[key] = rate
    if (!latestSellRate) latestSellRate = rate
  }
}

async function loadSellRates() {
  const { data, error } = await supabase
    .from('exchange_rate_daily_snapshots')
    .select('rate_date, usd_cash_sell_rate')
    .order('rate_date', { ascending: false })
  if (!error && data && data.length) {
    applySellRateRows(data.map((row: any) => ({
      rate_date: String(row.rate_date || ''),
      usd_cash_sell_rate: Number(row.usd_cash_sell_rate || 0),
    })))
    return
  }
  const today = new Date()
  applySellRateRows(
    MOCK_SELL_RATES.map((row) => {
      const d = new Date(today)
      d.setDate(d.getDate() - row.rate_date_offset)
      return {
        rate_date: d.toISOString().slice(0, 10),
        usd_cash_sell_rate: row.usd_cash_sell_rate,
      }
    }),
    true,
  )
  // 无快照日期命中时，仍用最近示意卖出价兜底
  if (!latestSellRate) latestSellRate = MOCK_SELL_RATES[0].usd_cash_sell_rate
}

function getSellRateForDate(createdAt: string) {
  const key = dateKey(createdAt)
  if (key && sellRateByDate[key]) return sellRateByDate[key]
  // 无当日快照时沿用最近一日卖出价
  return latestSellRate || 0
}

function getGiftCardRate(card: any) {
  const face = Number(card?.face_value_usd || 0)
  const cost = Number(card?.actual_cost || 0)
  if (face > 0 && cost > 0) return cost / face
  return Number(card?.exchange_rate || 0)
}

function resolveActualRate(order: any, orderSubs: any[], giftCardBySubId: Record<string, any>) {
  const giftCards = orderSubs
    .map((sub) => giftCardBySubId[sub.id])
    .filter(Boolean)
  if (giftCards.length) {
    const rates = giftCards.map(getGiftCardRate).filter((r: number) => r > 0)
    if (rates.length) {
      const avg = rates.reduce((a: number, b: number) => a + b, 0) / rates.length
      return { rate: avg, source: '礼品卡成本' }
    }
  }
  const sell = getSellRateForDate(order.created_at)
  if (sell > 0) {
    return {
      rate: sell,
      source: usingMockSellRate ? '现汇卖出价(示意)' : '现汇卖出价',
    }
  }
  return { rate: 0, source: '-' }
}

function computeAll() {
  const orderIds = new Set(rawOrders.map((o) => o.id))
  const excludedSubIds = new Set<string>()
  for (const issue of rawIssues) {
    if (!issue?.sub_order_id || !isExcludedIssueStatus(issue.issue_status)) continue
    excludedSubIds.add(String(issue.sub_order_id))
  }

  const subsByOrder: Record<string, any[]> = {}
  for (const sub of rawSubs) {
    if (!sub.order_id || (orderIds.size && !orderIds.has(sub.order_id))) continue
    if (!subsByOrder[sub.order_id]) subsByOrder[sub.order_id] = []
    subsByOrder[sub.order_id].push(sub)
  }

  const giftCardBySubId: Record<string, any> = {}
  for (const card of rawGiftCards) {
    if (card.used_for_sub_order_id) giftCardBySubId[card.used_for_sub_order_id] = card
    if (card.id) giftCardBySubId[`card:${card.id}`] = card
  }

  const principalByOrder: Record<string, number> = {}
  const addPrincipal = (orderId: string | null | undefined, amountFx: number, rate: number) => {
    if (!orderId || !orderIds.has(orderId) || !amountFx) return
    const cny = amountFx * (rate > 0 ? rate : (latestSellRate || 1))
    principalByOrder[orderId] = (principalByOrder[orderId] || 0) + cny
  }

  const orderRateMap: Record<string, number> = {}
  for (const o of rawOrders) orderRateMap[o.id] = Number(o.exchange_rate || 0)

  for (const issue of rawIssues) {
    const netFx = getIssueShortRefund(issue) - getIssueLostPrincipal(issue) - getIssueManualOverRefund(issue)
    addPrincipal(issue.order_id, netFx, orderRateMap[issue.order_id] || latestSellRate)
  }
  for (const refund of rawRefunds) {
    const overFx = getRefundOverAmount(refund)
    if (!overFx) continue
    addPrincipal(refund.order_id, -overFx, orderRateMap[refund.order_id] || latestSellRate)
  }

  let totalCommission = 0
  let totalFx = 0
  let totalPrincipal = 0
  const custMap: Record<string, CustomerRow> = {}
  const orders: OrderRow[] = []

  for (const o of rawOrders) {
    const acceptRate = Number(o.exchange_rate || 0)
    const orderSubs = subsByOrder[o.id] || []
    const doneSubs = orderSubs.filter((sub) => isDoneSubOrder(sub) && !excludedSubIds.has(String(sub.id)))
    const doneQty = doneSubs.length
    const actualPaid = doneSubs.reduce((sum, sub) => sum + positive(sub.actual_paid), 0)
    const paidForeign = actualPaid > 0 ? actualPaid : positive(o.product_price) * doneQty
    const { rate: actualRate } = resolveActualRate(o, doneSubs, giftCardBySubId)
    const commissionProfit = getCommissionByDoneQty(o, doneQty)
    const fxProfit = actualRate > 0 && paidForeign > 0 ? (acceptRate - actualRate) * paidForeign : 0
    const principalNet = principalByOrder[o.id] || 0
    const grossProfit = commissionProfit + fxProfit + principalNet

    totalCommission += commissionProfit
    totalFx += fxProfit
    totalPrincipal += principalNet

    orders.push({
      id: o.id,
      order_number: o.order_number || '-',
      customer_name: o.customer_name || '-',
      product_name: o.product_name || '-',
      done_quantity: doneQty,
      commissionProfit,
      fxProfit,
      principalNet,
      grossProfit,
      created_at: o.created_at,
    })

    const cn = o.customer_name || '未知客户'
    if (!custMap[cn]) {
      custMap[cn] = {
        customer_name: cn,
        orderCount: 0,
        commissionProfit: 0,
        fxProfit: 0,
        principalNet: 0,
        grossProfit: 0,
      }
    }
    custMap[cn].orderCount += 1
    custMap[cn].commissionProfit += commissionProfit
    custMap[cn].fxProfit += fxProfit
    custMap[cn].principalNet += principalNet
    custMap[cn].grossProfit += grossProfit
  }

  overview.commissionProfit = totalCommission
  overview.fxProfit = totalFx
  overview.principalNet = totalPrincipal
  overview.grossProfit = totalCommission + totalFx + totalPrincipal

  customerData.value = Object.values(custMap).sort((a, b) => b.grossProfit - a.grossProfit)
  orderData.value = orders
  orderPage.value = 1
}

onMounted(() => reload())
</script>

<style scoped>
.page-content { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin: 0; }

.filter-bar { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }

.kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
.kpi-card {
  background: #fff;
  border-radius: 10px;
  padding: 18px;
  text-align: center;
  box-shadow: 0 1px 4px rgba(0,0,0,.06);
  border: 1px solid #f0f0f0;
}
.kpi-val { font-size: 22px; font-weight: 700; color: #2563eb; }
.kpi-val.green { color: #059669; }
.kpi-val.red { color: #dc2626; }
.kpi-val.blue { color: #2563eb; }
.kpi-val.orange { color: #d97706; }
.kpi-label { font-size: 12px; color: #6b7280; margin-top: 4px; }

.formula { display: flex; align-items: flex-start; gap: 8px; }
.formula-label { font-weight: 600; color: #1a1a2e; white-space: nowrap; }
.formula-text { color: #6b7280; font-size: 13px; line-height: 1.6; }

.amount-in { color: #059669; font-weight: 600; }
.amount-out { color: #dc2626; font-weight: 600; }
.text-muted { color: #9ca3af; }
</style>
