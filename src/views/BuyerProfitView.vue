<template>
  <div class="page-content">
    <h1 class="page-title">买手盈亏分析</h1>

    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-val stat-total">{{ summaryStats.totalIssues }}</div>
        <div class="stat-label">总问题单</div>
      </div>
      <div class="stat-card">
        <div class="stat-val stat-stolen">${{ summaryStats.totalStolen.toFixed(2) }}</div>
        <div class="stat-label">总被骗本金</div>
      </div>
      <div class="stat-card">
        <div class="stat-val stat-profit">${{ summaryStats.totalProfit.toFixed(2) }}</div>
        <div class="stat-label">总差价盈利</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" :class="summaryStats.netPL >= 0 ? 'stat-profit' : 'stat-stolen'">
          {{ summaryStats.netPL >= 0 ? '+' : '' }}${{ summaryStats.netPL.toFixed(2) }}
        </div>
        <div class="stat-label">净盈亏</div>
      </div>
    </div>

    <div class="card-panel">
      <div class="toolbar">
        <a-radio-group v-model:value="viewDimension" @change="recalc">
          <a-radio-button value="buyer">按买手</a-radio-button>
          <a-radio-button value="staff">按业务员</a-radio-button>
          <a-radio-button value="monthly">按月份</a-radio-button>
        </a-radio-group>
        <a-range-picker
          v-model:value="dateRange"
          :placeholder="['开始日期', '结束日期']"
          style="width:240px"
          @change="loadData"
          allow-clear
        />
        <a-input-search v-model:value="filterSearch" placeholder="搜索买手/业务员..." style="width:200px" @search="recalc" allow-clear />
        <a-button @click="loadData"><ReloadOutlined /> 刷新</a-button>
      </div>

      <template v-if="viewDimension === 'buyer'">
        <a-table
          :columns="buyerColumns"
          :data-source="buyerData"
          :loading="loading"
          row-key="buyer_id"
          size="middle"
          :scroll="{ x: 1100 }"
          :pagination="{ pageSize: 20 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'buyer'">
              <div class="cell-buyer-name">{{ record.buyer_name }}</div>
              <div class="cell-meta">{{ record.buyer_number }}</div>
            </template>
            <template v-if="column.key === 'stolen_amount'">
              <span :class="record.stolen_amount > 0 ? 'amount-loss' : 'text-gray'">
                {{ record.stolen_amount > 0 ? '-$' + record.stolen_amount.toFixed(2) : '$0.00' }}
              </span>
            </template>
            <template v-if="column.key === 'profit_diff'">
              <span :class="record.profit_diff > 0 ? 'amount-profit' : 'text-gray'">
                {{ record.profit_diff > 0 ? '+$' + record.profit_diff.toFixed(2) : '$0.00' }}
              </span>
            </template>
            <template v-if="column.key === 'net'">
              <span :class="record.net >= 0 ? 'amount-profit' : 'amount-loss'" class="net-amount">
                {{ record.net >= 0 ? '+' : '' }}${{ record.net.toFixed(2) }}
              </span>
            </template>
            <template v-if="column.key === 'status'">
              <a-tag :color="record.buyer_status === '黑名单' ? 'red' : record.buyer_status === '暂停' ? 'orange' : 'green'">
                {{ record.buyer_status }}
              </a-tag>
            </template>
          </template>
        </a-table>
      </template>

      <template v-else-if="viewDimension === 'staff'">
        <a-table
          :columns="staffColumns"
          :data-source="staffData"
          :loading="loading"
          row-key="staff_id"
          size="middle"
          :scroll="{ x: 1000 }"
          :pagination="{ pageSize: 20 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'stolen_amount'">
              <span :class="record.stolen_amount > 0 ? 'amount-loss' : 'text-gray'">
                {{ record.stolen_amount > 0 ? '-$' + record.stolen_amount.toFixed(2) : '$0.00' }}
              </span>
            </template>
            <template v-if="column.key === 'profit_diff'">
              <span :class="record.profit_diff > 0 ? 'amount-profit' : 'text-gray'">
                {{ record.profit_diff > 0 ? '+$' + record.profit_diff.toFixed(2) : '$0.00' }}
              </span>
            </template>
            <template v-if="column.key === 'net'">
              <span :class="record.net >= 0 ? 'amount-profit' : 'amount-loss'" class="net-amount">
                {{ record.net >= 0 ? '+' : '' }}${{ record.net.toFixed(2) }}
              </span>
            </template>
          </template>
        </a-table>
      </template>

      <template v-else>
        <a-table
          :columns="monthlyColumns"
          :data-source="monthlyData"
          :loading="loading"
          row-key="month"
          size="middle"
          :scroll="{ x: 1000 }"
          :pagination="false"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'stolen_amount'">
              <span :class="record.stolen_amount > 0 ? 'amount-loss' : 'text-gray'">
                {{ record.stolen_amount > 0 ? '-$' + record.stolen_amount.toFixed(2) : '$0.00' }}
              </span>
            </template>
            <template v-if="column.key === 'profit_diff'">
              <span :class="record.profit_diff > 0 ? 'amount-profit' : 'text-gray'">
                {{ record.profit_diff > 0 ? '+$' + record.profit_diff.toFixed(2) : '$0.00' }}
              </span>
            </template>
            <template v-if="column.key === 'net'">
              <span :class="record.net >= 0 ? 'amount-profit' : 'amount-loss'" class="net-amount">
                {{ record.net >= 0 ? '+' : '' }}${{ record.net.toFixed(2) }}
              </span>
            </template>
          </template>
        </a-table>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

