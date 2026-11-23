<template>
  <a-modal v-model:open="visible" title="录入账面抵消" width="520px" ok-text="保存" cancel-text="取消" @ok="save">
    <div class="offset-content"><OffsetDraftFields v-model="draft" :countries="prototypeCountries" :review-types="reviewTypes" /></div>
  </a-modal>
</template>
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import OffsetDraftFields from './OffsetDraftFields.vue'
import { createOffsetDraft, cloneOffsetDraft, prepareOffsetDraft } from './offsetDraft'
import { prototypeCountries, getPrototypeTaskRows } from './dataSource'

const props = defineProps<{ open: boolean; recordType?: string; order?: any; createTaskOffset?: boolean; savedRecord?: any }>()
const emit = defineEmits<{ 'update:open': [value: boolean]; 'update:recordType': [value: string]; save: [value: any] }>()
const visible = computed({ get: () => props.open, set: value => emit('update:open', value) })
const draft = ref(createOffsetDraft())
const reviewTypes = [
  { value: 'free_review', label: '免评' }, { value: 'words', label: '文字' },
  { value: 'image', label: '图片' }, { value: 'video', label: '视频' }, { value: 'feedback', label: 'Feedback' },
]
watch(() => props.open, open => { if (open) draft.value = cloneOffsetDraft(props.savedRecord?.draft || createOffsetDraft()) })
async function save() {
  const prepared = prepareOffsetDraft(draft.value)
  if ('error' in prepared) { message.warning(prepared.error); return }
  const rows = await getPrototypeTaskRows()
  const sources = prepared.sources.map(source => ({ source, row: rows.find(row => row.order_number === source.task_id || row.id === source.task_id) }))
  if (sources.some(item => !item.row)) { message.warning('来源任务不存在，请填写已保存的原型任务号'); return }
  emit('save', { record: { ...prepared.fields, offset_task_basics: sources.map(({ source, row }) => ({ task_basic_id: row.id, amount: source.amount })) }, draft: cloneOffsetDraft(draft.value) })
  visible.value = false
}
</script>
<style scoped>.offset-content { display: flex; flex-direction: column; gap: 14px; }</style>
