<template>
  <div class="page-content">
    <h1 class="page-title">创建订单</h1>
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
                  <a-input-number v-model:value="form.product_price" :min="0" style="width:100%" placeholder="0.00" />
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
                  <a-input-number v-model:value="form.exchange_rate" :min="1" :step="0.01" style="width:100%" />
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
                <a-form-item label="测评模式" name="review_mode">
                  <a-select v-model:value="form.review_mode">
                    <a-select-option value="免评模式">免评模式</a-select-option>
                    <a-select-option value="首评模式">首评模式</a-select-option>
                    <a-select-option value="免评首评模式">免评首评模式</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="下单类型" name="order_type">
                  <a-select v-model:value="form.order_type">
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
            <h3 class="section-title">价格设置</h3>
            <a-row :gutter="16">
              <a-col :span="8">
                <a-form-item label="免评价格(USD)">
                  <a-input-number v-model:value="form.price_no_review" :min="0" style="width:100%" @change="recalc" />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="文字评价格(USD)">
                  <a-input-number v-model:value="form.price_text" :min="0" style="width:100%" @change="recalc" />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="图片评价格(USD)">
                  <a-input-number v-model:value="form.price_image" :min="0" style="width:100%" @change="recalc" />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="视频评价格(USD)">
                  <a-input-number v-model:value="form.price_video" :min="0" style="width:100%" @change="recalc" />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="Feedback价格(USD)">
                  <a-input-number v-model:value="form.price_feedback" :min="0" style="width:100%" @change="recalc" />
                </a-form-item>
              </a-col>
              <a-col :span="8">
                <a-form-item label="佣金费率(%)">
                  <a-input-number v-model:value="form.commission_fee" :min="0" :max="100" style="width:100%" @change="recalc" />
                </a-form-item>
              </a-col>
            </a-row>

            <div class="price-summary">
              <div class="price-row">
                <span>单价</span>
                <strong>¥{{ form.unit_price.toFixed(2) }}</strong>
              </div>
              <div class="price-row">
                <span>总金额</span>
                <strong class="total-price">¥{{ form.total_amount.toFixed(2) }}</strong>
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
              创建订单
            </a-button>
          </div>
        </a-col>
      </a-row>
    </a-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { message } from 'ant-design-vue'
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { supabase } from '../lib/supabase'

const formRef = ref()
const submitting = ref(false)
const keywords = ref<string[]>([''])

const countries = ['美国', '德国', '英国', '加拿大']

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
  price_no_review: 0,
  price_text: 0,
  price_image: 0,
  price_video: 0,
  price_feedback: 0,
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

function recalc() {
  const priceMap: Record<string, number> = {
    '免评': form.price_no_review,
    '文字评': form.price_text,
    '图片评': form.price_image,
    '视频评': form.price_video,
    'Feedback': form.price_feedback,
  }
  const basePrice = priceMap[form.order_type] || 0
  const productCostCny = (form.product_price || 0) * form.exchange_rate
  const commissionCny = productCostCny * (form.commission_fee / 100)
  form.unit_price = basePrice * form.exchange_rate + productCostCny + commissionCny
  form.total_amount = form.unit_price * form.order_quantity
  form.product_cost_cny = productCostCny
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
    const orderNum = 'ORD-' + Date.now()
    const { data, error } = await supabase.from('erp_orders').insert([{
      ...form,
      order_number: orderNum,
      total_orders: form.order_quantity,
    }]).select().single()

    if (error) throw error

    if (data && keywords.value.filter(k => k.trim()).length > 0) {
      await supabase.from('order_keywords').insert(
        keywords.value.filter(k => k.trim()).map(kw => ({ order_id: data.id, keyword: kw.trim() }))
      )
    }

    message.success('订单创建成功！')
    resetForm()
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
</script>

<style scoped>
.page-content { padding: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }
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
.price-summary {
  background: #f8fafc;
  border-radius: 8px;
  padding: 12px 16px;
  margin-top: 8px;
}
.price-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #374151;
  margin-bottom: 4px;
}
.total-price {
  font-size: 16px;
  color: #2563eb;
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
