<template>
  <div class="page-content">
    <div class="page-header">
      <div>
        <h1 class="page-title">批次结算管理</h1>
        <p class="page-sub">管理多ASIN批次订单的预收款与最终结算，支持补款、溢款退还</p>
      </div>
      <a-button type="primary" @click="openCreateModal"><PlusOutlined /> 新建批次</a-button>
    </div>

    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">批次总数</div>
        <div class="stat-value">{{ stats.total }}</div>
      </div>
      <div class="stat-card stat-active">
        <div class="stat-label">进行中</div>
        <div class="stat-value">{{ stats.active }}</div>
      </div>
      <div class="stat-card stat-pending">
        <div class="stat-label">待结算</div>
        <div class="stat-value">{{ stats.pendingSettlement }}</div>
      </div>
      <div class="stat-card stat-settled">
        <div class="stat-label">已结清</div>
        <div class="stat-value">{{ stats.settled }}</div>
      </div>
      <div class="stat-card stat-supplement">
        <div class="stat-label">待补款金额</div>
        <div class="stat-value">¥{{ stats.totalOwed.toFixed(0) }}</div>
      </div>
      <div class="stat-card stat-refund">
        <div class="stat-label">待退款金额</div>
        <div class="stat-value">¥{{ stats.totalRefund.toFixed(0) }}</div>
      </div>
    </div>

    <div class="card-panel">
      <div class="toolbar">
        <a-input-search
          v-model:value="searchText"
          placeholder="搜索批次号/客户名"
          style="width: 260px"
          @search="loadBatches"
          allow-clear
        />
        <a-select v-model:value="filterStatus" style="width: 140px" @change="loadBatches" allow-clear placeholder="批次状态">
          <a-select-option value="">全部状态</a-select-option>
          <a-select-option value="active">进行中</a-select-option>
          <a-select-option value="pending_settlement">待结算</a-select-option>
          <a-select-option value="settled">已结清</a-select-option>
        </a-select>
        <a-select v-model:value="filterSettleType" style="width: 140px" @change="loadBatches" allow-clear placeholder="结算类型">
          <a-select-option value="">全部</a-select-option>
          <a-select-option value="supplement">待补款</a-select-option>
          <a-select-option value="refund">溢款退还</a-select-option>
          <a-select-option value="balanced">刚好平账</a-select-option>
        </a-select>
        <a-button @click="loadBatches"><ReloadOutlined /></a-button>
      </div>

      <a-table
        :columns="columns"
        :data-source="batches"
        :loading="loading"
        row-key="id"
        size="middle"
        :pagination="{ pageSize: 20, showSizeChanger: true }"
        :scroll="{ x: 1400 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'batch_number'">
            <a class="batch-num-link" @click="openDetail(record)">{{ record.batch_number }}</a>
          </template>

          <template v-if="column.key === 'customer'">
            <div class="customer-cell">
              <div class="customer-name">{{ record.customer_name || '-' }}</div>
              <div v-if="record.sales_person" class="sales-person">{{ record.sales_person }}</div>
            </div>
          </template>

          <template v-if="column.key === 'progress'">
            <div class="progress-cell">
              <a-progress
                :percent="getProgressPct(record)"
                size="small"
                :stroke-color="getProgressColor(record)"
                :show-info="false"
                style="margin-bottom:2px"
              />
              <span class="progress-text">{{ record.completed_count || 0 }} / {{ record.order_count || 0 }} 个ASIN完成</span>
            </div>
          </template>

          <template v-if="column.key === 'amounts'">
            <div class="amounts-cell">
              <div class="amount-row-item">
                <span class="amount-row-label">预收：</span>
                <span class="amount-prepaid">¥{{ Number(record.prepaid_amount || 0).toFixed(0) }}</span>
              </div>
              <div class="amount-row-item" v-if="record.actual_amount">
                <span class="amount-row-label">实际：</span>
                <span class="amount-actual">¥{{ Number(record.actual_amount || 0).toFixed(0) }}</span>
              </div>
            </div>
          </template>

          <template v-if="column.key === 'balance'">
            <div v-if="record.batch_status === 'active'" class="balance-pending">
              <span style="color:#9ca3af;font-size:12px">任务进行中</span>
            </div>
            <div v-else-if="!record.actual_amount" class="balance-pending">
              <span style="color:#9ca3af;font-size:12px">待录入实际金额</span>
            </div>
            <div v-else class="balance-cell">
              <div :class="['balance-badge', getBalanceClass(record)]">
                {{ getBalanceLabel(record) }}
              </div>
              <div class="balance-amount" :style="{ color: getBalanceAmountColor(record) }">
                ¥{{ Math.abs(Number(record.balance || 0)).toFixed(2) }}
              </div>
            </div>
          </template>

          <template v-if="column.key === 'batch_status'">
            <a-tag :color="getStatusColor(record.batch_status)">{{ getStatusLabel(record.batch_status) }}</a-tag>
          </template>

          <template v-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="openDetail(record)">详情</a-button>
              <a-button
                v-if="record.batch_status !== 'settled'"
                type="link"
                size="small"
                @click="openSettleModal(record)"
              >结算</a-button>
              <a-popconfirm title="确定删除此批次?" @confirm="deleteBatch(record.id)">
                <a-button type="link" size="small" danger>删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <a-modal
      v-model:open="createModalOpen"
      title="新建订单批次"
      :confirm-loading="createSaving"
      @ok="saveCreate"
      ok-text="创建"
      cancel-text="取消"
      width="560px"
    >
      <div class="form-grid">
        <div class="form-field form-field-full">
          <label class="form-label">客户名称 <span class="required">*</span></label>
          <a-input v-model:value="createForm.customer_name" placeholder="输入客户名称" />
        </div>
        <div class="form-field">
          <label class="form-label">对接商务</label>
          <a-input v-model:value="createForm.sales_person" placeholder="商务姓名" />
        </div>
        <div class="form-field">
          <label class="form-label">预收款金额（元）<span class="required">*</span></label>
          <a-input-number
            v-model:value="createForm.prepaid_amount"
            style="width:100%"
            :min="0"
            :precision="2"
            placeholder="客户已付款金额"
          />
        </div>
        <div class="form-field form-field-full">
          <label class="form-label">批次备注</label>
          <a-textarea v-model:value="createForm.notes" :rows="2" placeholder="如：包含3个ASIN，客户预付5000元" />
        </div>
      </div>
    </a-modal>

    <a-drawer
      v-model:open="detailDrawerOpen"
      :title="`批次详情 - ${currentBatch?.batch_number}`"
      width="900"
      placement="right"
    >
      <template v-if="currentBatch">
        <div class="detail-top">
          <div class="detail-meta">
            <div class="detail-meta-item">
              <span class="detail-meta-label">客户</span>
              <span class="detail-meta-val">{{ currentBatch.customer_name || '-' }}</span>
            </div>
            <div class="detail-meta-item">
              <span class="detail-meta-label">对接商务</span>
              <span class="detail-meta-val">{{ currentBatch.sales_person || '-' }}</span>
            </div>
            <div class="detail-meta-item">
              <span class="detail-meta-label">创建时间</span>
              <span class="detail-meta-val">{{ dayjs(currentBatch.created_at).format('YYYY-MM-DD') }}</span>
            </div>
            <div class="detail-meta-item">
              <span class="detail-meta-label">批次状态</span>
              <a-tag :color="getStatusColor(currentBatch.batch_status)">{{ getStatusLabel(currentBatch.batch_status) }}</a-tag>
            </div>
          </div>

          <div class="detail-amounts">
            <div class="detail-amount-block detail-amount-prepaid">
              <div class="da-label">客户预收款</div>
              <div class="da-value">¥{{ Number(currentBatch.prepaid_amount || 0).toFixed(2) }}</div>
              <div class="da-desc">下单时收取</div>
            </div>
            <div class="detail-amount-arrow">→</div>
            <div class="detail-amount-block detail-amount-actual">
              <div class="da-label">实际应收</div>
              <div class="da-value">
                <span v-if="currentBatch.actual_amount">¥{{ Number(currentBatch.actual_amount).toFixed(2) }}</span>
                <span v-else class="da-tbd">待汇总</span>
              </div>
              <div class="da-desc">全部任务完成后</div>
            </div>
            <div class="detail-amount-arrow">＝</div>
            <div class="detail-amount-block" :class="getBalanceBlockClass(currentBatch)">
              <div class="da-label">差额</div>
              <div class="da-value" :style="{ color: getBalanceAmountColor(currentBatch) }">
                <span v-if="currentBatch.actual_amount">
                  {{ Number(currentBatch.balance || 0) >= 0 ? '+' : '' }}¥{{ Number(currentBatch.balance || 0).toFixed(2) }}
                </span>
                <span v-else class="da-tbd">-</span>
              </div>
              <div class="da-desc">
                <span v-if="!currentBatch.actual_amount">结算后显示</span>
                <span v-else-if="Number(currentBatch.balance) > 0" style="color:#d97706">客户需补款</span>
                <span v-else-if="Number(currentBatch.balance) < 0" style="color:#2563eb">我方需退款</span>
                <span v-else style="color:#16a34a">刚好平账</span>
              </div>
            </div>
          </div>

          <div v-if="currentBatch.batch_status === 'settled'" class="settled-info">
            <div class="settled-badge">已结清</div>
            <div v-if="currentBatch.settlement_notes" class="settled-notes">{{ currentBatch.settlement_notes }}</div>
            <div class="settled-by" v-if="currentBatch.settled_by">
              结算商务：{{ currentBatch.settled_by }}
              <span v-if="currentBatch.settled_at" style="margin-left:8px;color:#9ca3af">{{ dayjs(currentBatch.settled_at).format('MM-DD HH:mm') }}</span>
            </div>
          </div>

          <div v-if="currentBatch.notes" class="batch-notes-panel">
            <span style="color:#6b7280;font-size:12px">备注：</span>{{ currentBatch.notes }}
          </div>
        </div>

        <a-divider style="margin: 20px 0 16px" />
        <div class="detail-orders-header">
          <div class="detail-section-title">批次内订单（{{ batchOrders.length }} 个ASIN）</div>
          <a-button size="small" @click="openBindOrderModal">绑定订单</a-button>
        </div>

        <div v-if="batchOrders.length === 0" class="empty-orders">
          <a-empty description="暂无关联订单，点击「绑定订单」将已有订单加入此批次" />
        </div>
        <div v-else class="order-cards">
          <div
            v-for="order in batchOrders"
            :key="order.id"
            class="order-card"
            :class="{ 'order-card-done': order.status === '已完成', 'order-card-active': order.status === '进行中' }"
          >
            <div class="oc-left">
              <div class="oc-asin">{{ order.asin }}</div>
              <div class="oc-store">{{ order.store_name }}</div>
              <div v-if="order.product_name" class="oc-product">{{ order.product_name }}</div>
            </div>
            <div class="oc-mid">
              <div class="oc-types">
                <a-tag v-for="t in (order.order_types || [order.order_type])" :key="t" :color="getOrderTypeColor(t)" size="small">{{ t }}</a-tag>
              </div>
              <div class="oc-qty">×{{ order.order_quantity }} 单</div>
            </div>
            <div class="oc-right">
              <div class="oc-amount">¥{{ Number(order.total_amount || 0).toFixed(0) }}</div>
              <a-tag :color="getOrderStatusColor(order.status)" size="small">{{ order.status }}</a-tag>
            </div>
            <div class="oc-actions">
              <a-popconfirm title="从此批次移除?" @confirm="unbindOrder(order.id)">
                <a-button type="text" size="small" danger><CloseOutlined /></a-button>
              </a-popconfirm>
            </div>
          </div>
        </div>

        <div v-if="batchOrders.length > 0" class="batch-order-summary">
          <div class="bos-row">
            <span class="bos-label">批次订单金额合计：</span>
            <span class="bos-val">¥{{ batchOrderTotal.toFixed(2) }}</span>
          </div>
          <div class="bos-row">
            <span class="bos-label">已完成 ASIN：</span>
            <span class="bos-val">{{ batchOrders.filter(o => o.status === '已完成').length }} / {{ batchOrders.length }}</span>
          </div>
          <a-button
            v-if="currentBatch.batch_status === 'active' && batchOrders.every(o => o.status === '已完成')"
            type="primary"
            style="margin-top:10px"
            @click="markPendingSettlement"
          >全部完成，标记为待结算</a-button>
        </div>
      </template>
    </a-drawer>

    <a-modal
      v-model:open="settleModalOpen"
      title="批次结算"
      :confirm-loading="settleSaving"
      @ok="saveSettle"
      ok-text="确认结算"
      cancel-text="取消"
      width="560px"
    >
      <div v-if="settleTarget" class="settle-form">
        <div class="settle-info-bar">
          <div class="settle-info-item">
            <span class="si-label">客户</span>
            <span class="si-val">{{ settleTarget.customer_name }}</span>
          </div>
          <div class="settle-info-item">
            <span class="si-label">预收款</span>
            <span class="si-val">¥{{ Number(settleTarget.prepaid_amount || 0).toFixed(2) }}</span>
          </div>
        </div>

        <div class="form-field">
          <label class="form-label">实际应收总金额（元）<span class="required">*</span></label>
          <a-input-number
            v-model:value="settleForm.actual_amount"
            style="width:100%"
            :min="0"
            :precision="2"
            placeholder="所有订单完成后的实际总金额"
            @change="recalcBalance"
          />
          <div v-if="settleForm.actual_amount" class="settle-hint">
            <span v-if="calcBalance > 0" class="settle-supplement">
              客户需补款 ¥{{ calcBalance.toFixed(2) }}（实收 > 预收）
            </span>
            <span v-else-if="calcBalance < 0" class="settle-refund">
              我方需退款 ¥{{ Math.abs(calcBalance).toFixed(2) }}（预收 > 实收，溢收部分退还）
            </span>
            <span v-else class="settle-balanced">
              预收与实收相等，刚好平账
            </span>
          </div>
        </div>

        <div class="form-field">
          <label class="form-label">已实际收款金额（元）</label>
          <a-input-number v-model:value="settleForm.settled_amount" style="width:100%" :min="0" :precision="2" placeholder="可选，如有分批收款可填" />
        </div>

        <div class="form-field">
          <label class="form-label">结算备注</label>
          <a-textarea v-model:value="settleForm.settlement_notes" :rows="3" placeholder="如：税费 ¥120，本金差价 ¥80，共欠款 ¥200" />
        </div>

        <div class="form-field">
          <label class="form-label">结算商务</label>
          <a-input v-model:value="settleForm.settled_by" placeholder="操作人姓名" />
        </div>
      </div>
    </a-modal>

    <a-modal
      v-model:open="bindOrderModalOpen"
      title="绑定订单到批次"
      :confirm-loading="bindSaving"
      @ok="saveBindOrder"
      ok-text="绑定选中"
      cancel-text="取消"
      width="700px"
    >
      <div class="bind-search">
        <a-input-search
          v-model:value="bindSearchText"
          placeholder="搜索订单号/ASIN/店铺/产品名"
          @search="loadBindOrders"
          allow-clear
        />
      </div>
      <div class="bind-hint">仅显示未绑定批次的订单，可多选</div>
      <a-table
        :columns="bindColumns"
        :data-source="bindOrders"
        :loading="bindLoading"
        row-key="id"
        size="small"
        :pagination="{ pageSize: 8 }"
        :row-selection="bindRowSelection"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'order_info'">
            <div>
              <div class="bind-order-num">{{ record.order_number }}</div>
              <div style="font-size:11px;color:#6b7280">{{ record.asin }} · {{ record.store_name }}</div>
            </div>
          </template>
          <template v-if="column.key === 'types'">
            <a-tag v-for="t in (record.order_types || [record.order_type])" :key="t" :color="getOrderTypeColor(t)" size="small">{{ t }}</a-tag>
          </template>
          <template v-if="column.key === 'status'">
            <a-tag :color="getOrderStatusColor(record.status)" size="small">{{ record.status }}</a-tag>
          </template>
        </template>
      </a-table>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, ReloadOutlined, CloseOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

