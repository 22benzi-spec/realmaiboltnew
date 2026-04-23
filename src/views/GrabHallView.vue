<template>
  <div class="page-content">
    <h1 class="page-title">抢单大厅</h1>

    <a-tabs v-model:activeKey="activeTab">
      <a-tab-pane key="hall" tab="抢单大厅">
        <div class="hall-stats">
          <div class="stat-card">
            <span class="stat-label">主订单总待抢</span>
            <strong class="stat-value">{{ hallSummary.orderPendingCount }}</strong>
            <span class="stat-desc">当前主订单待抢总数</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">主订单今日更新</span>
            <strong class="stat-value">{{ hallSummary.orderUpdatedTodayCount }}</strong>
            <span class="stat-desc">今日新进入大厅的主订单</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">主订单今日已抢</span>
            <strong class="stat-value stat-success">{{ hallSummary.orderGrabbedTodayCount }}</strong>
            <span class="stat-desc">今日已被抢走的主订单</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">子订单总待抢</span>
            <strong class="stat-value">{{ hallSummary.subOrderPendingCount }}</strong>
            <span class="stat-desc">当前子订单待抢总数</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">子订单今日更新</span>
            <strong class="stat-value">{{ hallSummary.subOrderUpdatedTodayCount }}</strong>
            <span class="stat-desc">今日新进入大厅的子订单</span>
          </div>
          <div class="stat-card">
            <span class="stat-label">子订单今日已抢</span>
            <strong class="stat-value stat-success">{{ hallSummary.subOrderGrabbedTodayCount }}</strong>
            <span class="stat-desc">今日已被抢走的子订单</span>
          </div>
        </div>

        <div class="hall-toolbar">
          <div class="toolbar-left">
            <a-select v-model:value="grabStaffId" style="width:180px" placeholder="选择抢单业务员" show-search option-filter-prop="label">
              <a-select-option v-for="s in staffList" :key="s.id" :value="s.id" :label="s.name">{{ s.name }}</a-select-option>
            </a-select>
            <a-select v-model:value="filterReviewType" style="width: 130px" allow-clear placeholder="测评类型">
              <a-select-option v-for="item in reviewTypeOptions" :key="item" :value="item">{{ item }}</a-select-option>
            </a-select>
            <a-select v-model:value="filterReviewLevel" style="width: 130px" allow-clear placeholder="等级">
              <a-select-option v-for="item in reviewLevelOptions" :key="item" :value="item">{{ item }}</a-select-option>
            </a-select>
            <a-button @click="loadHall" :loading="loading"><ReloadOutlined /> 刷新</a-button>
          </div>
          <div class="toolbar-right">
            <div class="view-switch">
              <span :class="['view-btn', hallViewMode === 'order' ? 'active' : '']" @click="hallViewMode = 'order'">主订单视角</span>
              <span :class="['view-btn', hallViewMode === 'sub' ? 'active' : '']" @click="hallViewMode = 'sub'">子订单平铺</span>
            </div>
            <div class="count-badge">
              <span class="count-num">{{ hallViewMode === 'order' ? filteredHallOrderGroups.length : filteredHallOrders.length }}</span>
              <span class="count-label">{{ hallViewMode === 'order' ? '个主订单待抢' : '个子订单待抢' }}</span>
            </div>
          </div>
        </div>

        <div v-if="loading" class="loading-wrap"><a-spin size="large" /></div>

        <div v-else-if="filteredHallOrders.length === 0" class="empty-hall">
          <a-empty description="暂无可抢订单" />
        </div>

        <div v-else-if="hallViewMode === 'order'" class="task-list">
          <div v-for="group in filteredHallOrderGroups" :key="group.order_id" class="task-card hall-task-card">
            <div class="task-main-row">
              <div class="task-expand-btn" @click="toggleGroupExpand(group.order_id)">
                <RightOutlined :class="['expand-icon', { expanded: expandedGroupKeys.includes(group.order_id) }]" />
              </div>

              <div class="task-product-img" @click="toggleGroupExpand(group.order_id)">
                <img
                  v-if="group.product_image"
                  :src="group.product_image"
                  class="task-product-thumb"
                  referrerpolicy="no-referrer"
                  @error="onImgError($event)"
                />
                <div v-else class="task-product-placeholder">
                  <PictureOutlined />
                </div>
              </div>

              <div class="task-info">
                <div class="task-top-row">
                  <span class="detail-item-text">主订单ID：</span>
                  <a class="order-num-link">{{ group.order_number || '未关联主订单' }}</a>
                  <a-tag v-if="group.country" color="default" class="info-tag">{{ group.country }}</a-tag>
                  <a-tag v-if="getGroupReviewType(group) !== '—'" color="blue" class="info-tag">{{ getGroupReviewType(group) }}</a-tag>
                  <a-tag v-if="getGroupReviewLevel(group) !== '—'" color="gold" class="info-tag">{{ getGroupReviewLevel(group) }}</a-tag>
                </div>
                <div class="task-detail-row">
                  <span class="detail-item-text">产品名称：{{ group.product_name || '—' }}</span>
                  <span class="detail-sep">ASIN：<span class="mono-sm">{{ group.asin || '—' }}</span></span>
                  <span class="detail-sep">售价：<span class="price-text">${{ Number(group.product_price || 0).toFixed(2) }}</span></span>
                </div>
                <div class="task-detail-row">
                  <span class="detail-item-text">店铺：{{ group.store_name || '—' }}</span>
                  <span class="detail-sep">变体信息：{{ getGroupVariantInfo(group) }}</span>
                </div>
                <div class="task-detail-row">
                  <span class="detail-item-text">任务备注：</span>
                  <span class="task-note-text" :title="getGroupRemark(group)">{{ getGroupRemark(group) }}</span>
                </div>
              </div>

              <div class="task-stats hall-task-stats">
                <div class="stat-item">
                  <span class="stat-label">代抢单</span>
                  <span class="stat-val stat-total">{{ group.subCount }}</span>
                </div>
                <div class="stat-divider"></div>
                <div class="stat-item">
                  <span class="stat-label">最长逾期</span>
                  <span :class="['stat-val', getGroupMaxExpiredDays(group) > 0 ? 'stat-overdue' : 'stat-schedule']">
                    {{ getGroupMaxExpiredDays(group) }}<span class="stat-unit">天</span>
                  </span>
                </div>
                <div class="stat-right-col">
                  <div class="stat-mini-row">
                    <span class="stat-mini-label review-label">今日更新 {{ group.updatedTodayCount }}</span>
                  </div>
                </div>
              </div>

              <div class="task-actions hall-task-actions">
                <a-button size="small" @click.stop="toggleGroupExpand(group.order_id)">
                  {{ expandedGroupKeys.includes(group.order_id) ? '收起子订单' : '展开子订单' }}
                </a-button>
                <a-button size="small" @click.stop="openGroupDetail(group)">详情</a-button>
              </div>
            </div>

            <div v-if="expandedGroupKeys.includes(group.order_id)" class="sub-orders-panel">
              <div class="sub-orders-header">
                <span class="sub-orders-title">子订单列表（{{ group.subs.length }} 单）</span>
              </div>
              <div class="hall-sub-table">
                <div class="hall-sub-table-header hall-sub-grid">
                  <div>子订单ID</div>
                  <div>产品名称 / ASIN</div>
                  <div>排期日期</div>
                  <div>等级</div>
                  <div>类型</div>
                  <div>售价</div>
                  <div>关键词</div>
                  <div>操作</div>
                </div>
                <div v-for="order in group.subs" :key="order.id" class="hall-sub-grid hall-sub-table-row">
                  <div class="hall-sub-no">{{ order.sub_order_number }}</div>
                  <div class="hall-sub-product">
                    <div class="hall-sub-product-name">{{ order.product_name || '—' }}</div>
                    <div class="hall-sub-asin">{{ order.asin || '—' }}</div>
                  </div>
                  <div>
                    <span v-if="order.scheduled_date" :class="isExpired(order.scheduled_date) ? 'hall-date-overdue' : 'hall-date-normal'">{{ order.scheduled_date }}</span>
                    <span v-else class="text-gray">—</span>
                  </div>
                  <div>
                    <a-tag v-if="order.review_level" color="gold" size="small">{{ order.review_level }}</a-tag>
                    <span v-else class="text-gray">—</span>
                  </div>
                  <div>
                    <a-tag v-if="order.review_type || order.order_type" color="blue" size="small">{{ order.review_type || order.order_type }}</a-tag>
                    <span v-else class="text-gray">—</span>
                  </div>
                  <div class="hall-sub-price">${{ Number(order.product_price || 0).toFixed(2) }}</div>
                  <div>
                    <span v-if="order.keyword" class="keyword-tag">{{ order.keyword }}</span>
                    <span v-else class="text-gray">—</span>
                  </div>
                  <div class="hall-sub-actions">
                    <a-button
                      type="primary"
                      size="small"
                      :loading="grabbingId === order.id"
                      :disabled="!!grabbingId && grabbingId !== order.id"
                      @click="grabOne(order)"
                      class="grab-btn hall-inline-btn"
                    >
                      抢单
                    </a-button>
                    <a-button size="small" @click="openSubDetail(order)">详情</a-button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="card-panel hall-flat-panel">
          <div class="sub-orders-header">
            <span class="sub-orders-title">子订单列表（{{ filteredHallOrders.length }} 单）</span>
          </div>
          <div class="hall-sub-table">
            <div class="hall-sub-table-header hall-sub-grid">
              <div>子订单ID</div>
              <div>产品名称 / ASIN</div>
              <div>排期日期</div>
              <div>等级</div>
              <div>类型</div>
              <div>售价</div>
              <div>关键词</div>
              <div>操作</div>
            </div>
            <div v-for="order in filteredHallOrders" :key="order.id" class="hall-sub-grid hall-sub-table-row">
              <div class="hall-sub-no">{{ order.sub_order_number }}</div>
              <div class="hall-sub-product">
                <div class="hall-sub-product-name">{{ order.product_name || '—' }}</div>
                <div class="hall-sub-asin">{{ order.asin || '—' }}</div>
              </div>
              <div>
                <span v-if="order.scheduled_date" :class="isExpired(order.scheduled_date) ? 'hall-date-overdue' : 'hall-date-normal'">{{ order.scheduled_date }}</span>
                <span v-else class="text-gray">—</span>
              </div>
              <div>
                <a-tag v-if="order.review_level" color="gold" size="small">{{ order.review_level }}</a-tag>
                <span v-else class="text-gray">—</span>
              </div>
              <div>
                <a-tag v-if="order.review_type || order.order_type" color="blue" size="small">{{ order.review_type || order.order_type }}</a-tag>
                <span v-else class="text-gray">—</span>
              </div>
              <div class="hall-sub-price">${{ Number(order.product_price || 0).toFixed(2) }}</div>
              <div>
                <span v-if="order.keyword" class="keyword-tag">{{ order.keyword }}</span>
                <span v-else class="text-gray">—</span>
              </div>
              <div class="hall-sub-actions">
                <a-button
                  type="primary"
                  size="small"
                  :loading="grabbingId === order.id"
                  :disabled="!!grabbingId && grabbingId !== order.id"
                  @click="grabOne(order)"
                  class="grab-btn hall-inline-btn"
                >
                  抢单
                </a-button>
                <a-button size="small" @click="openSubDetail(order)">详情</a-button>
              </div>
            </div>
          </div>
        </div>

        <a-modal v-model:open="groupDetailOpen" title="主订单详情" :footer="null" width="760px">
          <a-descriptions v-if="currentGroupDetail" :column="2" bordered size="small">
            <a-descriptions-item label="主订单ID">{{ currentGroupDetail.order_number || '—' }}</a-descriptions-item>
            <a-descriptions-item label="国家">{{ currentGroupDetail.country || '—' }}</a-descriptions-item>
            <a-descriptions-item label="类型">{{ getGroupReviewType(currentGroupDetail) }}</a-descriptions-item>
            <a-descriptions-item label="等级">{{ getGroupReviewLevel(currentGroupDetail) }}</a-descriptions-item>
            <a-descriptions-item label="产品名称" :span="2">{{ currentGroupDetail.product_name || '—' }}</a-descriptions-item>
            <a-descriptions-item label="ASIN">{{ currentGroupDetail.asin || '—' }}</a-descriptions-item>
            <a-descriptions-item label="售价">${{ Number(currentGroupDetail.product_price || 0).toFixed(2) }}</a-descriptions-item>
            <a-descriptions-item label="店铺">{{ currentGroupDetail.store_name || '—' }}</a-descriptions-item>
            <a-descriptions-item label="变体信息">{{ getGroupVariantInfo(currentGroupDetail) }}</a-descriptions-item>
            <a-descriptions-item label="任务备注" :span="2">{{ getGroupRemark(currentGroupDetail) }}</a-descriptions-item>
            <a-descriptions-item label="代抢单">{{ currentGroupDetail.subCount || 0 }}</a-descriptions-item>
            <a-descriptions-item label="最长已逾期">{{ getGroupMaxExpiredDays(currentGroupDetail) }} 天</a-descriptions-item>
          </a-descriptions>
        </a-modal>

        <a-modal v-model:open="subDetailOpen" title="子订单详情" :footer="null" width="760px">
          <a-descriptions v-if="currentSubDetail" :column="2" bordered size="small">
            <a-descriptions-item label="子订单ID">{{ currentSubDetail.sub_order_number || '—' }}</a-descriptions-item>
            <a-descriptions-item label="排期日期">{{ currentSubDetail.scheduled_date || '—' }}</a-descriptions-item>
            <a-descriptions-item label="产品名称" :span="2">{{ currentSubDetail.product_name || '—' }}</a-descriptions-item>
            <a-descriptions-item label="ASIN">{{ currentSubDetail.asin || '—' }}</a-descriptions-item>
            <a-descriptions-item label="售价">${{ Number(currentSubDetail.product_price || 0).toFixed(2) }}</a-descriptions-item>
            <a-descriptions-item label="等级">{{ currentSubDetail.review_level || '—' }}</a-descriptions-item>
            <a-descriptions-item label="类型">{{ currentSubDetail.review_type || currentSubDetail.order_type || '—' }}</a-descriptions-item>
            <a-descriptions-item label="关键词" :span="2">{{ currentSubDetail.keyword || '—' }}</a-descriptions-item>
          </a-descriptions>
        </a-modal>
      </a-tab-pane>

      <a-tab-pane key="log" tab="抢单记录">
        <div class="card-panel">
          <div class="log-toolbar">
            <a-select v-model:value="logFilterFlowType" style="width: 140px" allow-clear placeholder="流转类型">
              <a-select-option v-for="item in logFlowTypeOptions" :key="item" :value="item">{{ item }}</a-select-option>
            </a-select>
            <a-select v-model:value="logFilterFromStaff" style="width: 140px" allow-clear placeholder="来源业务员" show-search option-filter-prop="label">
              <a-select-option v-for="item in logFromStaffOptions" :key="item" :value="item" :label="item">{{ item }}</a-select-option>
            </a-select>
            <a-select v-model:value="logFilterToStaff" style="width: 140px" allow-clear placeholder="抢单业务员" show-search option-filter-prop="label">
              <a-select-option v-for="item in logToStaffOptions" :key="item" :value="item" :label="item">{{ item }}</a-select-option>
            </a-select>
            <a-range-picker v-model:value="logDateRange" style="width: 260px" />
          </div>
          <a-table
            :columns="logColumns"
            :data-source="displayLogs"
            :loading="logLoading"
            row-key="id"
            size="small"
            :pagination="{ pageSize: 20 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'action_tag'">
                <a-tag :color="getLogActionColor(record.direction)">{{ record.direction }}</a-tag>
              </template>
              <template v-if="column.key === 'flow_type'">
                <a-tag :color="getFlowTypeColor(record.flowType)">{{ record.flowType }}</a-tag>
              </template>
              <template v-if="column.key === 'duration'">
                <span :class="['log-duration', record.durationMinutes >= 60 ? 'is-long' : '']">{{ record.durationText }}</span>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  ReloadOutlined, ThunderboltOutlined, RightOutlined, PictureOutlined
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

