<template>
  <div class="page-content">
    <div class="page-header">
      <h1 class="page-title">商务管理</h1>
      <a-button type="primary" @click="openAddManager"><PlusOutlined /> 添加商务经理</a-button>
    </div>

    <div class="card-panel">
      <div class="toolbar">
        <a-input-search v-model:value="searchText" placeholder="搜索商务经理姓名" style="width:240px" allow-clear @search="load" />
        <a-button @click="load"><ReloadOutlined /> 刷新</a-button>
      </div>

      <a-table
        :columns="managerColumns"
        :data-source="managerList"
        :loading="loading"
        row-key="id"
        size="middle"
        :expandable="{ expandedRowRender }"
        :pagination="{ pageSize: 10 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'name'">
            <div class="staff-cell">
              <div class="avatar" :style="{ background: record.avatar_color || '#2563eb' }">{{ record.name.charAt(0) }}</div>
              <div>
                <div class="staff-name">{{ record.name }}</div>
                <div class="staff-phone">{{ record.phone || '—' }}</div>
              </div>
            </div>
          </template>
          <template v-if="column.key === 'wechat_count'">
            <a-badge :count="record.business_wechat_accounts?.length || 0" show-zero :number-style="{ backgroundColor: '#2563eb' }" />
          </template>
          <template v-if="column.key === 'client_count'">
            <span class="total-clients">{{ getTotalClients(record) }} 位</span>
          </template>
          <template v-if="column.key === 'status'">
            <a-tag :color="record.status === '在职' ? 'green' : 'default'">{{ record.status }}</a-tag>
          </template>
          <template v-if="column.key === 'action'">
            <div class="action-btns">
              <a-button type="link" size="small" @click="openAddWechat(record)"><PlusOutlined /> 添加微信号</a-button>
              <a-button type="link" size="small" danger @click="confirmDeleteManager(record)"><DeleteOutlined /> 删除</a-button>
            </div>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 添加商务经理 Modal -->
    <a-modal v-model:open="managerModalOpen" title="添加商务经理" @ok="handleAddManager" :confirm-loading="submitting" ok-text="确定" cancel-text="取消">
      <a-form layout="vertical" style="margin-top:8px">
        <a-form-item label="姓名" required><a-input v-model:value="managerForm.name" placeholder="请输入姓名" /></a-form-item>
        <a-form-item label="手机号"><a-input v-model:value="managerForm.phone" placeholder="请输入手机号" /></a-form-item>
        <a-form-item label="邮箱"><a-input v-model:value="managerForm.email" placeholder="请输入邮箱" /></a-form-item>
        <a-form-item label="个人微信号"><a-input v-model:value="managerForm.wechat_id" placeholder="请输入个人微信号" /></a-form-item>
        <a-form-item label="备注"><a-textarea v-model:value="managerForm.notes" :rows="2" placeholder="备注信息" /></a-form-item>
      </a-form>
    </a-modal>

    <!-- 添加微信号 Modal -->
    <a-modal v-model:open="wechatModalOpen" :title="`为 ${currentManager?.name} 添加商务微信号`" @ok="handleAddWechat" :confirm-loading="submitting" ok-text="确定" cancel-text="取消">
      <a-form layout="vertical" style="margin-top:8px">
        <a-form-item label="微信号" required><a-input v-model:value="wechatForm.wechat_id" placeholder="请输入微信号" /></a-form-item>
        <a-form-item label="微信昵称"><a-input v-model:value="wechatForm.wechat_nickname" placeholder="请输入微信昵称" /></a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="wechatForm.status">
            <a-select-option value="在用">在用</a-select-option>
            <a-select-option value="停用">停用</a-select-option>
            <a-select-option value="封号">封号</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="备注"><a-textarea v-model:value="wechatForm.notes" :rows="2" /></a-form-item>
      </a-form>
    </a-modal>

    <!-- 管理客户 Modal -->
    <a-modal
      v-model:open="clientModalOpen"
      :title="`微信号「${currentWechat?.wechat_id}」客户管理`"
      :footer="null"
      width="700px"
    >
      <div class="client-toolbar">
        <a-button type="primary" size="small" @click="openAddClient"><PlusOutlined /> 添加客户</a-button>
      </div>
      <a-table
        :columns="clientColumns"
        :data-source="clientList"
        :loading="clientLoading"
        row-key="id"
        size="small"
        :pagination="{ pageSize: 8 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="record.status === '活跃' ? 'green' : 'default'">{{ record.status }}</a-tag>
          </template>
          <template v-if="column.key === 'action'">
            <a-button type="link" size="small" danger @click="confirmDeleteClient(record)"><DeleteOutlined /></a-button>
          </template>
        </template>
      </a-table>
    </a-modal>

    <!-- 添加客户 Modal -->
    <a-modal v-model:open="addClientModalOpen" title="添加客户" @ok="handleAddClient" :confirm-loading="submitting" ok-text="确定" cancel-text="取消">
      <a-form layout="vertical" style="margin-top:8px">
        <a-form-item label="客户名称" required><a-input v-model:value="clientForm.client_name" placeholder="请输入客户名称" /></a-form-item>
        <a-form-item label="客户微信号"><a-input v-model:value="clientForm.client_wechat" placeholder="请输入客户微信号" /></a-form-item>
        <a-form-item label="备注标记"><a-input v-model:value="clientForm.remark" placeholder="如：高价值客户、长期合作等" /></a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="clientForm.status">
            <a-select-option value="活跃">活跃</a-select-option>
            <a-select-option value="沉默">沉默</a-select-option>
            <a-select-option value="流失">流失</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="备注"><a-textarea v-model:value="clientForm.notes" :rows="2" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, h, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { supabase } from '../lib/supabase'

