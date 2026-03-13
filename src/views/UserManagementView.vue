<template>
  <div class="page-content">
    <h1 class="page-title">用户与权限管理</h1>

    <div class="segment-bar">
      <div class="segment-btn" :class="{ active: mainTab === 'users' }" @click="mainTab = 'users'">
        <TeamOutlined />
        <span>账号管理</span>
      </div>
      <div class="segment-btn" :class="{ active: mainTab === 'roles' }" @click="mainTab = 'roles'; loadRolePerms()">
        <SafetyCertificateOutlined />
        <span>角色权限配置</span>
      </div>
    </div>

    <!-- ===== 账号管理 ===== -->
    <template v-if="mainTab === 'users'">
      <div class="sub-tabs">
        <div class="sub-tab" :class="{ active: activeTab === 'internal' }" @click="switchTab('internal')">
          内部员工
          <span class="sub-count">{{ internalCount }}</span>
        </div>
        <div class="sub-tab" :class="{ active: activeTab === 'tenant' }" @click="switchTab('tenant')">
          租户账号
          <span class="sub-count">{{ tenantCount }}</span>
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
          <a-select v-model:value="filterStatus" style="width:120px" @change="load" allow-clear placeholder="账号状态">
            <a-select-option value="active">启用</a-select-option>
            <a-select-option value="disabled">禁用</a-select-option>
          </a-select>
          <a-select v-if="activeTab === 'internal'" v-model:value="filterEmployment" style="width:110px" @change="load" allow-clear placeholder="在职状态">
            <a-select-option value="在职">在职</a-select-option>
            <a-select-option value="离职">离职</a-select-option>
          </a-select>
          <a-select v-if="activeTab === 'internal'" v-model:value="filterRole" style="width:140px" @change="load" allow-clear placeholder="角色筛选">
            <a-select-option v-for="r in internalRoles" :key="r" :value="r">{{ r }}</a-select-option>
          </a-select>
          <div style="flex:1" />
          <a-button type="primary" @click="openModal()">
            <PlusOutlined />
            {{ activeTab === 'internal' ? '添加员工账号' : '添加租户账号' }}
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
              <a-tag :color="roleTagColor[record.role] || 'default'" class="role-tag">{{ record.role }}</a-tag>
            </template>

            <template v-if="column.key === 'role_perms_count'">
              <span class="perm-count-badge">
                {{ getRolePermCount(record.role) }} 项权限
              </span>
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
                <a-button type="link" size="small" style="padding:0 4px;height:auto" @click="togglePwd(record.id)">
                  <EyeOutlined v-if="!showPwd[record.id]" />
                  <EyeInvisibleOutlined v-else />
                </a-button>
              </div>
            </template>

            <template v-if="column.key === 'employment_status'">
              <a-tag :color="record.employment_status === '在职' ? 'green' : 'default'">
                {{ record.employment_status || '在职' }}
              </a-tag>
            </template>

            <template v-if="column.key === 'account_status'">
              <a-tag :color="statusColor[record.status] || 'default'">{{ statusLabel[record.status] || record.status }}</a-tag>
            </template>

            <template v-if="column.key === 'tenant_perms'">
              <div class="perm-cell">
                <span v-if="!record.permissions?.length" class="perm-empty">无</span>
                <template v-else>
                  <span v-for="p in (record.permissions || []).slice(0, 2)" :key="p" class="perm-badge">{{ p }}</span>
                  <span v-if="record.permissions?.length > 2" class="perm-more">+{{ record.permissions.length - 2 }}</span>
                </template>
              </div>
            </template>

            <template v-if="column.key === 'action'">
              <a-space>
                <a-button type="link" size="small" @click="openModal(record)">编辑</a-button>
                <a-button
                  type="link"
                  size="small"
                  @click="toggleAccountStatus(record)"
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
    </template>

    <!-- ===== 角色权限配置 ===== -->
    <template v-if="mainTab === 'roles'">
      <div class="roles-grid">
        <div
          v-for="rp in rolePermsList"
          :key="rp.role"
          class="role-card"
          :class="{ editing: editingRole === rp.role }"
        >
          <div class="rc-header">
            <div class="rc-role-badge" :style="{ background: roleColorMap[rp.role] || '#64748b' }">
              {{ rp.role.charAt(0) }}
            </div>
            <div class="rc-role-name">{{ rp.role }}</div>
            <div style="flex:1" />
            <span class="rc-count">{{ rp.permissions.length }} 项</span>
            <a-button
              v-if="editingRole !== rp.role"
              type="link"
              size="small"
              @click="startEditRole(rp)"
            >
              <EditOutlined /> 编辑
            </a-button>
            <template v-else>
              <a-button type="primary" size="small" :loading="roleSubmitting" @click="saveRolePerms(rp.role)" style="margin-right:6px">保存</a-button>
              <a-button size="small" @click="cancelEditRole">取消</a-button>
            </template>
          </div>

          <!-- 操作国家（仅业务类角色） -->
          <div v-if="isSalesRole(rp.role)" class="rc-countries-section">
            <span class="rc-section-label">操作国家</span>
            <template v-if="editingRole !== rp.role">
              <div class="rc-countries">
                <span v-if="!rp.countries?.length" class="rc-no-country">全部国家</span>
                <template v-else>
                  <span v-for="c in rp.countries" :key="c" class="country-badge-sm" :style="{ borderColor: countryMap[c]?.color, color: countryMap[c]?.color }">
                    {{ countryMap[c]?.flag }} {{ countryMap[c]?.label }}
                  </span>
                </template>
              </div>
            </template>
            <template v-else>
              <a-checkbox-group v-model:value="editingCountries" style="display:flex;flex-wrap:wrap;gap:8px;padding:4px 0">
                <a-checkbox v-for="c in allCountries" :key="c.value" :value="c.value">
                  {{ c.flag }} {{ c.label }}
                </a-checkbox>
              </a-checkbox-group>
              <div class="rc-country-hint">不勾选则默认操作全部国家</div>
            </template>
          </div>

          <div class="rc-perms">
            <template v-if="editingRole !== rp.role">
              <div v-for="group in permissionGroups" :key="group.label" class="rc-perm-group-inline">
                <template v-if="rp.permissions.some((p: string) => group.perms.includes(p))">
                  <span class="rc-group-label">{{ group.label }}</span>
                  <span
                    v-for="p in group.perms.filter((pp: string) => rp.permissions.includes(pp))"
                    :key="p"
                    class="perm-badge"
                  >{{ p }}</span>
                </template>
              </div>
              <div v-if="!rp.permissions.length" class="rc-empty">暂无权限</div>
            </template>
            <template v-else>
              <div v-for="group in permissionGroups" :key="group.label" class="rc-edit-group">
                <div class="rc-edit-group-title">{{ group.label }}</div>
                <div class="rc-edit-group-items">
                  <label
                    v-for="perm in group.perms"
                    :key="perm"
                    class="perm-checkbox-item"
                    :class="{ checked: editingPerms.includes(perm) }"
                    @click="toggleEditPerm(perm)"
                  >
                    <span class="perm-check-icon"><CheckOutlined v-if="editingPerms.includes(perm)" /></span>
                    {{ perm }}
                  </label>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>
    </template>

    <!-- 账号编辑弹窗 -->
    <a-modal
      v-model:open="modalOpen"
      :title="editingId ? '编辑账号' : (activeTab === 'internal' ? '添加员工账号' : '添加租户账号')"
      @ok="handleSubmit"
      :confirm-loading="submitting"
      width="540px"
      ok-text="保存"
      cancel-text="取消"
    >
      <a-form :model="form" layout="vertical" ref="formRef" :rules="rules" style="margin-top:8px">
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
              </a-select>
            </a-form-item>
          </a-col>
        </a-row>

        <template v-if="activeTab === 'internal'">
          <a-row :gutter="12">
            <a-col :span="12">
              <a-form-item label="系统角色" name="role">
                <a-select v-model:value="form.role">
                  <a-select-option v-for="r in internalRoles" :key="r" :value="r">
                    <span class="role-option-dot" :style="{ background: roleColorMap[r] }"></span>
                    {{ r }}
                  </a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="12">
              <a-form-item label="在职状态">
                <a-select v-model:value="form.employment_status">
                  <a-select-option value="在职">在职</a-select-option>
                  <a-select-option value="离职">离职</a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
          </a-row>
          <div class="role-perm-hint">
            <SafetyCertificateOutlined style="color:#2563eb;margin-right:6px" />
            该账号将继承
            <strong>「{{ form.role }}」</strong>
            角色的全部权限（{{ getRolePermCount(form.role) }} 项）。如需调整，请在「角色权限配置」中修改。
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
          <a-form-item label="可访问权限">
            <div class="perm-config">
              <label
                v-for="perm in tenantPermissions"
                :key="perm"
                class="perm-checkbox-item"
                :class="{ checked: form.permissions.includes(perm) }"
                @click="toggleFormPerm(perm)"
              >
                <span class="perm-check-icon"><CheckOutlined v-if="form.permissions.includes(perm)" /></span>
                {{ perm }}
              </label>
            </div>
          </a-form-item>
        </template>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  PlusOutlined, TeamOutlined, EyeOutlined, EyeInvisibleOutlined,
  CheckOutlined, EditOutlined, SafetyCertificateOutlined,
} from '@ant-design/icons-vue'
import { supabase } from '../lib/supabase'