const activeTab = ref('hall')
const hallViewMode = ref<'order' | 'sub'>('order')
const loading = ref(false)
const logLoading = ref(false)
const hallOrders = ref<any[]>([])
const logs = ref<any[]>([])
const todayGrabbedOrders = ref<any[]>([])
const staffList = ref<any[]>([])
const grabStaffId = ref('')
const grabbingId = ref('')
const expandedGroupKeys = ref<string[]>([])
const groupDetailOpen = ref(false)
const subDetailOpen = ref(false)
const currentGroupDetail = ref<any>(null)
const currentSubDetail = ref<any>(null)
const filterReviewType = ref<string | undefined>(undefined)
const filterReviewLevel = ref<string | undefined>(undefined)
const logFilterFlowType = ref<string | undefined>(undefined)
const logFilterFromStaff = ref<string | undefined>(undefined)
const logFilterToStaff = ref<string | undefined>(undefined)
const logDateRange = ref<any[]>([])

const logColumns = [
  { title: '子单号', dataIndex: 'sub_order_number', key: 'sub_order_number', width: 160 },
  { title: '操作', key: 'action_tag', width: 100 },
  { title: '流转类型', key: 'flow_type', width: 130 },
  { title: '抢单耗时', key: 'duration', width: 120 },
  { title: '来源业务员', dataIndex: 'from_staff_name', key: 'from_staff_name', width: 110 },
  { title: '抢单业务员', dataIndex: 'to_staff_name', key: 'to_staff_name', width: 110 },
  { title: '说明', dataIndex: 'reason', key: 'reason' },
  { title: '时间', dataIndex: 'created_at', key: 'created_at', width: 140, customRender: ({ text }: any) => text ? dayjs(text).format('MM-DD HH:mm') : '' },
]

