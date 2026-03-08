<template>
  <div class="review-tracker">
    <!-- 统计行 -->
    <div class="review-stats">
      <div class="rs-item">
        <span class="rs-num">{{ reviews.length }}</span>
        <span class="rs-label">总评论</span>
      </div>
      <div class="rs-item">
        <span class="rs-num green">{{ aliveCount }}</span>
        <span class="rs-label">存活</span>
      </div>
      <div class="rs-item">
        <span class="rs-num red">{{ droppedCount }}</span>
        <span class="rs-label">掉评</span>
      </div>
      <div class="rs-item">
        <span class="rs-num blue">{{ companyCount }}</span>
        <span class="rs-label">公司产品</span>
      </div>
      <div class="rs-item">
        <span class="rs-num orange">{{ personalCount }}</span>
        <span class="rs-label">个人评论</span>
      </div>
    </div>

    <!-- 操作栏 -->
    <div class="review-toolbar">
      <a-select v-model:value="filterStatus" style="width:100px" allow-clear placeholder="状态" size="small" @change="filterReviews">
        <a-select-option value="存活">存活</a-select-option>
        <a-select-option value="掉评">掉评</a-select-option>
        <a-select-option value="删评">删评</a-select-option>
      </a-select>
      <a-select v-model:value="filterSource" style="width:110px" allow-clear placeholder="来源" size="small" @change="filterReviews">
        <a-select-option :value="true">公司产品</a-select-option>
        <a-select-option :value="false">个人评论</a-select-option>
      </a-select>
      <div style="flex:1"></div>
      <a-button size="small" @click="syncCompanyOrders" :loading="syncing">
        同步公司订单
      </a-button>
      <a-button size="small" type="primary" @click="openAdd">
        添加留评
      </a-button>
    </div>

    <!-- 留评列表 -->
    <div class="review-list">
      <div v-if="filteredReviews.length === 0" class="review-empty">暂无留评记录</div>
      <div v-for="r in filteredReviews" :key="r.id" class="review-card" :class="{ 'dropped': r.review_status !== '存活' }">
        <div class="rc-header">
          <span class="rc-asin">{{ r.asin || '-' }}</span>
          <a-tag v-if="r.is_company_order" color="blue" size="small">公司</a-tag>
          <a-tag v-else color="default" size="small">个人</a-tag>
          <a-tag :color="reviewStatusColor[r.review_status] || 'default'" size="small">{{ r.review_status }}</a-tag>
          <div class="rc-stars">
            <span v-for="i in 5" :key="i" class="star" :class="{ filled: i <= (r.star_rating || 0) }">&#9733;</span>
          </div>
          <div style="flex:1"></div>
          <span class="rc-date">{{ r.review_date || '-' }}</span>
        </div>
        <div class="rc-body">
          <div class="rc-info">
            <span class="rc-label">类型</span>
            <a-tag size="small" :color="typeColor[r.review_type] || 'default'">{{ r.review_type }}</a-tag>
          </div>
          <div v-if="r.product_name" class="rc-info">
            <span class="rc-label">产品</span>
            <span class="rc-val">{{ r.product_name }}</span>
          </div>
          <div v-if="r.store_name" class="rc-info">
            <span class="rc-label">店铺</span>
            <span class="rc-val">{{ r.store_name }}</span>
          </div>
          <div v-if="r.sub_order_number" class="rc-info">
            <span class="rc-label">子订单</span>
            <span class="rc-val mono">{{ r.sub_order_number }}</span>
          </div>
        </div>
        <div class="rc-actions">
          <a-select
            :value="r.review_status"
            size="small"
            style="width:80px"
            @change="(val: string) => updateStatus(r, val)"
          >
            <a-select-option value="存活">存活</a-select-option>
            <a-select-option value="掉评">掉评</a-select-option>
            <a-select-option value="删评">删评</a-select-option>
          </a-select>
          <a-button type="link" size="small" @click="openEdit(r)">编辑</a-button>
          <a-popconfirm title="确认删除这条留评记录?" @confirm="deleteReview(r.id)">
            <a-button type="link" size="small" danger>删除</a-button>
          </a-popconfirm>
        </div>
      </div>
    </div>

    <!-- 添加/编辑留评弹窗 -->
    <a-modal v-model:open="reviewModalOpen" :title="editReviewId ? '编辑留评' : '添加留评'" @ok="saveReview" :confirm-loading="saving" width="520px">
      <a-form :model="reviewForm" layout="vertical" style="margin-top:8px">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="ASIN" required>
              <a-input v-model:value="reviewForm.asin" placeholder="B0XXXXXXXX" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="评论类型">
              <a-select v-model:value="reviewForm.review_type">
                <a-select-option v-for="t in reviewTypes" :key="t" :value="t">{{ t }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="星级">
              <a-select v-model:value="reviewForm.star_rating">
                <a-select-option v-for="i in 5" :key="i" :value="i">{{ i }} 星</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="评论状态">
              <a-select v-model:value="reviewForm.review_status">
                <a-select-option value="存活">存活</a-select-option>
                <a-select-option value="掉评">掉评</a-select-option>
                <a-select-option value="删评">删评</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="留评日期">
              <a-input v-model:value="reviewForm.review_date" placeholder="YYYY-MM-DD" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="来源">
              <a-select v-model:value="reviewForm.is_company_order">
                <a-select-option :value="true">公司产品</a-select-option>
                <a-select-option :value="false">个人评论</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="产品名称">
              <a-input v-model:value="reviewForm.product_name" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="店铺名称">
              <a-input v-model:value="reviewForm.store_name" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="评论链接">
              <a-input v-model:value="reviewForm.review_url" placeholder="https://..." />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="截图URL">
              <a-input v-model:value="reviewForm.screenshot_url" placeholder="截图链接(可选)" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注">
              <a-textarea v-model:value="reviewForm.notes" :rows="2" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { message } from 'ant-design-vue'
import { supabase } from '../lib/supabase'
import dayjs from 'dayjs'

const props = defineProps<{ buyerId: string }>()

const reviews = ref<any[]>([])
const filteredReviews = ref<any[]>([])
const filterStatus = ref<string | undefined>(undefined)
const filterSource = ref<boolean | undefined>(undefined)
const loading = ref(false)
const syncing = ref(false)
const saving = ref(false)
const reviewModalOpen = ref(false)
const editReviewId = ref<string | null>(null)

const reviewTypes = ['文字评', '图片评', '视频评', '直评', 'VP评', 'Feedback']
const reviewStatusColor: Record<string, string> = { '存活': 'green', '掉评': 'red', '删评': 'default' }
const typeColor: Record<string, string> = { '文字评': 'blue', '图片评': 'cyan', '视频评': 'purple', '直评': 'orange', 'VP评': 'green', 'Feedback': 'gold' }

const emptyReviewForm = () => ({
  asin: '', store_name: '', product_name: '', review_type: '文字评',
  star_rating: 5, review_status: '存活', review_date: dayjs().format('YYYY-MM-DD'),
  review_url: '', screenshot_url: '', is_company_order: false,
  sub_order_id: null as string | null, sub_order_number: '', notes: '',
})
const reviewForm = ref(emptyReviewForm())

const aliveCount = computed(() => reviews.value.filter(r => r.review_status === '存活').length)
const droppedCount = computed(() => reviews.value.filter(r => r.review_status !== '存活').length)
const companyCount = computed(() => reviews.value.filter(r => r.is_company_order).length)
const personalCount = computed(() => reviews.value.filter(r => !r.is_company_order).length)

watch(() => props.buyerId, (id) => { if (id) loadReviews() }, { immediate: true })

async function loadReviews() {
  if (!props.buyerId) return
  loading.value = true
  try {
    const { data } = await supabase.from('buyer_reviews')
      .select('*')
      .eq('buyer_id', props.buyerId)
      .order('review_date', { ascending: false })
    reviews.value = data || []
    filterReviews()
  } finally { loading.value = false }
}

function filterReviews() {
  let list = [...reviews.value]
  if (filterStatus.value) list = list.filter(r => r.review_status === filterStatus.value)
  if (filterSource.value !== undefined && filterSource.value !== null) {
    list = list.filter(r => r.is_company_order === filterSource.value)
  }
  filteredReviews.value = list
}

function openAdd() {
  editReviewId.value = null
  reviewForm.value = emptyReviewForm()
  reviewModalOpen.value = true
}

function openEdit(r: any) {
  editReviewId.value = r.id
  reviewForm.value = {
    asin: r.asin || '', store_name: r.store_name || '', product_name: r.product_name || '',
    review_type: r.review_type || '文字评', star_rating: r.star_rating || 5,
    review_status: r.review_status || '存活', review_date: r.review_date || '',
    review_url: r.review_url || '', screenshot_url: r.screenshot_url || '',
    is_company_order: r.is_company_order || false,
    sub_order_id: r.sub_order_id || null, sub_order_number: r.sub_order_number || '',
    notes: r.notes || '',
  }
  reviewModalOpen.value = true
}

async function saveReview() {
  if (!reviewForm.value.asin) { message.error('ASIN不能为空'); return }
  saving.value = true
  try {
    const payload = {
      ...reviewForm.value,
      buyer_id: props.buyerId,
      updated_at: new Date().toISOString(),
    }
    if (editReviewId.value) {
      await supabase.from('buyer_reviews').update(payload).eq('id', editReviewId.value)
      message.success('已更新')
    } else {
      await supabase.from('buyer_reviews').insert(payload)
      message.success('已添加')
    }
    reviewModalOpen.value = false
    loadReviews()
  } finally { saving.value = false }
}

async function updateStatus(r: any, newStatus: string) {
  await supabase.from('buyer_reviews').update({
    review_status: newStatus,
    updated_at: new Date().toISOString(),
  }).eq('id', r.id)
  r.review_status = newStatus
  message.success('状态已更新')
  filterReviews()
}

async function deleteReview(id: string) {
  await supabase.from('buyer_reviews').delete().eq('id', id)
  message.success('已删除')
  loadReviews()
}

async function syncCompanyOrders() {
  syncing.value = true
  try {
    const { data: subOrders } = await supabase.from('sub_orders')
      .select('id, sub_order_number, asin, store_name, product_name, review_type, review_submitted_at, order_type')
      .eq('buyer_id', props.buyerId)
      .in('status', ['已留评', '已完成'])

    if (!subOrders || subOrders.length === 0) {
      message.info('没有找到已完成的公司订单')
      syncing.value = false
      return
    }

    const existingSubOrderIds = new Set(
      reviews.value.filter(r => r.sub_order_id).map(r => r.sub_order_id)
    )

    const newReviews = subOrders
      .filter(so => !existingSubOrderIds.has(so.id))
      .map(so => ({
        buyer_id: props.buyerId,
        asin: so.asin || '',
        store_name: so.store_name || '',
        product_name: so.product_name || '',
        review_type: mapOrderTypeToReviewType(so.order_type || so.review_type || ''),
        star_rating: 5,
        review_status: '存活',
        review_date: so.review_submitted_at ? so.review_submitted_at.slice(0, 10) : dayjs().format('YYYY-MM-DD'),
        is_company_order: true,
        sub_order_id: so.id,
        sub_order_number: so.sub_order_number || '',
        created_by: '系统同步',
      }))

    if (newReviews.length === 0) {
      message.info('所有公司订单已同步')
    } else {
      await supabase.from('buyer_reviews').insert(newReviews)
      message.success(`已同步 ${newReviews.length} 条公司订单留评`)
      loadReviews()
    }
  } finally { syncing.value = false }
}

function mapOrderTypeToReviewType(orderType: string): string {
  if (orderType.includes('视频')) return '视频评'
  if (orderType.includes('图片') || orderType.includes('图评')) return '图片评'
  if (orderType.includes('文字') || orderType.includes('文评')) return '文字评'
  if (orderType.includes('直评')) return '直评'
  if (orderType.includes('VP')) return 'VP评'
  if (orderType.includes('Feedback') || orderType.includes('feedback')) return 'Feedback'
  if (orderType.includes('免评')) return '文字评'
  return '文字评'
}
</script>

<style scoped>
.review-tracker { padding: 0; }

.review-stats { display: flex; gap: 0; border: 1px solid #f0f0f0; border-radius: 8px; overflow: hidden; margin-bottom: 12px; }
.rs-item { flex: 1; text-align: center; padding: 10px 4px; border-right: 1px solid #f0f0f0; }
.rs-item:last-child { border-right: none; }
.rs-num { font-size: 18px; font-weight: 700; color: #1a1a2e; display: block; }
.rs-num.green { color: #52c41a; }
.rs-num.red { color: #ff4d4f; }
.rs-num.blue { color: #1677ff; }
.rs-num.orange { color: #fa8c16; }
.rs-label { font-size: 11px; color: #8c8c8c; }

.review-toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; }

.review-list { display: flex; flex-direction: column; gap: 8px; max-height: 400px; overflow-y: auto; }
.review-empty { text-align: center; color: #bbb; padding: 40px 0; font-size: 13px; }

.review-card { border: 1px solid #f0f0f0; border-radius: 8px; padding: 10px 12px; transition: all .15s; }
.review-card:hover { border-color: #d9d9d9; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
.review-card.dropped { opacity: 0.7; background: #fafafa; }

.rc-header { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.rc-asin { font-family: monospace; font-weight: 600; font-size: 13px; color: #1a1a2e; }
.rc-date { font-size: 11px; color: #8c8c8c; }
.rc-stars { display: flex; gap: 1px; margin-left: 4px; }
.star { font-size: 12px; color: #d9d9d9; }
.star.filled { color: #fadb14; }

.rc-body { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 6px; }
.rc-info { display: flex; align-items: center; gap: 4px; }
.rc-label { font-size: 11px; color: #8c8c8c; }
.rc-val { font-size: 12px; color: #555; }
.rc-val.mono { font-family: monospace; }

.rc-actions { display: flex; gap: 6px; align-items: center; border-top: 1px solid #f5f5f5; padding-top: 6px; }
</style>
