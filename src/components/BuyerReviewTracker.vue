<template>
  <div class="review-tracker">
    <!-- 统计仪表盘 -->
    <div class="review-stat-dashboard">
      <div class="review-overview-card">
        <div class="review-stat-title">留评总览</div>
        <div class="review-overview-main">
          <span class="review-overview-num">{{ reviews.length }}</span>
          <span class="review-overview-label">总评论</span>
        </div>
        <div class="review-overview-sub">
          <span><b class="is-success">{{ aliveCount }}</b> 存活</span>
          <span><b class="is-danger">{{ droppedCount }}</b> 已掉评</span>
        </div>
      </div>

      <div class="review-source-card">
        <div class="review-source-header">
          <span class="review-stat-title">内部订单</span>
          <span class="review-source-total">共 {{ companyReviewStats.total }} 条</span>
        </div>
        <div class="review-source-metrics">
          <div class="review-source-metric">
            <span class="metric-num is-success">{{ companyReviewStats.alive }}</span>
            <span class="metric-label">存活</span>
          </div>
          <div class="review-source-metric">
            <span class="metric-num is-danger">{{ companyReviewStats.dropped }}</span>
            <span class="metric-label">已掉评</span>
          </div>
        </div>
      </div>

      <div class="review-source-card">
        <div class="review-source-header">
          <span class="review-stat-title">个人评论</span>
          <span class="review-source-total">共 {{ personalReviewStats.total }} 条</span>
        </div>
        <div class="review-source-metrics">
          <div class="review-source-metric">
            <span class="metric-num is-success">{{ personalReviewStats.alive }}</span>
            <span class="metric-label">存活</span>
          </div>
          <div class="review-source-metric">
            <span class="metric-num is-danger">{{ personalReviewStats.dropped }}</span>
            <span class="metric-label">已掉评</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 操作栏 -->
    <div class="review-toolbar">
      <a-select v-model:value="filterStatus" style="width:100px" allow-clear placeholder="状态" size="small" @change="filterReviews">
        <a-select-option value="存活">存活</a-select-option>
        <a-select-option value="已掉评">已掉评</a-select-option>
        <a-select-option value="待检测">待检测</a-select-option>
        <a-select-option value="检测异常">检测异常</a-select-option>
      </a-select>
      <a-select v-model:value="filterSource" style="width:110px" allow-clear placeholder="来源" size="small" @change="filterReviews">
        <a-select-option :value="true">内部订单</a-select-option>
        <a-select-option :value="false">个人评论</a-select-option>
      </a-select>
      <a-range-picker
        v-model:value="filterDateRange"
        value-format="YYYY-MM-DD"
        size="small"
        style="width:220px"
        :placeholder="['开始日期', '结束日期']"
        @change="filterReviews"
      />
      <div style="flex:1"></div>
      <a-button size="small" type="primary" @click="openAdd">
        添加评论
      </a-button>
    </div>

    <!-- 留评列表 -->
    <a-table
      class="review-table"
      size="small"
      row-key="id"
      :loading="loading"
      :columns="reviewColumns"
      :data-source="filteredReviews"
      :pagination="{ pageSize: 6, size: 'small', showSizeChanger: false }"
      :scroll="{ x: 980 }"
    >
      <template #emptyText>
        <div class="review-empty">暂无留评记录</div>
      </template>
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'product'">
          <div class="review-product">
            <div class="review-product-name" :title="record.product_name || record.asin">
              {{ record.product_name || '未填写产品名称' }}
            </div>
            <div class="review-product-meta">
              <span class="mono">{{ record.asin || '—' }}</span>
              <span v-if="record.store_name">· {{ record.store_name }}</span>
            </div>
          </div>
        </template>

        <template v-else-if="column.key === 'review_date'">
          {{ record.review_date || '—' }}
        </template>

        <template v-else-if="column.key === 'star_rating'">
          <div class="review-stars" :title="`${record.star_rating || 0} 星`">
            <span v-for="i in 5" :key="i" class="star" :class="{ filled: i <= (record.star_rating || 0) }">&#9733;</span>
          </div>
        </template>

        <template v-else-if="column.key === 'review_type'">
          <a-tag size="small" :color="typeColor[getReviewType(record)] || 'default'">
            {{ getReviewType(record) }}
          </a-tag>
        </template>

        <template v-else-if="column.key === 'product_category'">
          <a-tag size="small" color="default">
            {{ getProductCategory(record) }}
          </a-tag>
        </template>

        <template v-else-if="column.key === 'source'">
          <a-tag v-if="record.is_company_order" color="blue" size="small">内部订单</a-tag>
          <a-tag v-else color="default" size="small">个人评论</a-tag>
        </template>

        <template v-else-if="column.key === 'review_status'">
          <a-tag :color="reviewStatusColor[getReviewStatus(record)] || 'default'" size="small">
            {{ getReviewStatus(record) }}
          </a-tag>
        </template>

        <template v-else-if="column.key === 'alive_days'">
          {{ getAliveDaysText(record) }}
        </template>

        <template v-else-if="column.key === 'last_checked_at'">
          {{ formatCheckedTime(record) }}
        </template>

        <template v-else-if="column.key === 'action'">
          <a-button type="link" size="small" @click="viewReview(record)">查看</a-button>
        </template>
      </template>
    </a-table>

    <!-- 添加/编辑评论弹窗 -->
    <a-modal v-model:open="reviewModalOpen" :title="editReviewId ? '编辑评论' : '添加评论'" @ok="saveReview" :confirm-loading="saving" width="520px">
      <a-form :model="reviewForm" layout="vertical" style="margin-top:8px">
        <a-row :gutter="12">
          <a-col :span="12">
            <a-form-item label="ASIN" required>
              <a-input v-model:value="reviewForm.asin" placeholder="B0XXXXXXXX" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="评论类型" required>
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
            <a-form-item label="评论状态" required>
              <a-select v-model:value="reviewForm.review_status">
                <a-select-option value="存活">存活</a-select-option>
                <a-select-option value="已掉评">已掉评</a-select-option>
                <a-select-option value="待检测">待检测</a-select-option>
                <a-select-option value="检测异常">检测异常</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="评论类目" required>
              <a-select v-model:value="reviewForm.review_category" placeholder="选择类目">
                <a-select-option v-for="item in reviewCategoryOptions" :key="item" :value="item">{{ item }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="留评日期" required>
              <a-date-picker
                v-model:value="reviewForm.review_date"
                value-format="YYYY-MM-DD"
                style="width:100%"
                :disabled-date="disableFutureDate"
              />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="来源" required>
              <a-select v-model:value="reviewForm.is_company_order">
                <a-select-option :value="true">内部订单</a-select-option>
                <a-select-option :value="false">个人评论</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="评论链接">
              <a-input v-model:value="reviewForm.review_url" placeholder="https://..." />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-form-item label="评论图片">
              <a-upload
                v-model:file-list="reviewImageFiles"
                list-type="picture-card"
                accept="image/*"
                :max-count="1"
                :before-upload="beforeReviewImageUpload"
              >
                <div v-if="reviewImageFiles.length < 1" class="review-image-upload">
                  <span class="review-image-upload-plus">+</span>
                  <span>上传图片</span>
                </div>
              </a-upload>
              <div class="upload-tip">支持 JPG / PNG / WebP，最多上传 1 张。</div>
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
const filterDateRange = ref<[string, string] | undefined>(undefined)
const loading = ref(false)
const saving = ref(false)
const reviewModalOpen = ref(false)
const editReviewId = ref<string | null>(null)
const reviewImageFiles = ref<any[]>([])

const reviewTypes = ['文字', '图片', '视频']
const reviewCategoryOptions = ['家居', '个护', '玩具', '厨房', '电子', '宠物', '服饰', '运动', '母婴', '美妆']
const reviewStatusColor: Record<string, string> = { '存活': 'green', '已掉评': 'red', '待检测': 'orange', '检测异常': 'red' }
const typeColor: Record<string, string> = { '文字': 'blue', '图片': 'cyan', '视频': 'purple' }
const reviewColumns = [
  { title: '产品信息', key: 'product', width: 260 },
  { title: '评论日期', dataIndex: 'review_date', key: 'review_date', width: 110 },
  { title: '星级', key: 'star_rating', width: 100 },
  { title: '类型', key: 'review_type', width: 90 },
  { title: '类目', key: 'product_category', width: 100 },
  { title: '来源', key: 'source', width: 100 },
  { title: '状态', key: 'review_status', width: 100 },
  { title: '存活天数', key: 'alive_days', width: 100 },
  { title: '最近检测时间', key: 'last_checked_at', width: 150 },
  { title: '操作', key: 'action', width: 80, fixed: 'right' as const },
]

const emptyReviewForm = () => ({
  asin: '', store_name: '', product_name: '', review_type: '文字', review_category: undefined as string | undefined,
  star_rating: 5, review_status: '存活', review_date: dayjs().format('YYYY-MM-DD'),
  review_url: '', screenshot_url: '', is_company_order: false,
  sub_order_id: null as string | null, sub_order_number: '', notes: '',
})
const reviewForm = ref(emptyReviewForm())

const aliveCount = computed(() => reviews.value.filter(r => r.review_status === '存活').length)
const droppedCount = computed(() => reviews.value.filter(r => getReviewStatus(r) === '已掉评').length)
const companyReviewStats = computed(() => buildSourceStats(true))
const personalReviewStats = computed(() => buildSourceStats(false))

watch(() => props.buyerId, (id) => { if (id) loadReviews() }, { immediate: true })

async function loadReviews() {
  if (!props.buyerId) return
  loading.value = true
  try {
    const { data } = await supabase.from('buyer_reviews')
      .select('*')
      .eq('buyer_id', props.buyerId)
      .order('review_date', { ascending: false })
    reviews.value = data?.length ? data : buildMockReviews()
    filterReviews()
  } finally { loading.value = false }
}

function filterReviews() {
  let list = [...reviews.value]
  if (filterStatus.value) list = list.filter(r => getReviewStatus(r) === filterStatus.value)
  if (filterSource.value !== undefined && filterSource.value !== null) {
    list = list.filter(r => r.is_company_order === filterSource.value)
  }
  if (filterDateRange.value?.length === 2) {
    const [start, end] = filterDateRange.value
    list = list.filter(r => {
      if (!r.review_date) return false
      const date = dayjs(r.review_date)
      return date.isValid() && !date.isBefore(dayjs(start), 'day') && !date.isAfter(dayjs(end), 'day')
    })
  }
  filteredReviews.value = list
}

function buildSourceStats(isCompanyOrder: boolean) {
  const list = reviews.value.filter(r => Boolean(r.is_company_order) === isCompanyOrder)
  const alive = list.filter(r => getReviewStatus(r) === '存活').length
  const dropped = list.filter(r => getReviewStatus(r) === '已掉评').length
  return {
    total: list.length,
    alive,
    dropped,
  }
}

function getReviewStatus(record: any) {
  const status = record.review_status || ''
  if (status === '掉评' || status === '删评') return '已掉评'
  return status || '—'
}

function normalizeReviewStatus(status: string) {
  if (status === '已掉评' || status === '掉评' || status === '删评') return '已掉评'
  if (status === '待检测') return '待检测'
  if (status === '检测异常') return '检测异常'
  return '存活'
}

function normalizeReviewType(type: string) {
  if (type.includes('视频')) return '视频'
  if (type.includes('图片') || type.includes('图评')) return '图片'
  return '文字'
}

function getReviewType(record: any) {
  return record.review_type ? normalizeReviewType(record.review_type) : '—'
}

function getProductCategory(record: any) {
  return record.review_category || record.product_category || record.category || '—'
}

function getAliveDaysText(record: any) {
  if (record.alive_days !== undefined && record.alive_days !== null) return `${record.alive_days}天`
  if (!record.review_date || getReviewStatus(record) !== '存活') return '—'
  const days = dayjs().startOf('day').diff(dayjs(record.review_date).startOf('day'), 'day') + 1
  return `${Math.max(days, 1)}天`
}

function formatCheckedTime(record: any) {
  const value = record.last_checked_at || record.checked_at || record.updated_at
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '—'
}

function viewReview(record: any) {
  if (!record.review_url) {
    message.info('暂无评论链接')
    return
  }
  window.open(record.review_url, '_blank', 'noopener,noreferrer')
}

function disableFutureDate(current: any) {
  return current && current > dayjs().endOf('day')
}

function beforeReviewImageUpload(file: File) {
  if (!file.type.startsWith('image/')) {
    message.error('只能上传图片文件')
    return false
  }
  if (file.size / 1024 / 1024 >= 5) {
    message.error('评论图片不能超过 5MB')
    return false
  }
  return false
}

function buildMockReviews() {
  const now = dayjs()
  return [
    {
      id: 'mock-review-001',
      asin: 'B0C8PX21LM',
      product_name: 'Portable Blender Personal Size',
      store_name: 'BlendNova Store',
      review_date: now.subtract(18, 'day').format('YYYY-MM-DD'),
      star_rating: 5,
      review_type: '图片',
      review_category: '厨房',
      is_company_order: true,
      review_status: '存活',
      alive_days: 19,
      last_checked_at: now.subtract(2, 'hour').toISOString(),
      review_url: 'https://www.amazon.com/review/mock-review-001',
      _is_mock: true,
    },
    {
      id: 'mock-review-002',
      asin: 'B09W8Q7ZRM',
      product_name: 'Memory Foam Seat Cushion',
      store_name: 'SoftEase Home',
      review_date: now.subtract(41, 'day').format('YYYY-MM-DD'),
      star_rating: 4,
      review_type: '文字',
      review_category: '家居',
      is_company_order: false,
      review_status: '已掉评',
      alive_days: 32,
      last_checked_at: now.subtract(1, 'day').hour(10).minute(20).toISOString(),
      review_url: 'https://www.amazon.com/review/mock-review-002',
      _is_mock: true,
    },
    {
      id: 'mock-review-003',
      asin: 'B0BVT92KQP',
      product_name: 'LED Desk Lamp with USB Port',
      store_name: 'Lumina Office',
      review_date: now.subtract(6, 'day').format('YYYY-MM-DD'),
      star_rating: 5,
      review_type: '视频',
      review_category: '电子',
      is_company_order: true,
      review_status: '待检测',
      alive_days: 7,
      last_checked_at: now.subtract(35, 'minute').toISOString(),
      review_url: 'https://www.amazon.com/review/mock-review-003',
      _is_mock: true,
    },
    {
      id: 'mock-review-004',
      asin: 'B0DROP9K11',
      product_name: 'Travel Makeup Mirror',
      store_name: 'GlowTrip Beauty',
      review_date: now.subtract(24, 'day').format('YYYY-MM-DD'),
      star_rating: 5,
      review_type: '图片',
      review_category: '美妆',
      is_company_order: false,
      review_status: '存活',
      alive_days: 25,
      last_checked_at: now.subtract(4, 'hour').toISOString(),
      review_url: 'https://www.amazon.com/review/mock-review-004',
      _is_mock: true,
    },
  ]
}

function openAdd() {
  editReviewId.value = null
  reviewForm.value = emptyReviewForm()
  reviewImageFiles.value = []
  reviewModalOpen.value = true
}

function openEdit(r: any) {
  editReviewId.value = r.id
  reviewForm.value = {
    asin: r.asin || '', store_name: r.store_name || '', product_name: r.product_name || '',
    review_type: getReviewType(r) === '—' ? '文字' : getReviewType(r), review_category: getProductCategory(r) === '—' ? undefined : getProductCategory(r),
    star_rating: r.star_rating || 5,
    review_status: getReviewStatus(r) === '—' ? '存活' : getReviewStatus(r), review_date: r.review_date || '',
    review_url: r.review_url || '', screenshot_url: r.screenshot_url || '',
    is_company_order: r.is_company_order || false,
    sub_order_id: r.sub_order_id || null, sub_order_number: r.sub_order_number || '',
    notes: r.notes || '',
  }
  reviewImageFiles.value = r.screenshot_url
    ? [{ uid: '-1', name: '评论图片', status: 'done', url: r.screenshot_url }]
    : []
  reviewModalOpen.value = true
}

async function saveReview() {
  if (!reviewForm.value.asin) { message.error('ASIN不能为空'); return }
  if (!reviewForm.value.review_type) { message.error('请选择评论类型'); return }
  if (!reviewForm.value.review_category) { message.error('请选择评论类目'); return }
  if (!reviewForm.value.review_date) { message.error('请选择留评日期'); return }
  if (!reviewForm.value.review_status) { message.error('请选择评论状态'); return }
  saving.value = true
  try {
    const screenshotUrl = await uploadReviewImage()
    const payload = {
      ...reviewForm.value,
      asin: reviewForm.value.asin.trim().toUpperCase(),
      review_type: normalizeReviewType(reviewForm.value.review_type),
      review_status: normalizeReviewStatus(reviewForm.value.review_status),
      screenshot_url: screenshotUrl || reviewForm.value.screenshot_url,
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

async function uploadReviewImage() {
  const fileItem = reviewImageFiles.value[0]
  const file = fileItem?.originFileObj
  if (!file) return reviewForm.value.screenshot_url
  const ext = file.name?.split('.').pop() || 'jpg'
  const path = `${props.buyerId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const { data, error } = await supabase.storage
    .from('buyer-review-images')
    .upload(path, file, { upsert: true })
  if (error) throw error
  const { data: urlData } = supabase.storage.from('buyer-review-images').getPublicUrl(data.path)
  return urlData.publicUrl
}

</script>

<style scoped>
.review-tracker { padding: 0; }

.review-stat-dashboard {
  display: grid;
  grid-template-columns: 1.05fr 1.4fr 1.4fr;
  gap: 10px;
  margin-bottom: 12px;
}
.review-overview-card,
.review-source-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  padding: 12px;
}
.review-overview-card { background: linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%); }
.review-stat-title {
  color: #374151;
  font-size: 12px;
  font-weight: 700;
}
.review-overview-main {
  display: flex;
  align-items: baseline;
  gap: 6px;
  margin-top: 8px;
}
.review-overview-num {
  color: #1a1a2e;
  font-size: 24px;
  font-weight: 800;
  line-height: 1;
}
.review-overview-label,
.review-source-total,
.metric-label {
  color: #6b7280;
  font-size: 11px;
}
.review-overview-sub {
  display: flex;
  gap: 10px;
  margin-top: 8px;
  color: #6b7280;
  font-size: 11px;
}
.review-source-header {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}
.review-source-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.review-source-metric {
  border-radius: 8px;
  background: #f9fafb;
  padding: 8px 6px;
  text-align: center;
}
.metric-num {
  display: block;
  font-size: 18px;
  font-weight: 800;
  line-height: 1.1;
}
.is-success { color: #059669; }
.is-danger { color: #dc2626; }
.is-muted { color: #6b7280; }

.review-toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; }

.review-empty { text-align: center; color: #9ca3af; padding: 40px 0; font-size: 13px; }
.review-table :deep(.ant-table-thead > tr > th) {
  background: #f9fafb;
  color: #6b7280;
  font-weight: 600;
}
.review-product { min-width: 0; }
.review-product-name {
  color: #1a1a2e;
  font-size: 13px;
  font-weight: 600;
  max-width: 230px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.review-product-meta {
  margin-top: 2px;
  color: #6b7280;
  font-size: 11px;
}
.mono { font-family: 'Courier New', monospace; }
.review-stars { display: flex; gap: 1px; }
.star { font-size: 12px; color: #d9d9d9; }
.star.filled { color: #fadb14; }
.review-image-upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: #6b7280;
  font-size: 12px;
}
.review-image-upload-plus { color: #2563eb; font-size: 20px; line-height: 1; }
.upload-tip { margin-top: 4px; color: #9ca3af; font-size: 12px; }
</style>
