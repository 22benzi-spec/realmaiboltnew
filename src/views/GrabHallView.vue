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

        <div v-else-if="hallViewMode === 'order'" class="order-group-list">
          <div v-for="group in filteredHallOrderGroups" :key="group.order_id" class="order-group-card">
            <div class="group-head">
              <div class="group-main">
                <div class="row-img-col">
                  <img v-if="group.product_image" :src="group.product_image" class="row-img" referrerpolicy="no-referrer" @error="onImgError" />
                  <div v-else class="row-img-placeholder">?</div>
                </div>
                <div class="group-meta">
                  <div class="group-title-row">
                    <span class="main-order-no">{{ group.order_number || '未关联主订单' }}</span>
                    <a-tag v-if="group.country" color="default" style="margin:0">{{ group.country }}</a-tag>
                    <a-tag v-if="group.order_type" color="blue" style="margin:0">{{ group.order_type }}</a-tag>
                  </div>
                  <div class="group-product">{{ group.product_name || '—' }}</div>
                  <div class="group-submeta">
                    <span>客户 {{ group.customer_name || '—' }}</span>
                    <span>店铺 {{ group.store_name || '—' }}</span>
                    <span>ASIN {{ group.asin || '—' }}</span>
                  </div>
                </div>
              </div>
              <div class="group-stats">
                <span class="group-stat">子订单 {{ group.subCount }}</span>
                <span class="group-stat">今日更新 {{ group.updatedTodayCount }}</span>
              </div>
            </div>

            <div class="group-sub-list">
              <div v-for="order in group.subs" :key="order.id" class="order-row">
                <div class="row-col col-order">
                  <span class="sub-order-no">{{ order.sub_order_number }}</span>
                  <div class="tag-row">
                    <a-tag v-if="order.review_type" color="blue" style="font-size:10px;margin:0">{{ order.review_type }}</a-tag>
                    <a-tag v-if="order.review_level" color="gold" style="font-size:10px;margin:0">{{ order.review_level }}</a-tag>
                  </div>
                </div>

                <div class="row-col col-product">
                  <div class="product-name-row">{{ order.product_name || '—' }}</div>
                  <div class="meta-tags">
                    <span class="meta-tag asin">{{ order.asin }}</span>
                    <span v-if="order.store_name" class="meta-tag store">{{ order.store_name }}</span>
                    <span v-if="order.brand_name" class="meta-tag brand">{{ order.brand_name }}</span>
                    <span v-if="order.category" class="meta-tag category">{{ order.category }}</span>
                  </div>
                </div>

                <div class="row-col col-keyword">
                  <div v-if="order.keyword" class="info-line"><span class="info-label">关键词</span><span class="info-val keyword-text">{{ order.keyword }}</span></div>
                  <div v-if="order.variant_info" class="info-line"><span class="info-label">变参</span><span class="info-val">{{ order.variant_info }}</span></div>
                  <div v-if="!order.keyword && !order.variant_info" class="info-empty">—</div>
                </div>

                <div class="row-col col-price">
                  <div class="price-block">
                    <span class="price-label">售价</span>
                    <span class="price-usd">${{ Number(order.product_price || 0).toFixed(2) }}</span>
                  </div>
                </div>

                <div class="row-col col-expiry">
                  <span v-if="isExpired(order.scheduled_date)" class="expiry-badge expiry-danger">
                    <ExclamationCircleOutlined /> 逾期 {{ expiredDays(order.scheduled_date) }}天
                  </span>
                  <span v-else-if="isExpiringSoon(order.scheduled_date)" class="expiry-badge expiry-warn">
                    <ClockCircleOutlined /> {{ order.scheduled_date }}
                  </span>
                  <span v-else-if="order.scheduled_date" class="expiry-badge expiry-ok">
                    <CalendarOutlined /> {{ order.scheduled_date }}
                  </span>
                  <span v-else class="info-empty">无截止</span>
                </div>

                <div class="row-col col-staff">
                  <div class="staff-from">
                    <UserOutlined class="staff-icon" />
                    <span>{{ order.released_by_staff_name || '—' }}</span>
                  </div>
                  <div v-if="order.released_at" class="release-time">{{ fmtTime(order.released_at) }}</div>
                </div>

                <div class="row-col col-action">
                  <a-button
                    type="primary"
                    size="small"
                    :loading="grabbingId === order.id"
                    :disabled="!!grabbingId && grabbingId !== order.id"
                    @click="grabOne(order)"
                    class="grab-btn"
                  >
                    <ThunderboltOutlined /> 立即抢单
                  </a-button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="order-list">
          <div v-for="order in filteredHallOrders" :key="order.id" class="order-row">
            <div class="row-img-col">
              <img v-if="order.product_image" :src="order.product_image" class="row-img" referrerpolicy="no-referrer" @error="onImgError" />
              <div v-else class="row-img-placeholder">?</div>
            </div>

            <div class="row-col col-order">
              <span class="sub-order-no">{{ order.sub_order_number }}</span>
              <div class="tag-row">
                <a-tag v-if="order.order_type" color="blue" style="font-size:10px;margin:0">{{ order.order_type }}</a-tag>
                <a-tag v-if="order.country" color="default" style="font-size:10px;margin:0">{{ order.country }}</a-tag>
              </div>
            </div>

            <div class="row-col col-product">
              <div class="product-name-row">{{ order.product_name || '—' }}</div>
              <div class="meta-tags">
                <span class="meta-tag asin">{{ order.asin }}</span>
                <span v-if="order.store_name" class="meta-tag store">{{ order.store_name }}</span>
                <span v-if="order.brand_name" class="meta-tag brand">{{ order.brand_name }}</span>
                <span v-if="order.category" class="meta-tag category">{{ order.category }}</span>
              </div>
            </div>

            <div class="row-col col-review">
              <div v-if="order.review_type" class="info-line"><span class="info-label">类型</span><span class="meta-tag review">{{ order.review_type }}</span></div>
              <div v-if="order.review_level" class="info-line"><span class="info-label">等级</span><span class="meta-tag level">{{ order.review_level }}</span></div>
            </div>

            <div class="row-col col-keyword">
              <div v-if="order.keyword" class="info-line"><span class="info-label">关键词</span><span class="info-val keyword-text">{{ order.keyword }}</span></div>
              <div v-if="order.variant_info" class="info-line"><span class="info-label">变参</span><span class="info-val">{{ order.variant_info }}</span></div>
              <div v-if="!order.keyword && !order.variant_info" class="info-empty">—</div>
            </div>

            <div class="row-col col-price">
              <div class="price-block">
                <span class="price-label">售价</span>
                <span class="price-usd">${{ Number(order.product_price || 0).toFixed(2) }}</span>
              </div>
            </div>

            <div class="row-col col-expiry">
              <span v-if="isExpired(order.scheduled_date)" class="expiry-badge expiry-danger">
                <ExclamationCircleOutlined /> 逾期 {{ expiredDays(order.scheduled_date) }}天
              </span>
              <span v-else-if="isExpiringSoon(order.scheduled_date)" class="expiry-badge expiry-warn">
                <ClockCircleOutlined /> {{ order.scheduled_date }}
              </span>
              <span v-else-if="order.scheduled_date" class="expiry-badge expiry-ok">
                <CalendarOutlined /> {{ order.scheduled_date }}
              </span>
              <span v-else class="info-empty">无截止</span>
            </div>

            <div class="row-col col-staff">
              <div class="staff-from">
                <UserOutlined class="staff-icon" />
                <span>{{ order.released_by_staff_name || '—' }}</span>
              </div>
              <div v-if="order.released_at" class="release-time">{{ fmtTime(order.released_at) }}</div>
            </div>

            <div class="row-col col-action">
              <a-button
                type="primary"
                size="small"
                :loading="grabbingId === order.id"
                :disabled="!!grabbingId && grabbingId !== order.id"
                @click="grabOne(order)"
                class="grab-btn"
              >
                <ThunderboltOutlined /> 立即抢单
              </a-button>
            </div>
          </div>
        </div>
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
  ReloadOutlined, ThunderboltOutlined, ClockCircleOutlined,
  ExclamationCircleOutlined, CalendarOutlined, UserOutlined
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

