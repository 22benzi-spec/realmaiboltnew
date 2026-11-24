<template>
  <div class="page-content" :class="{ 'mobile-readonly-page': isMobile }">
    <h1 v-if="!isMobile" class="page-title">接单管理</h1>
    <template v-else>
      <div class="mobile-page-heading"><h1>接单管理</h1><a-button type="text" :loading="loading" aria-label="刷新接单" @click="loadOrders"><ReloadOutlined /></a-button></div>
      <div class="mobile-quick-search"><a-input-search v-model:value="searchForm.keyword" placeholder="搜索任务号/ASIN/店铺/产品名" allow-clear @search="handleSearch" /><a-button @click="mobileFilterOpen = true"><FilterOutlined />筛选</a-button></div>
      <div class="mobile-list-summary"><span>共 {{ pagination.total }} 个任务</span><a-button type="link" size="small" @click="handleResetFilters">重置</a-button></div>
    </template>

    <a-spin :spinning="pageActionLoading" class="page-action-spin">
    <div class="card-panel">
      <div>
      <div class="toolbar" :class="{ 'mobile-query-grid': isMobile }">
        <div :class="isMobile ? 'mobile-query-field wide' : 'desktop-query-field'"><label v-if="isMobile">关键词</label>
<a-input-search
          v-model:value="searchForm.keyword"
          size="small"
          placeholder="搜索任务号/ASIN/店铺/产品名"
          style="width: 300px"
          allow-clear
          @search="handleSearch"
        />
        </div>
        <div :class="isMobile ? 'mobile-query-field' : 'desktop-query-field'"><label v-if="isMobile">任务状态</label>
<a-select
          v-model:value="searchForm.status"
          size="small"
          style="width: 140px"
          allow-clear
          placeholder="状态筛选"
          @change="handleFilterChange"
        >
          <a-select-option v-for="item in STATUS_OPTIONS" :key="item.value" :value="item.value">
            {{ item.label }}
          </a-select-option>
        </a-select>
        </div>
        <div :class="isMobile ? 'mobile-query-field' : 'desktop-query-field'"><label v-if="isMobile">国家</label>
<a-select
          v-model:value="searchForm.country_id"
          size="small"
          style="width: 120px"
          allow-clear
          placeholder="国家筛选"
          @change="handleFilterChange"
        >
          <a-select-option v-for="item in countryOptions" :key="item.id" :value="item.id">
            {{ item.country }}
          </a-select-option>
        </a-select>
        </div>
        <div :class="isMobile ? 'mobile-query-field' : 'desktop-query-field'"><label v-if="isMobile">测评类型</label>
<a-select
          v-model:value="searchForm.review_type"
          size="small"
          style="width: 130px"
          allow-clear
          placeholder="测评类型"
          @change="handleFilterChange"
        >
          <a-select-option v-for="item in reviewTypeFilterOptions" :key="item.value" :value="item.value">
            {{ item.label }}
          </a-select-option>
        </a-select>
        </div>
        <div :class="isMobile ? 'mobile-query-field wide' : 'desktop-query-field'"><label v-if="isMobile">客户/客户ID</label>
<a-select
          v-model:value="searchForm.employee_id"
          mode="multiple"
          size="small"
          style="width: 220px"
          allow-clear
          show-search
          :filter-option="false"
          :max-tag-count="'responsive'"
          placeholder="客户/客户ID"
          :options="customerFilterOptions"
          :loading="customerFilterLoading"
          :not-found-content="customerFilterLoading ? '搜索中…' : '无匹配结果'"
          @search="handleCustomerFilterSearch"
          @change="handleCustomerFilterChange"
        />
        </div>
        <div :class="isMobile ? 'mobile-query-field' : 'desktop-query-field'"><label v-if="isMobile">商务</label>
<a-select
          v-model:value="searchForm.order_clerk_id"
          size="small"
          style="width: 130px"
          allow-clear
          show-search
          option-filter-prop="label"
          placeholder="商务"
          :options="businessFilterOptions"
          @change="handleFilterChange"
        />
        </div>
        <div :class="isMobile ? 'mobile-query-field' : 'desktop-query-field'"><label v-if="isMobile">基础入账</label>
<a-select
          v-model:value="searchForm.basic_bill_status"
          size="small"
          style="width: 130px"
          allow-clear
          placeholder="基础入账"
          @change="handleFilterChange"
        >
          <a-select-option v-for="item in BASIC_BILL_STATUS_OPTIONS" :key="item.value" :value="item.value">
            {{ item.label }}
          </a-select-option>
        </a-select>
        </div>
        <div :class="isMobile ? 'mobile-query-field' : 'desktop-query-field'"><label v-if="isMobile">尾款状态</label>
<a-select
          v-model:value="searchForm.payment_status"
          size="small"
          style="width: 130px"
          allow-clear
          placeholder="尾款状态"
          @change="handleFilterChange"
        >
          <a-select-option v-for="item in TAIL_STATUS_OPTIONS" :key="item.value" :value="item.value">
            {{ item.label }}
          </a-select-option>
        </a-select>
        </div>
        <div :class="isMobile ? 'mobile-query-field' : 'desktop-query-field'"><label v-if="isMobile">结算状态</label>
<a-select
          v-model:value="searchForm.settlement_status"
          size="small"
          style="width: 130px"
          allow-clear
          placeholder="结算状态"
          @change="handleFilterChange"
        >
          <a-select-option v-for="item in SETTLEMENT_STATUS_OPTIONS" :key="item.value" :value="item.value">
            {{ item.label }}
          </a-select-option>
        </a-select>
        </div>
        <div :class="isMobile ? 'mobile-query-field wide' : 'desktop-query-field'"><label v-if="isMobile">创建时间</label>
