<template>
  <div class="page-content">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">子订单明细</h1>
        <p class="page-desc">查看所有子订单明细，快速掌握今日出单情况</p>
      </div>
      <div class="header-stats" v-if="!loading">
        <div class="stat-card">
          <div class="stat-value">{{ filteredData.length }}</div>
          <div class="stat-label">显示订单</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ totalOrders }}</div>
          <div class="stat-label">总订单数</div>
        </div>
        <div class="stat-card accent">
          <div class="stat-value">{{ todayCount }}</div>
          <div class="stat-label">今日新增</div>
        </div>
        <div class="stat-card green">
          <div class="stat-value">{{ totalProductPrice }}</div>
          <div class="stat-label">产品总价($)</div>
        </div>
        <div class="stat-card blue">
          <div class="stat-value">{{ totalRefundAmount }}</div>
          <div class="stat-label">返款总额($)</div>
        </div>
      </div>
    </div>

    <div class="main-card">
      <div class="toolbar">
        <a-input-search
          v-model:value="searchText"
          placeholder="搜索ASIN/产品名/订单号/买手/业务员"
          style="width: 280px"
          allow-clear
          @search="applyFilters"
          @change="applyFilters"
        />
        <a-select
          v-model:value="filterSales"
          style="width: 140px"
          allow-clear
          placeholder="业务员"
          @change="applyFilters"
        >
          <a-select-option v-for="s in salesOptions" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-select
          v-model:value="filterStatus"
          style="width: 130px"
          allow-clear
          placeholder="状态"
          @change="applyFilters"
        >
          <a-select-option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-select
          v-model:value="filterType"
          style="width: 120px"
          allow-clear
          placeholder="类型"
          @change="applyFilters"
        >
          <a-select-option v-for="t in typeOptions" :key="t" :value="t">{{ t }}</a-select-option>
        </a-select>
        <a-select
          v-model:value="filterRefundMethod"
          style="width: 130px"
          allow-clear
          placeholder="返款方式"
          @change="applyFilters"
        >
          <a-select-option v-for="m in refundMethodOptions" :key="m" :value="m">{{ m }}</a-select-option>
        </a-select>
        <a-range-picker
          v-model:value="dateRange"
          style="width: 240px"
          :placeholder="['开始日期', '结束日期']"
          @change="applyFilters"
        />
        <a-button @click="resetFilters">重置</a-button>
        <a-button type="primary" @click="loadData">
          <template #icon><ReloadOutlined /></template>
          刷新
        </a-button>
        <a-button @click="exportCSV">
          <template #icon><DownloadOutlined /></template>
          导出
        </a-button>
      </div>

      <a-table
        :columns="columns"
        :data-source="filteredData"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 1800 }"
        row-key="id"
        size="small"
        @change="onTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'sub_order_number'">
            <span class="order-num">{{ record.sub_order_number }}</span>
          </template>

          <template v-else-if="column.key === 'asin'">
            <a
              v-if="record.asin"
              :href="'https://www.amazon.com/dp/' + record.asin"
              target="_blank"
              class="asin-link"
            >{{ record.asin }}</a>
            <span v-else class="empty-cell">-</span>
          </template>

          <template v-else-if="column.key === 'product_name'">
            <span class="product-name-cell" :title="record.product_name">
              {{ record.product_name || '-' }}
            </span>
          </template>

          <template v-else-if="column.key === 'sales_person'">
            <a-tag v-if="record.sales_person" color="blue">{{ record.sales_person }}</a-tag>
            <span v-else class="empty-cell">-</span>
          </template>

          <template v-else-if="column.key === 'buyer_name'">
            <span v-if="record.buyer_name" class="buyer-cell">{{ record.buyer_name }}</span>
            <span v-else class="empty-cell">未分配</span>
          </template>

          <template v-else-if="column.key === 'fb_link'">
            <a v-if="record.fb_link" :href="record.fb_link" target="_blank" class="fb-link">
              <LinkOutlined /> 链接
            </a>
            <span v-else class="empty-cell">-</span>
          </template>

          <template v-else-if="column.key === 'review_level'">
            <a-tag v-if="record.review_level" :color="getLevelColor(record.review_level)">
              {{ record.review_level }}
            </a-tag>
            <span v-else class="empty-cell">-</span>
          </template>

          <template v-else-if="column.key === 'order_type'">
            <a-tag :color="getTypeColor(record.order_type)">{{ record.order_type || '-' }}</a-tag>
          </template>

          <template v-else-if="column.key === 'product_price'">
            <span class="money-cell">${{ formatNum(record.product_price) }}</span>
          </template>

          <template v-else-if="column.key === 'actual_paid'">
            <span class="money-cell" v-if="record.actual_paid">
              ${{ formatNum(record.actual_paid) }}
            </span>
            <span v-else class="empty-cell">-</span>
          </template>

          <template v-else-if="column.key === 'refund_amount'">
            <span class="money-cell refund" v-if="record.refund_amount > 0">
              ${{ formatNum(record.refund_amount) }}
            </span>
            <span v-else class="empty-cell">-</span>
          </template>

          <template v-else-if="column.key === 'refund_method'">
            <a-tag v-if="record.refund_method" :color="getRefundMethodColor(record.refund_method)">
              {{ record.refund_method }}
            </a-tag>
            <span v-else class="empty-cell">-</span>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag :color="getStatusColor(record.status)">{{ record.status }}</a-tag>
          </template>

          <template v-else-if="column.key === 'notes'">
            <span class="notes-cell" :title="record.notes">{{ record.notes || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'created_at'">
            <span class="date-cell">{{ formatDate(record.created_at) }}</span>
          </template>
        </template>
      </a-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ReloadOutlined, DownloadOutlined, LinkOutlined } from '@ant-design/icons-vue'
import { supabase } from '../lib/supabase'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'

interface SubOrder {
  id: string
  sub_order_number: string
  asin: string
  product_name: string
  sales_person: string
  buyer_name: string
  fb_link: string
  review_level: string
  review_type: string
  order_type: string
  product_price: number
  actual_paid: number
  refund_amount: number
  refund_method: string
  status: string
  notes: string
  amazon_order_id: string
  created_at: string
}

const loading = ref(false)
const allData = ref<SubOrder[]>([])
const searchText = ref('')
const filterSales = ref<string | undefined>(undefined)
const filterStatus = ref<string | undefined>(undefined)
const filterType = ref<string | undefined>(undefined)
const filterRefundMethod = ref<string | undefined>(undefined)
const dateRange = ref<[Dayjs, Dayjs] | null>(null)

const pagination = ref({
  current: 1,
  pageSize: 50,
  showSizeChanger: true,
  pageSizeOptions: ['30', '50', '100', '200'],
  showTotal: (total: number) => `共 ${total} 条`,
})

const columns = [
  { title: '子订单号', key: 'sub_order_number', dataIndex: 'sub_order_number', width: 170, fixed: 'left' as const, sorter: (a: SubOrder, b: SubOrder) => a.sub_order_number.localeCompare(b.sub_order_number) },
  { title: 'ASIN', key: 'asin', dataIndex: 'asin', width: 140 },
  { title: '产品名称', key: 'product_name', dataIndex: 'product_name', width: 200, ellipsis: true },
  { title: '亚马逊单号', key: 'amazon_order_id', dataIndex: 'amazon_order_id', width: 170 },
  { title: '业务员', key: 'sales_person', dataIndex: 'sales_person', width: 100 },
  { title: '买手', key: 'buyer_name', dataIndex: 'buyer_name', width: 100 },
  { title: 'FB链接', key: 'fb_link', dataIndex: 'fb_link', width: 80, align: 'center' as const },
  { title: '测评等级', key: 'review_level', dataIndex: 'review_level', width: 90 },
  { title: '类型', key: 'order_type', dataIndex: 'order_type', width: 80 },
  { title: '产品售价', key: 'product_price', dataIndex: 'product_price', width: 100, align: 'right' as const, sorter: (a: SubOrder, b: SubOrder) => a.product_price - b.product_price },
  { title: '实付金额', key: 'actual_paid', dataIndex: 'actual_paid', width: 100, align: 'right' as const, sorter: (a: SubOrder, b: SubOrder) => (a.actual_paid || 0) - (b.actual_paid || 0) },
  { title: '返款金额', key: 'refund_amount', dataIndex: 'refund_amount', width: 100, align: 'right' as const, sorter: (a: SubOrder, b: SubOrder) => a.refund_amount - b.refund_amount },
  { title: '返款方式', key: 'refund_method', dataIndex: 'refund_method', width: 100 },
  { title: '状态', key: 'status', dataIndex: 'status', width: 90 },
  { title: '备注', key: 'notes', dataIndex: 'notes', width: 160, ellipsis: true },
  { title: '创建时间', key: 'created_at', dataIndex: 'created_at', width: 110, sorter: (a: SubOrder, b: SubOrder) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime() },
]

const salesOptions = computed(() => {
  const set = new Set<string>()
  allData.value.forEach(r => { if (r.sales_person) set.add(r.sales_person) })
  return Array.from(set).sort()
})

const statusOptions = computed(() => {
  const set = new Set<string>()
  allData.value.forEach(r => { if (r.status) set.add(r.status) })
  return Array.from(set).sort()
})

const typeOptions = computed(() => {
  const set = new Set<string>()
  allData.value.forEach(r => { if (r.order_type) set.add(r.order_type) })
  return Array.from(set).sort()
})

const refundMethodOptions = computed(() => {
  const set = new Set<string>()
  allData.value.forEach(r => { if (r.refund_method) set.add(r.refund_method) })
  return Array.from(set).sort()
})

const filteredData = computed(() => {
  let data = allData.value
  const q = searchText.value.trim().toLowerCase()
  if (q) {
    data = data.filter(r =>
      r.asin?.toLowerCase().includes(q) ||
      r.product_name?.toLowerCase().includes(q) ||
      r.sub_order_number?.toLowerCase().includes(q) ||
      r.buyer_name?.toLowerCase().includes(q) ||
      r.sales_person?.toLowerCase().includes(q) ||
      r.amazon_order_id?.toLowerCase().includes(q)
    )
  }
  if (filterSales.value) data = data.filter(r => r.sales_person === filterSales.value)
  if (filterStatus.value) data = data.filter(r => r.status === filterStatus.value)
  if (filterType.value) data = data.filter(r => r.order_type === filterType.value)
  if (filterRefundMethod.value) data = data.filter(r => r.refund_method === filterRefundMethod.value)
  if (dateRange.value) {
    const [start, end] = dateRange.value
    data = data.filter(r => {
      const d = dayjs(r.created_at)
      return d.isAfter(start.startOf('day')) && d.isBefore(end.endOf('day'))
    })
  }
  return data
})

const totalOrders = computed(() => allData.value.length)
const todayCount = computed(() => {
  const today = dayjs().startOf('day')
  return allData.value.filter(r => dayjs(r.created_at).isAfter(today)).length
})
const totalProductPrice = computed(() =>
  formatNum(filteredData.value.reduce((sum, r) => sum + (Number(r.product_price) || 0), 0))
)
const totalRefundAmount = computed(() =>
  formatNum(filteredData.value.reduce((sum, r) => sum + (Number(r.refund_amount) || 0), 0))
)

function formatNum(n: number | string): string {
  const num = Number(n) || 0
  return num.toFixed(2)
}

function formatDate(d: string): string {
  if (!d) return '-'
  return dayjs(d).format('MM-DD HH:mm')
}

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    '待分配': 'default', '已分配': 'processing', '进行中': 'processing',
    '已下单': 'cyan', '已送达': 'blue', '已评价': 'green',
    '已完成': 'green', '已取消': 'red', '异常': 'red',
  }
  return map[status] || 'default'
}