const today = computed(() => dayjs().format('YYYY-MM-DD'))
const hallOrderGroups = computed(() => buildHallGroups(hallOrders.value))
const reviewTypeOptions = computed(() => Array.from(new Set(hallOrders.value.map(order => order.review_type).filter(Boolean))).sort())
const reviewLevelOptions = computed(() => Array.from(new Set(hallOrders.value.map(order => order.review_level).filter(Boolean))).sort())
const logFlowTypeOptions = computed(() => ['手动流入', '超时自动流入', '抢单流出'])
const logFromStaffOptions = computed(() => Array.from(new Set(buildDisplayLogs(logs.value).map(log => log.from_staff_name).filter(Boolean))).sort())
const logToStaffOptions = computed(() => Array.from(new Set(buildDisplayLogs(logs.value).map(log => log.to_staff_name).filter(Boolean))).sort())
const filteredHallOrders = computed(() =>
  hallOrders.value.filter(order => {
    if (filterReviewType.value && order.review_type !== filterReviewType.value) return false
    if (filterReviewLevel.value && order.review_level !== filterReviewLevel.value) return false
    return true
  }),
)
const filteredHallOrderGroups = computed(() => buildHallGroups(filteredHallOrders.value))
const displayLogs = computed(() =>
  buildDisplayLogs(logs.value).filter(log => {
    if (logFilterFlowType.value && log.flowType !== logFilterFlowType.value) return false
    if (logFilterFromStaff.value && log.from_staff_name !== logFilterFromStaff.value) return false
    if (logFilterToStaff.value && log.to_staff_name !== logFilterToStaff.value) return false
    if (logDateRange.value?.length === 2 && logDateRange.value[0] && logDateRange.value[1]) {
      const start = dayjs(logDateRange.value[0]).startOf('day')
      const end = dayjs(logDateRange.value[1]).endOf('day')
      const createdAt = dayjs(log.created_at)
      if (createdAt.isBefore(start) || createdAt.isAfter(end)) return false
    }
    return true
  }),
)
const hallSummary = computed(() => {
  const pendingOrderGroups = hallOrderGroups.value
  const updatedTodayOrders = hallOrders.value.filter(order => isTodayActivity(order.released_at || order.updated_at || order.created_at))
  const updatedTodayOrderGroups = buildHallGroups(updatedTodayOrders)
  const grabbedTodayOrderGroups = buildHallGroups(todayGrabbedOrders.value)

  return {
    orderPendingCount: pendingOrderGroups.length,
    orderUpdatedTodayCount: updatedTodayOrderGroups.length,
    orderGrabbedTodayCount: grabbedTodayOrderGroups.length,
    subOrderPendingCount: hallOrders.value.length,
    subOrderUpdatedTodayCount: updatedTodayOrders.length,
    subOrderGrabbedTodayCount: todayGrabbedOrders.value.length,
  }
})

