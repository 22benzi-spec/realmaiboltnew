<template>
  <div class="page-content">
    <h1 class="page-title">用户与权限管理</h1>

    <div class="segment-bar">
      <div
        class="segment-btn"
        :class="{ active: activeTab === 'internal' }"
        @click="switchTab('internal')"
      >
        <TeamOutlined />
        <span>内部员工</span>
        <span class="seg-count">{{ internalCount }}</span>
      </div>
      <div
        class="segment-btn"
        :class="{ active: activeTab === 'tenant' }"
        @click="switchTab('tenant')"
      >
        <ApartmentOutlined />
        <span>租户账号</span>
        <span class="seg-count">{{ tenantCount }}</span>
      </div>
    </div>

    <div class="card-panel">
      <div class="toolbar">
        <a-input-search
          v-model:value="searchText"
          placeholder="搜索账号/姓名"
          style="width:220px"
          allow-clear
          @search="load"
        />
        <a-select v-model:value="filterStatus" style="width:120px" @change="load" allow-clear placeholder="状态">
          <a-select-option value="active">启用</a-select-option>
          <a-select-option value="disabled">禁用</a-select-option>
          <a-select-option value="locked">锁定</a-select-option>
        </a-select>
        <a-select v-if="activeTab === 'internal'" v-model:value="filterRole" style="width:130px" @change="load" allow-clear placeholder="角色筛选">
          <a-select-option v-for="r in internalRoles" :key="r" :value="r">{{ r }}</a-select-option>
        </a-select>
        <div style="flex:1" />
        <a-button type="primary" @click="openModal()">
          <PlusOutlined />
          {{ activeTab === 'internal' ? '添加内部员工' : '添加租户账号' }}
        </a-button>
      </div>

      <a-table
        :columns="currentColumns"
        :data-source="userList"
        :loading="loading"
        row-key="id"
        size="middle"
        :pagination="{ pageSize: 20, showSizeChanger: false }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'user_info'">
            <div class="user-info-cell">
              <div class="user-avatar" :style="{ background: roleColorMap[record.role] || '#64748b' }">
                {{ record.display_name?.charAt(0) || record.username?.charAt(0) || '?' }}
              </div>
              <div>
                <div class="user-name">{{ record.display_name || record.username }}</div>
                <div class="user-sub">@{{ record.username }}</div>
              </div>
            </div>
          </template>

          <template v-if="column.key === 'role'">
            <a-tag :color="roleTagColor[record.role] || 'default'" class="role-tag">
              {{ record.role }}
            </a-tag>
          </template>

          <template v-if="column.key === 'tenant_info'">
            <div>
              <div class="tenant-name">{{ record.tenant_name || '—' }}</div>
              <div class="tenant-code" v-if="record.tenant_code">{{ record.tenant_code }}</div>
            </div>
          </template>

          <template v-if="column.key === 'password'">
            <div class="pwd-cell">
              <span class="pwd-dots" v-if="!showPwd[record.id]">••••••••</span>
              <span class="pwd-text" v-else>{{ record.plain_password }}</span>
              <a-button
                type="link"
                size="small"
                style="padding:0 4px;height:auto"
                @click="togglePwd(record.id)"
              >
                <EyeOutlined v-if="!showPwd[record.id]" />
                <EyeInvisibleOutlined v-else />
              </a-button>
            </div>
          </template>

          <template v-if="column.key === 'status'">
            <a-tag :color="statusColor[record.status] || 'default'">{{ statusLabel[record.status] || record.status }}</a-tag>
          </template>

          <template v-if="column.key === 'last_login'">
            <span class="time-text">{{ record.last_login_at ? formatTime(record.last_login_at) : '从未登录' }}</span>
          </template>

          <template v-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="openModal(record)">编辑</a-button>
              <a-button
                type="link"
                size="small"
                @click="toggleStatus(record)"
                :danger="record.status === 'active'"
              >
                {{ record.status === 'active' ? '禁用' : '启用' }}
              </a-button>
              <a-popconfirm title="确定删除该账号?" @confirm="deleteUser(record.id)">
                <a-button type="link" size="small" danger>删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <a-modal
      v-model:open="modalOpen"
      :title="editingId ? '编辑账号' : (activeTab === 'internal' ? '添加内部员工账号' : '添加租户账号')"
      @ok="handleSubmit"
      :confirm-loading="submitting"
      width="580px"
      ok-text="保存"
      cancel-text="取消"
    >
      <div class="modal-type-header">
        <div class="mth-icon" :class="activeTab === 'internal' ? 'mth-internal' : 'mth-tenant'">
          <TeamOutlined v-if="activeTab === 'internal'" />
          <ApartmentOutlined v-else />
        </div>
        <div>
          <div class="mth-title">{{ activeTab === 'internal' ? '内部员工账号' : '租户账号' }}</div>
          <div class="mth-desc">{{ activeTab === 'internal' ? '公司内部使用，按角色分配系统权限' : '客户/合作方使用，访问范围受限' }}</div>
        </div>
      </div>

      <a-form :model="form" layout="vertical" ref="formRef" :rules="rules" style="margin-top:16px">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="登录账号" name="username">
              <a-input v-model:value="form.username" placeholder="设置登录用户名" :disabled="!!editingId" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="显示姓名" name="display_name">
              <a-input v-model:value="form.display_name" placeholder="真实姓名或昵称" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="登录密码" name="plain_password">
              <a-input-password v-model:value="form.plain_password" placeholder="设置登录密码" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="账号状态">
              <a-select v-model:value="form.status">
                <a-select-option value="active">启用</a-select-option>
                <a-select-option value="disabled">禁用</a-select-option>
                <a-select-option value="locked">锁定</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <template v-if="activeTab === 'internal'">
          <a-row :gutter="12">
            <a-col :span="12">
              <a-form-item label="系统角色" name="role">
                <a-select v-model:value="form.role" @change="onRoleChange">
                  <a-select-option v-for="r in internalRoles" :key="r" :value="r">
                    <span class="role-option-dot" :style="{ background: roleColorMap[r] }"></span>
                    {{ r }}
                  </a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="关联员工档案">
                <a-select
                  v-model:value="form.staff_id"
                  allow-clear
                  show-search
                  placeholder="可选：关联到业务员/商务档案"
                  :filter-option="filterStaffOption"
                >
                  <a-select-option v-for="s in staffOptions" :key="s.id" :value="s.id">
                    {{ s.name }}（{{ s.role }}）
                  </a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
          </a-row>

          <div class="perm-preview">
            <div class="pp-title">权限预览</div>
            <div class="pp-tags">
              <span v-for="p in rolePermissions[form.role] || []" :key="p" class="pp-tag">{{ p }}</span>
              <span v-if="!rolePermissions[form.role]?.length" class="pp-empty">暂无权限配置</span>
            </div>
          </div>
        </template>

        <template v-if="activeTab === 'tenant'">
          <a-row :gutter="12">
            <a-col :span="12">
              <a-form-item label="租户公司名称" name="tenant_name">
                <a-input v-model:value="form.tenant_name" placeholder="客户公司名称" />
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="租户编号">
                <a-input v-model:value="form.tenant_code" placeholder="如：TN-001（可选）" />
              </a-form-item>
            </a-col>
          </a-row>
          <div class="perm-preview tenant-perm">
            <div class="pp-title">租户权限说明</div>
            <div class="pp-tags">
              <span v-for="p in tenantPermissions" :key="p" class="pp-tag pp-tag-tenant">{{ p }}</span>
            </div>
          </div>
        </template>

        <a-form-item label="备注">
          <a-input v-model:value="form.notes" placeholder="备注信息（可选）" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  PlusOutlined, TeamOutlined, ApartmentOutlined,
  EyeOutlined, EyeInvisibleOutlined,
} from '@ant-design/icons-vue'
import { supabase } from '../lib/supabase'
import dayjs from 'dayjs'

