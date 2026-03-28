<template>
  <div class="page-content">
    <div class="page-header">
      <div>
        <h1 class="page-title">子订单明细</h1>
        <p class="page-desc">管理所有子订单，跟踪返款进度</p>
      </div>
      <div class="header-stats" v-if="!loading">
        <div class="stat-pill">共 <strong>{{ totalOrders }}</strong> 单</div>
        <div class="stat-pill today">今日 <strong>{{ todayCount }}</strong> 单</div>
        <div class="stat-pill green">已返款 <strong>{{ paidCount }}</strong> 单</div>
        <div class="stat-pill orange">未返款 <strong>{{ unpaidCount }}</strong> 单</div>
        <div class="stat-pill red">问题单 <strong>{{ problemCount }}</strong> 单</div>
      </div>
    </div>

    <div class="main-card">
      <div class="toolbar">
        <a-input-search
          v-model:value="searchText"
          placeholder="搜索ASIN/产品名/订单号/买手/聊单号"
          style="width: 260px"
          allow-clear
          size="small"
          @change="applyFilters"
        />
        <a-select v-model:value="filterSales" style="width: 110px" allow-clear placeholder="业务员" size="small" @change="applyFilters">
          <a-select-option v-for="s in salesOptions" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterStatus" style="width: 120px" allow-clear placeholder="状态" size="small" @change="applyFilters">
          <a-select-option v-for="s in ALL_STATUSES" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterType" style="width: 100px" allow-clear placeholder="类型" size="small" @change="applyFilters">
          <a-select-option v-for="t in typeOptions" :key="t" :value="t">{{ t }}</a-select-option>
        </a-select>
        <a-range-picker v-model:value="dateRange" style="width: 220px" size="small" :placeholder="['开始', '结束']" @change="applyFilters" />
        <a-button size="small" @click="resetFilters">重置</a-button>
        <a-button size="small" type="primary" @click="loadData">刷新</a-button>
        <a-button size="small" @click="exportCSV">导出CSV</a-button>
        <span class="result-count">{{ filteredData.length }} 条</span>
      </div>

      <a-table
        :columns="columns"
        :data-source="filteredData"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 1600 }"
        row-key="id"
        size="small"
        @change="onTableChange"
      >
        <template #bodyCell="{ column, record }">

          <template v-if="column.key === 'product'">
            <div class="product-cell">
              <img v-if="record.product_image" :src="record.product_image" class="product-thumb" referrerpolicy="no-referrer" @error="(e:any) => e.target.style.display='none'" />
              <div class="product-info">
                <div class="product-name" :title="record.product_name">{{ record.product_name || '-' }}</div>
                <div class="product-meta">
                  <a :href="'https://www.amazon.com/dp/' + record.asin" target="_blank" class="asin-link">{{ record.asin }}</a>
                  <span class="sep-dot">·</span>
                  <span class="country-text">{{ record.country }}</span>
                  <span v-if="record.order_type" class="sep-dot">·</span>
                  <a-tag v-if="record.order_type" :color="getTypeColor(record.order_type)" class="type-tag">{{ record.order_type }}</a-tag>
                </div>
              </div>
            </div>
          </template>

          <template v-else-if="column.key === 'assignment'">
            <div class="assignment-cell">
              <div class="assign-row">
                <span class="assign-label">业务员</span>
                <a-tag v-if="record.sales_person" color="blue" class="mini-tag">{{ record.sales_person }}</a-tag>
                <span v-else class="empty-text">-</span>
              </div>
              <div class="assign-row">
                <span class="assign-label">买手</span>
                <span v-if="record.buyer_name" class="buyer-name">{{ record.buyer_name }}</span>
                <span v-else class="empty-text">未分配</span>
              </div>
              <div v-if="record.buyer_chat_id" class="assign-row">
                <span class="assign-label">聊单号</span>
                <span class="chat-id">{{ record.buyer_chat_id }}</span>
              </div>
            </div>
          </template>

          <template v-else-if="column.key === 'order_ids'">
            <div class="ids-cell">
              <div class="id-row">
                <span class="id-label">子单</span>
                <span class="id-val mono">{{ record.sub_order_number }}</span>
              </div>
              <div v-if="record.amazon_order_id" class="id-row">
                <span class="id-label">亚马逊</span>
                <span class="id-val mono small">{{ record.amazon_order_id }}</span>
              </div>
            </div>
          </template>

          <template v-else-if="column.key === 'price_refund'">
            <div class="price-cell">
              <div class="price-row">
                <span class="price-label">售价</span>
                <span class="price-val">${{ fmt(record.product_price) }}</span>
              </div>
              <div v-if="record.actual_paid" class="price-row">
                <span class="price-label">实付</span>
                <span class="price-val actual">${{ fmt(record.actual_paid) }}</span>
              </div>
              <div v-if="record.refund_amount > 0" class="price-row">
                <span class="price-label">返款</span>
                <span class="price-val refund">${{ fmt(record.refund_amount) }}</span>
                <a-tag v-if="record.refund_method" :color="getRefundColor(record.refund_method)" class="method-tag">{{ record.refund_method }}</a-tag>
              </div>
            </div>
          </template>

          <template v-else-if="column.key === 'media'">
            <div class="media-cell">
              <template v-if="record.fb_link || record.fb_image_url">
                <div class="media-row">
                  <span class="media-label">FB</span>
                  <a v-if="record.fb_link" :href="record.fb_link" target="_blank" class="media-link">链接</a>
                  <span v-if="record.fb_link && record.fb_image_url" class="sep-dot">·</span>
                  <span v-if="record.fb_image_url" class="media-img-btn" @click="openImg(record.fb_image_url)">图片</span>
                </div>
              </template>
              <template v-if="record.review_link || record.review_screenshot_url">
                <div class="media-row">
                  <span class="media-label">评论</span>
                  <a v-if="record.review_link" :href="record.review_link" target="_blank" class="media-link">链接</a>
                  <span v-if="record.review_link && record.review_screenshot_url" class="sep-dot">·</span>
                  <span v-if="record.review_screenshot_url" class="media-img-btn" @click="openImg(record.review_screenshot_url)">图片</span>
                </div>
              </template>
              <span v-if="!record.fb_link && !record.fb_image_url && !record.review_link && !record.review_screenshot_url" class="empty-text">-</span>
            </div>
          </template>

          <template v-else-if="column.key === 'status'">
            <a-tag :color="getStatusColor(computeStatus(record))" class="status-tag">
              {{ computeStatus(record) }}
            </a-tag>
            <div v-if="record.notes" class="notes-inline" :title="record.notes">{{ record.notes }}</div>
          </template>

          <template v-else-if="column.key === 'created_at'">
            <span class="date-text">{{ fmtDate(record.created_at) }}</span>
          </template>

          <template v-else-if="column.key === 'action'">
            <a-button type="link" size="small" class="edit-btn" @click="openEdit(record)">编辑</a-button>
          </template>

        </template>
      </a-table>
    </div>

    <!-- 编辑弹窗 -->
    <a-modal
      v-model:open="editOpen"
      title="编辑子订单"
      @ok="saveEdit"
      :confirm-loading="editSaving"
      ok-text="保存"
      cancel-text="取消"
      width="580px"
      :destroy-on-close="true"
    >
      <div v-if="editRecord" class="edit-modal">
        <div class="edit-info">
          <div><span class="lbl">子单号</span><strong>{{ editRecord.sub_order_number }}</strong></div>
          <div><span class="lbl">产品</span><strong>{{ editRecord.product_name }}</strong></div>
          <div><span class="lbl">买手</span><strong>{{ editRecord.buyer_name || '未分配' }}</strong></div>
        </div>
        <div class="edit-grid">
          <a-form layout="vertical" size="small">
            <div class="form-row-2">
              <a-form-item label="FB链接">
                <a-input v-model:value="editForm.fb_link" placeholder="Facebook 聊天链接" allow-clear />
              </a-form-item>
              <a-form-item label="FB图片链接">
                <a-input v-model:value="editForm.fb_image_url" placeholder="FB截图图片链接" allow-clear />
              </a-form-item>
              <a-form-item label="评论链接">
                <a-input v-model:value="editForm.review_link" placeholder="Amazon评论链接" allow-clear />
              </a-form-item>
              <a-form-item label="评论截图链接">
                <a-input v-model:value="editForm.review_screenshot_url" placeholder="评论截图图片链接" allow-clear />
              </a-form-item>
              <a-form-item label="实付金额 ($)">
                <a-input-number v-model:value="editForm.actual_paid" :min="0" :precision="2" style="width:100%" />
              </a-form-item>
              <a-form-item label="返款金额 ($)">
                <a-input-number v-model:value="editForm.refund_amount" :min="0" :precision="2" style="width:100%" />
              </a-form-item>
              <a-form-item label="返款方式">
                <a-select v-model:value="editForm.refund_method" allow-clear placeholder="选择" style="width:100%">
                  <a-select-option v-for="m in REFUND_METHODS" :key="m" :value="m">{{ m }}</a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item label="问题状态（手动标记）">
                <a-select v-model:value="editForm.problem_status" allow-clear placeholder="无问题则留空" style="width:100%">
                  <a-select-option value="">无问题</a-select-option>
                  <a-select-option v-for="s in PROBLEM_STATUSES" :key="s" :value="s">{{ s }}</a-select-option>
                </a-select>
              </a-form-item>
            </div>
            <a-form-item label="备注">
              <a-textarea v-model:value="editForm.notes" :rows="2" />
            </a-form-item>
          </a-form>
        </div>
      </div>
    </a-modal>

    <!-- 图片预览 -->
    <a-modal v-model:open="imgOpen" :footer="null" width="auto" title="图片预览" :destroy-on-close="true">
      <div style="text-align:center;padding:8px">
        <img :src="imgUrl" style="max-width:75vw;max-height:75vh;border-radius:6px" />
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { supabase } from '../lib/supabase'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'