<a-range-picker
          v-model:value="searchForm.time_range"
          size="small"
          style="width: 240px"
          value-format="YYYY-MM-DD"
          :dropdown-class-name="isMobile ? 'mobile-readonly-date-popup' : undefined"
          allow-clear
          :placeholder="['创建开始', '创建结束']"
          @change="handleFilterChange"
        />
        </div>
        <!-- 刷新只重载数据、保留筛选；清空筛选是「重置」的职责（李运侠 改，2026-08-29） -->
        <a-button v-if="!isMobile" type="primary" size="small" :loading="loading" @click="loadOrders">
          <span class="btn-inner"><ReloadOutlined />刷新</span>
        </a-button>
        <a-button v-if="!isMobile" size="small" @click="handleResetFilters">重置</a-button>
        <!-- 禅道 #142：导出按当前筛选条件走后端模板 -->
        <a-button v-if="!isMobile" size="small" :loading="exporting" @click="handleExport">
          <span class="btn-inner"><DownloadOutlined />导出</span>
        </a-button>
        <template v-if="!isMobile && selectedRowKeys.length > 0">
          <a-button type="primary" size="small" @click="openBatchEditFromSelection">
            <span class="btn-inner"><EditOutlined />批量编辑（{{ selectedRowKeys.length }}）</span>
          </a-button>
        </template>
      </div>
      </div>

      <div v-if="isMobile" class="mobile-data-list">
        <a-spin v-if="loading" />
        <article v-for="record in orders" v-else :key="record.id" class="mobile-data-card">
          <div class="mobile-card-top"><span class="mobile-card-number">{{ record.task_no }}</span><a-tag :color="getStatusColor(record.status_label)">{{ record.status_label }}</a-tag></div>
          <div class="mobile-card-product"><div class="mobile-product-copy"><h2>{{ getProductName(record) }}</h2><div class="mobile-asin">{{ record.product?.asin }}</div><div class="mobile-card-tags"><a-tag>{{ getCountryName(record) }}</a-tag><a-tag v-if="getReviewLevelDisplay(record)">{{ getReviewLevelDisplay(record) }}</a-tag><a-tag>{{ getReviewTypeDisplay(record) }}</a-tag><a-tag>共{{ record.total_order_quantity || 0 }}单</a-tag></div></div></div>
          <div class="mobile-card-people"><span>客户 {{ record.employee?.name }}</span><span>商务 {{ record.creator?.real_name }}</span></div>
          <div class="mobile-card-amounts">
            <div><label>应收基础款项</label><template v-if="receivableBaseAmountDisplay(record).kind === 'mixed'"><span>{{ receivableAmountText(record.task_usd_amount, '$') }}</span><span>{{ receivableAmountText(record.task_cny_amount, '¥') }}</span></template><span v-else>{{ receivableAmountText(record.base_receivable_amount, '¥') }}</span></div>
            <div>
              <label>基础款与结算</label>
              <template v-if="shouldShowActualReceivedCell(record)">
                <span>实收 </span>
                <span v-if="shouldShowActualReceivedUsd(record)">${{ record.task_basic?.actual_usd_amount }}</span>
                <span v-if="hasDisplayAmount(record.task_basic?.actual_cny_amount)">¥{{ record.task_basic.actual_cny_amount }}</span>
                <span v-else>—</span>
                <div class="mobile-basic-billing">
                  基础入账：{{ getBasicBillStatusLabel(record) }}
                  <template v-if="isBasicBillIncomplete(record) && formatGroupBasicEntryAmount(record)"> · 待收 {{ formatGroupBasicEntryAmount(record) }}</template>
                  <template v-else-if="isBasicBillSurplus(record) && formatGroupBasicEntryAmount(record)"> · 富余 {{ formatGroupBasicEntryAmount(record) }}</template>
                  <template v-if="getSettlementStatus(record) === '已结算'"> · 结算状态：已结算</template>
                </div>
              </template>
            </div>
          </div>
          <div class="mobile-card-bottom">
            <span v-if="getTailStatusKind(record) === 'dash'">尾款：-</span>
            <span v-else-if="getTailStatusKind(record) === 'owed'">欠款：<template v-if="hasRealDebt(record)">¥{{ getFirstBill(record)?.arrears_amount }}</template><template v-if="hasListUsdArrears(record)"> ${{ listArrearsUsdText(record) }}</template></span>
            <span v-else-if="getTailStatusKind(record) === 'surplus'">余款：<template v-if="hasRealSurplus(record)">¥{{ getFirstBill(record)?.arrears_amount }}</template><template v-if="hasListUsdArrears(record)"> ${{ listArrearsUsdText(record) }}</template></span>
            <span v-else>尾款：无异常</span>
            <a-button type="link" @click="viewDetail(record)">详情 <RightOutlined /></a-button>
          </div>
        </article>
        <a-empty v-if="!loading && orders.length === 0" description="暂无接单数据" />
      </div>
      <div v-if="isMobile" class="mobile-card-pagination"><a-pagination :current="pagination.current" :page-size="pagination.pageSize" :total="pagination.total" simple @change="(page: number) => handleTableChange({ current: page, pageSize: pagination.pageSize })" /></div>

      <!-- 表格整体等比缩放：列宽/字号/内边距同步，见 updateTableZoom（李运侠 改，2026-08-31） -->
      <div v-else :ref="bindTableWrap" class="table-wrap" :style="{ zoom: tableZoom }">
      <a-table
        :columns="tableColumns"
        :data-source="orders"
        :loading="loading"
        :pagination="paginationConfig"
        row-key="id"
        size="middle"
        :row-selection="rowSelection"
        :scroll="{ x: tableScrollX, y: tableScrollY }"
        :row-class-name="getRowClass"
        @change="handleTableChange"
      >
        <template #headerCell="{ column }">
          <template v-if="column.key === 'action'">
            <div class="action-column-header">
              <span class="action-column-title">操作</span>
              <a-button
                type="text"
                size="small"
                class="column-setting-trigger"
                title="设置表头"
                aria-label="设置表头"
                @click.stop="openColumnSetting"
              >
                <SettingOutlined />
              </a-button>
            </div>
          </template>
        </template>
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'task_no'">
            <div class="order-number-cell">
              <div class="order-number-row">
                <div v-if="record._isMultiBatch" class="batch-side-bar" :style="{ background: record._batchColor }"></div>
                <a class="order-number-link" @click="openCurrentTaskBill(record)">{{ record.task_no }}</a>
                <button v-if="record._showGroupBillIcon !== false" type="button" class="order-bill-icon" title="组账单" aria-label="组账单" @click.stop="showGroupDetail(record)">
                  <AccountBookOutlined />
                </button>
              </div>
            </div>
          </template>

          <template v-if="column.key === 'customer'">
            <div class="customer-cell">
              <a-tooltip v-if="customerCompanyNameOverflows(record)" :title="getCustomerCompanyName(record)">
                <span class="customer-name-cell">{{ shortenCustomerCompanyName(getCustomerCompanyName(record)) }}</span>
              </a-tooltip>
              <span v-else-if="getCustomerCompanyName(record)" class="customer-name-cell">{{ getCustomerCompanyName(record) }}</span>
              <span v-else class="text-empty">-</span>
              <span v-if="getCustomerContactName(record)" class="customer-meta-line">客户：{{ getCustomerContactName(record) }}</span>
              <span v-if="getCustomerGroupChatName(record)" class="customer-meta-line group">下单群组：{{ getCustomerGroupChatName(record) }}</span>
              <a-tag v-if="showCustomerGroupTag(record)" color="blue" size="small" style="width:fit-content">群组</a-tag>
              <a-tag v-else-if="record.customer?.feedback_type && !getCustomerGroupChatName(record)" color="cyan" size="small" style="width:fit-content">私聊</a-tag>
            </div>
          </template>

          <template v-if="column.key === 'product'">
            <div class="product-cell">
              <div class="product-info">
                <div class="asin">{{ record.product?.asin || '—' }}</div>
                <!-- 品名只取 product_name/name，禁止用 brand_name 兜底 -->
                <div class="product-name" :title="getProductName(record)">{{ getProductName(record) }}</div>
                <!-- 「店铺」行已按李运侠 2026-09-06 要求删除；搜索框仍支持按店铺检索，
                     store_name 字段本身没动，恢复时把这一行加回来即可。 -->
              </div>
            </div>
          </template>

          <template v-if="column.key === 'order_types'">
            <div class="order-types-cell">
              <div class="review-type-line">
                <a-tag
                  v-if="getReviewLevelDisplay(record)"
                  :color="getReviewTypeColor(getReviewLevelDisplay(record))"
                  size="small"
                >
                  {{ getReviewLevelDisplay(record) }}
                </a-tag>
                <span class="total-qty-badge">共{{ record.total_order_quantity || 0 }}单</span>
              </div>
              <div class="type-qty-row">
                <a-tag :color="getReviewTypeColor(getReviewTypeDisplay(record))" size="small">
                  {{ getReviewTypeDisplay(record) }}
                </a-tag>
              </div>
            </div>
          </template>

          <template v-if="column.key === 'receivable_amount'">
            <div class="amount-cell">
              <template v-if="receivableBaseAmountDisplay(record).kind === 'mixed'">
                <div class="amount-usd-part">
                  <span class="amount-usd-tag">{{ receivableAmountText(record.task_usd_amount, '$') }}</span>
                </div>
                <div class="amount-cny-main">{{ receivableAmountText(record.task_cny_amount, '¥') }}</div>
              </template>
              <div v-else class="amount-cny-main">{{ receivableAmountText(record.base_receivable_amount, '¥') }}</div>
            </div>
          </template>

          <template v-if="column.key === 'actual_received'">
            <div v-if="shouldShowActualReceivedCell(record)" class="amount-cell actual-received-cell">
              <div class="billing-row actual-received-amount-row">
                <span class="billing-label">实收：</span>
                <div class="actual-received-amount-values">
                  <div v-if="shouldShowActualReceivedUsd(record)" class="amount-usd-part">
                    <span class="amount-usd-tag">
                      {{ formatIncomeCurrency(record.task_basic?.actual_usd_amount, '$') }}
                    </span>
                  </div>
                  <div v-if="hasDisplayAmount(record.task_basic?.actual_cny_amount)" class="amount-cny-main amount-received">
                    {{ formatIncomeCurrency(record.task_basic?.actual_cny_amount, '¥') }}
                  </div>
                  <div v-else class="text-empty">—</div>
                </div>
              </div>
              <div class="basic-billing-under-received">
                <div class="billing-row">
                  <span class="billing-label">基础入账：</span>
                  <a-tag
                    :color="isBasicBillIncomplete(record) ? 'red' : isBasicBillSurplus(record) ? 'blue' : 'green'"
                    size="small"
                  >
                    {{ getBasicBillStatusLabel(record) }}
                  </a-tag>
                </div>
                <div v-if="isBasicBillIncomplete(record) && formatGroupBasicEntryAmount(record)" class="billing-row">
                  <span class="billing-label">待收：</span>
                  <span class="billing-entry-pending">{{ formatGroupBasicEntryAmount(record) }}</span>
                </div>
                <div v-else-if="isBasicBillSurplus(record) && formatGroupBasicEntryAmount(record)" class="billing-row">
                  <span class="billing-label">富余：</span>
                  <span class="billing-entry-surplus">{{ formatGroupBasicEntryAmount(record) }}</span>
                </div>
                <div v-if="getSettlementStatus(record) === '已结算'" class="billing-row">
                  <span class="billing-label">结算状态：</span>
                  <a-tag color="green" size="small">已结算</a-tag>
                </div>
              </div>
            </div>
          </template>

          <template v-if="column.key === 'billing'">
            <div class="billing-cell">
              <div v-if="getTailStatusKind(record) === 'dash'" class="billing-row">
                <span class="text-empty">-</span>
              </div>
              <div v-else-if="getTailStatusKind(record) === 'owed'" class="debt-row">
                <span class="billing-label">欠款：</span>
                <a-tag color="orange" size="small">
                  <template v-if="hasRealDebt(record)">&yen;{{ getFirstBill(record)?.arrears_amount }}</template>
                  <template v-if="hasListUsdArrears(record)">
                    <template v-if="hasRealDebt(record)"> / </template>${{ listArrearsUsdText(record) }}
                  </template>
                </a-tag>
              </div>
              <div v-else-if="getTailStatusKind(record) === 'surplus'" class="debt-row">
                <span class="billing-label">余款：</span>
                <a-tag color="blue" size="small">
                  <template v-if="hasRealSurplus(record)">&yen;{{ getFirstBill(record)?.arrears_amount }}</template>
                  <template v-if="hasListUsdArrears(record)">
                    <template v-if="hasRealSurplus(record)"> / </template>${{ listArrearsUsdText(record) }}
                  </template>
                </a-tag>
              </div>
              <div v-else class="billing-row">
                <a-tag color="default" size="small">无异常</a-tag>
              </div>
            </div>
          </template>

          <template v-if="column.key === 'feedback'">
            <div class="feedback-cell">
              <div class="feedback-row">
                <span class="feedback-label">订单：</span>
                <a-tag
                  :color="isFeedbackDone(record, 'order') ? 'green' : 'default'"
                  size="small"
                >
                  {{ getFeedbackStatusLabel(record, 'order') }}
                </a-tag>
              </div>
              <div class="feedback-row">
                <span class="feedback-label">评论：</span>
                <a-tag
                  :color="isFeedbackDone(record, 'comment') ? 'green' : 'default'"
                  size="small"
                >
                  {{ getFeedbackStatusLabel(record, 'comment') }}
                </a-tag>
              </div>
            </div>
          </template>

          <template v-if="column.key === 'business_remark'">
            <span v-if="record.business_remark" class="notes-text">{{ record.business_remark }}</span>
            <span v-else class="text-empty">—</span>
          </template>

          <template v-if="column.key === 'employee'">
            <a-tooltip :title="getBusinessTooltip(record)">
              <div class="business-cell">
                <span v-if="getBusinessCreatorName(record)" class="sales-name">{{ getBusinessCreatorName(record) }}</span>
                <span v-else class="text-empty">-</span>
                <span v-if="getBusinessWechatDisplay(record)" class="business-wechat">
                  {{ getBusinessWechatDisplay(record) }}
                </span>
              </div>
            </a-tooltip>
          </template>

          <template v-if="column.key === 'task_status'">
            <a-tag :color="getStatusColor(record.status_label)" size="small">{{ record.status_label || '—' }}</a-tag>
          </template>

          <template v-if="column.key === 'country'">
            <a-tag>{{ getCountryName(record) }}</a-tag>
          </template>

          <template v-if="column.key === 'action'">
            <div class="action-cell">
              <a-dropdown
                v-bind="pageActionLoading ? { open: false } : {}"
                :trigger="['hover']"
                placement="bottomRight"
                overlay-class-name="order-action-dropdown"
              >
                <a-button type="link" size="small" @click.stop>操作</a-button>
                <template #overlay>
                  <div class="order-action-panel" :style="actionPanelStyle">
                    <a-button type="link" size="small" @click="viewDetail(record)">详情</a-button>
                    <a-button type="link" size="small" @click="openFeedbackModal(record)">反馈</a-button>
                    <a-popconfirm
                      title="确定删除这条任务吗?"
                      :get-popup-container="getActionPopupContainer"
                      @confirm="deleteOrder(record.id)"
                    >
                      <a-button type="link" size="small" danger>删除</a-button>
                    </a-popconfirm>
                  </div>
                </template>
              </a-dropdown>
            </div>
          </template>
        </template>
      </a-table>
      </div>
    </div>
    </a-spin>

    <!-- 按单条任务编辑商务备注（lyx 2026-11-04 改） -->
    <a-modal
      v-if="!isMobile && BUSINESS_REMARK_INLINE_EDIT_ENABLED"
      v-model:open="businessRemarkOpen"
      title="编辑商务备注"
      ok-text="确定"
      cancel-text="取消"
      :confirm-loading="businessRemarkSaving"
      :mask-closable="!businessRemarkSaving"
      destroy-on-close
      @ok="submitBusinessRemark"
    >
      <a-textarea
        v-model:value="businessRemarkDraft"
        :rows="4"
        placeholder="请输入商务备注"
      />
    </a-modal>

    <a-modal v-if="!isMobile"
      v-model:open="columnSettingOpen"
      title="设置表头"
      ok-text="确定"
      cancel-text="取消"
      width="520px"
      @ok="confirmColumnSetting"
    >
      <div class="column-setting-description">选择需要在接单管理中展示的表头字段</div>
      <a-checkbox-group v-model:value="columnSettingDraft" class="column-setting-grid">
        <a-checkbox
          v-for="column in configurableColumns"
          :key="column.key"
          :value="column.key"
        >
          {{ column.title }}
        </a-checkbox>
      </a-checkbox-group>
      <a-button type="link" class="column-setting-reset" @click="resetColumnSetting">
        恢复默认
      </a-button>
    </a-modal>

    <OrderDetailDrawer
      v-model:open="drawerOpen"
      :mobile-read-only="isMobile"
      :order="currentOrder"
      @edit-feedback="openFeedbackModal"
      @open-billing="openBillingDrawer"
    />

    <FeedbackModal v-if="!isMobile"
      v-model:open="feedbackModalOpen"
      :record="feedbackRecord"
      :saving="feedbackSaving"
      @save="handleFeedbackSave"
    />

    <BillingDrawer v-if="!isMobile"
      :open="billingDrawerOpen"
      :order="billingDrawerOrder"
      @close="billingDrawerOpen = false"
      @updated="onBillingUpdated"
    />

    <GroupBillingDrawer v-if="!isMobile"
      :open="groupDetailModalOpen"
      :group-data="groupDetailData"
      :group-orders="groupDetailOrders"
      :bill-data="groupBillData"
      :loading="groupBillLoading"
      @close="groupDetailModalOpen = false"
      @updated="loadOrders"
    />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'OrdersManage' })