const loading = ref(false)
const batches = ref<any[]>([])
const searchText = ref('')
const filterStatus = ref('')
const filterSettleType = ref('')

const createModalOpen = ref(false)
const createSaving = ref(false)
const createForm = ref({ customer_name: '', sales_person: '', prepaid_amount: 0, notes: '' })

const detailDrawerOpen = ref(false)
const currentBatch = ref<any>(null)
const batchOrders = ref<any[]>([])

const settleModalOpen = ref(false)
const settleSaving = ref(false)
const settleTarget = ref<any>(null)
const settleForm = ref({ actual_amount: 0, settled_amount: 0, settlement_notes: '', settled_by: '' })

const bindOrderModalOpen = ref(false)
const bindSaving = ref(false)
const bindLoading = ref(false)
const bindOrders = ref<any[]>([])
const bindSearchText = ref('')
const bindSelectedKeys = ref<string[]>([])

const bindRowSelection = computed(() => ({
  selectedRowKeys: bindSelectedKeys.value,
  onChange: (keys: string[]) => { bindSelectedKeys.value = keys },
}))

const stats = computed(() => {
  const all = batches.value
  const owned = all.filter(b => b.batch_status === 'pending_settlement' && Number(b.balance || 0) > 0)
  const refundable = all.filter(b => b.batch_status === 'pending_settlement' && Number(b.balance || 0) < 0)
  return {
    total: all.length,
    active: all.filter(b => b.batch_status === 'active').length,
    pendingSettlement: all.filter(b => b.batch_status === 'pending_settlement').length,
    settled: all.filter(b => b.batch_status === 'settled').length,
    totalOwed: owned.reduce((s, b) => s + Number(b.balance || 0), 0),
    totalRefund: refundable.reduce((s, b) => s + Math.abs(Number(b.balance || 0)), 0),
  }
})

