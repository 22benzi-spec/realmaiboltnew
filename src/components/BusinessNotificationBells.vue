<template>
  <div class="business-notification-bells">
    <button
      v-for="item in notificationGroups"
      :key="item.key"
      class="notification-bell"
      :title="item.title"
      @click="goToNotification(item.key)"
    >
      <a-badge :count="item.count" :overflow-count="99" size="small">
        <BellOutlined />
      </a-badge>
      <span class="notification-bell-label">{{ item.shortTitle }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { BellOutlined } from '@ant-design/icons-vue'
import { message } from 'ant-design-vue'
import { supabase } from '../lib/supabase'

type TaskRow = Record<string, any> & {
  id: string
  status?: string
  order_number?: string
  customer_name?: string
  business_manager_name?: string
  order_quantity?: number
  total_orders?: number
  review_feedback_status?: string
  review_feedback_date?: string
  updated_at?: string
  created_at?: string
  status_changed_at?: string
  _ordered_count?: number
  _review_count?: number
  _sub_total?: number
}

type IssueRow = Record<string, any> & {
  id: string
  sub_order_number?: string
  customer_name?: string
  business_manager_name?: string
  issue_type?: string
  issue_status?: string
  principal_status?: string
  old_amazon_order_id?: string
  resolution_notes?: string
  refund_to_client_notes?: string
  resolved_at?: string
  updated_at?: string
  created_at?: string
}

type NotificationRow = {
  id: string
  title: string
  meta: string
  detail?: string
  status?: string
  color?: string
  timeText: string
}

type NotificationGroup = {
  key: string
  title: string
  shortTitle: string
  description: string
  rows: NotificationRow[]
  count: number
}

const router = useRouter()
const loading = ref(false)
const taskRows = ref<TaskRow[]>([])
const issueRows = ref<IssueRow[]>([])

const handledIssueStatuses = ['已替换单号', '已替换订单', '已补单', '已追回本金', '已关闭', '无需处理', '已退款给客户']
const completedTaskStatuses = ['已完成', '已完结']
const reviewDoneStatuses = ['已留评', '已完成']
const orderedStatuses = ['已下单', '已留评', '已完成']

const notificationGroups = computed<NotificationGroup[]>(() => {
  const completedTasks = taskRows.value
    .filter(row => completedTaskStatuses.includes(normalizeText(row.status)))
    .map(row => toTaskNotification(row, {
      status: normalizeText(row.status) || '已完成',
      color: 'green',
      detail: `任务总量 ${getTaskTotal(row)} 单，已留评/完成 ${row._review_count || 0} 单`,
    }))

  const firstReviewFeedback = taskRows.value
    .filter(row => getReviewRate(row) >= 70 && normalizeText(row.review_feedback_status) !== '已反馈')
    .map(row => toTaskNotification(row, {
      status: `${getReviewRate(row)}%`,
      color: 'orange',
      detail: `评论达到 ${row._review_count || 0}/${getTaskTotal(row)} 单，待首次反馈客户`,
    }))

  const newReviewFeedback = taskRows.value
    .filter(row => normalizeText(row.review_feedback_status) === '已反馈')
    .filter(row => getReviewRate(row) >= 70 && hasPotentialReviewUpdateAfterFeedback(row))
    .map(row => toTaskNotification(row, {
      status: '有新增',
      color: 'purple',
      detail: `上次反馈 ${formatDate(row.review_feedback_date)}，当前评论 ${row._review_count || 0}/${getTaskTotal(row)} 单`,
    }))

  const handledIssues = issueRows.value
    .filter(row => handledIssueStatuses.includes(normalizeIssueStatus(row.issue_status)))
    .map(row => ({
      id: `issue-${row.id}`,
      title: row.sub_order_number || row.old_amazon_order_id || '售后问题单',
      meta: `客户：${row.customer_name || '-'} ｜ 商务：${row.business_manager_name || '-'}`,
      detail: `${row.issue_type || '售后'}：${row.resolution_notes || row.refund_to_client_notes || row.old_amazon_order_id || '已处理，待同步客户'}`,
      status: normalizeIssueStatus(row.issue_status),
      color: 'green',
      timeText: formatDateTime(row.resolved_at || row.updated_at || row.created_at),
    }))

  const dailyFeedbackTasks = taskRows.value
    .filter(row => isDailyFeedbackTask(row))
    .filter(row => !completedTaskStatuses.includes(normalizeText(row.status)))
    .map(row => toTaskNotification(row, {
      status: '每日反馈',
      color: 'blue',
      detail: `已下单 ${row._ordered_count || 0} 单，已留评/完成 ${row._review_count || 0} 单，需同步今日更新订单号`,
    }))

  return [
    buildGroup('task-completed', '任务完成通知', '任务完成', '任务已完结，需要商务反馈客户', completedTasks),
    buildGroup('first-review', '首次评论反馈通知', '首次评论', '评论进度达到 70%，待首次反馈客户', firstReviewFeedback),
    buildGroup('new-review', '新增评论反馈通知', '新增评论', '70% 已反馈后，评论有新增进度', newReviewFeedback),
    buildGroup('after-sale', '售后订单通知', '售后订单', '售后问题单已处理，待同步客户', handledIssues),
    buildGroup('daily-feedback', '每日反馈通知', '每日反馈', '标记每日反馈的任务，需要同步今日订单号', dailyFeedbackTasks),
  ]
})

onMounted(() => {
  loadNotifications()
})

async function loadNotifications() {
  loading.value = true
  try {
    const { data: orders, error: orderError } = await supabase
      .from('erp_orders')
      .select('*')
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(120)
    if (orderError) throw orderError

    const orderIds = (orders || []).map((row: any) => row.id).filter(Boolean)
    const statsMap = await loadSubOrderStats(orderIds)
    taskRows.value = (orders || []).map((row: any) => ({
      ...row,
      _ordered_count: statsMap[row.id]?.ordered || 0,
      _review_count: statsMap[row.id]?.reviewed || 0,
      _sub_total: statsMap[row.id]?.total || 0,
    }))

    const { data: issues, error: issueError } = await supabase
      .from('after_sale_issues')
      .select('*')
      .in('issue_status', handledIssueStatuses)
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(50)
    if (issueError) throw issueError
    issueRows.value = issues || []
  } catch (error: any) {
    message.error(`通知加载失败：${error?.message || '未知错误'}`)
  } finally {
    loading.value = false
  }
}

async function loadSubOrderStats(orderIds: string[]) {
  const statsMap: Record<string, { ordered: number; reviewed: number; total: number }> = {}
  if (!orderIds.length) return statsMap

  const { data } = await supabase
    .from('sub_orders')
    .select('order_id, status, amazon_order_id')
    .in('order_id', orderIds)

  ;(data || []).forEach((sub: any) => {
    if (!statsMap[sub.order_id]) statsMap[sub.order_id] = { ordered: 0, reviewed: 0, total: 0 }
    statsMap[sub.order_id].total += 1
    if (sub.amazon_order_id || orderedStatuses.includes(normalizeText(sub.status))) statsMap[sub.order_id].ordered += 1
    if (reviewDoneStatuses.includes(normalizeText(sub.status))) statsMap[sub.order_id].reviewed += 1
  })

  return statsMap
}

function buildGroup(
  key: string,
  title: string,
  shortTitle: string,
  description: string,
  rows: NotificationRow[],
): NotificationGroup {
  return {
    key,
    title,
    shortTitle,
    description,
    rows: rows.slice(0, 8),
    count: rows.length,
  }
}

function toTaskNotification(row: TaskRow, options: { status: string; color: string; detail: string }): NotificationRow {
  return {
    id: `task-${row.id}-${options.status}`,
    title: row.order_number || row.task_number || row.id,
    meta: `客户：${row.customer_name || row.group_name || '-'} ｜ 商务：${row.business_manager_name || row.sales_name || '-'}`,
    detail: options.detail,
    status: options.status,
    color: options.color,
    timeText: formatDateTime(row.status_changed_at || row.updated_at || row.created_at),
  }
}

function getTaskTotal(row: TaskRow) {
  return Number(row.order_quantity || row.total_orders || row._sub_total || 0)
}

function getReviewRate(row: TaskRow) {
  const total = getTaskTotal(row)
  if (!total) return 0
  return Math.floor((Number(row._review_count || 0) / total) * 100)
}

function hasPotentialReviewUpdateAfterFeedback(row: TaskRow) {
  if (!row.review_feedback_date) return getReviewRate(row) > 70
  const updatedAt = row.updated_at ? dayjs(row.updated_at) : null
  const feedbackAt = dayjs(row.review_feedback_date).endOf('day')
  return Boolean(updatedAt?.isValid() && updatedAt.isAfter(feedbackAt))
}

function isDailyFeedbackTask(row: TaskRow) {
  const dailyValue = [
    row.daily_feedback_status,
    row.daily_feedback,
    row.is_daily_feedback,
    row.need_daily_feedback,
    row.daily_update_required,
    row.daily_feedback_required,
    row.need_daily_update,
  ].find(value => value !== undefined && value !== null && value !== '')

  if (typeof dailyValue === 'boolean') return dailyValue
  return ['是', '需要', '需反馈', '每日反馈', 'true', '1', 'yes'].includes(String(dailyValue || '').trim().toLowerCase())
}

function normalizeText(value: any) {
  return String(value || '').trim()
}

function normalizeIssueStatus(status: any) {
  const text = normalizeText(status)
  if (text === '已替换订单') return '已替换单号'
  return text
}

function formatDate(value: any) {
  if (!value) return '-'
  const date = dayjs(value)
  return date.isValid() ? date.format('YYYY-MM-DD') : String(value)
}

function formatDateTime(value: any) {
  if (!value) return '暂无时间'
  const date = dayjs(value)
  return date.isValid() ? date.format('MM-DD HH:mm') : String(value)
}

function goToNotification(type: string) {
  router.push({ name: 'business-notifications', query: { type } })
}
</script>

<style scoped>
.business-notification-bells {
  display: flex;
  align-items: center;
  gap: 8px;
}

.notification-bell {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 10px;
  color: #1a1a2e;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.notification-bell:hover {
  color: #2563eb;
  border-color: #2563eb;
  box-shadow: 0 6px 18px rgba(37, 99, 235, 0.12);
}

.notification-bell :deep(.anticon) {
  font-size: 16px;
}

.notification-bell-label {
  font-size: 12px;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .business-notification-bells {
    justify-content: flex-end;
    flex-wrap: wrap;
  }

  .notification-bell {
    height: 32px;
    padding: 0 8px;
  }

  .notification-bell-label {
    display: none;
  }
}
</style>
