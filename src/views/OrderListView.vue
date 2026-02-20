<template>
  <div class="page-content">
    <h1 class="page-title">订单列表</h1>

    <div class="card-panel">
      <div class="toolbar">
        <a-input-search
          v-model:value="searchText"
          placeholder="搜索订单号/ASIN/店铺"
          style="width: 280px"
          @search="loadOrders"
          allow-clear
        />
        <a-select v-model:value="filterStatus" style="width: 140px" @change="loadOrders" allow-clear placeholder="状态筛选">
          <a-select-option value="">全部状态</a-select-option>
          <a-select-option v-for="s in statuses" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterCountry" style="width: 120px" @change="loadOrders" allow-clear placeholder="国家筛选">
          <a-select-option value="">全部国家</a-select-option>
          <a-select-option v-for="c in countries" :key="c" :value="c">{{ c }}</a-select-option>
        </a-select>
        <a-button type="primary" @click="loadOrders"><ReloadOutlined /> 刷新</a-button>

        <template v-if="selectedRowKeys.length > 0">
          <a-divider type="vertical" />
          <span class="batch-hint">已选 {{ selectedRowKeys.length }} 条</span>
          <a-dropdown>
            <a-button type="default">
              批量改状态 <DownOutlined />
            </a-button>
            <template #overlay>
              <a-menu @click="(info: any) => batchUpdateStatus(info.key as string)">
                <a-menu-item v-for="s in statuses" :key="s">{{ s }}</a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
          <a-popconfirm title="确定批量删除选中的订单吗?" @confirm="batchDelete">
            <a-button danger>批量删除</a-button>
          </a-popconfirm>
        </template>
      </div>

      <a-table
        :columns="columns"
        :data-source="orders"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        size="middle"
        :row-selection="rowSelection"
        @change="handleTableChange"
        :scroll="{ x: 1300 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'order_number'">
            <a class="order-number-link" @click="viewDetail(record)">{{ record.order_number }}</a>
          </template>
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
                <div v-else class="product-img-placeholder">
                  <PictureOutlined />
                </div>
              </div>
              <div>
                <div class="asin">{{ record.asin }}</div>
                <div class="store">{{ record.store_name }}</div>
              </div>
            </div>
          </template>
          <template v-if="column.key === 'status'">
            <a-tag :color="getStatusColor(record.status)">{{ record.status }}</a-tag>
          </template>
          <template v-if="column.key === 'total_amount'">
            <span class="amount">¥{{ Number(record.total_amount).toFixed(2) }}</span>
          </template>
          <template v-if="column.key === 'country'">
            <a-tag>{{ record.country }}</a-tag>
          </template>
          <template v-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="viewDetail(record)">详情</a-button>
              <a-popconfirm title="确定删除这条订单吗?" @confirm="deleteOrder(record.id)">
                <a-button type="link" size="small" danger>删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <a-drawer
      v-model:open="drawerOpen"
      :title="`订单详情 - ${currentOrder?.order_number}`"
      width="760"
      placement="right"
    >
      <template v-if="currentOrder">
        <div class="detail-header">
          <div class="detail-product">
            <div class="detail-img-wrap">
              <img
                v-if="currentOrder.product_image"
                :src="currentOrder.product_image"
                class="detail-img"
                referrerpolicy="no-referrer"
                @error="onImgError($event)"
              />
              <div v-else class="detail-img-placeholder"><PictureOutlined /></div>
            </div>
            <div>
              <div class="detail-asin">{{ currentOrder.asin }}</div>
              <div class="detail-store">{{ currentOrder.store_name }}</div>
              <a-tag :color="getStatusColor(currentOrder.status)" style="margin-top:6px">{{ currentOrder.status }}</a-tag>
            </div>
          </div>
        </div>

        <a-divider style="margin: 16px 0" />

        <a-descriptions :column="2" bordered size="small">
          <a-descriptions-item label="订单编号" :span="2">
            <span class="detail-order-num">{{ currentOrder.order_number }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="ASIN">{{ currentOrder.asin }}</a-descriptions-item>
          <a-descriptions-item label="店铺">{{ currentOrder.store_name }}</a-descriptions-item>
          <a-descriptions-item label="品牌">{{ currentOrder.brand_name }}</a-descriptions-item>
          <a-descriptions-item label="国家">{{ currentOrder.country }}</a-descriptions-item>
          <a-descriptions-item label="测评类型">{{ currentOrder.review_type }}</a-descriptions-item>
          <a-descriptions-item label="测评模式">{{ currentOrder.review_mode }}</a-descriptions-item>
          <a-descriptions-item label="下单类型">{{ currentOrder.order_type }}</a-descriptions-item>
          <a-descriptions-item label="下单数量">{{ currentOrder.order_quantity }}</a-descriptions-item>
          <a-descriptions-item label="汇率">{{ currentOrder.exchange_rate }}</a-descriptions-item>
          <a-descriptions-item label="单价(CNY)">¥{{ Number(currentOrder.unit_price).toFixed(2) }}</a-descriptions-item>
          <a-descriptions-item label="总金额(CNY)">¥{{ Number(currentOrder.total_amount).toFixed(2) }}</a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="getStatusColor(currentOrder.status)">{{ currentOrder.status }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ dayjs(currentOrder.created_at).format('YYYY-MM-DD HH:mm') }}</a-descriptions-item>
          <a-descriptions-item label="客户名称" :span="2">{{ currentOrder.customer_name || '-' }}</a-descriptions-item>
          <a-descriptions-item label="备注" :span="2">{{ currentOrder.notes || '-' }}</a-descriptions-item>
        </a-descriptions>

        <div v-if="currentOrder.product_image" style="margin-top:16px">
          <div class="detail-section-title">商品图片</div>
          <img
            :src="currentOrder.product_image"
            referrerpolicy="no-referrer"
            class="detail-full-img"
            @error="onImgError($event)"
          />
        </div>

        <a-divider style="margin: 20px 0 16px" />
        <div class="detail-section-title">任务操作</div>
        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
          <a-button type="primary" :loading="creatingTask" @click="createTaskFromOrder">
            <PlusOutlined /> 生成任务到任务中心
          </a-button>
          <span v-if="existingSubOrderCount > 0" style="color:#6b7280;font-size:12px">
            已有 {{ existingSubOrderCount }} 条任务
          </span>
        </div>
      </template>
    </a-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined, DownOutlined, PictureOutlined, PlusOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

