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
        <a-select v-model:value="filterSales" style="width: 140px" allow-clear placeholder="业务员" @change="applyFilters">
          <a-select-option v-for="s in salesOptions" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterStatus" style="width: 130px" allow-clear placeholder="状态" @change="applyFilters">
          <a-select-option v-for="s in ALL_STATUSES" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterType" style="width: 120px" allow-clear placeholder="类型" @change="applyFilters">
          <a-select-option v-for="t in typeOptions" :key="t" :value="t">{{ t }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterRefundMethod" style="width: 130px" allow-clear placeholder="返款方式" @change="applyFilters">
          <a-select-option v-for="m in refundMethodOptions" :key="m" :value="m">{{ m }}</a-select-option>
        </a-select>
        <a-range-picker v-model:value="dateRange" style="width: 240px" :placeholder="['开始日期', '结束日期']" @change="applyFilters" />
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
        :scroll="{ x: 2200 }"
        row-key="id"
        size="small"
        @change="onTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'sub_order_number'">
            <span class="order-num">{{ record.sub_order_number }}</span>
          </template>

          <template v-else-if="column.key === 'asin'">
            <a v-if="record.asin" :href="'https://www.amazon.com/dp/' + record.asin" target="_blank" class="asin-link">{{ record.asin }}</a>
            <span v-else class="empty-cell">-</span>
          </template>

          <template v-else-if="column.key === 'product_name'">
            <span class="product-name-cell" :title="record.product_name">{{ record.product_name || '-' }}</span>
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
            <a v-if="record.fb_link" :href="record.fb_link" target="_blank" class="fb-link"><LinkOutlined /> 链接</a>
            <span v-else class="empty-cell">-</span>
          </template>

          <template v-else-if="column.key === 'fb_image_url'">
            <span v-if="record.fb_image_url" class="img-preview-trigger" @click="openImagePreview(record.fb_image_url)">
              <FileImageOutlined /> 查看
            </span>
            <span v-else class="empty-cell">-</span>
          </template>

          <template v-else-if="column.key === 'review_link'">
            <a v-if="record.review_link" :href="record.review_link" target="_blank" class="review-link"><LinkOutlined /> 评论</a>
            <span v-else class="empty-cell">-</span>
          </template>

          <template v-else-if="column.key === 'review_screenshot_url'">
            <span v-if="record.review_screenshot_url" class="img-preview-trigger" @click="openImagePreview(record.review_screenshot_url)">
              <FileImageOutlined /> 查看
            </span>
            <span v-else class="empty-cell">-</span>
          </template>

          <template v-else-if="column.key === 'review_level'">
            <a-tag v-if="record.review_level" :color="getLevelColor(record.review_level)">{{ record.review_level }}</a-tag>
            <span v-else class="empty-cell">-</span>
          </template>

          <template v-else-if="column.key === 'order_type'">
            <a-tag :color="getTypeColor(record.order_type)">{{ record.order_type || '-' }}</a-tag>
          </template>

          <template v-else-if="column.key === 'product_price'">
            <span class="money-cell">${{ formatNum(record.product_price) }}</span>
          </template>

          <template v-else-if="column.key === 'actual_paid'">
            <span class="money-cell" v-if="record.actual_paid">${{ formatNum(record.actual_paid) }}</span>
            <span v-else class="empty-cell">-</span>
          </template>

          <template v-else-if="column.key === 'refund_amount'">
            <span class="money-cell refund" v-if="record.refund_amount > 0">${{ formatNum(record.refund_amount) }}</span>
            <span v-else class="empty-cell">-</span>
          </template>

          <template v-else-if="column.key === 'refund_method'">
            <a-tag v-if="record.refund_method" :color="getRefundMethodColor(record.refund_method)">{{ record.refund_method }}</a-tag>
            <span v-else class="empty-cell">-</span>
          </template>

          <template v-else-if="column.key === 'status'">
            <div class="status-cell">
              <div class="status-pipeline">
                <span
                  v-for="(step, idx) in getStatusPipeline(record)"
                  :key="idx"
                  :class="['pipe-step', step.active ? 'active' : '', step.done ? 'done' : '', step.error ? 'error' : '']"
                  :title="step.label"
                >
                  <span class="pipe-dot"></span>
                  <span v-if="idx < getStatusPipeline(record).length - 1" class="pipe-line" :class="{ filled: step.done }"></span>
                </span>
              </div>
              <a-tag :color="getStatusColor(computeDisplayStatus(record))" class="status-tag-main">
                {{ computeDisplayStatus(record) }}
              </a-tag>
            </div>
          </template>

          <template v-else-if="column.key === 'notes'">
            <span class="notes-cell" :title="record.notes">{{ record.notes || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'created_at'">
            <span class="date-cell">{{ formatDate(record.created_at) }}</span>
          </template>

          <template v-else-if="column.key === 'action'">
            <a-button type="link" size="small" @click="openEdit(record)"><EditOutlined /> 编辑</a-button>
          </template>
        </template>
      </a-table>
    </div>

    <a-modal v-model:open="editOpen" title="编辑子订单" @ok="saveEdit" :confirm-loading="editSaving" ok-text="保存" cancel-text="取消" width="640px" :destroy-on-close="true">
      <div class="edit-modal-body" v-if="editRecord">
        <div class="edit-info-bar">
          <span>子订单号：<strong>{{ editRecord.sub_order_number }}</strong></span>
          <span>ASIN：<strong>{{ editRecord.asin }}</strong></span>
          <span>买手：<strong>{{ editRecord.buyer_name || '未分配' }}</strong></span>
        </div>
        <a-form layout="vertical" class="edit-form">
          <div class="edit-form-grid">
            <a-form-item label="FB链接">
              <a-input v-model:value="editForm.fb_link" placeholder="粘贴FB链接" allow-clear />
            </a-form-item>
            <a-form-item label="FB图片链接">
              <a-input v-model:value="editForm.fb_image_url" placeholder="粘贴FB截图链接" allow-clear />
            </a-form-item>
            <a-form-item label="评论链接">
              <a-input v-model:value="editForm.review_link" placeholder="粘贴评论链接" allow-clear />
            </a-form-item>
            <a-form-item label="评论截图链接">
              <a-input v-model:value="editForm.review_screenshot_url" placeholder="粘贴评论截图链接" allow-clear />
            </a-form-item>
            <a-form-item label="实付金额($)">
              <a-input-number v-model:value="editForm.actual_paid" :min="0" :precision="2" style="width:100%" placeholder="实付金额" />
            </a-form-item>
            <a-form-item label="返款金额($)">
              <a-input-number v-model:value="editForm.refund_amount" :min="0" :precision="2" style="width:100%" placeholder="返款金额" />
            </a-form-item>
            <a-form-item label="返款方式">
              <a-select v-model:value="editForm.refund_method" allow-clear placeholder="选择返款方式" style="width:100%">
                <a-select-option v-for="m in REFUND_METHODS" :key="m" :value="m">{{ m }}</a-select-option>
              </a-select>
            </a-form-item>
            <a-form-item label="问题状态（手动）">
              <a-select v-model:value="editForm.problem_status" allow-clear placeholder="仅问题单需设置" style="width:100%">
                <a-select-option value="">无问题</a-select-option>
                <a-select-option v-for="s in PROBLEM_STATUSES" :key="s" :value="s">{{ s }}</a-select-option>
              </a-select>
            </a-form-item>
          </div>
          <a-form-item label="备注">
            <a-textarea v-model:value="editForm.notes" :rows="2" placeholder="备注信息" />
          </a-form-item>
        </a-form>
      </div>
    </a-modal>

    <a-modal v-model:open="imagePreviewOpen" :footer="null" width="auto" :body-style="{ padding: '12px', textAlign: 'center' }" title="图片预览" :destroy-on-close="true">
      <img :src="imagePreviewUrl" class="preview-img" />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ReloadOutlined, DownloadOutlined, LinkOutlined, EditOutlined, FileImageOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { supabase } from '../lib/supabase'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'

interface SubOrder {
  id: string
  sub_order_number: string
  asin: string
  product_name: string
  sales_person: string
  staff_name: string
  buyer_name: string
  buyer_id: string | null
  fb_link: string
  fb_image_url: string
  review_link: string
  review_screenshot_url: string
  review_level: string
  review_type: string
  order_type: string
  product_price: number
  actual_paid: number
  refund_amount: number
  refund_method: string
  refund_status: string
  status: string
  notes: string
  amazon_order_id: string
  created_at: string
}

const NORMAL_FLOW = ['待分配业务员', '待分配买手', '已下单', '未返款', '已返款', '已完成']
const PROBLEM_STATUSES = ['已取消', '已退款', '无此订单', '本金多返', '不下单']
const ALL_STATUSES = [...NORMAL_FLOW, ...PROBLEM_STATUSES]
const REFUND_METHODS = ['PayPal', '礼品卡', '银行转账', '微信', '支付宝', 'Zelle']

const loading = ref(false)
const allData = ref<SubOrder[]>([])
const searchText = ref('')
const filterSales = ref<string | undefined>(undefined)
const filterStatus = ref<string | undefined>(undefined)
const filterType = ref<string | undefined>(undefined)
const filterRefundMethod = ref<string | undefined>(undefined)
const dateRange = ref<[Dayjs, Dayjs] | null>(null)

const editOpen = ref(false)
const editSaving = ref(false)
const editRecord = ref<SubOrder | null>(null)
const editForm = ref({
  fb_link: '',
  fb_image_url: '',
  review_link: '',
  review_screenshot_url: '',
  actual_paid: 0 as number | null,
  refund_amount: 0 as number | null,
  refund_method: '',
  problem_status: '',
  notes: '',
})

const imagePreviewOpen = ref(false)
const imagePreviewUrl = ref('')

const pagination = ref({
  current: 1,
  pageSize: 50,
  showSizeChanger: true,
  pageSizeOptions: ['30', '50', '100', '200'],
  showTotal: (total: number) => `共 ${total} 条`,
})

const columns = [
  { title: '子订单号', key: 'sub_order_number', dataIndex: 'sub_order_number', width: 170, fixed: 'left' as const },
  { title: 'ASIN', key: 'asin', dataIndex: 'asin', width: 130 },
  { title: '产品名称', key: 'product_name', dataIndex: 'product_name', width: 180, ellipsis: true },
  { title: '亚马逊单号', key: 'amazon_order_id', dataIndex: 'amazon_order_id', width: 170 },
  { title: '业务员', key: 'sales_person', dataIndex: 'sales_person', width: 90 },
  { title: '买手', key: 'buyer_name', dataIndex: 'buyer_name', width: 90 },
  { title: 'FB链接', key: 'fb_link', dataIndex: 'fb_link', width: 70, align: 'center' as const },
  { title: 'FB图片', key: 'fb_image_url', dataIndex: 'fb_image_url', width: 70, align: 'center' as const },
  { title: '评论链接', key: 'review_link', dataIndex: 'review_link', width: 70, align: 'center' as const },
  { title: '评论图片', key: 'review_screenshot_url', dataIndex: 'review_screenshot_url', width: 70, align: 'center' as const },
  { title: '测评等级', key: 'review_level', dataIndex: 'review_level', width: 80 },
  { title: '类型', key: 'order_type', dataIndex: 'order_type', width: 75 },
  { title: '产品售价', key: 'product_price', dataIndex: 'product_price', width: 90, align: 'right' as const, sorter: (a: SubOrder, b: SubOrder) => a.product_price - b.product_price },
  { title: '实付金额', key: 'actual_paid', dataIndex: 'actual_paid', width: 90, align: 'right' as const, sorter: (a: SubOrder, b: SubOrder) => (a.actual_paid || 0) - (b.actual_paid || 0) },
  { title: '返款金额', key: 'refund_amount', dataIndex: 'refund_amount', width: 90, align: 'right' as const, sorter: (a: SubOrder, b: SubOrder) => a.refund_amount - b.refund_amount },
  { title: '返款方式', key: 'refund_method', dataIndex: 'refund_method', width: 90 },
  { title: '状态', key: 'status', dataIndex: 'status', width: 220 },
  { title: '备注', key: 'notes', dataIndex: 'notes', width: 140, ellipsis: true },
  { title: '创建时间', key: 'created_at', dataIndex: 'created_at', width: 100, sorter: (a: SubOrder, b: SubOrder) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime() },
  { title: '操作', key: 'action', width: 80, fixed: 'right' as const, align: 'center' as const },
]

function computeDisplayStatus(record: SubOrder): string {
  if (PROBLEM_STATUSES.includes(record.status)) return record.status
  if (!record.staff_name && !record.buyer_name) return '待分配业务员'
  if (record.staff_name && !record.buyer_name) return '待分配买手'
  if (record.buyer_name && !record.amazon_order_id) return '待分配买手'
  if (record.amazon_order_id && Number(record.refund_amount) <= 0) return '未返款'
  if (record.amazon_order_id && Number(record.refund_amount) > 0) return '已返款'
  if (record.status === '已完成') return '已完成'
  return record.status || '待分配业务员'
}

function getStatusPipeline(record: SubOrder) {
  const display = computeDisplayStatus(record)
  if (PROBLEM_STATUSES.includes(display)) {
    const normalIdx = 2
    const steps = NORMAL_FLOW.slice(0, normalIdx + 1).map((label, idx) => ({
      label,
      done: idx < normalIdx,
      active: false,
      error: false,
    }))
    steps.push({ label: display, done: false, active: true, error: true })
    return steps
  }
  const currentIdx = NORMAL_FLOW.indexOf(display)
  return NORMAL_FLOW.map((label, idx) => ({
    label,
    done: idx < currentIdx,
    active: idx === currentIdx,
    error: false,
  }))
}

const salesOptions = computed(() => {
  const set = new Set<string>()
  allData.value.forEach(r => { if (r.sales_person) set.add(r.sales_person) })
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
  if (filterStatus.value) {
    data = data.filter(r => computeDisplayStatus(r) === filterStatus.value)
  }
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
  return (Number(n) || 0).toFixed(2)
}

function formatDate(d: string): string {
  if (!d) return '-'
  return dayjs(d).format('MM-DD HH:mm')
}

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    '待分配业务员': 'default',
    '待分配买手': 'processing',
    '已下单': 'cyan',
    '未返款': 'orange',
    '已返款': 'blue',
    '已完成': 'green',
    '已取消': 'red',
    '已退款': 'volcano',
    '无此订单': 'red',
    '本金多返': 'magenta',
    '不下单': 'red',
  }
  return map[status] || 'default'
}

function getLevelColor(level: string): string {
  const map: Record<string, string> = { 'S': 'gold', 'A': 'green', 'B': 'blue', 'C': 'default' }
  return map[level] || 'default'
}

function getTypeColor(type: string): string {
  const map: Record<string, string> = {
    '免评': 'cyan', '留评': 'orange', '直评': 'green',
    '真人测评': 'blue', '图片评': 'geekblue', '文字评': 'cyan', '视频评': 'geekblue',
  }
  return map[type] || 'default'
}

function getRefundMethodColor(method: string): string {
  const map: Record<string, string> = {
    'PayPal': 'blue', '礼品卡': 'orange', '银行转账': 'green',
    '微信': 'green', '支付宝': 'cyan', 'Zelle': 'geekblue',
  }
  return map[method] || 'default'
}

function openImagePreview(url: string) {
  imagePreviewUrl.value = url
  imagePreviewOpen.value = true
}

function openEdit(record: SubOrder) {
  editRecord.value = record
  editForm.value = {
    fb_link: record.fb_link || '',
    fb_image_url: record.fb_image_url || '',
    review_link: record.review_link || '',
    review_screenshot_url: record.review_screenshot_url || '',
    actual_paid: Number(record.actual_paid) || null,
    refund_amount: Number(record.refund_amount) || null,
    refund_method: record.refund_method || '',
    problem_status: PROBLEM_STATUSES.includes(record.status) ? record.status : '',
    notes: record.notes || '',
  }
  editOpen.value = true
}

async function saveEdit() {
  if (!editRecord.value) return
  editSaving.value = true
  try {
    const f = editForm.value
    const newRefundAmt = Number(f.refund_amount) || 0
    let newStatus = editRecord.value.status

    if (f.problem_status) {
      newStatus = f.problem_status
    } else {
      if (PROBLEM_STATUSES.includes(editRecord.value.status)) {
        if (newRefundAmt > 0) {
          newStatus = '已返款'
        } else if (editRecord.value.amazon_order_id) {
          newStatus = '已下单'
        } else if (editRecord.value.buyer_name) {
          newStatus = '已分配'
        } else {
          newStatus = '待分配'
        }
      }
    }

    const updates: Record<string, any> = {
      fb_link: f.fb_link.trim(),
      fb_image_url: f.fb_image_url.trim(),
      review_link: f.review_link.trim(),
      review_screenshot_url: f.review_screenshot_url.trim(),
      actual_paid: Number(f.actual_paid) || 0,
      refund_amount: newRefundAmt,
      refund_method: f.refund_method,
      notes: f.notes,
      status: newStatus,
    }

    const { error } = await supabase.from('sub_orders').update(updates).eq('id', editRecord.value.id)
    if (error) throw error

    const idx = allData.value.findIndex(r => r.id === editRecord.value!.id)
    if (idx >= 0) {
      allData.value[idx] = { ...allData.value[idx], ...updates }
    }

    message.success('保存成功')
    editOpen.value = false
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    editSaving.value = false
  }
}

async function loadData() {
  loading.value = true
  const { data } = await supabase
    .from('sub_orders')
    .select('id, sub_order_number, asin, product_name, sales_person, staff_name, buyer_name, buyer_id, fb_link, fb_image_url, review_link, review_screenshot_url, review_level, review_type, order_type, product_price, actual_paid, refund_amount, refund_method, refund_status, status, notes, amazon_order_id, created_at')
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
  const headers = ['子订单号', 'ASIN', '产品名称', '亚马逊单号', '业务员', '买手', 'FB链接', 'FB图片', '评论链接', '评论图片', '测评等级', '类型', '产品售价', '实付金额', '返款金额', '返款方式', '状态', '备注', '创建时间']
  const rows = filteredData.value.map(r => [
    r.sub_order_number, r.asin, r.product_name, r.amazon_order_id,
    r.sales_person, r.buyer_name, r.fb_link, r.fb_image_url,
    r.review_link, r.review_screenshot_url, r.review_level,
    r.order_type, r.product_price, r.actual_paid, r.refund_amount,
    r.refund_method, computeDisplayStatus(r), r.notes, formatDate(r.created_at),
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
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.buyer-cell {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
}

.fb-link, .review-link {
  font-size: 12px;
  color: #2563eb;
  text-decoration: none;
  white-space: nowrap;
  &:hover { text-decoration: underline; }
}

.img-preview-trigger {
  font-size: 12px;
  color: #0891b2;
  cursor: pointer;
  white-space: nowrap;
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
  max-width: 120px;
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

/* Status pipeline */
.status-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
}

.status-pipeline {
  display: flex;
  align-items: center;
  gap: 0;
}

.pipe-step {
  display: flex;
  align-items: center;
  position: relative;
}

.pipe-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #e2e8f0;
  border: 1.5px solid #cbd5e1;
  flex-shrink: 0;
  transition: all .2s;
}

.pipe-step.done .pipe-dot {
  background: #22c55e;
  border-color: #16a34a;
}

.pipe-step.active .pipe-dot {
  background: #3b82f6;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
}

.pipe-step.error .pipe-dot {
  background: #ef4444;
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
}

.pipe-line {
  width: 16px;
  height: 2px;
  background: #e2e8f0;
  &.filled { background: #22c55e; }
}

.status-tag-main {
  font-size: 11px;
}

/* Edit modal */
.edit-modal-body {
  padding: 4px 0;
}

.edit-info-bar {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 16px;
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 20px;
  font-size: 13px;
  color: #64748b;
  strong { color: #1e293b; }
}

.edit-form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 16px;
}

/* Image preview */
.preview-img {
  max-width: 80vw;
  max-height: 80vh;
  border-radius: 8px;
}

@media (max-width: 1200px) {
  .page-header {
    flex-direction: column;
  }
  .header-stats {
    flex-wrap: wrap;
  }
  .edit-form-grid {
    grid-template-columns: 1fr;
  }
}
</style>