function getLogActionColor(action: string) {
  if (action === '流入') return 'orange'
  if (action === '流出') return 'green'
  return 'default'
}

function getFlowTypeColor(flowType: string) {
  if (flowType === '超时自动流入') return 'red'
  if (flowType === '手动流入') return 'blue'
  if (flowType === '抢单流出') return 'green'
  return 'default'
}

function fmtTime(t: string | null) {
  if (!t) return ''
  return dayjs(t).format('MM-DD HH:mm')
}

function getGroupReviewType(group: any) {
  const values = Array.from(new Set((group?.subs || []).map((sub: any) => sub.review_type || sub.order_type).filter(Boolean)))
  return values.length ? values.join(' / ') : '—'
}

function getGroupReviewLevel(group: any) {
  const values = Array.from(new Set((group?.subs || []).map((sub: any) => sub.review_level).filter(Boolean)))
  return values.length ? values.join(' / ') : '—'
}

function getGroupVariantInfo(group: any) {
  const value = (group?.subs || []).map((sub: any) => String(sub.variant_info || '').trim()).find(Boolean)
  return value || '—'
}

function getGroupRemark(group: any) {
  const value = (group?.subs || []).map((sub: any) => String(sub.task_notes || sub.notes || '').trim()).find(Boolean)
  return value || '—'
}