interface SubOrder {
  id: string
  sub_order_number: string
  asin: string
  product_name: string
  product_image: string
  store_name: string
  country: string
  order_type: string
  review_level: string
  review_type: string
  sales_person: string
  staff_name: string
  buyer_name: string
  buyer_id: string | null
  buyer_chat_id: string
  amazon_order_id: string
  product_price: number
  actual_paid: number
  refund_amount: number
  refund_method: string
  fb_link: string
  fb_image_url: string
  review_link: string
  review_screenshot_url: string
  status: string
  notes: string
  created_at: string
}

const NORMAL_FLOW = ['待分配业务员', '待分配买手', '未返款', '已返款', '已完成']
const PROBLEM_STATUSES = ['已取消', '已退款', '无此订单', '本金多返', '不下单']
const ALL_STATUSES = [...NORMAL_FLOW, ...PROBLEM_STATUSES]
const REFUND_METHODS = ['PayPal', '礼品卡', '银行转账', '微信', '支付宝', 'Zelle']

const loading = ref(false)
const allData = ref<SubOrder[]>([])
const searchText = ref('')
const filterSales = ref<string | undefined>()
const filterStatus = ref<string | undefined>()
const filterType = ref<string | undefined>()
const dateRange = ref<[Dayjs, Dayjs] | null>(null)

