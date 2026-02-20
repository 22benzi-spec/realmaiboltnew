<template>
  <div class="page-content">
    <h1 class="page-title">抢单大厅</h1>

    <a-tabs v-model:activeKey="activeTab">
      <a-tab-pane key="hall" tab="抢单大厅">
        <div class="hall-toolbar">
          <div class="toolbar-left">
            <a-select v-model:value="grabStaffId" style="width:180px" placeholder="选择抢单业务员" show-search option-filter-prop="label">
              <a-select-option v-for="s in staffList" :key="s.id" :value="s.id" :label="s.name">{{ s.name }}</a-select-option>
            </a-select>
            <a-button @click="loadHall" :loading="loading"><ReloadOutlined /> 刷新</a-button>
          </div>
          <div class="toolbar-right">
            <div class="count-badge">
              <span class="count-num">{{ hallOrders.length }}</span>
              <span class="count-label">个订单待抢</span>
            </div>
          </div>
        </div>

        <div v-if="loading" class="loading-wrap"><a-spin size="large" /></div>

        <div v-else-if="hallOrders.length === 0" class="empty-hall">
          <a-empty description="暂无可抢订单" />
        </div>

        <div v-else class="order-list">
          <div v-for="order in hallOrders" :key="order.id" class="order-row">
            <!-- 产品图 -->
            <div class="row-img-col">
              <img v-if="order.product_image" :src="order.product_image" class="row-img" referrerpolicy="no-referrer" @error="onImgError" />
              <div v-else class="row-img-placeholder">?</div>
            </div>

            <!-- 订单号 + 标签 -->
            <div class="row-col col-order">
              <span class="sub-order-no">{{ order.sub_order_number }}</span>
              <div class="tag-row">
                <a-tag v-if="order.order_type" color="blue" style="font-size:10px;margin:0">{{ order.order_type }}</a-tag>
                <a-tag v-if="order.country" color="default" style="font-size:10px;margin:0">{{ order.country }}</a-tag>
              </div>
            </div>

            <!-- 产品信息 -->
            <div class="row-col col-product">
              <div class="product-name-row">{{ order.product_name || '—' }}</div>
              <div class="meta-tags">
                <span class="meta-tag asin">{{ order.asin }}</span>
                <span v-if="order.store_name" class="meta-tag store">{{ order.store_name }}</span>
                <span v-if="order.brand_name" class="meta-tag brand">{{ order.brand_name }}</span>
                <span v-if="order.category" class="meta-tag category">{{ order.category }}</span>
              </div>
            </div>

            <!-- 测评类型/等级 -->
            <div class="row-col col-review">
              <div v-if="order.review_type" class="info-line"><span class="info-label">类型</span><span class="meta-tag review">{{ order.review_type }}</span></div>
              <div v-if="order.review_level" class="info-line"><span class="info-label">等级</span><span class="meta-tag level">{{ order.review_level }}</span></div>
            </div>

            <!-- 关键词/变参 -->
            <div class="row-col col-keyword">
              <div v-if="order.keyword" class="info-line"><span class="info-label">关键词</span><span class="info-val keyword-text">{{ order.keyword }}</span></div>
              <div v-if="order.variant_info" class="info-line"><span class="info-label">变参</span><span class="info-val">{{ order.variant_info }}</span></div>
              <div v-if="!order.keyword && !order.variant_info" class="info-empty">—</div>
            </div>

            <!-- 价格/佣金 -->
            <div class="row-col col-price">
              <div class="price-block">
                <span class="price-label">售价</span>
                <span class="price-usd">${{ Number(order.product_price || 0).toFixed(2) }}</span>
              </div>
              <div class="price-block">
                <span class="price-label">佣金</span>
                <span class="price-cny">¥{{ Number(order.commission_fee || 0).toFixed(2) }}</span>
              </div>
            </div>

            <!-- 到期时间 -->
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

            <!-- 来源业务员 -->
            <div class="row-col col-staff">
              <div class="staff-from">
                <UserOutlined style="color:#9ca3af;font-size:11px" />
                <span>{{ order.released_by_staff_name || '—' }}</span>
              </div>
              <div v-if="order.released_at" class="release-time">{{ fmtTime(order.released_at) }}</div>
            </div>

            <!-- 抢单按钮 -->
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
          <a-table
            :columns="logColumns"
            :data-source="logs"
            :loading="logLoading"
            row-key="id"
            size="small"
            :pagination="{ pageSize: 20 }"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'action_tag'">
                <a-tag :color="getLogActionColor(record.action)">{{ record.action }}</a-tag>
              </template>
            </template>
          </a-table>
        </div>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  ReloadOutlined, ThunderboltOutlined, ClockCircleOutlined,
  ExclamationCircleOutlined, CalendarOutlined, UserOutlined
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

const activeTab = ref('hall')
const loading = ref(false)
const logLoading = ref(false)
const hallOrders = ref<any[]>([])
const logs = ref<any[]>([])
const staffList = ref<any[]>([])
const grabStaffId = ref('')
const grabbingId = ref('')

const logColumns = [
  { title: '子单号', dataIndex: 'sub_order_number', key: 'sub_order_number', width: 160 },
  { title: '操作', key: 'action_tag', width: 100 },
  { title: '来源业务员', dataIndex: 'from_staff_name', key: 'from_staff_name', width: 110 },
  { title: '目标业务员', dataIndex: 'to_staff_name', key: 'to_staff_name', width: 110 },
  { title: '原因', dataIndex: 'reason', key: 'reason' },
  { title: '时间', dataIndex: 'created_at', key: 'created_at', width: 140, customRender: ({ text }: any) => text ? dayjs(text).format('MM-DD HH:mm') : '' },
]

function getLogActionColor(action: string) {
  if (action === 'grab' || action === '抢单') return 'green'
  if (action === '互转接受') return 'blue'
  if (action === '回转') return 'orange'
  return 'default'
}

function fmtTime(t: string | null) {
  if (!t) return ''
  return dayjs(t).format('MM-DD HH:mm')
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
.count-badge { display: flex; align-items: baseline; gap: 4px; }
.count-num { font-size: 24px; font-weight: 700; color: #2563eb; line-height: 1; }
.count-label { font-size: 13px; color: #6b7280; }

.loading-wrap { display: flex; justify-content: center; padding: 80px 0; }
.empty-hall { background: #fff; border-radius: 12px; padding: 60px 0; }

/* 横排列表 */
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
.release-time { font-size: 10px; color: #9ca3af; }

.grab-btn { font-weight: 600; border-radius: 7px; width: 100%; }

.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
</style>
