<template>
  <div class="page-content">
    <h1 class="page-title">退款审批</h1>

    <div class="card-panel">
      <div class="toolbar">
        <a-select v-model:value="filterStatus" style="width:120px" @change="load" allow-clear placeholder="全部状态">
          <a-select-option value="待处理">待处理</a-select-option>
          <a-select-option value="已处理">已处理</a-select-option>
          <a-select-option value="已取消">已取消</a-select-option>
        </a-select>
        <a-select v-model:value="filterMethod" style="width:110px" @change="load" allow-clear placeholder="退款渠道">
          <a-select-option value="礼品卡">礼品卡</a-select-option>
          <a-select-option value="PayPal">PayPal</a-select-option>
        </a-select>
        <a-input-search v-model:value="filterSearch" placeholder="搜索买手/订单号/产品..." style="width:240px" @search="load" allow-clear />
        <a-button @click="load"><ReloadOutlined /> 刷新</a-button>
        <span class="total-hint">{{ pagination.total }} 条</span>
      </div>

      <a-table
        :columns="columns"
        :data-source="requests"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        size="middle"
        :scroll="{ x: 1200 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'info'">
            <div class="cell-info">
              <div class="cell-subno">{{ record.sub_order_number }}</div>
              <div class="cell-product">{{ record.product_name }}</div>
              <div class="cell-meta">{{ record.asin }} · {{ record.store_name }}</div>
            </div>
          </template>
          <template v-if="column.key === 'buyer'">
            <div>{{ record.buyer_name }}</div>
            <div v-if="record.buyer_paypal_email" class="cell-email">{{ record.buyer_paypal_email }}</div>
          </template>
          <template v-if="column.key === 'refund_method'">
            <a-tag :color="record.refund_method === '礼品卡' ? 'gold' : 'blue'">{{ record.refund_method }}</a-tag>
            <div v-if="record.refund_sequence" class="cell-seq">{{ record.refund_sequence }}</div>
          </template>
          <template v-if="column.key === 'refund_amount'">
            <span class="amount-usd">${{ Number(record.refund_amount_usd || 0).toFixed(2) }}</span>
            <div class="cell-product-price">产品售价 ${{ Number(record.product_price || 0).toFixed(2) }}</div>
          </template>
          <template v-if="column.key === 'status'">
            <a-tag :color="statusColor[record.status] || 'default'">{{ record.status }}</a-tag>
          </template>
          <template v-if="column.key === 'result'">
            <div v-if="record.status === '已处理'">
              <template v-if="record.refund_method === 'PayPal'">
                <div class="result-paypal">
                  <div class="result-acc">{{ record.assigned_paypal_email }}</div>
                  <a v-if="record.paypal_receipt_screenshot" :href="record.paypal_receipt_screenshot" target="_blank" class="result-screenshot-link">查看截图</a>
                </div>
              </template>
              <template v-else>
                <div class="result-giftcard">
                  <div class="result-acc">面额 ${{ Number(record.gift_card_face_value_usd || 0).toFixed(2) }}</div>
                  <div class="result-code">{{ record.assigned_gift_card_code }}</div>
                </div>
              </template>
            </div>
            <span v-else class="text-gray">—</span>
          </template>
          <template v-if="column.key === 'action'">
            <a-space v-if="record.status === '待处理'">
              <a-button type="primary" size="small" @click="openProcess(record)">处理</a-button>
              <a-popconfirm title="确定取消此退款申请?" @confirm="cancelRequest(record.id)">
                <a-button type="link" size="small" danger>取消</a-button>
              </a-popconfirm>
            </a-space>
            <a v-else-if="record.status === '已处理'" class="re-edit-link" @click="openProcess(record)">查看详情</a>
            <span v-else class="text-gray">—</span>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 处理弹窗 -->
    <a-drawer
      v-model:open="processOpen"
      :title="currentRequest?.status === '已处理' ? '退款详情' : `处理退款申请`"
      width="600"
      placement="right"
      destroy-on-close
    >
      <template v-if="currentRequest">
        <!-- 申请信息 -->
        <div class="drawer-section">
          <div class="drawer-section-title">申请信息</div>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">子订单号</span>
              <span class="detail-val mono">{{ currentRequest.sub_order_number }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">买手</span>
              <span class="detail-val">{{ currentRequest.buyer_name }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">退款渠道</span>
              <a-tag :color="currentRequest.refund_method === '礼品卡' ? 'gold' : 'blue'">{{ currentRequest.refund_method }}</a-tag>
            </div>
            <div class="detail-item">
              <span class="detail-label">退款时序</span>
              <span class="detail-val">{{ currentRequest.refund_sequence }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">申请金额</span>
              <span class="detail-val amount-usd-lg">${{ Number(currentRequest.refund_amount_usd || 0).toFixed(2) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">产品售价</span>
              <span class="detail-val">${{ Number(currentRequest.product_price || 0).toFixed(2) }}</span>
            </div>
            <div v-if="currentRequest.buyer_paypal_email" class="detail-item full">
              <span class="detail-label">买手PayPal</span>
              <span class="detail-val mono">{{ currentRequest.buyer_paypal_email }}</span>
            </div>
            <div class="detail-item full">
              <span class="detail-label">产品</span>
              <span class="detail-val">{{ currentRequest.product_name }} ({{ currentRequest.asin }})</span>
            </div>
            <div v-if="currentRequest.notes" class="detail-item full">
              <span class="detail-label">业务员备注</span>
              <span class="detail-val">{{ currentRequest.notes }}</span>
            </div>
          </div>
        </div>

        <!-- 财务处理区 -->
        <div v-if="currentRequest.status === '待处理'" class="drawer-section">
          <div class="drawer-section-title">财务处理</div>
          <a-form layout="vertical">

            <!-- PayPal 处理 -->
            <template v-if="currentRequest.refund_method === 'PayPal'">
              <a-form-item label="使用公司 PayPal 账号打款">
                <a-select v-model:value="processForm.paypal_account_id" style="width:100%" placeholder="选择公司PayPal账号" show-search option-filter-prop="label">
                  <a-select-option v-for="acc in paypalAccounts" :key="acc.id" :value="acc.id" :label="acc.email">
                    <div>{{ acc.email }}</div>
                    <div class="select-sub">{{ acc.account_alias }} · {{ acc.owner_name }}</div>
                  </a-select-option>
                </a-select>
              </a-form-item>
              <a-form-item label="退款截图 URL（打款后截图）">
                <a-input v-model:value="processForm.paypal_receipt_screenshot" placeholder="粘贴截图URL..." />
                <div v-if="processForm.paypal_receipt_screenshot" class="screenshot-preview-wrap">
                  <img :src="processForm.paypal_receipt_screenshot" class="screenshot-preview-img" referrerpolicy="no-referrer" @error="onImgError" />
                </div>
              </a-form-item>
            </template>

            <!-- 礼品卡处理 -->
            <template v-else>
              <a-form-item label="分配礼品卡">
                <a-select v-model:value="processForm.gift_card_id" style="width:100%" placeholder="选择未使用的礼品卡" show-search option-filter-prop="label" @change="onGiftCardChange">
                  <a-select-option v-for="gc in availableGiftCards" :key="gc.id" :value="gc.id" :label="gc.card_number">
                    <div class="gc-option">
                      <span class="gc-no">{{ gc.card_number }}</span>
                      <span class="gc-val">${{ Number(gc.face_value_usd).toFixed(2) }}</span>
                    </div>
                  </a-select-option>
                </a-select>
              </a-form-item>
              <div v-if="selectedGiftCard" class="gift-card-detail">
                <div class="gc-detail-row">
                  <span class="gc-detail-label">卡号</span>
                  <span class="gc-detail-val mono">{{ selectedGiftCard.card_number }}</span>
                </div>
                <div class="gc-detail-row">
                  <span class="gc-detail-label">面额</span>
                  <span class="gc-detail-val amount-usd">${{ Number(selectedGiftCard.face_value_usd).toFixed(2) }}</span>
                </div>
                <div class="gc-detail-row">
                  <span class="gc-detail-label">Code</span>
                  <span class="gc-detail-val card-code">{{ selectedGiftCard.card_code }}</span>
                </div>
              </div>
            </template>

            <a-form-item label="财务备注">
              <a-textarea v-model:value="processForm.finance_notes" :rows="2" placeholder="可选" />
            </a-form-item>
          </a-form>

          <div class="drawer-footer">
            <a-button @click="processOpen = false">取消</a-button>
            <a-button type="primary" :loading="processing" @click="handleProcess">确认处理</a-button>
          </div>
        </div>

        <!-- 已处理结果展示 -->
        <div v-else class="drawer-section">
          <div class="drawer-section-title">处理结果</div>
          <template v-if="currentRequest.refund_method === 'PayPal'">
            <div class="result-detail-box">
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">付款 PayPal</span>
                  <span class="detail-val mono">{{ currentRequest.assigned_paypal_email }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">退款金额</span>
                  <span class="detail-val amount-usd-lg">${{ Number(currentRequest.refund_amount_usd || 0).toFixed(2) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">处理时间</span>
                  <span class="detail-val">{{ fmtTime(currentRequest.handled_at) }}</span>
                </div>
                <div v-if="currentRequest.finance_notes" class="detail-item full">
                  <span class="detail-label">财务备注</span>
                  <span class="detail-val">{{ currentRequest.finance_notes }}</span>
                </div>
              </div>
              <div v-if="currentRequest.paypal_receipt_screenshot" style="margin-top:12px">
                <div class="detail-label" style="margin-bottom:6px">退款截图</div>
                <a :href="currentRequest.paypal_receipt_screenshot" target="_blank">
                  <img :src="currentRequest.paypal_receipt_screenshot" class="screenshot-preview-img" referrerpolicy="no-referrer" @error="onImgError" />
                </a>
              </div>
            </div>
          </template>
          <template v-else>
            <div class="result-detail-box">
              <div class="detail-grid">
                <div class="detail-item">
                  <span class="detail-label">礼品卡面额</span>
                  <span class="detail-val amount-usd-lg">${{ Number(currentRequest.gift_card_face_value_usd || currentRequest.refund_amount_usd || 0).toFixed(2) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">卡号</span>
                  <span class="detail-val mono">{{ currentRequest.assigned_gift_card_number }}</span>
                </div>
                <div class="detail-item full">
                  <span class="detail-label">礼品卡 Code</span>
                  <div style="display:flex;align-items:center;gap:8px">
                    <span class="card-code-lg">{{ currentRequest.assigned_gift_card_code }}</span>
                    <a-button type="link" size="small" @click="copyText(currentRequest.assigned_gift_card_code)">复制</a-button>
                  </div>
                </div>
                <div class="detail-item">
                  <span class="detail-label">处理时间</span>
                  <span class="detail-val">{{ fmtTime(currentRequest.handled_at) }}</span>
                </div>
                <div v-if="currentRequest.finance_notes" class="detail-item full">
                  <span class="detail-label">财务备注</span>
                  <span class="detail-val">{{ currentRequest.finance_notes }}</span>
                </div>
              </div>
            </div>
          </template>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

const loading = ref(false)
const requests = ref<any[]>([])
const filterStatus = ref('待处理')
const filterMethod = ref('')
const filterSearch = ref('')
const processOpen = ref(false)
const currentRequest = ref<any>(null)
const processing = ref(false)
const paypalAccounts = ref<any[]>([])
const availableGiftCards = ref<any[]>([])
const pagination = ref({ current: 1, pageSize: 20, total: 0 })

const processForm = reactive({
  paypal_account_id: '',
  paypal_receipt_screenshot: '',
  gift_card_id: '',
  finance_notes: '',
  gift_card_face_value_usd: 0,
})

const statusColor: Record<string, string> = { '待处理': 'orange', '已处理': 'green', '已取消': 'red' }

const selectedGiftCard = computed(() =>
  processForm.gift_card_id
    ? availableGiftCards.value.find(g => g.id === processForm.gift_card_id)
    : null
)

const columns = [
  { title: '子订单信息', key: 'info', width: 200 },
  { title: '买手', key: 'buyer', width: 170 },
  { title: '退款方式', key: 'refund_method', width: 130 },
  { title: '申请金额', key: 'refund_amount', width: 120 },
  { title: '状态', key: 'status', width: 85 },
  {
    title: '申请时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 110,
    customRender: ({ text }: any) => text ? dayjs(text).format('MM-DD HH:mm') : '',
  },
  { title: '处理结果', key: 'result', width: 180 },
  { title: '操作', key: 'action', width: 110, fixed: 'right' },
]

function fmtTime(t: string | null) {
  if (!t) return '—'
  return dayjs(t).format('YYYY-MM-DD HH:mm')
}

function onImgError(e: Event) {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
}

function copyText(text: string) {
  if (!text) return
  navigator.clipboard.writeText(text).then(() => message.success('已复制'))
}

function onGiftCardChange() {
  if (selectedGiftCard.value) {
    processForm.gift_card_face_value_usd = Number(selectedGiftCard.value.face_value_usd)
  }
}

async function load() {
  loading.value = true
  try {
    let query = supabase
      .from('refund_requests')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
    if (filterStatus.value) query = query.eq('status', filterStatus.value)
    if (filterMethod.value) query = query.eq('refund_method', filterMethod.value)
    if (filterSearch.value) {
      const kw = `%${filterSearch.value}%`
      query = query.or(`buyer_name.ilike.${kw},sub_order_number.ilike.${kw},product_name.ilike.${kw}`)
    }
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
  Object.assign(processForm, {
    paypal_account_id: '',
    paypal_receipt_screenshot: '',
    gift_card_id: '',
    finance_notes: record.finance_notes || '',
    gift_card_face_value_usd: 0,
  })

  if (record.refund_method === 'PayPal') {
    const { data } = await supabase
      .from('paypal_accounts')
      .select('id, email, account_alias, owner_name')
      .eq('status', '正常')
    paypalAccounts.value = data || []
  } else {
    const { data } = await supabase
      .from('gift_cards')
      .select('id, card_number, card_code, face_value_usd')
      .eq('status', '未使用')
      .order('face_value_usd', { ascending: false })
    availableGiftCards.value = data || []
  }
  processOpen.value = true
}

async function handleProcess() {
  if (!currentRequest.value) return

  if (currentRequest.value.refund_method === 'PayPal' && !processForm.paypal_account_id) {
    message.warning('请选择付款 PayPal 账号')
    return
  }
  if (currentRequest.value.refund_method === '礼品卡' && !processForm.gift_card_id) {
    message.warning('请选择礼品卡')
    return
  }

  processing.value = true
  try {
    const update: any = {
      status: '已处理',
      finance_notes: processForm.finance_notes,
      handled_at: new Date().toISOString(),
    }

    if (currentRequest.value.refund_method === 'PayPal') {
      const acc = paypalAccounts.value.find(a => a.id === processForm.paypal_account_id)
      update.assigned_paypal_account_id = processForm.paypal_account_id
      update.assigned_paypal_email = acc?.email || ''
      update.paypal_receipt_screenshot = processForm.paypal_receipt_screenshot || ''
    } else {
      const gc = availableGiftCards.value.find(g => g.id === processForm.gift_card_id)
      update.assigned_gift_card_id = processForm.gift_card_id
      update.assigned_gift_card_number = gc?.card_number || ''
      update.assigned_gift_card_code = gc?.card_code || ''
      update.gift_card_face_value_usd = gc?.face_value_usd || 0
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
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.total-hint { font-size: 12px; color: #9ca3af; margin-left: auto; }

.cell-info { display: flex; flex-direction: column; gap: 2px; }
.cell-subno { font-family: 'Courier New', monospace; font-size: 11px; font-weight: 700; color: #1a1a2e; }
.cell-product { font-size: 12px; color: #374151; }
.cell-meta { font-size: 11px; color: #9ca3af; }
.cell-email { font-size: 11px; color: #6b7280; }
.cell-seq { font-size: 11px; color: #9ca3af; margin-top: 2px; }
.amount-usd { font-weight: 700; color: #dc2626; font-size: 14px; }
.cell-product-price { font-size: 11px; color: #9ca3af; }
.text-gray { color: #9ca3af; font-size: 12px; }

.result-paypal { display: flex; flex-direction: column; gap: 2px; }
.result-acc { font-size: 12px; color: #374151; }
.result-screenshot-link { font-size: 11px; color: #2563eb; }
.result-giftcard { display: flex; flex-direction: column; gap: 2px; }
.result-code { font-family: 'Courier New', monospace; font-size: 11px; color: #059669; font-weight: 700; }
.re-edit-link { font-size: 12px; color: #2563eb; cursor: pointer; }

/* 抽屉内 */
.drawer-section { margin-bottom: 24px; }
.drawer-section-title { font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #f0f0f0; }

.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.detail-item { display: flex; flex-direction: column; gap: 3px; }
.detail-item.full { grid-column: 1 / -1; }
.detail-label { font-size: 11px; color: #9ca3af; font-weight: 500; }
.detail-val { font-size: 13px; color: #1a1a2e; }
.detail-val.mono { font-family: 'Courier New', monospace; font-size: 12px; }
.amount-usd-lg { font-size: 18px; font-weight: 700; color: #dc2626; }

.select-sub { font-size: 11px; color: #9ca3af; }
.gc-option { display: flex; align-items: center; justify-content: space-between; }
.gc-no { font-family: 'Courier New', monospace; font-size: 12px; }
.gc-val { font-weight: 700; color: #059669; font-size: 12px; }

.gift-card-detail {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 10px 14px;
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.gc-detail-row { display: flex; align-items: center; gap: 8px; }
.gc-detail-label { font-size: 11px; color: #6b7280; min-width: 50px; }
.gc-detail-val { font-size: 13px; color: #1a1a2e; }

.card-code { font-family: 'Courier New', monospace; font-size: 13px; font-weight: 700; color: #059669; letter-spacing: 1px; }
.card-code-lg { font-family: 'Courier New', monospace; font-size: 16px; font-weight: 700; color: #059669; letter-spacing: 1px; background: #f0fdf4; border: 1px dashed #86efac; border-radius: 6px; padding: 4px 12px; }

.screenshot-preview-wrap { margin-top: 8px; }
.screenshot-preview-img { max-width: 100%; max-height: 200px; border-radius: 8px; border: 1px solid #e5e7eb; object-fit: contain; }

.result-detail-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; }

.drawer-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #f0f0f0; }
</style>
