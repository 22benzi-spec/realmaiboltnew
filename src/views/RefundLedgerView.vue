<template>
  <div class="page-content">
    <h1 class="page-title">退款账单</h1>

    <a-tabs v-model:activeKey="activeTab" @change="onTabChange">
      <!-- 礼品卡退款 -->
      <a-tab-pane key="giftcard" tab="礼品卡退款">
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-num">{{ gcStats.count }}</div>
            <div class="stat-label">退款笔数</div>
          </div>
          <div class="stat-card highlight-gold">
            <div class="stat-num gold">${{ gcStats.totalUsd.toFixed(2) }}</div>
            <div class="stat-label">礼品卡总面额 (USD)</div>
          </div>
        </div>

        <div class="card-panel">
          <div class="toolbar">
            <a-range-picker v-model:value="gcDateRange" style="width:240px" @change="loadGiftCardRefunds" allow-clear />
            <a-input-search v-model:value="gcSearch" placeholder="搜索买手/子订单/产品" style="width:220px" allow-clear @search="loadGiftCardRefunds" />
            <a-button @click="loadGiftCardRefunds"><ReloadOutlined /></a-button>
            <span class="total-hint">共 {{ gcPagination.total }} 条</span>
          </div>

          <a-table
            :columns="gcColumns"
            :data-source="gcRecords"
            :loading="gcLoading"
            :pagination="gcPagination"
            row-key="id"
            size="middle"
            :scroll="{ x: 1100 }"
            @change="handleGcTableChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'order_info'">
                <div class="cell-info">
                  <div class="cell-subno">{{ record.sub_order_number || '—' }}</div>
                  <div class="cell-product">{{ record.product_name || '—' }}</div>
                  <div class="cell-meta">{{ record.asin || '' }}</div>
                </div>
              </template>
              <template v-if="column.key === 'buyer'">
                <div>{{ record.buyer_name || '—' }}</div>
              </template>
              <template v-if="column.key === 'refund_amount'">
                <span class="amount-usd">${{ Number(record.refund_amount_usd || 0).toFixed(2) }}</span>
              </template>
              <template v-if="column.key === 'gift_card'">
                <div class="gc-cell">
                  <div class="gc-number">{{ record.assigned_gift_card_number || '—' }}</div>
                  <div class="gc-code-text">{{ record.assigned_gift_card_code || '' }}</div>
                  <div v-if="record.gift_card_face_value_usd" class="gc-face">
                    面额 ${{ Number(record.gift_card_face_value_usd).toFixed(2) }}
                  </div>
                </div>
              </template>
              <template v-if="column.key === 'handled_at'">
                <span class="time-text">{{ fmtTime(record.handled_at) }}</span>
              </template>
              <template v-if="column.key === 'notes'">
                <span class="notes-text">{{ record.finance_notes || '—' }}</span>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>

      <!-- PayPal 退款 -->
      <a-tab-pane key="paypal" tab="PayPal 退款">
        <div class="stats-row">
          <div class="stat-card">
            <div class="stat-num">{{ ppStats.count }}</div>
            <div class="stat-label">退款笔数</div>
          </div>
          <div class="stat-card highlight-blue">
            <div class="stat-num blue">${{ ppStats.totalUsd.toFixed(2) }}</div>
            <div class="stat-label">退款总金额 (USD)</div>
          </div>
        </div>

        <div class="card-panel">
          <div class="toolbar">
            <a-range-picker v-model:value="ppDateRange" style="width:240px" @change="loadPaypalRefunds" allow-clear />
            <a-select v-model:value="ppAccountFilter" style="width:200px" allow-clear placeholder="全部 PayPal 账号" @change="loadPaypalRefunds">
              <a-select-option v-for="acc in ppAccountList" :key="acc.email" :value="acc.email">{{ acc.email }}</a-select-option>
            </a-select>
            <a-input-search v-model:value="ppSearch" placeholder="搜索买手/子订单/产品" style="width:220px" allow-clear @search="loadPaypalRefunds" />
            <a-button @click="loadPaypalRefunds"><ReloadOutlined /></a-button>
            <span class="total-hint">共 {{ ppPagination.total }} 条</span>
          </div>

          <a-table
            :columns="ppColumns"
            :data-source="ppRecords"
            :loading="ppLoading"
            :pagination="ppPagination"
            row-key="id"
            size="middle"
            :scroll="{ x: 1200 }"
            @change="handlePpTableChange"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'order_info'">
                <div class="cell-info">
                  <div class="cell-subno">{{ record.sub_order_number || '—' }}</div>
                  <div class="cell-product">{{ record.product_name || '—' }}</div>
                  <div class="cell-meta">{{ record.asin || '' }}</div>
                </div>
              </template>
              <template v-if="column.key === 'buyer'">
                <div>{{ record.buyer_name || '—' }}</div>
                <div v-if="record.buyer_paypal_email" class="cell-email">{{ record.buyer_paypal_email }}</div>
              </template>
              <template v-if="column.key === 'refund_amount'">
                <span class="amount-usd">${{ Number(record.refund_amount_usd || 0).toFixed(2) }}</span>
              </template>
              <template v-if="column.key === 'paypal_account'">
                <div class="pp-account">{{ record.assigned_paypal_email || '—' }}</div>
              </template>
              <template v-if="column.key === 'screenshot'">
                <a v-if="record.paypal_receipt_screenshot" :href="record.paypal_receipt_screenshot" target="_blank" class="screenshot-link">查看截图</a>
                <span v-else class="text-gray">—</span>
              </template>
              <template v-if="column.key === 'handled_at'">
                <span class="time-text">{{ fmtTime(record.handled_at) }}</span>
              </template>
              <template v-if="column.key === 'notes'">
                <span class="notes-text">{{ record.finance_notes || '—' }}</span>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