const calcBalance = computed(() => {
  if (!settleTarget.value) return 0
  return Number(settleForm.value.actual_amount || 0) - Number(settleTarget.value.prepaid_amount || 0)
})

const batchOrderTotal = computed(() => {
  return batchOrders.value.reduce((s, o) => s + Number(o.total_amount || 0), 0)
})

const columns = [
  { title: '批次编号', key: 'batch_number', width: 200 },
  { title: '客户/商务', key: 'customer', width: 160 },
  { title: 'ASIN进度', key: 'progress', width: 175 },
  { title: '预收/实际金额', key: 'amounts', width: 155 },
  { title: '差额/结算', key: 'balance', width: 160 },
  { title: '状态', key: 'batch_status', width: 100 },
  { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 105, customRender: ({ text }: any) => text ? dayjs(text).format('MM-DD') : '' },
  { title: '操作', key: 'action', width: 165, fixed: 'right' },
]

const bindColumns = [
  { title: '订单信息', key: 'order_info', width: 200 },
  { title: '类型', key: 'types', width: 150 },
  { title: '数量', dataIndex: 'order_quantity', key: 'order_quantity', width: 70 },
  { title: '金额', dataIndex: 'total_amount', key: 'total_amount', width: 90, customRender: ({ text }: any) => `¥${Number(text || 0).toFixed(0)}` },
  { title: '状态', key: 'status', width: 90 },
]