import { computed, h, nextTick, onMounted, ref } from 'vue'



import { useTableZoom } from './useTableZoom'
import { message } from 'ant-design-vue'
import { notifyExportDownload, runExportDownload } from './runtime'
import {
  ReloadOutlined,
  AccountBookOutlined,
  EditOutlined,
  DownloadOutlined,
  SettingOutlined,
  FilterOutlined,
  RightOutlined,
} from '@ant-design/icons-vue'

import { getCommonOptions, searchCommonEmployees } from './prototypeService'
import { useSettingStore } from './runtime'
import { formatReviewLevelText } from './runtime'
import {
  deleteReceive,
  getReceiveBillDetail,
  getReceiveDetail,
  getReceiveEnums,
  getReceiveFeedbackDetail,
  getReceiveList,
  getReceiveStatistics,
  exportReceiveList,
  normalizeReceiveEmployeeIds,
  postReceiveBatchBill,
  saveReceiveFeedback,
  updateReceiveBusinessRemark,
  type ReceiveListItem,
  type ReceiveStatisticsData,
} from './prototypeService'
import { readReceiveTaskId, runBusinessRemarkSubmit } from './businessRemarkEdit'
import { receivableAmountText, receivableBaseAmountDisplay } from './receivableAmountDisplay'
import OrderDetailDrawer from './components/OrderDetailDrawer.vue'
import FeedbackModal from './components/FeedbackModal.vue'
import GroupBillingDrawer from './components/GroupBillingDrawer.vue'
import BillingDrawer from './components/BillingDrawer.vue'
import {
  formatCustomerFilterLabel,
  formatIncomeCurrency,
  formatSignedCurrency,
  formatStatisticsArrearsUsd,
  isMixedPaymentModeGroup,
} from './components/billingFormUtils'
import {
  getBatchGroupKey,
  getBatchGroupLabel,
  formatGroupBasicEntryAmount,
  getBasicBillStatusLabel,
  getCountryName,
  getFeedbackStatusLabel,
  getFirstBill,
  getProductName,
  getReviewTypeColor,
  getReviewTypeLabel,
  getRowClass,
  getStatusColor,
  hasMultipleTypes,
  hasListUsdArrears,
  shortenCustomerCompanyName,
  getSettlementStatus,
  getTailStatusKind,
  hasRealDebt,
  hasRealSurplus,
  listArrearsUsdText,
  isBasicBillIncomplete,
  isBasicBillSurplus,
  isFeedbackDone,
  isGroupFeedback,
  TABLE_COLUMNS,
  type ReviewTypeEnumMap,
} from './helpers'

type CountryOption = {
  id: number | string
  country: string
  [key: string]: any
}

type SearchFormState = {
  keyword: string
  status: number | undefined
  country_id: number | string | undefined
  review_type: string | undefined
  employee_id: number[]
  order_clerk_id: number | undefined
  payment_status: number | undefined
  basic_bill_status: number | undefined
  settlement_status: number | undefined
  time_range: [string, string] | null | undefined
}

const isMobile = ref(false)
const mobileFilterOpen = ref(false)

const STATUS_OPTIONS = [
  // 筛选文案「待生成」（禅道 #145）；表格状态列取后端 status_label，不走这里
  { label: '待生成', value: 1 },
  { label: '进行中', value: 2 },
  { label: '已完成', value: 3 },
  { label: '已暂停', value: 4 },
  { label: '已截单', value: 5 },
]

/** 尾款状态筛（不含已结算；已结算走结算筛） */
const TAIL_STATUS_OPTIONS = [
  { label: '无异常', value: 1 },
  { label: '有欠款', value: 2 },
  { label: '有余款', value: 3 },
]

const SETTLEMENT_STATUS_OPTIONS = [
  { label: '无需补退', value: 1 },
  { label: '未结算', value: 2 },
  { label: '已结算', value: 3 },
]

const BASIC_BILL_STATUS_OPTIONS = [
  { label: '未完成', value: 2 },
  { label: '已完成', value: 1 },
  { label: '富余', value: 3 },
]

const countryOptions = ref<CountryOption[]>([])
const reviewTypeEnumMap = ref<ReviewTypeEnumMap>({})
const reviewTypeFilterOptions = ref<{ label: string; value: string }[]>([])
type CustomerFilterOption = { label: string; value: number }
const customerFilterOptions = ref<CustomerFilterOption[]>([])
const customerFilterLoading = ref(false)
const selectedCustomerFilterOptions = ref<CustomerFilterOption[]>([])
const businessFilterOptions = ref<{ label: string; value: number }[]>([])

