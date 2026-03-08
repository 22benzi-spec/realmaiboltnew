<template>
  <div class="page-content">
    <div class="page-header">
      <h2 class="page-title">利润分析</h2>
    </div>

    <!-- 筛选 -->
    <div class="filter-bar">
      <a-range-picker v-model:value="dateRange" @change="reload" style="width:260px" />
      <a-input v-model:value="customerFilter" placeholder="客户名称" style="width:180px" allow-clear @change="reload" />
      <a-button @click="reload" :loading="loading">查询</a-button>
    </div>

    <!-- 总览卡片 -->
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-val blue">¥{{ formatNum(overview.orderIncome) }}</div>
        <div class="kpi-label">订单收入 (客户应付)</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val orange">¥{{ formatNum(overview.productCost) }}</div>
        <div class="kpi-label">产品成本</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val red">¥{{ formatNum(overview.refundTotal) }}</div>
        <div class="kpi-label">退款支出</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" :class="overview.grossProfit >= 0 ? 'green' : 'red'">
          ¥{{ formatNum(overview.grossProfit) }}
        </div>
        <div class="kpi-label">毛利润</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" :class="overview.profitRate >= 0 ? 'green' : 'red'">
          {{ overview.profitRate.toFixed(1) }}%
        </div>
        <div class="kpi-label">利润率</div>
      </div>
    </div>

    <!-- 利润构成说明 -->
    <a-card size="small" style="margin-bottom:20px">
      <div class="formula">
        <span class="formula-label">利润计算公式：</span>
        <span class="formula-text">
          毛利润 = 订单收入(total_amount) - 产品成本(product_cost_cny x 数量) - 退款支出
        </span>
      </div>
    </a-card>

    <!-- Tab: 按客户 / 按订单 -->
    <a-tabs v-model:activeKey="activeTab">
      <!-- 按客户汇总 -->
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
            <template v-if="column.key === 'profit'">
              <span :class="record.profit >= 0 ? 'amount-in' : 'amount-out'">
                ¥{{ formatNum(record.profit) }}
              </span>
            </template>
            <template v-if="column.key === 'profitRate'">
              <span :class="record.profitRate >= 0 ? 'amount-in' : 'amount-out'">
                {{ record.profitRate.toFixed(1) }}%
              </span>
            </template>
          </template>
        </a-table>
      </a-tab-pane>

      <!-- 按订单明细 -->
      <a-tab-pane key="order" tab="按订单明细">
        <a-table
          :columns="orderColumns"
          :data-source="orderData"
          :loading="loading"
          :pagination="{ current: orderPage, pageSize: 20, total: orderData.length, showTotal: (t:number) => `共 ${t} 条` }"
          row-key="id"
          size="middle"
          :scroll="{ x: 1200 }"
          @change="(p:any) => orderPage = p.current"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'income'">
              <span class="amount-in">¥{{ formatNum(record.income) }}</span>
            </template>
            <template v-if="column.key === 'cost'">
              <span class="amount-out">¥{{ formatNum(record.cost) }}</span>
            </template>
            <template v-if="column.key === 'refundAmount'">
              <span v-if="record.refundAmount > 0" class="amount-out">¥{{ formatNum(record.refundAmount) }}</span>
              <span v-else class="text-muted">-</span>
            </template>
            <template v-if="column.key === 'profit'">
              <span :class="record.profit >= 0 ? 'amount-in' : 'amount-out'">
                ¥{{ formatNum(record.profit) }}
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

const overview = reactive({ orderIncome: 0, productCost: 0, refundTotal: 0, grossProfit: 0, profitRate: 0 })

interface CustomerRow { customer_name: string; orderCount: number; income: number; cost: number; refund: number; profit: number; profitRate: number }
interface OrderRow { id: string; order_number: string; customer_name: string; product_name: string; order_quantity: number; income: number; cost: number; refundAmount: number; profit: number; created_at: string }

const customerData = ref<CustomerRow[]>([])
const orderData = ref<OrderRow[]>([])

const customerColumns = [
  { title: '客户', dataIndex: 'customer_name', key: 'customer_name', width: 140 },
  { title: '订单数', dataIndex: 'orderCount', key: 'orderCount', width: 80 },
  { title: '订单收入', dataIndex: 'income', key: 'income', width: 130, customRender: ({ text }: any) => `¥${formatNum(text)}` },
  { title: '产品成本', dataIndex: 'cost', key: 'cost', width: 130, customRender: ({ text }: any) => `¥${formatNum(text)}` },
  { title: '退款支出', dataIndex: 'refund', key: 'refund', width: 130, customRender: ({ text }: any) => `¥${formatNum(text)}` },
  { title: '利润', key: 'profit', width: 130 },
  { title: '利润率', key: 'profitRate', width: 90 },
]

