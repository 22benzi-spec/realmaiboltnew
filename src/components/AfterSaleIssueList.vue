<template>
  <div class="after-sale-list">
    <!-- <div v-if="props.showStats" class="stats-row">
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
        <div class="stat-label">已替换单号</div>
      </div>
      <div class="stat-card stat-need-reorder">
        <div class="stat-val">{{ stats.needReorder }}</div>
        <div class="stat-label">需补单</div>
      </div>
      <div class="stat-card stat-reordered">
        <div class="stat-val">{{ stats.reordered }}</div>
        <div class="stat-label">已补单</div>
      </div>
      <div class="stat-card stat-closed">
        <div class="stat-val">{{ stats.closed }}</div>
        <div class="stat-label">已关闭</div>
      </div>
      <div class="stat-card stat-refunded">
        <div class="stat-val">{{ stats.noNeed }}</div>
        <div class="stat-label">无需处理</div>
      </div>
    </div> -->

    <div class="card-panel">
      <div class="toolbar">
        <a-select v-model:value="filterType" style="width: 110px" @change="load" allow-clear placeholder="订单状态">
          <a-select-option v-for="t in issueTypes" :key="t" :value="t">{{ t }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterStatus" style="width: 120px" @change="load" allow-clear placeholder="处理进度">
          <a-select-option v-for="s in processStatusOptions" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterResolutionResult" style="width: 140px" @change="load" allow-clear placeholder="处理结果">
          <a-select-option v-for="s in resolutionResultOptions" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterPrincipalStatus" style="width: 120px" @change="load" allow-clear placeholder="本金状态">
          <a-select-option v-for="s in principalStatusOptions" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-input-search
          v-model:value="filterSearch"
          placeholder="搜索子订单号/买手/客户/ASIN..."
          style="width: 260px"
          @search="load"
          allow-clear
        />
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
          <template v-if="column.key === 'order_status'">
            <a-tag :color="issueTypeColor[record.issue_type] || 'default'">{{ record.issue_type }}</a-tag>
          </template>
          <template v-if="column.key === 'principal_status'">
            <template v-if="shouldShowPrincipalAmount(record)">
              <a-tag :color="getPrincipalStatusColor(record)">{{ getPrincipalStatus(record) }}</a-tag>
              <div class="amount-loss">${{ getPrincipalAmount(record).toFixed(2) }}</div>
              <div v-if="record.principal_reason" class="cell-meta">{{ record.principal_reason }}</div>
            </template>
            <a-tag v-else :color="getPrincipalStatusColor(record)">{{ getPrincipalStatus(record) }}</a-tag>
          </template>
          <template v-if="column.key === 'after_sale_progress'">
            <div class="after-sale-progress-cell">
              <div class="after-sale-progress-main">
                <a-tag :color="afterSaleProgressTagColor(record)" class="after-sale-progress-tag">{{ getAfterSaleProgressMainStatus(record) }}</a-tag>
                <a-tag v-if="showPendingReorderAlert(record)" color="red" class="after-sale-alert-tag">待补单</a-tag>
              </div>
              <div class="after-sale-progress-sub">{{ getAfterSaleProgressSubText(record) }}</div>
            </div>
          </template>
          <template v-if="column.key === 'remark'">
            <span v-if="record.resolution_notes" class="remark-text">{{ record.resolution_notes }}</span>
            <span v-else class="text-gray">--</span>
          </template>
          <template v-if="column.key === 'action'">
            <div class="action-btns">
              <a-button type="link" size="small" @click="openDetail(record)">详情</a-button>
              <a-button type="link" size="small" @click="openHandle(record)">处理</a-button>
            </div>
          </template>
        </template>
      </a-table>
    </div>

    <a-drawer
      v-model:open="drawerOpen"
      :title="`${drawerMode === 'handle' ? '操作问题单' : '问题单详情'} · ${currentIssue?.sub_order_number || ''}`"
      width="700"
      placement="right"
      destroy-on-close
    >
      <template v-if="currentIssue">
        <div v-if="drawerMode === 'detail'" class="drawer-section">
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
              <span class="detail-label">订单状态</span>
              <a-tag :color="issueTypeColor[currentIssue.issue_type] || 'default'" style="margin: 0">{{ currentIssue.issue_type }}</a-tag>
            </div>
            <div v-if="currentIssue.description" class="detail-item full3">
              <span class="detail-label">问题描述</span>
              <span class="detail-val">{{ currentIssue.description }}</span>
            </div>
          </div>
        </div>

        <div v-if="drawerMode === 'detail'" class="drawer-section">
          <div class="drawer-section-title">本金情况</div>
          <div class="detail-grid-3">
            <div class="detail-item">
              <span class="detail-label">本金状态</span>
              <span class="detail-val">{{ getPrincipalStatus(currentIssue) }}</span>
            </div>
            <div v-if="shouldShowPrincipalAmount(currentIssue)" class="detail-item">
              <span class="detail-label">{{ currentIssue.issue_type === '本金多返' ? '差价金额' : '损失金额' }}</span>
              <span class="detail-val amount-usd">${{ getPrincipalAmount(currentIssue).toFixed(2) }}</span>
            </div>
            <div v-if="currentIssue.principal_reason" class="detail-item">
              <span class="detail-label">{{ currentIssue.issue_type === '本金多返' ? '处理说明' : '损失原因' }}</span>
              <span class="detail-val">{{ currentIssue.principal_reason }}</span>
            </div>
          </div>
        </div>

        <div class="drawer-section">
          <div class="drawer-section-title">{{ drawerMode === 'handle' ? '操作' : '处理结果' }}</div>
          <template v-if="drawerMode === 'detail'">
            <div class="detail-grid-3">
              <div class="detail-item">
                <span class="detail-label">处理状态</span>
                <a-tag :color="statusColorMap[normalizeIssueStatus(currentIssue.issue_status)] || 'default'" style="margin: 0">
                  {{ normalizeIssueStatus(currentIssue.issue_status) }}
                </a-tag>
              </div>
              <div v-if="currentIssue.new_amazon_order_id" class="detail-item">
                <span class="detail-label">新亚马逊订单号</span>
                <span class="detail-val mono">{{ currentIssue.new_amazon_order_id }}</span>
              </div>
              <div v-if="currentIssue.profit_diff" class="detail-item">
                <span class="detail-label">差价盈利</span>
                <span class="detail-val amount-usd">${{ Number(currentIssue.profit_diff || 0).toFixed(2) }}</span>
              </div>
              <div v-if="currentIssue.replacement_buyer_name" class="detail-item">
                <span class="detail-label">补单买手</span>
                <span class="detail-val">{{ currentIssue.replacement_buyer_name }}</span>
              </div>
              <div v-if="currentIssue.replacement_sub_order_number" class="detail-item">
                <span class="detail-label">补单子订单号</span>
                <span class="detail-val mono">{{ currentIssue.replacement_sub_order_number }}</span>
              </div>
              <div v-if="currentIssue.loss_amount" class="detail-item">
                <span class="detail-label">损失金额</span>
                <span class="detail-val amount-usd">${{ Number(currentIssue.loss_amount || 0).toFixed(2) }}</span>
              </div>
              <div v-if="currentIssue.refund_to_client_method" class="detail-item">
                <span class="detail-label">返款方式</span>
                <span class="detail-val">{{ currentIssue.refund_to_client_method }}</span>
              </div>
              <div v-if="currentIssue.refund_to_client_amount" class="detail-item">
                <span class="detail-label">返款金额</span>
                <span class="detail-val amount-usd">${{ Number(currentIssue.refund_to_client_amount || 0).toFixed(2) }}</span>
              </div>
              <div v-if="currentIssue.refund_to_client_notes" class="detail-item full3">
                <span class="detail-label">返款备注</span>
                <span class="detail-val">{{ currentIssue.refund_to_client_notes }}</span>
              </div>
            </div>
          </template>
          <template v-else>
          <div class="handle-current-status">
            当前状态：
            <a-tag :color="statusColorMap[normalizeIssueStatus(currentIssue.issue_status)] || 'default'">
              {{ normalizeIssueStatus(currentIssue.issue_status) }}
            </a-tag>
          </div>
          <div class="handle-action-grid">
            <a-button :type="handleAction === 'replace-order' ? 'primary' : 'default'" @click="setHandleAction('replace-order')">替换单号</a-button>
            <a-button :type="handleAction === 'reorder' ? 'primary' : 'default'" @click="setHandleAction('reorder')">补单</a-button>
            <a-button :type="handleAction === 'mark-need-reorder' ? 'primary' : 'default'" @click="setHandleAction('mark-need-reorder')">需补单</a-button>
            <a-button
              v-if="currentIssue?.issue_type === '本金多返' || normalizeIssueStatus(currentIssue?.issue_status) === '已追回本金'"
              :type="handleAction === 'recover-principal' ? 'primary' : 'default'"
              @click="setHandleAction('recover-principal')"
            >追回本金</a-button>
            <a-button :type="handleAction === 'mark-closed' ? 'primary' : 'default'" @click="setHandleAction('mark-closed')">关闭此单</a-button>
            <a-button :type="handleAction === 'mark-no-need' ? 'primary' : 'default'" @click="setHandleAction('mark-no-need')">无需处理</a-button>
          </div>

          <template v-if="handleAction === 'replace-order'">
            <div class="handle-box">
              <a-form layout="vertical">
                <a-form-item label="新亚马逊订单号">
                  <a-input v-model:value="editForm.new_amazon_order_id" placeholder="输入新的亚马逊订单号..." />
                </a-form-item>
              </a-form>
            </div>
          </template>

          <template v-if="handleAction === 'reorder'">
            <div class="handle-box">
              <a-form layout="vertical">
                <a-form-item label="补单买手">
                  <a-select
                    v-model:value="editForm.replacement_buyer_id"
                    show-search
                    :filter-option="false"
                    placeholder="搜索买手..."
                    @search="searchBuyers"
                    style="width: 100%"
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
                <a-form-item label="补单子订单号">
                  <a-input v-model:value="editForm.replacement_sub_order_number" placeholder="关联新的子订单号..." />
                </a-form-item>
              </a-form>
            </div>
          </template>

          <template v-if="handleAction === 'mark-need-reorder' || handleAction === 'recover-principal' || handleAction === 'mark-closed' || handleAction === 'mark-no-need'">
            <div class="handle-box">
              <div class="handle-action-hint">
                {{ getHandleActionHint() }}
              </div>
            </div>
          </template>
          </template>
        </div>

        <div v-if="drawerMode === 'detail'" class="drawer-section">
          <div class="drawer-section-title">备注</div>
          <span v-if="currentIssue.resolution_notes" class="remark-text">{{ currentIssue.resolution_notes }}</span>
          <span v-else class="text-gray">--</span>
        </div>

        <div class="drawer-footer">
          <div style="flex: 1"></div>
          <a-button @click="drawerOpen = false">关闭</a-button>
          <a-button v-if="drawerMode === 'handle'" type="primary" :loading="saving" @click="handleUpdate">确认操作</a-button>
        </div>
      </template>
    </a-drawer>

    <a-modal
      v-model:open="actionModalOpen"
      :title="actionModalType === 'replace-order' ? '修改订单号' : '补单'"
      :confirm-loading="saving"
      @ok="submitActionModal"
      @cancel="closeActionModal"
    >
      <a-form layout="vertical">
        <a-form-item v-if="actionModalType === 'replace-order'" label="新亚马逊订单号">
          <a-input v-model:value="editForm.new_amazon_order_id" placeholder="输入新的亚马逊订单号..." />
        </a-form-item>
        <template v-if="actionModalType === 'reorder'">
          <a-form-item label="补单买手">
            <a-select
              v-model:value="editForm.replacement_buyer_id"
              show-search
              :filter-option="false"
              placeholder="搜索买手..."
              @search="searchBuyers"
              style="width: 100%"
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
          <a-form-item label="补单子订单号">
            <a-input v-model:value="editForm.replacement_sub_order_number" placeholder="关联新的子订单号..." />
          </a-form-item>
        </template>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

const props = withDefaults(defineProps<{
  staffId?: string
  issueId?: string
  subOrder?: string
  showStats?: boolean
}>(), {
  staffId: undefined,
  issueId: undefined,
  subOrder: undefined,
  showStats: true,
})

const emit = defineEmits<{
  (e: 'changed'): void
}>()

const MOCK_AFTER_SALE_ISSUES_KEY = 'mock_after_sale_issue_list_v1'
const MOCK_AFTER_SALE_ISSUES = [
  {
    id: 'mock_after_sale_principal_overpaid',
    issue_number: 'ASI-MOCK-20260415-0001',
    sub_order_id: 'mock_sub_order_principal_overpaid',
    sub_order_number: 'SUB-MOCK-AS-2001',
    order_number: 'MOCK-AS-2001',
    buyer_name: 'Liam Carter',
    staff_name: '王浩',
    customer_name: '深圳云帆科技',
    business_manager_name: '陈婷',
    asin: 'B0MOCKAS2001',
    store_name: 'US-Store-09',
    product_price: 18.9,
    issue_type: '本金多返',
    issue_status: '待处理',
    principal_status: '待追回',
    principal_amount: 4.5,
    principal_reason: '原应返 18.90 USD，误返 23.40 USD，待追回差价。',
    old_amazon_order_id: '333-3333333-3333333',
    resolution_notes: '已联系买手确认退回多返本金，等待到账。',
    description: '财务多返了 4.50 USD，本金差价待追回。',
    created_at: '2026-04-15T09:30:00.000Z',
    updated_at: '2026-04-15T10:20:00.000Z',
  },
]

const loading = ref(false)
const saving = ref(false)
const issues = ref<any[]>([])
const filterStatus = ref<string | undefined>(undefined)
const filterType = ref<string | undefined>(undefined)
const filterResolutionResult = ref<string | undefined>(undefined)
const filterPrincipalStatus = ref<string | undefined>(undefined)
const filterSearch = ref('')
const drawerOpen = ref(false)
const currentIssue = ref<any>(null)
const actionModalOpen = ref(false)
const actionModalType = ref<'replace-order' | 'reorder' | ''>('')
const drawerMode = ref<'detail' | 'handle'>('detail')
const handleAction = ref<'replace-order' | 'reorder' | 'mark-need-reorder' | 'recover-principal' | 'mark-closed' | 'mark-no-need' | ''>('')
const pagination = ref({ current: 1, pageSize: 20, total: 0 })

const issueTypes = ['不下单', '取消', '退款', '无此订单', '本金多返']
const processStatusOptions = ['待处理', '处理中', '已处理']
const resolutionResultOptions = ['已替换单号', '已补新单', '已追回本金', '已关闭', '无需处理']
const principalStatusOptions = ['正常', '待确定', '待追回', '已损失']

const issueTypeColor: Record<string, string> = {
  '不下单': 'orange',
  '取消': 'red',
  '退款': 'blue',
  '无此订单': 'volcano',
  '本金多返': 'gold',
}

const statusColorMap: Record<string, string> = {
  '待处理': 'orange',
  '处理中': 'processing',
  '已处理': 'blue',
  '已替换单号': 'cyan',
  '需补单': 'red',
  '已补单': 'green',
  '已追回本金': 'green',
  '无需处理': 'purple',
  '已关闭': 'default',
}

const stats = ref({ pending: 0, processing: 0, handled: 0, replaced: 0, needReorder: 0, reordered: 0, closed: 0, noNeed: 0 })

const buyerResults = ref<any[]>([])
const searchingBuyers = ref(false)

const editForm = reactive({
  principal_status: '待确定',
  principal_reason: '',
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
  { title: '订单状态', key: 'order_status', width: 95 },
  { title: '本金状态', key: 'principal_status', width: 110 },
  { title: '售后进度', key: 'after_sale_progress', width: 220 },
  { title: '备注', key: 'remark', width: 180 },
  {
    title: '创建时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 100,
    customRender: ({ text }: any) => text ? dayjs(text).format('MM-DD HH:mm') : '',
  },
  {
    title: '更新时间',
    dataIndex: 'updated_at',
    key: 'updated_at',
    width: 100,
    customRender: ({ text }: any) => text ? dayjs(text).format('MM-DD HH:mm') : '',
  },
  { title: '操作', key: 'action', width: 300, fixed: 'right' as const },
]

async function loadStats() {
  let query = supabase.from('after_sale_issues').select('issue_status')
  query = applyIssueFilters(query, { includeStatusFilter: false })
  const { data } = await query
  if (!data) return
  stats.value = {
    pending: data.filter(d => normalizeIssueStatus(d.issue_status) === '待处理').length,
    processing: data.filter(d => normalizeIssueStatus(d.issue_status) === '处理中').length,
    handled: data.filter(d => normalizeIssueStatus(d.issue_status) === '已处理').length,
    replaced: data.filter(d => normalizeIssueStatus(d.issue_status) === '已替换单号').length,
    needReorder: data.filter(d => normalizeIssueStatus(d.issue_status) === '需补单').length,
    reordered: data.filter(d => normalizeIssueStatus(d.issue_status) === '已补单').length,
    closed: data.filter(d => normalizeIssueStatus(d.issue_status) === '已关闭').length,
    noNeed: data.filter(d => normalizeIssueStatus(d.issue_status) === '无需处理').length,
  }
}

function getSearchValue() {
  return props.subOrder ? String(props.subOrder) : filterSearch.value.trim()
}

function applyIssueFilters<T>(query: T, options?: { includeStatusFilter?: boolean }) {
  let nextQuery: any = query
  if (props.staffId) nextQuery = nextQuery.eq('staff_id', props.staffId)
  if (props.issueId) nextQuery = nextQuery.eq('id', props.issueId)
  if (options?.includeStatusFilter !== false && filterStatus.value) nextQuery = applyProcessStatusFilter(nextQuery, filterStatus.value)
  if (filterResolutionResult.value) nextQuery = applyResolutionResultFilter(nextQuery, filterResolutionResult.value)
  if (filterType.value) nextQuery = nextQuery.eq('issue_type', filterType.value)
  if (filterPrincipalStatus.value) nextQuery = applyPrincipalStatusFilter(nextQuery, filterPrincipalStatus.value)

  const searchVal = getSearchValue()
  if (searchVal) {
    filterSearch.value = searchVal
    const kw = `%${searchVal}%`
    nextQuery = nextQuery.or(`sub_order_number.ilike.${kw},buyer_name.ilike.${kw},customer_name.ilike.${kw},asin.ilike.${kw},old_amazon_order_id.ilike.${kw},business_manager_name.ilike.${kw}`)
  }

  return nextQuery
}

function applyProcessStatusFilter<T>(query: T, status: string) {
  let nextQuery: any = query
  if (status === '处理中') return nextQuery.in('issue_status', ['处理中', '需补单'])
  if (status === '已处理') return nextQuery.in('issue_status', ['已替换单号', '已替换订单', '已补单', '已追回本金', '已关闭', '无需处理', '已退款给客户'])
  return nextQuery.eq('issue_status', status)
}

function applyResolutionResultFilter<T>(query: T, result: string) {
  let nextQuery: any = query
  if (result === '已替换单号') return nextQuery.in('issue_status', ['已替换单号', '已替换订单'])
  if (result === '已补新单') return nextQuery.eq('issue_status', '已补单')
  if (result === '已追回本金') return nextQuery.eq('issue_status', '已追回本金')
  if (result === '无需处理') return nextQuery.in('issue_status', ['无需处理', '已退款给客户'])
  return nextQuery.eq('issue_status', result)
}

function applyPrincipalStatusFilter<T>(query: T, status: string) {
  let nextQuery: any = query
  if (status === '已损失') return nextQuery.in('principal_status', ['已损失', '损失'])
  return nextQuery.eq('principal_status', status)
}

async function load() {
  loading.value = true
  try {
    const filteredMockIssues = filterMockIssues(loadMockIssuesState())
    const mockCount = filteredMockIssues.length
    const pageStart = (pagination.value.current - 1) * pagination.value.pageSize
    const mockOnEarlierPages = Math.min(mockCount, pageStart)
    const mockOnCurrentPage = Math.max(Math.min(mockCount - pageStart, pagination.value.pageSize), 0)
    const dbPageSize = pagination.value.pageSize - mockOnCurrentPage

    let query = supabase
      .from('after_sale_issues')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    query = applyIssueFilters(query, { includeStatusFilter: true })

    if (dbPageSize > 0) {
      const dbFrom = Math.max(pageStart - mockOnEarlierPages, 0)
      query = query.range(dbFrom, dbFrom + dbPageSize - 1)
    } else {
      query = query.range(0, 0)
    }

    const { data, count, error } = await query
    if (error) throw error
    const mockPageRows = filteredMockIssues.slice(pageStart, pageStart + mockOnCurrentPage)
    const dbRows = dbPageSize > 0 ? (data || []) : []
    issues.value = [...mockPageRows, ...dbRows]
    pagination.value.total = (count || 0) + mockCount

    if ((props.issueId || props.subOrder) && issues.value.length === 1) {
      openDetail(issues.value[0])
    }
  } finally {
    loading.value = false
  }

  if (props.showStats) {
    await loadStats()
  }
}

function loadMockIssuesState() {
  if (typeof window === 'undefined') return MOCK_AFTER_SALE_ISSUES.map(item => ({ ...item }))
  try {
    const raw = window.localStorage.getItem(MOCK_AFTER_SALE_ISSUES_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    const seeded = Array.isArray(parsed) ? parsed : []
    const merged = [...seeded]
    MOCK_AFTER_SALE_ISSUES.forEach(seed => {
      if (!merged.some((item: any) => item.id === seed.id)) {
        merged.push({ ...seed })
      }
    })
    window.localStorage.setItem(MOCK_AFTER_SALE_ISSUES_KEY, JSON.stringify(merged))
    return merged
  } catch {
    return MOCK_AFTER_SALE_ISSUES.map(item => ({ ...item }))
  }
}

function saveMockIssuesState(nextIssues: any[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(MOCK_AFTER_SALE_ISSUES_KEY, JSON.stringify(nextIssues))
}

function isMockIssue(record: any) {
  return String(record?.id || '').startsWith('mock_after_sale_')
}

function filterMockIssues(records: any[]) {
  const keyword = getSearchValue().toLowerCase()
  return records.filter(record => {
    if (props.issueId && record.id !== props.issueId) return false
    if (filterType.value && record.issue_type !== filterType.value) return false
    if (filterStatus.value && getAfterSaleProgressMainStatus(record) !== filterStatus.value) return false
    if (filterResolutionResult.value) {
      const normalized = normalizeIssueStatus(record.issue_status)
      if (filterResolutionResult.value === '已补新单' && normalized !== '已补单') return false
      else if (filterResolutionResult.value !== '已补新单' && normalized !== filterResolutionResult.value) return false
    }
    if (filterPrincipalStatus.value && getPrincipalStatus(record) !== filterPrincipalStatus.value) return false
    if (!keyword) return true

    const haystack = [
      record.sub_order_number,
      record.buyer_name,
      record.customer_name,
      record.asin,
      record.old_amazon_order_id,
      record.business_manager_name,
    ].join(' ').toLowerCase()
    return haystack.includes(keyword)
  })
}

let buyerSearchTimer: ReturnType<typeof setTimeout> | null = null
function searchBuyers(keyword: string) {
  if (buyerSearchTimer) clearTimeout(buyerSearchTimer)
  if (!keyword) {
    buyerResults.value = []
    return
  }
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
  const buyer = buyerResults.value.find(item => item.id === buyerId)
  editForm.replacement_buyer_name = buyer?.name || ''
}

function onPrincipalChange() {
  if (!['待追回', '已损失'].includes(editForm.principal_status)) {
    editForm.principal_amount = 0
    editForm.principal_reason = ''
    editForm.blacklist_buyer = false
  } else if (!editForm.principal_amount) {
    editForm.principal_amount = Number(currentIssue.value?.product_price || 0)
  }
}

function openDetail(record: any) {
  drawerMode.value = 'detail'
  hydrateIssueForm(record)
  drawerOpen.value = true
}

function openHandle(record: any) {
  drawerMode.value = 'handle'
  hydrateIssueForm(record)
  handleAction.value = inferHandleAction(normalizeIssueStatus(record.issue_status))
    || (record.issue_type === '本金多返' ? 'recover-principal' : '')
  drawerOpen.value = true
}

function openActionModal(record: any, type: 'replace-order' | 'reorder') {
  currentIssue.value = record
  hydrateIssueForm(record)
  actionModalType.value = type
  actionModalOpen.value = true
}

function closeActionModal() {
  actionModalOpen.value = false
  actionModalType.value = ''
}

function hydrateIssueForm(record: any) {
  currentIssue.value = record
  Object.assign(editForm, {
    principal_status: getPrincipalStatus(record),
    principal_reason: record.principal_reason || (record.principal_stolen ? '被骗' : ''),
    principal_amount: getPrincipalAmount(record),
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
    issue_status: normalizeIssueStatus(record.issue_status),
    blacklist_buyer: false,
  })
}

function inferHandleAction(status: string) {
  if (status === '已替换单号') return 'replace-order'
  if (status === '已补单') return 'reorder'
  if (status === '需补单') return 'mark-need-reorder'
  if (status === '已追回本金') return 'recover-principal'
  if (status === '已关闭') return 'mark-closed'
  if (status === '无需处理') return 'mark-no-need'
  return ''
}

function setHandleAction(action: 'replace-order' | 'reorder' | 'mark-need-reorder' | 'recover-principal' | 'mark-closed' | 'mark-no-need') {
  handleAction.value = action
}

function getHandleActionHint() {
  if (handleAction.value === 'mark-need-reorder') return '确认后将状态直接改为需补单。'
  if (handleAction.value === 'recover-principal') return '确认后将状态改为已追回本金，本金状态回到正常。'
  if (handleAction.value === 'mark-closed') return '确认后将状态直接改为已关闭。'
  if (handleAction.value === 'mark-no-need') return '确认后将状态直接改为无需处理。'
  return ''
}

async function handleUpdate() {
  if (!currentIssue.value) return
  if (!handleAction.value) {
    message.warning('请选择一个操作')
    return
  }

  saving.value = true
  try {
    const actionStatusMap = {
      'replace-order': '已替换单号',
      'reorder': '已补单',
      'mark-need-reorder': '需补单',
      'recover-principal': '已追回本金',
      'mark-closed': '已关闭',
      'mark-no-need': '无需处理',
    } as const
    const normalizedStatus = actionStatusMap[handleAction.value]
    const update: any = {
      issue_status: normalizedStatus,
    }

    if (handleAction.value === 'replace-order') {
      const newAmazonOrderId = editForm.new_amazon_order_id.trim()
      if (!newAmazonOrderId) {
        message.warning('请填写新的亚马逊订单号')
        return
      }
      update.new_amazon_order_id = newAmazonOrderId
    }

    if (handleAction.value === 'reorder') {
      const replacementSubOrderNumber = editForm.replacement_sub_order_number.trim()
      if (!editForm.replacement_buyer_id && !replacementSubOrderNumber) {
        message.warning('请至少填写补单买手或补单子订单号')
        return
      }
      update.replacement_buyer_id = editForm.replacement_buyer_id || null
      update.replacement_buyer_name = editForm.replacement_buyer_name
      update.replacement_sub_order_number = replacementSubOrderNumber
    }

    if (handleAction.value === 'recover-principal') {
      update.principal_status = '正常'
      update.resolution_notes = editForm.resolution_notes?.trim() || currentIssue.value.resolution_notes || '已追回多返本金'
    }

    const closedStatuses = ['已替换单号', '已补单', '已追回本金', '已关闭', '无需处理']
    update.resolved_at = closedStatuses.includes(normalizedStatus) ? new Date().toISOString() : null
    if (normalizedStatus !== '无需处理') {
      update.refund_to_client_at = null
    }

    if (isMockIssue(currentIssue.value)) {
      const nextMockIssues = loadMockIssuesState().map(item => item.id === currentIssue.value.id ? {
        ...item,
        ...update,
        updated_at: new Date().toISOString(),
      } : item)
      saveMockIssuesState(nextMockIssues)
    } else {
      const { error } = await supabase.from('after_sale_issues').update(update).eq('id', currentIssue.value.id)
      if (error) throw error
    }

    if (!isMockIssue(currentIssue.value) && handleAction.value === 'replace-order' && editForm.new_amazon_order_id && currentIssue.value.sub_order_id) {
      await supabase.from('sub_orders').update({
        amazon_order_id: editForm.new_amazon_order_id.trim(),
      }).eq('id', currentIssue.value.sub_order_id)
    }

    message.success('操作已保存')
    drawerOpen.value = false
    await load()
    emit('changed')
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    saving.value = false
  }
}

async function submitActionModal() {
  if (!currentIssue.value || !actionModalType.value) return

  saving.value = true
  try {
    if (actionModalType.value === 'replace-order') {
      const newAmazonOrderId = editForm.new_amazon_order_id.trim()
      if (!newAmazonOrderId) {
        message.warning('请填写新的亚马逊订单号')
        return
      }

      const { error } = await supabase
        .from('after_sale_issues')
        .update({
          issue_status: '已替换单号',
          new_amazon_order_id: newAmazonOrderId,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', currentIssue.value.id)
      if (error) throw error

      if (currentIssue.value.sub_order_id) {
        await supabase.from('sub_orders').update({
          amazon_order_id: newAmazonOrderId,
        }).eq('id', currentIssue.value.sub_order_id)
      }
    }

    if (actionModalType.value === 'reorder') {
      const replacementSubOrderNumber = editForm.replacement_sub_order_number.trim()
      if (!editForm.replacement_buyer_id && !replacementSubOrderNumber) {
        message.warning('请至少填写补单买手或补单子订单号')
        return
      }

      const { error } = await supabase
        .from('after_sale_issues')
        .update({
          issue_status: '已补单',
          replacement_buyer_id: editForm.replacement_buyer_id || null,
          replacement_buyer_name: editForm.replacement_buyer_name,
          replacement_sub_order_number: replacementSubOrderNumber,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', currentIssue.value.id)
      if (error) throw error
    }

    message.success('操作已保存')
    closeActionModal()
    await load()
    emit('changed')
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    saving.value = false
  }
}

async function quickUpdateStatus(record: any, status: '需补单' | '已关闭' | '无需处理') {
  saving.value = true
  try {
    const update: any = {
      issue_status: status,
      resolved_at: status === '需补单' ? null : new Date().toISOString(),
    }
    if (status !== '无需处理') {
      update.refund_to_client_at = null
    }

    const { error } = await supabase.from('after_sale_issues').update(update).eq('id', record.id)
    if (error) throw error

    message.success('状态已更新')
    await load()
    emit('changed')
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    saving.value = false
  }
}

function normalizeIssueStatus(status: string) {
  if (status === '已替换订单') return '已替换单号'
  if (status === '已退款给客户') return '无需处理'
  return status || '待处理'
}

function maskProgressValue(value: string) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw.length <= 4) return raw
  return `${raw.slice(0, 4)}***`
}

function getAfterSaleProgressMainStatus(record: any) {
  const normalized = normalizeIssueStatus(record.issue_status)
  if (['已替换单号', '已补单', '已追回本金', '已关闭', '无需处理'].includes(normalized)) return '已处理'
  if (['处理中', '需补单'].includes(normalized)) return '处理中'
  return '待处理'
}

function showPendingReorderAlert(record: any) {
  return normalizeIssueStatus(record.issue_status) === '需补单'
}

function getAfterSaleProgressSubText(record: any) {
  const normalized = normalizeIssueStatus(record.issue_status)
  if (normalized === '已关闭') return '已关闭'
  if (normalized === '无需处理') return '无需处理'
  if (normalized === '已替换单号') {
    return record.new_amazon_order_id
      ? `已换新单号 ${maskProgressValue(record.new_amazon_order_id)}`
      : '已换新单号'
  }
  if (normalized === '已补单') {
    return record.replacement_sub_order_number
      ? `已补新单 ${maskProgressValue(record.replacement_sub_order_number)}`
      : '已补新单'
  }
  if (normalized === '已追回本金') {
    const amount = getPrincipalAmount(record)
    return amount > 0 ? `已追回本金 $${amount.toFixed(2)}` : '已追回本金'
  }
  if (normalized === '需补单') return '待确认补单方案'
  if (normalized === '处理中') return record.resolution_notes || '处理中'
  return record.resolution_notes || '待处理'
}

function afterSaleProgressTagColor(record: any) {
  const main = getAfterSaleProgressMainStatus(record)
  if (main === '已处理') return 'green'
  if (main === '处理中') return 'processing'
  return 'orange'
}

function getPrincipalStatus(record: any) {
  if (record.principal_status === '损失') return '已损失'
  if (record.principal_status) return record.principal_status
  if (record.issue_type === '本金多返') return '待追回'
  if (record.principal_stolen || Number(record.principal_amount || 0) > 0) return '已损失'
  return '待确定'
}

function getPrincipalStatusColor(record: any) {
  const status = getPrincipalStatus(record)
  if (status === '正常') return 'green'
  if (status === '待追回') return 'orange'
  if (status === '已损失') return 'red'
  return 'default'
}

function getPrincipalAmount(record: any) {
  return Number(record.principal_amount || record.profit_diff || record.loss_amount || 0)
}

function shouldShowPrincipalAmount(record: any) {
  return ['待追回', '已损失'].includes(getPrincipalStatus(record)) && getPrincipalAmount(record) > 0
}

async function handleDelete() {
  if (!currentIssue.value) return
  const { error } = await supabase.from('after_sale_issues').delete().eq('id', currentIssue.value.id)
  if (error) {
    message.error('删除失败')
    return
  }
  message.success('已删除')
  drawerOpen.value = false
  await load()
  emit('changed')
}

function handleTableChange(pag: any) {
  pagination.value.current = pag.current
  pagination.value.pageSize = pag.pageSize
  load()
}

watch(() => [props.issueId, props.subOrder, props.staffId], () => {
  pagination.value.current = 1
  load()
}, { immediate: true })
</script>

<style scoped>
.after-sale-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.status-filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.status-filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s ease;
}

.status-filter-btn span {
  font-size: 13px;
  font-weight: 600;
}

.status-filter-btn em {
  font-style: normal;
  font-size: 12px;
  color: #9ca3af;
}

.status-filter-btn:hover {
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #2563eb;
}

.status-filter-btn.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #2563eb;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.12);
}

.status-filter-btn.active em { color: inherit; }
.status-filter-btn.all.active { background: #eff6ff; }
.status-filter-btn.tone-pending.active { border-color: #d97706; background: rgba(217, 119, 6, 0.1); color: #d97706; }
.status-filter-btn.tone-processing.active { border-color: #2563eb; background: rgba(37, 99, 235, 0.1); color: #2563eb; }
.status-filter-btn.tone-replaced.active { border-color: #06b6d4; background: rgba(6, 182, 212, 0.1); color: #0891b2; }
.status-filter-btn.tone-need-reorder.active { border-color: #dc2626; background: rgba(220, 38, 38, 0.08); color: #dc2626; }
.status-filter-btn.tone-reordered.active { border-color: #059669; background: rgba(5, 150, 105, 0.08); color: #059669; }
.status-filter-btn.tone-closed.active { border-color: #6b7280; background: rgba(107, 114, 128, 0.08); color: #4b5563; }
.status-filter-btn.tone-refunded.active { border-color: #7c3aed; background: rgba(124, 58, 237, 0.08); color: #7c3aed; }

.stats-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 12px;
}

.stat-card {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  text-align: center;
  border: 1px solid #f0f0f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.stat-val { font-size: 24px; font-weight: 800; }
.stat-label { font-size: 11px; color: #6b7280; margin-top: 4px; }
.stat-pending .stat-val { color: #d97706; }
.stat-processing .stat-val { color: #2563eb; }
.stat-replaced .stat-val { color: #06b6d4; }
.stat-need-reorder .stat-val { color: #dc2626; }
.stat-reordered .stat-val { color: #059669; }
.stat-closed .stat-val { color: #6b7280; }
.stat-refunded .stat-val { color: #7c3aed; }

.card-panel {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  border: 1px solid #f0f0f0;
}

.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.total-hint { font-size: 12px; color: #9ca3af; margin-left: auto; }

.link-text { color: #2563eb; cursor: pointer; font-family: 'Courier New', monospace; font-size: 12px; font-weight: 600; }
.cell-info { display: flex; flex-direction: column; gap: 2px; }
.cell-meta { font-size: 11px; color: #9ca3af; }
.cell-amazon-id { font-size: 10px; color: #9ca3af; font-family: 'Courier New', monospace; }
.cell-client-name { font-weight: 600; font-size: 13px; color: #1a1a2e; }
.amount-usd { font-weight: 700; color: #dc2626; }
.amount-loss { font-size: 12px; font-weight: 700; color: #dc2626; }
.text-gray { color: #9ca3af; font-size: 12px; }
.cell-new-order { font-family: 'Courier New', monospace; font-size: 11px; color: #059669; font-weight: 600; }
.cell-profit { font-size: 11px; color: #059669; }
.cell-replacement { font-size: 12px; color: #374151; }
.cell-refund-method { font-size: 12px; color: #7c3aed; font-weight: 600; }
.cell-refund-amount { font-size: 11px; color: #dc2626; font-weight: 700; }
.after-sale-progress-cell { display: flex; flex-direction: column; gap: 6px; }
.after-sale-progress-main { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.after-sale-progress-tag { margin: 0; }
.after-sale-alert-tag {
  margin: 0;
  font-weight: 700;
  border-color: #dc2626;
  color: #dc2626;
  background: rgba(220, 38, 38, 0.08);
}
.after-sale-progress-sub {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
  word-break: break-all;
}
.remark-text { font-size: 12px; color: #374151; }
.action-btns { display: flex; flex-wrap: wrap; gap: 2px 6px; }

.drawer-section { margin-bottom: 24px; }
.drawer-section-title { font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #f0f0f0; }

.detail-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px 16px; }
.detail-item { display: flex; flex-direction: column; gap: 3px; }
.detail-item.full3 { grid-column: 1 / -1; }
.detail-label { font-size: 11px; color: #9ca3af; font-weight: 500; }
.detail-val { font-size: 13px; color: #1a1a2e; }
.detail-val.mono { font-family: 'Courier New', monospace; font-size: 12px; }

.handle-box {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 16px;
}

.handle-current-status { font-size: 13px; color: #374151; margin-bottom: 14px; }
.handle-action-grid { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
.handle-action-hint { font-size: 13px; color: #6b7280; line-height: 1.6; }

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
