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
        <div class="kpi-val blue">{{ stats.main }}</div>
        <div class="kpi-label">主号</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val orange">{{ stats.secondary }}</div>
        <div class="kpi-label">次用号</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-val gray2">{{ stats.backup }}</div>
        <div class="kpi-label">备用号</div>
      </div>
    </div>

    <!-- 筛选 -->
    <div class="filter-bar">
      <a-input
        v-model:value="search"
        placeholder="搜索聊单号 / 归属人 / 手机号 / 邮箱"
        style="width:260px" allow-clear @change="loadData"
      />
      <a-select v-model:value="filterRole" placeholder="账号用途" style="width:110px" allow-clear @change="loadData">
        <a-select-option value="主号">主号</a-select-option>
        <a-select-option value="次用号">次用号</a-select-option>
        <a-select-option value="备用号">备用号</a-select-option>
      </a-select>
      <a-select v-model:value="filterStatus" placeholder="状态" style="width:100px" allow-clear @change="loadData">
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
      :scroll="{ x: 1300 }"
      @change="onTableChange"
    >
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'account_no'">
          <div class="account-cell">
            <span class="account-no">{{ record.account_no }}</span>
            <a-tag :color="roleColor[record.account_role] || 'default'" size="small">{{ record.account_role || '主号' }}</a-tag>
          </div>
        </template>

        <template v-if="column.key === 'contact'">
          <div class="contact-cell">
            <div v-if="record.phone_type === 'Pingme' && record.pingme_number" class="contact-row">
              <span class="contact-badge pingme">PM</span>
              <span class="contact-val">{{ record.pingme_number }}</span>
            </div>
            <div v-else-if="record.phone_number" class="contact-row">
              <span class="contact-badge phone">手机</span>
              <span class="contact-val">{{ record.phone_number }}</span>
            </div>
            <div v-if="record.email" class="contact-row">
              <span class="contact-badge email">邮箱</span>
              <span class="contact-val">{{ record.email }}</span>
            </div>
            <span v-if="!record.phone_number && !record.pingme_number && !record.email" class="text-none">无</span>
          </div>
        </template>

        <template v-if="column.key === 'login_envs'">
          <div class="env-list">
            <span v-if="record.ads_power_id" class="env-tag ads">ADS: {{ record.ads_power_id }}</span>
            <span v-if="record.local_browser" class="env-tag local">本地: {{ record.local_browser }}</span>
            <span v-if="record.physical_device" class="env-tag device">实体机: {{ record.physical_device }}</span>
            <span v-if="record.cloud_phone" class="env-tag cloud">云手机: {{ record.cloud_phone }}</span>
            <span v-if="!record.ads_power_id && !record.local_browser && !record.physical_device && !record.cloud_phone" class="text-none">无</span>
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
      width="680px"
      @ok="handleSave"
      :confirm-loading="saving"
    >
      <a-form :model="form" layout="vertical" style="margin-top:8px">
        <a-row :gutter="16">
          <!-- 基本信息 -->
          <a-col :span="12">
            <a-form-item label="聊单号" required>
              <a-input v-model:value="form.account_no" placeholder="如 WX001 / 账号名称" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="账号用途">
              <a-select v-model:value="form.account_role">
                <a-select-option value="主号">主号</a-select-option>
                <a-select-option value="次用号">次用号</a-select-option>
                <a-select-option value="备用号">备用号</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="归属人">
              <a-input v-model:value="form.owner_name" placeholder="业务员 / 买手姓名" />
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

          <!-- 手机号 -->
          <a-col :span="24">
            <a-divider style="margin:8px 0 12px;font-size:13px;color:#6b7280">手机号 / 邮箱</a-divider>
          </a-col>
          <a-col :span="12">
            <a-form-item label="手机号类型">
              <a-select v-model:value="form.phone_type">
                <a-select-option value="个人">个人（中国手机号）</a-select-option>
                <a-select-option value="Pingme">Pingme（虚拟号）</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item v-if="form.phone_type === '个人'" label="手机号">
              <a-input v-model:value="form.phone_number" placeholder="中国手机号" />
            </a-form-item>
            <a-form-item v-else label="Pingme 号码">
              <a-input v-model:value="form.pingme_number" placeholder="Pingme 虚拟号码" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="绑定邮箱">
              <a-input v-model:value="form.email" placeholder="注册邮箱" />
            </a-form-item>
          </a-col>

          <!-- 多端登录 -->
          <a-col :span="24">
            <a-divider style="margin:8px 0 12px;font-size:13px;color:#6b7280">登录环境（可多端登录）</a-divider>
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
            <a-form-item label="实体机">
              <a-input v-model:value="form.physical_device" placeholder="如 iPhone13 / 设备序列号" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="云手机">
              <a-input v-model:value="form.cloud_phone" placeholder="云手机标识 / 编号" />
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
const filterRole = ref<string | undefined>(undefined)
const filterStatus = ref<string | undefined>(undefined)
const stats = reactive({ total: 0, active: 0, disabled: 0, main: 0, secondary: 0, backup: 0 })
const modalOpen = ref(false)
const editId = ref<string | null>(null)