const loading = ref(false)
const userList = ref<any[]>([])
const searchText = ref('')
const filterStatus = ref('')
const filterRole = ref('')
const activeTab = ref<'internal' | 'tenant'>('internal')
const modalOpen = ref(false)
const submitting = ref(false)
const editingId = ref('')
const formRef = ref()
const showPwd = ref<Record<string, boolean>>({})
const staffOptions = ref<any[]>([])

const internalRoles = ['管理员', '业务员', '财务', '商务', '客服', '运营']

const roleColorMap: Record<string, string> = {
  '管理员': '#dc2626',
  '业务员': '#2563eb',
  '财务': '#059669',
  '商务': '#d97706',
  '客服': '#7c3aed',
  '运营': '#0891b2',
  '租户': '#64748b',
}

const roleTagColor: Record<string, string> = {
  '管理员': 'red',
  '业务员': 'blue',
  '财务': 'green',
  '商务': 'gold',
  '客服': 'purple',
  '运营': 'cyan',
  '租户': 'default',
}

const rolePermissions: Record<string, string[]> = {
  '管理员': ['全部模块访问', '用户管理', '系统配置', '数据导出', '财务查看', '删除权限'],
  '业务员': ['任务中心', '买手库', '业务员工作台', '抢单大厅', '数据分析'],
  '财务': ['财务管理', '礼品卡', 'PayPal', '退款审批', '交易流水', '利润分析'],
  '商务': ['订单中心', '客户管理', '商务管理', '任务中心'],
  '客服': ['任务中心', '售后问题单', '订单查看'],
  '运营': ['任务中心', '订单中心', '数据分析', '买手库'],
}