const searchForm = ref<SearchFormState>({
  keyword: '',
  status: undefined,
  country_id: undefined,
  review_type: undefined,
  employee_id: [],
  order_clerk_id: undefined,
  payment_status: undefined,
  basic_bill_status: undefined,
  settlement_status: undefined,
  time_range: undefined,
})

const emptyFilterStatistics = (): ReceiveStatisticsData => ({
  has_filter: false,
  total_order_quantity: 0,
  total_commission: { task_usd_commission: 0, task_cny_commission: 0 },
  base_receivable_amount: 0,
  actual_base_amount: { task_usd_amount: 0, task_cny_amount: 0 },
  arrears_amount: 0,
  arrears_usd_amount: 0,
})
const filterStatistics = ref<ReceiveStatisticsData>(emptyFilterStatistics())
const filterStatisticsVisible = computed(() => Boolean(filterStatistics.value?.has_filter))

function handleSearch() {
  pagination.value.current = 1
  loadOrders()
}

function handleFilterChange() {
  pagination.value.current = 1
  loadOrders()
}

function syncSelectedCustomerFilterOptions(ids: number[]) {
  const pool = [...selectedCustomerFilterOptions.value, ...customerFilterOptions.value]
  selectedCustomerFilterOptions.value = ids.flatMap((id) => {
    const matched = pool.find(item => item.value === id)
    return matched ? [matched] : []
  })
}

function handleCustomerFilterChange(value: number[] | number | undefined) {
  const ids = normalizeReceiveEmployeeIds(value)
  searchForm.value.employee_id = ids
  syncSelectedCustomerFilterOptions(ids)
  if (ids.length === 0)
    void loadCustomerFilterOptions()
  handleFilterChange()
}

function handleResetFilters() {
  searchForm.value = {
    keyword: '',
    status: undefined,
    country_id: undefined,
    review_type: undefined,
    employee_id: [],
    order_clerk_id: undefined,
    payment_status: undefined,
    basic_bill_status: undefined,
    settlement_status: undefined,
    time_range: undefined,
  }
  selectedCustomerFilterOptions.value = []
  void loadCustomerFilterOptions()
  pagination.value.current = 1
  loadOrders()
}

function reviewTypeLabel(key: string) {
  return getReviewTypeLabel(key, reviewTypeEnumMap.value)
}

function getReviewTypeDisplay(record: any) {
  if (hasMultipleTypes(record)) return '混合模式'
  const typeKey = Array.isArray(record.review_types) ? record.review_types[0] : ''
  return typeKey ? reviewTypeLabel(typeKey) : '—'
}

function getReviewLevelDisplay(record: any) {
  const level = Number(record.review_level || 0)
  const rawLabel = String(record.review_level_label || '')
  if (level === 1 || rawLabel.includes('普通')) return ''
  if (rawLabel) return formatReviewLevelText(rawLabel).replace(/测评$/, '')
  if (level === 2 || level === 3) return formatReviewLevelText(level).replace(/测评$/, '')
  return ''
}

/**
 * 金额是否有值（李运侠 改，2026-08-30）
 * 原判定是 `> 0`，导致实收 0 被当成「无值」显示成「—」。
 * 0 是有意义的金额，只有 null / undefined / 空串 / 非数字才算无值。
 */
function hasDisplayAmount(value: unknown) {
  if (value === undefined || value === null || value === '') return false
  return Number.isFinite(Number(value))
}

function formatActualReceivedStatistics(statistics: ReceiveStatisticsData) {
  const usd = Number(statistics.actual_base_amount?.task_usd_amount)
  const cnyText = formatIncomeCurrency(statistics.actual_base_amount?.task_cny_amount, '¥')
  if (Number.isFinite(usd) && usd !== 0)
    return `${formatIncomeCurrency(usd, '$')} / ${cnyText}`
  return cnyText
}

const loading = ref(false)
/** 详情/反馈/账款/删除请求期间罩住表格，避免连点重复发请求（李运侠 改） */
const pageActionLoading = ref(false)
const loadSeq = ref(0)
const allOrders = ref<any[]>([])
const orders = ref<any[]>([])
const selectedRowKeys = ref<string[]>([])
const pagination = ref({ current: 1, pageSize: 20, total: 0, showSizeChanger: true, hideOnSinglePage: false })

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: (string | number)[]) => { selectedRowKeys.value = keys.map(String) },
}))

const paginationConfig = computed(() => ({
  ...pagination.value,
  showTotal: (total: number) => {
    const statistics = filterStatistics.value
    const usdCommission = Number(statistics.total_commission?.task_usd_commission || 0)
    const cnyCommission = Number(statistics.total_commission?.task_cny_commission || 0)
    const commissionText = `${usdCommission > 0 ? `$${usdCommission.toFixed(2)} / ` : ''}¥${cnyCommission.toFixed(2)}`
    const items = [
      ['接单量', String(statistics.total_order_quantity || 0)],
      ['佣金', commissionText],
      [
        '应收基础款项',
        `¥${Number(statistics.base_receivable_amount || 0).toFixed(2)}`,
      ],
      [
        '基础款与结算',
        formatActualReceivedStatistics(statistics),
      ],
      ['尾款状态', `${formatSignedCurrency(statistics.arrears_amount, '¥')} / ${formatStatisticsArrearsUsd(statistics.arrears_usd_amount)}`],
    ]

    return h('div', { class: 'orders-pagination-total' }, [
      h('div', {
        class: 'filter-statistics-bar',
        style: { visibility: filterStatisticsVisible.value ? 'visible' : 'hidden' },
      }, items.map(([label, value]) =>
        h('span', { class: 'filter-stat-item' }, [
          h('span', { class: 'filter-stat-label' }, label),
          h('span', { class: 'filter-stat-val' }, value),
        ]),
      )),
      h('span', { class: 'orders-pagination-count' }, `共 ${total} 条`),
    ])
  },
}))

const configurableColumns = TABLE_COLUMNS.filter((column: any) => column.key !== 'action')
const defaultColumnKeys = configurableColumns.map((column: any) => String(column.key))
const COLUMN_SETTING_STORAGE_KEY = 'ruimai-orders-manage-visible-columns'

function readVisibleColumnKeys(): string[] {
  try {
    const stored = JSON.parse(localStorage.getItem(COLUMN_SETTING_STORAGE_KEY) || '[]')
    if (!Array.isArray(stored))
      return [...defaultColumnKeys]
    const validKeys = stored.map(String).filter(key => defaultColumnKeys.includes(key))
    return validKeys.length ? validKeys : [...defaultColumnKeys]
  }
  catch {
    return [...defaultColumnKeys]
  }
}

const visibleColumnKeys = ref<string[]>(readVisibleColumnKeys())
const columnSettingOpen = ref(false)
const columnSettingDraft = ref<string[]>([])
/** 按单条任务保存商务备注，恢复双击入口。（lyx 2026-11-04 改；Apifox 2026-11-04T07:10:44.682Z 拉取） */
const BUSINESS_REMARK_INLINE_EDIT_ENABLED = true
const businessRemarkOpen = ref(false)
const businessRemarkSaving = ref(false)
const businessRemarkDraft = ref('')
const businessRemarkTaskId = ref<number | null>(null)

function openBusinessRemarkEditor(record: ReceiveListItem) {
  const taskId = readReceiveTaskId(record)
  if (taskId == null) {
    message.warning('缺少任务ID，无法修改商务备注')
    return
  }
  businessRemarkTaskId.value = taskId
  businessRemarkDraft.value = String(record.business_remark ?? '')
  businessRemarkOpen.value = true
}

async function submitBusinessRemark() {
  const result = await runBusinessRemarkSubmit({
    saving: businessRemarkSaving,
    taskId: businessRemarkTaskId.value,
    draft: businessRemarkDraft.value,
    post: updateReceiveBusinessRemark,
    refresh: loadOrders,
  })
  if (result.status === 'busy')
    return Promise.reject(new Error('busy'))
  if (result.status === 'missing-id') {
    message.warning(result.message)
    return Promise.reject(new Error(result.message))
  }
  if (result.status === 'failed') {
    message.error(result.message)
    return Promise.reject(new Error(result.message))
  }
  message.success(result.message)
  businessRemarkOpen.value = false
}

const tableColumns = computed(() => TABLE_COLUMNS
  .filter((column: any) => column.key === 'action' || visibleColumnKeys.value.includes(String(column.key)))
  .map((column: any) => {
  if (column.key === 'business_remark' && BUSINESS_REMARK_INLINE_EDIT_ENABLED) {
    return {
      ...column,
      customCell: (record: ReceiveListItem) => ({
        onDblclick: () => openBusinessRemarkEditor(record),
        style: { cursor: 'pointer' },
        title: '双击编辑商务备注',
      }),
    }
  }
  if (column.key !== 'actual_received') return column
  return {
    ...column,
    customCell: (record: any) => ({
      rowSpan: Number(record._actualReceivedRowSpan ?? 1),
    }),
  }
  }))
const tableScrollX = computed(() => tableColumns.value.reduce(
  (sum: number, column: any) => sum + Number(column.width || 0),
  0,
))
const { bindWrap: bindTableWrap, zoom: tableZoom, scrollY: tableScrollYOf } = useTableZoom(tableScrollX)
const tableScrollY = tableScrollYOf('100vh - 358px')

function openColumnSetting() {
  columnSettingDraft.value = [...visibleColumnKeys.value]
  columnSettingOpen.value = true
}

