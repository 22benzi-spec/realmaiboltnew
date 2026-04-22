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
        <div class="kpi-label">收入合计</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val red">¥{{ formatNum(stats.totalExpense) }}</div>
        <div class="kpi-label">支出合计</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val" :class="stats.net >= 0 ? 'green' : 'red'">¥{{ formatNum(stats.net) }}</div>
        <div class="kpi-label">净收入</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val blue">{{ stats.count }}</div>
        <div class="kpi-label">交易笔数</div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <a-input v-model:value="search" placeholder="搜索客户 / 订单号 / 流水号 / 备注" style="width:220px" allow-clear @change="loadData" />
      <a-select v-model:value="filterType" placeholder="交易类型" style="width:140px" allow-clear @change="loadData">
        <a-select-option v-for="item in transactionTypeOptions" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
      </a-select>
      <a-select v-model:value="filterDirection" placeholder="收支方向" style="width:110px" allow-clear @change="loadData">
        <a-select-option value="收入">收入</a-select-option>
        <a-select-option value="支出">支出</a-select-option>
      </a-select>
      <a-select v-model:value="filterStatus" placeholder="状态" style="width:110px" allow-clear @change="loadData">
        <a-select-option value="已确认">已确认</a-select-option>
        <a-select-option value="待审批">待审批</a-select-option>
        <a-select-option value="已取消">已取消</a-select-option>
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
          <a-tag :color="getTransactionTypeColor(record)">{{ getTransactionTypeLabel(record) }}</a-tag>
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
            <a-popconfirm v-if="record.status === '待审批'" title="确认审批通过？" @confirm="approveRow(record)">
              <a-button type="link" size="small" style="color:#52c41a">审批</a-button>
            </a-popconfirm>
            <a-popconfirm title="确认删除？" @confirm="deleteRow(record.id)">
              <a-button type="link" size="small" danger>删除</a-button>
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
            <a-form-item label="记账归属" required>
              <a-select v-model:value="form.entry_scope" @change="onScopeChange">
                <a-select-option value="行政">行政</a-select-option>
                <a-select-option value="业务">业务</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="交易类型" required>
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
          <a-col v-if="!isAdministrativeEntry" :span="12">
            <a-form-item label="状态">
              <a-select v-model:value="form.status">
                <a-select-option value="已确认">已确认</a-select-option>
                <a-select-option value="待审批">待审批</a-select-option>
                <a-select-option value="已取消">已取消</a-select-option>
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

const loading = ref(false)
const saving = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const search = ref('')
const filterType = ref<string | undefined>(undefined)
const filterDirection = ref<string | undefined>(undefined)
const filterStatus = ref<string | undefined>(undefined)
const dateRange = ref<[Dayjs, Dayjs] | null>(null)

const stats = reactive({ totalIncome: 0, totalExpense: 0, net: 0, count: 0 })

const modalOpen = ref(false)
const editId = ref<string | null>(null)

const manualBusinessTypeOptions = [
  { value: '订单收入', label: '任务收入' },
  { value: '客户充值', label: '客户充值收入' },
  { value: '批次收款', label: '补款收入' },
  { value: '退款', label: '退款支出' },
  { value: '退款支出', label: '退款支出' },
  { value: '业务支出', label: '业务支出' },
  { value: '任务支出', label: '任务支出' },
  { value: '返佣支出', label: '返佣支出' },
  { value: '礼品卡采购', label: '礼品卡采购支出' },
  { value: '美金购汇', label: '美金购汇支出' },
  { value: '其他收入', label: '其他收入' },
]
const manualAdministrativeTypeOptions = [
  { value: '行政支出', label: '行政支出' },
]
const transactionTypeOptions = [
  { value: '订单收入', label: '任务收入' },
  { value: '客户充值', label: '客户充值收入' },
  { value: '批次收款', label: '补款收入' },
  { value: '退款', label: '退款支出' },
  { value: '退款支出', label: '退款支出' },
  { value: '任务支出', label: '任务支出' },
  { value: '行政支出', label: '行政支出' },
  { value: '业务支出', label: '业务支出' },
  { value: '返佣支出', label: '返佣支出' },
  { value: '礼品卡采购', label: '礼品卡采购支出' },
  { value: '美金购汇', label: '美金购汇支出' },
  { value: '其他收入', label: '其他收入' },
]
const incomeTypeValues = new Set(['订单收入', '客户充值', '批次收款', '其他收入'])
const administrativeTypeValues = new Set(['行政支出'])
const usdCapableTypeValues = new Set(['礼品卡采购', '美金购汇'])
const transactionTypeMeta: Record<string, { label: string; color: string }> = {
  '订单收入': { label: '任务收入', color: 'green' },
  '客户充值': { label: '客户充值收入', color: 'cyan' },
  '批次收款': { label: '补款收入', color: 'geekblue' },
  '退款': { label: '退款支出', color: 'red' },
  '退款支出': { label: '退款支出', color: 'red' },
  '任务支出': { label: '任务支出', color: 'volcano' },
  '行政支出': { label: '行政支出', color: 'gold' },
  '业务支出': { label: '业务支出', color: 'purple' },
  '返佣支出': { label: '返佣支出', color: 'orange' },
  '礼品卡采购': { label: '礼品卡采购支出', color: 'gold' },
  '美金购汇': { label: '美金购汇支出', color: 'blue' },
  '其他收入': { label: '其他收入', color: 'lime' },
  '其他支出': { label: '业务支出', color: 'purple' },
}
const statusBadge: Record<string, string> = { '已确认': 'success', '待审批': 'warning', '已取消': 'default' }