const loading = ref(false)
const managerList = ref<any[]>([])
const searchText = ref('')

const managerModalOpen = ref(false)
const wechatModalOpen = ref(false)
const clientModalOpen = ref(false)
const addClientModalOpen = ref(false)
const submitting = ref(false)
const clientLoading = ref(false)

const currentManager = ref<any>(null)
const currentWechat = ref<any>(null)
const clientList = ref<any[]>([])

const managerForm = reactive({ name: '', phone: '', email: '', wechat_id: '', notes: '' })
const wechatForm = reactive({ wechat_id: '', wechat_nickname: '', status: '在用', notes: '' })
const clientForm = reactive({ client_name: '', client_wechat: '', remark: '', status: '活跃', notes: '' })

const managerColumns = [
  { title: '商务经理', key: 'name', width: 180 },
  { title: '个人微信', dataIndex: 'wechat_id', key: 'wechat_id', width: 130 },
  { title: '商务微信数', key: 'wechat_count', width: 110 },
  { title: '管理客户数', key: 'client_count', width: 110 },
  { title: '状态', key: 'status', width: 80 },
  { title: '操作', key: 'action', width: 200 },
]

const clientColumns = [
  { title: '客户名称', dataIndex: 'client_name', key: 'client_name', width: 130 },
  { title: '客户微信', dataIndex: 'client_wechat', key: 'client_wechat', width: 130 },
  { title: '备注标记', dataIndex: 'remark', key: 'remark' },
  { title: '状态', key: 'status', width: 80 },
  { title: '操作', key: 'action', width: 70 },
]

function getTotalClients(record: any): number {
  return (record.business_wechat_accounts || []).reduce((sum: number, acc: any) => {
    return sum + (acc.wechat_clients?.length || 0)
  }, 0)
}