function confirmColumnSetting() {
  if (!columnSettingDraft.value.length) {
    message.warning('请至少保留一个表头字段')
    return
  }
  visibleColumnKeys.value = [...columnSettingDraft.value]
  localStorage.setItem(COLUMN_SETTING_STORAGE_KEY, JSON.stringify(visibleColumnKeys.value))
  columnSettingOpen.value = false
}

function resetColumnSetting() {
  columnSettingDraft.value = [...defaultColumnKeys]
}

// 固定列悬停时需要一层不透明底色，见文件末尾 .ant-table-cell-fix-* 规则
const settingStore = useSettingStore()
const isDarkTheme = computed(() => ['dark', 'night'].includes(settingStore.theme.mode))
const tableFixedCellBg = computed(() => (isDarkTheme.value ? '#1f1f1f' : '#ffffff'))

// 操作面板会被 teleport 到 body，拿不到 .page-content 上的 CSS 变量，底色只能走内联样式
const actionPanelStyle = computed(() => ({
  background: tableFixedCellBg.value,
  borderColor: isDarkTheme.value ? '#303030' : '#f0f0f0',
}))

// 删除确认弹层挂到操作面板内部，避免鼠标移入后 hover 下拉被判定为离开而收起
const getActionPopupContainer = (node: HTMLElement) => node.parentElement || document.body

const drawerOpen = ref(false)
const currentOrder = ref<any>(null)

const feedbackModalOpen = ref(false)
const feedbackRecord = ref<any>(null)
const feedbackSaving = ref(false)

const billingDrawerOpen = ref(false)
const billingDrawerOrder = ref<any>(null)

const groupDetailModalOpen = ref(false)
const groupDetailData = ref<any>(null)
const groupDetailOrders = ref<any[]>([])
const groupBillData = ref<any>(null)
const groupBillLoading = ref(false)

/** 导出中（禅道 #142） */
const exporting = ref(false)

function normalizeListRow(raw: any) {
  const summary = raw.review_quantity_summary && typeof raw.review_quantity_summary === 'object'
    ? raw.review_quantity_summary
    : {}
  const reviewTypes = Array.isArray(raw.review_types) && raw.review_types.length
    ? raw.review_types.map((item: any) => String(item)).filter(Boolean)
    : Object.keys(summary).length
      ? Object.keys(summary).filter(key => Number(summary[key] || 0) > 0)
      : String(raw.actual_review_type || raw.review_type || '')
          .split(',')
          .map(item => item.trim())
          .filter(Boolean)

  return {
    ...raw,
    id: String(raw.id),
    country: raw.country || raw.task_basic?.country || (raw.site_task_country ? { country: raw.site_task_country } : undefined),
    review_types: reviewTypes,
    _reviewTypeEnumMap: reviewTypeEnumMap.value,
  }
}

function getBusinessCreatorName(record: any) {
  return record?.creator?.real_name
    || record?.creator?.realname
    || record?.creator?.name
    || record?.creator_name
    || ''
}

function getBusinessWechatDisplay(record: any) {
  const nickname = String(record?.creator?.wechat_nickname || '').trim()
  const account = String(record?.creator?.wechat_account || '').trim()
  return nickname || account
}

function getBusinessTooltip(record: any) {
  const name = getBusinessCreatorName(record)
  const wechat = getBusinessWechatDisplay(record)
  return [name && `商务：${name}`, wechat].filter(Boolean).join('；') || '暂无商务信息'
}

function getCustomerCompanyName(record: any) {
  return record?.customer?.name
    || record?.customer_name
    || ''
}

function customerCompanyNameOverflows(record: any) {
  return Array.from(String(getCustomerCompanyName(record))).length > 7
}

function showCustomerGroupTag(record: any) {
  return isGroupFeedback(record) && !getCustomerGroupChatName(record)
}

function getCustomerContactName(record: any) {
  return record?.employee?.name
    || record?.employee_name
    || ''
}

function getCustomerGroupChatName(record: any) {
  const raw =
    record?.group_chat_name
    || record?.customer?.group_chat_name
    || record?.task_basic?.group_chat_name
    || ''
  if (Array.isArray(raw)) return raw.filter(Boolean).join('、')
  return raw || ''
}

type HydrateOptions = {
  feedback?: boolean
  bill?: boolean
  detail?: boolean
}

async function hydrateOrder(order: any, options: HydrateOptions = {}) {
  const { feedback = false, bill = false, detail = false } = options
  const next = { ...order, _reviewTypeEnumMap: reviewTypeEnumMap.value }
  if (detail) next._detailFeedback = undefined
  const id = order.id

  const [feedbackResult, billResult, detailResult] = await Promise.allSettled([
    feedback ? getReceiveFeedbackDetail(id) : Promise.resolve(null),
    bill ? getReceiveBillDetail(id) : Promise.resolve(null),
    detail ? getReceiveDetail(id) : Promise.resolve(null),
  ])

  if (feedback && feedbackResult.status === 'fulfilled' && feedbackResult.value?.code === 200 && feedbackResult.value.data) {
    next._feedbackDetail = feedbackResult.value.data
  }

  if (bill && billResult.status === 'fulfilled' && billResult.value?.code === 200 && billResult.value.data) {
    const data = billResult.value.data
    // 汇总在 data.bill_details。整份 data 盖上去时，根上的 actual_receivable_amount 为 0 会挡住 settled_amount / pending_settlement_diff。（李运侠 改）
    const summary = data.bill_details && typeof data.bill_details === 'object' && !Array.isArray(data.bill_details)
      ? data.bill_details
      : data
    next.bill_details = summary
    next.bill = Array.isArray(data.bill) ? data.bill : (data.bill ? [data.bill] : [])
  }

  if (detail && detailResult.status === 'fulfilled' && detailResult.value?.code === 200 && detailResult.value.data) {
    const data = detailResult.value.data
    Object.assign(next, normalizeListRow(data))
    next.transaction_flows = Array.isArray(data.transaction_flows) ? data.transaction_flows : []
    next._detailFeedback = data.feedback?.[0]
    next._feedbackDetail = data.feedback_detail || data.receive_feedback || next._feedbackDetail
    if (data.bill && !next.bill?.length) {
      next.bill = Array.isArray(data.bill) ? data.bill : [data.bill]
    }
    if (data.bill_details && !next.bill_details) next.bill_details = data.bill_details
    if (data.bill_detail && !next.bill_details) next.bill_details = data.bill_detail
  }

  return next
}

function replaceOrderInList(list: any[], updated: any) {
  return list.map(item => (String(item.id) === String(updated.id) ? { ...item, ...updated } : item))
}

function mergeOrderState(updated: any) {
  allOrders.value = replaceOrderInList(allOrders.value, updated)
  orders.value = replaceOrderInList(orders.value, updated)
  groupDetailOrders.value = replaceOrderInList(groupDetailOrders.value, updated)
  if (currentOrder.value && String(currentOrder.value.id) === String(updated.id)) {
    currentOrder.value = { ...currentOrder.value, ...updated }
  }
  if (billingDrawerOrder.value && String(billingDrawerOrder.value.id) === String(updated.id)) {
    billingDrawerOrder.value = { ...billingDrawerOrder.value, ...updated }
  }
  if (feedbackRecord.value && String(feedbackRecord.value.id) === String(updated.id)) {
    feedbackRecord.value = { ...feedbackRecord.value, ...updated }
  }
}

function processBatchGroups() {
  const groups: Record<string, any[]> = {}
  for (const row of orders.value) {
    const key = getBatchGroupKey(row)
    if (!groups[key]) groups[key] = []
    groups[key].push(row)
  }

  const palette = [
    'var(--ant-color-primary)',
    'var(--ant-color-link)',
    'var(--ant-color-success)',
    'var(--ant-color-warning)',
    'var(--ant-color-error)',
    'var(--ant-color-info, var(--ant-color-primary-hover))',
  ]
  let colorIndex = 0
  const colorMap: Record<string, string> = {}

  for (const key of Object.keys(groups)) {
    const isMulti = groups[key].length > 1
    colorMap[key] = isMulti ? palette[colorIndex % palette.length] : 'none'
    if (isMulti) colorIndex++
  }

  for (const row of orders.value) {
    const key = getBatchGroupKey(row)
    const group = groups[key]
    row._batchColor = colorMap[key]
    row._isMultiBatch = group.length > 1
    row._isFirstInBatch = String(group[0].id) === String(row.id)
    row._isLastInBatch = String(group[group.length - 1].id) === String(row.id)
    row._batchLabel = getBatchGroupLabel(row)
  }
}

function getActualReceivedGroupKey(row: any) {
  return row.task_basic?.task_basics_no || `_solo_${row.id}`
}

function applyActualReceivedGroup(group: any[]) {
  const showUsd = isMixedPaymentModeGroup(group)
  group.forEach((row, index) => {
    row._actualReceivedRowSpan = index === 0 ? group.length : 0
    row._actualReceivedShowUsd = showUsd
    row._showGroupBillIcon = index === 0
  })
}

function shouldShowActualReceivedCell(record: any) {
  return Number(record._actualReceivedRowSpan ?? 1) > 0
}

function shouldShowActualReceivedUsd(record: any) {
  return Boolean(record._actualReceivedShowUsd) && hasDisplayAmount(record.task_basic?.actual_usd_amount)
}

function processActualReceivedGroups() {
  let group: any[] = []
  let currentKey = ''

  for (const row of orders.value) {
    const key = getActualReceivedGroupKey(row)
    if (group.length && key !== currentKey) {
      applyActualReceivedGroup(group)
      group = []
    }
    currentKey = key
    group.push(row)
  }

  if (group.length) applyActualReceivedGroup(group)
}