function getStatusColor(status: string) {
  const map: Record<string, string> = { active: 'blue', pending_settlement: 'orange', settled: 'green' }
  return map[status] || 'default'
}
function getStatusLabel(status: string) {
  const map: Record<string, string> = { active: '进行中', pending_settlement: '待结算', settled: '已结清' }
  return map[status] || status
}
function getOrderStatusColor(status: string) {
  const map: Record<string, string> = { '待处理': 'default', '进行中': 'blue', '已完成': 'green', '已取消': 'red', '暂停': 'orange' }
  return map[status] || 'default'
}
function getOrderTypeColor(type: string) {
  const map: Record<string, string> = { '免评': 'default', '文字评': 'blue', '图片评': 'cyan', '视频评': 'purple', 'Feedback': 'orange' }
  return map[type] || 'default'
}
function getProgressPct(record: any) {
  const total = record.order_count || 0
  if (total === 0) return 0
  return Math.round(((record.completed_count || 0) / total) * 100)
}
function getProgressColor(record: any) {
  const pct = getProgressPct(record)
  if (pct === 100) return '#16a34a'
  if (pct >= 50) return '#2563eb'
  return '#9ca3af'
}
function getBalanceClass(record: any) {
  const b = Number(record.balance || 0)
  if (b > 0) return 'balance-supplement'
  if (b < 0) return 'balance-refund'
  return 'balance-balanced'
}
function getBalanceLabel(record: any) {
  const b = Number(record.balance || 0)
  if (b > 0) return '需补款'
  if (b < 0) return '溢款退还'
  return '已平账'
}
function getBalanceAmountColor(record: any) {
  const b = Number(record.balance || 0)
  if (b > 0) return '#d97706'
  if (b < 0) return '#2563eb'
  return '#16a34a'
}
function getBalanceBlockClass(record: any) {
  const b = Number(record.balance || 0)
  if (!record.actual_amount) return 'detail-amount-neutral'
  if (b > 0) return 'detail-amount-supplement'
  if (b < 0) return 'detail-amount-refund'
  return 'detail-amount-balanced'
}

