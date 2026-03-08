<template>
  <div class="page-content">
    <div class="page-header">
      <h2 class="page-title">服务器管理</h2>
      <a-button type="primary" @click="openAdd">新增服务器</a-button>
    </div>

    <!-- KPI -->
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-val">{{ stats.total }}</div>
        <div class="kpi-label">服务器总数</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val green">{{ stats.active }}</div>
        <div class="kpi-label">使用中</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val orange">{{ stats.pending }}</div>
        <div class="kpi-label">待续费</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val red">{{ stats.expiringSoon }}</div>
        <div class="kpi-label">7天内到期</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val gray">{{ stats.disabled }}</div>
        <div class="kpi-label">已停用/替换</div>
      </div>
    </div>

    <!-- 筛选 -->
    <div class="filter-bar">
      <a-input v-model:value="search" placeholder="搜索名称 / 供应商 / IP" style="width:220px" allow-clear @change="loadData" />
      <a-select v-model:value="filterStatus" placeholder="状态" style="width:120px" allow-clear @change="loadData">
        <a-select-option value="使用中">使用中</a-select-option>
        <a-select-option value="待续费">待续费</a-select-option>
        <a-select-option value="已停用">已停用</a-select-option>
        <a-select-option value="已替换">已替换</a-select-option>
      </a-select>
      <a-select v-model:value="filterUsage" placeholder="用途" style="width:130px" allow-clear @change="loadData">
        <a-select-option value="PayPal专用">PayPal专用</a-select-option>
        <a-select-option value="混用">混用</a-select-option>
        <a-select-option value="其他">其他</a-select-option>
      </a-select>
    </div>

    <!-- 表格 -->
    <a-table
      :columns="columns"
      :data-source="list"
      :loading="loading"
      :pagination="{ current: page, pageSize, total, showSizeChanger: true, showTotal: (t:number) => `共 ${t} 条` }"
      row-key="id"
      size="middle"
      :scroll="{ x: 1100 }"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'ip_info'">
          <span v-if="record.ip_resources" class="ip-chip">{{ record.ip_resources.ip_address }}</span>
          <span v-else class="text-muted">-</span>
        </template>
        <template v-if="column.key === 'status'">
          <a-badge :status="statusBadge[record.status] || 'default'" :text="record.status" />
        </template>
        <template v-if="column.key === 'usage_type'">
          <a-tag :color="usageColor[record.usage_type] || 'default'">{{ record.usage_type }}</a-tag>
        </template>
        <template v-if="column.key === 'renew'">
          <span class="renew-price">¥{{ Number(record.renew_price || 0).toFixed(0) }}/{{ record.renew_cycle }}</span>
        </template>
        <template v-if="column.key === 'next_renew_at'">
          <span :class="getRenewClass(record.next_renew_at)">{{ record.next_renew_at || '-' }}</span>
        </template>
        <template v-if="column.key === 'action'">
          <a-space>
            <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
            <a-button type="link" size="small" @click="quickRenew(record)">续费</a-button>
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
      :title="editId ? '编辑服务器' : '新增服务器'"
      width="620px"
      @ok="handleSave"
      :confirm-loading="saving"
    >
      <a-form :model="form" layout="vertical" style="margin-top:8px">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="服务器名称" required>
              <a-input v-model:value="form.server_name" placeholder="如 PayPal-Server-01" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="关联 IP">
              <a-select v-model:value="form.ip_id" placeholder="选择IP资源" allow-clear show-search :filter-option="filterIpOption">
                <a-select-option v-for="ip in ipOptions" :key="ip.id" :value="ip.id">
                  {{ ip.ip_address }} ({{ ip.ip_type }})
                </a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="供应商">
              <a-input v-model:value="form.supplier" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="绑定手机号">
              <a-input v-model:value="form.phone_number" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="续费周期">
              <a-select v-model:value="form.renew_cycle">
                <a-select-option value="月付">月付</a-select-option>
                <a-select-option value="季付">季付</a-select-option>
                <a-select-option value="年付">年付</a-select-option>
                <a-select-option value="不定期">不定期</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="续费金额（¥）">
              <a-input-number v-model:value="form.renew_price" :min="0" style="width:100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="上次续费日期">
              <a-input v-model:value="form.last_renewed_at" placeholder="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="下次到期日期">
              <a-input v-model:value="form.next_renew_at" placeholder="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="状态">
              <a-select v-model:value="form.status">
                <a-select-option value="使用中">使用中</a-select-option>
                <a-select-option value="待续费">待续费</a-select-option>
                <a-select-option value="已停用">已停用</a-select-option>
                <a-select-option value="已替换">已替换</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="用途">
              <a-select v-model:value="form.usage_type">
                <a-select-option value="PayPal专用">PayPal专用</a-select-option>
                <a-select-option value="混用">混用</a-select-option>
                <a-select-option value="其他">其他</a-select-option>
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

    <!-- 快速续费 -->
    <a-modal v-model:open="renewOpen" title="记录续费" width="400px" @ok="handleRenew" :confirm-loading="saving">
      <a-form layout="vertical" style="margin-top:8px">
        <a-form-item label="续费日期">
          <a-input v-model:value="renewForm.last_renewed_at" placeholder="YYYY-MM-DD" />
        </a-form-item>
        <a-form-item label="下次到期日期">
          <a-input v-model:value="renewForm.next_renew_at" placeholder="YYYY-MM-DD" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { supabase } from '../lib/supabase'