const mainTab = ref<'users' | 'roles'>('users')
const activeTab = ref<'internal' | 'tenant'>('internal')
const loading = ref(false)
const userList = ref<any[]>([])
const searchText = ref('')
const filterStatus = ref('')
const filterRole = ref('')
const filterEmployment = ref('')
const modalOpen = ref(false)
const submitting = ref(false)
const editingId = ref('')
const formRef = ref()
const showPwd = ref<Record<string, boolean>>({})

const rolePermsList = ref<any[]>([])
const editingRole = ref('')
const editingPerms = ref<string[]>([])
const editingCountries = ref<string[]>([])
const roleSubmitting = ref(false)

const internalRoles = ['超级管理员', '业务主管', '业务员', '行政主管', '行政员', '商务主管', '商务', '财务主管', '财务员']

const roleColorMap: Record<string, string> = {
  '超级管理员': '#dc2626',
  '业务主管': '#1d4ed8',
  '业务员': '#3b82f6',
  '行政主管': '#7c3aed',
  '行政员': '#a78bfa',
  '商务主管': '#b45309',
  '商务': '#d97706',
  '财务主管': '#065f46',
  '财务员': '#059669',
  '租户': '#64748b',
}

const roleTagColor: Record<string, string> = {
  '超级管理员': 'red',
  '业务主管': 'blue',
  '业务员': 'geekblue',
  '行政主管': 'purple',
  '行政员': 'purple',
  '商务主管': 'gold',
  '商务': 'orange',
  '财务主管': 'green',
  '财务员': 'cyan',
  '租户': 'default',
}