function recalcBalance() {}

async function loadBatches() {
  loading.value = true
  try {
    let query = supabase.from('order_batches').select('*').order('created_at', { ascending: false })
    if (searchText.value) query = query.or(`batch_number.ilike.%${searchText.value}%,customer_name.ilike.%${searchText.value}%`)
    if (filterStatus.value) query = query.eq('batch_status', filterStatus.value)
    if (filterSettleType.value) query = query.eq('settlement_type', filterSettleType.value)
    const { data, error } = await query
    if (error) throw error
    batches.value = data || []
  } catch (e: any) {
    message.error('加载失败：' + e.message)
  } finally {
    loading.value = false
  }
}

async function loadBatchOrders(batchId: string) {
  const { data, error } = await supabase.from('erp_orders').select('*').eq('batch_id', batchId).order('created_at')
  if (error) { message.error('加载订单失败'); return }
  batchOrders.value = data || []
}

async function loadBindOrders() {
  bindLoading.value = true
  try {
    let query = supabase.from('erp_orders').select('*').is('batch_id', null).order('created_at', { ascending: false }).limit(50)
    if (bindSearchText.value) {
      query = query.or(`order_number.ilike.%${bindSearchText.value}%,asin.ilike.%${bindSearchText.value}%,store_name.ilike.%${bindSearchText.value}%,product_name.ilike.%${bindSearchText.value}%`)
    }
    const { data, error } = await query
    if (error) throw error
    bindOrders.value = data || []
  } catch (e: any) {
    message.error('加载失败：' + e.message)
  } finally {
    bindLoading.value = false
  }
}

