<template>
  <div class="page-content">
    <h1 class="page-title">业务员管理</h1>

    <div class="card-panel">
      <div class="toolbar">
        <a-input-search v-model:value="searchText" placeholder="搜索姓名/编号" style="width:220px" allow-clear @search="load" />
        <a-select v-model:value="filterStatus" style="width:120px" @change="load" allow-clear placeholder="状态筛选">
          <a-select-option value="在职">在职</a-select-option>
          <a-select-option value="休假">休假</a-select-option>
          <a-select-option value="离职">离职</a-select-option>
        </a-select>
        <a-button type="primary" @click="openModal()"><PlusOutlined /> 添加业务员</a-button>
      </div>

      <a-table :columns="columns" :data-source="staffList" :loading="loading" row-key="id" size="middle" :pagination="{ pageSize: 20 }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div class="staff-name-cell">
              <div class="avatar" :style="{ background: record.avatar_color || '#2563eb' }">{{ record.name.charAt(0) }}</div>
              <div>
                <div class="name">{{ record.name }}</div>
                <div class="sub">{{ record.role || '业务员' }}</div>
              </div>
            </div>
          </template>
          <template v-if="column.key === 'staff_number'">
            <span class="staff-no">{{ record.staff_number || '—' }}</span>
          </template>
          <template v-if="column.key === 'contact'">
            <div class="contact-cell">
              <div v-if="record.phone" class="contact-line"><PhoneOutlined /> {{ record.phone }}</div>
              <div v-if="record.wechat_id" class="contact-line wechat"><WechatOutlined /> {{ record.wechat_id }}</div>
              <div v-if="record.email" class="contact-line email"><MailOutlined /> {{ record.email }}</div>
            </div>
          </template>
          <template v-if="column.key === 'department'">
            <span>{{ record.department || '—' }}</span>
          </template>
          <template v-if="column.key === 'join_date'">
            <span>{{ record.join_date || '—' }}</span>
          </template>
          <template v-if="column.key === 'stats'">
            <div class="stats-cell">
              <span class="stat-item assigned">已分配 {{ record.total_assigned || 0 }}</span>
              <span class="stat-item completed">已完成 {{ record.total_completed || 0 }}</span>
            </div>
          </template>
          <template v-if="column.key === 'status'">
            <a-tag :color="statusColor[record.status] || 'default'">{{ record.status }}</a-tag>
          </template>
          <template v-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="openModal(record)">编辑</a-button>
              <a-popconfirm title="确定删除该业务员?" @confirm="deleteStaff(record.id)">
                <a-button type="link" size="small" danger>删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <a-modal v-model:open="modalOpen" :title="editingId ? '编辑业务员' : '添加业务员'" @ok="handleSubmit" :confirm-loading="submitting" width="680px">
      <a-form :model="form" layout="vertical" ref="formRef" :rules="rules">
        <a-divider orientation="left" style="font-size:13px;color:#6b7280">基本信息</a-divider>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="业务员编号" name="staff_number">
              <a-input v-model:value="form.staff_number" placeholder="如 YWY-001" :disabled="!!editingId && !!form.staff_number" />
              <div v-if="!editingId" style="font-size:11px;color:#9ca3af;margin-top:2px">留空则自动生成</div>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="姓名" name="name">
              <a-input v-model:value="form.name" placeholder="真实姓名" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="角色/职位" name="role">
              <a-select v-model:value="form.role">
                <a-select-option value="业务员">业务员</a-select-option>
                <a-select-option value="主管">主管</a-select-option>
                <a-select-option value="经理">经理</a-select-option>
                <a-select-option value="实习">实习</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="部门">
              <a-input v-model:value="form.department" placeholder="所属部门" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="在职状态">
              <a-select v-model:value="form.status">
                <a-select-option value="在职">在职</a-select-option>
                <a-select-option value="休假">休假</a-select-option>
                <a-select-option value="离职">离职</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="入职日期">
              <a-date-picker v-model:value="joinDateVal" style="width:100%" @change="onJoinDateChange" placeholder="选择入职日期" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-divider orientation="left" style="font-size:13px;color:#6b7280">联系方式</a-divider>
        <a-row :gutter="16">
          <a-col :span="8">
            <a-form-item label="手机号">
              <a-input v-model:value="form.phone" placeholder="手机号码" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="微信号">
              <a-input v-model:value="form.wechat_id" placeholder="微信账号" />
            </a-form-item>
          </a-col>
          <a-col :span="8">
            <a-form-item label="邮箱">
              <a-input v-model:value="form.email" placeholder="电子邮箱" />
            </a-form-item>
          </a-col>
        </a-row>

        <a-divider orientation="left" style="font-size:13px;color:#6b7280">其他</a-divider>
        <a-row :gutter="16">
          <a-col :span="6">
            <a-form-item label="头像颜色">
              <div class="color-picker-row">
                <input type="color" v-model="form.avatar_color" class="color-input" />
                <div class="avatar-preview" :style="{ background: form.avatar_color }">{{ form.name ? form.name.charAt(0) : 'A' }}</div>
              </div>
            </a-form-item>
          </a-col>
          <a-col :span="18">
            <a-form-item label="备注">
              <a-textarea v-model:value="form.notes" :rows="2" placeholder="备注信息..." />
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
import { PlusOutlined, PhoneOutlined, MailOutlined, WechatOutlined } from '@ant-design/icons-vue'
import { supabase } from '../lib/supabase'
import dayjs from 'dayjs'