function expandedRowRender(record: any) {
  const accounts = record.business_wechat_accounts || []
  if (!accounts.length) return h('span', { style: 'color:#9ca3af;font-size:12px;padding:8px 0;display:block' }, '暂无商务微信号，点击「添加微信号」开始添加')

  return h('div', { class: 'wechat-cards' }, accounts.map((acc: any) => {
    const clientCount = acc.wechat_clients?.length || 0
    const statusClass = acc.status === '在用' ? 'green' : acc.status === '停用' ? 'orange' : 'red'
    const statusBorderColor = acc.status === '在用' ? '#10b981' : acc.status === '停用' ? '#f59e0b' : '#ef4444'

    return h('div', { class: 'wechat-card', key: acc.id, style: `border-top: 3px solid ${statusBorderColor}` }, [
      h('div', { class: 'wcard-header' }, [
        h('div', { class: 'wcard-title-row' }, [
          h('span', { class: 'wcard-icon' }, '💬'),
          h('div', { class: 'wcard-id' }, acc.wechat_id),
        ]),
        h('span', { class: `wcard-status wcard-status-${statusClass}` }, acc.status),
      ]),
      acc.wechat_nickname ? h('div', { class: 'wcard-nick' }, `昵称：${acc.wechat_nickname}`) : null,
      h('div', { class: 'wcard-stats' }, [
        h('div', { class: 'wcard-stat' }, [
          h('div', { class: 'wcard-stat-num', style: `color: ${clientCount > 0 ? '#2563eb' : '#9ca3af'}` }, String(clientCount)),
          h('div', { class: 'wcard-stat-label' }, '管理客户'),
        ]),
        h('div', { class: 'wcard-stat-divider' }),
        h('div', { class: 'wcard-stat' }, [
          h('div', { class: 'wcard-stat-num', style: 'color:#059669' }, String(acc.wechat_clients?.filter((c: any) => c.status === '活跃').length || 0)),
          h('div', { class: 'wcard-stat-label' }, '活跃客户'),
        ]),
      ]),
      acc.notes ? h('div', { class: 'wcard-notes' }, acc.notes) : null,
      h('div', { class: 'wcard-footer' }, [
        h('a', {
          class: 'wcard-btn',
          onClick: () => openClientModal(acc)
        }, '管理客户'),
        h('a', {
          class: 'wcard-btn danger',
          onClick: () => confirmDeleteWechat(acc)
        }, '删除'),
      ]),
    ])
  }))
}

async function load() {
  loading.value = true
  try {
    let query = supabase
      .from('business_managers')
      .select('*, business_wechat_accounts(*, wechat_clients(*))')
      .eq('status', '在职')
      .order('created_at', { ascending: false })
    if (searchText.value) query = query.ilike('name', `%${searchText.value}%`)
    const { data, error } = await query
    if (error) throw error
    managerList.value = data || []
  } finally {
    loading.value = false
  }
}

function openAddManager() {
  Object.assign(managerForm, { name: '', phone: '', email: '', wechat_id: '', notes: '' })
  managerModalOpen.value = true
}

async function handleAddManager() {
  if (!managerForm.name.trim()) { message.warning('请输入姓名'); return }
  submitting.value = true
  try {
    const { error } = await supabase.from('business_managers').insert([{
      name: managerForm.name.trim(),
      phone: managerForm.phone,
      email: managerForm.email,
      wechat_id: managerForm.wechat_id,
      notes: managerForm.notes,
      avatar_color: randomColor(),
    }])
    if (error) throw error
    message.success('商务经理已添加')
    managerModalOpen.value = false
    load()
  } catch (e: any) {
    message.error('添加失败：' + e.message)
  } finally {
    submitting.value = false
  }
}

function confirmDeleteManager(record: any) {
  Modal.confirm({
    title: `确定删除商务经理「${record.name}」？`,
    content: '删除后相关微信号和客户数据也将一并删除，此操作不可恢复。',
    okText: '确定删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: () => deleteManager(record.id),
  })
}

async function deleteManager(id: string) {
  try {
    const { error } = await supabase.from('business_managers').delete().eq('id', id)
    if (error) throw error
    message.success('已删除')
    load()
  } catch (e: any) {
    message.error('删除失败：' + e.message)
  }
}

function openAddWechat(record: any) {
  currentManager.value = record
  Object.assign(wechatForm, { wechat_id: '', wechat_nickname: '', status: '在用', notes: '' })
  wechatModalOpen.value = true
}

