<template>
  <div class="page-content">
    <h1 class="page-title">商务管理</h1>

    <div class="card-panel">
      <div class="toolbar">
        <a-input-search v-model:value="searchText" placeholder="搜索业务员/微信号" style="width:240px" allow-clear @search="load" />
        <a-button @click="load"><ReloadOutlined /> 刷新</a-button>
      </div>

      <a-table :columns="columns" :data-source="staffList" :loading="loading" row-key="id" size="middle" :expandable="{ expandedRowRender }">
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div class="staff-cell">
              <div class="avatar" :style="{ background: record.avatar_color || '#2563eb' }">{{ record.name.charAt(0) }}</div>
              <span>{{ record.name }}</span>
            </div>
          </template>
          <template v-if="column.key === 'wechat_count'">
            <a-badge :count="record.business_wechat_accounts?.length || 0" show-zero :number-style="{ backgroundColor: '#2563eb' }" />
          </template>
          <template v-if="column.key === 'action'">
            <a-button type="link" size="small" @click="openAddWechat(record)"><PlusOutlined /> 添加微信号</a-button>
          </template>
        </template>
      </a-table>
    </div>

    <a-modal v-model:open="wechatModalOpen" :title="`为 ${currentStaff?.name} 添加商务微信`" @ok="handleAddWechat" :confirm-loading="submitting">
      <a-form layout="vertical">
        <a-form-item label="微信号"><a-input v-model:value="wechatForm.wechat_id" /></a-form-item>
        <a-form-item label="微信昵称"><a-input v-model:value="wechatForm.wechat_nickname" /></a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="wechatForm.status">
            <a-select-option value="在用">在用</a-select-option>
            <a-select-option value="停用">停用</a-select-option>
            <a-select-option value="封号">封号</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="管理客户数"><a-input-number v-model:value="wechatForm.client_count" :min="0" style="width:100%" /></a-form-item>
        <a-form-item label="备注"><a-textarea v-model:value="wechatForm.notes" :rows="2" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, h, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue'
import { supabase } from '../lib/supabase'

const loading = ref(false)
const staffList = ref<any[]>([])
const searchText = ref('')
const wechatModalOpen = ref(false)
const submitting = ref(false)
const currentStaff = ref<any>(null)

const wechatForm = reactive({ wechat_id: '', wechat_nickname: '', status: '在用', client_count: 0, notes: '' })

const columns = [
  { title: '业务员', key: 'name', width: 160 },
  { title: '手机', dataIndex: 'phone', key: 'phone', width: 130 },
  { title: '商务微信数量', key: 'wechat_count', width: 120 },
  { title: '操作', key: 'action', width: 150 },
]

function expandedRowRender(record: any) {
  const accounts = record.business_wechat_accounts || []
  if (!accounts.length) return h('span', { style: 'color:#9ca3af;font-size:12px' }, '暂无商务微信')

  return h('div', { class: 'wechat-list' }, accounts.map((acc: any) =>
    h('div', { class: 'wechat-item', key: acc.id }, [
      h('div', { class: 'wechat-id' }, acc.wechat_id),
      acc.wechat_nickname ? h('div', { class: 'wechat-nick' }, acc.wechat_nickname) : null,
      h('span', {
        class: `wechat-badge wechat-badge-${acc.status === '在用' ? 'green' : acc.status === '停用' ? 'orange' : 'red'}`
      }, acc.status),
      acc.client_count ? h('span', { class: 'wechat-clients' }, `管理${acc.client_count}客户`) : null,
    ])
  ))
}

async function load() {
  loading.value = true
  try {
    let query = supabase.from('staff').select('*, business_wechat_accounts(*)').eq('status', '在职')
    if (searchText.value) query = query.ilike('name', `%${searchText.value}%`)
    const { data, error } = await query
    if (error) throw error
    staffList.value = data || []
  } finally {
    loading.value = false
  }
}

function openAddWechat(record: any) {
  currentStaff.value = record
  Object.assign(wechatForm, { wechat_id: '', wechat_nickname: '', status: '在用', client_count: 0, notes: '' })
  wechatModalOpen.value = true
}

async function handleAddWechat() {
  if (!wechatForm.wechat_id) { message.warning('请输入微信号'); return }
  submitting.value = true
  try {
    const { error } = await supabase.from('business_wechat_accounts').insert([{
      ...wechatForm,
      staff_id: currentStaff.value.id,
    }])
    if (error) throw error
    message.success('微信号已添加')
    wechatModalOpen.value = false
    load()
  } catch (e: any) {
    message.error('添加失败：' + e.message)
  } finally {
    submitting.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.page-content { padding: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }
.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; }
.staff-cell { display: flex; align-items: center; gap: 8px; }
.avatar { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 12px; flex-shrink: 0; }
</style>

<style>
.wechat-list { display: flex; flex-wrap: wrap; gap: 8px; padding: 8px 0; }
.wechat-item { display: flex; align-items: center; gap: 8px; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 12px; }
.wechat-id { font-weight: 600; font-size: 13px; color: #374151; }
.wechat-nick { font-size: 12px; color: #6b7280; }
.wechat-badge { font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 500; }
.wechat-badge-green { background: #d1fae5; color: #065f46; }
.wechat-badge-orange { background: #fed7aa; color: #92400e; }
.wechat-badge-red { background: #fee2e2; color: #991b1b; }
.wechat-clients { font-size: 11px; color: #9ca3af; }
</style>