const loading = ref(false)
const staffList = ref<any[]>([])
const searchText = ref('')
const filterStatus = ref('')
const modalOpen = ref(false)
const submitting = ref(false)
const editingId = ref('')
const formRef = ref()
const joinDateVal = ref<any>(null)

const statusColor: Record<string, string> = { '在职': 'green', '休假': 'orange', '离职': 'red' }

const defaultForm = () => ({
  staff_number: '',
  name: '',
  role: '业务员',
  phone: '',
  email: '',
  wechat_id: '',
  department: '',
  status: '在职',
  avatar_color: '#2563eb',
  notes: '',
  join_date: '',
})
const form = reactive(defaultForm())
const rules = { name: [{ required: true, message: '请输入姓名' }] }

const columns = [
  { title: '业务员编号', key: 'staff_number', dataIndex: 'staff_number', width: 120 },
  { title: '姓名', key: 'name', width: 180 },
  { title: '联系方式', key: 'contact', width: 200 },
  { title: '部门', key: 'department', dataIndex: 'department', width: 100 },
  { title: '入职日期', key: 'join_date', dataIndex: 'join_date', width: 110 },
  { title: '业绩', key: 'stats', width: 150 },
  { title: '状态', key: 'status', width: 80 },
  { title: '操作', key: 'action', width: 110 },
]

function onJoinDateChange(_: any, dateStr: string) {
  form.join_date = dateStr
}

async function generateStaffNumber(): Promise<string> {
  const { data } = await supabase
    .from('staff')
    .select('staff_number')
    .not('staff_number', 'is', null)
    .order('created_at', { ascending: false })
    .limit(50)
  const nums = (data || [])
    .map((r: any) => r.staff_number)
    .filter((n: string) => /^YWY-\d+$/.test(n))
    .map((n: string) => parseInt(n.replace('YWY-', '')))
  const max = nums.length ? Math.max(...nums) : 0
  return `YWY-${String(max + 1).padStart(3, '0')}`
}

async function load() {
  loading.value = true
  try {
    let query = supabase.from('staff').select('*').order('created_at', { ascending: false })
    if (searchText.value) {
      query = query.or(`name.ilike.%${searchText.value}%,staff_number.ilike.%${searchText.value}%`)
    }
    if (filterStatus.value) query = query.eq('status', filterStatus.value)
    const { data, error } = await query
    if (error) throw error
    staffList.value = data || []
  } finally {
    loading.value = false
  }
}

function openModal(record?: any) {
  editingId.value = record?.id || ''
  if (record) {
    Object.assign(form, defaultForm(), record)
    joinDateVal.value = record.join_date ? dayjs(record.join_date) : null
  } else {
    Object.assign(form, defaultForm())
    joinDateVal.value = null
  }
  modalOpen.value = true
}

async function handleSubmit() {
  await formRef.value?.validate()
  submitting.value = true
  try {
    const payload = { ...form }
    if (!editingId.value && !payload.staff_number) {
      payload.staff_number = await generateStaffNumber()
    }
    if (editingId.value) {
      const { error } = await supabase.from('staff').update(payload).eq('id', editingId.value)
      if (error) throw error
      message.success('更新成功')
    } else {
      const { error } = await supabase.from('staff').insert([payload])
      if (error) throw error
      message.success('添加成功')
    }
    modalOpen.value = false
    load()
  } catch (e: any) {
    message.error('操作失败：' + e.message)
  } finally {
    submitting.value = false
  }
}

async function deleteStaff(id: string) {
  const { error } = await supabase.from('staff').delete().eq('id', id)
  if (error) { message.error('删除失败'); return }
  message.success('删除成功')
  load()
}

onMounted(load)
</script>

<style scoped>
.page-content { padding: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }
.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; }

.staff-name-cell { display: flex; align-items: center; gap: 10px; }
.avatar { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 13px; flex-shrink: 0; }
.name { font-weight: 600; font-size: 13px; color: #374151; }
.sub { font-size: 11px; color: #9ca3af; }

.staff-no { font-family: monospace; font-weight: 700; font-size: 13px; color: #1d4ed8; background: #eff6ff; padding: 2px 8px; border-radius: 5px; }

.contact-cell { display: flex; flex-direction: column; gap: 2px; }
.contact-line { font-size: 12px; color: #374151; display: flex; align-items: center; gap: 4px; }
.contact-line.wechat { color: #16a34a; }
.contact-line.email { color: #6b7280; }

.stats-cell { display: flex; flex-direction: column; gap: 2px; }
.stat-item { font-size: 11px; padding: 1px 6px; border-radius: 4px; width: fit-content; }
.stat-item.assigned { background: #eff6ff; color: #1d4ed8; }
.stat-item.completed { background: #f0fdf4; color: #15803d; }

.color-picker-row { display: flex; align-items: center; gap: 10px; }
.color-input { width: 40px; height: 32px; border: 1px solid #d9d9d9; border-radius: 6px; cursor: pointer; padding: 2px; }
.avatar-preview { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 14px; }
</style>
