<template>
  <div class="page-content">
    <div class="page-header">
      <h1 class="page-title">创建订单</h1>
      <div class="order-number-badge" v-if="currentOrderNumber">
        <span class="badge-label">任务订单号</span>
        <span class="badge-value">{{ currentOrderNumber }}</span>
      </div>
    </div>
    <a-form
      :model="form"
      :rules="rules"
      ref="formRef"
      layout="vertical"
      @finish="handleSubmit"
    >
      <a-row :gutter="24">
        <a-col :span="16">
          <div class="card-panel">
            <h3 class="section-title">基本信息</h3>
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="ASIN" name="asin">
                  <a-input v-model:value="form.asin" placeholder="请输入ASIN" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="店铺名称" name="store_name">
                  <a-input v-model:value="form.store_name" placeholder="请输入店铺名称" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="品牌名称" name="brand_name">
                  <a-input v-model:value="form.brand_name" placeholder="请输入品牌名称" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="产品图片URL" name="product_image">
                  <a-input v-model:value="form.product_image" placeholder="图片链接（选填）" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="产品名称" name="product_name">
                  <a-input v-model:value="form.product_name" placeholder="产品名称（选填）" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="产品价格(USD)" name="product_price">
                  <a-input-number v-model:value="form.product_price" :min="0" style="width:100%" placeholder="0.00" @change="recalc" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="国家/站点" name="country">
                  <a-select v-model:value="form.country">
                    <a-select-option v-for="c in countries" :key="c" :value="c">{{ c }}</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="汇率" name="exchange_rate">
                  <a-input-number v-model:value="form.exchange_rate" :min="1" :step="0.01" style="width:100%" @change="recalc" />
                </a-form-item>
              </a-col>
            </a-row>
          </div>

          <div class="card-panel">
            <h3 class="section-title">评测设置</h3>
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="测评类型" name="review_type">
                  <a-select v-model:value="form.review_type">
                    <a-select-option value="普通测评">普通测评</a-select-option>
                    <a-select-option value="变参测评">变参测评</a-select-option>
                    <a-select-option value="议定参测评">议定参测评</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="下单类型" name="order_type">
                  <a-select v-model:value="form.order_type" @change="recalc">
                    <a-select-option value="免评">免评</a-select-option>
                    <a-select-option value="文字评">文字评</a-select-option>
                    <a-select-option value="图片评">图片评</a-select-option>
                    <a-select-option value="视频评">视频评</a-select-option>
                    <a-select-option value="Feedback">Feedback</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="下单数量" name="order_quantity">
                  <a-input-number v-model:value="form.order_quantity" :min="1" style="width:100%" @change="recalc" />
                </a-form-item>
              </a-col>
            </a-row>
          </div>

          <div class="card-panel">
            <h3 class="section-title">佣金设置</h3>
            <div class="price-table">
              <div class="price-table-row" v-for="item in priceTableItems" :key="item.label">
                <span class="price-table-label">{{ item.label }}</span>
                <span class="price-table-value">¥{{ item.value }}</span>
              </div>
            </div>

            <div class="bill-summary">
              <h4 class="bill-title">账单计算</h4>
              <div class="bill-formula">
                <span class="formula-text">产品价格 ${{ form.product_price || 0 }} × 汇率 {{ form.exchange_rate }} × 数量 {{ form.order_quantity }} + {{ form.order_type }}佣金 ¥{{ currentTypePrice }} × 数量 {{ form.order_quantity }}</span>
              </div>
              <div class="bill-rows">
                <div class="bill-row">
                  <span>产品回款小计</span>
                  <span>¥{{ productSubtotal.toFixed(2) }}</span>
                </div>
                <div class="bill-row">
                  <span>佣金小计 ({{ form.order_type }})</span>
                  <span>¥{{ commissionSubtotal.toFixed(2) }}</span>
                </div>
                <div class="bill-divider"></div>
                <div class="bill-row total-row">
                  <span>合计总金额</span>
                  <strong class="total-amount">¥{{ form.total_amount.toFixed(2) }}</strong>
                </div>
              </div>
            </div>
          </div>

          <div class="card-panel">
            <h3 class="section-title">排期设置</h3>

            <div class="schedule-summary-bar">
              <div class="summary-item">
                <span class="summary-label">任务总订单量</span>
                <span class="summary-val total">{{ form.order_quantity }}</span>
              </div>
              <div class="summary-divider"></div>
              <div class="summary-item">
                <span class="summary-label">已排订单数</span>
                <span class="summary-val scheduled" :class="{ over: scheduledTotal > form.order_quantity }">{{ scheduledTotal }}</span>
              </div>
              <div class="summary-divider"></div>
              <div class="summary-item">
                <span class="summary-label">剩余未排数</span>
                <span class="summary-val" :class="remainingClass">{{ form.order_quantity - scheduledTotal }}</span>
              </div>
              <div class="summary-progress">
                <div
                  class="summary-progress-bar"
                  :class="{ over: scheduledTotal > form.order_quantity }"
                  :style="{ width: Math.min((scheduledTotal / (form.order_quantity || 1)) * 100, 100) + '%' }"
                ></div>
              </div>
            </div>

            <div class="schedule-layout">
              <div class="calendar-area">
                <a-calendar
                  v-model:value="calendarValue"
                  :fullscreen="false"
                  @select="handleDateSelect"
                >
                  <template #dateCellRender="{ current }">
                    <div
                      v-if="getScheduleForDate(current)"
                      class="cal-dot"
                    >
                      {{ getScheduleForDate(current)!.quantity }}单
                    </div>
                  </template>
                </a-calendar>
              </div>
              <div class="schedule-form-area">
                <div class="selected-date-header">
                  <span class="selected-date-label">已选日期</span>
                  <span class="selected-date-value">{{ selectedDateStr || '请点击日历选择日期' }}</span>
                </div>
                <template v-if="selectedDateStr">
                  <a-form-item label="当天订单数量" style="margin-top:12px">
                    <a-input-number
                      v-model:value="editingEntry.quantity"
                      :min="1"
                      style="width:100%"
                      placeholder="输入数量"
                    />
                  </a-form-item>
                  <a-form-item label="当天使用关键词">
                    <div v-for="(_, i) in editingEntry.keywords" :key="i" class="keyword-row">
                      <a-input
                        v-model:value="editingEntry.keywords[i]"
                        placeholder="输入关键词"
                        style="flex:1"
                      />
                      <a-button type="text" danger @click="removeScheduleKeyword(i)">
                        <DeleteOutlined />
                      </a-button>
                    </div>
                    <a-button type="dashed" block @click="addScheduleKeyword" style="margin-top:6px">
                      <PlusOutlined /> 添加关键词
                    </a-button>
                  </a-form-item>
                  <div class="schedule-actions">
                    <a-button type="primary" @click="saveScheduleEntry">保存排期</a-button>
                    <a-button
                      v-if="getScheduleForDate(calendarValue)"
                      danger
                      @click="removeScheduleEntry"
                    >删除</a-button>
                  </div>
                </template>
              </div>
            </div>

            <div v-if="scheduleEntries.length > 0" class="schedule-list">
              <h4 class="schedule-list-title">已排期 ({{ scheduleEntries.length }} 天)</h4>
              <div class="schedule-tags">
                <div
                  v-for="entry in scheduleEntriesSorted"
                  :key="entry.date"
                  class="schedule-tag"
                >
                  <span class="schedule-tag-date">{{ entry.date }}</span>
                  <span class="schedule-tag-qty">{{ entry.quantity }}单</span>
                  <span v-if="entry.keywords.filter(k=>k.trim()).length" class="schedule-tag-kw">
                    {{ entry.keywords.filter(k=>k.trim()).join('、') }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </a-col>

        <a-col :span="8">
          <div class="card-panel">
            <h3 class="section-title">客户信息</h3>
            <a-form-item label="客户名称">
              <a-input v-model:value="form.customer_name" placeholder="客户名称（选填）" />
            </a-form-item>
            <a-form-item label="客户ID">
              <a-input v-model:value="form.customer_id_str" placeholder="客户ID（选填）" />
            </a-form-item>
            <a-form-item label="销售人员">
              <a-input v-model:value="form.sales_person" placeholder="销售人员（选填）" />
            </a-form-item>
            <a-form-item label="Seller">
              <a-input v-model:value="form.seller" placeholder="Seller（选填）" />
            </a-form-item>
            <a-form-item label="类目">
              <a-input v-model:value="form.category" placeholder="产品类目（选填）" />
            </a-form-item>
            <a-form-item label="备注">
              <a-textarea v-model:value="form.notes" :rows="3" placeholder="备注信息（选填）" />
            </a-form-item>
          </div>

          <div class="card-panel">
            <h3 class="section-title">关键词</h3>
            <div v-for="(_kw, i) in keywords" :key="i" class="keyword-row">
              <a-input v-model:value="keywords[i]" placeholder="输入关键词" style="flex:1" />
              <a-button type="text" danger @click="removeKeyword(i)">
                <DeleteOutlined />
              </a-button>
            </div>
            <a-button type="dashed" block @click="addKeyword" style="margin-top:8px">
              <PlusOutlined /> 添加关键词
            </a-button>
          </div>

          <div class="form-actions">
            <a-button @click="resetForm">重置</a-button>
            <a-button type="primary" html-type="submit" :loading="submitting">
              提交订单
            </a-button>
          </div>
        </a-col>
      </a-row>
    </a-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { message, Modal } from 'ant-design-vue'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { supabase } from '../lib/supabase'
import dayjs, { type Dayjs } from 'dayjs'

const formRef = ref()
const submitting = ref(false)
const keywords = ref<string[]>([''])
const currentOrderNumber = ref('')

const countries = ['美国', '德国', '英国', '加拿大']

interface ScheduleEntry {
  date: string
  quantity: number
  keywords: string[]
}

const scheduleEntries = ref<ScheduleEntry[]>([])
const calendarValue = ref<Dayjs>(dayjs())
const selectedDateStr = ref('')
const editingEntry = reactive<{ quantity: number; keywords: string[] }>({
  quantity: 1,
  keywords: [''],
})

const scheduleEntriesSorted = computed(() =>
  [...scheduleEntries.value].sort((a, b) => a.date.localeCompare(b.date))
)

const scheduledTotal = computed(() =>
  scheduleEntries.value.reduce((sum, e) => sum + (e.quantity || 0), 0)
)

const remainingClass = computed(() => {
  const rem = form.order_quantity - scheduledTotal.value
  if (rem < 0) return 'over'
  if (rem === 0) return 'done'
  return 'remaining'
})

function getScheduleForDate(d: Dayjs): ScheduleEntry | undefined {
  return scheduleEntries.value.find(e => e.date === d.format('YYYY-MM-DD'))
}

function handleDateSelect(d: Dayjs) {
  calendarValue.value = d
  selectedDateStr.value = d.format('YYYY-MM-DD')
  const existing = getScheduleForDate(d)
  if (existing) {
    editingEntry.quantity = existing.quantity
    editingEntry.keywords = [...existing.keywords]
  } else {
    editingEntry.quantity = 1
    editingEntry.keywords = ['']
  }
}

function addScheduleKeyword() {
  editingEntry.keywords.push('')
}
function removeScheduleKeyword(i: number) {
  editingEntry.keywords.splice(i, 1)
}

function saveScheduleEntry() {
  if (!editingEntry.quantity || editingEntry.quantity < 1) {
    message.warning('请输入有效的订单数量')
    return
  }

  const idx = scheduleEntries.value.findIndex(e => e.date === selectedDateStr.value)
  const prevQty = idx >= 0 ? scheduleEntries.value[idx].quantity : 0
  const newTotal = scheduledTotal.value - prevQty + editingEntry.quantity
  const total = form.order_quantity

  if (newTotal > total) {
    Modal.warning({
      title: '排期数量超出',
      content: `当前任务总订单量为 ${total} 单，保存后已排数量将达 ${newTotal} 单，超出 ${newTotal - total} 单。请调整后重新保存。`,
      okText: '知道了',
    })
    return
  }

  const entry: ScheduleEntry = {
    date: selectedDateStr.value,
    quantity: editingEntry.quantity,
    keywords: editingEntry.keywords.filter(k => k.trim()),
  }
  if (idx >= 0) {
    scheduleEntries.value[idx] = entry
  } else {
    scheduleEntries.value.push(entry)
  }

  const remaining = total - newTotal
  if (remaining > 0) {
    message.success(`${selectedDateStr.value} 排期已保存，剩余未排 ${remaining} 单`)
  } else {
    message.success(`${selectedDateStr.value} 排期已保存，全部订单已排期完毕！`)
  }
}

function removeScheduleEntry() {
  const idx = scheduleEntries.value.findIndex(e => e.date === selectedDateStr.value)
  if (idx >= 0) {
    scheduleEntries.value.splice(idx, 1)
    editingEntry.quantity = 1
    editingEntry.keywords = ['']
    message.success('排期已删除')
  }
}

function generateOrderNumber(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  const rand = String(Math.floor(Math.random() * 1000)).padStart(3, '0')
  return `ORD${y}${m}${d}${h}${min}${s}${rand}`
}

const defaultForm = () => ({
  asin: '',
  store_name: '',
  brand_name: '',
  product_image: '',
  product_name: '',
  product_price: 0,
  country: '美国',
  exchange_rate: 7.25,
  review_type: '普通测评' as const,
  review_mode: '免评模式' as const,
  order_type: '免评' as const,
  order_quantity: 1,
  price_no_review: 25,
  price_text: 88,
  price_image: 100,
  price_video: 150,
  price_feedback: 20,
  commission_fee: 0,
  unit_price: 0,
  total_price: 0,
  total_orders: 0,
  total_amount: 0,
  fixed_daily_orders: 0,
  new_daily_orders: 0,
  notes: '',
  daily_feedback: false,
  comprehensive_label: false,
  delivery_label: false,
  seller: '',
  category: '',
  customer_name: '',
  customer_id_str: '',
  sales_person: '',
  status: '待处理',
  product_cost_cny: 0,
})

const form = reactive(defaultForm())

const rules = {
  asin: [{ required: true, message: '请输入ASIN' }],
  store_name: [{ required: true, message: '请输入店铺名称' }],
  order_quantity: [{ required: true, message: '请输入下单数量' }],
}

const priceMap = computed<Record<string, number>>(() => ({
  '免评': form.price_no_review,
  '文字评': form.price_text,
  '图片评': form.price_image,
  '视频评': form.price_video,
  'Feedback': form.price_feedback,
}))

const currentTypePrice = computed(() => priceMap.value[form.order_type] || 0)

const priceTableItems = computed(() => [
  { label: '免评佣金', value: form.price_no_review },
  { label: '文字评佣金', value: form.price_text },
  { label: '图片评佣金', value: form.price_image },
  { label: '视频评佣金', value: form.price_video },
  { label: 'Feedback佣金', value: form.price_feedback },
])

const productSubtotal = computed(() =>
  (form.product_price || 0) * form.exchange_rate * form.order_quantity
)

const commissionSubtotal = computed(() =>
  currentTypePrice.value * form.order_quantity
)

function recalc() {
  form.product_cost_cny = (form.product_price || 0) * form.exchange_rate
  form.unit_price = form.product_cost_cny + currentTypePrice.value
  form.total_amount = productSubtotal.value + commissionSubtotal.value
}

function addKeyword() {
  keywords.value.push('')
}
function removeKeyword(i: number) {
  keywords.value.splice(i, 1)
}

async function handleSubmit() {
  if (scheduleEntries.value.length > 0 && scheduledTotal.value < form.order_quantity) {
    Modal.confirm({
      title: '排期数量不足',
      content: `任务总订单量为 ${form.order_quantity} 单，当前仅排期了 ${scheduledTotal.value} 单，还有 ${form.order_quantity - scheduledTotal.value} 单未排期。是否仍要提交？`,
      okText: '继续提交',
      cancelText: '返回补充',
      onOk: () => doSubmit(),
    })
    return
  }
  await doSubmit()
}

async function doSubmit() {
  submitting.value = true
  try {
    recalc()
    const orderNumber = currentOrderNumber.value
    const { data, error } = await supabase.from('erp_orders').insert([{
      ...form,
      order_number: orderNumber,
      total_orders: form.order_quantity,
    }]).select().single()

    if (error) throw error

    if (data && keywords.value.filter(k => k.trim()).length > 0) {
      await supabase.from('order_keywords').insert(
        keywords.value.filter(k => k.trim()).map(kw => ({ order_id: data.id, keyword: kw.trim() }))
      )
    }

    if (data && scheduleEntries.value.length > 0) {
      await supabase.from('order_schedules').insert(
        scheduleEntries.value.map(e => ({
          order_id: data.id,
          schedule_date: e.date,
          quantity: e.quantity,
          keywords: e.keywords,
        }))
      )
    }

    message.success(`订单 ${orderNumber} 创建成功！`)
    resetForm()
    currentOrderNumber.value = generateOrderNumber()
  } catch (e: any) {
    message.error('创建失败：' + e.message)
  } finally {
    submitting.value = false
  }
}

function resetForm() {
  Object.assign(form, defaultForm())
  keywords.value = ['']
  scheduleEntries.value = []
  selectedDateStr.value = ''
  editingEntry.quantity = 1
  editingEntry.keywords = ['']
  formRef.value?.resetFields()
}

onMounted(() => {
  currentOrderNumber.value = generateOrderNumber()
  recalc()
})
</script>

<style scoped>
.page-content { padding: 24px; }
.page-header {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}
.page-title {
  font-size: 20px;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}
.order-number-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 6px 14px;
}
.badge-label {
  font-size: 12px;
  color: #6b7280;
}
.badge-value {
  font-size: 14px;
  font-weight: 700;
  color: #2563eb;
  letter-spacing: 0.5px;
  font-family: 'Courier New', monospace;
}
.card-panel {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
  border: 1px solid #f0f0f0;
  margin-bottom: 16px;
}
.section-title {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}
.bill-summary {
  background: #f8fafc;
  border-radius: 10px;
  padding: 16px;
  margin-top: 12px;
  border: 1px solid #e2e8f0;
}
.bill-title {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 10px 0;
}
.bill-formula {
  background: #fff;
  border-radius: 6px;
  padding: 8px 12px;
  margin-bottom: 12px;
  border: 1px dashed #cbd5e1;
}
.formula-text {
  font-size: 12px;
  color: #64748b;
  font-family: 'Courier New', monospace;
}
.bill-rows {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.bill-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  color: #374151;
}
.bill-divider {
  height: 1px;
  background: #e2e8f0;
  margin: 4px 0;
}
.total-row {
  font-size: 14px;
  font-weight: 600;
}
.total-amount {
  font-size: 18px;
  color: #2563eb;
  font-weight: 700;
}
.price-table {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 4px;
}
.price-table-row {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #f1f5f9;
  border-radius: 6px;
  padding: 6px 12px;
  font-size: 13px;
}
.price-table-label {
  color: #64748b;
}
.price-table-value {
  font-weight: 600;
  color: #1e40af;
}
.schedule-summary-bar {
  display: flex;
  align-items: center;
  gap: 0;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 12px 20px;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}
