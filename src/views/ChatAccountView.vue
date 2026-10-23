<template>
  <div class="page-content">
    <div class="page-header">
      <h2 class="page-title">聊单号管理</h2>
      <a-button type="primary" @click="openAdd">新增聊单号</a-button>
    </div>

    <!-- KPI -->
    <div class="kpi-row">
      <div class="kpi-group left-group">
        <div class="kpi-card">
          <div class="kpi-val">{{ stats.total }}</div>
          <div class="kpi-label">聊单号总数</div>
        </div>
        <div class="kpi-card kpi-active">
          <div class="kpi-val green">{{ stats.active }}</div>
          <div class="kpi-label">在用</div>
        </div>
        <div class="kpi-card kpi-disabled">
          <div class="kpi-val gray">{{ stats.disabled }}</div>
          <div class="kpi-label">已停用</div>
        </div>
      </div>
      <div class="kpi-divider"></div>
      <div class="kpi-group right-group">
        <div class="kpi-card kpi-main">
          <div class="kpi-badge-wrap">
            <span class="kpi-role-badge main">主</span>
          </div>
          <div class="kpi-val blue">{{ stats.main }}</div>
          <div class="kpi-label">主号</div>
        </div>
        <div class="kpi-card kpi-secondary">
          <div class="kpi-badge-wrap">
            <span class="kpi-role-badge secondary">次</span>
          </div>
          <div class="kpi-val orange">{{ stats.secondary }}</div>
          <div class="kpi-label">次用号</div>
        </div>
        <div class="kpi-card kpi-backup">
          <div class="kpi-badge-wrap">
            <span class="kpi-role-badge backup">备</span>
          </div>
          <div class="kpi-val gray2">{{ stats.backup }}</div>
          <div class="kpi-label">备用号</div>
        </div>
      </div>
    </div>

    <!-- 筛选 -->
    <div class="filter-bar">
      <a-input
        v-model:value="search"
        placeholder="搜索聊单号别名 / 归属人 / 手机号 / 邮箱"
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
      :scroll="{ x: 1700 }"
      @change="onTableChange"
      :row-class-name="(r: any) => r.status === '停用' ? 'row-disabled' : ''"
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

        <template v-if="column.key === 'ip_address'">
          <span v-if="record.ip_address" class="ip-mono">{{ record.ip_address }}</span>
          <span v-else class="text-none">—</span>
        </template>

        <template v-if="column.key === 'friend_count'">
          <span v-if="record.friend_count != null" class="friend-count">{{ record.friend_count }}</span>
          <span v-else class="text-none">—</span>
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
          <div v-if="record.status === '停用'" class="status-disabled-cell">
            <a-badge status="error" text="停用" />
            <div v-if="record.disabled_reason" class="disabled-reason-text">{{ record.disabled_reason }}</div>
          </div>
          <a-badge v-else status="success" text="在用" />
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
          <a-col :span="12">
            <a-form-item label="聊单号别名" required>
              <a-input v-model:value="form.account_no" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="账号用途" required>
              <a-select v-model:value="form.account_role">
                <a-select-option value="主号">主号</a-select-option>
                <a-select-option value="次用号">次用号</a-select-option>
                <a-select-option value="备用号">备用号</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="名字" required>
              <a-input v-model:value="form.person_name" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="生日" required>
              <a-date-picker
                v-model:value="birthdayDayjs"
                placeholder=""
                style="width:100%"
                @change="onBirthdayChange"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="好友数量" required>
              <a-input-number v-model:value="form.friend_count" :min="0" style="width:100%" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="账户链接" required>
              <a-input v-model:value="form.account_link" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="登入账号" required>
              <a-input v-model:value="form.registration_account" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="登入密码" required>
              <a-input-password v-model:value="form.login_password" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="验证邮箱">
              <a-input v-model:value="form.email" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="验证邮箱密码">
              <a-input-password v-model:value="form.email_password" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="手机号类型" required>
              <a-select v-model:value="form.phone_type" @change="onPhoneTypeChange">
                <a-select-option value="无">无</a-select-option>
                <a-select-option value="个人">个人</a-select-option>
                <a-select-option value="Pingme">Pingme</a-select-option>
                <a-select-option value="香港esim">香港esim</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col v-if="showPhoneNumber" :span="12">
            <a-form-item label="号码" required>
              <a-input v-model:value="activePhoneNumber" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="两步验证码">
              <a-input v-model:value="form.two_fa_code" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="IP" required>
              <a-input v-model:value="form.ip_address" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="登录环境" required>
              <a-select
                v-model:value="loginEnvTypes"
                mode="multiple"
                @change="onLoginEnvChange"
              >
                <a-select-option v-for="opt in loginEnvOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col v-for="opt in selectedLoginEnvOptions" :key="opt.value" :span="12">
            <a-form-item :label="opt.label" required>
              <a-input v-model:value="form[opt.field]" />
            </a-form-item>
          </a-col>
          <template v-if="loginEnvTypes.includes('device') && form.physical_device">
            <a-col :span="24">
              <a-divider style="margin:4px 0 10px;font-size:13px;color:#6b7280">实体机 SIM 卡</a-divider>
            </a-col>
            <a-col :span="12">
              <a-form-item label="SIM 卡号">
                <a-input v-model:value="form.sim_card_number" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="SIM 卡到期日">
                <a-date-picker
                  v-model:value="simCardExpireDayjs"
                  placeholder=""
                  style="width:100%"
                  @change="onSimExpireChange"
                />
              </a-form-item>
            </a-col>
          </template>
          <a-col :span="12">
            <a-form-item label="证件地址">
              <a-input v-model:value="form.id_document_address" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="归属人" required>
              <a-input v-model:value="form.owner_name" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="状态" required>
              <a-select v-model:value="form.status" @change="onStatusChange">
                <a-select-option value="在用">在用</a-select-option>
                <a-select-option value="停用">停用</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col v-if="form.status === '停用'" :span="24">
            <a-form-item label="停用原因" required>
              <a-select v-model:value="form.disabled_reason_type" style="width:200px;margin-right:8px" @change="onDisabledReasonTypeChange">
                <a-select-option value="账号封禁">账号封禁</a-select-option>
                <a-select-option value="号码被封">号码被封</a-select-option>
                <a-select-option value="设备损坏">设备损坏</a-select-option>
                <a-select-option value="人员离职">人员离职</a-select-option>
                <a-select-option value="主动停用">主动停用</a-select-option>
                <a-select-option value="其他">其他</a-select-option>
              </a-select>
              <a-input
                v-if="form.disabled_reason_type === '其他'"
                v-model:value="form.disabled_reason_custom"
                style="width:260px"
              />
              <div v-if="showDisabledReasonError" class="form-error-tip">请选择或填写停用原因</div>
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
import dayjs, { type Dayjs } from 'dayjs'
import { useCurrentUser } from '../composables/useCurrentUser'

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
const showDisabledReasonError = ref(false)