function processListGroups() {
  processBatchGroups()
  processActualReceivedGroups()
}

function buildParams() {
  const params: Record<string, any> = {
    page: pagination.value.current,
    page_size: pagination.value.pageSize,
  }
  if (searchForm.value.keyword.trim()) params.keyword = searchForm.value.keyword.trim()
  if (searchForm.value.status !== undefined) params.status = searchForm.value.status
  if (searchForm.value.country_id !== undefined) params.country_id = searchForm.value.country_id
  if (searchForm.value.review_type) params.review_type = searchForm.value.review_type
  params.employee_id = normalizeReceiveEmployeeIds(searchForm.value.employee_id)
  if (searchForm.value.order_clerk_id !== undefined) params.order_clerk_id = searchForm.value.order_clerk_id
  if (searchForm.value.payment_status !== undefined) params.payment_status = searchForm.value.payment_status
  if (searchForm.value.basic_bill_status !== undefined) params.basic_bill_status = searchForm.value.basic_bill_status
  if (searchForm.value.settlement_status !== undefined) params.settlement_status = searchForm.value.settlement_status
  params.time_range = searchForm.value.time_range
  return params
}

function buildStatisticsParams() {
  return {
    keyword: searchForm.value.keyword.trim() || '',
    status: Number(searchForm.value.status ?? 0) || 0,
    review_type: searchForm.value.review_type || '',
    country_id: Number(searchForm.value.country_id ?? 0) || 0,
    employee_id: normalizeReceiveEmployeeIds(searchForm.value.employee_id),
    order_clerk_id: Number(searchForm.value.order_clerk_id ?? 0) || 0,
    basic_bill_status: Number(searchForm.value.basic_bill_status ?? 0) || 0,
    payment_status: Number(searchForm.value.payment_status ?? 0) || 0,
    settlement_status: Number(searchForm.value.settlement_status ?? 0) || 0,
  }
}

/** 关键字、状态下拉、国家、测评类型、客户、商务、尾款、基础入账、结算，有一项有值才算条件搜索（lyx 改） */
function hasReceiveSearchCondition() {
  const form = searchForm.value
  return Boolean(
    form.keyword.trim()
    || form.status !== undefined
    || form.country_id !== undefined
    || form.review_type
    || normalizeReceiveEmployeeIds(form.employee_id).length > 0
    || form.order_clerk_id !== undefined
    || form.payment_status !== undefined
    || form.basic_bill_status !== undefined
    || form.settlement_status !== undefined,
  )
}

async function loadFilterStatistics() {
  const requestSeq = loadSeq.value
  const withFilter = hasReceiveSearchCondition()
  if (!withFilter) {
    if (requestSeq === loadSeq.value)
      filterStatistics.value = emptyFilterStatistics()
    return
  }
  try {
    const response = await getReceiveStatistics(buildStatisticsParams())
    if (requestSeq !== loadSeq.value)
      return
    if (response.code !== 200 || !response.data) {
      filterStatistics.value = emptyFilterStatistics()
      return
    }
    filterStatistics.value = {
      ...emptyFilterStatistics(),
      ...response.data,
      total_commission: {
        task_usd_commission: Number(response.data.total_commission?.task_usd_commission || 0),
        task_cny_commission: Number(response.data.total_commission?.task_cny_commission || 0),
      },
      base_receivable_amount: Number(response.data.base_receivable_amount || 0),
      has_filter: true,
      total_order_quantity: Number(response.data.total_order_quantity || 0),
      actual_base_amount: {
        task_usd_amount: Number(response.data.actual_base_amount?.task_usd_amount || 0),
        task_cny_amount: Number(response.data.actual_base_amount?.task_cny_amount || 0),
      },
      arrears_amount: Number(response.data.arrears_amount || 0),
    }
  } catch (error) {
    if (requestSeq !== loadSeq.value)
      return
    console.error('获取接单筛选统计失败:', error)
    filterStatistics.value = emptyFilterStatistics()
  }
}

/**
 * 导出（禅道 #142）
 * 只下发筛选条件，Excel 列由后端模板决定；不受分页与勾选影响，导的是整个筛选结果集。
 */
async function handleExport() {
  if (exporting.value)
    return
  exporting.value = true
  try {
    const response = await exportReceiveList({
      ...buildStatisticsParams(),
      time_range: searchForm.value.time_range,
    })
    if (response.code !== 200)
      throw new Error(response.msg || response.message || '导出失败')
    notifyExportDownload(await runExportDownload(response.data))
  }
  catch (error: any) {
    console.error('接单管理导出失败:', error)
    message.error(error?.message || '导出失败')
  }
  finally {
    exporting.value = false
  }
}

async function loadCountryOptions() {
  try {
    const response = await getCommonOptions({ types: 'country' })
    if (response.code !== 200) {
      countryOptions.value = []
      return
    }
    countryOptions.value = (Array.isArray(response.data?.country) ? response.data.country : [])
      .map((item: any) => {
        const id = item?.id ?? item?.value
        const country = item?.country ?? item?.name ?? item?.label
        if (id === undefined || id === null || id === '' || !country) return null
        return { ...item, id, country: String(country) }
      })
      .filter(Boolean) as CountryOption[]
  } catch (error) {
    console.error('获取国家选项失败:', error)
    countryOptions.value = []
  }
}

/**
 * 客户员工输入走服务端 keyword 搜索，避免只能过滤首次返回的有限选项；
 * 已选项在搜索结果变化后继续保留，防止下拉回显成原始 ID。多选时保留全部已选项。（李运侠 2026-10-14 改；lyx 2026-10-23 改为多选）
 */
async function loadCustomerFilterOptions(keyword = '') {
  customerFilterLoading.value = true
  try {
    const response = await searchCommonEmployees(keyword ? { keyword } : {})
    if (response.code !== 200) {
      customerFilterOptions.value = [...selectedCustomerFilterOptions.value]
      return
    }
    const list = Array.isArray(response.data) ? response.data : []
    const options = list
      .map((item: any) => {
        const value = Number(item?.id)
        const label = formatCustomerFilterLabel(item)
        if (!value || !label) return null
        return { value, label }
      })
      .filter(Boolean) as CustomerFilterOption[]
    const selected = selectedCustomerFilterOptions.value.filter(
      item => !options.some(option => option.value === item.value),
    )
    customerFilterOptions.value = [...selected, ...options]
  } catch (error) {
    console.error('获取客户选项失败:', error)
    customerFilterOptions.value = [...selectedCustomerFilterOptions.value]
  } finally {
    customerFilterLoading.value = false
  }
}

function debounceFn<T extends (...args: any[]) => any>(func: T, wait: number) {
  let timer: ReturnType<typeof setTimeout> | null = null
  return (...args: Parameters<T>) => {
    if (timer)
      clearTimeout(timer)
    timer = setTimeout(() => func(...args), wait)
  }
}

const debouncedCustomerFilterSearch = debounceFn((keyword: string) => {
  void loadCustomerFilterOptions(keyword)
}, 300)

function handleCustomerFilterSearch(keyword: string) {
  debouncedCustomerFilterSearch(keyword.trim())
}

async function loadBusinessFilterOptions() {
  try {
    const response = await getCommonOptions({ types: 'admin', prefix: 'sp' })
    if (response.code !== 200) {
      businessFilterOptions.value = []
      return
    }
    const list = response.data?.admin ?? response.data?.admins
    businessFilterOptions.value = (Array.isArray(list) ? list : [])
      .map((item: any) => {
        const value = Number(item?.id)
        const name = String(item?.real_name ?? item?.account ?? '').trim()
        if (!value || !name) return null
        return { value, label: name }
      })
      .filter(Boolean) as { label: string; value: number }[]
  } catch (error) {
    console.error('获取商务选项失败:', error)
    businessFilterOptions.value = []
  }
}

async function loadReviewTypeEnums() {
  try {
    const response = await getReceiveEnums()
    if (response.code !== 200) {
      reviewTypeEnumMap.value = {}
      reviewTypeFilterOptions.value = []
      return
    }
    const raw = response.data?.review_type || response.data?.review_types || response.data
    const map: ReviewTypeEnumMap = {}
    const options: { label: string; value: string }[] = []

    if (Array.isArray(raw)) {
      raw.forEach((item: any) => {
        const value = String(item?.value ?? item?.key ?? item?.id ?? '')
        const label = String(item?.label ?? item?.name ?? value)
        if (value) {
          map[value] = label
          options.push({ label, value })
        }
      })
    } else if (raw && typeof raw === 'object') {
      Object.entries(raw).forEach(([value, label]) => {
        map[value] = String(label)
        options.push({ label: String(label), value })
      })
    }

    reviewTypeEnumMap.value = map
    reviewTypeFilterOptions.value = options
  } catch (error) {
    console.error('获取测评类型枚举失败:', error)
    reviewTypeEnumMap.value = {}
    reviewTypeFilterOptions.value = []
  }
}

async function refreshOrder(orderId: string | number, options?: HydrateOptions) {
  const target = allOrders.value.find(item => String(item.id) === String(orderId))
    || orders.value.find(item => String(item.id) === String(orderId))
    || (currentOrder.value && String(currentOrder.value.id) === String(orderId) ? currentOrder.value : null)
  if (!target) return null
  const updated = await hydrateOrder(target, options)
  mergeOrderState(updated)
  orders.value = [...allOrders.value]
  processListGroups()
  return updated
}

