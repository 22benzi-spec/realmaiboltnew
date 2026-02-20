<template>
  <div class="page-content">
    <h1 class="page-title">任务中心</h1>

    <div class="card-panel">
      <div class="toolbar">
        <a-input-search v-model:value="searchText" placeholder="搜索订单号/ASIN/店铺" style="width:280px" @search="load" allow-clear />
        <a-select v-model:value="filterStatus" style="width:150px" @change="load" allow-clear placeholder="任务状态">
          <a-select-option value="">全部状态</a-select-option>
          <a-select-option v-for="s in taskStatuses" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterCountry" style="width:110px" @change="load" allow-clear placeholder="国家">
          <a-select-option value="">全部</a-select-option>
          <a-select-option v-for="c in countries" :key="c" :value="c">{{ c }}</a-select-option>
        </a-select>
        <a-button type="primary" @click="load"><ReloadOutlined /> 刷新</a-button>
        <span class="total-hint">共 {{ pagination.total }} 个任务</span>
      </div>

      <a-table
        :columns="columns"
        :data-source="tasks"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        size="middle"
        :scroll="{ x: 1400 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'product'">
            <div class="product-cell">
              <div class="product-img-wrap">
                <img
                  v-if="record.product_image"
                  :src="record.product_image"
                  class="product-img"
                  referrerpolicy="no-referrer"
                  @error="onImgError($event)"
                />
                <div v-else class="product-img-placeholder"><PictureOutlined /></div>
              </div>
              <div>
                <div class="asin-text">{{ record.asin }}</div>
                <div class="store-text">{{ record.store_name }}</div>
              </div>
            </div>
          </template>
          <template v-if="column.key === 'order_number'">
            <span class="order-num">{{ record.order_number }}</span>
          </template>
          <template v-if="column.key === 'status'">
            <a-tag :color="getStatusColor(record.status)">{{ record.status }}</a-tag>
          </template>
          <template v-if="column.key === 'total_amount'">
            <span class="amount">¥{{ Number(record.total_amount).toFixed(2) }}</span>
          </template>
          <template v-if="column.key === 'progress'">
            <a-progress
              :percent="calcProgress(record)"
              size="small"
              :stroke-color="'#2563eb'"
              style="width:100px"
            />
          </template>
          <template v-if="column.key === 'action'">
            <a-space>
              <a-select
                :value="record.status"
                size="small"
                style="width:110px"
                @change="(val: string) => updateStatus(record.id, val, record)"
              >
                <a-select-option v-for="s in taskStatuses" :key="s" :value="s">{{ s }}</a-select-option>
              </a-select>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined, PictureOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

const loading = ref(false)
const tasks = ref<any[]>([])
const searchText = ref('')
const filterStatus = ref('进行中')
const filterCountry = ref('')
const pagination = ref({ current: 1, pageSize: 20, total: 0, showSizeChanger: true })

const taskStatuses = ['待处理', '进行中', '已完成', '已取消', '暂停']
const countries = ['美国', '德国', '英国', '加拿大']

const columns = [
  { title: '订单号', key: 'order_number', width: 165 },
  { title: '产品', key: 'product', width: 200 },
  { title: '国家', dataIndex: 'country', key: 'country', width: 80 },
  { title: '下单类型', dataIndex: 'order_type', key: 'order_type', width: 90 },
  { title: '总数量', dataIndex: 'total_orders', key: 'total_orders', width: 80 },
  { title: '总金额', key: 'total_amount', width: 110 },
  { title: '客户', dataIndex: 'customer_name', key: 'customer_name', width: 110 },
  { title: '业务员', dataIndex: 'sales_person', key: 'sales_person', width: 90 },
  { title: '状态', key: 'status', width: 90 },
  { title: '子任务进度', key: 'progress', width: 140 },
  { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 120, customRender: ({ text }: any) => text ? dayjs(text).format('MM-DD HH:mm') : '' },
  { title: '操作', key: 'action', width: 130, fixed: 'right' },
]

function getStatusColor(status: string) {
  const map: Record<string, string> = { '待处理': 'default', '进行中': 'blue', '已完成': 'green', '已取消': 'red', '暂停': 'orange' }
  return map[status] || 'default'
}

function onImgError(e: Event) {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
}

function calcProgress(record: any) {
  if (!record.total_orders || record.total_orders === 0) return 0
  const done = record._completed_count || 0
  return Math.round((done / record.total_orders) * 100)
}

async function load() {
  loading.value = true
  try {
    let query = supabase.from('erp_orders').select('*', { count: 'exact' }).order('updated_at', { ascending: false })
    if (searchText.value) {
      query = query.or(`order_number.ilike.%${searchText.value}%,asin.ilike.%${searchText.value}%,store_name.ilike.%${searchText.value}%`)
    }
    if (filterStatus.value) {
      query = query.eq('status', filterStatus.value)
    } else {
      query = query.in('status', ['进行中', '待处理', '暂停'])
    }
    if (filterCountry.value) query = query.eq('country', filterCountry.value)

    const from = (pagination.value.current - 1) * pagination.value.pageSize
    query = query.range(from, from + pagination.value.pageSize - 1)

    const { data, count, error } = await query
    if (error) throw error

    const orderIds = (data || []).map((o: any) => o.id)
    let completedMap: Record<string, number> = {}
    if (orderIds.length > 0) {
      const { data: subData } = await supabase
        .from('sub_orders')
        .select('order_id, status')
        .in('order_id', orderIds)
        .eq('status', '已完成')
      ;(subData || []).forEach((s: any) => {
        completedMap[s.order_id] = (completedMap[s.order_id] || 0) + 1
      })
    }

    tasks.value = (data || []).map((o: any) => ({ ...o, _completed_count: completedMap[o.id] || 0 }))
    pagination.value.total = count || 0
  } catch (e: any) {
    message.error('加载失败：' + e.message)
  } finally {
    loading.value = false
  }
}

async function updateStatus(id: string, status: string, record: any) {
  const { error } = await supabase.from('erp_orders').update({ status }).eq('id', id)
  if (error) { message.error('更新失败'); return }
  record.status = status
  message.success('任务状态已更新')
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
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.total-hint { font-size: 13px; color: #6b7280; margin-left: 4px; }
.order-num { font-family: 'Courier New', monospace; font-size: 12px; color: #1a1a2e; font-weight: 600; }
.product-cell { display: flex; align-items: center; gap: 8px; }
.product-img-wrap { position: relative; width: 36px; height: 36px; flex-shrink: 0; }
.product-img { width: 36px; height: 36px; object-fit: cover; border-radius: 6px; border: 1px solid #f0f0f0; }
.product-img-placeholder { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: #f5f5f5; border-radius: 6px; color: #bbb; font-size: 14px; }
.asin-text { font-size: 12px; font-weight: 600; color: #1a1a2e; }
.store-text { font-size: 11px; color: #6b7280; }
.amount { font-weight: 600; color: #2563eb; }
</style>
