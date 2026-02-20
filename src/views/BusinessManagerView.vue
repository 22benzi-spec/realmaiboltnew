<template>
  <div class="page-content">
    <div class="page-header">
      <h1 class="page-title">商务管理</h1>
      <div class="header-actions">
        <a-input-search v-model:value="searchText" placeholder="搜索商务经理姓名" style="width:220px" allow-clear @search="load" />
        <a-button @click="load"><ReloadOutlined /></a-button>
        <a-button type="primary" @click="openAddManager"><PlusOutlined /> 添加商务经理</a-button>
      </div>
    </div>

    <div v-if="loading" class="loading-wrap">
      <a-spin size="large" />
    </div>

    <div v-else-if="managerList.length === 0" class="empty-wrap">
      <a-empty description="暂无商务经理数据" />
    </div>

    <div v-else class="manager-grid">
      <div
        v-for="record in managerList"
        :key="record.id"
        class="manager-card"
      >
        <div class="card-left">
          <div class="avatar-lg" :style="{ background: record.avatar_color || '#2563eb' }">
            {{ record.name.charAt(0) }}
          </div>
          <div class="card-name-block">
            <span class="card-name clickable" @click="openDetail(record)">{{ record.name }}</span>
            <a-tag :color="record.status === '在职' ? 'green' : 'default'" style="margin-top:4px">{{ record.status }}</a-tag>
          </div>
        </div>

        <div class="card-divider" />

        <div class="card-stats">
          <div class="stat-item">
            <div class="stat-num blue">{{ record.business_wechat_accounts?.length || 0 }}</div>
            <div class="stat-label">商务微信</div>
          </div>
          <div class="stat-sep" />
          <div class="stat-item">
            <div class="stat-num green">{{ getTotalClients(record) }}</div>
            <div class="stat-label">管理客户</div>
          </div>
          <div class="stat-sep" />
          <div class="stat-item">
            <div class="stat-num orange">{{ getActiveClients(record) }}</div>
            <div class="stat-label">活跃客户</div>
          </div>
        </div>

        <div class="card-divider" />

        <div class="card-meta">
          <div class="meta-row"><span class="meta-label">手机</span><span class="meta-val">{{ record.phone || '—' }}</span></div>
          <div class="meta-row"><span class="meta-label">入职</span><span class="meta-val">{{ record.join_date ? formatDate(record.join_date) : '—' }}</span></div>
        </div>

        <div class="card-divider" />

        <div class="card-actions">
          <a-button type="link" size="small" @click="openDetail(record)">查看详情</a-button>
          <a-button type="link" size="small" @click="openAddWechat(record)"><PlusOutlined /> 添加微信</a-button>
          <a-button type="link" size="small" danger @click="confirmDeleteManager(record)"><DeleteOutlined /></a-button>
        </div>
      </div>
    </div>

    <!-- 经理详情抽屉 -->
    <a-drawer
      v-model:open="detailOpen"
      :title="null"
      placement="right"
      width="520"
      :body-style="{ padding: 0 }"
    >
      <template v-if="detailManager">
        <div class="drawer-header">
          <div class="drawer-avatar" :style="{ background: detailManager.avatar_color || '#2563eb' }">
            {{ detailManager.name.charAt(0) }}
          </div>
          <div class="drawer-title-block">
            <div class="drawer-name">{{ detailManager.name }}</div>
            <div class="drawer-sub">
              <a-tag :color="detailManager.status === '在职' ? 'green' : 'default'">{{ detailManager.status }}</a-tag>
              <span v-if="detailManager.join_date" class="drawer-join">入职 {{ formatDate(detailManager.join_date) }}</span>
            </div>
          </div>
          <div class="drawer-header-actions">
            <a-button type="link" size="small" danger @click="confirmDeleteManager(detailManager)"><DeleteOutlined /> 删除</a-button>
          </div>
        </div>

        <div class="drawer-body">
          <div class="drawer-section">
            <div class="section-title">基本信息</div>
            <div class="info-grid">
              <div class="info-item"><span class="info-label">手机号</span><span class="info-val">{{ detailManager.phone || '—' }}</span></div>
              <div class="info-item"><span class="info-label">邮箱</span><span class="info-val">{{ detailManager.email || '—' }}</span></div>
              <div class="info-item"><span class="info-label">入职日期</span><span class="info-val">{{ detailManager.join_date ? formatDate(detailManager.join_date) : '—' }}</span></div>
              <div class="info-item" v-if="detailManager.notes"><span class="info-label">备注</span><span class="info-val">{{ detailManager.notes }}</span></div>
            </div>
          </div>

          <div class="drawer-section">
            <div class="section-title-row">
              <span class="section-title">商务微信号</span>
              <a-button type="primary" size="small" @click="openAddWechat(detailManager)"><PlusOutlined /> 添加微信号</a-button>
            </div>
            <div v-if="!detailManager.business_wechat_accounts?.length" class="empty-text">暂无商务微信号</div>
            <div v-else class="wechat-list">
              <div v-for="acc in detailManager.business_wechat_accounts" :key="acc.id" class="wechat-item">
                <div class="witem-left">
                  <div class="witem-id">{{ acc.wechat_id }}</div>
                  <div v-if="acc.wechat_nickname" class="witem-nick">{{ acc.wechat_nickname }}</div>
                </div>
                <div class="witem-mid">
                  <div class="witem-stat">
                    <span class="wstat-num">{{ acc.wechat_clients?.length || 0 }}</span>
                    <span class="wstat-label">客户</span>
                  </div>
                  <div class="witem-stat">
                    <span class="wstat-num green">{{ acc.wechat_clients?.filter((c: any) => c.status === '活跃').length || 0 }}</span>
                    <span class="wstat-label">活跃</span>
                  </div>
                </div>
                <div class="witem-right">
                  <a-tag :color="acc.status === '在用' ? 'green' : acc.status === '停用' ? 'orange' : 'red'" style="margin:0">{{ acc.status }}</a-tag>
                  <a-button type="link" size="small" @click="openClientModal(acc)">管理客户</a-button>
                  <a-button type="link" size="small" danger @click="confirmDeleteWechat(acc)"><DeleteOutlined /></a-button>
                </div>
              </div>
            </div>
          </div>

          <div class="drawer-stats-row">
            <div class="dstat-card">
              <div class="dstat-num blue">{{ detailManager.business_wechat_accounts?.length || 0 }}</div>
              <div class="dstat-label">商务微信数</div>
            </div>
            <div class="dstat-card">
              <div class="dstat-num green">{{ getTotalClients(detailManager) }}</div>
              <div class="dstat-label">管理客户总数</div>
            </div>
            <div class="dstat-card">
              <div class="dstat-num orange">{{ getActiveClients(detailManager) }}</div>
              <div class="dstat-label">活跃客户数</div>
            </div>
          </div>
        </div>
      </template>
    </a-drawer>

    <!-- 添加商务经理 Modal -->
    <a-modal v-model:open="managerModalOpen" title="添加商务经理" @ok="handleAddManager" :confirm-loading="submitting" ok-text="确定" cancel-text="取消">
      <a-form layout="vertical" style="margin-top:8px">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="姓名" required><a-input v-model:value="managerForm.name" placeholder="请输入姓名" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="手机号"><a-input v-model:value="managerForm.phone" placeholder="请输入手机号" /></a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="邮箱"><a-input v-model:value="managerForm.email" placeholder="请输入邮箱" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="入职日期"><a-date-picker v-model:value="managerForm.join_date" style="width:100%" placeholder="选择入职日期" /></a-form-item>
          </a-col>
        </a-row>
        <a-form-item label="备注"><a-textarea v-model:value="managerForm.notes" :rows="2" placeholder="备注信息" /></a-form-item>
      </a-form>
    </a-modal>

    <!-- 添加微信号 Modal -->
    <a-modal v-model:open="wechatModalOpen" :title="`为 ${currentManager?.name} 添加商务微信号`" @ok="handleAddWechat" :confirm-loading="submitting" ok-text="确定" cancel-text="取消">
      <a-form layout="vertical" style="margin-top:8px">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="微信号" required><a-input v-model:value="wechatForm.wechat_id" placeholder="请输入微信号" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="微信昵称"><a-input v-model:value="wechatForm.wechat_nickname" placeholder="请输入微信昵称" /></a-form-item>
          </a-col>
        </a-row>
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
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="客户名称" required><a-input v-model:value="clientForm.client_name" placeholder="请输入客户名称" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="客户微信号"><a-input v-model:value="clientForm.client_wechat" placeholder="请输入客户微信号" /></a-form-item>
          </a-col>
        </a-row>
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
import { ref, reactive, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { supabase } from '../lib/supabase'
import dayjs from 'dayjs'

const loading = ref(false)
const managerList = ref<any[]>([])
const searchText = ref('')

const managerModalOpen = ref(false)
const wechatModalOpen = ref(false)
const clientModalOpen = ref(false)
const addClientModalOpen = ref(false)
const submitting = ref(false)
const clientLoading = ref(false)
const detailOpen = ref(false)
const detailManager = ref<any>(null)

const currentManager = ref<any>(null)
const currentWechat = ref<any>(null)
const clientList = ref<any[]>([])

const managerForm = reactive({ name: '', phone: '', email: '', join_date: null as any, notes: '' })
const wechatForm = reactive({ wechat_id: '', wechat_nickname: '', status: '在用', notes: '' })
const clientForm = reactive({ client_name: '', client_wechat: '', remark: '', status: '活跃', notes: '' })

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

function getActiveClients(record: any): number {
  return (record.business_wechat_accounts || []).reduce((sum: number, acc: any) => {
    return sum + (acc.wechat_clients?.filter((c: any) => c.status === '活跃').length || 0)
  }, 0)
}

function formatDate(d: string) {
  return dayjs(d).format('YYYY-MM-DD')
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
    if (detailManager.value) {
      detailManager.value = managerList.value.find(m => m.id === detailManager.value.id) || null
    }
  } finally {
    loading.value = false
  }
}

