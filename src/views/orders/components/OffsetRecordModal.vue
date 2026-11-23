<template>
  <a-modal
    :open="open"
    title="录入账面抵消"
    :width="520"
    :confirm-loading="confirmLoading"
    :ok-text="okText"
    cancel-text="取消"
    @ok="emit('ok')"
    @cancel="emit('cancel')"
  >
    <template v-if="$slots.footer" #footer>
      <slot name="footer" />
    </template>
    <div class="offset-record-body">
      <div v-if="summary" class="batch-record-summary">{{ summary }}</div>
      <template v-if="showFlowCategories">
        <div class="ar-field">
          <label class="ar-label">一级分类</label>
          <a-select :value="flowPrimary" disabled style="width:100%" :loading="flowCategoryLoading">
            <a-select-option v-for="item in flowPrimaryOptions" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
          </a-select>
        </div>
        <div class="ar-field">
          <label class="ar-label">二级分类</label>
          <a-select v-model:value="flowSecondary" mode="multiple" style="width:100%" placeholder="可多选" :loading="flowCategoryLoading">
            <a-select-option v-for="item in flowSecondaryOptions" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
          </a-select>
        </div>
      </template>
      <OffsetDraftFields
        v-model="draft"
        :countries="countries"
        :review-types="reviewTypes"
      />
      <div v-if="showDebtStatus" class="ar-field">
        <label class="ar-label">账款状态变更</label>
        <a-radio-group v-model:value="debtStatus" size="small">
          <a-radio-button value="cleared">已结清</a-radio-button>
        </a-radio-group>
        <template v-if="showDebtAmounts && (debtStatus === 'owed' || debtStatus === 'surplus')">
          <div class="ar-field">
            <label class="ar-label">差价金额（元）</label>
            <a-input-number v-model:value="debtAmount" style="width:200px" :min="0" :precision="2" placeholder="输入差价金额" />
          </div>
          <div class="ar-field">
            <label class="ar-label">欠款金额(美元)</label>
            <a-input v-model:value="debtAmountUsd" style="width:200px" placeholder="欠款金额(美元)" />
          </div>
        </template>
        <div v-if="debtStatus" class="debt-status-reminder">
          账款状态需手动确认，实际情况请以商务核实为准
        </div>
      </div>
      <div class="ar-field">
        <label class="ar-label">账单备注</label>
        <a-textarea v-model:value="remark" :rows="2" placeholder="账单备注（可选）" />
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import OffsetDraftFields from './OffsetDraftFields.vue'
import type { OffsetDraft } from './offsetDraft'

withDefaults(defineProps<{
  countries: { id: number; country: string }[]
  reviewTypes: { value: string; label: string }[]
  summary?: string
  okText?: string
  confirmLoading?: boolean
  showDebtAmounts?: boolean
  showDebtStatus?: boolean
  showFlowCategories?: boolean
  flowCategoryLoading?: boolean
  flowPrimary?: number | string
  flowPrimaryOptions?: { value: number; label: string }[]
  flowSecondaryOptions?: { value: number; label: string }[]
}>(), {
  showDebtAmounts: true,
  showDebtStatus: true,
  showFlowCategories: false,
  flowCategoryLoading: false,
  flowPrimaryOptions: () => [],
  flowSecondaryOptions: () => [],
})

const open = defineModel<boolean>('open', { required: true })
const draft = defineModel<OffsetDraft>('draft', { required: true })
const debtStatus = defineModel<string | null>('debtStatus', { required: true })
const debtAmount = defineModel<number | null>('debtAmount', { required: true })
const debtAmountUsd = defineModel<string>('debtAmountUsd', { required: true })
const remark = defineModel<string>('remark', { required: true })
const flowSecondary = defineModel<Array<string | number>>('flowSecondary', { default: () => [] })

const emit = defineEmits<{
  ok: []
  cancel: []
}>()
</script>

<style scoped>
.offset-record-body { display: flex; flex-direction: column; gap: 14px; }
.ar-field { display: flex; flex-direction: column; gap: 6px; }
.ar-label { color: var(--eva-text, #374151); font-size: 12px; font-weight: 500; }
.batch-record-summary {
  padding: 12px;
  border: 1px solid var(--eva-border, #e5e7eb);
  border-radius: 8px;
  background: var(--eva-bg-soft, #f8f9fb);
  color: var(--eva-text, #374151);
  font-size: 13px;
  font-weight: 600;
}
.ar-field { display: flex; flex-direction: column; gap: 6px; }
.ar-label { color: var(--eva-text, #374151); font-size: 14px; font-weight: 600; }
.debt-status-reminder { color: #f59e0b; font-size: 11px; margin-top: 4px; }
</style>
