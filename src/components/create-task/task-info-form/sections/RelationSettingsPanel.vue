<template>
  <a-row :gutter="24">
      <a-col :xs="24">
        <a-form-item label="变体情况" name="variants_type" class="form-item" :label-col="{ flex: 'none' }"
          :wrapper-col="{ span: 20 }">
          <a-radio-group v-model:value="taskData.variants_type" size="middle" class="radio-group-compact"
            @change="handleVariantTypeChange">
            <a-radio-button :value="0">无（默认）</a-radio-button>
            <a-radio-button :value="1">变体随意</a-radio-button>
            <a-radio-button :value="2">指定(多)变体</a-radio-button>
          </a-radio-group>
          <a-form-item-rest>
          <div v-if="taskData.variants_type === 2" class="dynamic-field-container" style="margin-top: 16px">
            <div class="dynamic-field-box">
              <div v-for="(_variant, variantIndex) in taskData.variants" :key="variantIndex" class="multi-input-item">
                <div class="item-content">
                  <a-input v-model:value="taskData.variants[variantIndex as number]"
                    :placeholder="variantIndex === 0 ? '请输入多变体ASIN或文字' : '请输入多变体ASIN或文字'" size="middle"
                    class="input-item" />
                  <div v-if="(variantIndex as number) === 0" class="remove-btn-placeholder"></div>
                  <a-button v-if="(variantIndex as number) > 0" type="text" danger :disabled="isReadOnly"
                    @click="removeVariant(variantIndex as number)" class="remove-btn">
                    删除
                  </a-button>
                </div>
              </div>
              <a-button type="dashed" @click="addVariant" class="add-btn" :disabled="isReadOnly">
                <template #icon>
                  <PlusOutlined />
                </template>
                添加多变体
              </a-button>
            </div>
          </div>
          </a-form-item-rest>
        </a-form-item>
      </a-col>
    </a-row>

    <a-row :gutter="24">
      <a-col :xs="24">
        <a-form-item label="任务关联" name="task_relation" class="form-item" :label-col="{ flex: 'none' }"
          :wrapper-col="{ span: 20 }">
          <a-radio-group v-model:value="taskData.task_relation" size="middle" class="radio-group-compact"
            @change="handleTaskRelationChange">
            <a-radio-button :value="0">无特殊关联</a-radio-button>
            <a-radio-button :value="1">全店排重</a-radio-button>
            <a-radio-button :value="2">组织级排重</a-radio-button>
            <a-radio-button :value="3">指定店铺排重</a-radio-button>
          </a-radio-group>
          <a-form-item-rest>
          <div v-if="taskData.task_relation === 3" class="dynamic-field-container" style="margin-top: 16px">
            <div class="dynamic-field-box">
              <div v-for="(_shop, shopIndex) in taskData.related_shops" :key="shopIndex" class="multi-input-item">
                <div class="item-content">
                  <a-input v-model:value="taskData.related_shops[shopIndex as number]" placeholder="请输入关联店铺"
                    size="middle" class="input-item" />
                  <div v-if="(shopIndex as number) === 0" class="remove-btn-placeholder"></div>
                  <a-button v-if="(shopIndex as number) > 0" type="text" danger :disabled="isReadOnly"
                    @click="removeRelatedShop(shopIndex as number)" class="remove-btn">
                    删除
                  </a-button>
                </div>
              </div>
              <a-button type="dashed" @click="addRelatedShop" class="add-btn" :disabled="isReadOnly">
                <template #icon>
                  <PlusOutlined />
                </template>
                添加关联店铺
              </a-button>
            </div>
          </div>
          </a-form-item-rest>
        </a-form-item>
      </a-col>
    </a-row>

  <!-- 凭证需求 / 每日反馈移到本区末位（《9.1 创建任务页面修改》11.2） -->
  <a-row :gutter="24">
    <a-col :xs="24" :sm="12" :md="12" :lg="12">
      <!--
        label 宽度已于 2026-09-07 由百分比 span 改为 flex: 'none'（按文字自适应），
        原先那套「半宽列要写 span 4 = 4/48」的换算不再适用，换列宽也不用重算。
      -->
      <a-form-item label="凭证需求" class="form-item" :label-col="{ flex: 'none' }" :wrapper-col="{ span: 20 }">
        <a-radio-group v-model:value="taskData.is_send_msg" size="small">
          <a-radio-button :value="0">不需要</a-radio-button>
          <a-radio-button :value="1">单号图片</a-radio-button>
          <a-radio-button :value="2">金额图片</a-radio-button>
        </a-radio-group>
      </a-form-item>
    </a-col>
    <a-col :xs="24" :sm="12" :md="12" :lg="12">
      <a-form-item label="每日反馈" name="daily_feedback" class="form-item" :label-col="{ flex: 'none' }"
        :wrapper-col="{ span: 18 }">
        <a-radio-group v-model:value="taskData.daily_feedback" size="middle" class="radio-group-compact">
          <a-radio-button :value="0">否</a-radio-button>
          <a-radio-button :value="1">是</a-radio-button>
        </a-radio-group>
      </a-form-item>
    </a-col>
  </a-row>
</template>

<script setup lang="ts">
import { PlusOutlined } from '@ant-design/icons-vue';

defineProps<{
  taskData: any;
  isReadOnly: boolean;
  addVariant: () => void;
  removeVariant: (index: number) => void;
  handleVariantTypeChange: () => void;
  addRelatedShop: () => void;
  removeRelatedShop: (index: number) => void;
  handleTaskRelationChange: () => void;
}>();
</script>