function getGroupMaxExpiredDays(group: any) {
  return Math.max(0, ...(group?.subs || []).map((sub: any) => isExpired(sub.scheduled_date) ? expiredDays(sub.scheduled_date) : 0))
}

function onImgError(e: Event) {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
}

function isTodayActivity(dateStr: string | null | undefined) {
  if (!dateStr) return false
  return dayjs(dateStr).isSame(dayjs(), 'day')
}

function isExpired(dateStr: string) {
  if (!dateStr) return false
  return dayjs(dateStr).isBefore(dayjs(), 'day')
}

function isExpiringSoon(dateStr: string) {
  if (!dateStr) return false
  const diff = dayjs(dateStr).diff(dayjs(), 'day')
  return diff >= 0 && diff <= 2
}

function expiredDays(dateStr: string) {
  if (!dateStr) return 0
  return dayjs().diff(dayjs(dateStr), 'day')
}

function getLogDirection(log: any) {
  if (log.action === '放入抢单大厅' || log.action === '回转' || String(log.reason || '').includes('回流')) return '流入'
  if (['grab', '抢单', '互转接受'].includes(log.action) || String(log.reason || '').includes('抢单')) return '流出'
  return '流转'
}

function getFlowType(log: any, direction: string) {
  if (direction === '流入') {
    return String(log.reason || '').includes('自动') ? '超时自动流入' : '手动流入'
  }
  if (direction === '流出') return '抢单流出'
  return '其他'
}