const editOpen = ref(false)
const editSaving = ref(false)
const editRecord = ref<SubOrder | null>(null)
const editForm = ref({
  fb_link: '', fb_image_url: '', review_link: '', review_screenshot_url: '',
  actual_paid: null as number | null,
  refund_amount: null as number | null,
  refund_method: '', problem_status: '', notes: '',
})

const imgOpen = ref(false)
const imgUrl = ref('')

const pagination = ref({
  current: 1, pageSize: 50, showSizeChanger: true,
  pageSizeOptions: ['30', '50', '100'],
  showTotal: (t: number) => `共 ${t} 条`,
})

const columns = [
  { title: '子单号 / 亚马逊单号', key: 'order_ids', width: 200 },
  { title: '产品', key: 'product', width: 260 },
  { title: '业务员 / 买手 / 聊单号', key: 'assignment', width: 170 },
  { title: '售价 / 实付 / 返款', key: 'price_refund', width: 170 },
  { title: 'FB / 评论', key: 'media', width: 120 },
  { title: '状态 / 备注', key: 'status', width: 140 },
  { title: '创建时间', key: 'created_at', width: 90, sorter: (a: SubOrder, b: SubOrder) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime() },
  { title: '', key: 'action', width: 55, fixed: 'right' as const, align: 'center' as const },
]