async function loadOrders() {
  const currentSeq = ++loadSeq.value
  const showTableLoading = !pageActionLoading.value
  if (showTableLoading) loading.value = true
  selectedRowKeys.value = []
  try {
    const [response] = await Promise.all([
      getReceiveList(buildParams()),
      loadFilterStatistics(),
    ])
    if (response.code !== 200) {
      message.error(response.msg || response.message || '获取接单列表失败')
      return
    }

    const list = Array.isArray(response.data?.list) ? response.data.list : []
    const mapped = list.map(normalizeListRow)
    if (currentSeq !== loadSeq.value) return

    allOrders.value = mapped
    orders.value = [...mapped]
    pagination.value.total = Number(response.data?.total || 0)
    processListGroups()
  } catch (error) {
    console.error('获取接单列表失败:', error)
    message.error('获取接单列表失败')
  } finally {
    if (showTableLoading && currentSeq === loadSeq.value) loading.value = false
  }
}

function handleTableChange(pag: any) {
  pagination.value.current = pag.current
  pagination.value.pageSize = pag.pageSize
  loadOrders()
}

async function runRowAction(task: () => Promise<void>) {
  if (pageActionLoading.value) return false
  pageActionLoading.value = true
  await nextTick()
  await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  try {
    await task()
    return true
  } finally {
    pageActionLoading.value = false
  }
}

async function viewDetail(record: any) {
  if (pageActionLoading.value) return
  currentOrder.value = { ...record, _detailFeedback: undefined }
  const opened = await runRowAction(async () => {
    const updated = await refreshOrder(record.id, { feedback: false, bill: !isMobile.value, detail: true })
    if (updated) currentOrder.value = updated
  })
  if (opened) drawerOpen.value = true
}

async function deleteOrder(id: string | number) {
  if (pageActionLoading.value) return
  await runRowAction(async () => {
    try {
      const response = await deleteReceive(id)
      if (response.code !== 200) throw new Error(response.msg || response.message || '删除失败')
      message.success('删除成功')
      await loadOrders()
    } catch (error: any) {
      message.error(error?.message || '删除失败')
    }
  })
}

async function openFeedbackModal(record: any) {
  if (pageActionLoading.value) return
  feedbackRecord.value = { ...record }
  const opened = await runRowAction(async () => {
    await refreshOrder(record.id, { feedback: true })
  })
  if (opened) feedbackModalOpen.value = true
}

async function handleFeedbackSave(id: string | number, payload: any) {
  feedbackSaving.value = true
  try {
    const response = await saveReceiveFeedback({
      task_id: Number(id),
      order_feedback_status: payload.order_feedback_status,
      order_feedback_date: payload.order_feedback_date || '',
      comment_feedback_status: payload.comment_feedback_status,
      comment_feedback_date: payload.comment_feedback_date || '',
      remark: payload.remark || '',
    })
    if (response.code !== 200) throw new Error(response.msg || response.message || '保存反馈失败')
    await refreshOrder(id, { feedback: true })
    feedbackModalOpen.value = false
    message.success('反馈状态已保存')
  } catch (error: any) {
    message.error(error?.message || '保存反馈失败')
  } finally {
    feedbackSaving.value = false
  }
}

async function openBillingDrawer(record: any) {
  if (pageActionLoading.value) return
  billingDrawerOrder.value = { ...record }
  const opened = await runRowAction(async () => {
    await refreshOrder(record.id, { bill: true })
  })
  if (opened) billingDrawerOpen.value = true
}

async function onBillingUpdated(payload: { id: string | number }) {
  const updated = await refreshOrder(payload.id, { bill: true })
  if (updated && billingDrawerOrder.value && String(billingDrawerOrder.value.id) === String(payload.id)) {
    billingDrawerOrder.value = { ...updated }
  }
  if (updated && currentOrder.value && String(currentOrder.value.id) === String(payload.id)) {
    currentOrder.value = { ...updated }
  }
}

async function openBatchEditFromSelection() {
  const selected = orders.value.filter(item => selectedRowKeys.value.includes(String(item.id)))
  if (!selected.length) {
    message.warning('请先选择要批量编辑的任务')
    return
  }

  const batchLabels = [...new Set(selected.map(item => item._batchLabel).filter(Boolean))]
  const customerNames = [...new Set(selected.map(item => item.customer?.name).filter(Boolean))]
  const customerContactNames = [...new Set(selected.map(item => getCustomerContactName(item)).filter(Boolean))]
  const employeeNames = [...new Set(selected.map(item => getBusinessCreatorName(item)).filter(Boolean))]
  const leadName = employeeNames[0] || customerNames[0] || '已选任务'
  const leadCustomerName = customerNames[0] || '已选客户'

  groupDetailData.value = {
    label: batchLabels.length === 1 ? batchLabels[0] : `${leadName} 批量编辑`,
    batch_number: batchLabels.length === 1 ? batchLabels[0] : `已选 ${selected.length} 单`,
    customer_name: customerNames.length === 1 ? customerNames[0] : `${leadCustomerName} 等${customerNames.length || 1}组`,
    employee_name: customerContactNames.length === 1 ? customerContactNames[0] : (customerContactNames[0] || ''),
    sales_person: '',
    batch_date: new Date().toISOString().slice(0, 10),
    order_count: selected.length,
  }
  groupDetailOrders.value = selected.map(order => ({ ...order }))
  groupBillData.value = null
  groupDetailModalOpen.value = true
  groupBillLoading.value = true
  try {
    const taskIds = selected.map(item => Number(item.id)).filter(id => Number.isFinite(id))
    const response = await postReceiveBatchBill(taskIds)
    if (response.code !== 200) throw new Error(response.msg || response.message || '获取批量账单失败')
    groupBillData.value = response.data
  } catch (error: any) {
    message.error(error?.message || '获取批量账单失败')
  } finally {
    groupBillLoading.value = false
  }
}

async function openCurrentTaskBill(record: any) {
  const taskId = Number(record?.id)
  if (!Number.isFinite(taskId)) {
    message.warning('未找到任务')
    return
  }
  groupDetailData.value = {
    label: record.task_basic?.task_basics_no || record.task_no,
    batch_number: record.task_basic?.task_basics_no || record.task_no,
    customer_name: record.customer?.name,
    employee_name: getCustomerContactName(record),
    sales_person: getBusinessCreatorName(record),
    batch_date: record.created_at ? String(record.created_at).slice(0, 10) : '',
    order_count: 1,
  }
  groupDetailOrders.value = [record]
  groupDetailModalOpen.value = true
  groupBillData.value = null
  groupBillLoading.value = true
  try {
    const response = await postReceiveBatchBill([taskId])
    if (response.code !== 200) throw new Error(response.msg || response.message || '获取任务组账单失败')
    groupBillData.value = response.data
  } catch (error: any) {
    message.error(error?.message || '获取任务组账单失败')
  } finally {
    groupBillLoading.value = false
  }
}

async function showGroupDetail(record: any) {
  const taskBasicId = record.task_basic?.id
  const sameGroup = taskBasicId
    ? allOrders.value.filter(item => item.task_basic?.id === taskBasicId)
    : []
  const orders = sameGroup.length ? sameGroup : [record]
  groupDetailData.value = {
    label: record.task_basic?.task_basics_no || record.task_no,
    batch_number: record.task_basic?.task_basics_no || record.task_no,
    customer_name: record.customer?.name,
    employee_name: getCustomerContactName(record),
    sales_person: getBusinessCreatorName(record),
    batch_date: record.created_at ? String(record.created_at).slice(0, 10) : '',
    order_count: orders.length,
  }
  groupDetailOrders.value = orders
  groupDetailModalOpen.value = true
  groupBillData.value = null
  groupBillLoading.value = true
  try {
    const taskIds = groupDetailOrders.value.map(item => Number(item.id)).filter(id => Number.isFinite(id))
    const response = await postReceiveBatchBill(taskIds)
    if (response.code !== 200) throw new Error(response.msg || response.message || '获取任务组账单失败')
    groupBillData.value = response.data
  } catch (error: any) {
    message.error(error?.message || '获取任务组账单失败')
  } finally {
    groupBillLoading.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    loadCountryOptions(),
    loadReviewTypeEnums(),
    loadCustomerFilterOptions(),
    loadBusinessFilterOptions(),
  ])
  await loadOrders()

})
</script>

<style scoped>
.desktop-query-field { display: contents; }
@media (max-width: 767px) {
  .mobile-readonly-page .card-panel { padding: 0; background: transparent; border: 0; }
  .mobile-readonly-page .toolbar.mobile-query-grid { display: grid; margin-bottom: 0; }
}