function formatDurationMs(durationMs: number | null) {
  if (durationMs === null || durationMs < 0) return '--'
  const totalMinutes = Math.floor(durationMs / (1000 * 60))
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return `${days}天${hours}小时`
  if (hours > 0) return `${hours}小时${minutes}分`
  return `${minutes}分`
}

function buildDisplayLogs(sourceLogs: any[]) {
  const orderedLogs = [...sourceLogs].sort((a, b) => dayjs(a.created_at).valueOf() - dayjs(b.created_at).valueOf())
  const activeEntryMap = new Map<string, string>()
  const decorated = orderedLogs.map(log => {
    const direction = getLogDirection(log)
    const flowType = getFlowType(log, direction)
    let durationMs: number | null = null

    if (direction === '流入' && log.sub_order_id) {
      activeEntryMap.set(log.sub_order_id, log.created_at)
    }

    if (direction === '流出' && log.sub_order_id) {
      const entryAt = activeEntryMap.get(log.sub_order_id)
      if (entryAt) {
        durationMs = dayjs(log.created_at).diff(dayjs(entryAt))
        activeEntryMap.delete(log.sub_order_id)
      }
    }

    const durationMinutes = durationMs === null ? 0 : Math.floor(durationMs / (1000 * 60))
    return {
      ...log,
      direction,
      flowType,
      durationMs,
      durationMinutes,
      durationText: direction === '流出' ? formatDurationMs(durationMs) : '--',
    }
  })

  return decorated.sort((a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf())
}

function buildHallGroups(sourceOrders: any[]) {
  const groupMap = new Map<string, any>()

  for (const order of sourceOrders) {
    const orderId = order.order_id || order.order_number || order.id
    if (!groupMap.has(orderId)) {
      groupMap.set(orderId, {
        order_id: orderId,
        order_number: order.order_number || '',
        customer_name: order.customer_name || '',
        country: order.country || '',
        product_image: order.product_image || '',
        product_name: order.product_name || '',
        asin: order.asin || '',
        store_name: order.store_name || '',
        order_type: order.order_type || '',
        review_type: order.review_type || '',
        review_level: order.review_level || '',
        product_price: order.product_price || 0,
        subs: [],
      })
    }
    groupMap.get(orderId).subs.push(order)
  }

  return Array.from(groupMap.values())
    .map(group => ({
      ...group,
      subCount: group.subs.length,
      updatedTodayCount: group.subs.filter((sub: any) => isTodayActivity(sub.released_at || sub.updated_at || sub.created_at)).length,
    }))
    .sort((a, b) => {
      if (b.updatedTodayCount !== a.updatedTodayCount) return b.updatedTodayCount - a.updatedTodayCount
      if (b.subCount !== a.subCount) return b.subCount - a.subCount
      return (a.order_number || '').localeCompare(b.order_number || '')
    })
}

function toggleGroupExpand(orderId: string) {
  if (expandedGroupKeys.value.includes(orderId)) {
    expandedGroupKeys.value = expandedGroupKeys.value.filter(id => id !== orderId)
  } else {
    expandedGroupKeys.value = [...expandedGroupKeys.value, orderId]
  }
}

function openGroupDetail(group: any) {
  currentGroupDetail.value = group
  groupDetailOpen.value = true
}

function openSubDetail(order: any) {
  currentSubDetail.value = order
  subDetailOpen.value = true
}

async function loadHall() {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('sub_orders')
      .select('*')
      .eq('released_to_hall', true)
      .eq('status', '待分配')
      .order('released_at', { ascending: false })
    if (error) throw error
    hallOrders.value = data || []
    expandedGroupKeys.value = Array.from(new Set((data || []).map((item: any) => item.order_id || item.order_number || item.id)))
  } finally {
    loading.value = false
  }
}

