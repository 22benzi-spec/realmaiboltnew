<!--
  测评等级 / 测评类型 / 任务总单量三项并排一行（李运侠 2026-09-03《9.1》1）。
  原来是「等级 + 类型」占一行（各 12 栏）、总单量单独占第二行。现统一为每项 8 栏。

  ⚠️ label 宽度已于 2026-09-07 改为 flex: 'none'（按文字自适应），
  三项的控件起始位置**不再对齐**——「测评等级」「测评类型」都是 4 字所以齐，
  「任务总单量」5 字会右移一个字宽。这是用户明确选的取舍（要贴合文字、不要大空隙），
  不要为了对齐再改回固定 span。

  **label 的左边界对齐不靠这里的 span**（李运侠 2026-09-03 截图：红线拉下来对不齐）：
  label 左边界由 `TaskInfoForm.vue` 里的全局左对齐规则保证——所有 panel 都是
  `a-row :gutter="24"`，a-col 左内边距统一 12px，左对齐后各 section 首列 label
  自然落在同一条竖线上。
  **曾试图用 span 调对齐，方向就是错的**：antd 默认 label 右对齐，调 span 改的是
  右边缘位置，不同字数的 label 左边缘照样错开（「额外买手佣金：」7 字比
  「测评等级：」5 字左出约两个字宽）。

  左对齐后 span 的作用变成「label 与控件之间留多宽」：
  span 7 ≈ 0.2917 × (R/3 − 24)，R=1000 时约 90px，容得下最长的「任务总单量：」(≈84px)。
  **调小需确认最长 label 仍放得下**，否则左对齐会向右溢出压到控件上。
-->
<template>
  <a-row :gutter="24">
    <a-col :xs="24" :sm="24" :md="8" :lg="8">
      <a-form-item label="测评等级" name="level" class="form-item" :label-col="{ flex: 'none' }"
        :wrapper-col="{ span: 17 }">
        <a-select v-model:value="taskData.level" placeholder="请选择测评等级" size="middle" @change="handleLevelChange">
          <a-select-option :value="1">普通测评</a-select-option>
          <a-select-option :value="2">高等测评</a-select-option>
          <a-select-option :value="3">极高等测评</a-select-option>
        </a-select>
      </a-form-item>
    </a-col>
    <a-col :xs="24" :sm="24" :md="8" :lg="8">
      <a-form-item label="测评类型" class="form-item" :label-col="{ flex: 'none' }" :wrapper-col="{ span: 17 }">
        <a-select :value="selectedReviewTypes" mode="multiple" placeholder="请选择测评类型" size="middle"
          @update:value="setSelectedReviewTypes">
          <a-select-option value="free_review">免评</a-select-option>
          <a-select-option value="feedback">feedback</a-select-option>
          <a-select-option value="words">文字</a-select-option>
          <a-select-option value="video">视频</a-select-option>
          <a-select-option value="image">图片</a-select-option>
        </a-select>
      </a-form-item>
    </a-col>
    <a-col :xs="24" :sm="24" :md="8" :lg="8">
      <a-form-item label="任务总单量" name="orders_number" class="form-item" :label-col="{ flex: 'none' }"
        :wrapper-col="{ span: 17 }">
        <a-input-number v-model:value="taskData.orders_number" :min="0" :precision="0" placeholder="请输入任务总单量"
          class="full-width" size="middle" />
      </a-form-item>
    </a-col>
  </a-row>
</template>

<script setup lang="ts">
defineProps<{
  taskData: any;
  selectedReviewTypes: string[];
  setSelectedReviewTypes: (value: string[]) => void;
  handleLevelChange: () => void;
}>();
</script>
