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
      <a-input v-model:value="search" placeholder="搜索客户 / 订单号 / 备注" style="width:220px" allow-clear @change="loadData" />
      <a-select v-model:value="filterType" placeholder="交易类型" style="width:140px" allow-clear @change="loadData">
        <a-select-option v-for="t in typeOptions" :key="t" :value="t">{{ t }}</a-select-option>
      </a-select>
      <a-select v-model:value="filterDirection" placeholder="收入/支出" style="width:110px" allow-clear @change="loadData">
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
          <a-tag :color="record.direction === '收入' ? 'green' : 'red'">{{ record.direction }}</a-tag>
        </template>
        <template v-if="column.key === 'transaction_type'">
          <a-tag :color="typeColor[record.transaction_type] || 'default'">{{ record.transaction_type }}</a-tag>
        </template>
        <template v-if="column.key === 'amount_cny'">
          <span :class="record.direction === '收入' ? 'amount-in' : 'amount-out'">
            {{ record.direction === '收入' ? '+' : '-' }}¥{{ formatNum(record.amount_cny) }}
          </span>
        </template>
        <template v-if="column.key === 'amount_usd'">
          <span v-if="record.amount_usd">
            ${{ formatNum(record.amount_usd) }}
          </span>
          <span v-else class="text-muted">-</span>
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
            <a-form-item label="交易类型" required>
              <a-select v-model:value="form.transaction_type" @change="onTypeChange">
                <a-select-option v-for="t in typeOptions" :key="t" :value="t">{{ t }}</a-select-option>
              </a-select>
            </a-form-item>
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
          <a-col :span="12">
            <a-form-item label="金额 (USD)">
              <a-input-number v-model:value="form.amount_usd" :min="0" :precision="2" style="width:100%" placeholder="美金金额(可选)" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
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
            <a-form-item label="客户名称">
              <a-input v-model:value="form.customer_name" placeholder="关联客户(可选)" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="订单号">
              <a-input v-model:value="form.order_number" placeholder="关联订单号(可选)" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="操作人">
              <a-input v-model:value="form.staff_name" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
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
import { ref, reactive, onMounted } from 'vue'
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

const typeOptions = ['订单收入', '客户充值', '退款支出', '返佣支出', '礼品卡采购', '美金购汇', '其他收入', '其他支出']
const typeColor: Record<string, string> = {
  '订单收入': 'green', '客户充值': 'cyan', '退款支出': 'red', '返佣支出': 'orange',
  '礼品卡采购': 'gold', '美金购汇': 'blue', '其他收入': 'lime', '其他支出': 'default',
}
const statusBadge: Record<string, string> = { '已确认': 'success', '待审批': 'warning', '已取消': 'default' }

const emptyForm = () => ({
  transaction_type: '订单收入', direction: '收入', amount_cny: 0, amount_usd: 0,
  exchange_rate: 7.25, customer_name: '', order_number: '', staff_name: '',
  status: '已确认', notes: '', transaction_date: dayjs().format('YYYY-MM-DD'),
})
const form = reactive(emptyForm())

const columns = [
  { title: '流水号', dataIndex: 'transaction_no', key: 'transaction_no', width: 160 },
  { title: '日期', dataIndex: 'transaction_date', key: 'transaction_date', width: 100 },
  { title: '类型', key: 'transaction_type', width: 110 },
  { title: '方向', key: 'direction', width: 80 },
  { title: '金额(CNY)', key: 'amount_cny', width: 130 },
  { title: '金额(USD)', key: 'amount_usd', width: 100 },
  { title: '客户', dataIndex: 'customer_name', key: 'customer_name', width: 110, ellipsis: true },
  { title: '订单号', dataIndex: 'order_number', key: 'order_number', width: 140, ellipsis: true },
  { title: '操作人', dataIndex: 'staff_name', key: 'staff_name', width: 90 },
  { title: '状态', key: 'status', width: 90 },
  { title: '备注', dataIndex: 'notes', key: 'notes', width: 140, ellipsis: true },
  { title: '操作', key: 'action', width: 150, fixed: 'right' as const },
]

function formatNum(n: number) {
  return (n || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function onTypeChange(val: string) {
  if (['订单收入', '客户充值', '其他收入'].includes(val)) {
    form.direction = '收入'
  } else {
    form.direction = '支出'
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
    transaction_type: row.transaction_type, direction: row.direction,
    amount_cny: Number(row.amount_cny), amount_usd: Number(row.amount_usd || 0),
    exchange_rate: Number(row.exchange_rate || 7.25), customer_name: row.customer_name || '',
    order_number: row.order_number || '', staff_name: row.staff_name || '',
    status: row.status || '已确认', notes: row.notes || '',
    transaction_date: row.transaction_date || dayjs().format('YYYY-MM-DD'),
  })
  modalOpen.value = true
}

async function handleSave() {
  if (!form.amount_cny || form.amount_cny <= 0) { message.error('金额不能为0'); return }
  if (!form.transaction_date) { message.error('请填写交易日期'); return }
  saving.value = true
  try {
    const payload: any = { ...form, updated_at: new Date().toISOString() }
    if (!payload.amount_usd) payload.amount_usd = null
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

.amount-in { color: #52c41a; font-weight: 600; }
.amount-out { color: #ff4d4f; font-weight: 600; }
.text-muted { color: #bbb; }
</style>