const emptyForm = () => ({
  entry_scope: '行政', transaction_type: '行政支出', direction: '支出', amount_cny: 0, amount_usd: 0,
  exchange_rate: null as number | null, customer_name: '', order_number: '', staff_name: '',
  status: '已确认', notes: '', transaction_date: dayjs().format('YYYY-MM-DD'),
})
const form = reactive(emptyForm())

const columns = [
  { title: '流水号', dataIndex: 'transaction_no', key: 'transaction_no', width: 160 },
  { title: '日期', dataIndex: 'transaction_date', key: 'transaction_date', width: 100 },
  { title: '流水类型', key: 'transaction_type', width: 140 },
  { title: '收支方向', key: 'direction', width: 90 },
  { title: '金额', key: 'amount', width: 140 },
  { title: '客户', dataIndex: 'customer_name', key: 'customer_name', width: 110, ellipsis: true },
  { title: '订单号', dataIndex: 'order_number', key: 'order_number', width: 140, ellipsis: true },
  { title: '商务', dataIndex: 'staff_name', key: 'staff_name', width: 90 },
  { title: '状态', key: 'status', width: 90 },
  { title: '备注', dataIndex: 'notes', key: 'notes', width: 140, ellipsis: true },
  { title: '操作', key: 'action', width: 150, fixed: 'right' as const },
]

function formatNum(n: number) {
  return (n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function inferEntryScope(type: string) {
  return administrativeTypeValues.has(type) ? '行政' : '业务'
}

const isAdministrativeEntry = computed(() => form.entry_scope === '行政')
const manualTypeOptions = computed(() => isAdministrativeEntry.value ? manualAdministrativeTypeOptions : manualBusinessTypeOptions)
const showUsdFields = computed(() => !isAdministrativeEntry.value && usdCapableTypeValues.has(form.transaction_type))
const showOrderNumberField = computed(() => !isAdministrativeEntry.value && form.transaction_type === '任务支出')
const counterpartyLabel = computed(() => {
  if (isAdministrativeEntry.value) return '收款方 / 商户'
  if (form.transaction_type === '任务支出') return '关联客户'
  return '往来对象'
})
const counterpartyPlaceholder = computed(() => {
  if (isAdministrativeEntry.value) return '例如：超市、办公室、供应商'
  if (form.transaction_type === '任务支出') return '关联客户(可选)'
  return '往来对象(可选)'
})
const ownerLabel = computed(() => isAdministrativeEntry.value ? '经手人' : '商务')

function getDirection(record: any) {
  if (record?.direction === '收入' || record?.direction === '支出') return record.direction
  return incomeTypeValues.has(record?.transaction_type) ? '收入' : '支出'
}

function getNormalizedTransactionType(record: any) {
  const rawType = String(record?.transaction_type || '')
  if (rawType !== '其他支出') return rawType
  const text = `${record?.transaction_type || ''} ${record?.notes || ''}`
  if (/任务付款|任务退款|任务支出/.test(text)) return '任务支出'
  if (/行政|办公|人事|工资|行政支出/.test(text)) return '行政支出'
  return '业务支出'
}

function getTransactionTypeLabel(record: any) {
  const rawType = getNormalizedTransactionType(record)
  return transactionTypeMeta[rawType]?.label || rawType || '未分类'
}

function getTransactionTypeColor(record: any) {
  const rawType = getNormalizedTransactionType(record)
  return transactionTypeMeta[rawType]?.color || 'default'
}

function hasAmount(record: any) {
  return Number(record?.amount_cny || 0) > 0 || Number(record?.amount_usd || 0) > 0
}

function onScopeChange(scope: string) {
  const nextOptions = scope === '行政' ? manualAdministrativeTypeOptions : manualBusinessTypeOptions
  if (!nextOptions.some(item => item.value === form.transaction_type)) {
    form.transaction_type = nextOptions[0].value
  }
  if (scope === '行政') {
    form.amount_usd = 0
    form.exchange_rate = null
    form.order_number = ''
    form.status = '已确认'
  } else if (usdCapableTypeValues.has(form.transaction_type)) {
    form.exchange_rate = form.exchange_rate || 7.25
  }
  onTypeChange(form.transaction_type)
}

function onTypeChange(val: string) {
  if (incomeTypeValues.has(val)) {
    form.direction = '收入'
  } else {
    form.direction = '支出'
  }
  if (!usdCapableTypeValues.has(val)) {
    form.amount_usd = 0
    form.exchange_rate = null
  } else if (!isAdministrativeEntry.value) {
    form.exchange_rate = form.exchange_rate || 7.25
  }
  if (val !== '任务支出') {
    form.order_number = ''
  }
}

async function loadData() {
  loading.value = true
  try {
    let q = supabase.from('financial_transactions').select('*', { count: 'exact' })
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })
    if (search.value) q = q.or(`customer_name.ilike.%${search.value}%,order_number.ilike.%${search.value}%,notes.ilike.%${search.value}%,transaction_no.ilike.%${search.value}%`)
    if (filterType.value) q = q.eq('transaction_type', filterType.value)
    if (filterDirection.value) q = q.eq('direction', filterDirection.value)
    if (filterStatus.value) q = q.eq('status', filterStatus.value)
    if (dateRange.value) {
      q = q.gte('transaction_date', dateRange.value[0].format('YYYY-MM-DD'))
      q = q.lte('transaction_date', dateRange.value[1].format('YYYY-MM-DD'))
    }
    q = q.range((page.value - 1) * pageSize.value, page.value * pageSize.value - 1)
    const { data, count } = await q
    list.value = data || []
    total.value = count || 0
  } finally { loading.value = false }
}