function openDetail(record: any) {
  detailManager.value = record
  detailOpen.value = true
}

function openAddManager() {
  Object.assign(managerForm, { name: '', phone: '', email: '', join_date: null, notes: '' })
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
      join_date: managerForm.join_date ? dayjs(managerForm.join_date).format('YYYY-MM-DD') : null,
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
    detailOpen.value = false
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
  const colors = ['#2563eb', '#059669', '#dc2626', '#d97706', '#0891b2', '#be185d']
  return colors[Math.floor(Math.random() * colors.length)]
}

onMounted(load)
</script>

<style scoped>
.page-content { padding: 24px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin: 0; }
.header-actions { display: flex; gap: 10px; align-items: center; }

.loading-wrap { display: flex; justify-content: center; padding: 80px 0; }
.empty-wrap { padding: 80px 0; }

.manager-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(560px, 1fr));
  gap: 16px;
}

.manager-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
  display: flex;
  align-items: center;
  padding: 18px 20px;
  gap: 0;
  transition: box-shadow 0.2s, border-color 0.2s;
}
.manager-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  border-color: #bfdbfe;
}

.card-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 130px;
}
.avatar-lg {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 18px;
  flex-shrink: 0;
}
.card-name-block { display: flex; flex-direction: column; }
.card-name { font-size: 15px; font-weight: 700; color: #111827; }
.card-name.clickable { cursor: pointer; }
.card-name.clickable:hover { color: #2563eb; text-decoration: underline; }

.card-divider { width: 1px; height: 48px; background: #f0f0f0; margin: 0 16px; flex-shrink: 0; }

.card-stats { display: flex; align-items: center; gap: 0; min-width: 180px; }
.stat-item { display: flex; flex-direction: column; align-items: center; min-width: 55px; }
.stat-num { font-size: 20px; font-weight: 700; line-height: 1.2; }
.stat-num.blue { color: #2563eb; }
.stat-num.green { color: #059669; }
.stat-num.orange { color: #d97706; }
.stat-label { font-size: 11px; color: #9ca3af; margin-top: 2px; }
.stat-sep { width: 1px; height: 28px; background: #e5e7eb; margin: 0 10px; }

.card-meta { min-width: 160px; display: flex; flex-direction: column; gap: 6px; }
.meta-row { display: flex; align-items: center; gap: 6px; }
.meta-label { font-size: 12px; color: #9ca3af; width: 28px; flex-shrink: 0; }
.meta-val { font-size: 12px; color: #374151; }

.card-actions { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; margin-left: auto; }

.client-toolbar { margin-bottom: 12px; }

/* Drawer */
.drawer-header {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 24px 24px 20px;
  border-bottom: 1px solid #f0f0f0;
  background: #fafbfc;
}
.drawer-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 22px;
  font-weight: 700;
  flex-shrink: 0;
}
.drawer-title-block { flex: 1; }
.drawer-name { font-size: 18px; font-weight: 700; color: #111827; }
.drawer-sub { display: flex; align-items: center; gap: 8px; margin-top: 5px; }
.drawer-join { font-size: 12px; color: #9ca3af; }
.drawer-header-actions { margin-left: auto; }

.drawer-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 20px; }

.drawer-section { }
.section-title { font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #f3f4f6; }
.section-title-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; padding-bottom: 6px; border-bottom: 1px solid #f3f4f6; }

.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.info-item { display: flex; flex-direction: column; gap: 2px; }
.info-label { font-size: 11px; color: #9ca3af; }
.info-val { font-size: 13px; color: #1f2937; font-weight: 500; }

.empty-text { font-size: 13px; color: #9ca3af; padding: 8px 0; }

.wechat-list { display: flex; flex-direction: column; gap: 8px; }
.wechat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}
.witem-left { min-width: 100px; }
.witem-id { font-weight: 700; font-size: 13px; color: #1f2937; }
.witem-nick { font-size: 11px; color: #9ca3af; margin-top: 2px; }
.witem-mid { display: flex; gap: 16px; }
.witem-stat { display: flex; flex-direction: column; align-items: center; min-width: 32px; }
.wstat-num { font-size: 16px; font-weight: 700; color: #2563eb; }
.wstat-num.green { color: #059669; }
.wstat-label { font-size: 10px; color: #9ca3af; }
.witem-right { display: flex; align-items: center; gap: 4px; margin-left: auto; }

.drawer-stats-row {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: #f0f7ff;
  border-radius: 10px;
  border: 1px solid #bfdbfe;
}
.dstat-card { flex: 1; text-align: center; }
.dstat-num { font-size: 24px; font-weight: 700; line-height: 1.2; }
.dstat-num.blue { color: #2563eb; }
.dstat-num.green { color: #059669; }
.dstat-num.orange { color: #d97706; }
.dstat-label { font-size: 12px; color: #6b7280; margin-top: 4px; }
</style>