const tenantPermissions = ['订单进度查看', '反馈记录查看', '账单查看', '资料下载']

const statusColor: Record<string, string> = { active: 'green', disabled: 'red', locked: 'orange' }
const statusLabel: Record<string, string> = { active: '启用', disabled: '禁用', locked: '锁定' }

const internalCount = computed(() => userList.value.filter(u => u.user_type === 'internal').length)
const tenantCount = computed(() => userList.value.filter(u => u.user_type === 'tenant').length)

const internalColumns = [
  { title: '账号信息', key: 'user_info', width: 200 },
  { title: '角色', key: 'role', width: 100 },
  { title: '密码', key: 'password', width: 160 },
  { title: '状态', key: 'status', width: 80 },
  { title: '最后登录', key: 'last_login', width: 140 },
  { title: '操作', key: 'action', width: 160 },
]

const tenantColumns = [
  { title: '账号信息', key: 'user_info', width: 200 },
  { title: '租户信息', key: 'tenant_info', width: 160 },
  { title: '密码', key: 'password', width: 160 },
  { title: '状态', key: 'status', width: 80 },
  { title: '最后登录', key: 'last_login', width: 140 },
  { title: '操作', key: 'action', width: 160 },
]

const currentColumns = computed(() => activeTab.value === 'internal' ? internalColumns : tenantColumns)

const defaultForm = () => ({
  username: '',
  display_name: '',
  plain_password: '',
  user_type: activeTab.value,
  role: activeTab.value === 'internal' ? '业务员' : '租户',
  staff_id: null as string | null,
  tenant_name: '',
  tenant_code: '',
  status: 'active',
  notes: '',
})

const form = reactive(defaultForm())

const rules = {
  username: [{ required: true, message: '请输入登录账号' }],
  display_name: [{ required: true, message: '请输入显示姓名' }],
  plain_password: [{ required: true, message: '请设置登录密码', trigger: 'blur' }],
  role: [{ required: true, message: '请选择角色' }],
}

function switchTab(tab: 'internal' | 'tenant') {
  activeTab.value = tab
  filterRole.value = ''
  load()
}

function togglePwd(id: string) {
  showPwd.value[id] = !showPwd.value[id]
}

function formatTime(t: string) {
  return dayjs(t).format('MM-DD HH:mm')
}

function filterStaffOption(_input: string, option: any) {
  return option.children?.[0]?.children?.toLowerCase().includes(_input.toLowerCase())
}

function onRoleChange() {
  form.staff_id = null
}

async function load() {
  loading.value = true
  try {
    let query = supabase
      .from('app_users')
      .select('*')
      .eq('user_type', activeTab.value)
      .order('created_at', { ascending: false })

    if (searchText.value) {
      query = query.or(`username.ilike.%${searchText.value}%,display_name.ilike.%${searchText.value}%`)
    }
    if (filterStatus.value) query = query.eq('status', filterStatus.value)
    if (filterRole.value) query = query.eq('role', filterRole.value)

    const { data, error } = await query
    if (error) throw error
    userList.value = data || []
  } finally {
    loading.value = false
  }
}

async function loadStaffOptions() {
  const { data } = await supabase
    .from('staff')
    .select('id, name, role')
    .order('name')
  staffOptions.value = data || []
}

function openModal(record?: any) {
  editingId.value = record?.id || ''
  if (record) {
    Object.assign(form, defaultForm(), record)
  } else {
    Object.assign(form, defaultForm())
    form.user_type = activeTab.value
    form.role = activeTab.value === 'internal' ? '业务员' : '租户'
  }
  modalOpen.value = true
}