import dayjs from 'dayjs'

const loading = ref(false)
const saving = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const search = ref('')
const filterStatus = ref<string | undefined>(undefined)
const filterUsage = ref<string | undefined>(undefined)
const ipOptions = ref<any[]>([])

const stats = reactive({ total: 0, active: 0, pending: 0, expiringSoon: 0, disabled: 0 })

const modalOpen = ref(false)
const editId = ref<string | null>(null)
const renewOpen = ref(false)
const renewId = ref<string | null>(null)
const renewForm = reactive({ last_renewed_at: '', next_renew_at: '' })

const emptyForm = () => ({
  server_name: '', ip_id: null as string | null, supplier: '', phone_number: '',
  renew_cycle: '月付', renew_price: 0, last_renewed_at: '', next_renew_at: '',
  status: '使用中', usage_type: 'PayPal专用', notes: '',
})
const form = reactive(emptyForm())

const statusBadge: Record<string, string> = { '使用中': 'success', '待续费': 'warning', '已停用': 'error', '已替换': 'default' }
const usageColor: Record<string, string> = { 'PayPal专用': 'blue', '混用': 'cyan', '其他': 'default' }

const columns = [
  { title: '服务器名称', dataIndex: 'server_name', key: 'server_name', width: 160 },
  { title: '服务器 IP', key: 'ip_info', width: 140 },
  { title: '供应商', dataIndex: 'supplier', key: 'supplier', width: 110 },
  { title: '手机号', dataIndex: 'phone_number', key: 'phone_number', width: 130 },
  { title: '用途', key: 'usage_type', width: 110 },
  { title: '状态', key: 'status', width: 100 },
  { title: '续费', key: 'renew', width: 110 },
  { title: '下次到期', key: 'next_renew_at', width: 110 },
  { title: '备注', dataIndex: 'notes', key: 'notes', width: 130, ellipsis: true },
  { title: '操作', key: 'action', width: 160, fixed: 'right' as const },
]

function getRenewClass(date: string) {
  if (!date) return ''
  const days = dayjs(date).diff(dayjs(), 'day')
  if (days < 0) return 'expired'
  if (days <= 7) return 'expiring-soon'
  if (days <= 15) return 'expiring-warn'
  return ''
}

function filterIpOption(input: string, option: any) {
  return option.children?.toString().toLowerCase().includes(input.toLowerCase())
}

async function loadIpOptions() {
  const { data } = await supabase.from('ip_resources').select('id,ip_address,ip_type').eq('status', '使用中').order('ip_address')
  ipOptions.value = data || []
}

