<template>
  <a-drawer
    v-model:open="visible"
    title="添加"
    placement="right"
    width="90%"
    :mask-closable="false"
    :destroy-on-close="true"
    :body-style="{ padding: '0 24px 24px', overflow: 'hidden' }"
  >
    <CreateTaskForm view-type="add" :create-task-offset="true" @success="handleSuccess" />
  </a-drawer>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import CreateTaskForm from './CreateTaskForm.vue'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ 'update:open': [value: boolean]; success: [] }>()
const visible = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})
function handleSuccess() {
  visible.value = false
  emit('success')
}
</script>
