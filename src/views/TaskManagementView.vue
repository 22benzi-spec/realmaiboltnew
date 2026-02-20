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
        :scroll="{ x: 1500 }"
        @change="handleTableChange"
        :expand-row-by-click="false"
        :expanded-row-keys="expandedRowKeys"
        @expand="onExpand"
      >
        <template #expandedRowRender="{ record }">
          <div class="sub-orders-panel">
            <div class="sub-orders-header">
              <span class="sub-orders-title">子订单列表（{{ subOrdersMap[record.id]?.length || 0 }} / {{ record.order_quantity }} 单）</span>
              <a-button
                type="primary"
                size="small"
                :loading="genLoadingId === record.id"
                :disabled="(subOrdersMap[record.id]?.length || 0) >= (record.order_quantity || 0)"
                @click="generateSubOrders(record)"
              >
                生成全部子订单
              </a-button>
            </div>
            <a-table
              v-if="subOrdersMap[record.id]?.length"
              :columns="subColumns"
              :data-source="subOrdersMap[record.id]"
              :pagination="false"
              row-key="id"
              size="small"
              :scroll="{ x: 1800 }"
              style="margin-top:10px"
            >
              <template #bodyCell="{ column, record: sub }">
                <template v-if="column.key === 'sub_product'">
                  <div class="sub-product-cell">
                    <img v-if="sub.product_image" :src="sub.product_image" class="sub-product-img" referrerpolicy="no-referrer" @error="onImgError($event)" />
                    <div v-else class="sub-product-img-placeholder"><PictureOutlined /></div>
                    <div>
                      <div class="sub-asin">{{ sub.asin }}</div>
                      <div class="sub-store">{{ sub.store_name }}</div>
                    </div>
                  </div>
                </template>
                <template v-if="column.key === 'sub_price'">
                  <div>
                    <div class="price-main">${{ Number(sub.product_price || 0).toFixed(2) }}</div>
                    <div class="price-sub">¥{{ Number(sub.unit_price || 0).toFixed(2) }}</div>
                  </div>
                </template>
                <template v-if="column.key === 'sub_commission'">
                  <span class="commission-val">¥{{ Number(sub.commission_fee || 0).toFixed(2) }}</span>
                </template>
                <template v-if="column.key === 'sub_status'">
                  <a-tag :color="getSubStatusColor(sub.status)">{{ sub.status || '待分配' }}</a-tag>
                </template>
                <template v-if="column.key === 'sub_staff'">
                  <span v-if="sub.staff_name" class="staff-name">{{ sub.staff_name }}</span>
                  <span v-else class="text-gray">未分配</span>
                </template>
                <template v-if="column.key === 'sub_buyer'">
                  <span v-if="sub.buyer_name">{{ sub.buyer_name }}</span>
                  <span v-else class="text-gray">—</span>
                </template>
                <template v-if="column.key === 'sub_amazon_order'">
                  <span v-if="sub.amazon_order_id" class="order-num-sm">{{ sub.amazon_order_id }}</span>
                  <span v-else class="text-gray">—</span>
                </template>
                <template v-if="column.key === 'sub_refund'">
                  <div v-if="sub.refund_status">
                    <a-tag color="orange" size="small">{{ sub.refund_status }}</a-tag>
                    <div v-if="sub.refund_amount" class="refund-amount">¥{{ Number(sub.refund_amount).toFixed(2) }}</div>
                  </div>
                  <span v-else class="text-gray">—</span>
                </template>
                <template v-if="column.key === 'sub_scheduled'">
                  <span v-if="sub.scheduled_date" :class="isOverdue(sub.scheduled_date) ? 'date-overdue' : 'date-normal'">{{ sub.scheduled_date }}</span>
                  <span v-else class="text-gray">—</span>
                </template>
                <template v-if="column.key === 'sub_action'">
                  <a-space>
                    <a-button type="link" size="small" @click="openDetail(sub)">详情</a-button>
                    <a-popconfirm title="确定删除这条子订单吗?" @confirm="deleteSubOrder(sub.id, record.id)">
                      <a-button type="link" size="small" danger>删除</a-button>
                    </a-popconfirm>
                  </a-space>
                </template>
              </template>
            </a-table>
            <div v-else class="no-sub-orders">暂无子订单，点击「生成全部子订单」按钮批量生成</div>
          </div>
        </template>

        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'product'">
            <div class="product-cell">
              <div class="product-img-wrap">
                <img v-if="record.product_image" :src="record.product_image" class="product-img" referrerpolicy="no-referrer" @error="onImgError($event)" />
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
            <a-progress :percent="calcProgress(record)" size="small" :stroke-color="'#2563eb'" style="width:100px" />
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
              <a-popconfirm title="确定删除此任务及所有子订单吗?" @confirm="deleteTask(record.id)">
                <a-button type="link" size="small" danger>删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <!-- 子订单详情弹窗 -->
    <a-modal
      v-model:open="detailOpen"
      title="子订单详情"
      :footer="null"
      width="800px"
      :body-style="{ padding: '0' }"
    >
      <div v-if="detailRecord" class="detail-modal-body">
        <div class="detail-header">
          <div class="detail-sub-number">{{ detailRecord.sub_order_number }}</div>
          <a-tag :color="getSubStatusColor(detailRecord.status)">{{ detailRecord.status || '待分配' }}</a-tag>
        </div>

        <div class="detail-sections">
          <div class="detail-section">
            <div class="detail-section-title">产品信息</div>
            <div class="detail-grid">
              <div class="detail-item" v-if="detailRecord.product_image">
                <label>产品图片</label>
                <div><img :src="detailRecord.product_image" class="detail-product-img" referrerpolicy="no-referrer" @error="onImgError($event)" /></div>
              </div>
              <div class="detail-item"><label>ASIN</label><span class="mono">{{ detailRecord.asin || '—' }}</span></div>
              <div class="detail-item"><label>产品名称</label><span>{{ detailRecord.product_name || '—' }}</span></div>
              <div class="detail-item"><label>品牌名称</label><span>{{ detailRecord.brand_name || '—' }}</span></div>
              <div class="detail-item"><label>店铺名称</label><span>{{ detailRecord.store_name || '—' }}</span></div>
              <div class="detail-item"><label>国家/站点</label><span>{{ detailRecord.country || '—' }}</span></div>
              <div class="detail-item"><label>类目</label><span>{{ detailRecord.category || '—' }}</span></div>
              <div class="detail-item"><label>变参信息</label><span>{{ detailRecord.variant_info || '—' }}</span></div>
            </div>
          </div>

          <div class="detail-section">
            <div class="detail-section-title">订单信息</div>
            <div class="detail-grid">
              <div class="detail-item"><label>下单类型</label><span>{{ detailRecord.order_type || '—' }}</span></div>
              <div class="detail-item"><label>测评类型</label><span>{{ detailRecord.review_type || '—' }}</span></div>
              <div class="detail-item"><label>评价等级</label><span>{{ detailRecord.review_level || '—' }}</span></div>
              <div class="detail-item"><label>产品价格</label><span>${{ Number(detailRecord.product_price || 0).toFixed(2) }}</span></div>
              <div class="detail-item"><label>汇率</label><span>{{ detailRecord.exchange_rate || '—' }}</span></div>
              <div class="detail-item"><label>单价(CNY)</label><span class="price-highlight">¥{{ Number(detailRecord.unit_price || 0).toFixed(2) }}</span></div>
              <div class="detail-item"><label>佣金</label><span class="commission-highlight">¥{{ Number(detailRecord.commission_fee || 0).toFixed(2) }}</span></div>
              <div class="detail-item"><label>关键词</label><span>{{ detailRecord.keyword || '—' }}</span></div>
              <div class="detail-item"><label>排期日期</label><span :class="detailRecord.scheduled_date && isOverdue(detailRecord.scheduled_date) ? 'date-overdue' : ''">{{ detailRecord.scheduled_date || '—' }}</span></div>
              <div class="detail-item"><label>亚马逊订单号</label><span class="mono">{{ detailRecord.amazon_order_id || '—' }}</span></div>
            </div>
          </div>

          <div class="detail-section">
            <div class="detail-section-title">客户 / 人员</div>
            <div class="detail-grid">
              <div class="detail-item"><label>客户名称</label><span>{{ detailRecord.customer_name || '—' }}</span></div>
              <div class="detail-item"><label>客户ID</label><span class="mono">{{ detailRecord.customer_id_str || '—' }}</span></div>
              <div class="detail-item"><label>销售人员</label><span>{{ detailRecord.sales_person || '—' }}</span></div>
              <div class="detail-item"><label>业务员</label><span>{{ detailRecord.staff_name || '未分配' }}</span></div>
              <div class="detail-item"><label>买手</label><span>{{ detailRecord.buyer_name || '未分配' }}</span></div>
            </div>
          </div>

          <div class="detail-section">
            <div class="detail-section-title">退款信息</div>
            <div class="detail-grid">
              <div class="detail-item"><label>退款状态</label>
                <a-tag v-if="detailRecord.refund_status" color="orange">{{ detailRecord.refund_status }}</a-tag>
                <span v-else class="text-gray">—</span>
              </div>
              <div class="detail-item"><label>退款方式</label><span>{{ detailRecord.refund_method || '—' }}</span></div>
              <div class="detail-item"><label>退款顺序</label><span>{{ detailRecord.refund_sequence || '—' }}</span></div>
              <div class="detail-item"><label>退款金额</label><span v-if="detailRecord.refund_amount" class="refund-highlight">¥{{ Number(detailRecord.refund_amount).toFixed(2) }}</span><span v-else class="text-gray">—</span></div>
              <div class="detail-item"><label>退款日期</label><span>{{ detailRecord.refund_date || '—' }}</span></div>
            </div>
          </div>

          <div class="detail-section">
            <div class="detail-section-title">时间节点</div>
            <div class="detail-grid">
              <div class="detail-item"><label>买手接单时间</label><span>{{ fmtTime(detailRecord.buyer_assigned_at) }}</span></div>
              <div class="detail-item"><label>亚马逊下单时间</label><span>{{ fmtTime(detailRecord.amazon_order_placed_at) }}</span></div>
              <div class="detail-item"><label>收货确认时间</label><span>{{ fmtTime(detailRecord.delivery_confirmed_at) }}</span></div>
              <div class="detail-item"><label>留评提交时间</label><span>{{ fmtTime(detailRecord.review_submitted_at) }}</span></div>
              <div class="detail-item"><label>创建时间</label><span>{{ fmtTime(detailRecord.created_at) }}</span></div>
              <div class="detail-item"><label>更新时间</label><span>{{ fmtTime(detailRecord.updated_at) }}</span></div>
            </div>
          </div>

          <div class="detail-section" v-if="detailRecord.notes || detailRecord.task_notes || detailRecord.cancel_reason">
            <div class="detail-section-title">备注信息</div>
            <div class="detail-grid">
              <div class="detail-item detail-full"><label>订单备注</label><span>{{ detailRecord.notes || '—' }}</span></div>
              <div class="detail-item detail-full"><label>任务备注</label><span>{{ detailRecord.task_notes || '—' }}</span></div>
              <div class="detail-item detail-full" v-if="detailRecord.cancel_reason"><label>取消原因</label><span class="text-red">{{ detailRecord.cancel_reason }}</span></div>
            </div>
          </div>

          <div class="detail-section" v-if="detailRecord.released_to_hall">
            <div class="detail-section-title">放单大厅信息</div>
            <div class="detail-grid">
              <div class="detail-item"><label>已放单</label><a-tag color="green">是</a-tag></div>
              <div class="detail-item"><label>放单人</label><span>{{ detailRecord.released_by_staff_name || '—' }}</span></div>
              <div class="detail-item"><label>放单时间</label><span>{{ fmtTime(detailRecord.released_at) }}</span></div>
              <div class="detail-item detail-full"><label>放单原因</label><span>{{ detailRecord.release_reason || '—' }}</span></div>
            </div>
          </div>

          <div class="detail-section" v-if="detailRecord.review_screenshot_url">
            <div class="detail-section-title">留评截图</div>
            <img :src="detailRecord.review_screenshot_url" class="review-screenshot" referrerpolicy="no-referrer" @error="onImgError($event)" />
          </div>
        </div>
      </div>
    </a-modal>
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
const expandedRowKeys = ref<string[]>([])
const subOrdersMap = ref<Record<string, any[]>>({})
const genLoadingId = ref<string | null>(null)
const detailOpen = ref(false)
const detailRecord = ref<any>(null)