function getLevelColor(level: string): string {
  const map: Record<string, string> = {
    'S': 'gold', 'A': 'green', 'B': 'blue', 'C': 'default',
  }
  return map[level] || 'default'
}

function getTypeColor(type: string): string {
  const map: Record<string, string> = {
    '免评': 'cyan', '留评': 'orange', '直评': 'green',
    '真人测评': 'blue', '图片评': 'geekblue',
  }
  return map[type] || 'default'
}

function getRefundMethodColor(method: string): string {
  const map: Record<string, string> = {
    'PayPal': 'blue', '礼品卡': 'orange', '银行转账': 'green', '微信': 'green', '支付宝': 'cyan',
  }
  return map[method] || 'default'
}

async function loadData() {
  loading.value = true
  const { data } = await supabase
    .from('sub_orders')
    .select('id, sub_order_number, asin, product_name, sales_person, buyer_name, fb_link, review_level, review_type, order_type, product_price, actual_paid, refund_amount, refund_method, status, notes, amazon_order_id, created_at')
    .order('created_at', { ascending: false })
  allData.value = (data || []) as SubOrder[]
  loading.value = false
}

function applyFilters() {
  pagination.value.current = 1
}

function resetFilters() {
  searchText.value = ''
  filterSales.value = undefined
  filterStatus.value = undefined
  filterType.value = undefined
  filterRefundMethod.value = undefined
  dateRange.value = null
  pagination.value.current = 1
}

