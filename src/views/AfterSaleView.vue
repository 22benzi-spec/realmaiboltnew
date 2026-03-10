<template>
  <div class="page-content">
    <h1 class="page-title">售后问题单</h1>

    <div class="stats-row">
      <div class="stat-card stat-pending">
        <div class="stat-val">{{ stats.pending }}</div>
        <div class="stat-label">待处理</div>
      </div>
      <div class="stat-card stat-processing">
        <div class="stat-val">{{ stats.processing }}</div>
        <div class="stat-label">处理中</div>
      </div>
      <div class="stat-card stat-replaced">
        <div class="stat-val">{{ stats.replaced }}</div>
        <div class="stat-label">已替换订单</div>
      </div>
      <div class="stat-card stat-need-reorder">
        <div class="stat-val">{{ stats.needReorder }}</div>
        <div class="stat-label">需补单</div>
      </div>
      <div class="stat-card stat-reordered">
        <div class="stat-val">{{ stats.reordered }}</div>
        <div class="stat-label">已补单</div>
      </div>
      <div class="stat-card stat-refunded">
        <div class="stat-val">{{ stats.refundedToClient }}</div>
        <div class="stat-label">已退款给客户</div>
      </div>
    </div>

    <div class="card-panel">
      <div class="toolbar">
        <a-select v-model:value="filterStatus" style="width:140px" @change="load" allow-clear placeholder="全部状态">
          <a-select-option v-for="s in statusOptions" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterType" style="width:110px" @change="load" allow-clear placeholder="问题类型">
          <a-select-option v-for="t in issueTypes" :key="t" :value="t">{{ t }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterStolen" style="width:120px" @change="load" allow-clear placeholder="本金状态">
          <a-select-option :value="'yes'">本金被骗</a-select-option>
          <a-select-option :value="'no'">本金未骗</a-select-option>
        </a-select>
        <a-input-search v-model:value="filterSearch" placeholder="搜索子订单号/买手/客户/ASIN..." style="width:260px" @search="load" allow-clear />
        <a-button @click="load"><ReloadOutlined /> 刷新</a-button>
        <span class="total-hint">共 {{ pagination.total }} 条</span>
      </div>

      <a-table
        :columns="columns"
        :data-source="issues"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        size="middle"
        :scroll="{ x: 1400 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'sub_info'">
            <div class="cell-info">
              <a class="link-text" @click="openDetail(record)">{{ record.sub_order_number }}</a>
              <div class="cell-meta">{{ record.asin }} · {{ record.store_name }}</div>
              <div v-if="record.old_amazon_order_id" class="cell-amazon-id">AMZ: {{ record.old_amazon_order_id }}</div>
            </div>
          </template>
          <template v-if="column.key === 'client'">
            <div class="cell-client-name">{{ record.customer_name || '--' }}</div>
            <div v-if="record.business_manager_name" class="cell-meta">商务: {{ record.business_manager_name }}</div>
          </template>
          <template v-if="column.key === 'buyer'">
            <div>{{ record.buyer_name || '--' }}</div>
            <div class="cell-meta">{{ record.staff_name }}</div>
          </template>
          <template v-if="column.key === 'issue_type'">
            <a-tag :color="issueTypeColor[record.issue_type] || 'default'">{{ record.issue_type }}</a-tag>
          </template>
          <template v-if="column.key === 'principal'">
            <template v-if="record.principal_stolen">
              <a-tag color="red">被骗</a-tag>
              <div class="amount-loss">${{ Number(record.principal_amount || 0).toFixed(2) }}</div>
            </template>
            <span v-else class="text-safe">正常</span>
          </template>
          <template v-if="column.key === 'issue_status'">
            <a-tag :color="statusColorMap[record.issue_status] || 'default'">{{ record.issue_status }}</a-tag>
          </template>
          <template v-if="column.key === 'resolution'">
            <template v-if="record.issue_status === '已替换订单' && record.new_amazon_order_id">
              <div class="cell-new-order">{{ record.new_amazon_order_id }}</div>
              <div v-if="record.profit_diff > 0" class="cell-profit">差价+${{ Number(record.profit_diff).toFixed(2) }}</div>
            </template>
            <template v-else-if="record.issue_status === '已补单' && record.replacement_buyer_name">
              <div class="cell-replacement">{{ record.replacement_buyer_name }}</div>
              <div v-if="record.replacement_sub_order_number" class="cell-meta">{{ record.replacement_sub_order_number }}</div>
            </template>
            <template v-else-if="record.issue_status === '已退款给客户' && record.refund_to_client_method">
              <div class="cell-refund-method">{{ record.refund_to_client_method }}</div>
              <div class="cell-refund-amount">退${{ Number(record.refund_to_client_amount || 0).toFixed(2) }}</div>
            </template>
            <span v-else class="text-gray">--</span>
          </template>
          <template v-if="column.key === 'action'">
            <a-button type="link" size="small" @click="openDetail(record)">处理</a-button>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 处理抽屉 -->
    <a-drawer
      v-model:open="drawerOpen"
      :title="`问题单 · ${currentIssue?.sub_order_number || ''}`"
      width="700"
      placement="right"
      destroy-on-close
    >
      <template v-if="currentIssue">
        <!-- 子订单信息 -->
        <div class="drawer-section">
          <div class="drawer-section-title">子订单信息</div>
          <div class="detail-grid-3">
            <div class="detail-item">
              <span class="detail-label">子订单号</span>
              <span class="detail-val mono">{{ currentIssue.sub_order_number }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">主订单号</span>
              <span class="detail-val mono">{{ currentIssue.order_number }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">亚马逊订单号</span>
              <span class="detail-val mono">{{ currentIssue.old_amazon_order_id || '--' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">ASIN</span>
              <span class="detail-val">{{ currentIssue.asin }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">店铺</span>
              <span class="detail-val">{{ currentIssue.store_name }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">产品价格</span>
              <span class="detail-val amount-usd">${{ Number(currentIssue.product_price || 0).toFixed(2) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">佣金</span>
              <span class="detail-val">¥{{ Number(currentIssue.commission_fee || 0).toFixed(2) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">客户</span>
              <span class="detail-val">{{ currentIssue.customer_name || '--' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">商务</span>
              <span class="detail-val">{{ currentIssue.business_manager_name || '--' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">买手</span>
              <span class="detail-val">{{ currentIssue.buyer_name || '--' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">业务员</span>
              <span class="detail-val">{{ currentIssue.staff_name || '--' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">问题类型</span>
              <a-tag :color="issueTypeColor[currentIssue.issue_type] || 'default'" style="margin:0">{{ currentIssue.issue_type }}</a-tag>
            </div>
            <div v-if="currentIssue.description" class="detail-item full3">
              <span class="detail-label">问题描述</span>
              <span class="detail-val">{{ currentIssue.description }}</span>
            </div>
          </div>
        </div>

        <!-- 本金状态 -->
        <div class="drawer-section">
          <div class="drawer-section-title">本金情况</div>
          <div class="principal-row">
            <a-radio-group v-model:value="editForm.principal_stolen" button-style="solid" @change="onPrincipalChange">
              <a-radio-button :value="false">本金正常</a-radio-button>
              <a-radio-button :value="true">本金被骗</a-radio-button>
            </a-radio-group>
            <a-input-number
              v-if="editForm.principal_stolen"
              v-model:value="editForm.principal_amount"
              :min="0"
              :precision="2"
              prefix="$"
              placeholder="被骗金额"
              style="width:160px"
            />
          </div>
        </div>

        <!-- 根据状态展示不同处理区域 -->
        <div class="drawer-section">
          <div class="drawer-section-title">处理方式</div>
          <a-radio-group v-model:value="editForm.issue_status" button-style="solid" style="margin-bottom:16px">
            <a-radio-button v-for="s in statusOptions" :key="s" :value="s">{{ s }}</a-radio-button>
          </a-radio-group>

          <!-- 已替换订单 -->
          <template v-if="editForm.issue_status === '已替换订单'">
            <div class="handle-box">
              <a-form layout="vertical">
                <a-form-item label="新亚马逊订单号 (老外提供的替换订单)">
                  <a-input v-model:value="editForm.new_amazon_order_id" placeholder="输入新的亚马逊订单号..." />
                </a-form-item>
                <a-form-item label="差价盈利 (本次退款少退的部分，记为我们的利润)">
                  <a-input-number v-model:value="editForm.profit_diff" :min="0" :precision="2" prefix="$" style="width:200px" />
                </a-form-item>
              </a-form>
            </div>
          </template>

          <!-- 需补单 / 已补单 -->
          <template v-if="editForm.issue_status === '需补单' || editForm.issue_status === '已补单'">
            <div class="handle-box">
              <a-form layout="vertical">
                <a-form-item label="补单买手">
                  <a-select
                    v-model:value="editForm.replacement_buyer_id"
                    show-search
                    :filter-option="false"
                    placeholder="搜索买手..."
                    @search="searchBuyers"
                    style="width:100%"
                    allow-clear
                    :not-found-content="searchingBuyers ? '搜索中...' : '无结果'"
                    @change="onReplacementBuyerChange"
                  >
                    <a-select-option v-for="b in buyerResults" :key="b.id" :value="b.id">
                      <div class="buyer-option">
                        <span>{{ b.buyer_number }} - {{ b.name }}</span>
                        <span class="buyer-option-meta">{{ b.country }} · 完成 {{ b.total_completed }} 单</span>
                      </div>
                    </a-select-option>
                  </a-select>
                </a-form-item>
                <a-form-item label="补单子订单号 (可选)">
                  <a-input v-model:value="editForm.replacement_sub_order_number" placeholder="关联新的子订单号..." />
                </a-form-item>
                <a-form-item label="损失金额">
                  <a-input-number v-model:value="editForm.loss_amount" :min="0" :precision="2" prefix="$" style="width:200px" />
                </a-form-item>
                <div class="blacklist-action">
                  <a-checkbox v-model:checked="editForm.blacklist_buyer">将原买手加入黑名单</a-checkbox>
                </div>
              </a-form>
            </div>
          </template>

          <!-- 已退款给客户 -->
          <template v-if="editForm.issue_status === '已退款给客户'">
            <div class="handle-box handle-box-refund">
              <div class="refund-hint">客户不要求补单，直接退还本金和佣金</div>
              <a-form layout="vertical">
                <a-form-item label="返款方式">
                  <a-radio-group v-model:value="editForm.refund_to_client_method" button-style="solid">
                    <a-radio-button value="PayPal">PayPal</a-radio-button>
                    <a-radio-button value="礼品卡">礼品卡</a-radio-button>
                    <a-radio-button value="转账">转账</a-radio-button>
                    <a-radio-button value="其他">其他</a-radio-button>
                  </a-radio-group>
                </a-form-item>
                <a-form-item label="返款金额 (本金 + 佣金)">
                  <a-input-number
                    v-model:value="editForm.refund_to_client_amount"
                    :min="0"
                    :precision="2"
                    prefix="$"
                    style="width:200px"
                    :placeholder="`参考产品价格 $${Number(currentIssue.product_price || 0).toFixed(2)}`"
                  />
                  <div class="refund-calc-hint">
                    产品价格 ${{ Number(currentIssue.product_price || 0).toFixed(2) }} + 佣金 ¥{{ Number(currentIssue.commission_fee || 0).toFixed(2) }}
                  </div>
                </a-form-item>
                <a-form-item label="返款备注">
                  <a-textarea v-model:value="editForm.refund_to_client_notes" :rows="2" placeholder="如转账凭证、收款账号等..." />
                </a-form-item>
                <div class="blacklist-action">
                  <a-checkbox v-model:checked="editForm.blacklist_buyer">将买手加入黑名单</a-checkbox>
                </div>
              </a-form>
            </div>
          </template>
        </div>

        <!-- 处理备注 -->
        <div class="drawer-section">
          <div class="drawer-section-title">处理备注</div>
          <a-textarea v-model:value="editForm.resolution_notes" :rows="3" placeholder="记录处理过程、沟通情况等..." />
        </div>

        <div class="drawer-footer">
          <a-popconfirm title="确定删除此问题单?" @confirm="handleDelete">
            <a-button danger>删除</a-button>
          </a-popconfirm>
          <div style="flex:1"></div>
          <a-button @click="drawerOpen = false">关闭</a-button>
          <a-button type="primary" :loading="saving" @click="handleUpdate">保存</a-button>
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
const saving = ref(false)
const issues = ref<any[]>([])
const filterStatus = ref<string | undefined>(undefined)
const filterType = ref<string | undefined>(undefined)
const filterStolen = ref<string | undefined>(undefined)
const filterSearch = ref('')
const drawerOpen = ref(false)
const currentIssue = ref<any>(null)
const pagination = ref({ current: 1, pageSize: 20, total: 0 })

const issueTypes = ['不下单', '取消', '退款', '无此订单']
const statusOptions = ['待处理', '处理中', '已替换订单', '需补单', '已补单', '已退款给客户', '已关闭']

const issueTypeColor: Record<string, string> = {
  '不下单': 'orange',
  '取消': 'red',
  '退款': 'blue',
  '无此订单': 'volcano',
}

const statusColorMap: Record<string, string> = {
  '待处理': 'orange',
  '处理中': 'processing',
  '已替换订单': 'cyan',
  '需补单': 'red',
  '已补单': 'green',
  '已退款给客户': 'purple',
  '已关闭': 'default',
}

const stats = ref({ pending: 0, processing: 0, replaced: 0, needReorder: 0, reordered: 0, refundedToClient: 0 })

const buyerResults = ref<any[]>([])
const searchingBuyers = ref(false)

const editForm = reactive({
  principal_stolen: false,
  principal_amount: 0,
  new_amazon_order_id: '',
  profit_diff: 0,
  loss_amount: 0,
  replacement_buyer_id: undefined as string | undefined,
  replacement_buyer_name: '',
  replacement_sub_order_number: '',
  refund_to_client_method: '',
  refund_to_client_amount: 0,
  refund_to_client_notes: '',
  resolution_notes: '',
  issue_status: '待处理',
  blacklist_buyer: false,
})

const columns = [
  { title: '子订单信息', key: 'sub_info', width: 200 },
  { title: '客户/商务', key: 'client', width: 140 },
  { title: '买手/业务员', key: 'buyer', width: 120 },
  { title: '问题类型', key: 'issue_type', width: 95 },
  { title: '本金', key: 'principal', width: 100 },
  { title: '状态', key: 'issue_status', width: 110 },
  { title: '处理结果', key: 'resolution', width: 170 },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 100,
    customRender: ({ text }: any) => text ? dayjs(text).format('MM-DD HH:mm') : '',
  },
  { title: '操作', key: 'action', width: 70, fixed: 'right' as const },
]

async function loadStats() {
  const { data } = await supabase.from('after_sale_issues').select('issue_status')
  if (!data) return
  stats.value = {
    pending: data.filter(d => d.issue_status === '待处理').length,
    processing: data.filter(d => d.issue_status === '处理中').length,
    replaced: data.filter(d => d.issue_status === '已替换订单').length,
    needReorder: data.filter(d => d.issue_status === '需补单').length,
    reordered: data.filter(d => d.issue_status === '已补单').length,
    refundedToClient: data.filter(d => d.issue_status === '已退款给客户').length,
  }
}

async function load() {
  loading.value = true
  try {
    let query = supabase
      .from('after_sale_issues')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (filterStatus.value) query = query.eq('issue_status', filterStatus.value)
    if (filterType.value) query = query.eq('issue_type', filterType.value)
    if (filterStolen.value === 'yes') query = query.eq('principal_stolen', true)
    if (filterStolen.value === 'no') query = query.eq('principal_stolen', false)
    if (filterSearch.value) {
      const kw = `%${filterSearch.value}%`
      query = query.or(`sub_order_number.ilike.${kw},buyer_name.ilike.${kw},customer_name.ilike.${kw},asin.ilike.${kw},old_amazon_order_id.ilike.${kw},business_manager_name.ilike.${kw}`)
    }
    const from = (pagination.value.current - 1) * pagination.value.pageSize
    query = query.range(from, from + pagination.value.pageSize - 1)
    const { data, count, error } = await query
    if (error) throw error
    issues.value = data || []
    pagination.value.total = count || 0
  } finally {
    loading.value = false
  }
  loadStats()
}

let buyerSearchTimer: ReturnType<typeof setTimeout> | null = null
function searchBuyers(keyword: string) {
  if (buyerSearchTimer) clearTimeout(buyerSearchTimer)
  if (!keyword) { buyerResults.value = []; return }
  buyerSearchTimer = setTimeout(async () => {
    searchingBuyers.value = true
    const kw = `%${keyword}%`
    const { data } = await supabase
      .from('erp_buyers')
      .select('id, buyer_number, name, country, total_completed')
      .neq('status', '黑名单')
      .or(`name.ilike.${kw},buyer_number.ilike.${kw}`)
      .limit(20)
    buyerResults.value = data || []
    searchingBuyers.value = false
  }, 300)
}

function onReplacementBuyerChange(buyerId: string) {
  const b = buyerResults.value.find(x => x.id === buyerId)
  editForm.replacement_buyer_name = b?.name || ''
}

function onPrincipalChange() {
  if (!editForm.principal_stolen) {
    editForm.principal_amount = 0
    editForm.blacklist_buyer = false
  } else {
    editForm.principal_amount = Number(currentIssue.value?.product_price || 0)
  }
}

function openDetail(record: any) {
  currentIssue.value = record
  Object.assign(editForm, {
    principal_stolen: record.principal_stolen || false,
    principal_amount: Number(record.principal_amount || 0),
    new_amazon_order_id: record.new_amazon_order_id || '',
    profit_diff: Number(record.profit_diff || 0),
    loss_amount: Number(record.loss_amount || 0),
    replacement_buyer_id: record.replacement_buyer_id || undefined,
    replacement_buyer_name: record.replacement_buyer_name || '',
    replacement_sub_order_number: record.replacement_sub_order_number || '',
    refund_to_client_method: record.refund_to_client_method || '',
    refund_to_client_amount: Number(record.refund_to_client_amount || 0),
    refund_to_client_notes: record.refund_to_client_notes || '',
    resolution_notes: record.resolution_notes || '',
    issue_status: record.issue_status,
    blacklist_buyer: false,
  })
  drawerOpen.value = true
}

async function handleUpdate() {
  if (!currentIssue.value) return
  saving.value = true
  try {
    const update: any = {
      principal_stolen: editForm.principal_stolen,
      principal_amount: editForm.principal_amount,
      new_amazon_order_id: editForm.new_amazon_order_id,
      profit_diff: editForm.profit_diff,
      loss_amount: editForm.loss_amount,
      replacement_buyer_id: editForm.replacement_buyer_id || null,
      replacement_buyer_name: editForm.replacement_buyer_name,
      replacement_sub_order_number: editForm.replacement_sub_order_number,
      refund_to_client_method: editForm.refund_to_client_method,
      refund_to_client_amount: editForm.refund_to_client_amount,
      refund_to_client_notes: editForm.refund_to_client_notes,
      resolution_notes: editForm.resolution_notes,
      issue_status: editForm.issue_status,
    }

    const closedStatuses = ['已替换订单', '已补单', '已退款给客户', '已关闭']
    if (closedStatuses.includes(editForm.issue_status)) {
      update.resolved_at = new Date().toISOString()
    }
    if (editForm.issue_status === '已退款给客户') {
      update.refund_to_client_at = new Date().toISOString()
    }

    const { error } = await supabase.from('after_sale_issues').update(update).eq('id', currentIssue.value.id)
    if (error) throw error

    if (editForm.blacklist_buyer && currentIssue.value.buyer_id) {
      const reason = editForm.issue_status === '已退款给客户'
        ? `售后问题单 ${currentIssue.value.sub_order_number} - 本金被骗，已退款给客户`
        : `售后问题单 ${currentIssue.value.sub_order_number} - 本金被骗，需补单`
      await supabase.from('erp_buyers').update({
        status: '黑名单',
        blacklist_reason: reason,
      }).eq('id', currentIssue.value.buyer_id)
      message.info(`买手 ${currentIssue.value.buyer_name} 已加入黑名单`)
    }

    if (editForm.new_amazon_order_id && currentIssue.value.sub_order_id) {
      await supabase.from('sub_orders').update({
        amazon_order_id: editForm.new_amazon_order_id,
      }).eq('id', currentIssue.value.sub_order_id)
    }

    message.success('已保存')
    drawerOpen.value = false
    load()
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  if (!currentIssue.value) return
  const { error } = await supabase.from('after_sale_issues').delete().eq('id', currentIssue.value.id)
  if (error) { message.error('删除失败'); return }
  message.success('已删除')
  drawerOpen.value = false
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

.stats-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
.stat-card {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  text-align: center;
  border: 1px solid #f0f0f0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.stat-val { font-size: 24px; font-weight: 800; }
.stat-label { font-size: 11px; color: #6b7280; margin-top: 4px; }
.stat-pending .stat-val { color: #f59e0b; }
.stat-processing .stat-val { color: #3b82f6; }
.stat-replaced .stat-val { color: #06b6d4; }
.stat-need-reorder .stat-val { color: #ef4444; }
.stat-reordered .stat-val { color: #10b981; }
.stat-refunded .stat-val { color: #8b5cf6; }

.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.total-hint { font-size: 12px; color: #9ca3af; margin-left: auto; }

.link-text { color: #2563eb; cursor: pointer; font-family: 'Courier New', monospace; font-size: 12px; font-weight: 600; }
.cell-info { display: flex; flex-direction: column; gap: 2px; }
.cell-meta { font-size: 11px; color: #9ca3af; }
.cell-amazon-id { font-size: 10px; color: #b0b8c4; font-family: 'Courier New', monospace; }
.cell-client-name { font-weight: 600; font-size: 13px; color: #1a1a2e; }
.amount-usd { font-weight: 700; color: #dc2626; }
.amount-loss { font-size: 12px; font-weight: 700; color: #dc2626; }
.text-safe { font-size: 12px; color: #10b981; font-weight: 500; }
.text-gray { color: #9ca3af; font-size: 12px; }
.cell-new-order { font-family: 'Courier New', monospace; font-size: 11px; color: #059669; font-weight: 600; }
.cell-profit { font-size: 11px; color: #10b981; }
.cell-replacement { font-size: 12px; color: #374151; }
.cell-refund-method { font-size: 12px; color: #8b5cf6; font-weight: 600; }
.cell-refund-amount { font-size: 11px; color: #dc2626; font-weight: 700; }

.drawer-section { margin-bottom: 24px; }
.drawer-section-title { font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #f0f0f0; }

.detail-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px 16px; }
.detail-item { display: flex; flex-direction: column; gap: 3px; }
.detail-item.full3 { grid-column: 1 / -1; }
.detail-label { font-size: 11px; color: #9ca3af; font-weight: 500; }
.detail-val { font-size: 13px; color: #1a1a2e; }
.detail-val.mono { font-family: 'Courier New', monospace; font-size: 12px; }

.principal-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

.handle-box {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
}
.handle-box-refund {
  background: #fdf4ff;
  border-color: #e9d5ff;
}
.refund-hint {
  font-size: 12px;
  color: #7c3aed;
  background: #ede9fe;
  border-radius: 6px;
  padding: 6px 10px;
  margin-bottom: 14px;
}
.refund-calc-hint { font-size: 11px; color: #9ca3af; margin-top: 4px; }

.blacklist-action { margin-top: 8px; padding: 8px 12px; background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; }

.buyer-option { display: flex; flex-direction: column; }
.buyer-option-meta { font-size: 11px; color: #9ca3af; }

.drawer-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #f0f0f0; }

@media (max-width: 900px) {
  .stats-row { grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .stat-card { padding: 10px; }
  .stat-val { font-size: 18px; }
  .detail-grid-3 { grid-template-columns: 1fr 1fr; }
}
</style>