const taskStatuses = ['待处理', '进行中', '已完成', '已取消', '暂停']
const countries = ['美国', '德国', '英国', '加拿大']

const columns = [
  { title: '订单号', key: 'order_number', width: 165 },
  { title: '产品', key: 'product', width: 200 },
  { title: '国家', dataIndex: 'country', key: 'country', width: 80 },
  { title: '下单类型', dataIndex: 'order_type', key: 'order_type', width: 90 },
  { title: '总数量', dataIndex: 'order_quantity', key: 'order_quantity', width: 80 },
  { title: '总金额', key: 'total_amount', width: 110 },
  { title: '客户', dataIndex: 'customer_name', key: 'customer_name', width: 110 },
  { title: '业务员', dataIndex: 'sales_person', key: 'sales_person', width: 90 },
  { title: '状态', key: 'status', width: 90 },
  { title: '子任务进度', key: 'progress', width: 140 },
  { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 120, customRender: ({ text }: any) => text ? dayjs(text).format('MM-DD HH:mm') : '' },
  { title: '操作', key: 'action', width: 190, fixed: 'right' },
]

const subColumns = [
  { title: '子订单号', dataIndex: 'sub_order_number', key: 'sub_order_number', width: 170 },
  { title: '产品/ASIN', key: 'sub_product', width: 180 },
  { title: '国家', dataIndex: 'country', key: 'country', width: 70 },
  { title: '下单类型', dataIndex: 'order_type', key: 'order_type', width: 90 },
  { title: '测评类型', dataIndex: 'review_type', key: 'review_type', width: 90 },
  { title: '评价等级', dataIndex: 'review_level', key: 'review_level', width: 90 },
  { title: '产品价/单价', key: 'sub_price', width: 110 },
  { title: '佣金', key: 'sub_commission', width: 90 },
  { title: '关键词', dataIndex: 'keyword', key: 'keyword', width: 120 },
  { title: '变参', dataIndex: 'variant_info', key: 'variant_info', width: 100 },
  { title: '客户', dataIndex: 'customer_name', key: 'customer_name', width: 100 },
  { title: '销售', dataIndex: 'sales_person', key: 'sales_person', width: 90 },
  { title: '业务员', key: 'sub_staff', width: 90 },
  { title: '买手', key: 'sub_buyer', width: 90 },
  { title: '亚马逊订单号', key: 'sub_amazon_order', width: 140 },
  { title: '排期', key: 'sub_scheduled', width: 100 },
  { title: '退款', key: 'sub_refund', width: 110 },
  { title: '状态', key: 'sub_status', width: 90 },
  { title: '操作', key: 'sub_action', width: 110, fixed: 'right' },
]

