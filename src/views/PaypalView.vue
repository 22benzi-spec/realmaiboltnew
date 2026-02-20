<template>
  <div class="page-content">
    <h1 class="page-title">PayPal / 美金库</h1>

    <a-tabs v-model:activeKey="activeTab">
      <a-tab-pane key="usd" tab="美金库">
        <div class="card-panel">
          <div class="toolbar">
            <a-button type="primary" @click="usdModalOpen = true"><PlusOutlined /> 新增批次</a-button>
          </div>
          <a-row :gutter="[12,12]" style="margin-bottom:16px">
            <a-col :span="6">
              <div class="stat-mini"><div class="stat-v">{{ totalUsd.toFixed(2) }}</div><div class="stat-l">总金额 (USD)</div></div>
            </a-col>
            <a-col :span="6">
              <div class="stat-mini"><div class="stat-v">{{ remainingUsd.toFixed(2) }}</div><div class="stat-l">剩余 (USD)</div></div>
            </a-col>
          </a-row>
          <a-table :columns="usdColumns" :data-source="usdBatches" :loading="usdLoading" row-key="id" size="middle">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'cost_cny'">¥{{ Number(record.cost_cny).toFixed(2) }}</template>
              <template v-if="column.key === 'action'">
                <a-popconfirm title="确定删除?" @confirm="deleteUsdBatch(record.id)">
                  <a-button type="link" size="small" danger>删除</a-button>
                </a-popconfirm>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>

      <a-tab-pane key="accounts" tab="PayPal账号">
        <div class="card-panel">
          <div class="toolbar">
            <a-input-search v-model:value="accountSearch" placeholder="搜索邮箱/别名" style="width:220px" allow-clear @search="loadAccounts" />
            <a-button type="primary" @click="accountModalOpen = true"><PlusOutlined /> 添加账号</a-button>
          </div>
          <a-table :columns="accountColumns" :data-source="accounts" :loading="accountsLoading" row-key="id" size="middle">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'status'">
                <a-tag :color="accountStatusColor[record.status] || 'default'">{{ record.status }}</a-tag>
              </template>
              <template v-if="column.key === 'risk_level'">
                <a-tag :color="riskColor[record.risk_level] || 'default'">{{ record.risk_level }}</a-tag>
              </template>
              <template v-if="column.key === 'action'">
                <a-space>
                  <a-button type="link" size="small" @click="editAccount(record)">编辑</a-button>
                  <a-popconfirm title="确定删除?" @confirm="deleteAccount(record.id)">
                    <a-button type="link" size="small" danger>删除</a-button>
                  </a-popconfirm>
                </a-space>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>

      <a-tab-pane key="refunds" tab="退款记录">
        <div class="card-panel">
          <a-table :columns="refundColumns" :data-source="refunds" :loading="refundsLoading" row-key="id" size="small">
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'status'">
                <a-tag :color="refundStatusColor[record.status] || 'default'">{{ record.status }}</a-tag>
              </template>
              <template v-if="column.key === 'cost_cny'">¥{{ Number(record.cost_cny).toFixed(2) }}</template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>
    </a-tabs>

    <a-modal v-model:open="usdModalOpen" title="新增美金批次" @ok="handleAddUsd" :confirm-loading="submittingUsd">
      <a-form layout="vertical">
        <a-form-item label="来源"><a-input v-model:value="usdForm.source" placeholder="如：汇款/换汇" /></a-form-item>
        <a-form-item label="金额(USD)"><a-input-number v-model:value="usdForm.amount_usd" :min="0" style="width:100%" /></a-form-item>
        <a-form-item label="汇率"><a-input-number v-model:value="usdForm.exchange_rate" :min="1" style="width:100%" /></a-form-item>
        <a-form-item label="备注"><a-textarea v-model:value="usdForm.notes" :rows="2" /></a-form-item>
      </a-form>
    </a-modal>

    <a-modal v-model:open="accountModalOpen" :title="editingAccountId ? '编辑PayPal账号' : '添加PayPal账号'" @ok="handleSaveAccount" :confirm-loading="submittingAccount">
      <a-form layout="vertical">
        <a-form-item label="邮箱"><a-input v-model:value="accountForm.email" /></a-form-item>
        <a-form-item label="账号别名"><a-input v-model:value="accountForm.account_alias" /></a-form-item>
        <a-form-item label="持有人"><a-input v-model:value="accountForm.owner_name" /></a-form-item>
        <a-form-item label="风险等级">
          <a-select v-model:value="accountForm.risk_level">
            <a-select-option value="低风险">低风险</a-select-option>
            <a-select-option value="中风险">中风险</a-select-option>
            <a-select-option value="高风险">高风险</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="状态">
          <a-select v-model:value="accountForm.status">
            <a-select-option value="正常">正常</a-select-option>
            <a-select-option value="受限">受限</a-select-option>
            <a-select-option value="已关闭">已关闭</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="备注"><a-textarea v-model:value="accountForm.notes" :rows="2" /></a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