const emptyForm = () => ({
  account_no: '', owner_name: '', account_role: '主号',
  phone_type: '个人', phone_number: '', pingme_number: '', email: '',
  ads_power_id: '', local_browser: '', physical_device: '', cloud_phone: '',
  status: '在用', notes: '',
})
const form = reactive(emptyForm())

const roleColor: Record<string, string> = { '主号': 'blue', '次用号': 'orange', '备用号': 'default' }

const columns = [
  { title: '聊单号', key: 'account_no', width: 170 },
  { title: '归属人', dataIndex: 'owner_name', key: 'owner_name', width: 100 },
  { title: '手机号 / 邮箱', key: 'contact', width: 200 },
  { title: '登录环境', key: 'login_envs', width: 300 },
  { title: '状态', key: 'status', width: 90 },
  { title: '备注', dataIndex: 'notes', key: 'notes', width: 130, ellipsis: true },
  { title: '操作', key: 'action', width: 110, fixed: 'right' as const },
]

async function loadData() {
  loading.value = true
  try {
    let q = supabase.from('chat_accounts').select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
    if (search.value) {
      q = q.or(`account_no.ilike.%${search.value}%,owner_name.ilike.%${search.value}%,phone_number.ilike.%${search.value}%,pingme_number.ilike.%${search.value}%,email.ilike.%${search.value}%`)
    }
    if (filterRole.value) q = q.eq('account_role', filterRole.value)
    if (filterStatus.value) q = q.eq('status', filterStatus.value)
    q = q.range((page.value - 1) * pageSize.value, page.value * pageSize.value - 1)
    const { data, count } = await q
    list.value = data || []
    total.value = count || 0
  } finally { loading.value = false }
}

async function loadStats() {
  const { data } = await supabase.from('chat_accounts').select('status, account_role')
  const rows = data || []
  stats.total = rows.length
  stats.active = rows.filter(r => r.status === '在用').length
  stats.disabled = rows.filter(r => r.status === '停用').length
  stats.main = rows.filter(r => r.account_role === '主号' || !r.account_role).length
  stats.secondary = rows.filter(r => r.account_role === '次用号').length
  stats.backup = rows.filter(r => r.account_role === '备用号').length
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
    account_no: row.account_no || '',
    owner_name: row.owner_name || '',
    account_role: row.account_role || '主号',
    phone_type: row.phone_type || '个人',
    phone_number: row.phone_number || '',
    pingme_number: row.pingme_number || '',
    email: row.email || '',
    ads_power_id: row.ads_power_id || '',
    local_browser: row.local_browser || '',
    physical_device: row.physical_device || '',
    cloud_phone: row.cloud_phone || '',
    status: row.status || '在用',
    notes: row.notes || '',
  })
  modalOpen.value = true
}

async function handleSave() {
  if (!form.account_no.trim()) { message.error('聊单号不能为空'); return }
  saving.value = true
  try {
    const payload: any = { ...form, updated_at: new Date().toISOString() }
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

.kpi-row { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 20px; }
.kpi-card { background: #fff; border-radius: 10px; padding: 14px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,.06); border: 1px solid #f0f0f0; }
.kpi-val { font-size: 22px; font-weight: 700; color: #1677ff; }
.kpi-val.green { color: #52c41a; }
.kpi-val.gray { color: #8c8c8c; }
.kpi-val.gray2 { color: #aaa; }
.kpi-val.blue { color: #1677ff; }
.kpi-val.orange { color: #fa8c16; }
.kpi-label { font-size: 12px; color: #8c8c8c; margin-top: 4px; }

.filter-bar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }

.account-cell { display: flex; align-items: center; gap: 6px; }
.account-no { font-weight: 600; font-size: 13px; color: #1a1a2e; }

.contact-cell { display: flex; flex-direction: column; gap: 4px; }
.contact-row { display: flex; align-items: center; gap: 5px; }
.contact-badge { font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 3px; color: #fff; flex-shrink: 0; }
.contact-badge.pingme { background: #0ea5e9; }
.contact-badge.phone { background: #059669; }
.contact-badge.email { background: #7c3aed; }
.contact-val { font-size: 12px; color: #374151; font-family: monospace; }
.text-none { color: #d1d5db; font-size: 12px; }

.env-list { display: flex; flex-wrap: wrap; gap: 4px; }
.env-tag { font-size: 11px; padding: 2px 7px; border-radius: 4px; display: inline-block; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.env-tag.ads { background: #fff7e6; color: #d46b08; border: 1px solid #ffd591; }
.env-tag.local { background: #f6ffed; color: #389e0d; border: 1px solid #b7eb8f; }
.env-tag.device { background: #e6f4ff; color: #0958d9; border: 1px solid #91caff; }
.env-tag.cloud { background: #f9f0ff; color: #531dab; border: 1px solid #d3adf7; }
</style>