function getStatusColor(status: string) {
  const map: Record<string, string> = { '待处理': 'default', '进行中': 'blue', '已完成': 'green', '已取消': 'red', '暂停': 'orange' }
  return map[status] || 'default'
}

function getSubStatusColor(status: string) {
  const map: Record<string, string> = { '待分配': 'default', '已分配': 'cyan', '进行中': 'blue', '已下单': 'orange', '已留评': 'geekblue', '已完成': 'green', '已取消': 'red' }
  return map[status] || 'default'
}

function onImgError(e: Event) {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
}

function isOverdue(dateStr: string) {
  return dayjs(dateStr).isBefore(dayjs(), 'day')
}

function fmtTime(t: string | null) {
  if (!t) return '—'
  return dayjs(t).format('YYYY-MM-DD HH:mm')
}

function calcProgress(record: any) {
  if (!record.order_quantity || record.order_quantity === 0) return 0
  const done = record._completed_count || 0
  return Math.round((done / record.order_quantity) * 100)
}

function openDetail(sub: any) {
  detailRecord.value = sub
  detailOpen.value = true
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

async function loadSubOrders(orderId: string) {
  const { data, error } = await supabase
    .from('sub_orders')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })
  if (error) { message.error('加载子订单失败'); return }
  subOrdersMap.value[orderId] = data || []
}

