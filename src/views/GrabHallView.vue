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

        <div v-else class="order-grid">
          <div v-for="order in hallOrders" :key="order.id" class="order-card">
            <div class="card-header">
              <div class="card-header-left">
                <span class="sub-order-no">{{ order.sub_order_number }}</span>
                <a-tag v-if="order.order_type" color="blue" style="font-size:11px">{{ order.order_type }}</a-tag>
                <a-tag v-if="order.country" color="default" style="font-size:11px">{{ order.country }}</a-tag>
              </div>
              <div class="card-header-right">
                <span v-if="isExpiringSoon(order.scheduled_date)" class="expiry-badge expiry-warn">
                  <ClockCircleOutlined /> 即将到期
                </span>
                <span v-else-if="isExpired(order.scheduled_date)" class="expiry-badge expiry-danger">
                  <ExclamationCircleOutlined /> 已过期 {{ expiredDays(order.scheduled_date) }} 天
                </span>
                <span v-else-if="order.scheduled_date" class="expiry-badge expiry-ok">
                  <CalendarOutlined /> {{ order.scheduled_date }}
                </span>
              </div>
            </div>

            <div class="card-body">
              <div class="product-row">
                <img v-if="order.product_image" :src="order.product_image" class="product-img" referrerpolicy="no-referrer" @error="onImgError" />
                <div v-else class="product-img-placeholder">?</div>
                <div class="product-info">
                  <div class="product-name">{{ order.product_name || '—' }}</div>
                  <div class="product-meta">
                    <span class="meta-tag asin">{{ order.asin }}</span>
                    <span v-if="order.store_name" class="meta-tag store">{{ order.store_name }}</span>
                    <span v-if="order.brand_name" class="meta-tag brand">{{ order.brand_name }}</span>
                  </div>
                  <div class="product-meta" style="margin-top:4px">
                    <span v-if="order.category" class="meta-tag category">{{ order.category }}</span>
                    <span v-if="order.review_type" class="meta-tag review">{{ order.review_type }}</span>
                    <span v-if="order.review_level" class="meta-tag level">{{ order.review_level }}</span>
                  </div>
                </div>
              </div>

              <div class="price-row">
                <div class="price-item">
                  <span class="price-label">产品售价</span>
                  <span class="price-val usd">${{ Number(order.product_price || 0).toFixed(2) }}</span>
                </div>
                <div class="price-item">
                  <span class="price-label">佣金</span>
                  <span class="price-val cny">¥{{ Number(order.commission_fee || 0).toFixed(2) }}</span>
                </div>
                <div v-if="order.keyword" class="keyword-item">
                  <span class="price-label">关键词</span>
                  <span class="keyword-val">{{ order.keyword }}</span>
                </div>
                <div v-if="order.variant_info" class="keyword-item">
                  <span class="price-label">变参</span>
                  <span class="keyword-val">{{ order.variant_info }}</span>
                </div>
              </div>

              <div class="release-row">
                <UserOutlined style="color:#9ca3af;font-size:11px" />
                <span class="release-by">来自：{{ order.released_by_staff_name || '—' }}</span>
                <span v-if="order.released_at" class="release-time">{{ fmtTime(order.released_at) }}</span>
              </div>
            </div>

            <div class="card-footer">
              <a-button
                type="primary"
                block
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

.order-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 16px;
}

.order-card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.15s, border-color 0.15s;
}
.order-card:hover {
  box-shadow: 0 4px 16px rgba(37,99,235,0.1);
  border-color: #bfdbfe;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: #f8fafc;
  border-bottom: 1px solid #f0f0f0;
  gap: 8px;
}
.card-header-left { display: flex; align-items: center; gap: 6px; flex: 1; min-width: 0; }
.sub-order-no { font-size: 12px; font-weight: 700; color: #374151; font-family: monospace; }
.card-header-right { flex-shrink: 0; }

.expiry-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 12px;
}
.expiry-ok { background: #f0fdf4; color: #16a34a; }
.expiry-warn { background: #fffbeb; color: #d97706; }
.expiry-danger { background: #fef2f2; color: #dc2626; }

.card-body { padding: 14px; flex: 1; display: flex; flex-direction: column; gap: 12px; }

.product-row { display: flex; gap: 10px; align-items: flex-start; }
.product-img {
  width: 56px; height: 56px; object-fit: cover;
  border-radius: 8px; border: 1px solid #f0f0f0; flex-shrink: 0;
}
.product-img-placeholder {
  width: 56px; height: 56px; border-radius: 8px;
  background: #f3f4f6; display: flex; align-items: center;
  justify-content: center; color: #d1d5db; font-size: 20px; flex-shrink: 0;
}
.product-info { flex: 1; min-width: 0; }
.product-name { font-size: 13px; font-weight: 600; color: #111827; line-height: 1.4; margin-bottom: 6px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
.product-meta { display: flex; flex-wrap: wrap; gap: 4px; }
.meta-tag { font-size: 11px; padding: 1px 6px; border-radius: 4px; }
.meta-tag.asin { background: #eff6ff; color: #1d4ed8; font-family: monospace; font-weight: 600; }
.meta-tag.store { background: #f0fdf4; color: #15803d; }
.meta-tag.brand { background: #fdf4ff; color: #7e22ce; }
.meta-tag.category { background: #fff7ed; color: #c2410c; }
.meta-tag.review { background: #f0f9ff; color: #0369a1; }
.meta-tag.level { background: #fefce8; color: #854d0e; }

.price-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  background: #f8fafc;
  border-radius: 8px;
  padding: 10px 12px;
}
.price-item { display: flex; flex-direction: column; gap: 2px; }
.keyword-item { display: flex; flex-direction: column; gap: 2px; }
.price-label { font-size: 10px; color: #9ca3af; }
.price-val { font-size: 15px; font-weight: 700; }
.price-val.usd { color: #0369a1; }
.price-val.cny { color: #059669; }
.keyword-val { font-size: 12px; color: #374151; font-weight: 500; }

.release-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-top: 4px;
  border-top: 1px solid #f3f4f6;
}
.release-by { font-size: 11px; color: #6b7280; }
.release-time { font-size: 11px; color: #9ca3af; margin-left: auto; }

.card-footer { padding: 12px 14px; border-top: 1px solid #f0f0f0; }
.grab-btn { height: 36px; font-weight: 600; font-size: 14px; border-radius: 8px; }

.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
</style>