const permissionGroups = [
  { label: '订单管理', perms: ['创建订单', '查看订单', '编辑订单', '删除订单', '导出订单'] },
  { label: '任务中心', perms: ['任务管理', '分配管理', '业务员工作台', '抢单大厅'] },
  { label: '人员管理', perms: ['业务员管理', '买手库', '业务数据分析', '售后问题单', '买手盈亏分析'] },
  { label: '财务管理', perms: ['礼品卡管理', 'PayPal管理', '退款审批', '退款账单', '交易流水', '利润分析'] },
  { label: '客户管理', perms: ['客户库', '商务管理'] },
  { label: '资产管理', perms: ['聊单号管理', '行政资源管理'] },
  { label: '系统管理', perms: ['用户与权限管理'] },
]

const tenantPermissions = ['订单进度查看', '反馈记录查看', '账单查看', '资料下载', '买手库查看', '任务进度查看']

const allCountries = [
  { value: 'US', label: '美国', flag: '🇺🇸', color: '#1d4ed8' },
  { value: 'DE', label: '德国', flag: '🇩🇪', color: '#dc2626' },
  { value: 'UK', label: '英国', flag: '🇬🇧', color: '#059669' },
  { value: 'CA', label: '加拿大', flag: '🇨🇦', color: '#d97706' },
]