async function onExpand(expanded: boolean, record: any) {
  if (expanded) {
    expandedRowKeys.value = [...expandedRowKeys.value, record.id]
    await loadSubOrders(record.id)
  } else {
    expandedRowKeys.value = expandedRowKeys.value.filter(k => k !== record.id)
  }
}

async function generateSubOrders(record: any) {
  genLoadingId.value = record.id
  try {
    const existing = subOrdersMap.value[record.id] || []
    const toCreate = (record.order_quantity || 0) - existing.length
    if (toCreate <= 0) {
      message.info('子订单已全部生成')
      return
    }

    const commissionFee = Number(record.commission_fee || 0) > 0
      ? Number(record.commission_fee)
      : Number(record.unit_price || 0) - Number(record.product_price || 0) * Number(record.exchange_rate || 1)

    const rows = Array.from({ length: toCreate }, () => ({
      order_id: record.id,
      asin: record.asin,
      store_name: record.store_name,
      country: record.country,
      order_type: record.order_type,
      product_price: record.product_price,
      unit_price: record.unit_price,
      commission_fee: commissionFee > 0 ? commissionFee : 0,
      exchange_rate: record.exchange_rate,
      product_image: record.product_image,
      product_name: record.product_name,
      brand_name: record.brand_name,
      category: record.category,
      review_level: record.review_level,
      review_type: record.review_type,
      variant_info: record.variant_info,
      customer_name: record.customer_name,
      customer_id_str: record.customer_id_str,
      sales_person: record.sales_person,
      status: '待分配',
    }))

    const { error } = await supabase.from('sub_orders').insert(rows)
    if (error) throw error
    message.success(`成功生成 ${toCreate} 条子订单`)
    await loadSubOrders(record.id)
  } catch (e: any) {
    message.error('生成子订单失败：' + e.message)
  } finally {
    genLoadingId.value = null
  }
}

