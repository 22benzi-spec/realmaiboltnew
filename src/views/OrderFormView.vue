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
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="每日固定下单量">
                  <a-input-number v-model:value="form.fixed_daily_orders" :min="0" style="width:100%" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="每日新增下单量">
                  <a-input-number v-model:value="form.new_daily_orders" :min="0" style="width:100%" />
                </a-form-item>
              </a-col>
            </a-row>
            <a-row :gutter="16">
              <a-col :span="8">
                <a-form-item label="每日Feedback">
                  <a-switch v-model:checked="form.daily_feedback" />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="综合标签">
                  <a-switch v-model:checked="form.comprehensive_label" />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="快递标签">
                  <a-switch v-model:checked="form.delivery_label" />
                </a-form-item>
              </a-col>
            </a-row>
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
import { message } from 'ant-design-vue'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { supabase } from '../lib/supabase'

const formRef = ref()
const submitting = ref(false)
const keywords = ref<string[]>([''])
const currentOrderNumber = ref('')

const countries = ['美国', '德国', '英国', '加拿大']

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
  daily_feedback: true,
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