const activeTab = ref('usd')
const usdLoading = ref(false)
const accountsLoading = ref(false)
const refundsLoading = ref(false)
const usdBatches = ref<any[]>([])
const accounts = ref<any[]>([])
const refunds = ref<any[]>([])
const accountSearch = ref('')
const usdModalOpen = ref(false)
const accountModalOpen = ref(false)
const submittingUsd = ref(false)
const submittingAccount = ref(false)
const editingAccountId = ref('')

const usdForm = reactive({ source: '', amount_usd: 0, exchange_rate: 7.25, notes: '' })
const accountForm = reactive({ email: '', account_alias: '', owner_name: '', risk_level: '低风险', status: '正常', notes: '' })

const accountStatusColor: Record<string, string> = { '正常': 'green', '受限': 'orange', '已关闭': 'red' }
const riskColor: Record<string, string> = { '低风险': 'green', '中风险': 'orange', '高风险': 'red' }
const refundStatusColor: Record<string, string> = { '待退款': 'orange', '已退款': 'green', '失败': 'red' }

const totalUsd = computed(() => usdBatches.value.reduce((s, b) => s + Number(b.amount_usd || 0), 0))
const remainingUsd = computed(() => usdBatches.value.reduce((s, b) => s + Number(b.remaining_usd || 0), 0))

const usdColumns = [
  { title: '批次号', dataIndex: 'batch_number', key: 'batch_number' },
  { title: '来源', dataIndex: 'source', key: 'source' },
  { title: '金额(USD)', dataIndex: 'amount_usd', key: 'amount_usd', width: 100 },
  { title: '剩余(USD)', dataIndex: 'remaining_usd', key: 'remaining_usd', width: 100 },
  { title: '汇率', dataIndex: 'exchange_rate', key: 'exchange_rate', width: 80 },
  { title: '成本(CNY)', key: 'cost_cny', width: 100 },
  { title: '采购日期', dataIndex: 'purchase_date', key: 'purchase_date', width: 110 },
  { title: '操作', key: 'action', width: 80 },
]

const accountColumns = [
  { title: '邮箱', dataIndex: 'email', key: 'email' },
  { title: '别名', dataIndex: 'account_alias', key: 'account_alias', width: 110 },
  { title: '持有人', dataIndex: 'owner_name', key: 'owner_name', width: 100 },
  { title: '风险', key: 'risk_level', width: 90 },
  { title: '状态', key: 'status', width: 80 },
  { title: '累计退款(USD)', dataIndex: 'total_refunded_usd', key: 'total_refunded_usd', width: 120 },
  { title: '操作', key: 'action', width: 100 },
]