const countryMap: Record<string, { label: string; flag: string; color: string }> = {
  US: { label: '美国', flag: '🇺🇸', color: '#1d4ed8' },
  DE: { label: '德国', flag: '🇩🇪', color: '#dc2626' },
  UK: { label: '英国', flag: '🇬🇧', color: '#059669' },
  CA: { label: '加拿大', flag: '🇨🇦', color: '#d97706' },
}

function isSalesRole(role: string) {
  return role === '业务主管' || role === '业务员'
}

const statusColor: Record<string, string> = { active: 'green', disabled: 'red' }
const statusLabel: Record<string, string> = { active: '启用', disabled: '禁用' }

const internalCount = computed(() => userList.value.filter(u => u.user_type === 'internal').length)
const tenantCount = computed(() => userList.value.filter(u => u.user_type === 'tenant').length)

const rolePermsMap = computed(() => {
  const map: Record<string, number> = {}
  for (const rp of rolePermsList.value) {
    map[rp.role] = rp.permissions?.length || 0
  }
  return map
})

function getRolePermCount(role: string) {
  return rolePermsMap.value[role] ?? 0
}

const internalColumns = [
  { title: '账号信息', key: 'user_info', width: 190 },
  { title: '角色', key: 'role', width: 110 },
  { title: '角色权限', key: 'role_perms_count', width: 100 },
  { title: '密码', key: 'password', width: 150 },
  { title: '在职', key: 'employment_status', width: 70 },
  { title: '账号', key: 'account_status', width: 70 },
  { title: '操作', key: 'action', width: 150 },
]

const tenantColumns = [
  { title: '账号信息', key: 'user_info', width: 190 },
  { title: '租户信息', key: 'tenant_info', width: 160 },
  { title: '授权功能', key: 'tenant_perms', width: 200 },
  { title: '密码', key: 'password', width: 150 },
  { title: '账号', key: 'account_status', width: 70 },
  { title: '操作', key: 'action', width: 150 },
]

const currentColumns = computed(() => activeTab.value === 'internal' ? internalColumns : tenantColumns)

const defaultForm = () => ({
  username: '',
  display_name: '',
  plain_password: '',
  user_type: activeTab.value,
  role: '业务员',
  employment_status: '在职',
  tenant_name: '',
  tenant_code: '',
  status: 'active',
  permissions: [] as string[],
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
  filterEmployment.value = ''
  load()
}

function togglePwd(id: string) {
  showPwd.value[id] = !showPwd.value[id]
}

function toggleFormPerm(perm: string) {
  const idx = form.permissions.indexOf(perm)
  if (idx >= 0) form.permissions.splice(idx, 1)
  else form.permissions.push(perm)
}

function toggleEditPerm(perm: string) {
  const idx = editingPerms.value.indexOf(perm)
  if (idx >= 0) editingPerms.value.splice(idx, 1)
  else editingPerms.value.push(perm)
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
    if (filterEmployment.value) query = query.eq('employment_status', filterEmployment.value)

    const { data, error } = await query
    if (error) throw error
    userList.value = data || []
  } finally {
    loading.value = false
  }
}

async function loadRolePerms() {
  const { data, error } = await supabase
    .from('role_permissions')
    .select('*')
    .order('role')
  if (error) { message.error('加载角色权限失败'); return }
  const sorted = internalRoles.map(r => {
    const found = (data || []).find((d: any) => d.role === r)
    return found || { role: r, permissions: [], countries: [] }
  })
  rolePermsList.value = sorted
}