const loading = ref(false)
const orders = ref<any[]>([])
const searchText = ref('')
const filterStatus = ref('')
const filterCountry = ref('')
const drawerOpen = ref(false)
const currentOrder = ref<any>(null)
const selectedRowKeys = ref<string[]>([])
const creatingTask = ref(false)
const existingSubOrderCount = ref(0)

const statuses = ['待处理', '进行中', '已完成', '已取消', '暂停']
const countries = ['美国', '德国', '英国', '加拿大']

const pagination = ref({ current: 1, pageSize: 20, total: 0, showSizeChanger: true })

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: string[]) => { selectedRowKeys.value = keys },
}))

const columns = [
  { title: '订单号', key: 'order_number', dataIndex: 'order_number', width: 160 },
  { title: '产品', key: 'product', width: 220 },
  { title: '国家', key: 'country', dataIndex: 'country', width: 80 },
  { title: '测评类型', dataIndex: 'review_type', key: 'review_type', width: 100 },
  { title: '下单类型', dataIndex: 'order_type', key: 'order_type', width: 90 },
  { title: '数量', dataIndex: 'order_quantity', key: 'order_quantity', width: 70 },
  { title: '总金额', key: 'total_amount', width: 110 },
  { title: '状态', key: 'status', width: 90 },
  { title: '客户', dataIndex: 'customer_name', key: 'customer_name', width: 100 },
  { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 130, customRender: ({ text }: any) => text ? dayjs(text).format('MM-DD HH:mm') : '' },
  { title: '操作', key: 'action', width: 120, fixed: 'right' },
]

function getStatusColor(status: string) {
  const map: Record<string, string> = { '待处理': 'default', '进行中': 'blue', '已完成': 'green', '已取消': 'red', '暂停': 'orange' }
  return map[status] || 'default'
}

function onImgError(e: Event) {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
  const placeholder = img.nextElementSibling as HTMLElement
  if (placeholder) placeholder.style.display = 'flex'
}

async function loadOrders() {
  loading.value = true
  selectedRowKeys.value = []
  try {
    let query = supabase.from('erp_orders').select('*', { count: 'exact' }).order('created_at', { ascending: false })
    if (searchText.value) {
      query = query.or(`order_number.ilike.%${searchText.value}%,asin.ilike.%${searchText.value}%,store_name.ilike.%${searchText.value}%`)
    }
    if (filterStatus.value) query = query.eq('status', filterStatus.value)
    if (filterCountry.value) query = query.eq('country', filterCountry.value)

    const from = (pagination.value.current - 1) * pagination.value.pageSize
    const to = from + pagination.value.pageSize - 1
    query = query.range(from, to)

    const { data, count, error } = await query
    if (error) throw error
    orders.value = data || []
    pagination.value.total = count || 0
  } catch (e: any) {
    message.error('加载失败：' + e.message)
  } finally {
    loading.value = false
  }
}

function handleTableChange(pag: any) {
  pagination.value.current = pag.current
  pagination.value.pageSize = pag.pageSize
  loadOrders()
}