const loading = ref(false)
const viewDimension = ref<'buyer' | 'staff' | 'monthly'>('buyer')
const dateRange = ref<[dayjs.Dayjs, dayjs.Dayjs] | null>(null)
const filterSearch = ref('')

const rawIssues = ref<any[]>([])
const buyerData = ref<any[]>([])
const staffData = ref<any[]>([])
const monthlyData = ref<any[]>([])
const summaryStats = ref({ totalIssues: 0, totalStolen: 0, totalProfit: 0, netPL: 0 })

const buyerColumns = [
  { title: '买手', key: 'buyer', width: 160 },
  { title: '业务员', dataIndex: 'staff_name', key: 'staff_name', width: 100 },
  { title: '问题单数', dataIndex: 'issue_count', key: 'issue_count', width: 90, sorter: (a: any, b: any) => a.issue_count - b.issue_count },
  { title: '被骗次数', dataIndex: 'stolen_count', key: 'stolen_count', width: 90, sorter: (a: any, b: any) => a.stolen_count - b.stolen_count },
  { title: '被骗本金', key: 'stolen_amount', width: 120, sorter: (a: any, b: any) => a.stolen_amount - b.stolen_amount },
  { title: '差价盈利', key: 'profit_diff', width: 120, sorter: (a: any, b: any) => a.profit_diff - b.profit_diff },
  { title: '净盈亏', key: 'net', width: 130, sorter: (a: any, b: any) => a.net - b.net, defaultSortOrder: 'ascend' as const },
  { title: '状态', key: 'status', width: 80 },
]

const staffColumns = [
  { title: '业务员', dataIndex: 'staff_name', key: 'staff_name', width: 120 },
  { title: '问题单数', dataIndex: 'issue_count', key: 'issue_count', width: 90, sorter: (a: any, b: any) => a.issue_count - b.issue_count },
  { title: '涉及买手数', dataIndex: 'buyer_count', key: 'buyer_count', width: 100 },
  { title: '被骗次数', dataIndex: 'stolen_count', key: 'stolen_count', width: 90, sorter: (a: any, b: any) => a.stolen_count - b.stolen_count },
  { title: '被骗本金', key: 'stolen_amount', width: 120, sorter: (a: any, b: any) => a.stolen_amount - b.stolen_amount },
  { title: '差价盈利', key: 'profit_diff', width: 120, sorter: (a: any, b: any) => a.profit_diff - b.profit_diff },
  { title: '净盈亏', key: 'net', width: 130, sorter: (a: any, b: any) => a.net - b.net, defaultSortOrder: 'ascend' as const },
]

const monthlyColumns = [
  { title: '月份', dataIndex: 'month', key: 'month', width: 120 },
  { title: '问题单数', dataIndex: 'issue_count', key: 'issue_count', width: 90 },
  { title: '被骗次数', dataIndex: 'stolen_count', key: 'stolen_count', width: 90 },
  { title: '被骗本金', key: 'stolen_amount', width: 120 },
  { title: '差价盈利', key: 'profit_diff', width: 120 },
  { title: '净盈亏', key: 'net', width: 130 },
]

async function loadData() {
  loading.value = true
  try {
    let query = supabase
      .from('after_sale_issues')
      .select('*')
      .order('created_at', { ascending: false })

    if (dateRange.value && dateRange.value[0] && dateRange.value[1]) {
      query = query.gte('created_at', dateRange.value[0].startOf('day').toISOString())
      query = query.lte('created_at', dateRange.value[1].endOf('day').toISOString())
    }

    const { data, error } = await query
    if (error) throw error
    rawIssues.value = data || []
    recalc()
  } finally {
    loading.value = false
  }
}

async function loadBuyerStatuses(buyerIds: string[]) {
  if (!buyerIds.length) return new Map()
  const { data } = await supabase
    .from('erp_buyers')
    .select('id, status, buyer_number')
    .in('id', buyerIds)
  const map = new Map<string, { status: string; buyer_number: string }>()
  ;(data || []).forEach(b => map.set(b.id, { status: b.status, buyer_number: b.buyer_number || '' }))
  return map
}