const { currentUser, loadFromStorage } = useCurrentUser()

const loginEnvOptions = [
  { value: 'ads', label: 'AdsPower ID', field: 'ads_power_id' },
  { value: 'local', label: '本地浏览器', field: 'local_browser' },
  { value: 'device', label: '实体机', field: 'physical_device' },
  { value: 'cloud', label: '云手机', field: 'cloud_phone' },
] as const

const emptyForm = () => ({
  account_no: '', owner_name: '', account_role: undefined as string | undefined,
  ip_address: '', registration_account: '', login_password: '',
  email: '', email_password: '', person_name: '',
  friend_count: null as number | null,
  account_link: '', two_fa_code: '',
  phone_type: undefined as string | undefined, phone_number: '', pingme_number: '',
  birthday: '' as string, id_document_address: '',
  ads_power_id: '', local_browser: '', physical_device: '', cloud_phone: '',
  sim_card_number: '', sim_card_expire: '' as string,
  status: '在用', disabled_reason: '',
  disabled_reason_type: '' as string, disabled_reason_custom: '',
  notes: '',
})
const form = reactive(emptyForm())
const loginEnvTypes = ref<string[]>([])
const selectedLoginEnvOptions = computed(() => loginEnvOptions.filter(opt => loginEnvTypes.value.includes(opt.value)))

function onLoginEnvChange(selected: string[]) {
  for (const opt of loginEnvOptions) {
    if (selected.includes(opt.value)) continue
    form[opt.field] = ''
    if (opt.value === 'device') {
      form.sim_card_number = ''
      form.sim_card_expire = ''
    }
  }
}

function loginEnvTypesFromRow(row: { ads_power_id?: string, local_browser?: string, physical_device?: string, cloud_phone?: string }) {
  return loginEnvOptions.filter(opt => String(row[opt.field] || '').trim()).map(opt => opt.value)
}

const simCardExpireDayjs = computed({
  get: () => form.sim_card_expire ? dayjs(form.sim_card_expire) : null,
  set: (v: Dayjs | null) => { form.sim_card_expire = v ? v.format('YYYY-MM-DD') : '' },
})
function onSimExpireChange(v: Dayjs | null) {
  form.sim_card_expire = v ? v.format('YYYY-MM-DD') : ''
}