function openCreateModal() {
  createForm.value = { customer_name: '', sales_person: '', prepaid_amount: 0, notes: '' }
  createModalOpen.value = true
}

async function saveCreate() {
  if (!createForm.value.customer_name) { message.warning('请填写客户名称'); return }
  if (!createForm.value.prepaid_amount) { message.warning('请填写预收款金额'); return }
  createSaving.value = true
  try {
    const { data: batchNumData, error: seqErr } = await supabase.rpc('generate_batch_number')
    if (seqErr) throw seqErr
    const { error } = await supabase.from('order_batches').insert({
      batch_number: batchNumData,
      customer_name: createForm.value.customer_name,
      sales_person: createForm.value.sales_person,
      prepaid_amount: createForm.value.prepaid_amount,
      notes: createForm.value.notes,
      batch_status: 'active',
    })
    if (error) throw error
    message.success('批次已创建')
    createModalOpen.value = false
    loadBatches()
  } catch (e: any) {
    message.error('创建失败：' + e.message)
  } finally {
    createSaving.value = false
  }
}

async function openDetail(record: any) {
  currentBatch.value = record
  detailDrawerOpen.value = true
  await loadBatchOrders(record.id)
}

function openBindOrderModal() {
  bindSelectedKeys.value = []
  bindSearchText.value = ''
  loadBindOrders()
  bindOrderModalOpen.value = true
}

async function saveBindOrder() {
  if (!bindSelectedKeys.value.length) { message.warning('请选择要绑定的订单'); return }
  if (!currentBatch.value) return
  bindSaving.value = true
  try {
    const { error } = await supabase.from('erp_orders').update({
      batch_id: currentBatch.value.id,
      batch_number: currentBatch.value.batch_number,
    }).in('id', bindSelectedKeys.value)
    if (error) throw error

    const newCount = (currentBatch.value.order_count || 0) + bindSelectedKeys.value.length
    await supabase.from('order_batches').update({ order_count: newCount }).eq('id', currentBatch.value.id)
    currentBatch.value.order_count = newCount

    message.success(`已绑定 ${bindSelectedKeys.value.length} 个订单`)
    bindOrderModalOpen.value = false
    await loadBatchOrders(currentBatch.value.id)
    loadBatches()
  } catch (e: any) {
    message.error('绑定失败：' + e.message)
  } finally {
    bindSaving.value = false
  }
}

async function unbindOrder(orderId: string) {
  if (!currentBatch.value) return
  const { error } = await supabase.from('erp_orders').update({ batch_id: null, batch_number: null }).eq('id', orderId)
  if (error) { message.error('移除失败'); return }
  const newCount = Math.max(0, (currentBatch.value.order_count || 0) - 1)
  await supabase.from('order_batches').update({ order_count: newCount }).eq('id', currentBatch.value.id)
  currentBatch.value.order_count = newCount
  message.success('已从批次移除')
  await loadBatchOrders(currentBatch.value.id)
  loadBatches()
}

async function markPendingSettlement() {
  if (!currentBatch.value) return
  const actual = batchOrderTotal.value
  const { error } = await supabase.from('order_batches').update({
    batch_status: 'pending_settlement',
    actual_amount: actual,
    balance: actual - Number(currentBatch.value.prepaid_amount || 0),
    settlement_type: actual > Number(currentBatch.value.prepaid_amount) ? 'supplement' : actual < Number(currentBatch.value.prepaid_amount) ? 'refund' : 'balanced',
    completed_count: batchOrders.value.length,
  }).eq('id', currentBatch.value.id)
  if (error) { message.error('操作失败'); return }
  message.success('已标记为待结算，请核对金额后完成结算')
  const updated = { ...currentBatch.value, batch_status: 'pending_settlement', actual_amount: actual }
  currentBatch.value = updated
  loadBatches()
}