async function handleAddWechat() {
  if (!wechatForm.wechat_id.trim()) { message.warning('请输入微信号'); return }
  submitting.value = true
  try {
    const { error } = await supabase.from('business_wechat_accounts').insert([{
      ...wechatForm,
      manager_id: currentManager.value.id,
      staff_id: null,
      client_count: 0,
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

function confirmDeleteWechat(acc: any) {
  Modal.confirm({
    title: `确定删除微信号「${acc.wechat_id}」？`,
    content: '删除后该微信号下的客户数据也将一并删除。',
    okText: '确定删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      const { error } = await supabase.from('business_wechat_accounts').delete().eq('id', acc.id)
      if (error) { message.error('删除失败：' + error.message); return }
      message.success('已删除')
      load()
    },
  })
}

async function openClientModal(acc: any) {
  currentWechat.value = acc
  clientModalOpen.value = true
  await loadClients(acc.id)
}

async function loadClients(wechatAccountId: string) {
  clientLoading.value = true
  try {
    const { data, error } = await supabase
      .from('wechat_clients')
      .select('*')
      .eq('wechat_account_id', wechatAccountId)
      .order('created_at', { ascending: false })
    if (error) throw error
    clientList.value = data || []
  } finally {
    clientLoading.value = false
  }
}

function openAddClient() {
  Object.assign(clientForm, { client_name: '', client_wechat: '', remark: '', status: '活跃', notes: '' })
  addClientModalOpen.value = true
}

async function handleAddClient() {
  if (!clientForm.client_name.trim()) { message.warning('请输入客户名称'); return }
  submitting.value = true
  try {
    const { error } = await supabase.from('wechat_clients').insert([{
      ...clientForm,
      wechat_account_id: currentWechat.value.id,
    }])
    if (error) throw error
    message.success('客户已添加')
    addClientModalOpen.value = false
    await loadClients(currentWechat.value.id)
    load()
  } catch (e: any) {
    message.error('添加失败：' + e.message)
  } finally {
    submitting.value = false
  }
}

function confirmDeleteClient(record: any) {
  Modal.confirm({
    title: `确定删除客户「${record.client_name}」？`,
    okText: '确定删除',
    okType: 'danger',
    cancelText: '取消',
    onOk: async () => {
      const { error } = await supabase.from('wechat_clients').delete().eq('id', record.id)
      if (error) { message.error('删除失败：' + error.message); return }
      message.success('已删除')
      await loadClients(currentWechat.value.id)
      load()
    },
  })
}

function randomColor() {
  const colors = ['#2563eb', '#059669', '#dc2626', '#d97706', '#7c3aed', '#0891b2', '#be185d']
  return colors[Math.floor(Math.random() * colors.length)]
}

onMounted(load)
</script>

<style scoped>
.page-content { padding: 24px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin: 0; }
.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; }
.staff-cell { display: flex; align-items: center; gap: 10px; }
.avatar { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 13px; flex-shrink: 0; }
.staff-name { font-size: 13px; font-weight: 600; color: #1f2937; }
.staff-phone { font-size: 12px; color: #9ca3af; }
.total-clients { font-size: 13px; color: #374151; font-weight: 500; }
.action-btns { display: flex; gap: 4px; }
.client-toolbar { margin-bottom: 12px; }
</style>

<style>
.wechat-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 0 6px;
}
.wechat-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 14px 16px 10px;
  width: 200px;
  min-width: 180px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: box-shadow 0.2s;
}
.wechat-card:hover { box-shadow: 0 3px 10px rgba(0,0,0,0.1); }
.wcard-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 6px; }
.wcard-title-row { display: flex; align-items: center; gap: 5px; min-width: 0; }
.wcard-icon { font-size: 14px; flex-shrink: 0; }
.wcard-id { font-weight: 700; font-size: 13px; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wcard-status { font-size: 11px; padding: 2px 7px; border-radius: 10px; font-weight: 600; white-space: nowrap; flex-shrink: 0; }
.wcard-status-green { background: #d1fae5; color: #065f46; }
.wcard-status-orange { background: #fef3c7; color: #92400e; }
.wcard-status-red { background: #fee2e2; color: #991b1b; }
.wcard-nick { font-size: 12px; color: #6b7280; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wcard-stats { display: flex; align-items: center; background: #f8fafc; border-radius: 7px; padding: 8px 0; }
.wcard-stat { flex: 1; text-align: center; }
.wcard-stat-num { font-size: 18px; font-weight: 700; line-height: 1.2; }
.wcard-stat-label { font-size: 11px; color: #9ca3af; margin-top: 2px; }
.wcard-stat-divider { width: 1px; height: 28px; background: #e5e7eb; }
.wcard-notes { font-size: 11px; color: #9ca3af; background: #f9fafb; border-radius: 5px; padding: 4px 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wcard-footer { display: flex; gap: 8px; border-top: 1px solid #f3f4f6; padding-top: 8px; margin-top: 2px; }
.wcard-btn { font-size: 12px; color: #2563eb; cursor: pointer; text-decoration: none; flex: 1; text-align: center; }
.wcard-btn:hover { text-decoration: underline; }
.wcard-btn.danger { color: #dc2626; }
</style>