const activeTab = ref('giftcard')

const gcLoading = ref(false)
const gcRecords = ref<any[]>([])
const gcSearch = ref('')
const gcDateRange = ref<any>(null)
const gcPagination = ref({ current: 1, pageSize: 20, total: 0, showSizeChanger: true, showTotal: (t: number) => `共 ${t} 条` })

const ppLoading = ref(false)
const ppRecords = ref<any[]>([])
const ppSearch = ref('')
const ppDateRange = ref<any>(null)
const ppAccountFilter = ref('')
const ppAccountList = ref<any[]>([])
const ppPagination = ref({ current: 1, pageSize: 20, total: 0, showSizeChanger: true, showTotal: (t: number) => `共 ${t} 条` })

const gcAllStats = ref<any[]>([])
const ppAllStats = ref<any[]>([])

const gcStats = computed(() => {
  const data = gcAllStats.value
  return {
    count: data.length,
    totalUsd: data.reduce((s, r) => s + Number(r.gift_card_face_value_usd || r.refund_amount_usd || 0), 0),
  }
})

const ppStats = computed(() => {
  const data = ppAllStats.value
  return {
    count: data.length,
    totalUsd: data.reduce((s, r) => s + Number(r.refund_amount_usd || 0), 0),
  }
})

const gcColumns = [
  { title: '子订单 / 产品', key: 'order_info', width: 200 },
  { title: '买手', key: 'buyer', width: 130 },
  { title: '退款金额', key: 'refund_amount', width: 100 },
  { title: '礼品卡卡号 / 卡码', key: 'gift_card', width: 200 },
  { title: '处理时间', key: 'handled_at', width: 140 },
  { title: '财务备注', key: 'notes' },
]

const ppColumns = [
  { title: '子订单 / 产品', key: 'order_info', width: 200 },
  { title: '买手', key: 'buyer', width: 150 },
  { title: '退款金额', key: 'refund_amount', width: 100 },
  { title: '付款 PayPal', key: 'paypal_account', width: 200 },
  { title: '截图', key: 'screenshot', width: 80 },
  { title: '处理时间', key: 'handled_at', width: 140 },
  { title: '财务备注', key: 'notes' },
]

function fmtTime(t: string | null) {
  if (!t) return '—'
  return dayjs(t).format('YYYY-MM-DD HH:mm')
}

function buildDateFilter(query: any, field: string, range: any) {
  if (range && range[0] && range[1]) {
    query = query.gte(field, range[0].format('YYYY-MM-DD'))
    query = query.lte(field, range[1].format('YYYY-MM-DD') + 'T23:59:59')
  }
  return query
}

async function loadGiftCardRefunds() {
  gcLoading.value = true
  try {
    let query = supabase
      .from('refund_requests')
      .select('id, sub_order_number, product_name, asin, buyer_name, refund_amount_usd, assigned_gift_card_number, assigned_gift_card_code, gift_card_face_value_usd, handled_at, finance_notes', { count: 'exact' })
      .eq('status', '已处理')
      .eq('refund_method', '礼品卡')
      .order('handled_at', { ascending: false })
    query = buildDateFilter(query, 'handled_at', gcDateRange.value)
    if (gcSearch.value) {
      const kw = `%${gcSearch.value}%`
      query = query.or(`buyer_name.ilike.${kw},sub_order_number.ilike.${kw},product_name.ilike.${kw}`)
    }
    const from = (gcPagination.value.current - 1) * gcPagination.value.pageSize
    query = query.range(from, from + gcPagination.value.pageSize - 1)
    const { data, count, error } = await query
    if (error) throw error
    gcRecords.value = data || []
    gcPagination.value.total = count || 0
  } finally {
    gcLoading.value = false
  }
}