async function deleteSubOrder(subId: string, orderId: string) {
  const { error } = await supabase.from('sub_orders').delete().eq('id', subId)
  if (error) { message.error('删除失败'); return }
  message.success('子订单已删除')
  await loadSubOrders(orderId)
}

async function updateStatus(id: string, status: string, record: any) {
  const { error } = await supabase.from('erp_orders').update({ status }).eq('id', id)
  if (error) { message.error('更新失败'); return }
  record.status = status
  message.success('任务状态已更新')
}

async function deleteTask(id: string) {
  const { error: subErr } = await supabase.from('sub_orders').delete().eq('order_id', id)
  if (subErr) { message.error('删除子订单失败'); return }
  const { error } = await supabase.from('erp_orders').delete().eq('id', id)
  if (error) { message.error('删除任务失败'); return }
  message.success('任务及子订单已全部删除')
  delete subOrdersMap.value[id]
  expandedRowKeys.value = expandedRowKeys.value.filter(k => k !== id)
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
.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.total-hint { font-size: 13px; color: #6b7280; margin-left: 4px; }
.order-num { font-family: 'Courier New', monospace; font-size: 12px; color: #1a1a2e; font-weight: 600; }
.order-num-sm { font-family: 'Courier New', monospace; font-size: 11px; color: #374151; }
.product-cell { display: flex; align-items: center; gap: 8px; }
.product-img-wrap { position: relative; width: 36px; height: 36px; flex-shrink: 0; }
.product-img { width: 36px; height: 36px; object-fit: cover; border-radius: 6px; border: 1px solid #f0f0f0; }
.product-img-placeholder { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; background: #f5f5f5; border-radius: 6px; color: #bbb; font-size: 14px; }
.asin-text { font-size: 12px; font-weight: 600; color: #1a1a2e; }
.store-text { font-size: 11px; color: #6b7280; }
.amount { font-weight: 600; color: #2563eb; }
.text-gray { color: #9ca3af; font-size: 12px; }
.text-red { color: #dc2626; }
.staff-name { color: #374151; font-size: 12px; }

.sub-orders-panel {
  background: #f8fafc;
  border-radius: 8px;
  padding: 14px 16px;
  border: 1px solid #e5e7eb;
}
.sub-orders-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sub-orders-title {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}
.no-sub-orders {
  margin-top: 12px;
  color: #9ca3af;
  font-size: 13px;
  text-align: center;
  padding: 16px 0;
}

.sub-product-cell { display: flex; align-items: center; gap: 6px; }
.sub-product-img { width: 28px; height: 28px; object-fit: cover; border-radius: 4px; border: 1px solid #f0f0f0; flex-shrink: 0; }
.sub-product-img-placeholder { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; background: #f5f5f5; border-radius: 4px; color: #ccc; font-size: 12px; flex-shrink: 0; }
.sub-asin { font-size: 11px; font-weight: 600; color: #1a1a2e; }
.sub-store { font-size: 10px; color: #9ca3af; }
.price-main { font-size: 11px; font-weight: 600; color: #374151; }
.price-sub { font-size: 11px; color: #2563eb; }
.commission-val { font-size: 12px; font-weight: 600; color: #059669; }
.refund-amount { font-size: 11px; color: #f59e0b; font-weight: 600; margin-top: 2px; }
.date-normal { font-size: 12px; color: #374151; }
.date-overdue { font-size: 12px; color: #dc2626; font-weight: 600; }

.detail-modal-body { padding: 0; }
.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  border-bottom: 1px solid #f0f0f0;
  background: #f8fafc;
}
.detail-sub-number {
  font-family: 'Courier New', monospace;
  font-size: 16px;
  font-weight: 700;
  color: #1a1a2e;
}
.detail-sections { padding: 16px 24px; display: flex; flex-direction: column; gap: 20px; max-height: 70vh; overflow-y: auto; }
.detail-section { border: 1px solid #f0f0f0; border-radius: 10px; overflow: hidden; }
.detail-section-title {
  font-size: 12px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: #f9fafb;
  padding: 8px 14px;
  border-bottom: 1px solid #f0f0f0;
}
.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
}
.detail-item {
  padding: 10px 14px;
  border-right: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.detail-item:nth-child(3n) { border-right: none; }
.detail-item label {
  font-size: 11px;
  color: #9ca3af;
  font-weight: 500;
}
.detail-item span {
  font-size: 13px;
  color: #374151;
  word-break: break-all;
}
.detail-full { grid-column: 1 / -1; }
.mono { font-family: 'Courier New', monospace; }
.price-highlight { color: #2563eb; font-weight: 600; }
.commission-highlight { color: #059669; font-weight: 600; }
.refund-highlight { color: #f59e0b; font-weight: 600; }
.detail-product-img { width: 60px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid #f0f0f0; }
.review-screenshot { max-width: 100%; border-radius: 8px; border: 1px solid #f0f0f0; padding: 12px; }
</style>