async function loadData() {
  loading.value = true
  try {
    let q = supabase.from('servers').select('*, ip_resources(ip_address)', { count: 'exact' })
      .order('created_at', { ascending: false })
    if (search.value) q = q.or(`server_name.ilike.%${search.value}%,supplier.ilike.%${search.value}%`)
    if (filterStatus.value) q = q.eq('status', filterStatus.value)
    if (filterUsage.value) q = q.eq('usage_type', filterUsage.value)
    q = q.range((page.value - 1) * pageSize.value, page.value * pageSize.value - 1)
    const { data, count } = await q
    list.value = data || []
    total.value = count || 0
  } finally { loading.value = false }
}

async function loadStats() {
  const { data } = await supabase.from('servers').select('status, next_renew_at')
  const rows = data || []
  stats.total = rows.length
  stats.active = rows.filter(r => r.status === '使用中').length
  stats.pending = rows.filter(r => r.status === '待续费').length
  stats.disabled = rows.filter(r => r.status === '已停用' || r.status === '已替换').length
  stats.expiringSoon = rows.filter(r => {
    if (!r.next_renew_at) return false
    const d = dayjs(r.next_renew_at).diff(dayjs(), 'day')
    return d >= 0 && d <= 7
  }).length
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
    server_name: row.server_name || '', ip_id: row.ip_id || null,
    supplier: row.supplier || '', phone_number: row.phone_number || '',
    renew_cycle: row.renew_cycle || '月付', renew_price: row.renew_price || 0,
    last_renewed_at: row.last_renewed_at || '', next_renew_at: row.next_renew_at || '',
    status: row.status || '使用中', usage_type: row.usage_type || 'PayPal专用', notes: row.notes || '',
  })
  modalOpen.value = true
}

async function handleSave() {
  if (!form.server_name.trim()) { message.error('服务器名称不能为空'); return }
  saving.value = true
  try {
    const payload: any = { ...form, updated_at: new Date().toISOString() }
    if (!payload.last_renewed_at) payload.last_renewed_at = null
    if (!payload.next_renew_at) payload.next_renew_at = null
    if (!payload.ip_id) payload.ip_id = null
    if (editId.value) {
      await supabase.from('servers').update(payload).eq('id', editId.value)
      message.success('已更新')
    } else {
      await supabase.from('servers').insert(payload)
      message.success('已新增')
    }
    modalOpen.value = false
    loadData(); loadStats()
  } finally { saving.value = false }
}

function quickRenew(row: any) {
  renewId.value = row.id
  renewForm.last_renewed_at = dayjs().format('YYYY-MM-DD')
  renewForm.next_renew_at = row.next_renew_at || ''
  renewOpen.value = true
}

async function handleRenew() {
  if (!renewId.value) return
  saving.value = true
  try {
    await supabase.from('servers').update({
      last_renewed_at: renewForm.last_renewed_at || null,
      next_renew_at: renewForm.next_renew_at || null,
      status: '使用中',
      updated_at: new Date().toISOString(),
    }).eq('id', renewId.value)
    message.success('续费记录已更新')
    renewOpen.value = false
    loadData(); loadStats()
  } finally { saving.value = false }
}

async function deleteRow(id: string) {
  await supabase.from('servers').delete().eq('id', id)
  message.success('已删除')
  loadData(); loadStats()
}

onMounted(() => { loadData(); loadStats(); loadIpOptions() })
</script>

<style scoped>
.page-content { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin: 0; }

.kpi-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 20px; }
.kpi-card { background: #fff; border-radius: 10px; padding: 16px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,.06); border: 1px solid #f0f0f0; }
.kpi-val { font-size: 24px; font-weight: 700; color: #1677ff; }
.kpi-val.green { color: #52c41a; }
.kpi-val.orange { color: #fa8c16; }
.kpi-val.red { color: #ff4d4f; }
.kpi-val.gray { color: #8c8c8c; }
.kpi-label { font-size: 12px; color: #8c8c8c; margin-top: 4px; }

.filter-bar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }

.ip-chip { background: #e6f4ff; color: #1677ff; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-family: monospace; }
.text-muted { color: #bbb; }
.renew-price { font-size: 12px; color: #555; }

.expired { color: #ff4d4f; font-weight: 600; }
.expiring-soon { color: #ff4d4f; font-weight: 500; }
.expiring-warn { color: #fa8c16; }
</style>