const birthdayDayjs = computed({
  get: () => form.birthday ? dayjs(form.birthday) : null,
  set: (v: Dayjs | null) => { form.birthday = v ? v.format('YYYY-MM-DD') : '' },
})
function onBirthdayChange(v: Dayjs | null) {
  form.birthday = v ? v.format('YYYY-MM-DD') : ''
}

const showPhoneNumber = computed(() => form.phone_type === '个人' || form.phone_type === 'Pingme' || form.phone_type === '香港esim')
const activePhoneNumber = computed({
  get: () => form.phone_type === 'Pingme' ? form.pingme_number : form.phone_number,
  set: (value: string) => {
    if (form.phone_type === 'Pingme') form.pingme_number = value
    else form.phone_number = value
  },
})

function onPhoneTypeChange(val: string) {
  if (val !== '个人' && val !== '香港esim') form.phone_number = ''
  if (val !== 'Pingme') form.pingme_number = ''
}

function onStatusChange(val: string) {
  if (val !== '停用') {
    form.disabled_reason_type = ''
    form.disabled_reason_custom = ''
    form.disabled_reason = ''
    showDisabledReasonError.value = false
  }
}

function onDisabledReasonTypeChange() {
  showDisabledReasonError.value = false
  if (form.disabled_reason_type !== '其他') {
    form.disabled_reason_custom = ''
  }
}

const roleColor: Record<string, string> = { '主号': 'blue', '次用号': 'orange', '备用号': 'default' }

const columns = [
  { title: '聊单号别名', key: 'account_no', width: 180 },
  { title: '归属人', dataIndex: 'owner_name', key: 'owner_name', width: 100 },
  { title: 'IP', key: 'ip_address', width: 140 },
  { title: '好友数量', key: 'friend_count', width: 90 },
  { title: '手机号 / 邮箱', key: 'contact', width: 200 },
  { title: '登录环境', key: 'login_envs', width: 300 },
  { title: '状态 / 停用原因', key: 'status', width: 160 },
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
  form.owner_name = currentUser.value?.name || ''
  loginEnvTypes.value = []
  showDisabledReasonError.value = false
  modalOpen.value = true
}

function openEdit(row: any) {
  editId.value = row.id
  const disabledReason = row.disabled_reason || ''
  const presetOptions = ['账号封禁', '号码被封', '设备损坏', '人员离职', '主动停用']
  const isPreset = presetOptions.includes(disabledReason)
  Object.assign(form, {
    account_no: row.account_no || '',
    owner_name: row.owner_name || '',
    account_role: row.account_role || undefined,
    ip_address: row.ip_address || '',
    registration_account: row.registration_account || '',
    login_password: row.login_password || '',
    email: row.email || '',
    email_password: row.email_password || '',
    person_name: row.person_name || '',
    friend_count: row.friend_count ?? null,
    account_link: row.account_link || '',
    two_fa_code: row.two_fa_code || '',
    phone_type: row.phone_type || undefined,
    phone_number: row.phone_number || '',
    pingme_number: row.pingme_number || '',
    birthday: row.birthday || '',
    id_document_address: row.id_document_address || '',
    ads_power_id: row.ads_power_id || '',
    local_browser: row.local_browser || '',
    physical_device: row.physical_device || '',
    cloud_phone: row.cloud_phone || '',
    sim_card_number: row.sim_card_number || '',
    sim_card_expire: row.sim_card_expire || '',
    status: row.status || '在用',
    disabled_reason: disabledReason,
    disabled_reason_type: isPreset ? disabledReason : (disabledReason ? '其他' : ''),
    disabled_reason_custom: isPreset ? '' : disabledReason,
    notes: row.notes || '',
  })
  loginEnvTypes.value = loginEnvTypesFromRow(row)
  showDisabledReasonError.value = false
  modalOpen.value = true
}

function requireText(value: string, label: string) {
  if (!String(value || '').trim()) {
    message.error(`${label}不能为空`)
    return false
  }
  return true
}