const orderColumns = [
  { title: '订单号', dataIndex: 'order_number', key: 'order_number', width: 150 },
  { title: '客户', dataIndex: 'customer_name', key: 'customer_name', width: 120, ellipsis: true },
  { title: '产品', dataIndex: 'product_name', key: 'product_name', width: 140, ellipsis: true },
  { title: '数量', dataIndex: 'order_quantity', key: 'order_quantity', width: 70 },
  { title: '订单收入', key: 'income', width: 120 },
  { title: '产品成本', key: 'cost', width: 120 },
  { title: '退款', key: 'refundAmount', width: 110 },
  { title: '利润', key: 'profit', width: 120 },
  { title: '创建日期', dataIndex: 'created_at', key: 'created_at', width: 100, customRender: ({ text }: any) => text?.slice(0, 10) },
]

function formatNum(n: number) {
  return (n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function reload() {
  loading.value = true
  try {
    await Promise.all([loadOrders(), loadRefunds()])
    computeAll()
  } finally { loading.value = false }
}

let rawOrders: any[] = []
let rawRefunds: any[] = []

async function loadOrders() {
  let q = supabase.from('erp_orders').select('id, order_number, customer_name, product_name, order_quantity, total_amount, product_cost_cny, exchange_rate, product_price, created_at')
  if (dateRange.value) {
    q = q.gte('created_at', dateRange.value[0].format('YYYY-MM-DD'))
    q = q.lte('created_at', dateRange.value[1].format('YYYY-MM-DD') + 'T23:59:59')
  }
  if (customerFilter.value) q = q.ilike('customer_name', `%${customerFilter.value}%`)
  const { data } = await q.order('created_at', { ascending: false })
  rawOrders = data || []
}

async function loadRefunds() {
  let q = supabase.from('refund_requests').select('order_id, refund_amount, status')
    .eq('status', '已处理')
  const { data } = await q
  rawRefunds = data || []
}

function computeAll() {
  const refundByOrder: Record<string, number> = {}
  for (const r of rawRefunds) {
    if (!r.order_id) continue
    refundByOrder[r.order_id] = (refundByOrder[r.order_id] || 0) + Number(r.refund_amount || 0)
  }

  let totalIncome = 0, totalCost = 0, totalRefund = 0
  const custMap: Record<string, CustomerRow> = {}
  const orders: OrderRow[] = []

  for (const o of rawOrders) {
    const qty = Number(o.order_quantity || 0)
    const income = Number(o.total_amount || 0)
    const costPerUnit = Number(o.product_cost_cny || 0)
    const cost = costPerUnit * qty
    const refAmt = refundByOrder[o.id] || 0
    const profit = income - cost - refAmt

    totalIncome += income
    totalCost += cost
    totalRefund += refAmt

    orders.push({
      id: o.id,
      order_number: o.order_number || '-',
      customer_name: o.customer_name || '-',
      product_name: o.product_name || '-',
      order_quantity: qty,
      income,
      cost,
      refundAmount: refAmt,
      profit,
      created_at: o.created_at,
    })

    const cn = o.customer_name || '未知客户'
    if (!custMap[cn]) custMap[cn] = { customer_name: cn, orderCount: 0, income: 0, cost: 0, refund: 0, profit: 0, profitRate: 0 }
    custMap[cn].orderCount += 1
    custMap[cn].income += income
    custMap[cn].cost += cost
    custMap[cn].refund += refAmt
  }

  for (const c of Object.values(custMap)) {
    c.profit = c.income - c.cost - c.refund
    c.profitRate = c.income > 0 ? (c.profit / c.income) * 100 : 0
  }

  overview.orderIncome = totalIncome
  overview.productCost = totalCost
  overview.refundTotal = totalRefund
  overview.grossProfit = totalIncome - totalCost - totalRefund
  overview.profitRate = totalIncome > 0 ? (overview.grossProfit / totalIncome) * 100 : 0

  customerData.value = Object.values(custMap).sort((a, b) => b.income - a.income)
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

.kpi-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; margin-bottom: 20px; }
.kpi-card { background: #fff; border-radius: 10px; padding: 18px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,.06); border: 1px solid #f0f0f0; }
.kpi-val { font-size: 22px; font-weight: 700; color: #1677ff; }
.kpi-val.green { color: #52c41a; }
.kpi-val.red { color: #ff4d4f; }
.kpi-val.blue { color: #1677ff; }
.kpi-val.orange { color: #fa8c16; }
.kpi-label { font-size: 12px; color: #8c8c8c; margin-top: 4px; }

.formula { display: flex; align-items: center; gap: 8px; }
.formula-label { font-weight: 600; color: #555; white-space: nowrap; }
.formula-text { color: #888; font-size: 13px; }

.amount-in { color: #52c41a; font-weight: 600; }
.amount-out { color: #ff4d4f; font-weight: 600; }
.text-muted { color: #bbb; }
</style>
