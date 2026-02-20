<template>
  <div class="page-content">
    <h1 class="page-title">退款审批</h1>

    <div class="card-panel">
      <div class="toolbar">
        <a-select v-model:value="filterStatus" style="width:140px" @change="load" allow-clear placeholder="状态筛选">
          <a-select-option value="待处理">待处理</a-select-option>
          <a-select-option value="已处理">已处理</a-select-option>
          <a-select-option value="已取消">已取消</a-select-option>
        </a-select>
        <a-select v-model:value="filterMethod" style="width:130px" @change="load" allow-clear placeholder="退款方式">
          <a-select-option value="礼品卡">礼品卡</a-select-option>
          <a-select-option value="PayPal">PayPal</a-select-option>
        </a-select>
        <a-button @click="load"><ReloadOutlined /> 刷新</a-button>
      </div>

      <a-table
        :columns="columns"
        :data-source="requests"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        size="middle"
        :scroll="{ x: 1100 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="statusColor[record.status] || 'default'">{{ record.status }}</a-tag>
          </template>
          <template v-if="column.key === 'refund_method'">
            <a-tag :color="record.refund_method === '礼品卡' ? 'gold' : 'blue'">{{ record.refund_method }}</a-tag>
          </template>
          <template v-if="column.key === 'refund_amount'">
            <span class="amount">{{ record.refund_amount }} USD</span>
          </template>
          <template v-if="column.key === 'action'">
            <a-space v-if="record.status === '待处理'">
              <a-button type="primary" size="small" @click="openProcess(record)">处理</a-button>
              <a-popconfirm title="确定取消此退款申请?" @confirm="cancelRequest(record.id)">
                <a-button type="link" size="small" danger>取消</a-button>
              </a-popconfirm>
            </a-space>
            <span v-else class="text-gray">--</span>
          </template>
        </template>
      </a-table>
    </div>

    <a-drawer v-model:open="processOpen" :title="`处理退款 - ${currentRequest?.buyer_name}`" width="560" placement="right">
      <template v-if="currentRequest">
        <a-descriptions :column="1" bordered size="small" style="margin-bottom:16px">
          <a-descriptions-item label="买手">{{ currentRequest.buyer_name }}</a-descriptions-item>
          <a-descriptions-item label="PayPal邮箱">{{ currentRequest.buyer_paypal_email }}</a-descriptions-item>
          <a-descriptions-item label="退款金额">{{ currentRequest.refund_amount }} USD</a-descriptions-item>
          <a-descriptions-item label="退款方式">{{ currentRequest.refund_method }}</a-descriptions-item>
        </a-descriptions>

        <a-form layout="vertical">
          <template v-if="currentRequest.refund_method === 'PayPal'">
            <a-form-item label="使用PayPal账号">
              <a-select v-model:value="processForm.paypal_account_id" style="width:100%" placeholder="选择PayPal账号">
                <a-select-option v-for="acc in paypalAccounts" :key="acc.id" :value="acc.id">
                  {{ acc.email }} {{ acc.account_alias ? `(${acc.account_alias})` : '' }}
                </a-select-option>
              </a-select>
            </a-form-item>
          </template>
          <template v-else>
            <a-form-item label="使用礼品卡">
              <a-select v-model:value="processForm.gift_card_id" style="width:100%" placeholder="选择礼品卡">
                <a-select-option v-for="gc in availableGiftCards" :key="gc.id" :value="gc.id">
                  {{ gc.card_number }} - {{ gc.face_value_usd }} USD
                </a-select-option>
              </a-select>
            </a-form-item>
          </template>
          <a-form-item label="财务备注">
            <a-textarea v-model:value="processForm.finance_notes" :rows="2" />
          </a-form-item>
        </a-form>

        <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:16px">
          <a-button @click="processOpen = false">取消</a-button>
          <a-button type="primary" @click="handleProcess" :loading="processing">确认处理</a-button>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

const loading = ref(false)
const requests = ref<any[]>([])
const filterStatus = ref('待处理')
const filterMethod = ref('')
const processOpen = ref(false)
const currentRequest = ref<any>(null)
const processing = ref(false)
const paypalAccounts = ref<any[]>([])
const availableGiftCards = ref<any[]>([])
const pagination = ref({ current: 1, pageSize: 20, total: 0 })