async function handleSave() {
  if (!requireText(form.account_no, '聊单号别名')) return
  if (!form.account_role) { message.error('账号用途不能为空'); return }
  if (!requireText(form.owner_name, '归属人')) return
  if (!requireText(form.ip_address, 'IP')) return
  if (!requireText(form.registration_account, '登入账号')) return
  if (!requireText(form.login_password, '登入密码')) return
  if (!requireText(form.person_name, '名字')) return
  if (form.friend_count == null) { message.error('好友数量不能为空'); return }
  if (!requireText(form.account_link, '账户链接')) return
  if (!form.phone_type) { message.error('手机号类型不能为空'); return }
  if (showPhoneNumber.value && !requireText(activePhoneNumber.value, '号码')) return
  if (!form.birthday) { message.error('生日不能为空'); return }
  if (!loginEnvTypes.value.length) { message.error('请选择登录环境'); return }
  for (const opt of selectedLoginEnvOptions.value) {
    if (!requireText(form[opt.field], opt.label)) return
  }

  if (form.status === '停用') {
    const reason = form.disabled_reason_type === '其他' ? form.disabled_reason_custom.trim() : form.disabled_reason_type
    if (!reason) {
      showDisabledReasonError.value = true
      message.error('请填写停用原因')
      return
    }
    form.disabled_reason = reason
  } else {
    form.disabled_reason = ''
  }

  saving.value = true
  try {
    const { disabled_reason_type, disabled_reason_custom, ...rest } = form
    const payload: any = { ...rest, updated_at: new Date().toISOString() }
    if (!payload.sim_card_expire) payload.sim_card_expire = null
    if (!payload.birthday) payload.birthday = null
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

onMounted(() => { loadFromStorage(); loadData(); loadStats() })
</script>

<style scoped>
.page-content { padding: 24px; }
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin: 0; }

.kpi-row { display: flex; align-items: stretch; gap: 0; margin-bottom: 20px; background: #fff; border-radius: 12px; border: 1px solid #f0f0f0; box-shadow: 0 1px 4px rgba(0,0,0,.06); overflow: hidden; }
.kpi-group { display: flex; flex: 1; }
.left-group { flex: 0 0 auto; }
.right-group { flex: 1; }
.kpi-divider { width: 1px; background: #f0f0f0; margin: 16px 0; }
.kpi-card { flex: 1; padding: 18px 16px; text-align: center; border-right: 1px solid #f0f0f0; position: relative; }
.kpi-card:last-child { border-right: none; }
.kpi-badge-wrap { height: 20px; display: flex; justify-content: center; align-items: center; margin-bottom: 4px; }
.kpi-role-badge { font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 3px; color: #fff; }
.kpi-role-badge.main { background: #1677ff; }
.kpi-role-badge.secondary { background: #fa8c16; }
.kpi-role-badge.backup { background: #8c8c8c; }

.kpi-val { font-size: 28px; font-weight: 700; color: #1677ff; line-height: 1; }
.kpi-val.green { color: #52c41a; }
.kpi-val.gray { color: #8c8c8c; }
.kpi-val.gray2 { color: #aaa; }
.kpi-val.blue { color: #1677ff; }
.kpi-val.orange { color: #fa8c16; }
.kpi-label { font-size: 12px; color: #8c8c8c; margin-top: 6px; }

.filter-bar { display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }

.account-cell { display: flex; align-items: center; gap: 6px; }
.account-no { font-weight: 600; font-size: 13px; color: #1a1a2e; }

.contact-cell { display: flex; flex-direction: column; gap: 4px; }
.contact-row { display: flex; align-items: center; gap: 5px; }
.contact-badge { font-size: 10px; font-weight: 700; padding: 1px 5px; border-radius: 3px; color: #fff; flex-shrink: 0; }
.contact-badge.pingme { background: #0ea5e9; }
.contact-badge.phone { background: #059669; }
.contact-badge.email { background: #6d28d9; }
.contact-val { font-size: 12px; color: #374151; font-family: monospace; }
.text-none { color: #d1d5db; font-size: 12px; }

.env-list { display: flex; flex-wrap: wrap; gap: 4px; }
.env-tag { font-size: 11px; padding: 2px 7px; border-radius: 4px; display: inline-block; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.env-tag.ads { background: #fff7e6; color: #d46b08; border: 1px solid #ffd591; }
.env-tag.local { background: #f6ffed; color: #389e0d; border: 1px solid #b7eb8f; }
.env-tag.device { background: #e6f4ff; color: #0958d9; border: 1px solid #91caff; }
.env-tag.cloud { background: #f9f0ff; color: #531dab; border: 1px solid #d3adf7; }

.status-disabled-cell { display: flex; flex-direction: column; gap: 3px; }
.disabled-reason-text { font-size: 11px; color: #ff4d4f; background: #fff1f0; border: 1px solid #ffccc7; padding: 1px 6px; border-radius: 3px; display: inline-block; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

:deep(.row-disabled) td { background: #fafafa !important; color: #9ca3af; }
:deep(.row-disabled):hover td { background: #f5f5f5 !important; }

.form-error-tip { color: #ff4d4f; font-size: 12px; margin-top: 4px; }

.ip-mono { font-family: monospace; font-size: 12px; color: #1a1a2e; font-weight: 500; }
.friend-count { font-size: 13px; font-weight: 600; color: #1677ff; }
</style>
