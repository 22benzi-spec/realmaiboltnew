<template>
  <!--
    接单汇率移到本区首位（《9.1 创建任务页面修改》11.3），原在「基本信息」。
    它和各类型佣金排在同一行流里，免评佣金紧跟其后（李运侠 2026-09-02）。
  -->
  <div class="commission-inline-list">
      <div class="commission-inline-item">
        <span style="color: var(--ant-color-text-secondary);">接单汇率：</span>
        <a-input-number v-model:value="taskData.rate" :precision="2" size="middle"
          :formatter="formatExchangeRate" :parser="parseExchangeRate" @change="handleExchangeRateChange" />
      </div>
      <div v-if="selectedReviewTypes.length > 0 && taskData.review_options.free_review" class="commission-inline-item">
        <span style="color: var(--ant-color-text-secondary);">免评佣金：</span>
        <a-input-number v-model:value="taskData.ranking_commission" :min="0" :precision="0" placeholder="服务佣金"
          size="middle" />
      </div>
      <div v-if="selectedReviewTypes.length > 0 && taskData.review_options.words" class="commission-inline-item">
        <span style="color: var(--ant-color-text-secondary);">文字评佣金：</span>
        <a-input-number v-model:value="taskData.words_commission" :min="0" :precision="0" placeholder="服务佣金"
          size="middle" />
      </div>
      <div v-if="selectedReviewTypes.length > 0 && taskData.review_options.image" class="commission-inline-item">
        <span style="color: var(--ant-color-text-secondary);">图片评佣金：</span>
        <a-input-number v-model:value="taskData.pic_commission" :min="0" :precision="0" placeholder="服务佣金"
          size="middle" />
      </div>
      <div v-if="selectedReviewTypes.length > 0 && taskData.review_options.video" class="commission-inline-item">
        <span style="color: var(--ant-color-text-secondary);">视频评佣金：</span>
        <a-input-number v-model:value="taskData.video_commission" :min="0" :precision="0" placeholder="服务佣金"
          size="middle" />
      </div>
      <div v-if="selectedReviewTypes.length > 0 && taskData.review_options.feedback" class="commission-inline-item">
        <span style="color: var(--ant-color-text-secondary);">feedback佣金：</span>
        <a-input-number v-model:value="taskData.feedback_commission" :min="0" :precision="0" placeholder="服务佣金"
          size="middle" />
      </div>
    </div>

  <a-row :gutter="24" style="margin-top: 16px">
      <a-col :xs="24" :sm="12" :md="12" :lg="12">
        <a-form-item label="额外买手佣金：" name="extra_customer_commission" class="form-item" :label-col="{ flex: 'none' }"
          :wrapper-col="{ span: 16 }">
          <div style="display: flex; gap: 12px; align-items: center;">
            <a-input-number v-model:value="taskData.extra_customer_commission" :min="0" :precision="2"
              placeholder="美元金额" size="middle" style="flex: 1" />
            <a-form-item-rest>
              <a-input-number v-model:value="taskData.extra_customer_num" :min="0" :precision="0" placeholder="单量"
                size="middle" style="flex: 1" />
            </a-form-item-rest>
          </div>
        </a-form-item>
      </a-col>
      <a-col :xs="24" :sm="12" :md="12" :lg="12">
        <a-form-item label="额外服务佣金：" name="additional_service_commission" class="form-item" :label-col="{ flex: 'none' }"
          :wrapper-col="{ span: 16 }">
          <a-input-number v-model:value="taskData.additional_service_commission" :min="0" :precision="2"
            placeholder="人民币金额" class="full-width" size="middle" />
        </a-form-item>
      </a-col>
  </a-row>
</template>

<script setup lang="ts">
defineProps<{
  taskData: any;
  selectedReviewTypes: string[];
  formatExchangeRate: (value: number | string | undefined) => string;
  parseExchangeRate: (value: string) => number | undefined;
  handleExchangeRateChange: () => void;
}>();
</script>
