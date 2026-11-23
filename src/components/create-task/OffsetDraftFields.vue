<template>
  <div class="offset-type">
    <label>类型 <span class="required">*</span></label>
    <a-radio-group v-model:value="draft.type" class="offset-modes">
      <a-radio-button :value="1">余款抵消</a-radio-button>
      <a-radio-button :value="2">随单补款</a-radio-button>
    </a-radio-group>
    <a-checkbox-group v-if="draft.type === 1" v-model:value="draft.surplusTypes" class="offset-subtypes" :options="surplusOptions" />
  </div>
  <div v-if="draft.type" class="offset-card">
    <strong>来源任务</strong>
    <div v-if="draft.type === 2" class="offset-hint">差价已随新任务合并付款。</div>
    <div v-for="(row, index) in draft.sources" :key="index" class="offset-row">
      <a-input v-model:value="row.task_id" size="small" placeholder="任务号" class="offset-grow" />
      <a-input-number v-model:value="row.amount" size="small" :min="0" :precision="2" style="width:120px" placeholder="金额" />
      <div class="offset-actions">
        <button type="button" title="添加" aria-label="添加来源任务" @click="draft.sources.push(emptyOffsetSource())">+</button>
        <button type="button" title="删除" aria-label="删除来源任务" :disabled="draft.sources.length <= 1" @click="draft.sources.splice(index, 1)">−</button>
      </div>
    </div>
    <div class="offset-total">合计：¥{{ total.toFixed(2) }}</div>
  </div>
  <template v-if="draft.type === 1">
    <template v-for="{ title, type } in surplusDetailSections" :key="type">
      <div v-if="draft.surplusTypes.includes(type)" class="offset-card">
        <strong>{{ title }} <span class="required">*</span></strong>
        <div v-for="(row, index) in draft.details[type]" :key="index" class="offset-row">
          <a-select v-model:value="row.country_id" size="small" placeholder="国家" class="offset-detail-control" show-search option-filter-prop="label">
            <a-select-option v-for="item in countries" :key="item.id" :value="item.id" :label="item.country">{{ item.country }}</a-select-option>
          </a-select>
          <a-select v-model:value="row.review_type" size="small" placeholder="类型" class="offset-detail-control" show-search option-filter-prop="label">
            <a-select-option v-for="item in reviewTypes" :key="item.value" :value="item.value" :label="item.label">{{ item.label }}</a-select-option>
          </a-select>
          <a-input-number v-model:value="row.quantity" size="small" :min="1" :precision="0" class="offset-detail-control" placeholder="对应单量" />
          <div class="offset-actions">
            <button type="button" title="添加" :aria-label="'添加' + title" @click="draft.details[type].push(emptySurplusDetail())">+</button>
            <button type="button" title="删除" :aria-label="'删除' + title" :disabled="draft.details[type].length <= 1" @click="draft.details[type].splice(index, 1)">−</button>
          </div>
        </div>
      </div>
    </template>
  </template>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { emptyOffsetSource, emptySurplusDetail, surplusDetailSections, surplusOptions, type OffsetDraft } from './offsetDraft'

defineProps<{
  countries: { id: number; country: string }[]
  reviewTypes: { value: string; label: string }[]
}>()

const draft = defineModel<OffsetDraft>({ required: true })
const total = computed(() => draft.value.sources.reduce((sum, row) => sum + (row.amount ?? 0), 0))
</script>

<style scoped>
.offset-type, .offset-card { display: flex; flex-direction: column; }
.offset-type { gap: 6px; }
.offset-type label { color: var(--eva-text, #374151); font-size: 12px; font-weight: 500; }
.offset-modes { display: flex; width: 100%; }
.offset-modes :deep(.ant-radio-button-wrapper) { flex: 1; height: 32px; line-height: 30px; text-align: center; }
.offset-subtypes {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 4px;
  padding: 8px;
  border: 1px solid var(--eva-border, #e5e7eb);
  border-radius: 8px;
  background: var(--eva-bg-soft, #f5f7fa);
}
.offset-subtypes :deep(.ant-checkbox-wrapper) {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 32px;
  margin-inline-start: 0;
  padding: 0 6px;
  border: 1px solid var(--eva-border, #e5e7eb);
  border-radius: 6px;
  background: var(--eva-bg-container, #fff);
  color: var(--eva-text, #1a1a2e);
  font-size: 13px;
}
.offset-subtypes :deep(.ant-checkbox-wrapper-checked) {
  border-color: var(--eva-link, #2563eb);
  color: var(--eva-link, #2563eb);
}
.required { color: var(--ant-color-error, #dc2626); }
.offset-card { gap: 8px; padding: 10px 12px; border: 1px solid var(--eva-border, #e5e7eb); border-radius: 8px; background: var(--eva-bg-soft, #f8fafc); }
.offset-card strong, .offset-hint, .offset-total { font-size: 12px; }
.offset-row { display: flex; align-items: center; gap: 8px; }
.offset-grow { flex: 1; min-width: 0; }
.offset-detail-control { flex: 1 1 0; width: 0; min-width: 0; }
.offset-actions { display: inline-flex; align-items: center; gap: 4px; flex: none; }
.offset-actions button {
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px solid var(--eva-border, #e5e7eb);
  border-radius: 6px;
  background: var(--eva-bg-container, #fff);
  color: var(--eva-text, #1a1a2e);
  font-size: 16px;
  line-height: 22px;
  cursor: pointer;
}
.offset-actions button:hover:not(:disabled) { border-color: var(--eva-link, #2563eb); color: var(--eva-link, #2563eb); }
.offset-actions button:last-child:hover:not(:disabled) { border-color: #dc2626; color: #dc2626; }
.offset-actions button:disabled { background: var(--eva-bg-soft, #f5f7fa); color: var(--eva-text-secondary, #6b7280); cursor: not-allowed; }
.offset-hint { color: var(--eva-text-secondary, #6b7280); }
.offset-total { color: var(--eva-link, #2563eb); text-align: right; font-weight: 700; }
</style>