async function recalc() {
  const items = rawIssues.value
  const kw = filterSearch.value.toLowerCase()

  const filtered = kw
    ? items.filter(i =>
        (i.buyer_name || '').toLowerCase().includes(kw) ||
        (i.staff_name || '').toLowerCase().includes(kw)
      )
    : items

  let totalStolen = 0
  let totalProfit = 0
  filtered.forEach(i => {
    if (i.principal_stolen) totalStolen += Number(i.principal_amount || 0)
    totalProfit += Number(i.profit_diff || 0)
  })
  summaryStats.value = {
    totalIssues: filtered.length,
    totalStolen,
    totalProfit,
    netPL: totalProfit - totalStolen,
  }

  if (viewDimension.value === 'buyer') {
    const map = new Map<string, any>()
    filtered.forEach(i => {
      const key = i.buyer_id || 'unknown'
      if (!map.has(key)) {
        map.set(key, {
          buyer_id: key,
          buyer_name: i.buyer_name || '未知买手',
          buyer_number: '',
          staff_name: i.staff_name || '',
          issue_count: 0,
          stolen_count: 0,
          stolen_amount: 0,
          profit_diff: 0,
          net: 0,
          buyer_status: '活跃',
        })
      }
      const row = map.get(key)
      row.issue_count++
      if (i.principal_stolen) {
        row.stolen_count++
        row.stolen_amount += Number(i.principal_amount || 0)
      }
      row.profit_diff += Number(i.profit_diff || 0)
      row.net = row.profit_diff - row.stolen_amount
    })

    const buyerIds = [...map.keys()].filter(k => k !== 'unknown')
    const statusMap = await loadBuyerStatuses(buyerIds)
    map.forEach((row, key) => {
      const info = statusMap.get(key)
      if (info) {
        row.buyer_status = info.status
        row.buyer_number = info.buyer_number
      }
    })

    buyerData.value = [...map.values()].sort((a, b) => a.net - b.net)
  } else if (viewDimension.value === 'staff') {
    const map = new Map<string, any>()
    filtered.forEach(i => {
      const key = i.staff_id || 'unknown'
      if (!map.has(key)) {
        map.set(key, {
          staff_id: key,
          staff_name: i.staff_name || '未分配',
          issue_count: 0,
          buyer_set: new Set(),
          stolen_count: 0,
          stolen_amount: 0,
          profit_diff: 0,
          net: 0,
        })
      }
      const row = map.get(key)
      row.issue_count++
      if (i.buyer_id) row.buyer_set.add(i.buyer_id)
      if (i.principal_stolen) {
        row.stolen_count++
        row.stolen_amount += Number(i.principal_amount || 0)
      }
      row.profit_diff += Number(i.profit_diff || 0)
      row.net = row.profit_diff - row.stolen_amount
    })
    staffData.value = [...map.values()].map(r => ({
      ...r,
      buyer_count: r.buyer_set.size,
    })).sort((a, b) => a.net - b.net)
  } else {
    const map = new Map<string, any>()
    filtered.forEach(i => {
      const m = i.created_at ? dayjs(i.created_at).format('YYYY-MM') : '未知'
      if (!map.has(m)) {
        map.set(m, {
          month: m,
          issue_count: 0,
          stolen_count: 0,
          stolen_amount: 0,
          profit_diff: 0,
          net: 0,
        })
      }
      const row = map.get(m)
      row.issue_count++
      if (i.principal_stolen) {
        row.stolen_count++
        row.stolen_amount += Number(i.principal_amount || 0)
      }
      row.profit_diff += Number(i.profit_diff || 0)
      row.net = row.profit_diff - row.stolen_amount
    })
    monthlyData.value = [...map.values()].sort((a, b) => b.month.localeCompare(a.month))
  }
}

onMounted(loadData)
</script>

<style scoped>
.page-content { padding: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
.stat-card {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  text-align: center;
  border: 1px solid #f0f0f0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.stat-val { font-size: 22px; font-weight: 800; }
.stat-label { font-size: 12px; color: #6b7280; margin-top: 4px; }
.stat-total { color: #374151; }
.stat-stolen { color: #ef4444; }
.stat-profit { color: #10b981; }

.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }

.cell-buyer-name { font-weight: 600; color: #1a1a2e; }
.cell-meta { font-size: 11px; color: #9ca3af; }
.amount-loss { font-weight: 700; color: #ef4444; }
.amount-profit { font-weight: 700; color: #10b981; }
.net-amount { font-size: 14px; }
.text-gray { color: #9ca3af; }

@media (max-width: 767px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); gap: 8px; }
  .stat-card { padding: 10px; }
  .stat-val { font-size: 16px; }
}
</style>