.page-content {
  padding: 24px;
  --eva-bg-container: var(--ant-color-bg-container, #fff);
  --eva-bg-soft: var(--ant-color-fill-quaternary, #fafafa);
  --eva-bg-muted: var(--ant-color-fill-tertiary, #f5f5f5);
  --eva-bg-primary-soft: var(--ant-color-primary-bg, #e6f4ff);
  --eva-bg-warning-soft: var(--ant-color-warning-bg, #fffbe6);
  --eva-bg-warning-hover: color-mix(in srgb, var(--ant-color-warning-bg, #fffbe6) 75%, var(--ant-color-bg-container, #fff));
  --eva-border: var(--ant-color-border, #d9d9d9);
  --eva-border-light: var(--ant-color-border-secondary, #f0f0f0);
  --eva-primary: var(--ant-color-primary, #1677ff);
  --eva-primary-hover: var(--ant-color-primary-hover, #4096ff);
  --eva-link: var(--ant-color-link, var(--ant-color-primary, #1677ff));
  --eva-link-hover: var(--ant-color-link-hover, var(--ant-color-primary-hover, #4096ff));
  --eva-success: var(--ant-color-success, #52c41a);
  --eva-warning: var(--ant-color-warning, #faad14);
  --eva-warning-border: var(--ant-color-warning-border, #ffe58f);
  --eva-error: var(--ant-color-error, #ff4d4f);
  --eva-text: var(--ant-color-text, rgba(0, 0, 0, 0.88));
  --eva-text-secondary: var(--ant-color-text-secondary, rgba(0, 0, 0, 0.65));
  --eva-text-tertiary: var(--ant-color-text-tertiary, rgba(0, 0, 0, 0.45));
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: var(--eva-text);
  line-height: 1.2;
  margin-bottom: 20px;
}

.page-subtitle {
  margin-top: 4px;
  font-size: 13px;
  color: var(--eva-text-secondary);
}

.card-panel {
  background: var(--eva-bg-container);
  border: 1px solid var(--eva-border-light);
  border-radius: 12px;
  padding: 16px;
}

.toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

:deep(.orders-pagination-total) {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  gap: 12px;
}

:deep(.filter-statistics-bar) {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 18px;
  min-width: 0;
  min-height: 32px;
}

:deep(.orders-pagination-count) {
  flex: none;
  white-space: nowrap;
}

:deep(.filter-stat-item) {
  display: inline-flex;
  align-items: baseline;
  gap: 6px;
  font-size: 14px;
}

:deep(.filter-stat-label) {
  color: var(--eva-text-tertiary, #9ca3af);
}

:deep(.filter-stat-val) {
  color: var(--eva-text, #1a1a2e);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.btn-inner {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.action-column-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  width: 100%;
  height: 24px;
  line-height: 24px;
  white-space: nowrap;
}

.action-column-title {
  display: inline-flex;
  align-items: center;
  height: 24px;
  line-height: 24px;
}

.column-setting-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 24px;
  padding: 0;
  line-height: 1;
  color: var(--eva-text-secondary);
}

.column-setting-trigger :deep(svg) {
  display: block;
}

.column-setting-trigger:hover {
  color: var(--eva-primary);
}

.column-setting-description {
  margin-bottom: 16px;
  color: var(--ant-color-text-secondary, rgba(0, 0, 0, 0.65));
}

.column-setting-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 20px;
  width: 100%;
}

.column-setting-grid :deep(.ant-checkbox-wrapper) {
  margin-inline-start: 0;
}

.column-setting-reset {
  margin-top: 18px;
  padding-inline: 0;
}

.order-number-link {
  color: var(--eva-link);
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  text-decoration: none;
  font-family: cursive;
}

.order-number-link:hover {
  color: var(--eva-link-hover);
  text-decoration: underline;
}

.product-cell {
  display: flex;
  align-items: center;
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.asin {
  font-weight: 600;
  font-size: 14px;
  color: var(--eva-link);
}

.product-name {
  color: var(--eva-text);
  font-size: 14px;
  line-height: 20px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.store {
  color: var(--eva-text-secondary);
  font-size: 11px;
  line-height: 16px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.order-types-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.type-qty-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.total-qty-badge {
  font-size: 14px;
  color: var(--eva-text);
  font-weight: 600;
  background: var(--eva-bg-muted);
  border-radius: 3px;
  padding: 1px 5px;
  margin-left: 4px;
}

.feedback-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.feedback-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.feedback-label {
  font-size: 14px;
  color: var(--eva-text-tertiary);
}

.billing-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.billing-row,
.debt-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.actual-received-amount-row {
  align-items: flex-start;
}

.actual-received-amount-values {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.billing-label {
  font-size: 14px;
  color: var(--eva-text-tertiary);
}

.basic-billing-under-received {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed var(--eva-border, #e5e7eb);
}

.billing-entry-pending {
  font-size: 13px;
  font-weight: 600;
  color: #dc2626;
}

.billing-entry-surplus {
  font-size: 13px;
  font-weight: 600;
  color: #059669;
}

.mobile-basic-billing {
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
}

.text-empty {
  color: var(--eva-text-tertiary);
  font-size: 13px;
}

.review-type-line {
  margin-bottom: 3px;
}

.notes-text {
  font-size: 14px;
  color: var(--eva-text-secondary);
  max-width: 130px;
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}

.sales-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--eva-text);
}

.business-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.business-wechat {
  max-width: 150px;
  overflow: hidden;
  color: var(--eva-text-secondary);
  font-size: 14px;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.customer-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.customer-name-cell {
  font-size: 14px;
  color: var(--eva-text);
}

.customer-meta-line {
  font-size: 14px;
  line-height: 20px;
  color: var(--eva-text-secondary);
}

.customer-meta-line.group {
  color: var(--eva-link);
}

.customer-group-name {
  font-size: 14px;
  color: var(--eva-link);
  font-weight: 500;
  display: block;
  line-height: 1.4;
}

.amount-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.amount-usd-part {
  display: flex;
  align-items: center;
  gap: 4px;
}

.amount-usd-tag {
  font-size: 14px;
  color: var(--eva-link);
  font-weight: 600;
  background: var(--eva-bg-primary-soft);
  border-radius: 3px;
  padding: 1px 5px;
}

.amount-cny-main {
  font-size: 13px;
  font-weight: 600;
  color: var(--eva-success);
}

.amount-extra-line {
  font-size: 14px;
  color: var(--eva-text-secondary);
  line-height: 1.3;
}

.amount-received {
  color: var(--eva-link);
}

/* 组首/组尾行与中间行统一 1px，避免中间分割线看起来变细 */
:deep(.ant-table-tbody > tr > td) {
  border-bottom: 1px solid var(--eva-border-light) !important;
}

:deep(.row-batch-first td) {
  border-top: 1px solid var(--eva-border-light) !important;
}

:deep(.row-batch-last td) {
  border-bottom: 1px solid var(--eva-border-light) !important;
}

:deep(.ant-table-pagination) {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  margin-block-start: 16px;
}

:deep(.ant-table-pagination .ant-pagination-total-text) {
  display: flex;
  flex: 1;
  align-items: center;
  min-width: 0;
  height: auto;
  margin-inline-end: 12px;
  line-height: normal;
}

.order-number-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.batch-bill-btn {
  font-size: 14px;
  padding: 0 6px;
  height: 24px;
  line-height: 24px;
  flex-shrink: 0;
  color: var(--eva-warning);
  border-color: var(--eva-warning-border);
  background: var(--eva-bg-warning-soft);
}

.batch-bill-btn:hover {
  color: var(--eva-warning) !important;
  border-color: var(--eva-warning-border) !important;
  background: var(--eva-bg-warning-hover) !important;
}

.order-number-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.order-bill-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--eva-text-secondary, #6b7280);
  font-size: 14px;
  cursor: pointer;
  flex-shrink: 0;
}

.order-bill-icon:hover {
  color: var(--eva-primary, #1677ff);
}

.batch-side-bar {
  width: 3px;
  height: 18px;
  border-radius: 2px;
  flex-shrink: 0;
  opacity: 0.85;
}

.action-cell {
  white-space: nowrap;
}

.action-cell :deep(.ant-btn-link) {
  padding-inline: 6px;
}

/*
 * 固定列悬停透明修正（仅本页）。
 * App.vue 的全局行悬停规则把 background 简写成半透明色，连固定列一起盖掉了 antd 给固定列的
 * 不透明底色，导致 sticky 的固定列能透出下面横向滚动的内容。
 * 这里把底色和悬停色拆开：background-color 铺不透明容器色，background-image 叠原来的半透明悬停色，
 * 最终观感与普通列一致。选择器要压过 App.vue 的 html body 前缀，故同样用 html body 起头。
 */
html body .page-content :deep(.ant-table-tbody > tr.ant-table-row:not(.ant-table-row-selected):hover > td.ant-table-cell-fix-left),
html body .page-content :deep(.ant-table-tbody > tr.ant-table-row:not(.ant-table-row-selected):hover > td.ant-table-cell-fix-right),
html body .page-content :deep(.ant-table-tbody > tr.ant-table-row:not(.ant-table-row-selected) > td.ant-table-cell-row-hover.ant-table-cell-fix-left),
html body .page-content :deep(.ant-table-tbody > tr.ant-table-row:not(.ant-table-row-selected) > td.ant-table-cell-row-hover.ant-table-cell-fix-right) {
  background-color: v-bind(tableFixedCellBg);
  background-image: linear-gradient(var(--app-table-row-hover-bg), var(--app-table-row-hover-bg));
}
</style>

<style>
/* 操作列悬停展开面板：overlay 由 a-dropdown teleport 到 body，样式必须写在非 scoped 块里 */
.order-action-dropdown .order-action-panel {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 6px;
  /* 底色与边框色由 :style 内联注入，见 actionPanelStyle */
  border: 1px solid transparent;
  border-radius: 6px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  white-space: nowrap;
}

.order-action-dropdown .order-action-panel .ant-btn-link {
  padding-inline: 6px;
}

/* 表格容器：用于实测可用宽度做等比缩放（李运侠 改，2026-08-31）
   min-width:0 必须保留，否则在 flex/grid 下会被内容撑开，量出的宽度失真 */
.table-wrap {
  width: 100%;
  min-width: 0;
}

.page-action-spin {
  display: block;
  width: 100%;
}
</style>
