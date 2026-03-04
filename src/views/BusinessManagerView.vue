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
        <div class="card-top">
          <div class="card-left">
            <div class="avatar-lg" :style="{ background: record.avatar_color || '#2563eb' }">
              {{ record.name.charAt(0) }}
            </div>
            <div class="card-name-block">
              <span class="card-name clickable" @click="openDetail(record)">{{ record.name }}</span>
              <a-tag :color="record.status === '在职' ? 'green' : 'default'" style="margin-top:4px">{{ record.status }}</a-tag>
            </div>
          </div>
          <div class="card-actions">
            <a-button type="link" size="small" @click="openDetail(record)">查看详情</a-button>
            <a-button type="link" size="small" @click="openAddWechat(record)"><PlusOutlined /> 添加微信</a-button>
            <a-button type="link" size="small" danger @click="confirmDeleteManager(record)"><DeleteOutlined /></a-button>
          </div>
        </div>

        <div class="card-bottom">
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

          <div class="card-divider-v" />

          <div class="card-meta">
            <div class="meta-row"><span class="meta-label">手机</span><span class="meta-val">{{ record.phone || '—' }}</span></div>
            <div class="meta-row"><span class="meta-label">入职</span><span class="meta-val">{{ record.join_date ? formatDate(record.join_date) : '—' }}</span></div>
          </div>
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

    <!-- 微信号客户管理抽屉 -->
    <a-drawer
      v-model:open="clientModalOpen"
      :title="null"
      placement="right"
      width="680"
      :body-style="{ padding: 0 }"
    >
      <template v-if="currentWechat">
        <div class="wechat-drawer-header">
          <div class="wechat-drawer-icon">微</div>
          <div class="wechat-drawer-title-block">
            <div class="wechat-drawer-id">{{ currentWechat.wechat_id }}</div>
            <div class="wechat-drawer-nick">{{ currentWechat.wechat_nickname || '未设置昵称' }}</div>
          </div>
          <div class="wechat-drawer-tags">
            <a-tag :color="currentWechat.status === '在用' ? 'green' : currentWechat.status === '停用' ? 'orange' : 'red'">{{ currentWechat.status }}</a-tag>
          </div>
        </div>

        <!-- 汇总统计行 -->
        <div class="wechat-summary-row">
          <div class="wsum-item">
            <div class="wsum-num blue">{{ clientList.length }}</div>
            <div class="wsum-lbl">管理客户</div>
          </div>
          <div class="wsum-sep"></div>
          <div class="wsum-item">
            <div class="wsum-num green">{{ clientList.filter(c => c.status === '活跃').length }}</div>
            <div class="wsum-lbl">活跃客户</div>
          </div>
          <div class="wsum-sep"></div>
          <div class="wsum-item">
            <div class="wsum-num teal">{{ clientOrderStats.total_order_count }}</div>
            <div class="wsum-lbl">累计下单次</div>
          </div>
          <div class="wsum-sep"></div>
          <div class="wsum-item">
            <div class="wsum-num orange">{{ clientOrderStats.total_order_quantity }}</div>
            <div class="wsum-lbl">累计单量</div>
          </div>
          <div class="wsum-sep"></div>
          <div class="wsum-item">
            <div class="wsum-num green">¥{{ formatMoney(clientOrderStats.total_order_amount) }}</div>
            <div class="wsum-lbl">累计金额</div>
          </div>
        </div>

        <div class="wechat-drawer-body">
          <div class="wechat-drawer-toolbar">
            <span class="client-count-tip">共 {{ clientList.length }} 位客户</span>
            <a-button type="primary" size="small" @click="openAddClient"><PlusOutlined /> 添加客户</a-button>
          </div>

          <div v-if="clientLoading" style="text-align:center;padding:32px"><a-spin /></div>
          <div v-else-if="!clientList.length" class="wechat-empty">暂无客户数据</div>
          <div v-else class="client-card-list">
            <div v-for="c in clientList" :key="c.id" class="client-card">
              <div class="client-card-top">
                <div class="client-avatar">{{ c.client_name.charAt(0) }}</div>
                <div class="client-card-info">
                  <div class="client-card-name-row">
                    <span class="client-card-name">{{ c.client_name }}</span>
                    <a-tag :color="c.status === '活跃' ? 'green' : c.status === '沉默' ? 'orange' : 'default'" style="margin:0;font-size:11px">{{ c.status }}</a-tag>
                    <a-tag
                      :color="c.feedback_type === '群聊' ? 'blue' : 'default'"
                      style="margin:0;font-size:11px"
                    >{{ c.feedback_type || '私发' }}</a-tag>
                  </div>
                  <div class="client-card-meta">
                    <span v-if="c.company_name" class="client-meta-company">{{ c.company_name }}</span>
                    <span v-if="c.client_wechat" class="client-meta-wechat">微信: {{ c.client_wechat }}</span>
                    <span v-if="c.remark" class="client-meta-remark">{{ c.remark }}</span>
                  </div>
                </div>
                <div class="client-card-actions">
                  <a-button type="link" size="small" danger @click="confirmDeleteClient(c)"><DeleteOutlined /></a-button>
                </div>
              </div>

              <!-- 下单统计 -->
              <div class="client-order-stats">
                <div class="cos-item">
                  <span class="cos-num blue">{{ clientOrderStatsMap[c.client_name]?.order_count || 0 }}</span>
                  <span class="cos-lbl">下单次数</span>
                </div>
                <div class="cos-sep"></div>
                <div class="cos-item">
                  <span class="cos-num teal">{{ clientOrderStatsMap[c.client_name]?.order_quantity || 0 }}</span>
                  <span class="cos-lbl">下单单量</span>
                </div>
                <div class="cos-sep"></div>
                <div class="cos-item">
                  <span class="cos-num green">¥{{ formatMoney(clientOrderStatsMap[c.client_name]?.order_amount) }}</span>
                  <span class="cos-lbl">下单金额</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </a-drawer>

    <!-- 添加客户 Modal -->
    <a-modal v-model:open="addClientModalOpen" title="添加客户" @ok="handleAddClient" :confirm-loading="submitting" ok-text="确定" cancel-text="取消" width="520px">
      <a-form layout="vertical" style="margin-top:8px">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="客户名称" required><a-input v-model:value="clientForm.client_name" placeholder="请输入客户名称" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="客户微信号"><a-input v-model:value="clientForm.client_wechat" placeholder="请输入客户微信号" /></a-form-item>
          </a-col>
        </a-row>
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="归属公司"><a-input v-model:value="clientForm.company_name" placeholder="请输入归属公司名称" /></a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="反馈方式">
              <a-select v-model:value="clientForm.feedback_type">
                <a-select-option value="私发">私发</a-select-option>
                <a-select-option value="群聊">群聊</a-select-option>
              </a-select>
            </a-form-item>
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
const clientForm = reactive({ client_name: '', client_wechat: '', company_name: '', feedback_type: '私发', remark: '', status: '活跃', notes: '' })