function computeStatus(r: SubOrder): string {
  if (PROBLEM_STATUSES.includes(r.status)) return r.status
  if (!r.staff_name && !r.buyer_name) return '待分配业务员'
  if (!r.buyer_name) return '待分配买手'
  if (Number(r.refund_amount) > 0) return '已返款'
  if (r.amazon_order_id) return '未返款'
  return '待分配买手'
}

const salesOptions = computed(() => [...new Set(allData.value.map(r => r.sales_person).filter(Boolean))].sort())
const typeOptions = computed(() => [...new Set(allData.value.map(r => r.order_type).filter(Boolean))].sort())

const filteredData = computed(() => {
  let d = allData.value
  const q = searchText.value.trim().toLowerCase()
  if (q) d = d.filter(r =>
    r.asin?.toLowerCase().includes(q) ||
    r.product_name?.toLowerCase().includes(q) ||
    r.sub_order_number?.toLowerCase().includes(q) ||
    r.buyer_name?.toLowerCase().includes(q) ||
    r.buyer_chat_id?.toLowerCase().includes(q) ||
    r.amazon_order_id?.toLowerCase().includes(q)
  )
  if (filterSales.value) d = d.filter(r => r.sales_person === filterSales.value)
  if (filterStatus.value) d = d.filter(r => computeStatus(r) === filterStatus.value)
  if (filterType.value) d = d.filter(r => r.order_type === filterType.value)
  if (dateRange.value) {
    const [s, e] = dateRange.value
    d = d.filter(r => {
      const dt = dayjs(r.created_at)
      return dt.isAfter(s.startOf('day')) && dt.isBefore(e.endOf('day'))
    })
  }
  return d
})

const totalOrders = computed(() => allData.value.length)
const todayCount = computed(() => allData.value.filter(r => dayjs(r.created_at).isAfter(dayjs().startOf('day'))).length)
const paidCount = computed(() => allData.value.filter(r => computeStatus(r) === '已返款' || computeStatus(r) === '已完成').length)
const unpaidCount = computed(() => allData.value.filter(r => computeStatus(r) === '未返款').length)
const problemCount = computed(() => allData.value.filter(r => PROBLEM_STATUSES.includes(computeStatus(r))).length)

function fmt(n: number | string) { return (Number(n) || 0).toFixed(2) }
function fmtDate(d: string) { return d ? dayjs(d).format('MM-DD HH:mm') : '-' }

function getStatusColor(s: string) {
  const m: Record<string, string> = {
    '待分配业务员': 'default', '待分配买手': 'processing',
    '未返款': 'orange', '已返款': 'blue', '已完成': 'green',
    '已取消': 'red', '已退款': 'volcano', '无此订单': 'red',
    '本金多返': 'magenta', '不下单': 'red',
  }
  return m[s] || 'default'
}

function getTypeColor(t: string) {
  const m: Record<string, string> = { '免评': 'cyan', '留评': 'orange', '直评': 'green', '真人测评': 'blue', '图片评': 'geekblue', '文字评': 'cyan', '视频评': 'geekblue' }
  return m[t] || 'default'
}

function getRefundColor(m: string) {
  const map: Record<string, string> = { 'PayPal': 'blue', '礼品卡': 'orange', '银行转账': 'green', '微信': 'green', '支付宝': 'cyan', 'Zelle': 'geekblue' }
  return map[m] || 'default'
}

function openImg(url: string) { imgUrl.value = url; imgOpen.value = true }