function startEditRole(rp: any) {
  editingRole.value = rp.role
  editingPerms.value = [...(rp.permissions || [])]
  editingCountries.value = [...(rp.countries || [])]
}

function cancelEditRole() {
  editingRole.value = ''
  editingPerms.value = []
  editingCountries.value = []
}

async function saveRolePerms(role: string) {
  roleSubmitting.value = true
  try {
    const payload: any = {
      role,
      permissions: editingPerms.value,
      updated_at: new Date().toISOString(),
    }
    if (isSalesRole(role)) {
      payload.countries = editingCountries.value
    }
    const { error } = await supabase
      .from('role_permissions')
      .upsert(payload, { onConflict: 'role' })
    if (error) throw error
    message.success(`「${role}」权限已保存`)
    cancelEditRole()
    await loadRolePerms()
  } catch (e: any) {
    message.error(e.message || '保存失败')
  } finally {
    roleSubmitting.value = false
  }
}

function openModal(record?: any) {
  editingId.value = record?.id || ''
  if (record) {
    Object.assign(form, defaultForm(), {
      ...record,
      permissions: Array.isArray(record.permissions) ? [...record.permissions] : [],
    })
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
      employment_status: form.employment_status,
      tenant_name: form.tenant_name || null,
      tenant_code: form.tenant_code || null,
      status: form.status,
      permissions: activeTab.value === 'tenant' ? form.permissions : [],
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

async function toggleAccountStatus(record: any) {
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

onMounted(async () => {
  await Promise.all([load(), loadRolePerms()])
})
</script>

<style scoped>
.page-content { padding: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }
.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }

.segment-bar {
  display: flex;
  margin-bottom: 0;
  background: #f1f5f9;
  border-radius: 10px;
  padding: 4px;
  width: fit-content;
  margin-bottom: 20px;
}
.segment-btn {
  display: flex; align-items: center; gap: 7px;
  padding: 8px 20px; border-radius: 7px;
  font-size: 14px; font-weight: 500; color: #64748b;
  cursor: pointer; transition: all 0.18s; user-select: none;
}
.segment-btn:hover { color: #1e293b; }
.segment-btn.active {
  background: #fff; color: #1e293b;
  box-shadow: 0 1px 4px rgba(0,0,0,0.1); font-weight: 600;
}

.sub-tabs {
  display: flex; gap: 0; margin-bottom: 16px;
  border-bottom: 2px solid #f0f0f0;
}
.sub-tab {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 20px; font-size: 14px; font-weight: 500;
  color: #64748b; cursor: pointer; border-bottom: 2px solid transparent;
  margin-bottom: -2px; transition: all 0.15s;
}
.sub-tab:hover { color: #1e293b; }
.sub-tab.active { color: #2563eb; border-bottom-color: #2563eb; font-weight: 600; }
.sub-count {
  font-size: 11px; font-weight: 700; padding: 1px 6px;
  background: #e2e8f0; color: #475569; border-radius: 20px;
}
.sub-tab.active .sub-count { background: #dbeafe; color: #2563eb; }

.user-info-cell { display: flex; align-items: center; gap: 10px; }
.user-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 700; font-size: 14px; flex-shrink: 0;
}
.user-name { font-weight: 600; color: #1e293b; font-size: 14px; line-height: 1.3; }
.user-sub { font-size: 12px; color: #94a3b8; margin-top: 1px; }

.role-tag { font-weight: 600; font-size: 12px; }

.perm-count-badge {
  font-size: 12px; color: #2563eb; font-weight: 600;
  background: #eff6ff; padding: 2px 10px; border-radius: 20px;
  border: 1px solid #bfdbfe;
}

.tenant-name { font-weight: 600; color: #1e293b; font-size: 13px; }
.tenant-code { font-size: 11px; color: #94a3b8; margin-top: 2px; }

.perm-cell { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
.perm-badge {
  font-size: 11px; padding: 1px 7px;
  background: #eff6ff; color: #2563eb;
  border: 1px solid #bfdbfe; border-radius: 20px; white-space: nowrap;
}
.perm-more { font-size: 11px; color: #94a3b8; }
.perm-empty { font-size: 12px; color: #cbd5e1; }

.pwd-cell { display: flex; align-items: center; gap: 4px; }
.pwd-dots { font-size: 16px; letter-spacing: 2px; color: #94a3b8; }
.pwd-text {
  font-size: 13px; color: #1e293b; font-family: monospace;
  background: #f8fafc; padding: 2px 6px; border-radius: 4px; border: 1px solid #e2e8f0;
}

/* 角色权限配置 */
.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(440px, 1fr));
  gap: 16px;
}
.role-card {
  background: #fff; border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
  overflow: hidden;
  transition: box-shadow 0.15s;
}
.role-card:hover { box-shadow: 0 3px 10px rgba(0,0,0,0.08); }
.role-card.editing { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
.rc-header {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px; border-bottom: 1px solid #f0f0f0;
  background: #fafbfc;
}
.rc-role-badge {
  width: 32px; height: 32px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-weight: 700; font-size: 13px; flex-shrink: 0;
}
.rc-role-name { font-weight: 700; font-size: 15px; color: #1e293b; }
.rc-count {
  font-size: 12px; font-weight: 600; color: #64748b;
  background: #f1f5f9; padding: 2px 8px; border-radius: 20px;
}
.rc-countries-section {
  padding: 10px 16px 4px;
  border-bottom: 1px dashed #f0f0f0;
}
.rc-section-label {
  font-size: 11px; font-weight: 700; color: #94a3b8;
  text-transform: uppercase; letter-spacing: 0.5px;
  display: block; margin-bottom: 6px;
}
.rc-countries { display: flex; flex-wrap: wrap; gap: 5px; }
.rc-no-country { font-size: 12px; color: #94a3b8; }
.country-badge-sm {
  font-size: 11px; font-weight: 600; padding: 1px 8px;
  border-radius: 20px; border: 1.5px solid; background: #fff;
}
.rc-country-hint { font-size: 11px; color: #94a3b8; margin-top: 4px; }
.rc-perms { padding: 12px 16px; display: flex; flex-direction: column; gap: 8px; }
.rc-perm-group-inline { display: flex; flex-wrap: wrap; align-items: center; gap: 5px; }
.rc-group-label {
  font-size: 11px; font-weight: 700; color: #94a3b8;
  margin-right: 2px; white-space: nowrap;
}
.rc-empty { font-size: 13px; color: #cbd5e1; padding: 8px 0; }

.rc-edit-group { margin-bottom: 6px; }
.rc-edit-group-title {
  font-size: 11px; font-weight: 700; color: #64748b;
  text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;
}
.rc-edit-group-items { display: flex; flex-wrap: wrap; gap: 5px; }

.perm-checkbox-item {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px; border-radius: 6px;
  font-size: 12px; font-weight: 500; color: #475569;
  background: #fff; border: 1px solid #e2e8f0;
  cursor: pointer; transition: all 0.15s; user-select: none;
}
.perm-checkbox-item:hover { border-color: #93c5fd; color: #2563eb; background: #eff6ff; }
.perm-checkbox-item.checked { background: #eff6ff; border-color: #2563eb; color: #2563eb; font-weight: 600; }
.perm-check-icon {
  width: 13px; height: 13px;
  display: flex; align-items: center; justify-content: center;
  font-size: 9px; color: #2563eb;
}

.perm-config { display: flex; flex-wrap: wrap; gap: 6px; }

.role-perm-hint {
  padding: 10px 14px; border-radius: 8px;
  background: #eff6ff; border: 1px solid #bfdbfe;
  font-size: 13px; color: #475569; line-height: 1.6;
}
.role-perm-hint strong { color: #1d4ed8; }

.role-option-dot {
  display: inline-block; width: 8px; height: 8px;
  border-radius: 50%; margin-right: 6px; vertical-align: middle;
}
</style>
