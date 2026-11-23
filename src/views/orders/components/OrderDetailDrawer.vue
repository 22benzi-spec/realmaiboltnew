<template>
  <a-drawer v-model:open="visible" :title="mobileReadOnly ? undefined : `任务详情 - ${order?.task_no || ''}`" :width="mobileReadOnly ? '100%' : 820" :root-class-name="mobileReadOnly ? 'mobile-readonly-detail' : undefined" placement="right">
    <template v-if="mobileReadOnly" #title><div class="mobile-detail-title">任务详情<span class="mobile-detail-task-no">{{ order?.task_no }}</span></div></template>
    <template v-if="order">
      <nav v-if="mobileReadOnly" class="mobile-detail-nav"><button :class="{ active: mobileSection === 'overview' }" @click="jumpToSection('overview')">基本信息</button><button :class="{ active: mobileSection === 'amount' }" @click="jumpToSection('amount')">金额明细</button><button :class="{ active: mobileSection === 'feedback' }" @click="jumpToSection('feedback')">反馈状态</button></nav>
      <div ref="detailContent" class="detail-shell" :class="{ 'order-mobile-detail': mobileReadOnly }">
        <div class="detail-header">
          <div class="detail-product">
            <div class="detail-img-wrap">
              <img
                v-if="productImage"
                :src="productImage"
                class="detail-img"
                referrerpolicy="no-referrer"
                @error="onImgError($event)"
              />
              <div v-else class="detail-img-placeholder"><PictureOutlined /></div>
            </div>
            <div>
              <div v-if="productName" class="detail-product-name">{{ productName }}</div>
              <div class="detail-asin">{{ order.product?.asin || '—' }}</div>
              <div class="detail-tags">
                <a-tag v-if="countryName" color="default">{{ countryName }}</a-tag>
                <a-tag :color="getStatusColor(statusLabel)">{{ statusLabel }}</a-tag>
              </div>
            </div>
          </div>
        </div>

        <a-divider style="margin: 16px 0" />

        <div class="detail-overview-grid">
          <div class="detail-overview-card">
            <div class="detail-overview-title">产品信息</div>
            <div class="detail-info-grid compact">
              <div class="detail-info-row">
                <span class="detail-info-label">店铺</span>
                <span class="detail-info-value">{{ order.product?.store_name || '—' }}</span>
              </div>
              <div class="detail-info-row">
                <span class="detail-info-label">品牌</span>
                <span class="detail-info-value">{{ order.product?.brand_name || '—' }}</span>
              </div>
              <div class="detail-info-row">
                <span class="detail-info-label">售价</span>
                <span class="detail-info-value is-price">
                  {{ mobileReadOnly ? `$ ${order.product_price ?? ''}` : (order.product_price ? `$ ${Number(order.product_price).toFixed(2)}` : '—') }}
                </span>
              </div>
              <div class="detail-info-row">
                <span class="detail-info-label">类目</span>
                <span class="detail-info-value">{{ order.product?.category || '—' }}</span>
              </div>
              <div class="detail-info-row">
                <span class="detail-info-label">星级</span>
                <span class="detail-info-value">{{ formatStarRating(productStarRating) }}</span>
              </div>
              <div class="detail-info-row">
                <span class="detail-info-label">评分数量</span>
                <span class="detail-info-value">{{ productRatingCount }}</span>
              </div>
            </div>
          </div>

          <div class="detail-overview-card">
            <div class="detail-overview-title">任务信息</div>
            <div class="detail-info-grid compact">
              <div class="detail-info-row">
                <span class="detail-info-label">等级</span>
                <span class="detail-info-value">{{ reviewLevelLabel }}</span>
              </div>
              <div class="detail-info-row">
                <span class="detail-info-label">类型</span>
                <span class="detail-info-value">
                  <span class="detail-inline-types">
                    <template v-if="hasMultipleTypes(order)">
                      <span v-for="typeKey in reviewTypeKeys" :key="typeKey" class="detail-inline-type">
                        <a-tag :color="getOrderTypeColor(reviewTypeLabel(typeKey))" size="small">
                          {{ reviewTypeLabel(typeKey) }}
                        </a-tag>
                        <span>&times;{{ getTypeQty(order, typeKey, reviewTypeEnumMap) }}</span>
                      </span>
                    </template>
                    <template v-else>
                      <a-tag :color="getOrderTypeColor(singleReviewTypeLabel)" size="small">{{ singleReviewTypeLabel }}</a-tag>
                      <span>&times;{{ order.total_order_quantity || 0 }}</span>
                    </template>
                  </span>
                </span>
              </div>
              <div class="detail-info-row">
                <span class="detail-info-label">总单量</span>
                <span class="detail-info-value">{{ order.total_order_quantity || 0 }}</span>
              </div>
              <div class="detail-info-row">
                <span class="detail-info-label">接单汇率</span>
                <span class="detail-info-value">{{ order.exchange_rate ? Number(order.exchange_rate).toFixed(2) : '—' }}</span>
              </div>
              <div class="detail-info-row detail-info-row-wide">
                <span class="detail-info-label">佣金</span>
                <span class="detail-info-value">
                  <span class="detail-inline-types">
                    <template v-if="hasMultipleTypes(order)">
                      <span v-for="typeKey in reviewTypeKeys" :key="typeKey" class="detail-inline-type">
                        <!-- <a-tag :color="getOrderTypeColor(reviewTypeLabel(typeKey))" size="small">
                          {{ reviewTypeLabel(typeKey) }}
                        </a-tag> -->
                        <span>&yen;{{ getTypeUnitPrice(order, typeKey).toFixed(2) }}</span>
                      </span>
                    </template>
                    <template v-else>
                      <a-tag :color="getOrderTypeColor(singleReviewTypeLabel)" size="small">{{ singleReviewTypeLabel }}</a-tag>
                      <span>&yen;{{ getCommissionUnitPrice(order).toFixed(2) }}</span>
                    </template>
                  </span>
                </span>
              </div>
              <div class="detail-info-row">
                <span class="detail-info-label">客户名称</span>
                <span class="detail-info-value">
                  {{ customerContactName || '—' }}
                  <a-tag v-if="feedbackChannelLabel" :color="feedbackChannelLabel === '群组' ? 'blue' : 'cyan'" size="small" style="margin-left:6px">
                    {{ feedbackChannelLabel }}
                  </a-tag>
                </span>
              </div>
              <div v-if="customerGroupChatName" class="detail-info-row">
                <span class="detail-info-label">下单群组</span>
                <span class="detail-info-value">{{ customerGroupChatName }}</span>
              </div>
              <div class="detail-info-row">
                <span class="detail-info-label">对接商务</span>
                <span class="detail-info-value">{{ businessCreatorName || '—' }}</span>
              </div>
              <div class="detail-info-row">
                <span class="detail-info-label">创建时间</span>
                <span class="detail-info-value">{{ order.created_at ? dayjs(order.created_at).format('YYYY-MM-DD HH:mm') : '—' }}</span>
              </div>
              <div class="detail-info-row detail-info-row-wide">
                <span class="detail-info-label">商务备注</span>
                <span class="detail-info-value">{{ order.task_basic?.business_remark || order.business_remark || '—' }}</span>
              </div>
              <div class="detail-info-row detail-info-row-wide">
                <span class="detail-info-label">任务备注</span>
                <span class="detail-info-value">{{ taskRemark || '—' }}</span>
              </div>
            </div>
          </div>
        </div>

        <a-divider style="margin: 20px 0 16px" />
        <div ref="amountSection" class="detail-section-title">金额明细</div>
        <!--
          纯人民币仍与创建任务的「当前任务账单计算」同一口径（李运侠 2026-09-01 1.2）。
          混合模式本金改收美金，应收基础款项分美金、人民币两笔，不相加（lyx 2026-11-19 改）。
        -->
        <div class="bill-calc">
          <div v-if="isMixedPayment" class="bill-calc-line">
            产品本金：<span class="bill-calc-amount">{{ mixedPrincipal.amountText }}</span>
            =
            <span class="bill-calc-foreign">{{ mixedPrincipal.priceText }}</span>
            &times; {{ mixedPrincipal.quantityText }}
            &times; {{ mixedPrincipal.exchangeRateText }}
            / {{ mixedPrincipal.usdBuyRateText }}
          </div>
          <div v-else class="bill-calc-line">
            产品本金：<span class="bill-calc-amount">&yen;{{ productReturnAmount.toFixed(2) }}</span>
            =
            <span class="bill-calc-foreign">{{ Number(order.product_price || 0).toFixed(2) }}</span>
            &times; {{ Number(order.exchange_rate || 1).toFixed(2) }}
            &times; {{ order.total_order_quantity || 0 }}
          </div>
          <div class="bill-calc-line">
            佣金小计：<span class="bill-calc-amount">&yen;{{ serviceCommissionCny.toFixed(2) }}</span>
            <template v-if="commissionDetailText"> = {{ commissionDetailText }}</template>
          </div>
          <div v-if="isMixedPayment" class="bill-calc-line bill-calc-total">
            应收基础款项：
            <span class="bill-calc-total-amount">美金（本金）{{ mixedPrincipal.amountText }}</span>
            <span class="bill-calc-total-amount bill-calc-total-cny">人民币（佣金）&yen;{{ serviceCommissionCny.toFixed(2) }}</span>
          </div>
          <div v-else class="bill-calc-line bill-calc-total">
            合计总金额：<span class="bill-calc-total-amount">&yen;{{ billCalcTotal.toFixed(2) }}</span>
          </div>
        </div>

        <a-divider style="margin: 20px 0 16px" />
        <div ref="feedbackSection" class="detail-section-title detail-section-title-row">
          <span>反馈状态</span>
          <!-- <a-button size="small" type="link" @click="$emit('editFeedback', order)">编辑反馈</a-button> -->
        </div>
        <div class="feedback-panel">
          <div class="feedback-info-row">
            <span class="feedback-key">订单反馈：</span>
            <a-tag v-if="feedbackStatusLabel(feedbackDetail?.order_feedback_status)" :color="Number(feedbackDetail.order_feedback_status) === 2 ? 'green' : 'default'">
              {{ feedbackStatusLabel(feedbackDetail.order_feedback_status) }}
            </a-tag>
            <span v-if="feedbackDetail?.order_feedback_date" class="feedback-date">{{ feedbackDetail.order_feedback_date }}</span>
          </div>
          <div class="feedback-info-row">
            <span class="feedback-key">评论反馈：</span>
            <a-tag v-if="feedbackStatusLabel(feedbackDetail?.comment_feedback_status)" :color="Number(feedbackDetail.comment_feedback_status) === 2 ? 'green' : 'default'">
              {{ feedbackStatusLabel(feedbackDetail.comment_feedback_status) }}
            </a-tag>
            <span v-if="feedbackDetail?.comment_feedback_date" class="feedback-date">{{ feedbackDetail.comment_feedback_date }}</span>
          </div>
          <div v-if="feedbackDetail?.remark" class="feedback-info-row">
            <span class="feedback-key">备注：</span>
            <span class="feedback-notes-text">{{ feedbackDetail.remark }}</span>
          </div>
        </div>
      </div>
    </template>
  </a-drawer>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { PictureOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'

import {
  getCountryName,
  getOrderTypeColor,
  getProductImage,
  getReviewTypeLabel as resolveReviewTypeLabel,
  getServiceCommissionCny,
  getTypeQty,
  getTypeUnitPrice,
  getCommissionUnitPrice,
  hasMultipleTypes,
  isGroupFeedback,
  onImgError,
} from '../helpers'
import { resolveCustomerContactName } from './billingFormUtils'
import { buildMixedPrincipalView, isMixedReceivePayment } from '../detailAmountDisplay'
import { formatReviewLevelText } from '../runtime'

const props = withDefaults(defineProps<{
  order: any
  mobileReadOnly?: boolean
}>(), { mobileReadOnly: false })

defineEmits<{ editFeedback: [record: any]; openBilling: [record: any] }>()
const visible = defineModel<boolean>('open', { required: true })
const detailContent = ref<HTMLElement>()
const amountSection = ref<HTMLElement>()
const feedbackSection = ref<HTMLElement>()
const mobileSection = ref('overview')
watch(visible, () => { mobileSection.value = 'overview' })
function jumpToSection(section: string) {
  mobileSection.value = section
  const target = section === 'amount' ? amountSection.value : section === 'feedback' ? feedbackSection.value : detailContent.value
  target?.scrollIntoView({ block: 'start' })
}

const order = computed(() => props.order || null)
const reviewTypeEnumMap = computed(() => order.value?._reviewTypeEnumMap || {})
const reviewTypeKeys = computed<string[]>(() => {
  const raw = order.value?.review_types
  if (Array.isArray(raw) && raw.length) return raw.map((item: any) => String(item)).filter(Boolean)
  if (Array.isArray(order.value?.review_type)) return order.value.review_type.map((item: any) => String(item)).filter(Boolean)
  return []
})
const singleReviewTypeKey = computed(() => reviewTypeKeys.value[0] || '')
const singleReviewTypeLabel = computed(() => reviewTypeLabel(singleReviewTypeKey.value))

function reviewTypeLabel(key: string) {
  return resolveReviewTypeLabel(key, reviewTypeEnumMap.value)
}

const productImage = computed(() => getProductImage(order.value || {}))
const productName = computed(() => order.value?.product?.brand_name || order.value?.product?.asin || '')
const productStarRating = computed(() => order.value?.star_rating ?? order.value?.product?.star_rating)
const productRatingCount = computed(() => order.value?.rating_count ?? order.value?.product?.rating_count ?? 0)
const countryName = computed(() => {
  const name = getCountryName(order.value || {})
  return name === '—' ? '' : name
})

function formatStarRating(value: unknown) {
  if (value === undefined || value === null || value === '')
    return '—'
  return `${value} 星`
}
const feedbackDetail = computed(() => order.value?._detailFeedback)
function feedbackStatusLabel(value: unknown): string {
  if (Number(value) === 1) return '未反馈'
  if (Number(value) === 2) return '已反馈'
  return ''
}
const reviewLevelLabel = computed(() => {
  const level = Number(order.value?.review_level)
  const byValue = [1, 2, 3].includes(level) ? formatReviewLevelText(level) : ''
  return formatReviewLevelText(order.value?.review_level_label) || byValue || '—'
})
const statusLabel = computed(() => {
  const map: Record<number, string> = { 1: '待分发', 2: '进行中', 3: '已完成', 4: '已暂停', 5: '已截单' }
  return order.value?.status_label || map[Number(order.value?.status)] || '—'
})
const feedbackChannelLabel = computed(() => {
  if (isGroupFeedback(order.value || {})) return '群组'
  return order.value?.customer?.feedback_type ? '私聊' : ''
})
const customerGroupChatName = computed(() => {
  const raw =
    order.value?.group_chat_name
    || order.value?.customer?.group_chat_name
    || order.value?.task_basic?.group_chat_name
    || ''
  if (Array.isArray(raw)) return raw.filter(Boolean).join('、')
  return raw || ''
})
const customerContactName = computed(() => resolveCustomerContactName(order.value))
const businessCreatorName = computed(() =>
  order.value?.creator?.real_name
  || order.value?.creator?.realname
  || order.value?.creator?.name
  || order.value?.creator_name
  || '',
)
const taskRemark = computed(() =>
  String(order.value?.task_remark ?? order.value?.task_basic?.task_remark ?? '').trim(),
)

const isMixedPayment = computed(() => isMixedReceivePayment(order.value))
const mixedPrincipal = computed(() => buildMixedPrincipalView(order.value || {}))
const productReturnAmount = computed(() =>
  Number(order.value?.product_price || 0) * Number(order.value?.exchange_rate || 1) * Number(order.value?.total_order_quantity || 0),
)
const serviceCommissionCny = computed(() => getServiceCommissionCny(order.value || {}, reviewTypeEnumMap.value))
/**
 * 佣金明细文案，与创建任务的「当前任务账单计算」同格式：`28(免评)×3 + 50(Feedback)×2`
 * （李运侠 2026-09-01 1.2）。多类型逐项展开，单类型只出一项。
 */
const commissionDetailText = computed(() => {
  const target = order.value || {}
  if (hasMultipleTypes(target)) {
    return reviewTypeKeys.value
      .map((typeKey) => {
        const qty = getTypeQty(target, typeKey, reviewTypeEnumMap.value)
        const unit = getTypeUnitPrice(target, typeKey)
        return qty > 0 ? `${unit}(${reviewTypeLabel(typeKey)})×${qty}` : ''
      })
      .filter(Boolean)
      .join(' + ')
  }
  const qty = Number(target.total_order_quantity || 0)
  const unit = getCommissionUnitPrice(target)
  return qty > 0 ? `${unit}(${singleReviewTypeLabel.value})×${qty}` : ''
})

/**
 * 金额明细卡片的「合计总金额」= 产品本金 + 佣金小计，**卡内自洽**。
 *
 * 不能复用 `baseReceivableAmount`：它会优先取后端的
 * `bill_details.base_receivable_amount`，那是另一个口径的数，和本卡上面两行的
 * 算式对不上——实测某任务上面两行是 986.51 与 476.00，它却给出 476.00
 * （李运侠 2026-09-02 让我自己在浏览器里验，才发现这处）。
 * 该问题在开启 bill 数据加载（1.2 的交易流水修复）之后才暴露：此前拿不到
 * bill_details，正好回落到相加，看起来是对的。
 */
const billCalcTotal = computed(() => productReturnAmount.value + serviceCommissionCny.value)

function getStatusColor(status: string) {
  const map: Record<string, string> = {
    待分发: 'default',
    待分配: 'default',
    进行中: 'blue',
    已完成: 'green',
    已截单: 'red',
    已暂停: 'orange',
    暂停中: 'orange',
  }
  return map[status] || 'default'
}

</script>

<style scoped>
/* 金额明细：与创建任务「当前任务账单计算」同一观感（李运侠 2026-09-01 1.2） */
.bill-calc {
  padding: 12px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.bill-calc-line {
  line-height: 1.9;
  color: #4b5563;
  font-size: 13px;
}

.bill-calc-amount {
  color: #1677ff;
  font-weight: 600;
}

.bill-calc-foreign {
  color: #059669;
}

.bill-calc-total {
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px dashed #d1d5db;
}

.bill-calc-total-amount {
  color: #dc2626;
  font-size: 15px;
  font-weight: 700;
}

.bill-calc-total-cny {
  margin-left: 16px;
}

.detail-shell {
  --eva-bg-container: var(--ant-color-bg-container, #fff);
  --eva-bg-soft: var(--ant-color-fill-quaternary, #fafafa);
  --eva-bg-soft-strong: var(--ant-color-fill-tertiary, #f5f5f5);
  --eva-border: var(--ant-color-border, #d9d9d9);
  --eva-border-light: var(--ant-color-border-secondary, #f0f0f0);
  --eva-link: var(--ant-color-link, var(--ant-color-primary, #1677ff));
  --eva-success: var(--ant-color-success, #52c41a);
  --eva-warning: var(--ant-color-warning, #faad14);
  --eva-error: var(--ant-color-error, #ff4d4f);
  --eva-text: var(--ant-color-text, rgba(0, 0, 0, 0.88));
  --eva-text-secondary: var(--ant-color-text-secondary, rgba(0, 0, 0, 0.65));
  --eva-text-tertiary: var(--ant-color-text-tertiary, rgba(0, 0, 0, 0.45));
}

.detail-header { display: flex; align-items: flex-start; }
.detail-product { display: flex; gap: 16px; align-items: flex-start; }
.detail-img-wrap { width: 80px; height: 80px; flex-shrink: 0; }
.detail-img { width: 80px; height: 80px; object-fit: cover; border-radius: 10px; border: 1px solid var(--eva-border-light); display: block; }
.detail-img-placeholder { width: 80px; height: 80px; border-radius: 10px; border: 1px dashed var(--eva-border); background: var(--eva-bg-soft); display: flex; align-items: center; justify-content: center; color: var(--eva-text-tertiary); font-size: 28px; }
.detail-product-name { font-size: 15px; font-weight: 600; color: var(--eva-text); margin-bottom: 2px; }
.detail-asin { font-size: 16px; font-weight: 700; color: var(--eva-link); }
.detail-tags { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
.detail-section-title { font-size: 13px; font-weight: 600; color: var(--eva-text); margin-bottom: 10px; }
.detail-section-title-row { display: flex; align-items: center; justify-content: space-between; }

.detail-overview-grid {
  display: grid;
  gap: 10px;
}
.detail-overview-card {
  border: 1px solid var(--eva-border-light);
  border-radius: 14px;
  padding: 12px;
  background: var(--eva-bg-container);
  box-shadow: 0 1px 2px rgb(15 23 42 / 4%);
}
.detail-overview-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 700;
  color: var(--eva-text);
}
.detail-overview-title::before {
  content: '';
  width: 4px;
  height: 14px;
  border-radius: 999px;
  background: var(--eva-link);
}
.detail-info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 12px;
}
.detail-info-grid.compact {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.detail-info-row {
  display: flex;
  align-items: center;
  min-height: 34px;
  border: 1px solid var(--eva-border-light);
  border-radius: 10px;
  overflow: hidden;
  background: var(--eva-bg-soft);
}
.detail-info-row-wide {
  grid-column: 1 / -1;
}
.detail-info-label {
  display: inline-flex;
  align-items: center;
  width: 78px;
  align-self: stretch;
  padding: 0 10px;
  font-size: 11px;
  font-weight: 600;
  color: var(--eva-text-secondary);
  background: var(--eva-bg-soft-strong);
  border-right: 1px solid var(--eva-border-light);
  flex-shrink: 0;
}
.detail-info-value {
  flex: 1;
  min-width: 0;
  padding: 6px 10px;
  font-size: 13px;
  font-weight: 600;
  color: var(--eva-text);
  word-break: break-word;
}
.detail-info-value.is-price {
  color: var(--eva-success);
  font-size: 15px;
}
.detail-inline-types {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.detail-inline-type {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.amount-breakdown { background: var(--eva-bg-soft); border: 1px solid var(--eva-border-light); border-radius: 10px; padding: 16px 20px; }
.amount-row { display: flex; align-items: center; justify-content: space-between; padding: 7px 0; gap: 12px; }
.amount-row-sub { padding: 2px 0 5px 8px; opacity: 0.75; }
.amount-row-total { padding: 10px 0 2px; }
.amount-section-label { font-size: 11px; font-weight: 600; color: var(--eva-text-tertiary); text-transform: uppercase; letter-spacing: 0.8px; margin: 4px 0 2px; }
.amount-label { font-size: 13px; color: var(--eva-text); font-weight: 500; }
.amount-label-sm { font-size: 14px; color: var(--eva-text-secondary); font-weight: 400; }
.amount-total-label { display: flex; align-items: center; gap: 8px; }
.amount-label-total { font-size: 15px; font-weight: 700; color: var(--eva-text); }
.amount-desc { font-size: 14px; color: var(--eva-text-tertiary); }
.amount-usd { font-size: 15px; font-weight: 700; color: var(--eva-link); font-family: 'Courier New', monospace; }
.amount-cny-sm { font-size: 14px; color: var(--eva-text-secondary); font-family: 'Courier New', monospace; }
.amount-commission { font-size: 14px; font-weight: 600; color: var(--eva-warning); font-family: 'Courier New', monospace; white-space: nowrap; }
.amount-total { font-size: 20px; font-weight: 800; color: var(--eva-error); font-family: 'Courier New', monospace; white-space: nowrap; }
.amount-divider { height: 1px; background: var(--eva-border-light); margin: 4px 0; }
.amount-divider-bold { height: 2px; background: var(--eva-border); margin: 6px 0; }

.feedback-panel {
  border: 1px solid var(--eva-border-light); border-radius: 10px; padding: 14px 18px;
  background: var(--eva-bg-soft); display: flex; flex-direction: column; gap: 8px;
}
.feedback-info-row { display: flex; align-items: center; gap: 6px; }
.feedback-key { font-size: 13px; color: var(--eva-text-secondary); flex-shrink: 0; }
.feedback-date { font-size: 14px; color: var(--eva-text); margin-left: 4px; }
.feedback-notes-text { font-size: 13px; color: var(--eva-text); }

.order-mobile-detail { scroll-margin-top: 52px; }
.order-mobile-detail .detail-product { gap: 12px; min-width: 0; }
.order-mobile-detail .detail-product > div:last-child { min-width: 0; }
.order-mobile-detail .detail-product-name, .order-mobile-detail .detail-asin { overflow-wrap: anywhere; }
.order-mobile-detail .detail-img-wrap, .order-mobile-detail .detail-img, .order-mobile-detail .detail-img-placeholder { width: 64px; height: 64px; }
.order-mobile-detail .detail-overview-grid { gap: 12px; }
.order-mobile-detail .detail-overview-card { padding: 15px; box-shadow: none; }
.order-mobile-detail .detail-overview-title { font-size: 16px; margin-bottom: 16px; }
.order-mobile-detail .detail-overview-title::before { display: none; }
.order-mobile-detail .detail-info-grid { gap: 18px 14px; }
.order-mobile-detail .detail-info-row { border: 0; border-radius: 0; background: none; flex-direction: column; align-items: flex-start; min-height: 0; gap: 5px; overflow: visible; }
.order-mobile-detail .detail-info-label { font-size: 14px; font-weight: 400; padding: 0; width: auto; border: 0; background: none; }
.order-mobile-detail .detail-info-value { padding: 0; font-size: 14px; font-weight: 400; width: 100%; overflow-wrap: anywhere; }
.order-mobile-detail .detail-section-title { font-size: 16px; scroll-margin-top: 56px; }
.order-mobile-detail .bill-calc-line { font-size: 14px; overflow-wrap: anywhere; }
.order-mobile-detail .bill-calc-total-amount { display: block; margin-left: 0; }
.order-mobile-detail .feedback-info-row { flex-wrap: wrap; }
.order-mobile-detail .feedback-key, .order-mobile-detail .feedback-notes-text { font-size: 14px; }

</style>
