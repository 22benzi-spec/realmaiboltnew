<template>
  <div class="page-content">
    <h1 class="page-title">业务员管理</h1>

    <div class="card-panel">
      <div class="toolbar">
        <a-input-search v-model:value="searchText" placeholder="搜索业务员姓名" style="width:220px" allow-clear @search="load" />
        <a-select v-model:value="filterStatus" style="width:120px" @change="load" allow-clear placeholder="状态">
          <a-select-option value="在职">在职</a-select-option>
          <a-select-option value="休假">休假</a-select-option>
          <a-select-option value="离职">离职</a-select-option>
        </a-select>
        <a-button type="primary" @click="openModal()"><PlusOutlined /> 添加业务员</a-button>
      </div>

      <a-table :columns="columns" :data-source="staffList" :loading="loading" row-key="id" size="middle">
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
          <template v-if="column.key === 'status'">
            <a-tag :color="statusColor[record.status] || 'default'">{{ record.status }}</a-tag>
          </template>
          <template v-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="openModal(record)">编辑</a-button>
              <a-popconfirm title="确定删除?" @confirm="deleteStaff(record.id)">
                <a-button type="link" size="small" danger>删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <a-modal v-model:open="modalOpen" :title="editingId ? '编辑业务员' : '添加业务员'" @ok="handleSubmit" :confirm-loading="submitting" width="600px">
      <a-form :model="form" layout="vertical" ref="formRef" :rules="rules">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="姓名" name="name"><a-input v-model:value="form.name" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="角色" name="role"><a-input v-model:value="form.role" placeholder="业务员" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="手机号"><a-input v-model:value="form.phone" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="邮箱"><a-input v-model:value="form.email" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="微信号"><a-input v-model:value="form.wechat_id" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="部门"><a-input v-model:value="form.department" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="状态">
              <a-select v-model:value="form.status">
                <a-select-option value="在职">在职</a-select-option>
                <a-select-option value="休假">休假</a-select-option>
                <a-select-option value="离职">离职</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="头像颜色">
              <a-input v-model:value="form.avatar_color" type="color" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注"><a-textarea v-model:value="form.notes" :rows="2" /></a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import { supabase } from '../lib/supabase'

const loading = ref(false)
const staffList = ref<any[]>([])
const searchText = ref('')
const filterStatus = ref('')
const modalOpen = ref(false)
const submitting = ref(false)
const editingId = ref('')
const formRef = ref()

const statusColor: Record<string, string> = { '在职': 'green', '休假': 'orange', '离职': 'red' }

const defaultForm = () => ({ name: '', role: '', phone: '', email: '', wechat_id: '', department: '', status: '在职', avatar_color: '#2563eb', notes: '', join_date: '' })
const form = reactive(defaultForm())
const rules = { name: [{ required: true, message: '请输入姓名' }] }

const columns = [
  { title: '业务员', key: 'name', width: 180 },
  { title: '手机', dataIndex: 'phone', key: 'phone' },
  { title: '微信', dataIndex: 'wechat_id', key: 'wechat_id' },
  { title: '部门', dataIndex: 'department', key: 'department' },
  { title: '已分配', dataIndex: 'total_assigned', key: 'total_assigned', width: 80 },
  { title: '已完成', dataIndex: 'total_completed', key: 'total_completed', width: 80 },
  { title: '状态', key: 'status', width: 80 },
  { title: '操作', key: 'action', width: 120 },
]

async function load() {
  loading.value = true
  try {
    let query = supabase.from('staff').select('*').order('created_at', { ascending: false })
    if (searchText.value) query = query.ilike('name', `%${searchText.value}%`)
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
    Object.assign(form, record)
  } else {
    Object.assign(form, defaultForm())
  }
  modalOpen.value = true
}

async function handleSubmit() {
  await formRef.value?.validate()
  submitting.value = true
  try {
    const payload = { ...form }
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
.sub { font-size: 12px; color: #9ca3af; }
</style>