async function viewDetail(record: any) {
  currentOrder.value = record
  drawerOpen.value = true
  existingSubOrderCount.value = 0
  const { count } = await supabase.from('sub_orders').select('*', { count: 'exact', head: true }).eq('order_id', record.id)
  existingSubOrderCount.value = count || 0
}

async function createTaskFromOrder() {
  if (!currentOrder.value) return
  creatingTask.value = true
  try {
    const order = currentOrder.value
    const today = dayjs().format('YYYY-MM-DD')
    const dateKey = today.replace(/-/g, '')
    const { data: counterRow } = await supabase
      .from('id_daily_counters')
      .select('last_value')
      .eq('counter_key', 'SUB')
      .eq('counter_date', today)
      .maybeSingle()
    const nextVal = (counterRow?.last_value || 0) + 1
    const subOrderNumber = `SUB${dateKey}${String(nextVal).padStart(6, '0')}`
    await supabase.from('id_daily_counters').upsert({ counter_key: 'SUB', counter_date: today, last_value: nextVal }, { onConflict: 'counter_key,counter_date' })

    const { error } = await supabase.from('sub_orders').insert({
      order_id: order.id,
      sub_order_number: subOrderNumber,
      asin: order.asin,
      store_name: order.store_name,
      country: order.country,
      order_type: order.order_type,
      product_price: order.product_price,
      unit_price: order.unit_price,
      product_image: order.product_image,
      product_name: order.product_name,
      brand_name: order.brand_name,
      category: order.category,
      review_level: order.review_level,
      review_type: order.review_type,
      variant_info: order.variant_info,
      customer_name: order.customer_name,
      customer_id_str: order.customer_id_str,
      sales_person: order.sales_person,
      commission_fee: order.commission_fee,
      exchange_rate: order.exchange_rate,
      status: '待分配',
    })
    if (error) throw error
    existingSubOrderCount.value += 1
    message.success(`任务 ${subOrderNumber} 已生成到任务中心`)
  } catch (e: any) {
    message.error('生成任务失败：' + e.message)
  } finally {
    creatingTask.value = false
  }
}

async function deleteOrder(id: string) {
  const { error } = await supabase.from('erp_orders').delete().eq('id', id)
  if (error) { message.error('删除失败'); return }
  message.success('删除成功')
  loadOrders()
}

async function batchDelete() {
  if (!selectedRowKeys.value.length) return
  const { error } = await supabase.from('erp_orders').delete().in('id', selectedRowKeys.value)
  if (error) { message.error('批量删除失败'); return }
  message.success(`已删除 ${selectedRowKeys.value.length} 条订单`)
  selectedRowKeys.value = []
  loadOrders()
}

async function batchUpdateStatus(status: string) {
  if (!selectedRowKeys.value.length) return
  const { error } = await supabase.from('erp_orders').update({ status }).in('id', selectedRowKeys.value)
  if (error) { message.error('批量更新失败'); return }
  message.success(`已将 ${selectedRowKeys.value.length} 条订单状态更新为「${status}」`)
  selectedRowKeys.value = []
  loadOrders()
}

onMounted(loadOrders)
</script>

<style scoped>
.page-content { padding: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }
.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.batch-hint { font-size: 13px; color: #2563eb; font-weight: 500; }

.order-number-link {
  color: #2563eb;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  text-decoration: none;
  font-family: 'Courier New', monospace;
}
.order-number-link:hover { text-decoration: underline; }

.product-cell { display: flex; align-items: center; gap: 10px; }
.product-img-wrap { position: relative; width: 40px; height: 40px; flex-shrink: 0; }
.product-img {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
  display: block;
}
.product-img-placeholder {
  width: 40px;
  height: 40px;
  border-radius: 6px;
  border: 1px dashed #d1d5db;
  background: #f9fafb;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  font-size: 16px;
}
.asin { font-weight: 600; font-size: 13px; }
.store { color: #6b7280; font-size: 12px; }
.amount { font-weight: 600; color: #2563eb; }

.detail-header { display: flex; align-items: flex-start; }
.detail-product { display: flex; gap: 16px; align-items: flex-start; }
.detail-img-wrap { position: relative; width: 80px; height: 80px; flex-shrink: 0; }
.detail-img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  display: block;
}
.detail-img-placeholder {
  width: 80px;
  height: 80px;
  border-radius: 10px;
  border: 1px dashed #d1d5db;
  background: #f9fafb;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  font-size: 28px;
}
.detail-asin { font-size: 18px; font-weight: 700; color: #1e40af; }
.detail-store { font-size: 14px; color: #6b7280; margin-top: 2px; }
.detail-order-num { font-family: 'Courier New', monospace; font-weight: 700; font-size: 14px; color: #1e3a8a; }
.detail-section-title { font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 8px; }
.detail-full-img {
  max-width: 200px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  display: block;
}
</style>
