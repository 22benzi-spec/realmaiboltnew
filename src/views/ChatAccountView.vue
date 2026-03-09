<template>
  <div class="page-content">
    <div class="page-header">
      <h2 class="page-title">聊单号管理</h2>
      <a-button type="primary" @click="openAdd">新增聊单号</a-button>
    </div>

    <!-- KPI -->
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-val">{{ stats.total }}</div>
        <div class="kpi-label">聊单号总数</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val green">{{ stats.active }}</div>
        <div class="kpi-label">在用</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val gray">{{ stats.disabled }}</div>
        <div class="kpi-label">已停用</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val blue">{{ stats.salesman }}</div>
        <div class="kpi-label">业务员账号</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val cyan">{{ stats.buyer }}</div>
        <div class="kpi-label">买手账号</div>
      </div>
    </div>

    <!-- 筛选 -->
    <div class="filter-bar">
      <a-input v-model:value="search" placeholder="搜索聊单号 / 归属人 / 手机号" style="width:240px" allow-clear @change="loadData" />
      <a-select v-model:value="filterOwnerType" placeholder="归属类型" style="width:120px" allow-clear @change="loadData">
        <a-select-option value="业务员">业务员</a-select-option>
        <a-select-option value="买手">买手</a-select-option>
      </a-select>
      <a-select v-model:value="filterPlatform" placeholder="平台" style="width:120px" allow-clear @change="loadData">
        <a-select-option value="微信">微信</a-select-option>
        <a-select-option value="WhatsApp">WhatsApp</a-select-option>
        <a-select-option value="其他">其他</a-select-option>
      </a-select>
      <a-select v-model:value="filterStatus" placeholder="状态" style="width:110px" allow-clear @change="loadData">
        <a-select-option value="在用">在用</a-select-option>
        <a-select-option value="停用">停用</a-select-option>
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
        <template v-if="column.key === 'owner_type'">
          <a-tag :color="record.owner_type === '业务员' ? 'blue' : 'cyan'">{{ record.owner_type }}</a-tag>
        </template>
        <template v-if="column.key === 'platform'">
          <a-tag :color="platformColor[record.platform] || 'default'">{{ record.platform }}</a-tag>
        </template>
        <template v-if="column.key === 'env_info'">
          <div class="env-info">
            <span v-if="record.ads_power_id" class="env-tag ads">ADS: {{ record.ads_power_id }}</span>
            <span v-if="record.local_browser" class="env-tag local">本地: {{ record.local_browser }}</span>
            <span v-if="!record.ads_power_id && !record.local_browser" class="text-muted">-</span>
          </div>
        </template>
        <template v-if="column.key === 'status'">
          <a-badge :status="record.status === '在用' ? 'success' : 'default'" :text="record.status" />
        </template>
        <template v-if="column.key === 'action'">
          <a-space>
            <a-button type="link" size="small" @click="openEdit(record)">编辑</a-button>
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
      :title="editId ? '编辑聊单号' : '新增聊单号'"
      width="620px"
      @ok="handleSave"
      :confirm-loading="saving"
    >
      <a-form :model="form" layout="vertical" style="margin-top:8px">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="聊单号" required>
              <a-input v-model:value="form.account_no" placeholder="如 WX001 / 销售001" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="平台">
              <a-select v-model:value="form.platform">
                <a-select-option value="微信">微信</a-select-option>
                <a-select-option value="WhatsApp">WhatsApp</a-select-option>
                <a-select-option value="其他">其他</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="归属类型">
              <a-select v-model:value="form.owner_type">
                <a-select-option value="业务员">业务员</a-select-option>
                <a-select-option value="买手">买手</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="归属人">
              <a-input v-model:value="form.owner_name" placeholder="姓名" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="手机号">
              <a-input v-model:value="form.phone_number" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="AdsPower ID">
              <a-input v-model:value="form.ads_power_id" placeholder="AdsPower 环境ID" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="本地浏览器">
              <a-input v-model:value="form.local_browser" placeholder="本地浏览器环境标识" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="状态">
              <a-select v-model:value="form.status">
                <a-select-option value="在用">在用</a-select-option>
                <a-select-option value="停用">停用</a-select-option>
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