function onImgError(e: Event) {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
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

.order-group-list { display: flex; flex-direction: column; gap: 16px; }
.order-group-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
.group-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 14px;
}
.group-main { display: flex; align-items: center; gap: 12px; min-width: 0; }
.group-meta { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.group-title-row { display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
.main-order-no { font-size: 14px; font-weight: 700; color: #1a1a2e; font-family: 'Courier New', monospace; }
.group-product {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a2e;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.group-submeta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; color: #6b7280; }
.group-stats { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; }
.group-stat {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.08);
  color: #2563eb;
  font-size: 12px;
  font-weight: 600;
}
.group-stat.is-danger {
  background: rgba(220, 38, 38, 0.08);
  color: #dc2626;
}
.group-sub-list { display: flex; flex-direction: column; gap: 8px; }

.order-list { display: flex; flex-direction: column; gap: 8px; }

.order-row {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 0;
  padding: 10px 14px;
  transition: box-shadow 0.15s, border-color 0.15s;
}
.order-row:hover {
  box-shadow: 0 3px 12px rgba(37,99,235,0.09);
  border-color: #bfdbfe;
}

.row-img-col { flex-shrink: 0; margin-right: 12px; }
.row-img { width: 52px; height: 52px; object-fit: cover; border-radius: 7px; border: 1px solid #f0f0f0; display: block; }
.row-img-placeholder {
  width: 52px; height: 52px; border-radius: 7px;
  background: #f3f4f6; display: flex; align-items: center;
  justify-content: center; color: #d1d5db; font-size: 18px;
}

.row-col { display: flex; flex-direction: column; justify-content: center; gap: 4px; padding: 0 10px; border-right: 1px solid #f3f4f6; }
.row-col:last-child { border-right: none; }

.col-order { min-width: 130px; flex-shrink: 0; }
.col-product { flex: 2; min-width: 0; }
.col-review { min-width: 90px; flex-shrink: 0; }
.col-keyword { min-width: 120px; flex: 1; }
.col-price { min-width: 110px; flex-shrink: 0; }
.col-expiry { min-width: 110px; flex-shrink: 0; }
.col-staff { min-width: 100px; flex-shrink: 0; }
.col-action { min-width: 96px; flex-shrink: 0; padding-left: 14px; border-right: none; }

.sub-order-no { font-size: 12px; font-weight: 700; color: #111827; font-family: monospace; white-space: nowrap; }
.tag-row { display: flex; flex-wrap: wrap; gap: 3px; }

.product-name-row { font-size: 13px; font-weight: 600; color: #111827; line-height: 1.35; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; }
.meta-tags { display: flex; flex-wrap: wrap; gap: 3px; }

.meta-tag { font-size: 10px; padding: 1px 5px; border-radius: 4px; white-space: nowrap; }
.meta-tag.asin { background: #eff6ff; color: #1d4ed8; font-family: monospace; font-weight: 600; }
.meta-tag.store { background: #f0fdf4; color: #15803d; }
.meta-tag.brand { background: #fdf4ff; color: #7e22ce; }
.meta-tag.category { background: #fff7ed; color: #c2410c; }
.meta-tag.review { background: #f0f9ff; color: #0369a1; }
.meta-tag.level { background: #fefce8; color: #854d0e; }

.info-line { display: flex; align-items: center; gap: 4px; }
.info-label { font-size: 10px; color: #9ca3af; white-space: nowrap; flex-shrink: 0; }
.info-val { font-size: 12px; color: #374151; font-weight: 500; }
.keyword-text { color: #0369a1; }
.info-empty { font-size: 12px; color: #d1d5db; }

.price-block { display: flex; align-items: baseline; gap: 4px; }
.price-label { font-size: 10px; color: #9ca3af; }
.price-usd { font-size: 15px; font-weight: 700; color: #0369a1; }
.price-cny { font-size: 14px; font-weight: 700; color: #059669; }

.expiry-badge {
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 10px;
  white-space: nowrap;
}
.expiry-ok { background: #f0fdf4; color: #16a34a; }
.expiry-warn { background: #fffbeb; color: #d97706; }
.expiry-danger { background: #fef2f2; color: #dc2626; }

.staff-from { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #6b7280; }
.staff-icon { color: #9ca3af; font-size: 11px; }
.release-time { font-size: 10px; color: #9ca3af; }

.grab-btn { font-weight: 600; border-radius: 7px; width: 100%; }

.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.log-toolbar { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
.log-duration { font-size: 12px; color: #6b7280; font-weight: 600; }
.log-duration.is-long { color: #d97706; }

@media (max-width: 1200px) {
  .hall-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .hall-toolbar,
  .group-head { flex-direction: column; align-items: stretch; }
  .toolbar-right { justify-content: space-between; }
}

@media (max-width: 768px) {
  .hall-stats { grid-template-columns: 1fr; }
  .toolbar-left,
  .toolbar-right { flex-wrap: wrap; }
  .view-switch { width: 100%; justify-content: space-between; }
}
</style>