const clientOrderStatsMap = ref<Record<string, { order_count: number; order_quantity: number; order_amount: number }>>({})
const clientOrderStats = ref({ total_order_count: 0, total_order_quantity: 0, total_order_amount: 0 })

function formatMoney(n: any): string {
  const num = Number(n || 0)
  return num.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

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
  clientOrderStatsMap.value = {}
  clientOrderStats.value = { total_order_count: 0, total_order_quantity: 0, total_order_amount: 0 }
  try {
    const { data, error } = await supabase
      .from('wechat_clients')
      .select('*')
      .eq('wechat_account_id', wechatAccountId)
      .order('created_at', { ascending: false })
    if (error) throw error
    clientList.value = data || []

    if (clientList.value.length) {
      const names = clientList.value.map((c: any) => c.client_name).filter(Boolean)
      const { data: contactData } = await supabase
        .from('client_contacts')
        .select('name, client_id')
        .in('name', names)

      const clientIdToName: Record<string, string> = {}
      for (const ct of contactData || []) {
        if (ct.client_id) clientIdToName[ct.client_id] = ct.name
      }

      const clientIds = Object.keys(clientIdToName)
      if (clientIds.length) {
        const { data: orderData } = await supabase
          .from('erp_orders')
          .select('customer_id_str, total_orders, total_amount')
          .in('customer_id_str', clientIds)

        const statsMap: Record<string, { order_count: number; order_quantity: number; order_amount: number }> = {}
        for (const o of orderData || []) {
          const name = clientIdToName[o.customer_id_str]
          if (!name) continue
          if (!statsMap[name]) statsMap[name] = { order_count: 0, order_quantity: 0, order_amount: 0 }
          statsMap[name].order_count += 1
          statsMap[name].order_quantity += Number(o.total_orders || 0)
          statsMap[name].order_amount += Number(o.total_amount || 0)
        }
        clientOrderStatsMap.value = statsMap

        const totals = Object.values(statsMap)
        clientOrderStats.value = {
          total_order_count: totals.reduce((s, v) => s + v.order_count, 0),
          total_order_quantity: totals.reduce((s, v) => s + v.order_quantity, 0),
          total_order_amount: totals.reduce((s, v) => s + v.order_amount, 0),
        }
      }
    }
  } finally {
    clientLoading.value = false
  }
}

function openAddClient() {
  Object.assign(clientForm, { client_name: '', client_wechat: '', company_name: '', feedback_type: '私发', remark: '', status: '活跃', notes: '' })
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
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 16px;
}

.manager-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
  display: flex;
  flex-direction: column;
  padding: 16px 18px;
  gap: 12px;
  transition: box-shadow 0.2s, border-color 0.2s;
  overflow: hidden;
}
.manager-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  border-color: #bfdbfe;
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.card-bottom {
  display: flex;
  align-items: center;
  gap: 0;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
}

