<template>
  <div class="page-content">
    <div class="dashboard-header">
      <div>
        <h1 class="page-title">工作台首页</h1>
        <p class="page-subtitle">{{ greeting }}，欢迎使用揽麦ERP系统</p>
      </div>
      <a-range-picker v-model:value="dateRange" :presets="datePresets" format="YYYY-MM-DD" @change="loadStats" />
    </div>

    <a-row :gutter="[16, 16]" class="stat-row">
      <a-col :xs="12" :sm="12" :md="6" v-for="stat in statCards" :key="stat.key">
        <div class="stat-card">
          <div class="stat-card-header">
            <span class="stat-label">{{ stat.label }}</span>
            <div :class="['stat-icon', stat.colorClass]">
              <component :is="stat.icon" />
            </div>
          </div>
          <div class="stat-value">{{ stat.value }}</div>
          <div v-if="stat.sub" class="stat-sub">{{ stat.sub }}</div>
        </div>
      </a-col>
    </a-row>

    <a-row :gutter="[16, 16]" style="margin-top: 16px">
      <a-col :xs="24" :md="14">
        <div class="card-panel">
          <div class="panel-header">
            <h3>今日任务状态分布</h3>
          </div>
          <div class="status-bars">
            <div v-for="item in statusStats" :key="item.label" class="status-bar-item">
              <div class="status-bar-label">
                <span>{{ item.label }}</span>
                <span class="status-count">{{ item.count }}</span>
              </div>
              <div class="status-bar-track">
                <div
                  class="status-bar-fill"
                  :style="{ width: item.pct + '%', background: item.color }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </a-col>
      <a-col :xs="24" :md="10">
        <div class="card-panel">
          <div class="panel-header">
            <h3>快速入口</h3>
          </div>
          <div class="quick-links">
            <div v-for="link in quickLinks" :key="link.route" class="quick-link" @click="navigate(link.route)">
              <div :class="['quick-link-icon', link.colorClass]">
                <component :is="link.icon" />
              </div>
              <span>{{ link.label }}</span>
            </div>
          </div>
        </div>
      </a-col>
    </a-row>

    <div class="card-panel" style="margin-top: 16px">
      <div class="panel-header">
        <h3>最近订单</h3>
        <a-button type="link" @click="navigate('my-orders')">查看全部</a-button>
      </div>
      <a-table
        :columns="orderColumns"
        :data-source="recentOrders"
        :loading="loading"
        :pagination="false"
        size="small"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'status'">
            <a-tag :color="getStatusColor(record.status)">{{ record.status }}</a-tag>
          </template>
          <template v-if="column.key === 'total_amount'">
            ¥{{ Number(record.total_amount).toFixed(2) }}
          </template>
        </template>
      </a-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import {
  ShoppingOutlined, CheckCircleOutlined, ClockCircleOutlined,
  DollarOutlined, InboxOutlined, TeamOutlined, ThunderboltOutlined, UserAddOutlined
} from '@ant-design/icons-vue'
import { supabase } from '../lib/supabase'

const router = useRouter()
const loading = ref(false)

const now = dayjs()
const dateRange = ref<[dayjs.Dayjs, dayjs.Dayjs]>([now.startOf('month'), now])

const datePresets = [
  { label: '今天', value: [now.startOf('day'), now] as [dayjs.Dayjs, dayjs.Dayjs] },
  { label: '本周', value: [now.startOf('week'), now] as [dayjs.Dayjs, dayjs.Dayjs] },
  { label: '本月', value: [now.startOf('month'), now] as [dayjs.Dayjs, dayjs.Dayjs] },
  { label: '上月', value: [now.subtract(1,'month').startOf('month'), now.subtract(1,'month').endOf('month')] as [dayjs.Dayjs, dayjs.Dayjs] },
]

const hour = new Date().getHours()
const greeting = computed(() => {
  if (hour < 12) return '早上好'
  if (hour < 18) return '下午好'
  return '晚上好'
})

const totalOrders = ref(0)
const completedOrders = ref(0)
const pendingOrders = ref(0)
const totalAmount = ref(0)

const statCards = computed(() => [
  { key: 'total', label: '总订单数', value: totalOrders.value, icon: ShoppingOutlined, colorClass: 'icon-blue', sub: '全部订单' },
  { key: 'completed', label: '已完成', value: completedOrders.value, icon: CheckCircleOutlined, colorClass: 'icon-green', sub: `完成率 ${totalOrders.value ? Math.round(completedOrders.value/totalOrders.value*100) : 0}%` },
  { key: 'pending', label: '进行中', value: pendingOrders.value, icon: ClockCircleOutlined, colorClass: 'icon-orange', sub: '待处理任务' },
  { key: 'amount', label: '订单总金额', value: `¥${totalAmount.value.toFixed(0)}`, icon: DollarOutlined, colorClass: 'icon-cyan', sub: '人民币' },
])

const statusStats = ref([
  { label: '待分配', count: 0, color: '#f59e0b', pct: 0 },
  { label: '进行中', count: 0, color: '#3b82f6', pct: 0 },
  { label: '已下单', count: 0, color: '#8b5cf6', pct: 0 },
  { label: '已留评', count: 0, color: '#06b6d4', pct: 0 },
  { label: '已完成', count: 0, color: '#10b981', pct: 0 },
])