.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 0 16px;
}
.summary-label {
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
}
.summary-val {
  font-size: 20px;
  font-weight: 700;
  line-height: 1.2;
}
.summary-val.total { color: #374151; }
.summary-val.scheduled { color: #2563eb; }
.summary-val.scheduled.over { color: #dc2626; }
.summary-val.remaining { color: #f59e0b; }
.summary-val.done { color: #16a34a; }
.summary-val.over { color: #dc2626; }
.summary-divider {
  width: 1px;
  height: 36px;
  background: #e2e8f0;
  margin: 0 4px;
}
.summary-progress {
  flex: 1;
  min-width: 80px;
  height: 6px;
  background: #e2e8f0;
  border-radius: 99px;
  overflow: hidden;
  align-self: center;
  margin-left: 8px;
}
.summary-progress-bar {
  height: 100%;
  background: #2563eb;
  border-radius: 99px;
  transition: width 0.3s ease;
}
.summary-progress-bar.over {
  background: #dc2626;
}
.schedule-layout {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}
.calendar-area {
  flex: 0 0 280px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  overflow: hidden;
}
.schedule-form-area {
  flex: 1;
  min-width: 0;
}
.selected-date-header {
  display: flex;
  align-items: center;
  gap: 10px;
  background: #f1f5f9;
  border-radius: 8px;
  padding: 10px 14px;
}
.selected-date-label {
  font-size: 12px;
  color: #64748b;
}
.selected-date-value {
  font-size: 14px;
  font-weight: 600;
  color: #1e40af;
}
.schedule-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
.cal-dot {
  font-size: 10px;
  color: #2563eb;
  font-weight: 600;
  text-align: center;
  line-height: 1.2;
}
.schedule-list {
  margin-top: 16px;
  border-top: 1px solid #f0f0f0;
  padding-top: 14px;
}
.schedule-list-title {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 10px 0;
}
.schedule-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.schedule-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 5px 10px;
  font-size: 12px;
}
.schedule-tag-date {
  font-weight: 600;
  color: #1d4ed8;
}
.schedule-tag-qty {
  color: #2563eb;
  background: #dbeafe;
  border-radius: 4px;
  padding: 1px 6px;
  font-weight: 600;
}
.schedule-tag-kw {
  color: #64748b;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.keyword-row {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}
.form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 8px;
}
</style>