function onTableChange(pag: any) {
  pagination.value.current = pag.current
  pagination.value.pageSize = pag.pageSize
}

function exportCSV() {
  const headers = ['子订单号', 'ASIN', '产品名称', '亚马逊单号', '业务员', '买手', 'FB链接', '测评等级', '类型', '产品售价', '实付金额', '返款金额', '返款方式', '状态', '备注', '创建时间']
  const rows = filteredData.value.map(r => [
    r.sub_order_number, r.asin, r.product_name, r.amazon_order_id,
    r.sales_person, r.buyer_name, r.fb_link, r.review_level,
    r.order_type, r.product_price, r.actual_paid, r.refund_amount,
    r.refund_method, r.status, r.notes, formatDate(r.created_at),
  ])
  const csvContent = '\uFEFF' + [headers, ...rows].map(row =>
    row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')
  ).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `子订单明细_${dayjs().format('YYYYMMDD_HHmm')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

onMounted(loadData)
</script>

<style scoped lang="less">
.page-content {
  padding: 28px 32px;
  background: #f7f8fc;
  min-height: 100vh;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
  gap: 24px;
}

.page-title {
  font-size: 24px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 4px 0;
  letter-spacing: -0.5px;
}

.page-desc {
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
}

.header-stats {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.stat-card {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px 20px;
  text-align: center;
  min-width: 90px;
  transition: box-shadow .2s;
  &:hover { box-shadow: 0 2px 8px rgba(0,0,0,.06); }
  &.accent {
    border-color: #fed7aa;
    background: #fffbeb;
    .stat-value { color: #d97706; }
  }
  &.green {
    border-color: #bbf7d0;
    background: #f0fdf4;
    .stat-value { color: #16a34a; }
  }
  &.blue {
    border-color: #bfdbfe;
    background: #eff6ff;
    .stat-value { color: #2563eb; }
  }
}

.stat-value {
  font-size: 20px;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.2;
}

.stat-label {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 2px;
}

.main-card {
  background: #fff;
  border-radius: 14px;
  padding: 20px 24px;
  box-shadow: 0 1px 8px rgba(0,0,0,.05);
  border: 1px solid #e2e8f0;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f1f5f9;
}

.order-num {
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 12px;
  color: #334155;
  font-weight: 600;
}

.asin-link {
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 12px;
  color: #2563eb;
  text-decoration: none;
  &:hover { text-decoration: underline; }
}

.product-name-cell {
  font-size: 12px;
  color: #334155;
  display: block;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.buyer-cell {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.fb-link {
  font-size: 12px;
  color: #2563eb;
  text-decoration: none;
  &:hover { text-decoration: underline; }
}

.money-cell {
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
  &.refund { color: #dc2626; }
}

.notes-cell {
  font-size: 12px;
  color: #64748b;
  display: block;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.date-cell {
  font-size: 12px;
  color: #64748b;
}

.empty-cell {
  color: #cbd5e1;
  font-size: 12px;
}

@media (max-width: 1200px) {
  .page-header {
    flex-direction: column;
  }
  .header-stats {
    flex-wrap: wrap;
  }
}
</style>