.card-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex: 1;
}
.avatar-lg {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 17px;
  flex-shrink: 0;
}
.card-name-block { display: flex; flex-direction: column; min-width: 0; }
.card-name { font-size: 15px; font-weight: 700; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.card-name.clickable { cursor: pointer; }
.card-name.clickable:hover { color: #2563eb; text-decoration: underline; }

.card-divider-v { width: 1px; height: 40px; background: #f0f0f0; margin: 0 14px; flex-shrink: 0; }

.card-stats { display: flex; align-items: center; flex: 1; }
.stat-item { display: flex; flex-direction: column; align-items: center; flex: 1; }
.stat-num { font-size: 18px; font-weight: 700; line-height: 1.2; }
.stat-num.blue { color: #2563eb; }
.stat-num.green { color: #059669; }
.stat-num.orange { color: #d97706; }
.stat-label { font-size: 11px; color: #9ca3af; margin-top: 2px; white-space: nowrap; }
.stat-sep { width: 1px; height: 28px; background: #e5e7eb; margin: 0 6px; flex-shrink: 0; }

.card-meta { display: flex; flex-direction: column; gap: 5px; flex-shrink: 0; }
.meta-row { display: flex; align-items: center; gap: 5px; }
.meta-label { font-size: 12px; color: #9ca3af; width: 28px; flex-shrink: 0; }
.meta-val { font-size: 12px; color: #374151; white-space: nowrap; }

.card-actions { display: flex; align-items: center; gap: 0; flex-shrink: 0; }

.client-toolbar { margin-bottom: 12px; }

/* 微信号客户抽屉 */
.wechat-drawer-header {
  display: flex; align-items: center; gap: 14px;
  padding: 20px 24px 16px; border-bottom: 1px solid #f0f0f0;
  background: #f8fafc;
}
.wechat-drawer-icon {
  width: 44px; height: 44px; border-radius: 10px;
  background: #07c160; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; font-weight: 700; flex-shrink: 0;
}
.wechat-drawer-title-block { flex: 1; }
.wechat-drawer-id { font-size: 16px; font-weight: 700; color: #111827; }
.wechat-drawer-nick { font-size: 12px; color: #9ca3af; margin-top: 2px; }
.wechat-drawer-tags { flex-shrink: 0; }

.wechat-summary-row {
  display: flex; align-items: center;
  padding: 12px 24px; background: #fff;
  border-bottom: 1px solid #f0f0f0;
  flex-wrap: wrap; gap: 0;
}
.wsum-item { display: flex; flex-direction: column; align-items: center; flex: 1; min-width: 70px; }
.wsum-num { font-size: 18px; font-weight: 700; line-height: 1.2; }
.wsum-num.blue { color: #2563eb; }
.wsum-num.green { color: #059669; }
.wsum-num.teal { color: #0891b2; }
.wsum-num.orange { color: #d97706; }
.wsum-lbl { font-size: 10px; color: #9ca3af; margin-top: 2px; }
.wsum-sep { width: 1px; height: 30px; background: #e5e7eb; flex-shrink: 0; }

.wechat-drawer-body { padding: 16px 24px; }
.wechat-drawer-toolbar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 12px;
}
.client-count-tip { font-size: 12px; color: #9ca3af; }
.wechat-empty { text-align: center; padding: 32px; color: #9ca3af; font-size: 13px; }

.client-card-list { display: flex; flex-direction: column; gap: 10px; }
.client-card {
  border: 1px solid #e5e7eb; border-radius: 10px;
  background: #fff; overflow: hidden;
  transition: box-shadow 0.15s;
}
.client-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.07); }

.client-card-top {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px;
}
.client-avatar {
  width: 38px; height: 38px; border-radius: 50%;
  background: #2563eb; color: #fff;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px; font-weight: 700; flex-shrink: 0;
}
.client-card-info { flex: 1; min-width: 0; }
.client-card-name-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-bottom: 4px; }
.client-card-name { font-size: 14px; font-weight: 700; color: #111827; }
.client-card-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.client-meta-company { font-size: 12px; color: #374151; font-weight: 500; }
.client-meta-wechat { font-size: 12px; color: #6b7280; }
.client-meta-remark {
  font-size: 11px; color: #9ca3af;
  padding: 1px 6px; background: #f3f4f6; border-radius: 4px;
}
.client-card-actions { flex-shrink: 0; }

.client-order-stats {
  display: flex; align-items: center;
  padding: 8px 14px; background: #f8fafc;
  border-top: 1px solid #f0f0f0;
}
.cos-item { display: flex; flex-direction: column; align-items: center; flex: 1; }
.cos-num { font-size: 15px; font-weight: 700; line-height: 1.2; }
.cos-num.blue { color: #2563eb; }
.cos-num.teal { color: #0891b2; }
.cos-num.green { color: #059669; }
.cos-lbl { font-size: 10px; color: #9ca3af; margin-top: 2px; }
.cos-sep { width: 1px; height: 24px; background: #e5e7eb; flex-shrink: 0; margin: 0 4px; }

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