const loading = ref(false)
const saving = ref(false)
const list = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const search = ref('')
const filterOwnerType = ref<string | undefined>(undefined)
const filterPlatform = ref<string | undefined>(undefined)
const filterStatus = ref<string | undefined>(undefined)
const stats = reactive({ total: 0, active: 0, disabled: 0, salesman: 0, buyer: 0 })
const modalOpen = ref(false)
const editId = ref<string | null>(null)

const emptyForm = () => ({
  account_no: '', owner_type: '业务员', owner_name: '', platform: '微信',
  phone_number: '', ads_power_id: '', local_browser: '',
  status: '在用', notes: '',
})
const form = reactive(emptyForm())

const platformColor: Record<string, string> = { '微信': 'green', 'WhatsApp': 'lime', '其他': 'default' }

const columns = [
  { title: '聊单号', dataIndex: 'account_no', key: 'account_no', width: 130 },
  { title: '归属', key: 'owner_type', width: 90 },
  { title: '归属人', dataIndex: 'owner_name', key: 'owner_name', width: 100 },
  { title: '平台', key: 'platform', width: 90 },
  { title: '手机号', dataIndex: 'phone_number', key: 'phone_number', width: 130 },
  { title: '浏览器环境', key: 'env_info', width: 200 },
  { title: '状态', key: 'status', width: 90 },
  { title: '备注', dataIndex: 'notes', key: 'notes', width: 130, ellipsis: true },
  { title: '操作', key: 'action', width: 120, fixed: 'right' as const },
]

async function loadData() {
  loading.value = true
  try {
    let q = supabase.from('chat_accounts').select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
    if (search.value) q = q.or(`account_no.ilike.%${search.value}%,owner_name.ilike.%${search.value}%,phone_number.ilike.%${search.value}%`)
    if (filterOwnerType.value) q = q.eq('owner_type', filterOwnerType.value)
    if (filterPlatform.value) q = q.eq('platform', filterPlatform.value)
    if (filterStatus.value) q = q.eq('status', filterStatus.value)
    q = q.range((page.value - 1) * pageSize.value, page.value * pageSize.value - 1)
    const { data, count } = await q
    list.value = data || []
    total.value = count || 0
  } finally { loading.value = false }
}

async function loadStats() {
  const { data } = await supabase.from('chat_accounts').select('status, owner_type')
  const rows = data || []
  stats.total = rows.length
  stats.active = rows.filter(r => r.status === '在用').length
  stats.disabled = rows.filter(r => r.status === '停用').length
  stats.salesman = rows.filter(r => r.owner_type === '业务员').length
  stats.buyer = rows.filter(r => r.owner_type === '买手').length
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
    account_no: row.account_no || '', owner_type: row.owner_type || '业务员',
    owner_name: row.owner_name || '', platform: row.platform || '微信',
    phone_number: row.phone_number || '',
    ads_power_id: row.ads_power_id || '', local_browser: row.local_browser || '',
    status: row.status || '在用', notes: row.notes || '',
  })
  modalOpen.value = true
}

async function handleSave() {
  if (!form.account_no.trim()) { message.error('聊单号不能为空'); return }
  saving.value = true
  try {
    const payload: any = { ...form, updated_at: new Date().toISOString() }
    if (!payload.ip_id) payload.ip_id = null
    if (editId.value) {
      await supabase.from('chat_accounts').update(payload).eq('id', editId.value)
      message.success('已更新')
    } else {
      await supabase.from('chat_accounts').insert(payload)
      message.success('已新增')
    }
    modalOpen.value = false
    loadData(); loadStats()
  } finally { saving.value = false }
}

async function deleteRow(id: string) {
  await supabase.from('chat_accounts').delete().eq('id', id)
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
.kpi-val.gray { color: #8c8c8c; }
.kpi-val.blue { color: #1677ff; }
.kpi-val.cyan { color: #13c2c2; }
.kpi-label { font-size: 12px; color: #8c8c8c; margin-top: 4px; }

.filter-bar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }

.text-muted { color: #bbb; font-size: 12px; }

.env-info { display: flex; flex-direction: column; gap: 3px; }
.env-tag { font-size: 11px; padding: 1px 6px; border-radius: 3px; display: inline-block; max-width: 190px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.env-tag.ads { background: #fff7e6; color: #d46b08; border: 1px solid #ffd591; }
.env-tag.local { background: #f6ffed; color: #389e0d; border: 1px solid #b7eb8f; }
</style>
