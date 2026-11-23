<template>
  <a-modal v-model:open="visible" title="编辑反馈状态" :confirm-loading="saving" ok-text="保存" cancel-text="取消" width="520px" @ok="handleSave">
    <div class="feedback-form">
      <div class="feedback-field">
        <label class="feedback-form-label">订单反馈</label>
        <a-radio-group v-model:value="form.order_feedback_status">
          <a-radio-button value="未反馈">未反馈</a-radio-button>
          <a-radio-button value="已反馈">已反馈</a-radio-button>
        </a-radio-group>
        <div v-if="form.order_feedback_status === '已反馈'" class="feedback-date-field">
          <label class="feedback-date-label">反馈日期</label>
          <a-date-picker v-model:value="form.order_feedback_date_picker" style="width:100%" placeholder="选择订单反馈日期" value-format="YYYY-MM-DD" />
        </div>
      </div>
      <div class="feedback-field">
        <label class="feedback-form-label">评论反馈</label>
        <a-radio-group v-model:value="form.comment_feedback_status">
          <a-radio-button value="未反馈">未反馈</a-radio-button>
          <a-radio-button value="已反馈">已反馈</a-radio-button>
        </a-radio-group>
        <div v-if="form.comment_feedback_status === '已反馈'" class="feedback-date-field">
          <label class="feedback-date-label">反馈日期</label>
          <a-date-picker v-model:value="form.comment_feedback_date_picker" style="width:100%" placeholder="选择评论反馈日期" value-format="YYYY-MM-DD" />
        </div>
      </div>
      <div class="feedback-field">
        <label class="feedback-form-label">反馈备注</label>
        <a-textarea v-model:value="form.remark" :rows="2" placeholder="如：客户已确认全部订单到货" />
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import dayjs from 'dayjs'

import { getFeedbackDetail } from '../helpers'

const props = defineProps<{ record: any; saving?: boolean }>()
const emit = defineEmits<{ save: [id: string | number, payload: any] }>()
const visible = defineModel<boolean>('open', { required: true })
const saving = computed(() => !!props.saving)

const form = ref({
  order_feedback_status: '未反馈',
  order_feedback_date_picker: null as any,
  comment_feedback_status: '未反馈',
  comment_feedback_date_picker: null as any,
  remark: '',
})

function feedbackStatusLabel(value: unknown, label?: string) {
  if (label) return label
  return Number(value) === 2 ? '已反馈' : '未反馈'
}

watch(() => props.record, (record) => {
  if (!record) return
  const detail = getFeedbackDetail(record) || {}
  form.value = {
    order_feedback_status: feedbackStatusLabel(detail.order_feedback_status, detail.order_feedback_status_label),
    order_feedback_date_picker: detail.order_feedback_date ? dayjs(detail.order_feedback_date) : null,
    comment_feedback_status: feedbackStatusLabel(detail.comment_feedback_status, detail.comment_feedback_status_label),
    comment_feedback_date_picker: detail.comment_feedback_date ? dayjs(detail.comment_feedback_date) : null,
    remark: detail.remark || '',
  }
}, { immediate: true })

function handleSave() {
  if (!props.record?.id) return
  const isOrderFb = form.value.order_feedback_status === '已反馈'
  const isCommentFb = form.value.comment_feedback_status === '已反馈'
  if (isOrderFb && !form.value.order_feedback_date_picker) {
    message.warning('请选择订单反馈日期')
    return
  }
  if (isCommentFb && !form.value.comment_feedback_date_picker) {
    message.warning('请选择评论反馈日期')
    return
  }

  emit('save', props.record.id, {
    order_feedback_status: isOrderFb ? 2 : 1,
    order_feedback_date: isOrderFb
      ? (typeof form.value.order_feedback_date_picker === 'string'
        ? form.value.order_feedback_date_picker
        : form.value.order_feedback_date_picker?.format('YYYY-MM-DD'))
      : '',
    comment_feedback_status: isCommentFb ? 2 : 1,
    comment_feedback_date: isCommentFb
      ? (typeof form.value.comment_feedback_date_picker === 'string'
        ? form.value.comment_feedback_date_picker
        : form.value.comment_feedback_date_picker?.format('YYYY-MM-DD'))
      : '',
    remark: form.value.remark || '',
  })
}
</script>

<style scoped>
.feedback-form {
  --eva-bg-soft: var(--ant-color-fill-quaternary, #fafafa);
  --eva-border-light: var(--ant-color-border-secondary, #f0f0f0);
  --eva-text: var(--ant-color-text, rgba(0, 0, 0, 0.88));
  --eva-text-secondary: var(--ant-color-text-secondary, rgba(0, 0, 0, 0.65));
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 4px 0;
}

.feedback-field { display: flex; flex-direction: column; gap: 6px; }
.feedback-form-label { font-size: 13px; font-weight: 500; color: var(--eva-text); }
.feedback-date-field { margin-top: 8px; display: flex; flex-direction: column; gap: 4px; padding: 10px 12px; background: var(--eva-bg-soft); border-radius: 8px; border: 1px solid var(--eva-border-light); }
.feedback-date-label { font-size: 14px; color: var(--eva-text-secondary); }
</style>
