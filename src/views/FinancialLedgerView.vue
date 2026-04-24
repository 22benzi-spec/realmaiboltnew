<template>
  <div class="page-content">
    <div class="page-header">
      <h2 class="page-title">交易流水</h2>
      <a-button type="primary" @click="openAdd">手动记账</a-button>
    </div>

    <!-- KPI -->
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-val green">¥{{ formatNum(stats.totalIncome) }}</div>
        <div class="kpi-subval" v-if="stats.totalIncomeUsd > 0">${{ formatNum(stats.totalIncomeUsd) }}</div>
        <div class="kpi-label">收入合计</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val red">¥{{ formatNum(stats.totalExpense) }}</div>
        <div class="kpi-label">支出合计</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val blue">{{ stats.count }}</div>
        <div class="kpi-label">交易笔数</div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <a-input v-model:value="search" placeholder="搜索客户 / 订单号 / 流水号 / 备注" style="width:220px" allow-clear @change="loadData" />
      <a-select v-model:value="filterPrimaryCategory" placeholder="一级分类" style="width:140px" allow-clear @change="onPrimaryFilterChange">
        <a-select-option v-for="item in primaryCategoryOptions" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
      </a-select>
      <a-select v-model:value="filterType" placeholder="二级分类" style="width:150px" allow-clear @change="loadData">
        <a-select-option v-for="item in filterSecondaryOptions" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
      </a-select>
      <a-select v-model:value="filterDirection" placeholder="收支方向" style="width:110px" allow-clear @change="loadData">
        <a-select-option value="收入">收入</a-select-option>
        <a-select-option value="支出">支出</a-select-option>
      </a-select>
      <a-select v-model:value="filterStatus" placeholder="状态" style="width:120px" allow-clear @change="loadData">
        <a-select-option v-for="item in statusOptions" :key="item" :value="item">{{ item }}</a-select-option>
      </a-select>
      <a-range-picker v-model:value="dateRange" @change="loadData" style="width:240px" />
    </div>

    <!-- 表格 -->
    <a-table
      :columns="columns"
      :data-source="list"
      :loading="loading"
      :pagination="{ current: page, pageSize, total, showSizeChanger: true, showTotal: (t:number) => `共 ${t} 条` }"
      row-key="id"
      size="middle"
      :scroll="{ x: 1400 }"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'direction'">
          <a-tag :color="getDirection(record) === '收入' ? 'green' : 'red'">{{ getDirection(record) }}</a-tag>
        </template>
        <template v-if="column.key === 'transaction_type'">
          <div class="type-stack">
            <span class="type-primary">{{ getPrimaryCategoryLabel(record) }}</span>
            <a-tag :color="getTransactionTypeColor(record)">{{ getTransactionTypeLabel(record) }}</a-tag>
          </div>
        </template>
        <template v-if="column.key === 'amount'">
          <div class="amount-stack">
            <template v-if="hasAmount(record)">
              <span v-if="Number(record.amount_cny || 0) > 0" :class="getDirection(record) === '收入' ? 'amount-in' : 'amount-out'">
                {{ getDirection(record) === '收入' ? '+' : '-' }}¥{{ formatNum(record.amount_cny) }}
              </span>
              <span v-if="Number(record.amount_usd || 0) > 0" :class="getDirection(record) === '收入' ? 'amount-in' : 'amount-out'">
                {{ getDirection(record) === '收入' ? '+' : '-' }}${{ formatNum(record.amount_usd) }}
              </span>
            </template>
            <span v-else class="text-muted">-</span>
          </div>
        </template>
        <template v-if="column.key === 'status'">
          <a-badge :status="statusBadge[record.status] || 'default'" :text="record.status" />
        </template>
        <template v-if="column.key === 'action'">
          <a-space>
            <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
            <a-popconfirm title="确认作废这条流水？" @confirm="voidRow(record.id)">
              <a-button type="link" size="small" danger>作废</a-button>
            </a-popconfirm>
          </a-space>
        </template>
      </template>
    </a-table>

    <!-- 新增/编辑 弹窗 -->
    <a-modal
      v-model:open="modalOpen"
      :title="editId ? '编辑流水' : '手动记账'"
      width="680px"
      @ok="handleSave"
      :confirm-loading="saving"
    >
      <a-form :model="form" layout="vertical" style="margin-top:8px">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="一级分类" required>
              <a-select v-model:value="form.entry_scope" @change="onScopeChange">
                <a-select-option v-for="item in primaryCategoryOptions" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="二级分类" required>
              <a-select v-model:value="form.transaction_type" @change="onTypeChange">
                <a-select-option v-for="item in manualTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <div class="form-tip">
              {{ isAdministrativeEntry ? '行政记账默认按人民币直接入账，不关联任务订单。' : '业务记账可按类型补充往来对象、客户或订单信息。' }}
            </div>
          </a-col>
          <a-col :span="12">
            <a-form-item label="收支方向">
              <a-select v-model:value="form.direction">
                <a-select-option value="收入">收入</a-select-option>
                <a-select-option value="支出">支出</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="金额 (CNY)" required>
              <a-input-number v-model:value="form.amount_cny" :min="0" :precision="2" style="width:100%" placeholder="人民币金额" />
            </a-form-item>
          </a-col>
          <a-col v-if="showUsdFields" :span="12">
            <a-form-item label="金额 (USD)">
              <a-input-number v-model:value="form.amount_usd" :min="0" :precision="2" style="width:100%" placeholder="美金金额(可选)" />
            </a-form-item>
          </a-col>
          <a-col v-if="showUsdFields" :span="12">
            <a-form-item label="汇率">
              <a-input-number v-model:value="form.exchange_rate" :min="0" :precision="4" style="width:100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="交易日期" required>
              <a-input v-model:value="form.transaction_date" placeholder="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="counterpartyLabel">
              <a-input v-model:value="form.customer_name" :placeholder="counterpartyPlaceholder" />
            </a-form-item>
          </a-col>
          <a-col v-if="showOrderNumberField" :span="12">
            <a-form-item label="关联订单号">
              <a-input v-model:value="form.order_number" placeholder="关联订单号(可选)" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item :label="ownerLabel">
              <a-input v-model:value="form.staff_name" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="操作人">
              <a-input v-model:value="form.handler_name" placeholder="默认记录当前操作人" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="状态">
              <a-select v-model:value="form.status">
                <a-select-option v-for="item in statusOptions" :key="item" :value="item">{{ item }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注">
              <a-textarea v-model:value="form.notes" :rows="2" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { message } from 'ant-design-vue'
import { supabase } from '../lib/supabase'
import type { Dayjs } from 'dayjs'
import dayjs from 'dayjs'
import { useCurrentUser } from '../composables/useCurrentUser'

const loading = ref(false)
const saving = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const search = ref('')
const filterPrimaryCategory = ref<string | undefined>(undefined)
const filterType = ref<string | undefined>(undefined)
const filterDirection = ref<string | undefined>(undefined)
const filterStatus = ref<string | undefined>(undefined)
const dateRange = ref<[Dayjs, Dayjs] | null>(null)

const stats = reactive({ totalIncome: 0, totalIncomeUsd: 0, totalExpense: 0, count: 0 })

const modalOpen = ref(false)
const editId = ref<string | null>(null)

const { currentUser, loadFromStorage } = useCurrentUser()

const transactionCategoryOptions = [
  {
    value: '业务收入',
    label: '业务收入',
    children: [
      { value: '任务收入', label: '任务收入' },
      { value: '补款收入', label: '补款收入' },
    ],
  },
  {
    value: '业务支出',
    label: '业务支出',
    children: [
      { value: '截单退款', label: '截单退款' },
      { value: '赔付佣金', label: '赔付佣金' },
      { value: '退差价', label: '退差价' },
    ],
  },
  {
    value: '运营支出',
    label: '运营支出',
    children: [
      { value: 'IP采购', label: 'IP采购' },
      { value: '服务器', label: '服务器' },
      { value: '账号购买', label: '账号购买' },
      { value: '礼品卡', label: '礼品卡' },
      { value: '信用卡', label: '信用卡' },
    ],
  },
  {
    value: '行政办公',
    label: '行政办公',
    children: [
      { value: '行政支出', label: '行政支出' },
      { value: '行政冲销', label: '行政冲销' },
    ],
  },
  {
    value: '其他收入',
    label: '其他收入',
    children: [{ value: '其他收入', label: '其他收入' }],
  },
  {
    value: '其他支出',
    label: '其他支出',
    children: [{ value: '其他支出', label: '其他支出' }],
  },
]

const primaryCategoryOptions = transactionCategoryOptions.map(({ value, label }) => ({ value, label }))
const primaryCategorySet = new Set(primaryCategoryOptions.map(item => item.value))
const secondaryToPrimaryMap = Object.fromEntries(
  transactionCategoryOptions.flatMap(group => group.children.map(item => [item.value, group.value])),
) as Record<string, string>
const incomeTypeValues = new Set(['任务收入', '补款收入', '其他收入'])
const usdCapableTypeValues = new Set(['任务收入', '补款收入', 'IP采购', '服务器', '账号购买', '礼品卡', '信用卡', '其他收入'])
const transactionTypeMeta: Record<string, { label: string; color: string }> = {
  任务收入: { label: '任务收入', color: 'green' },
  补款收入: { label: '补款收入', color: 'cyan' },
  截单退款: { label: '截单退款', color: 'red' },
  赔付佣金: { label: '赔付佣金', color: 'volcano' },
  退差价: { label: '退差价', color: 'orange' },
  IP采购: { label: 'IP采购', color: 'purple' },
  服务器: { label: '服务器', color: 'blue' },
  账号购买: { label: '账号购买', color: 'gold' },
  礼品卡: { label: '礼品卡', color: 'gold' },
  信用卡: { label: '信用卡', color: 'geekblue' },
  行政支出: { label: '行政支出', color: 'default' },
  行政冲销: { label: '行政冲销', color: 'processing' },
  其他收入: { label: '其他收入', color: 'lime' },
  其他支出: { label: '其他支出', color: 'default' },
}
const statusOptions = ['待确认', '已确认', '已修改']
const statusBadge: Record<string, string> = { 待确认: 'warning', 已确认: 'success', 已修改: 'processing' }

const emptyForm = () => ({
  entry_scope: '业务收入',
  transaction_type: '任务收入',
  direction: '收入',
  amount_cny: 0,
  amount_usd: 0,
  exchange_rate: null as number | null,
  customer_name: '',
  order_number: '',
  staff_name: '',
  handler_name: currentUser.value?.name || '',
  status: '待确认',
  notes: '',
  transaction_date: dayjs().format('YYYY-MM-DD'),
})
const form = reactive(emptyForm())

const columns = [
  { title: '流水号', dataIndex: 'transaction_no', key: 'transaction_no', width: 160 },
  { title: '日期', dataIndex: 'transaction_date', key: 'transaction_date', width: 100 },
  { title: '交易类型', key: 'transaction_type', width: 170 },
  { title: '收支方向', key: 'direction', width: 90 },
  { title: '金额', key: 'amount', width: 140 },
  { title: '客户', dataIndex: 'customer_name', key: 'customer_name', width: 110, ellipsis: true },
  { title: '订单号', dataIndex: 'order_number', key: 'order_number', width: 140, ellipsis: true },
  { title: '申请人', dataIndex: 'staff_name', key: 'staff_name', width: 100 },
  { title: '操作人', dataIndex: 'handler_name', key: 'handler_name', width: 100 },
  { title: '状态', key: 'status', width: 90 },
  { title: '备注', dataIndex: 'notes', key: 'notes', width: 140, ellipsis: true },
  { title: '操作', key: 'action', width: 120, fixed: 'right' as const },
]

function formatNum(n: number) {
  return (n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function inferEntryScope(type: string) {
  return secondaryToPrimaryMap[type] || '其他支出'
}

const isAdministrativeEntry = computed(() => form.entry_scope === '行政办公')
const manualTypeOptions = computed(() => transactionCategoryOptions.find(item => item.value === form.entry_scope)?.children || [])
const filterSecondaryOptions = computed(() => {
  if (filterPrimaryCategory.value) {
    return transactionCategoryOptions.find(item => item.value === filterPrimaryCategory.value)?.children || []
  }
  return transactionCategoryOptions.flatMap(item => item.children)
})
const showUsdFields = computed(() => usdCapableTypeValues.has(form.transaction_type))
const showOrderNumberField = computed(() => ['业务收入', '业务支出'].includes(form.entry_scope))
const counterpartyLabel = computed(() => {
  if (isAdministrativeEntry.value) return '收款方 / 商户'
  if (showOrderNumberField.value) return '关联客户'
  return '往来对象'
})
const counterpartyPlaceholder = computed(() => {
  if (isAdministrativeEntry.value) return '例如：超市、办公室、供应商'
  if (showOrderNumberField.value) return '关联客户(可选)'
  return '往来对象(可选)'
})
const ownerLabel = computed(() => '申请人')

function normalizeTransactionStatus(status: any) {
  const raw = String(status || '').trim()
  if (raw === '待审批') return '待确认'
  if (raw === '已取消') return '已修改'
  return statusOptions.includes(raw) ? raw : (raw || '待确认')
}

function normalizeTransactionCategories(record: any) {
  const rawType = String(record?.transaction_type || '').trim()
  const rawScope = String(record?.entry_scope || '').trim()
  const text = `${rawScope} ${rawType} ${record?.notes || ''}`

  if (primaryCategorySet.has(rawScope) && secondaryToPrimaryMap[rawType] === rawScope) {
    return { primary: rawScope, secondary: rawType }
  }
  if (secondaryToPrimaryMap[rawType]) {
    return { primary: secondaryToPrimaryMap[rawType], secondary: rawType }
  }
  if (rawType === '订单收入') return { primary: '业务收入', secondary: '任务收入' }
  if (rawType === '客户充值' || rawType === '批次收款') return { primary: '业务收入', secondary: '补款收入' }
  if (rawType === '退款' || rawType === '退款支出') return { primary: '业务支出', secondary: '截单退款' }
  if (rawType === '返佣支出') return { primary: '业务支出', secondary: '赔付佣金' }
  if (rawType === '任务支出' || rawType === '业务支出') return { primary: '业务支出', secondary: '退差价' }
  if (rawType === '礼品卡采购') return { primary: '运营支出', secondary: '礼品卡' }
  if (rawType === '美金购汇') return { primary: '运营支出', secondary: '信用卡' }
  if (rawType === '行政支出') return { primary: '行政办公', secondary: '行政支出' }
  if (rawType === '其他收入') return { primary: '其他收入', secondary: '其他收入' }
  if (rawType === '其他支出') return { primary: '其他支出', secondary: '其他支出' }

  if (/行政冲销/.test(text)) return { primary: '行政办公', secondary: '行政冲销' }
  if (/行政|办公|人事|工资/.test(text)) return { primary: '行政办公', secondary: '行政支出' }
  if (/ip|代理|网络/i.test(text)) return { primary: '运营支出', secondary: 'IP采购' }
  if (/服务器|server/i.test(text)) return { primary: '运营支出', secondary: '服务器' }
  if (/账号|账号购买/.test(text)) return { primary: '运营支出', secondary: '账号购买' }
  if (/礼品卡/.test(text)) return { primary: '运营支出', secondary: '礼品卡' }
  if (/信用卡|卡费/.test(text)) return { primary: '运营支出', secondary: '信用卡' }
  if (/退款|截单/.test(text)) return { primary: '业务支出', secondary: '截单退款' }
  if (/佣金|返佣/.test(text)) return { primary: '业务支出', secondary: '赔付佣金' }
  if (/差价|补差/.test(text)) return { primary: '业务支出', secondary: '退差价' }
  if (/收入|补款|收款/.test(text) || record?.direction === '收入') return { primary: '业务收入', secondary: '补款收入' }
  if (rawScope === '行政') return { primary: '行政办公', secondary: '行政支出' }
  return record?.direction === '收入'
    ? { primary: '其他收入', secondary: '其他收入' }
    : { primary: '其他支出', secondary: '其他支出' }
}

function normalizeFinancialRow(row: any) {
  const { primary, secondary } = normalizeTransactionCategories(row)
  return {
    ...row,
    entry_scope: primary,
    transaction_type: secondary,
    direction: incomeTypeValues.has(secondary) ? '收入' : '支出',
    status: normalizeTransactionStatus(row?.status),
    handler_name: row?.handler_name || '',
  }
}

function getDirection(record: any) {
  const { secondary } = normalizeTransactionCategories(record)
  return incomeTypeValues.has(secondary) ? '收入' : '支出'
}

function getPrimaryCategoryLabel(record: any) {
  return normalizeTransactionCategories(record).primary
}

function getTransactionTypeLabel(record: any) {
  const secondary = normalizeTransactionCategories(record).secondary
  return transactionTypeMeta[secondary]?.label || secondary || '未分类'
}

function getTransactionTypeColor(record: any) {
  const secondary = normalizeTransactionCategories(record).secondary
  return transactionTypeMeta[secondary]?.color || 'default'
}

function hasAmount(record: any) {
  return Number(record?.amount_cny || 0) > 0 || Number(record?.amount_usd || 0) > 0
}

function onScopeChange(scope: string) {
  const nextOptions = transactionCategoryOptions.find(item => item.value === scope)?.children || []
  if (!nextOptions.some(item => item.value === form.transaction_type)) {
    form.transaction_type = nextOptions[0].value
  }
  if (!usdCapableTypeValues.has(form.transaction_type)) {
    form.amount_usd = 0
    form.exchange_rate = null
  } else {
    form.exchange_rate = form.exchange_rate || 7.25
  }
  if (!['业务收入', '业务支出'].includes(scope)) {
    form.order_number = ''
  }
  if (!form.handler_name) form.handler_name = currentUser.value?.name || ''
  onTypeChange(form.transaction_type)
}

function onTypeChange(val: string) {
  form.direction = incomeTypeValues.has(val) ? '收入' : '支出'
  if (!usdCapableTypeValues.has(val)) {
    form.amount_usd = 0
    form.exchange_rate = null
  } else {
    form.exchange_rate = form.exchange_rate || 7.25
  }
  if (!showOrderNumberField.value) {
    form.order_number = ''
  }
}

function onPrimaryFilterChange() {
  if (filterType.value && !filterSecondaryOptions.value.some(item => item.value === filterType.value)) {
    filterType.value = undefined
  }
  page.value = 1
  loadData()
}

async function loadData() {
  loading.value = true
  try {
    let q = supabase.from('financial_transactions').select('*')
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
    if (search.value) q = q.or(`customer_name.ilike.%${search.value}%,order_number.ilike.%${search.value}%,notes.ilike.%${search.value}%,transaction_no.ilike.%${search.value}%`)
    if (dateRange.value) {
      q = q.gte('transaction_date', dateRange.value[0].format('YYYY-MM-DD'))
      q = q.lte('transaction_date', dateRange.value[1].format('YYYY-MM-DD'))
    }
    const { data } = await q
    const rows = (data || [])
      .map(normalizeFinancialRow)
      .filter((row: any) => !filterPrimaryCategory.value || row.entry_scope === filterPrimaryCategory.value)
      .filter((row: any) => !filterType.value || row.transaction_type === filterType.value)
      .filter((row: any) => !filterDirection.value || row.direction === filterDirection.value)
      .filter((row: any) => !filterStatus.value || row.status === filterStatus.value)
    total.value = rows.length
    if ((page.value - 1) * pageSize.value >= rows.length && page.value > 1) {
      page.value = 1
    }
    const start = (page.value - 1) * pageSize.value
    list.value = rows.slice(start, start + pageSize.value)
  } finally { loading.value = false }
}

async function loadStats() {
  let q = supabase.from('financial_transactions').select('entry_scope, transaction_type, direction, amount_cny, amount_usd, status, notes')
  if (dateRange.value) {
    q = q.gte('transaction_date', dateRange.value[0].format('YYYY-MM-DD'))
    q = q.lte('transaction_date', dateRange.value[1].format('YYYY-MM-DD'))
  }
  const { data } = await q
  const rows = (data || []).map(normalizeFinancialRow)
  stats.count = rows.length
  stats.totalIncome = rows.filter(r => r.direction === '收入').reduce((s, r) => s + Number(r.amount_cny || 0), 0)
  stats.totalIncomeUsd = rows.filter(r => r.direction === '收入').reduce((s, r) => s + Number(r.amount_usd || 0), 0)
  stats.totalExpense = rows.filter(r => r.direction === '支出').reduce((s, r) => s + Number(r.amount_cny || 0), 0)
}

function onTableChange(p: any) {
  page.value = p.current
  pageSize.value = p.pageSize
  loadData()
}

function openAdd() {
  editId.value = null
  Object.assign(form, emptyForm())
  onScopeChange(form.entry_scope)
  modalOpen.value = true
}

function openEdit(row: any) {
  const normalized = normalizeFinancialRow(row)
  editId.value = row.id
  Object.assign(form, {
    entry_scope: inferEntryScope(normalized.transaction_type),
    transaction_type: normalized.transaction_type,
    direction: normalized.direction,
    amount_cny: Number(row.amount_cny || 0),
    amount_usd: Number(row.amount_usd || 0),
    exchange_rate: row.exchange_rate ? Number(row.exchange_rate) : null,
    customer_name: row.customer_name || '',
    order_number: row.order_number || '',
    staff_name: row.staff_name || '',
    handler_name: currentUser.value?.name || row.handler_name || '',
    status: normalized.status === '已确认' ? '已修改' : normalized.status,
    notes: row.notes || '',
    transaction_date: row.transaction_date || dayjs().format('YYYY-MM-DD'),
  })
  onScopeChange(form.entry_scope)
  modalOpen.value = true
}

async function handleSave() {
  if (Number(form.amount_cny || 0) <= 0 && Number(form.amount_usd || 0) <= 0) { message.error('人民币或美元金额至少填写一项'); return }
  if (!form.transaction_date) { message.error('请填写交易日期'); return }
  saving.value = true
  try {
    const payload: any = {
      ...form,
      entry_scope: form.entry_scope,
      direction: getDirection(form),
      handler_name: currentUser.value?.name || form.handler_name || '',
      updated_at: new Date().toISOString(),
    }
    if (!showUsdFields.value) {
      payload.amount_usd = null
      payload.exchange_rate = null
    } else if (!payload.amount_usd) {
      payload.amount_usd = null
    }
    if (!showOrderNumberField.value) {
      payload.order_number = null
    }
    if (editId.value) {
      await supabase.from('financial_transactions').update(payload).eq('id', editId.value)
      message.success('已更新')
    } else {
      const { data: noData } = await supabase.rpc('generate_transaction_no')
      payload.transaction_no = noData || `FT-${Date.now()}`
      await supabase.from('financial_transactions').insert(payload)
      message.success('已新增')
    }
    modalOpen.value = false
    loadData(); loadStats()
  } finally { saving.value = false }
}

async function voidRow(id: string) {
  await supabase.from('financial_transactions').delete().eq('id', id)
  message.success('已作废')
  loadData(); loadStats()
}

onMounted(() => {
  loadFromStorage()
  onScopeChange(form.entry_scope)
  loadData()
  loadStats()
})
</script>

<style scoped>
.page-content { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin: 0; }

.kpi-row { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; margin-bottom: 20px; }
.kpi-card { background: #fff; border-radius: 10px; padding: 18px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,.06); border: 1px solid #f0f0f0; }
.kpi-val { font-size: 22px; font-weight: 700; color: #2563eb; }
.kpi-val.green { color: #059669; }
.kpi-val.red { color: #dc2626; }
.kpi-val.blue { color: #2563eb; }
.kpi-subval { margin-top: 4px; font-size: 12px; color: #6b7280; line-height: 1; }
.kpi-label { font-size: 12px; color: #6b7280; margin-top: 6px; }

.filter-bar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }

.form-tip { margin: -4px 0 8px; font-size: 12px; color: #6b7280; }
.amount-stack { display: flex; flex-direction: column; gap: 2px; }
.amount-in { color: #059669; font-weight: 600; }
.amount-out { color: #dc2626; font-weight: 600; }
.text-muted { color: #9ca3af; }
.type-stack { display: flex; flex-direction: column; gap: 4px; }
.type-primary { font-size: 12px; color: #6b7280; line-height: 1.2; }
</style>