async function loadGiftCardStats() {
  let query = supabase
    .from('refund_requests')
    .select('refund_amount_usd, gift_card_face_value_usd')
    .eq('status', '已处理')
    .eq('refund_method', '礼品卡')
  query = buildDateFilter(query, 'handled_at', gcDateRange.value)
  const { data } = await query
  gcAllStats.value = data || []
}

async function loadPaypalRefunds() {
  ppLoading.value = true
  try {
    let query = supabase
      .from('refund_requests')
      .select('id, sub_order_number, product_name, asin, buyer_name, buyer_paypal_email, refund_amount_usd, assigned_paypal_email, paypal_receipt_screenshot, handled_at, finance_notes', { count: 'exact' })
      .eq('status', '已处理')
      .eq('refund_method', 'PayPal')
      .order('handled_at', { ascending: false })
    query = buildDateFilter(query, 'handled_at', ppDateRange.value)
    if (ppAccountFilter.value) query = query.eq('assigned_paypal_email', ppAccountFilter.value)
    if (ppSearch.value) {
      const kw = `%${ppSearch.value}%`
      query = query.or(`buyer_name.ilike.${kw},sub_order_number.ilike.${kw},product_name.ilike.${kw}`)
    }
    const from = (ppPagination.value.current - 1) * ppPagination.value.pageSize
    query = query.range(from, from + ppPagination.value.pageSize - 1)
    const { data, count, error } = await query
    if (error) throw error
    ppRecords.value = data || []
    ppPagination.value.total = count || 0
  } finally {
    ppLoading.value = false
  }
}

async function loadPaypalStats() {
  let query = supabase
    .from('refund_requests')
    .select('refund_amount_usd')
    .eq('status', '已处理')
    .eq('refund_method', 'PayPal')
  query = buildDateFilter(query, 'handled_at', ppDateRange.value)
  const { data } = await query
  ppAllStats.value = data || []
}

async function loadPaypalAccounts() {
  const { data } = await supabase.from('paypal_accounts').select('email').eq('status', '正常').order('email')
  ppAccountList.value = data || []
}

function handleGcTableChange(pag: any) {
  gcPagination.value.current = pag.current
  gcPagination.value.pageSize = pag.pageSize
  loadGiftCardRefunds()
}

function handlePpTableChange(pag: any) {
  ppPagination.value.current = pag.current
  ppPagination.value.pageSize = pag.pageSize
  loadPaypalRefunds()
}

function onTabChange(key: string) {
  if (key === 'giftcard') {
    loadGiftCardRefunds()
    loadGiftCardStats()
  } else {
    loadPaypalRefunds()
    loadPaypalStats()
  }
}

onMounted(() => {
  loadGiftCardRefunds()
  loadGiftCardStats()
  loadPaypalAccounts()
})
</script>

<style scoped>
.page-content { padding: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }

.stats-row {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  flex: 1;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 18px 24px;
  text-align: center;
}
.stat-card.highlight-gold { background: #fffbeb; border-color: #fde68a; }
.stat-card.highlight-blue { background: #eff6ff; border-color: #bfdbfe; }
.stat-card.highlight-cny { background: #f0fdf4; border-color: #bbf7d0; }

.stat-num { font-size: 26px; font-weight: 700; color: #1a1a2e; }
.stat-num.gold { color: #d97706; }
.stat-num.blue { color: #2563eb; }
.stat-num.cny { color: #16a34a; }
.stat-label { font-size: 12px; color: #6b7280; margin-top: 4px; }

.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.total-hint { font-size: 12px; color: #9ca3af; margin-left: auto; }

.cell-info { display: flex; flex-direction: column; gap: 2px; }
.cell-subno { font-family: 'Courier New', monospace; font-size: 11px; font-weight: 700; color: #1a1a2e; }
.cell-product { font-size: 12px; color: #374151; }
.cell-meta { font-size: 11px; color: #9ca3af; }
.cell-email { font-size: 11px; color: #6b7280; }

.amount-usd { font-weight: 700; color: #dc2626; font-size: 14px; }
.cost-cny { font-weight: 600; color: #16a34a; font-size: 13px; }
.text-gray { color: #9ca3af; font-size: 12px; }
.time-text { font-size: 12px; color: #374151; }
.notes-text { font-size: 12px; color: #6b7280; }

.gc-cell { display: flex; flex-direction: column; gap: 2px; }
.gc-number { font-family: 'Courier New', monospace; font-size: 11px; color: #374151; font-weight: 600; }
.gc-code-text { font-family: 'Courier New', monospace; font-size: 12px; color: #059669; font-weight: 700; }
.gc-face { font-size: 11px; color: #9ca3af; }

.pp-account { font-size: 12px; color: #374151; }
.screenshot-link { font-size: 12px; color: #2563eb; }
</style>