function openSettleModal(record: any) {
  settleTarget.value = record
  settleForm.value = {
    actual_amount: record.actual_amount || 0,
    settled_amount: record.settled_amount || 0,
    settlement_notes: record.settlement_notes || '',
    settled_by: record.settled_by || '',
  }
  settleModalOpen.value = true
}

async function saveSettle() {
  if (!settleTarget.value) return
  if (!settleForm.value.actual_amount) { message.warning('请填写实际应收金额'); return }
  settleSaving.value = true
  try {
    const balance = Number(settleForm.value.actual_amount) - Number(settleTarget.value.prepaid_amount || 0)
    const settlementType = balance > 0 ? 'supplement' : balance < 0 ? 'refund' : 'balanced'
    const { error } = await supabase.from('order_batches').update({
      actual_amount: settleForm.value.actual_amount,
      settled_amount: settleForm.value.settled_amount,
      balance,
      settlement_type: settlementType,
      batch_status: 'settled',
      settlement_notes: settleForm.value.settlement_notes,
      settled_by: settleForm.value.settled_by,
      settled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', settleTarget.value.id)
    if (error) throw error
    message.success('结算完成')
    settleModalOpen.value = false
    if (currentBatch.value?.id === settleTarget.value.id) {
      currentBatch.value = { ...currentBatch.value, batch_status: 'settled', actual_amount: settleForm.value.actual_amount, balance }
    }
    loadBatches()
  } catch (e: any) {
    message.error('结算失败：' + e.message)
  } finally {
    settleSaving.value = false
  }
}

async function deleteBatch(id: string) {
  const { error } = await supabase.from('order_batches').delete().eq('id', id)
  if (error) { message.error('删除失败'); return }
  message.success('已删除')
  loadBatches()
}

onMounted(loadBatches)
</script>

<style scoped>
.page-content { padding: 24px; }
.page-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 20px; gap: 16px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 4px; }
.page-sub { font-size: 13px; color: #6b7280; margin: 0; }

.stats-row { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.stat-card { flex: 1; min-width: 110px; background: #fff; border-radius: 10px; padding: 14px 16px; border: 1px solid #f0f0f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.stat-card.stat-active { border-color: #bfdbfe; background: #eff6ff; }
.stat-card.stat-pending { border-color: #fed7aa; background: #fff7ed; }
.stat-card.stat-settled { border-color: #bbf7d0; background: #f0fdf4; }
.stat-card.stat-supplement { border-color: #fde68a; background: #fffbeb; }
.stat-card.stat-refund { border-color: #bfdbfe; background: #eff6ff; }
.stat-label { font-size: 12px; color: #6b7280; margin-bottom: 4px; }
.stat-value { font-size: 22px; font-weight: 700; color: #111827; }

.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }

.batch-num-link { color: #2563eb; font-weight: 600; font-size: 12px; cursor: pointer; font-family: 'Courier New', monospace; }
.batch-num-link:hover { text-decoration: underline; }

.customer-cell { display: flex; flex-direction: column; gap: 2px; }
.customer-name { font-weight: 600; font-size: 13px; color: #111827; }
.sales-person { font-size: 11px; color: #9ca3af; }

.progress-cell { display: flex; flex-direction: column; }
.progress-text { font-size: 11px; color: #6b7280; }

.amounts-cell { display: flex; flex-direction: column; gap: 2px; }
.amount-row-item { display: flex; align-items: center; gap: 4px; }
.amount-row-label { font-size: 11px; color: #9ca3af; }
.amount-prepaid { font-size: 13px; font-weight: 600; color: #374151; }
.amount-actual { font-size: 13px; font-weight: 600; color: #2563eb; }

.balance-cell { display: flex; flex-direction: column; gap: 3px; }
.balance-badge { font-size: 11px; font-weight: 600; padding: 1px 6px; border-radius: 4px; display: inline-block; }
.balance-supplement { background: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
.balance-refund { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
.balance-balanced { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
.balance-amount { font-size: 14px; font-weight: 700; font-family: 'Courier New', monospace; }
.balance-pending {}

.detail-top { display: flex; flex-direction: column; gap: 16px; }
.detail-meta { display: flex; gap: 24px; flex-wrap: wrap; }
.detail-meta-item { display: flex; flex-direction: column; gap: 2px; }
.detail-meta-label { font-size: 11px; color: #9ca3af; }
.detail-meta-val { font-size: 14px; font-weight: 600; color: #111827; }

.detail-amounts { display: flex; align-items: center; gap: 12px; background: #f8fafc; border-radius: 12px; padding: 16px 20px; flex-wrap: wrap; }
.detail-amount-block { flex: 1; min-width: 110px; text-align: center; padding: 10px 14px; border-radius: 8px; background: #fff; border: 1px solid #e5e7eb; }
.detail-amount-prepaid { border-color: #e5e7eb; }
.detail-amount-actual { border-color: #bfdbfe; }
.detail-amount-supplement { border-color: #fde68a; background: #fffbeb; }
.detail-amount-refund { border-color: #bfdbfe; background: #eff6ff; }
.detail-amount-balanced { border-color: #bbf7d0; background: #f0fdf4; }
.detail-amount-neutral { border-color: #e5e7eb; background: #f9fafb; }
.detail-amount-arrow { font-size: 20px; color: #9ca3af; font-weight: 300; }
.da-label { font-size: 11px; color: #6b7280; margin-bottom: 4px; }
.da-value { font-size: 18px; font-weight: 700; color: #111827; font-family: 'Courier New', monospace; }
.da-tbd { font-size: 14px; color: #9ca3af; font-style: italic; font-family: inherit; }
.da-desc { font-size: 11px; color: #9ca3af; margin-top: 2px; }

.settled-info { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 12px 16px; }
.settled-badge { font-size: 13px; font-weight: 600; color: #16a34a; margin-bottom: 4px; }
.settled-notes { font-size: 13px; color: #374151; margin-top: 4px; }
.settled-by { font-size: 12px; color: #6b7280; margin-top: 6px; }
.batch-notes-panel { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #374151; }

.detail-orders-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.detail-section-title { font-size: 14px; font-weight: 600; color: #374151; }

.empty-orders { padding: 24px 0; }
.order-cards { display: flex; flex-direction: column; gap: 8px; }
.order-card {
  display: flex; align-items: center; gap: 12px;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 10px;
  padding: 12px 16px;
  transition: border-color 0.2s;
}
.order-card:hover { border-color: #93c5fd; }
.order-card-done { border-color: #bbf7d0; background: #f0fdf4; }
.order-card-active { border-color: #bfdbfe; }
.oc-left { flex: 2; min-width: 0; }
.oc-asin { font-weight: 700; color: #1e40af; font-size: 13px; }
.oc-store { font-size: 12px; color: #6b7280; }
.oc-product { font-size: 11px; color: #9ca3af; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; }
.oc-mid { flex: 2; display: flex; flex-direction: column; gap: 4px; }
.oc-types { display: flex; gap: 4px; flex-wrap: wrap; }
.oc-qty { font-size: 12px; color: #374151; font-weight: 500; }
.oc-right { flex: 1; text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 4px; }
.oc-amount { font-size: 15px; font-weight: 700; color: #dc2626; font-family: 'Courier New', monospace; }
.oc-actions { flex-shrink: 0; }

.batch-order-summary { margin-top: 16px; background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 18px; }
.bos-row { display: flex; align-items: center; justify-content: space-between; padding: 4px 0; font-size: 13px; }
.bos-label { color: #6b7280; }
.bos-val { font-weight: 600; color: #111827; }

.settle-form { display: flex; flex-direction: column; gap: 16px; padding: 4px 0; }
.settle-info-bar { display: flex; gap: 24px; background: #f8fafc; border-radius: 8px; padding: 12px 16px; }
.settle-info-item { display: flex; flex-direction: column; gap: 2px; }
.si-label { font-size: 11px; color: #9ca3af; }
.si-val { font-size: 14px; font-weight: 600; color: #111827; }
.settle-hint { margin-top: 6px; padding: 8px 12px; border-radius: 8px; font-size: 13px; font-weight: 500; }
.settle-supplement { color: #d97706; background: #fffbeb; padding: 8px 12px; border-radius: 8px; display: block; border: 1px solid #fde68a; }
.settle-refund { color: #2563eb; background: #eff6ff; padding: 8px 12px; border-radius: 8px; display: block; border: 1px solid #bfdbfe; }
.settle-balanced { color: #16a34a; background: #f0fdf4; padding: 8px 12px; border-radius: 8px; display: block; border: 1px solid #bbf7d0; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-field { display: flex; flex-direction: column; gap: 6px; }
.form-field-full { grid-column: 1 / -1; }
.form-label { font-size: 13px; font-weight: 500; color: #374151; }
.required { color: #ef4444; margin-left: 2px; }

.bind-search { margin-bottom: 8px; }
.bind-hint { font-size: 12px; color: #9ca3af; margin-bottom: 8px; }
.bind-order-num { font-size: 12px; font-weight: 600; color: #2563eb; font-family: 'Courier New', monospace; }
</style>
