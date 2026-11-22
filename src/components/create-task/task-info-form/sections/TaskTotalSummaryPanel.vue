<template>
  <!--
    当前任务总金额卡片（李运侠 改，2026-08-30）
    原先内嵌在 ScheduleSettingsPanel 里、排在排期日历上方；
    按要求整体移到「排期设置」区块之前，故抽成独立组件供 TaskInfoForm 直接摆放。
  -->
  <div class="commission-summary">
    <!-- 文案按《9.1 创建任务页面修改》2.1：标题改名、删掉「账单计算（多类型汇总）」、产品回款改产品本金 -->
    <div class="commission-summary-title">当前任务账单计算</div>
    <div class="commission-summary-line">
      产品本金： {{ isMixed ? '$' : '¥' }}{{ principalAmount.toFixed(2) }}=
      <span class="foreign-amount">{{ currentProductPrice.toFixed(2) }}</span>
      <template v-if="isMixed"> × {{ currentOrders }} × {{ currentRate.toFixed(2) }} ÷ {{ cashBuyRate }}</template>
      <template v-else> × {{ currentRate.toFixed(2) }} × {{ currentOrders }}</template>
    </div>
    <div class="commission-summary-line">
      佣金小计：<span class="amount-value">¥{{ commissionSubtotal.toFixed(2) }}</span>
      <template v-if="commissionDetailText"> = {{ commissionDetailText }}</template>
    </div>
    <div v-if="extraCustomerCommission > 0" class="commission-summary-line">
      额外买手佣金{{ isMixed ? '' : '（外币折算）' }}：<span class="amount-value">{{ isMixed ? '$' : '¥' }}{{ buyerCommissionAmount.toFixed(2) }}</span>
      = <span class="foreign-amount">{{ extraCustomerUsdAmount.toFixed(2) }}</span> × {{ extraCustomerQuantity }} × {{ currentRate.toFixed(2) }}
      <template v-if="isMixed"> ÷ {{ cashBuyRate }}</template>
    </div>
    <div v-if="additionalServiceCommission > 0" class="commission-summary-line">
      额外服务佣金：<span class="amount-value">¥{{ additionalServiceCommission.toFixed(2) }}</span>
    </div>
    <div class="commission-summary-line total-line">
      合计总金额：<template v-if="isMixed"><span class="amount-total">${{ totalAmountUsd.toFixed(2) }}</span> + </template><span class="amount-total">¥{{ displayedTotalRmb.toFixed(2) }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

type KeywordType = "free_review" | "feedback" | "words" | "video" | "image";

const props = defineProps<{
  paymentMode?: 1 | 2;
  cashBuyRate?: number | string;
  selectedReviewTypes: string[];
  currentProductPrice: number;
  currentRate: number;
  currentOrders: number;
  commissionSubtotal: number;
  rankingCommissionSubtotal: number;
  wordsCommissionSubtotal: number;
  picCommissionSubtotal: number;
  videoCommissionSubtotal: number;
  feedbackCommissionSubtotal: number;
  productReturnSubtotal: number;
  extraCustomerUsdAmount: number;
  extraCustomerQuantity: number;
  extraCustomerCommission: number;
  additionalServiceCommission: number;
  totalAmountRmb: number;
  getTypeLabel: (type: KeywordType) => string;
  /** 各类型的单价与单量，用于展开佣金小计明细 */
  commissionBreakdown: Array<{ type: KeywordType; unit: number; quantity: number }>;
}>();

const isMixed = computed(() => props.paymentMode === 2);
const buyRate = computed(() => Number(props.cashBuyRate));
const principalAmount = computed(() => isMixed.value
  ? (buyRate.value > 0 ? props.productReturnSubtotal / buyRate.value : 0)
  : props.productReturnSubtotal);
const buyerCommissionAmount = computed(() => isMixed.value
  ? (buyRate.value > 0 ? props.extraCustomerCommission / buyRate.value : 0)
  : props.extraCustomerCommission);
const totalAmountUsd = computed(() => principalAmount.value + buyerCommissionAmount.value);
const displayedTotalRmb = computed(() => isMixed.value
  ? props.commissionSubtotal + props.additionalServiceCommission
  : props.totalAmountRmb);

/** 只列出已勾选测评类型的佣金明细，与原实现保持一致 */
/**
 * 佣金小计明细（《9.1 创建任务页面修改》2）：按「单类型佣金(类型)×单量」展开，
 * 例 `50(Feedback)×2 + 28(免评)×3`。
 * 原来只显示各类型小计金额 `(免评)¥84.00`，看不出单价和单量怎么来的。
 */
const commissionDetailText = computed(() =>
  props.commissionBreakdown
    .filter(item => props.selectedReviewTypes.includes(item.type) && item.quantity > 0)
    .map(item => `${item.unit}(${props.getTypeLabel(item.type)})×${item.quantity}`)
    .join(" + "),
);
</script>

<style scoped>
.commission-summary {
  margin-bottom: 16px;
  padding: 12px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #f8fafc;
}

.commission-summary-title {
  margin-bottom: 8px;
  color: #1a1a2e;
  font-size: 14px;
  font-weight: 700;
}

.commission-summary-line {
  color: #4b5563;
  font-size: 14px;
  line-height: 1.9;
}

.commission-summary-line.total-line {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed #d1d5db;
  font-size: 13px;
  font-weight: 700;
}

.foreign-amount {
  color: #2563eb;
}

.amount-value {
  color: #1a1a2e;
  font-weight: 600;
}

.amount-total {
  color: #dc2626;
  font-size: 15px;
  font-weight: 800;
}
</style>