async function loadLogs() {
  logLoading.value = true
  try {
    const { data } = await supabase
      .from('grab_hall_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
    logs.value = data || []

    const todayGrabSubOrderIds = Array.from(new Set(
      logs.value
        .filter(log => ['grab', '抢单'].includes(log.action) && isTodayActivity(log.created_at) && log.sub_order_id)
        .map(log => log.sub_order_id),
    ))
    if (todayGrabSubOrderIds.length === 0) {
      todayGrabbedOrders.value = []
      return
    }

    const { data: grabbedData, error } = await supabase
      .from('sub_orders')
      .select('id, order_id, order_number')
      .in('id', todayGrabSubOrderIds)
    if (error) throw error
    todayGrabbedOrders.value = grabbedData || []
  } finally {
    logLoading.value = false
  }
}

async function loadStaff() {
  const { data } = await supabase.from('staff').select('id, name').in('status', ['在职', '休假'])
  staffList.value = data || []
}

async function grabOne(record: any) {
  if (!grabStaffId.value) { message.warning('请先选择抢单业务员'); return }
  if (grabbingId.value) return
  grabbingId.value = record.id
  try {
    const staff = staffList.value.find(s => s.id === grabStaffId.value)

    const { data: current, error: checkErr } = await supabase
      .from('sub_orders')
      .select('id, status, released_to_hall')
      .eq('id', record.id)
      .maybeSingle()
    if (checkErr) throw checkErr

    if (!current || current.status !== '待分配' || !current.released_to_hall) {
      message.warning('该订单已被其他业务员抢走，请刷新列表')
      hallOrders.value = hallOrders.value.filter(o => o.id !== record.id)
      return
    }

    const { error } = await supabase.from('sub_orders').update({
      staff_id: grabStaffId.value,
      staff_name: staff?.name,
      released_to_hall: false,
      status: '已分配',
    }).eq('id', record.id).eq('status', '待分配').eq('released_to_hall', true)
    if (error) throw error

    await supabase.from('grab_hall_logs').insert([{
      sub_order_id: record.id,
      sub_order_number: record.sub_order_number,
      action: 'grab',
      from_staff_id: record.released_by_staff_id,
      from_staff_name: record.released_by_staff_name,
      to_staff_id: grabStaffId.value,
      to_staff_name: staff?.name,
      reason: '抢单大厅抢单',
    }])

    hallOrders.value = hallOrders.value.filter(o => o.id !== record.id)
    message.success(`抢单成功，已分配给 ${staff?.name}`)
  } catch (e: any) {
    message.error('抢单失败：' + e.message)
  } finally {
    grabbingId.value = ''
  }
}

onMounted(() => {
  loadStaff()
  loadHall()
  loadLogs()
})
</script>

<style scoped>
.page-content { padding: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }

.hall-stats {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 16px;
}

.stat-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 16px 18px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.stat-label { font-size: 12px; color: #6b7280; }
.stat-value { font-size: 26px; font-weight: 800; color: #2563eb; line-height: 1.1; }
.stat-value.stat-warn { color: #d97706; }
.stat-value.stat-danger { color: #dc2626; }
.stat-desc { font-size: 12px; color: #9ca3af; }

.hall-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-radius: 10px;
  padding: 14px 20px;
  margin-bottom: 16px;
  border: 1px solid #f0f0f0;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
.toolbar-left { display: flex; align-items: center; gap: 10px; }
.toolbar-right { display: flex; align-items: center; gap: 16px; }
.view-switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px;
  background: #f5f7fa;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
}
.view-btn {
  padding: 7px 14px;
  border-radius: 999px;
  font-size: 13px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s ease;
}
.view-btn.active {
  background: #2563eb;
  color: #fff;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
}
.count-badge { display: flex; align-items: baseline; gap: 4px; }
.count-num { font-size: 24px; font-weight: 700; color: #2563eb; line-height: 1; }
.count-label { font-size: 13px; color: #6b7280; }

.loading-wrap { display: flex; justify-content: center; padding: 80px 0; }
.empty-hall { background: #fff; border-radius: 12px; padding: 60px 0; }

.task-list { display: flex; flex-direction: column; gap: 0; background: #fff; border-radius: 12px; border: 1px solid #f0f0f0; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
.task-card { border-bottom: 1px solid #f0f0f0; }
.task-card:last-child { border-bottom: none; }
.task-main-row {
  display: flex;
  align-items: flex-start;
  gap: 0;
  padding: 14px 4px 14px 0;
  transition: background 0.15s;
}
.task-main-row:hover { background: #fafbff; }
.task-expand-btn {
  width: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 3px;
  cursor: pointer;
  color: #9ca3af;
}
.expand-icon { font-size: 11px; transition: transform 0.2s; }
.expand-icon.expanded { transform: rotate(90deg); color: #2563eb; }
.task-product-img {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  margin-right: 12px;
  cursor: pointer;
}
.task-product-thumb {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  display: block;
  transition: box-shadow 0.15s;
}
.task-product-thumb:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.15); }
.task-product-placeholder {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  border: 1px dashed #d1d5db;
  background: #f9fafb;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #d1d5db;
  font-size: 20px;
}
.task-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.task-top-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.order-num-link {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  font-weight: 700;
  color: #2563eb;
  cursor: default;
  text-decoration: none;
}
.status-tag { font-size: 11px; }
.info-tag { font-size: 11px; }
.task-detail-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.6;
}
.detail-item-text { color: #374151; }
.detail-sep { color: #6b7280; padding-left: 12px; }
.mono-sm { font-family: 'Courier New', monospace; font-size: 11px; color: #374151; }
.price-text { color: #16a34a; font-weight: 600; }
.task-note-text {
  color: #6b7280;
  display: inline-block;
  max-width: 380px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.task-stats {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin: 0 20px;
  background: #f8fafc;
  border-radius: 8px;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
}
.hall-task-stats { min-width: 230px; }
.stat-item { display: flex; flex-direction: column; align-items: center; min-width: 52px; gap: 2px; }
.stat-label { font-size: 11px; color: #9ca3af; line-height: 1; }
.stat-val { font-size: 20px; font-weight: 700; line-height: 1.2; }
.stat-unit { font-size: 12px; font-weight: 400; color: #9ca3af; margin-left: 1px; }
.stat-total { color: #1a1a2e; }
.stat-schedule { color: #f59e0b; }
.stat-overdue { color: #dc2626; }
.stat-divider { width: 1px; height: 32px; background: #e5e7eb; margin: 0 10px; }
.stat-right-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-left: 12px;
  padding-left: 12px;
  border-left: 1px solid #e5e7eb;
}
.stat-mini-row { display: flex; gap: 8px; }
.stat-mini-label {
  font-size: 11px;
  white-space: nowrap;
  padding: 1px 6px;
  border-radius: 10px;
  font-weight: 500;
}
.review-label { background: #eff6ff; color: #3b82f6; }
.task-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; padding-left: 8px; }
.hall-task-actions { align-self: center; }

.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.hall-flat-panel { padding-top: 14px; }
.sub-orders-panel {
  background: #f8fafc;
  border-top: 1px dashed #e5e7eb;
  padding: 12px 16px 16px 32px;
}
.sub-orders-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.sub-orders-title { font-size: 12px; font-weight: 600; color: #374151; }
.hall-sub-table {
  margin-top: 10px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  overflow: hidden;
  background: #fff;
}
.hall-sub-grid {
  display: grid;
  grid-template-columns: 140px 1.8fr 120px 90px 100px 100px 1.2fr 150px;
  gap: 0;
  align-items: center;
}
.hall-sub-table-header {
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
}
.hall-sub-table-header > div {
  padding: 10px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
}
.hall-sub-table-row {
  border-bottom: 1px solid #f0f0f0;
}
.hall-sub-table-row:last-child { border-bottom: none; }
.hall-sub-table-row > div {
  padding: 10px 12px;
  min-width: 0;
  font-size: 12px;
  color: #374151;
}
.hall-sub-no { font-family: 'Courier New', monospace; font-size: 11px; color: #374151; font-weight: 600; }
.hall-sub-product { min-width: 0; }
.hall-sub-product-name {
  font-size: 12px;
  color: #374151;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.hall-sub-asin {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: #6b7280;
  margin-top: 2px;
}
.hall-date-normal { font-size: 12px; color: #374151; }
.hall-date-overdue { font-size: 12px; color: #dc2626; font-weight: 600; }
.hall-sub-price { font-size: 12px; font-weight: 600; color: #16a34a; }
.keyword-tag {
  display: inline-block;
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 11px;
  font-weight: 500;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.hall-sub-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.hall-inline-btn { width: auto; min-width: 64px; }
.text-gray { color: #9ca3af; font-size: 12px; }
.grab-btn { font-weight: 600; border-radius: 7px; }

.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.log-toolbar { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
.log-duration { font-size: 12px; color: #6b7280; font-weight: 600; }
.log-duration.is-long { color: #d97706; }

@media (max-width: 1200px) {
  .hall-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .hall-toolbar,
  .task-main-row { flex-direction: column; align-items: stretch; gap: 12px; padding-left: 12px; }
  .toolbar-right { justify-content: space-between; }
  .task-stats { margin: 0; }
  .hall-task-actions { padding-left: 0; }
  .hall-sub-grid { grid-template-columns: 130px 1.5fr 110px 80px 90px 90px 1fr 140px; }
}

@media (max-width: 768px) {
  .hall-stats { grid-template-columns: 1fr; }
  .toolbar-left,
  .toolbar-right { flex-wrap: wrap; }
  .view-switch { width: 100%; justify-content: space-between; }
  .task-product-img { margin-right: 0; }
  .hall-sub-table { overflow-x: auto; }
  .hall-sub-grid { min-width: 980px; }
}
</style>