async function handleSubmit() {
  await formRef.value?.validate()
  submitting.value = true
  try {
    const payload: any = {
      username: form.username,
      display_name: form.display_name,
      plain_password: form.plain_password,
      user_type: activeTab.value,
      role: form.role,
      staff_id: form.staff_id || null,
      tenant_name: form.tenant_name || null,
      tenant_code: form.tenant_code || null,
      status: form.status,
      notes: form.notes,
      updated_at: new Date().toISOString(),
    }

    if (editingId.value) {
      const { error } = await supabase.from('app_users').update(payload).eq('id', editingId.value)
      if (error) throw error
      message.success('账号已更新')
    } else {
      const { error } = await supabase.from('app_users').insert([payload])
      if (error) {
        if (error.code === '23505') throw new Error('该账号名已存在，请换一个')
        throw error
      }
      message.success('账号已创建')
    }
    modalOpen.value = false
    load()
  } catch (e: any) {
    message.error(e.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

async function toggleStatus(record: any) {
  const newStatus = record.status === 'active' ? 'disabled' : 'active'
  const { error } = await supabase
    .from('app_users')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', record.id)
  if (error) { message.error('操作失败'); return }
  message.success(newStatus === 'active' ? '已启用' : '已禁用')
  load()
}

async function deleteUser(id: string) {
  const { error } = await supabase.from('app_users').delete().eq('id', id)
  if (error) { message.error('删除失败'); return }
  message.success('已删除')
  load()
}

onMounted(() => {
  load()
  loadStaffOptions()
})
</script>

<style scoped>
.page-content { padding: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }
.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; }

.segment-bar {
  display: flex;
  gap: 0;
  margin-bottom: 20px;
  background: #f1f5f9;
  border-radius: 10px;
  padding: 4px;
  width: fit-content;
}
.segment-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 20px;
  border-radius: 7px;
  font-size: 14px;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  transition: all 0.18s;
  user-select: none;
}
.segment-btn:hover { color: #1e293b; }
.segment-btn.active {
  background: #fff;
  color: #1e293b;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1);
  font-weight: 600;
}
.seg-count {
  background: #e2e8f0;
  color: #475569;
  font-size: 11px;
  font-weight: 700;
  padding: 1px 7px;
  border-radius: 20px;
  min-width: 20px;
  text-align: center;
}
.segment-btn.active .seg-count {
  background: #2563eb;
  color: #fff;
}

.user-info-cell { display: flex; align-items: center; gap: 10px; }
.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  flex-shrink: 0;
}
.user-name { font-weight: 600; color: #1e293b; font-size: 14px; line-height: 1.3; }
.user-sub { font-size: 12px; color: #94a3b8; margin-top: 1px; }

.role-tag { font-weight: 600; font-size: 12px; }

.tenant-name { font-weight: 600; color: #1e293b; font-size: 13px; }
.tenant-code { font-size: 11px; color: #94a3b8; margin-top: 2px; }

.pwd-cell { display: flex; align-items: center; gap: 4px; }
.pwd-dots { font-size: 16px; letter-spacing: 2px; color: #94a3b8; }
.pwd-text { font-size: 13px; color: #1e293b; font-family: monospace; background: #f8fafc; padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0; }

.time-text { font-size: 12px; color: #64748b; }

.modal-type-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  margin-bottom: 4px;
}
.mth-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #fff;
  flex-shrink: 0;
}
.mth-internal { background: linear-gradient(135deg, #2563eb, #1d4ed8); }
.mth-tenant { background: linear-gradient(135deg, #059669, #047857); }
.mth-title { font-weight: 600; font-size: 14px; color: #1e293b; }
.mth-desc { font-size: 12px; color: #64748b; margin-top: 2px; }

.perm-preview {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px 14px;
  margin-bottom: 16px;
}
.tenant-perm { background: #f0fdf4; border-color: #bbf7d0; }
.pp-title { font-size: 12px; font-weight: 600; color: #64748b; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
.pp-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.pp-tag {
  font-size: 11px;
  font-weight: 600;
  padding: 2px 9px;
  border-radius: 20px;
  background: #dbeafe;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
}
.pp-tag-tenant { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
.pp-empty { font-size: 12px; color: #94a3b8; }

.role-option-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
  vertical-align: middle;
}
</style>