async function loadStats() {
  let q = supabase.from('financial_transactions').select('direction, amount_cny, status')
  if (dateRange.value) {
    q = q.gte('transaction_date', dateRange.value[0].format('YYYY-MM-DD'))
    q = q.lte('transaction_date', dateRange.value[1].format('YYYY-MM-DD'))
  }
  const { data } = await q
  const rows = (data || []).filter(r => r.status !== '已取消')
  stats.count = rows.length
  stats.totalIncome = rows.filter(r => r.direction === '收入').reduce((s, r) => s + Number(r.amount_cny || 0), 0)
  stats.totalExpense = rows.filter(r => r.direction === '支出').reduce((s, r) => s + Number(r.amount_cny || 0), 0)
  stats.net = stats.totalIncome - stats.totalExpense
}

function onTableChange(p: any) {
  page.value = p.current
  pageSize.value = p.pageSize
  loadData()
}

function openAdd() {
  editId.value = null
  Object.assign(form, emptyForm())
  modalOpen.value = true
}

function openEdit(row: any) {
  editId.value = row.id
  Object.assign(form, {
    entry_scope: inferEntryScope(getNormalizedTransactionType(row)),
    transaction_type: getNormalizedTransactionType(row), direction: getDirection(row),
    amount_cny: Number(row.amount_cny), amount_usd: Number(row.amount_usd || 0),
    exchange_rate: row.exchange_rate ? Number(row.exchange_rate) : null, customer_name: row.customer_name || '',
    order_number: row.order_number || '', staff_name: row.staff_name || '',
    status: row.status || '已确认', notes: row.notes || '',
    transaction_date: row.transaction_date || dayjs().format('YYYY-MM-DD'),
  })
  onScopeChange(form.entry_scope)
  modalOpen.value = true
}

async function handleSave() {
  if (!form.amount_cny || form.amount_cny <= 0) { message.error('金额不能为0'); return }
  if (!form.transaction_date) { message.error('请填写交易日期'); return }
  saving.value = true
  try {
    const { entry_scope, ...restForm } = form
    const payload: any = { ...restForm, updated_at: new Date().toISOString() }
    if (entry_scope === '行政') {
      payload.amount_usd = null
      payload.exchange_rate = null
      payload.order_number = null
      payload.status = '已确认'
    } else if (!showUsdFields.value) {
      payload.amount_usd = null
      payload.exchange_rate = null
    } else if (!payload.amount_usd) {
      payload.amount_usd = null
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

async function approveRow(row: any) {
  await supabase.from('financial_transactions').update({ status: '已确认', updated_at: new Date().toISOString() }).eq('id', row.id)
  message.success('已审批通过')
  loadData(); loadStats()
}

async function deleteRow(id: string) {
  await supabase.from('financial_transactions').delete().eq('id', id)
  message.success('已删除')
  loadData(); loadStats()
}

onMounted(() => { loadData(); loadStats() })
</script>

<style scoped>
.page-content { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin: 0; }

.kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 20px; }
.kpi-card { background: #fff; border-radius: 10px; padding: 18px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,.06); border: 1px solid #f0f0f0; }
.kpi-val { font-size: 22px; font-weight: 700; color: #1677ff; }
.kpi-val.green { color: #52c41a; }
.kpi-val.red { color: #ff4d4f; }
.kpi-val.blue { color: #1677ff; }
.kpi-label { font-size: 12px; color: #8c8c8c; margin-top: 4px; }

.filter-bar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }

.form-tip { margin: -4px 0 8px; font-size: 12px; color: #8c8c8c; }
.amount-stack { display: flex; flex-direction: column; gap: 2px; }
.amount-in { color: #52c41a; font-weight: 600; }
.amount-out { color: #ff4d4f; font-weight: 600; }
.text-muted { color: #bbb; }
</style>