const processForm = reactive({ paypal_account_id: '', gift_card_id: '', finance_notes: '' })

const statusColor: Record<string, string> = { '待处理': 'orange', '已处理': 'green', '已取消': 'red' }

const columns = [
  { title: '买手', dataIndex: 'buyer_name', key: 'buyer_name', width: 120 },
  { title: '买手PayPal', dataIndex: 'buyer_paypal_email', key: 'buyer_paypal_email' },
  { title: '退款金额', key: 'refund_amount', width: 110 },
  { title: '退款方式', key: 'refund_method', width: 100 },
  { title: '状态', key: 'status', width: 90 },
  { title: '财务备注', dataIndex: 'finance_notes', key: 'finance_notes' },
  { title: '处理时间', dataIndex: 'handled_at', key: 'handled_at', width: 130, customRender: ({ text }: any) => text ? dayjs(text).format('MM-DD HH:mm') : '-' },
  { title: '申请时间', dataIndex: 'created_at', key: 'created_at', width: 130, customRender: ({ text }: any) => text ? dayjs(text).format('MM-DD HH:mm') : '' },
  { title: '操作', key: 'action', width: 120, fixed: 'right' },
]

async function load() {
  loading.value = true
  try {
    let query = supabase.from('refund_requests').select('*', { count: 'exact' }).order('created_at', { ascending: false })
    if (filterStatus.value) query = query.eq('status', filterStatus.value)
    if (filterMethod.value) query = query.eq('refund_method', filterMethod.value)
    const from = (pagination.value.current - 1) * pagination.value.pageSize
    query = query.range(from, from + pagination.value.pageSize - 1)
    const { data, count, error } = await query
    if (error) throw error
    requests.value = data || []
    pagination.value.total = count || 0
  } finally {
    loading.value = false
  }
}

async function openProcess(record: any) {
  currentRequest.value = record
  Object.assign(processForm, { paypal_account_id: '', gift_card_id: '', finance_notes: '' })

  if (record.refund_method === 'PayPal') {
    const { data } = await supabase.from('paypal_accounts').select('id, email, account_alias').eq('status', '正常')
    paypalAccounts.value = data || []
  } else {
    const { data } = await supabase.from('gift_cards').select('id, card_number, card_code, face_value_usd').eq('status', '未使用').lte('face_value_usd', record.refund_amount).order('face_value_usd', { ascending: false })
    availableGiftCards.value = data || []
  }
  processOpen.value = true
}

async function handleProcess() {
  if (!currentRequest.value) return
  processing.value = true
  try {
    const update: any = { status: '已处理', finance_notes: processForm.finance_notes, handled_at: new Date().toISOString() }

    if (currentRequest.value.refund_method === 'PayPal' && processForm.paypal_account_id) {
      const acc = paypalAccounts.value.find(a => a.id === processForm.paypal_account_id)
      update.assigned_paypal_account_id = processForm.paypal_account_id
      update.assigned_paypal_email = acc?.email
    } else if (processForm.gift_card_id) {
      const gc = availableGiftCards.value.find(g => g.id === processForm.gift_card_id)
      update.assigned_gift_card_id = processForm.gift_card_id
      update.assigned_gift_card_number = gc?.card_number
      update.assigned_gift_card_code = gc?.card_code
      await supabase.from('gift_cards').update({ status: '已使用' }).eq('id', processForm.gift_card_id)
    }

    const { error } = await supabase.from('refund_requests').update(update).eq('id', currentRequest.value.id)
    if (error) throw error
    message.success('退款已处理')
    processOpen.value = false
    load()
  } catch (e: any) {
    message.error('操作失败：' + e.message)
  } finally {
    processing.value = false
  }
}

async function cancelRequest(id: string) {
  const { error } = await supabase.from('refund_requests').update({ status: '已取消' }).eq('id', id)
  if (error) { message.error('操作失败'); return }
  message.success('已取消')
  load()
}

function handleTableChange(pag: any) {
  pagination.value.current = pag.current
  pagination.value.pageSize = pag.pageSize
  load()
}

onMounted(load)
</script>

<style scoped>
.page-content { padding: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }
.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; }
.amount { font-weight: 600; color: #dc2626; }
.text-gray { color: #9ca3af; font-size: 12px; }
</style>