const refundColumns = [
  { title: '买手', dataIndex: 'buyer_name', key: 'buyer_name' },
  { title: '买手PayPal', dataIndex: 'buyer_paypal_email', key: 'buyer_paypal_email' },
  { title: '金额(USD)', dataIndex: 'amount_usd', key: 'amount_usd', width: 100 },
  { title: '汇率', dataIndex: 'exchange_rate', key: 'exchange_rate', width: 80 },
  { title: '成本(CNY)', key: 'cost_cny', width: 100 },
  { title: '状态', key: 'status', width: 80 },
  { title: '退款日期', dataIndex: 'refund_date', key: 'refund_date', width: 110 },
]

async function loadUsd() {
  usdLoading.value = true
  const { data } = await supabase.from('usd_fund_batches').select('*').order('created_at', { ascending: false })
  usdBatches.value = data || []
  usdLoading.value = false
}

async function loadAccounts() {
  accountsLoading.value = true
  let query = supabase.from('paypal_accounts').select('*').order('created_at', { ascending: false })
  if (accountSearch.value) query = query.or(`email.ilike.%${accountSearch.value}%,account_alias.ilike.%${accountSearch.value}%`)
  const { data } = await query
  accounts.value = data || []
  accountsLoading.value = false
}

async function loadRefunds() {
  refundsLoading.value = true
  const { data } = await supabase.from('paypal_refunds').select('*').order('created_at', { ascending: false }).limit(100)
  refunds.value = data || []
  refundsLoading.value = false
}

async function handleAddUsd() {
  submittingUsd.value = true
  try {
    const batchNum = 'USD-' + Date.now()
    const { error } = await supabase.from('usd_fund_batches').insert([{
      batch_number: batchNum,
      source: usdForm.source,
      amount_usd: usdForm.amount_usd,
      remaining_usd: usdForm.amount_usd,
      exchange_rate: usdForm.exchange_rate,
      cost_cny: usdForm.amount_usd * usdForm.exchange_rate,
      purchase_date: dayjs().format('YYYY-MM-DD'),
      notes: usdForm.notes,
    }])
    if (error) throw error
    message.success('批次创建成功')
    usdModalOpen.value = false
    Object.assign(usdForm, { source: '', amount_usd: 0, exchange_rate: 7.25, notes: '' })
    loadUsd()
  } catch (e: any) {
    message.error('创建失败：' + e.message)
  } finally {
    submittingUsd.value = false
  }
}

function editAccount(record: any) {
  editingAccountId.value = record.id
  Object.assign(accountForm, record)
  accountModalOpen.value = true
}

async function handleSaveAccount() {
  submittingAccount.value = true
  try {
    if (editingAccountId.value) {
      const { error } = await supabase.from('paypal_accounts').update(accountForm).eq('id', editingAccountId.value)
      if (error) throw error
      message.success('更新成功')
    } else {
      const { error } = await supabase.from('paypal_accounts').insert([accountForm])
      if (error) throw error
      message.success('添加成功')
    }
    accountModalOpen.value = false
    editingAccountId.value = ''
    loadAccounts()
  } catch (e: any) {
    message.error('操作失败：' + e.message)
  } finally {
    submittingAccount.value = false
  }
}

async function deleteAccount(id: string) {
  const { error } = await supabase.from('paypal_accounts').delete().eq('id', id)
  if (error) { message.error('删除失败'); return }
  message.success('删除成功')
  loadAccounts()
}

async function deleteUsdBatch(id: string) {
  const { error } = await supabase.from('usd_fund_batches').delete().eq('id', id)
  if (error) { message.error('删除失败'); return }
  message.success('删除成功')
  loadUsd()
}

onMounted(() => { loadUsd(); loadAccounts(); loadRefunds() })
</script>

<style scoped>
.page-content { padding: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }
.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; }
.stat-mini { background: #f8fafc; border-radius: 10px; padding: 16px; text-align: center; border: 1px solid #f0f0f0; }
.stat-v { font-size: 22px; font-weight: 700; color: #1a1a2e; }
.stat-l { font-size: 12px; color: #6b7280; margin-top: 4px; }
</style>
