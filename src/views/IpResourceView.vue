<template>
  <div class="page-content">
    <div class="page-header">
      <h2 class="page-title">IP 资源库</h2>
      <a-button type="primary" @click="openAdd">新增 IP</a-button>
    </div>

    <!-- KPI -->
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-val">{{ stats.total }}</div>
        <div class="kpi-label">IP 总数</div>
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

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <a-input v-model:value="search" placeholder="搜索 IP / 供应商 / 分配给" style="width:220px" allow-clear @change="loadData" />
      <a-select v-model:value="filterType" placeholder="IP类型" style="width:130px" allow-clear @change="loadData">
        <a-select-option value="买手IP">买手IP</a-select-option>
        <a-select-option value="服务器IP">服务器IP</a-select-option>
        <a-select-option value="其他">其他</a-select-option>
      </a-select>
      <a-select v-model:value="filterStatus" placeholder="状态" style="width:120px" allow-clear @change="loadData">
        <a-select-option value="使用中">使用中</a-select-option>
        <a-select-option value="待续费">待续费</a-select-option>
        <a-select-option value="已停用">已停用</a-select-option>
        <a-select-option value="已替换">已替换</a-select-option>
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
      :scroll="{ x: 1200 }"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'ip_type'">
          <a-tag :color="typeColor[record.ip_type] || 'default'">{{ record.ip_type }}</a-tag>
        </template>
        <template v-if="column.key === 'status'">
          <a-badge :status="statusBadge[record.status] || 'default'" :text="record.status" />
        </template>
        <template v-if="column.key === 'renew'">
          <div class="renew-info">
            <span class="renew-price">¥{{ Number(record.renew_price || 0).toFixed(0) }}/{{ record.renew_cycle }}</span>
          </div>
        </template>
        <template v-if="column.key === 'next_renew_at'">
          <span :class="getRenewClass(record.next_renew_at)">
            {{ record.next_renew_at || '-' }}
          </span>
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
      :title="editId ? '编辑 IP' : '新增 IP'"
      width="600px"
      @ok="handleSave"
      :confirm-loading="saving"
    >
      <a-form :model="form" layout="vertical" style="margin-top:8px">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="IP 地址" required>
              <a-input v-model:value="form.ip_address" placeholder="如 192.168.1.1" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="IP 类型">
              <a-select v-model:value="form.ip_type">
                <a-select-option value="买手IP">买手IP</a-select-option>
                <a-select-option value="服务器IP">服务器IP</a-select-option>
                <a-select-option value="其他">其他</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="供应商">
              <a-input v-model:value="form.supplier" placeholder="供应商名称" />
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
            <a-form-item label="分配给">
              <a-input v-model:value="form.assigned_to" placeholder="人名或用途" />
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
const filterType = ref<string | undefined>(undefined)
const filterStatus = ref<string | undefined>(undefined)

const stats = reactive({ total: 0, active: 0, pending: 0, expiringSoon: 0, disabled: 0 })

const modalOpen = ref(false)
const editId = ref<string | null>(null)
const renewOpen = ref(false)
const renewId = ref<string | null>(null)
const renewForm = reactive({ last_renewed_at: '', next_renew_at: '' })

const emptyForm = () => ({
  ip_address: '', ip_type: '买手IP', supplier: '', phone_number: '',
  renew_cycle: '月付', renew_price: 0, last_renewed_at: '', next_renew_at: '',
  status: '使用中', assigned_to: '', notes: '',
})
const form = reactive(emptyForm())

const typeColor: Record<string, string> = { '买手IP': 'blue', '服务器IP': 'cyan', '其他': 'default' }
const statusBadge: Record<string, string> = { '使用中': 'success', '待续费': 'warning', '已停用': 'error', '已替换': 'default' }

const columns = [
  { title: 'IP 地址', dataIndex: 'ip_address', key: 'ip_address', width: 150 },
  { title: '类型', key: 'ip_type', width: 100 },
  { title: '供应商', dataIndex: 'supplier', key: 'supplier', width: 110 },
  { title: '手机号', dataIndex: 'phone_number', key: 'phone_number', width: 130 },
  { title: '分配给', dataIndex: 'assigned_to', key: 'assigned_to', width: 110 },
  { title: '状态', key: 'status', width: 100 },
  { title: '续费', key: 'renew', width: 110 },
  { title: '下次到期', key: 'next_renew_at', width: 110 },
  { title: '备注', dataIndex: 'notes', key: 'notes', width: 140, ellipsis: true },
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

async function loadData() {
  loading.value = true
  try {
    let q = supabase.from('ip_resources').select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
    if (search.value) q = q.or(`ip_address.ilike.%${search.value}%,supplier.ilike.%${search.value}%,assigned_to.ilike.%${search.value}%`)
    if (filterType.value) q = q.eq('ip_type', filterType.value)
    if (filterStatus.value) q = q.eq('status', filterStatus.value)
    q = q.range((page.value - 1) * pageSize.value, page.value * pageSize.value - 1)
    const { data, count } = await q
    list.value = data || []
    total.value = count || 0
  } finally { loading.value = false }
}

async function loadStats() {
  const { data } = await supabase.from('ip_resources').select('status, next_renew_at')
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
    ip_address: row.ip_address || '', ip_type: row.ip_type || '买手IP',
    supplier: row.supplier || '', phone_number: row.phone_number || '',
    renew_cycle: row.renew_cycle || '月付', renew_price: row.renew_price || 0,
    last_renewed_at: row.last_renewed_at || '', next_renew_at: row.next_renew_at || '',
    status: row.status || '使用中', assigned_to: row.assigned_to || '', notes: row.notes || '',
  })
  modalOpen.value = true
}

async function handleSave() {
  if (!form.ip_address.trim()) { message.error('IP地址不能为空'); return }
  saving.value = true
  try {
    const payload: any = { ...form, updated_at: new Date().toISOString() }
    if (!payload.last_renewed_at) payload.last_renewed_at = null
    if (!payload.next_renew_at) payload.next_renew_at = null
    if (editId.value) {
      await supabase.from('ip_resources').update(payload).eq('id', editId.value)
      message.success('已更新')
    } else {
      await supabase.from('ip_resources').insert(payload)
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
    await supabase.from('ip_resources').update({
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
  await supabase.from('ip_resources').delete().eq('id', id)
  message.success('已删除')
  loadData(); loadStats()
}

onMounted(() => { loadData(); loadStats() })
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

.renew-info { display: flex; flex-direction: column; gap: 2px; }
.renew-price { font-size: 12px; color: #555; }

.expired { color: #ff4d4f; font-weight: 600; }
.expiring-soon { color: #ff4d4f; font-weight: 500; }
.expiring-warn { color: #fa8c16; }
</style>