function openEdit(r: SubOrder) {
  editRecord.value = r
  editForm.value = {
    fb_link: r.fb_link || '', fb_image_url: r.fb_image_url || '',
    review_link: r.review_link || '', review_screenshot_url: r.review_screenshot_url || '',
    actual_paid: Number(r.actual_paid) || null,
    refund_amount: Number(r.refund_amount) || null,
    refund_method: r.refund_method || '',
    problem_status: PROBLEM_STATUSES.includes(r.status) ? r.status : '',
    notes: r.notes || '',
  }
  editOpen.value = true
}

async function saveEdit() {
  if (!editRecord.value) return
  editSaving.value = true
  try {
    const f = editForm.value
    const newRefund = Number(f.refund_amount) || 0
    let newStatus = editRecord.value.status
    if (f.problem_status) {
      newStatus = f.problem_status
    } else if (PROBLEM_STATUSES.includes(editRecord.value.status)) {
      newStatus = newRefund > 0 ? '已返款' : (editRecord.value.amazon_order_id ? '未返款' : '待分配买手')
    }
    const updates = {
      fb_link: f.fb_link.trim(), fb_image_url: f.fb_image_url.trim(),
      review_link: f.review_link.trim(), review_screenshot_url: f.review_screenshot_url.trim(),
      actual_paid: Number(f.actual_paid) || 0,
      refund_amount: newRefund, refund_method: f.refund_method,
      notes: f.notes, status: newStatus,
    }
    const { error } = await supabase.from('sub_orders').update(updates).eq('id', editRecord.value.id)
    if (error) throw error
    const idx = allData.value.findIndex(r => r.id === editRecord.value!.id)
    if (idx >= 0) allData.value[idx] = { ...allData.value[idx], ...updates }
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
    .select(`
      id, sub_order_number, asin, product_name, product_image, store_name, country,
      order_type, review_level, review_type, sales_person, staff_name,
      buyer_name, buyer_id, amazon_order_id,
      product_price, actual_paid, refund_amount, refund_method,
      fb_link, fb_image_url, review_link, review_screenshot_url,
      status, notes, created_at
    `)
    .order('created_at', { ascending: false })
  const rows = (data || []) as any[]
  const buyerIds = [...new Set(rows.filter(r => r.buyer_id).map(r => r.buyer_id))]
  let chatMap: Record<string, string> = {}
  if (buyerIds.length > 0) {
    const { data: buyers } = await supabase.from('buyers').select('id, chat_order_id').in('id', buyerIds)
    if (buyers) buyers.forEach((b: any) => { if (b.chat_order_id) chatMap[b.id] = b.chat_order_id })
  }
  allData.value = rows.map(r => ({ ...r, buyer_chat_id: (r.buyer_id && chatMap[r.buyer_id]) ? chatMap[r.buyer_id] : '' }))
  loading.value = false
}

function applyFilters() { pagination.value.current = 1 }

function resetFilters() {
  searchText.value = ''; filterSales.value = undefined
  filterStatus.value = undefined; filterType.value = undefined
  dateRange.value = null; pagination.value.current = 1
}

function onTableChange(pag: any) {
  pagination.value.current = pag.current
  pagination.value.pageSize = pag.pageSize
}

function exportCSV() {
  const headers = ['子订单号', 'ASIN', '产品名称', '亚马逊单号', '业务员', '买手', '聊单号', '售价', '实付', '返款金额', '返款方式', 'FB链接', '评论链接', '状态', '备注', '创建时间']
  const rows = filteredData.value.map(r => [
    r.sub_order_number, r.asin, r.product_name, r.amazon_order_id,
    r.sales_person, r.buyer_name, r.buyer_chat_id,
    r.product_price, r.actual_paid, r.refund_amount, r.refund_method,
    r.fb_link, r.review_link, computeStatus(r), r.notes, fmtDate(r.created_at),
  ])
  const csv = '\uFEFF' + [headers, ...rows].map(row =>
    row.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')
  ).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `子订单明细_${dayjs().format('YYYYMMDD_HHmm')}.csv`
  a.click()
}

onMounted(loadData)
</script>

<style scoped lang="less">
.page-content {
  padding: 24px 28px;
  background: #f5f6fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 16px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 2px;
}

.page-desc {
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
}

.header-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.stat-pill {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 4px 14px;
  font-size: 13px;
  color: #64748b;
  white-space: nowrap;
  strong { color: #0f172a; margin-left: 2px; }
  &.today { border-color: #bfdbfe; background: #eff6ff; strong { color: #2563eb; } }
  &.green { border-color: #bbf7d0; background: #f0fdf4; strong { color: #16a34a; } }
  &.orange { border-color: #fed7aa; background: #fff7ed; strong { color: #ea580c; } }
  &.red { border-color: #fecaca; background: #fef2f2; strong { color: #dc2626; } }
}

.main-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 1px 6px rgba(0,0,0,.05);
  border: 1px solid #e2e8f0;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 14px;
}

.result-count {
  margin-left: auto;
  font-size: 12px;
  color: #94a3b8;
}

/* 产品列 */
.product-cell {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.product-thumb {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid #f1f5f9;
}

.product-info {
  min-width: 0;
}

.product-name {
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 170px;
  line-height: 1.4;
}

.product-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 3px;
  margin-top: 2px;
}

.asin-link {
  font-size: 11px;
  color: #3b82f6;
  text-decoration: none;
  font-family: 'SF Mono', monospace;
  &:hover { text-decoration: underline; }
}

.country-text {
  font-size: 11px;
  color: #94a3b8;
}

.sep-dot {
  color: #cbd5e1;
  font-size: 10px;
}

.type-tag {
  font-size: 10px;
  line-height: 1.4;
  padding: 0 4px;
}

/* 分配列 */
.assignment-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.assign-row {
  display: flex;
  align-items: center;
  gap: 5px;
}

.assign-label {
  font-size: 10px;
  color: #94a3b8;
  width: 32px;
  flex-shrink: 0;
}

.buyer-name {
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
}

.chat-id {
  font-size: 11px;
  color: #0891b2;
  font-family: 'SF Mono', monospace;
  background: #ecfeff;
  border: 1px solid #a5f3fc;
  border-radius: 4px;
  padding: 0 4px;
}

.mini-tag {
  font-size: 10px;
  line-height: 1.4;
  padding: 0 4px;
}

/* 订单号列 */
.ids-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.id-row {
  display: flex;
  align-items: center;
  gap: 5px;
}

.id-label {
  font-size: 10px;
  color: #94a3b8;
  width: 30px;
  flex-shrink: 0;
}

.id-val {
  font-size: 12px;
  color: #334155;
  font-weight: 600;
  &.mono { font-family: 'SF Mono', monospace; }
  &.small { font-size: 11px; font-weight: 400; color: #64748b; }
}

/* 价格列 */
.price-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.price-row {
  display: flex;
  align-items: center;
  gap: 5px;
}

.price-label {
  font-size: 10px;
  color: #94a3b8;
  width: 22px;
  flex-shrink: 0;
}

.price-val {
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
  font-family: 'SF Mono', monospace;
  &.actual { color: #64748b; font-weight: 400; }
  &.refund { color: #dc2626; }
}

.method-tag {
  font-size: 10px;
  line-height: 1.4;
  padding: 0 4px;
}

/* 媒体列 */
.media-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.media-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.media-label {
  font-size: 10px;
  color: #94a3b8;
  width: 20px;
  flex-shrink: 0;
}

.media-link {
  font-size: 11px;
  color: #3b82f6;
  text-decoration: none;
  &:hover { text-decoration: underline; }
}

.media-img-btn {
  font-size: 11px;
  color: #0891b2;
  cursor: pointer;
  &:hover { text-decoration: underline; }
}

/* 状态列 */
.status-tag {
  font-size: 11px;
  display: inline-block;
}

.notes-inline {
  font-size: 11px;
  color: #94a3b8;
  margin-top: 3px;
  max-width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.date-text {
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
}

.empty-text {
  font-size: 11px;
  color: #cbd5e1;
}

.edit-btn {
  font-size: 12px;
  padding: 0 4px;
}

/* 编辑弹窗 */
.edit-modal {
  padding: 4px 0;
}

.edit-info {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #64748b;
  strong { color: #1e293b; }
}

.lbl {
  margin-right: 4px;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 16px;
}
</style>