const quickLinks = [
  { label: '创建订单', route: 'fba-orders', icon: InboxOutlined, colorClass: 'ql-blue' },
  { label: '任务管理', route: 'task-management', icon: CheckCircleOutlined, colorClass: 'ql-green' },
  { label: '分配管理', route: 'assignment', icon: UserAddOutlined, colorClass: 'ql-orange' },
  { label: '买手库', route: 'buyers', icon: TeamOutlined, colorClass: 'ql-purple' },
  { label: '抢单大厅', route: 'grab-hall', icon: ThunderboltOutlined, colorClass: 'ql-red' },
  { label: '退款审批', route: 'refund-queue', icon: DollarOutlined, colorClass: 'ql-cyan' },
]

const recentOrders = ref<any[]>([])

const orderColumns = [
  { title: '订单编号', dataIndex: 'order_number', key: 'order_number', width: 140 },
  { title: 'ASIN', dataIndex: 'asin', key: 'asin', width: 120 },
  { title: '店铺', dataIndex: 'store_name', key: 'store_name' },
  { title: '国家', dataIndex: 'country', key: 'country', width: 80 },
  { title: '总金额', dataIndex: 'total_amount', key: 'total_amount', width: 100 },
  { title: '状态', dataIndex: 'status', key: 'status', width: 90 },
  { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 120, customRender: ({ text }: any) => text ? dayjs(text).format('MM-DD HH:mm') : '' },
]

function getStatusColor(status: string) {
  const map: Record<string, string> = {
    '待处理': 'default', '进行中': 'blue', '已完成': 'green',
    '已取消': 'red', '暂停': 'orange',
  }
  return map[status] || 'default'
}

function navigate(route: string) {
  router.push({ name: route })
}

async function loadStats() {
  loading.value = true
  try {
    const [start, end] = dateRange.value
    const startStr = start.format('YYYY-MM-DD')
    const endStr = end.format('YYYY-MM-DD') + ' 23:59:59'

    const { data: orders } = await supabase
      .from('erp_orders')
      .select('id, order_number, asin, store_name, country, total_amount, status, created_at')
      .gte('created_at', startStr)
      .lte('created_at', endStr)
      .order('created_at', { ascending: false })

    if (orders) {
      totalOrders.value = orders.length
      completedOrders.value = orders.filter(o => o.status === '已完成').length
      pendingOrders.value = orders.filter(o => ['待处理','进行中'].includes(o.status)).length
      totalAmount.value = orders.reduce((s, o) => s + Number(o.total_amount || 0), 0)
      recentOrders.value = orders.slice(0, 8)
    }

    const { data: subOrders } = await supabase
      .from('sub_orders')
      .select('status')
      .gte('created_at', startStr)
      .lte('created_at', endStr)

    if (subOrders) {
      const total = subOrders.length || 1
      statusStats.value.forEach(s => {
        s.count = subOrders.filter(o => o.status === s.label).length
        s.pct = Math.round(s.count / total * 100)
      })
    }
  } finally {
    loading.value = false
  }
}

onMounted(loadStats)
</script>

<style scoped>
.page-content {
  padding: 24px;
}
.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
}

@media (max-width: 767px) {
  .page-content {
    padding: 12px;
  }
  .dashboard-header {
    flex-direction: column;
    align-items: stretch;
  }
  .stat-value {
    font-size: 22px !important;
  }
}
.page-title {
  font-size: 22px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}
.page-subtitle {
  color: #6b7280;
  font-size: 13px;
  margin-top: 4px;
}
.stat-row {
  margin-bottom: 4px;
}
.stat-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  border: 1px solid #f0f0f0;
}
.stat-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}
.stat-label {
  font-size: 13px;
  color: #6b7280;
}
.stat-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}
.icon-blue { background: #dbeafe; color: #2563eb; }
.icon-green { background: #d1fae5; color: #059669; }
.icon-orange { background: #fed7aa; color: #ea580c; }
.icon-cyan { background: #cffafe; color: #0891b2; }
.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a2e;
  line-height: 1;
}
.stat-sub {
  font-size: 12px;
  color: #9ca3af;
  margin-top: 6px;
}
.card-panel {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  border: 1px solid #f0f0f0;
}
.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.panel-header h3 {
  font-size: 15px;
  font-weight: 600;
  color: #1a1a2e;
  margin: 0;
}
.status-bars {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.status-bar-item {}
.status-bar-label {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #374151;
  margin-bottom: 6px;
}
.status-count {
  font-weight: 600;
}
.status-bar-track {
  height: 6px;
  background: #f3f4f6;
  border-radius: 3px;
  overflow: hidden;
}
.status-bar-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.5s ease;
}
.quick-links {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
.quick-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  border: 1px solid #f0f0f0;
  transition: all 0.15s;
  font-size: 13px;
  color: #374151;
}
.quick-link:hover {
  border-color: #2563eb;
  background: #eff6ff;
  color: #2563eb;
}
.quick-link-icon {
  width: 30px;
  height: 30px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}
.ql-blue { background: #dbeafe; color: #2563eb; }
.ql-green { background: #d1fae5; color: #059669; }
.ql-orange { background: #fed7aa; color: #ea580c; }
.ql-purple { background: #ede9fe; color: #7c3aed; }
.ql-red { background: #fee2e2; color: #dc2626; }
.ql-cyan { background: #cffafe; color: #0891b2; }
</style>
