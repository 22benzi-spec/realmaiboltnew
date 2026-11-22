<template>
  <a-row :gutter="24">
      <a-col :xs="24" :sm="12" :md="12" :lg="12">
        <a-form-item label="任务备注" name="demand" class="form-item" :label-col="{ flex: 'none' }" :wrapper-col="{ span: 16 }">
          <a-auto-complete v-model:value="taskData.demand" class="task-remark-input" :options="remarkOptions" placeholder="请输入或选择备注" size="middle"
            allow-clear @search="handleRemarkSearch" />
        </a-form-item>
      </a-col>
    </a-row>
</template>

<script setup lang="ts">
defineProps<{
  taskData: any;
  remarkOptions: Array<{ value: string; label: string }>;
  handleRemarkSearch: (value: string) => void;
}>();
</script>

<style scoped>
:deep(.task-remark-input .ant-select-selector) {
  border-color: #f59e0b;
  background: #fff7ed;
}

:deep(.task-remark-input .ant-select-selection-search-input),
:deep(.task-remark-input .ant-select-selection-item) {
  color: #b45309;
  font-size: 15px;
  font-weight: 700;
}

:deep(.task-remark-input .ant-select-selection-placeholder) {
  color: #d97706;
  font-weight: 600;
}
</style>
