<template>
  <!--
    字段顺序按《9.1 创建任务页面修改》：
    站点任务 - ASIN - 类目 - 品牌名称 - 店铺名称 - 星级 - 评论数量 - 产品售价 - 产品图片。
    输入框的 placeholder 一并删掉（如「请输入产品SKU」），label 已说明用途。
    接单汇率移到「收费设置」首位、凭证需求移到「任务设置」末位，都不在本面板。
  -->
  <a-row :gutter="24">
      <a-col :xs="24" :sm="8" :md="8" :lg="8">
        <a-form-item label="站点任务" name="country_id" class="form-item" :label-col="{ flex: 'none' }"
          :wrapper-col="{ span: 12 }">
          <!--
            换国家要立刻按新站点刷新佣金（李运侠 2026-09-01）。
            只靠 watch(country_id) 不可靠：父组件回填 props 时会把 syncingFromProps
            置 true，同一轮 flush 里国家 watch 会被这个守卫挡掉，佣金就不变了。
            这里用 @change——用户主动选的，意图明确，不受回填守卫影响。
          -->
          <a-select v-model:value="taskData.country_id" size="middle" @change="handleCountryChange">
            <a-select-option v-for="item in countryOptions" :key="item.id" :value="item.id">
              {{ item.country }}任务
            </a-select-option>
          </a-select>
        </a-form-item>
      </a-col>
      <a-col :xs="24" :sm="8" :md="8" :lg="8">
        <a-form-item label="ASIN" name="asin" class="form-item remark-daily-orders-form-item"
          :label-col="{ flex: 'none' }" :wrapper-col="{ span: 12 }">
          <a-input
            v-model:value="taskData.asin"
            size="middle"
            @blur="handleAsinBlur"
            @pressEnter="handleAsinQuery"
          >
            <template #suffix>
              <a-button
                type="link"
                size="small"
                class="asin-query-btn"
                :loading="productImageLoading"
                :disabled="isReadOnly"
                @mousedown.prevent
                @click="handleAsinQuery"
              >
                查询
              </a-button>
            </template>
          </a-input>
        </a-form-item>
      </a-col>
      <a-col :xs="24" :sm="8" :md="8" :lg="8">
        <a-form-item label="类目" name="category" class="form-item" :label-col="{ flex: 'none' }"
          :wrapper-col="{ span: 12 }">
          <a-input v-model:value="taskData.category" size="middle" allow-clear />
        </a-form-item>
      </a-col>
    </a-row>

    <a-row :gutter="24">
      <a-col :xs="24" :sm="8" :md="8" :lg="8">
        <a-form-item label="品牌名称" name="brand" class="form-item remark-daily-orders-form-item"
          :label-col="{ flex: 'none' }" :wrapper-col="{ span: 12 }">
          <a-input v-model:value="taskData.brand" size="middle" />
        </a-form-item>
      </a-col>
      <a-col :xs="24" :sm="8" :md="8" :lg="8">
        <a-form-item label="店铺名称" name="shop" class="form-item" :label-col="{ flex: 'none' }"
          :wrapper-col="{ span: 12 }">
          <a-input v-model:value="taskData.shop" size="middle" />
        </a-form-item>
      </a-col>
      <a-col :xs="24" :sm="8" :md="8" :lg="8">
        <a-form-item label="星级" name="star_level" class="form-item" :label-col="{ flex: 'none' }"
          :wrapper-col="{ span: 12 }">
          <a-input-number v-model:value="taskData.star_level" :min="0" :max="5" :precision="1"
            class="full-width" size="middle" />
        </a-form-item>
      </a-col>
    </a-row>

    <a-row :gutter="24">
      <a-col :xs="24" :sm="8" :md="8" :lg="8">
        <a-form-item label="评论数量" name="score" class="form-item" :label-col="{ flex: 'none' }"
          :wrapper-col="{ span: 12 }">
          <a-input-number v-model:value="taskData.score" :min="0" :precision="0"
            class="full-width" size="middle" />
        </a-form-item>
      </a-col>
      <a-col :xs="24" :sm="8" :md="8" :lg="8">
        <a-form-item label="产品售价" name="product_price" class="form-item" :label-col="{ flex: 'none' }"
          :wrapper-col="{ span: 12 }">
          <a-input-number v-model:value="taskData.product_price" :min="0" :precision="2"
            class="full-width" size="middle" />
        </a-form-item>
      </a-col>
    </a-row>

    <a-row :gutter="24">
      <a-col :span="24">
        <a-form-item label="产品图片" name="imgurl_big" class="form-item" :label-col="{ flex: 'none' }"
          :wrapper-col="{ span: 20 }">
          <div class="product-image-wrapper">
            <div v-if="productImageLoading" class="image-loading">
              <a-spin size="middle" />
              <div class="loading-text">正在加载产品图片...</div>
            </div>
            <div v-else-if="taskData.imgurl_big" class="product-image-container">
              <a-image :src="taskData.imgurl_big" :preview="true" class="product-image" :alt="`产品图片 - ${taskData.asin}`" />
              <a-button type="link" @click="refreshProductImage" class="refresh-image-btn" :disabled="isReadOnly"
                :loading="productImageLoading">
                重新加载
              </a-button>
            </div>
            <div v-else class="image-placeholder">
              <div class="placeholder-icon">📷</div>
              <div class="placeholder-text">
                请输入ASIN后自动加载产品图片
              </div>
            </div>
          </div>
        </a-form-item>
      </a-col>
    </a-row>
</template>

<script setup lang="ts">
defineProps<{
  taskData: any;
  countryOptions: any[];
  productImageLoading: boolean;
  isReadOnly: boolean;
  formatExchangeRate: (value: number | string | undefined) => string;
  parseExchangeRate: (value: string) => number | undefined;
  handleAsinBlur: () => void | Promise<void>;
  handleAsinQuery: () => void | Promise<void>;
  refreshProductImage: () => void;
  handleExchangeRateChange: () => void;
  handleCountryChange: (value: number | string) => void;
}>();
</script>

<style scoped>
.asin-query-btn {
  padding-inline: 4px;
  height: auto;
  line-height: 1.2;
}
</style>
