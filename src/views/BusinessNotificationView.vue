<template>
  <div class="business-notification-view">
    <div class="page-header">
      <div>
        <h2 class="page-title">商务通知中心</h2>
        <p class="page-subtitle">集中查看需要商务反馈客户的任务、评论、售后和每日反馈通知</p>
      </div>
      <a-button :loading="loading" @click="loadTaskCompletedNotifications">刷新</a-button>
    </div>

    <a-tabs v-model:activeKey="activeType" class="notification-tabs">
      <a-tab-pane key="task-completed" tab="任务完成">
        <div class="table-actions">
          <span class="selected-hint">已选 {{ selectedRowKeys.length }} 条</span>
          <a-button type="primary" :disabled="!selectedRowKeys.length" @click="openBatchFeedbackModal">
            批量反馈
          </a-button>
        </div>
        <a-table
          :columns="taskCompletedColumns"
          :data-source="taskCompletedRows"
          :loading="loading"
          :pagination="{ pageSize: 20, showSizeChanger: true }"
          :row-class-name="getTaskRowClassName"
          :row-selection="rowSelection"
          row-key="id"
          size="small"
          bordered
          :scroll="{ x: 1800 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'created_at'">
              {{ formatDateTime(record.created_at) }}
            </template>

            <template v-else-if="column.key === 'image'">
              <a-image
                v-if="record.product_image"
                :src="record.product_image"
                :width="52"
                :height="52"
                class="product-image"
                :preview="false"
                referrerpolicy="no-referrer"
              />
              <div v-else class="image-placeholder">无图</div>
            </template>

            <template v-else-if="column.key === 'product_info'">
              <div class="product-info-cell copyable-cell" title="点击复制产品信息" @click="copyProductInfo(record)">
                <div class="product-name">{{ record.product_name || record.store_name || '-' }}</div>
                <div class="product-meta">ASIN：{{ record.asin || '-' }}</div>
                <div class="product-meta">任务ID：{{ record.order_number || record.id }}</div>
              </div>
            </template>

            <template v-else-if="column.key === 'type_level'">
              <div class="tag-stack">
                <template v-if="getOrderTypes(record).length">
                  <a-tag v-for="type in getOrderTypes(record)" :key="type" color="blue" size="small">{{ type }}</a-tag>
                </template>
                <a-tag v-if="record.review_level" color="purple" size="small">{{ record.review_level }}</a-tag>
                <span v-if="!getOrderTypes(record).length && !record.review_level" class="muted-text">-</span>
              </div>
            </template>

            <template v-else-if="column.key === 'total_orders'">
              {{ getTaskTotal(record) }} 单
            </template>

            <template v-else-if="column.key === 'message'">
              <div class="message-cell">
                <div class="message-main-row">
                  <a-tag :color="getTaskStatusTagColor(record)" size="small">{{ record.status }}</a-tag>
                  <span v-if="getActualDiffText(record)" class="message-actual">{{ getActualDiffText(record) }}</span>
                </div>
                <div
                  v-if="getPrincipalMessage(record)"
                  :class="['message-principal', `is-${getPrincipalMessage(record)?.type}`]"
                >
                  {{ getPrincipalMessage(record)?.text }}
                </div>
                <div v-if="getBatchProgressInfo(record)" class="message-batch">
                  <template v-if="hasBatchUnfinished(record)">
                    同批还有
                    <strong>{{ getBatchUnfinishedCount(record) }}</strong>
                    个任务未完成（共
                    <strong>{{ getBatchTotalCount(record) }}</strong>
                    个）
                  </template>
                  <template v-else>
                    此批任务都已完成
                  </template>
                </div>
              </div>
            </template>

            <template v-else-if="column.key === 'notes'">
              <a-input
                v-if="editingNotesId === record.id"
                v-model:value="editingNotesValue"
                size="small"
                :disabled="notesSaving"
                @blur="saveNotes(record)"
                @pressEnter="saveNotes(record)"
              />
              <span
                v-else
                class="notes-text editable-notes"
                title="点击编辑商务备注"
                @click="startEditNotes(record)"
              >
                {{ record.notes || record.task_notes || '-' }}
              </span>
            </template>

            <template v-else-if="column.key === 'push_time'">
              {{ formatDateTime(record.status_changed_at || record.updated_at) }}
            </template>

            <template v-else-if="column.key === 'sales_person'">
              {{ record.sales_person || record.business_manager_name || '-' }}
            </template>

            <template v-else-if="column.key === 'customer_name'">
              <span class="copyable-text" title="点击复制客户姓名" @click="copyText(record.customer_name || record.group_name || '-')">
                {{ record.customer_name || record.group_name || '-' }}
              </span>
            </template>

            <template v-else-if="column.key === 'action'">
              <a-space>
                <a-button type="link" size="small" @click="viewOrder(record)">查看订单</a-button>
                <a-button type="link" size="small" @click="openFeedbackModal(record)">反馈</a-button>
                <a-button size="small" :disabled="isMarked(record)" @click="markNotification(record)">
                  {{ isMarked(record) ? '已标记' : '标记' }}
                </a-button>
              </a-space>
            </template>
          </template>
        </a-table>
      </a-tab-pane>

      <a-tab-pane key="first-review" tab="首次评论反馈">
        <div class="table-actions">
          <span class="selected-hint">已选 {{ firstReviewSelectedRowKeys.length }} 条</span>
          <a-button type="primary" :disabled="!firstReviewSelectedRowKeys.length" @click="openFirstReviewBatchFeedbackModal">
            批量反馈
          </a-button>
        </div>
        <a-table
          :columns="firstReviewColumns"
          :data-source="firstReviewRows"
          :loading="loading"
          :pagination="{ pageSize: 20, showSizeChanger: true }"
          :row-class-name="getFirstReviewRowClassName"
          :row-selection="firstReviewRowSelection"
          row-key="id"
          size="small"
          bordered
          :scroll="{ x: 1780 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'created_at'">
              {{ formatDateTime(record.created_at) }}
            </template>

            <template v-else-if="column.key === 'image'">
              <a-image
                v-if="record.product_image"
                :src="record.product_image"
                :width="52"
                :height="52"
                class="product-image"
                :preview="false"
                referrerpolicy="no-referrer"
              />
              <div v-else class="image-placeholder">无图</div>
            </template>

            <template v-else-if="column.key === 'product_info'">
              <div class="product-info-cell copyable-cell" title="点击复制产品信息" @click="copyProductInfo(record)">
                <div class="product-name">{{ record.product_name || record.store_name || '-' }}</div>
                <div class="product-meta">ASIN：{{ record.asin || '-' }}</div>
                <div class="product-meta">任务ID：{{ record.order_number || record.id }}</div>
              </div>
            </template>

            <template v-else-if="column.key === 'type_level'">
              <div class="tag-stack">
                <template v-if="getOrderTypes(record).length">
                  <a-tag v-for="type in getOrderTypes(record)" :key="type" color="blue" size="small">{{ type }}</a-tag>
                </template>
                <a-tag v-if="record.review_level" color="purple" size="small">{{ record.review_level }}</a-tag>
                <span v-if="!getOrderTypes(record).length && !record.review_level" class="muted-text">-</span>
              </div>
            </template>

            <template v-else-if="column.key === 'review_progress'">
              <div class="review-progress-cell">
                <div class="review-progress-main">{{ Number(record._review_count || 0) }} / {{ getReviewTargetCount(record) }}</div>
                <div class="review-progress-sub">总单量 {{ getTaskTotal(record) }}</div>
              </div>
            </template>

            <template v-else-if="column.key === 'review_rate'">
              <a-tag color="green" size="small">{{ getReviewRate(record) }}%</a-tag>
            </template>

            <template v-else-if="column.key === 'notes'">
              <a-input
                v-if="editingNotesId === record.id"
                v-model:value="editingNotesValue"
                size="small"
                :disabled="notesSaving"
                @blur="saveNotes(record)"
                @pressEnter="saveNotes(record)"
              />
              <span
                v-else
                class="notes-text editable-notes"
                title="点击编辑商务备注"
                @click="startEditNotes(record)"
              >
                {{ record.notes || record.task_notes || '-' }}
              </span>
            </template>

            <template v-else-if="column.key === 'push_time'">
              {{ formatDateTime(record.updated_at || record.created_at) }}
            </template>

            <template v-else-if="column.key === 'sales_person'">
              {{ record.sales_person || record.business_manager_name || '-' }}
            </template>

            <template v-else-if="column.key === 'customer_name'">
              <span class="copyable-text" title="点击复制客户姓名" @click="copyText(record.customer_name || record.group_name || '-')">
                {{ record.customer_name || record.group_name || '-' }}
              </span>
            </template>

            <template v-else-if="column.key === 'seller_name'">
              <span class="copyable-text" title="点击复制卖家姓名" @click="copyText(getSellerName(record))">
                {{ getSellerName(record) }}
              </span>
            </template>

            <template v-else-if="column.key === 'action'">
              <a-space>
                <a-button type="link" size="small" @click="viewOrder(record)">查看订单</a-button>
                <a-button type="link" size="small" @click="openFeedbackModal(record)">反馈</a-button>
                <a-button size="small" :disabled="isMarked(record, 'first-review')" @click="markNotification(record, 'first-review')">
                  {{ isMarked(record, 'first-review') ? '已标记' : '标记' }}
                </a-button>
                <a-button type="link" size="small" @click="exportFirstReview(record)">导出</a-button>
              </a-space>
            </template>
          </template>
        </a-table>
      </a-tab-pane>
      <a-tab-pane key="new-review" tab="新增评论反馈">
        <a-table
          :columns="newReviewColumns"
          :data-source="newReviewRows"
          :loading="loading"
          :pagination="{ pageSize: 20, showSizeChanger: true }"
          :row-class-name="getNewReviewRowClassName"
          row-key="id"
          size="small"
          bordered
          :scroll="{ x: 1780 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'created_at'">
              {{ formatDateTime(record.created_at) }}
            </template>

            <template v-else-if="column.key === 'image'">
              <a-image
                v-if="record.product_image"
                :src="record.product_image"
                :width="52"
                :height="52"
                class="product-image"
                :preview="false"
                referrerpolicy="no-referrer"
              />
              <div v-else class="image-placeholder">无图</div>
            </template>

            <template v-else-if="column.key === 'product_info'">
              <div class="product-info-cell copyable-cell" title="点击复制产品信息" @click="copyProductInfo(record)">
                <div class="product-name">{{ record.product_name || record.store_name || '-' }}</div>
                <div class="product-meta">ASIN：{{ record.asin || '-' }}</div>
                <div class="product-meta">任务ID：{{ record.order_number || record.id }}</div>
              </div>
            </template>

            <template v-else-if="column.key === 'type_level'">
              <div class="tag-stack">
                <template v-if="getOrderTypes(record).length">
                  <a-tag v-for="type in getOrderTypes(record)" :key="type" color="blue" size="small">{{ type }}</a-tag>
                </template>
                <a-tag v-if="record.review_level" color="purple" size="small">{{ record.review_level }}</a-tag>
                <span v-if="!getOrderTypes(record).length && !record.review_level" class="muted-text">-</span>
              </div>
            </template>

            <template v-else-if="column.key === 'review_progress'">
              <div class="review-progress-cell">
                <div class="review-progress-main">{{ Number(record._review_count || 0) }} / {{ getReviewTargetCount(record) }}</div>
                <div class="review-progress-sub">总单量 {{ getTaskTotal(record) }}</div>
              </div>
            </template>

            <template v-else-if="column.key === 'review_rate'">
              <a-tag color="green" size="small">{{ getReviewRate(record) }}%</a-tag>
            </template>

            <template v-else-if="column.key === 'notes'">
              <a-input
                v-if="editingNotesId === record.id"
                v-model:value="editingNotesValue"
                size="small"
                :disabled="notesSaving"
                @blur="saveNotes(record)"
                @pressEnter="saveNotes(record)"
              />
              <span
                v-else
                class="notes-text editable-notes"
                title="点击编辑商务备注"
                @click="startEditNotes(record)"
              >
                {{ record.notes || record.task_notes || '-' }}
              </span>
            </template>

            <template v-else-if="column.key === 'push_time'">
              {{ formatDateTime(record.updated_at || record.created_at) }}
            </template>

            <template v-else-if="column.key === 'sales_person'">
              {{ record.sales_person || record.business_manager_name || '-' }}
            </template>

            <template v-else-if="column.key === 'customer_name'">
              <span class="copyable-text" title="点击复制客户姓名" @click="copyText(record.customer_name || record.group_name || '-')">
                {{ record.customer_name || record.group_name || '-' }}
              </span>
            </template>

            <template v-else-if="column.key === 'seller_name'">
              <span class="copyable-text" title="点击复制卖家姓名" @click="copyText(getSellerName(record))">
                {{ getSellerName(record) }}
              </span>
            </template>

            <template v-else-if="column.key === 'action'">
              <a-space>
                <a-button type="link" size="small" @click="copyNewReviewSummary(record)">复制</a-button>
                <a-button size="small" :disabled="isMarked(record, 'new-review')" @click="markNotification(record, 'new-review')">
                  {{ isMarked(record, 'new-review') ? '已标记' : '标记' }}
                </a-button>
              </a-space>
            </template>
          </template>
        </a-table>
      </a-tab-pane>
      <a-tab-pane key="after-sale" tab="售后订单">
        <a-table
          :columns="afterSaleColumns"
          :data-source="afterSaleRows"
          :loading="loading"
          :pagination="{ pageSize: 20, showSizeChanger: true }"
          :row-class-name="getAfterSaleRowClassName"
          row-key="id"
          size="small"
          bordered
          :scroll="{ x: 2040 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'created_at'">
              {{ formatDateTime(record.created_at) }}
            </template>

            <template v-else-if="column.key === 'image'">
              <a-image
                v-if="record.product_image"
                :src="record.product_image"
                :width="52"
                :height="52"
                class="product-image"
                :preview="false"
                referrerpolicy="no-referrer"
              />
              <div v-else class="image-placeholder">无图</div>
            </template>

            <template v-else-if="column.key === 'product_info'">
              <div class="product-info-cell copyable-cell" title="点击复制产品信息" @click="copyAfterSaleProductInfo(record)">
                <div class="product-name">{{ record.product_name || record.store_name || '-' }}</div>
                <div class="product-meta">ASIN：{{ record.asin || '-' }}</div>
                <div class="product-meta">问题单：{{ record.issue_number || record.id }}</div>
              </div>
            </template>

            <template v-else-if="column.key === 'type_level'">
              <div class="tag-stack">
                <a-tag v-if="record.issue_type" color="blue" size="small">{{ record.issue_type }}</a-tag>
                <a-tag v-if="record.review_level" color="purple" size="small">{{ record.review_level }}</a-tag>
                <span v-if="!record.issue_type && !record.review_level" class="muted-text">-</span>
              </div>
            </template>

            <template v-else-if="column.key === 'order_change'">
              <span class="order-change-text">{{ getAfterSaleOrderChangeText(record) }}</span>
            </template>

            <template v-else-if="column.key === 'after_sale_reason'">
              <a-tag color="orange" size="small">{{ getAfterSaleReason(record) }}</a-tag>
            </template>

            <template v-else-if="column.key === 'resolution_result'">
              <div class="info-stack-cell">
                <a-tag :color="getAfterSaleStatusColor(record.issue_status)" size="small">{{ getAfterSaleResultLabel(record) }}</a-tag>
                <span v-if="record.resolution_notes" class="muted-text">{{ record.resolution_notes }}</span>
              </div>
            </template>

            <template v-else-if="column.key === 'price_diff'">
              <span :class="getAfterSalePriceDiff(record) > 0 ? 'price-diff-danger' : 'muted-text'">
                {{ formatAfterSalePriceDiff(record) }}
              </span>
            </template>

            <template v-else-if="column.key === 'task_leftover'">
              <a-button type="link" size="small" @click="openAfterSaleDetail(record, 'task')">
                {{ getAfterSaleTaskLeftovers(record).length }} 条
              </a-button>
            </template>

            <template v-else-if="column.key === 'seller_leftover'">
              <a-button type="link" size="small" @click="openAfterSaleDetail(record, 'seller')">
                {{ getAfterSaleSellerLeftovers(record).length }} 条
              </a-button>
            </template>

            <template v-else-if="column.key === 'task_status'">
              <a-tag :color="getAfterSaleStatusColor(record.issue_status)" size="small">{{ record.issue_status || '-' }}</a-tag>
            </template>

            <template v-else-if="column.key === 'order_notes'">
              <span v-if="record.resolution_notes || record.description" class="notes-text">
                {{ record.resolution_notes || record.description }}
              </span>
              <span v-else class="muted-text">-</span>
            </template>

            <template v-else-if="column.key === 'push_time'">
              {{ formatDateTime(record.resolved_at || record.updated_at || record.created_at) }}
            </template>

            <template v-else-if="column.key === 'sales_person'">
              {{ record.business_manager_name || record.sales_person || '-' }}
            </template>

            <template v-else-if="column.key === 'customer_name'">
              <span class="copyable-text" title="点击复制客户姓名" @click="copyText(record.customer_name || record.group_name || '-')">
                {{ record.customer_name || record.group_name || '-' }}
              </span>
            </template>

            <template v-else-if="column.key === 'action'">
              <a-space>
                <a-button type="link" size="small" @click="copyAfterSaleSummary(record)">复制</a-button>
                <a-button size="small" :disabled="isMarked(record, 'after-sale')" @click="markNotification(record, 'after-sale')">
                  {{ isMarked(record, 'after-sale') ? '已标记' : '标记' }}
                </a-button>
              </a-space>
            </template>
          </template>
        </a-table>
      </a-tab-pane>
      <a-tab-pane key="daily-feedback" tab="每日反馈">
        <a-table
          :columns="dailyFeedbackColumns"
          :data-source="dailyFeedbackRows"
          :loading="loading"
          :pagination="{ pageSize: 20, showSizeChanger: true }"
          :row-class-name="getDailyFeedbackRowClassName"
          row-key="id"
          size="small"
          bordered
          :scroll="{ x: 1500 }"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'created_at'">
              {{ formatDateTime(record.created_at) }}
            </template>

            <template v-else-if="column.key === 'image'">
              <a-image
                v-if="record.product_image"
                :src="record.product_image"
                :width="52"
                :height="52"
                class="product-image"
                :preview="false"
                referrerpolicy="no-referrer"
              />
              <div v-else class="image-placeholder">无图</div>
            </template>

            <template v-else-if="column.key === 'product_info'">
              <div class="product-info-cell copyable-cell" title="点击复制产品信息" @click="copyProductInfo(record)">
                <div class="product-name">{{ record.product_name || record.store_name || '-' }}</div>
                <div class="product-meta">ASIN：{{ record.asin || '-' }}</div>
                <div class="product-meta">任务ID：{{ record.order_number || record.id }}</div>
              </div>
            </template>

            <template v-else-if="column.key === 'type_level'">
              <div class="tag-stack">
                <template v-if="getOrderTypes(record).length">
                  <a-tag v-for="type in getOrderTypes(record)" :key="type" color="blue" size="small">{{ type }}</a-tag>
                </template>
                <a-tag v-if="record.review_level" color="purple" size="small">{{ record.review_level }}</a-tag>
                <span v-if="!getOrderTypes(record).length && !record.review_level" class="muted-text">-</span>
              </div>
            </template>

            <template v-else-if="column.key === 'today_order_count'">
              <a-tag color="blue" size="small">{{ getTodayOrderedCount(record) }} 单</a-tag>
            </template>

            <template v-else-if="column.key === 'customer_name'">
              <span class="copyable-text" title="点击复制客户姓名" @click="copyText(record.customer_name || record.group_name || '-')">
                {{ record.customer_name || record.group_name || '-' }}
              </span>
            </template>

            <template v-else-if="column.key === 'notes'">
              <a-input
                v-if="editingNotesId === record.id"
                v-model:value="editingNotesValue"
                size="small"
                :disabled="notesSaving"
                @blur="saveNotes(record)"
                @pressEnter="saveNotes(record)"
              />
              <span
                v-else
                class="notes-text editable-notes"
                title="点击编辑商务备注"
                @click="startEditNotes(record)"
              >
                {{ record.notes || record.task_notes || '-' }}
              </span>
            </template>

            <template v-else-if="column.key === 'sales_person'">
              {{ record.sales_person || record.business_manager_name || '-' }}
            </template>

            <template v-else-if="column.key === 'push_time'">
              {{ formatDateTime(record.updated_at || record.created_at) }}
            </template>

            <template v-else-if="column.key === 'action'">
              <a-space>
                <a-button type="link" size="small" @click="viewTodayOrders(record)">查看订单</a-button>
                <a-button size="small" :disabled="isMarked(record, 'daily-feedback')" @click="markNotification(record, 'daily-feedback')">
                  {{ isMarked(record, 'daily-feedback') ? '已标记' : '标记' }}
                </a-button>
              </a-space>
            </template>
          </template>
        </a-table>
      </a-tab-pane>
    </a-tabs>

    <a-drawer
      v-model:open="subOrderDrawerOpen"
      :title="`${selectedTask?.order_number || selectedTask?.id || ''} 子订单数据`"
      width="1180px"
      destroy-on-close
    >
      <template #extra>
        <a-button type="primary" :disabled="!selectedTask" @click="openCopyModal">复制</a-button>
      </template>
      <a-table
        :columns="subColumns"
        :data-source="subOrderRows"
        :loading="subOrderLoading"
        :pagination="false"
        row-key="id"
        size="small"
        bordered
        :scroll="{ x: 1900 }"
      >
        <template #bodyCell="{ column, record: sub }">
          <template v-if="column.key === 'sub_no'">
            <span class="sub-no copyable-text" title="点击复制子订单ID" @click="copyText(sub.sub_order_number || '-')">
              {{ sub.sub_order_number || '-' }}
            </span>
          </template>

          <template v-else-if="column.key === 'sub_asin'">
            <span class="asin-code copyable-text" title="点击复制 ASIN" @click="copyText(sub.asin || '-')">{{ sub.asin || '-' }}</span>
          </template>

          <template v-else-if="column.key === 'sub_scheduled'">
            <span v-if="sub.scheduled_date">{{ sub.scheduled_date }}</span>
            <span v-else class="muted-text">-</span>
          </template>

          <template v-else-if="column.key === 'sub_type_level'">
            <div class="tag-stack">
              <a-tag v-if="formatReviewType(sub.review_type || sub.order_type)" :color="getOrderTypeTagColor(sub.review_type || sub.order_type)" size="small">
                {{ formatReviewType(sub.review_type || sub.order_type) }}
              </a-tag>
              <a-tag v-if="sub.review_level" :color="getReviewLevelTagColor(sub.review_level)" size="small">
                {{ sub.review_level }}
              </a-tag>
              <span v-if="!formatReviewType(sub.review_type || sub.order_type) && !sub.review_level" class="muted-text">-</span>
            </div>
          </template>

          <template v-else-if="column.key === 'sub_keyword'">
            <a-tag v-if="sub.keyword_type === 'link'" color="cyan" size="small">链接</a-tag>
            <span v-else-if="sub.keyword" class="keyword-tag copyable-text" title="点击复制关键词" @click="copyText(sub.keyword)">{{ sub.keyword }}</span>
            <span v-else class="muted-text">-</span>
          </template>

          <template v-else-if="column.key === 'sub_staff_buyer'">
            <div class="info-stack-cell">
              <div><span class="info-stack-label">业务员</span>{{ sub.staff_name || '未分配' }}</div>
              <div><span class="info-stack-label">买手</span>{{ sub.buyer_name || '-' }}</div>
            </div>
          </template>

          <template v-else-if="column.key === 'sub_order_upload'">
            <div class="info-stack-cell">
              <div>
                <span class="info-stack-label">订单号</span>
                <span
                  v-if="sub.amazon_order_id"
                  class="order-num-sm copyable-text"
                  title="点击复制订单号"
                  @click="copyText(sub.amazon_order_id)"
                >{{ sub.amazon_order_id }}</span>
                <span v-else class="muted-text">-</span>
              </div>
              <div><span class="info-stack-label">上传</span>{{ fmtTime(getSubUploadTime(sub)) }}</div>
            </div>
          </template>

          <template v-else-if="column.key === 'sub_price_paid_refund'">
            <div class="price-pair-cell">
              <div><span class="price-pair-label">售价</span><span class="price-text">${{ Number(sub.product_price || 0).toFixed(2) }}</span></div>
              <div><span class="price-pair-label">实付</span><span v-if="sub.actual_paid != null" class="price-text">${{ Number(sub.actual_paid).toFixed(2) }}</span><span v-else class="muted-text">-</span></div>
              <div><span class="price-pair-label">实返</span><span v-if="sub.refund_amount != null" class="refund-amount">¥{{ Number(sub.refund_amount).toFixed(2) }}</span><span v-else class="muted-text">-</span></div>
            </div>
          </template>

          <template v-else-if="column.key === 'sub_refund_info'">
            <div class="refund-status-cell">
              <a-tag v-if="normalizeRefundStatus(sub.refund_status)" :color="getRefundStatusTagColor(sub.refund_status)" size="small">
                {{ normalizeRefundStatus(sub.refund_status) }}
              </a-tag>
              <span v-else class="muted-text">-</span>
              <span v-if="sub.refund_method" class="refund-method-tag">方式：{{ sub.refund_method }}</span>
              <span v-if="showPrincipalLossHint(sub)" class="principal-loss-hint">本金损失</span>
            </div>
          </template>

          <template v-else-if="column.key === 'sub_progress'">
            <a-tag :color="getSubStatusColor(getSubProgressLabel(sub))" size="small">{{ getSubProgressLabel(sub) }}</a-tag>
          </template>

          <template v-else-if="column.key === 'sub_review_fb'">
            <div class="review-fb-cell">
              <a
                v-for="item in getSubReviewFbItems(sub)"
                :key="item.label"
                :href="item.url"
                target="_blank"
                rel="noopener noreferrer"
                :class="['review-fb-link', `is-${item.type}`]"
              >
                {{ item.label }}
              </a>
            </div>
          </template>

          <template v-else-if="column.key === 'sub_order_status'">
            <a-tag :color="getSubOrderStatusColor(sub.order_status)" size="small">{{ sub.order_status || '正常' }}</a-tag>
          </template>

          <template v-else-if="column.key === 'sub_notes'">
            <span v-if="getSubRemark(sub)" class="notes-text" :title="getSubRemark(sub)">{{ getSubRemark(sub) }}</span>
            <span v-else class="muted-text">-</span>
          </template>
        </template>
      </a-table>
    </a-drawer>

    <a-modal
      v-model:open="feedbackModalOpen"
      title="编辑反馈状态"
      :confirm-loading="feedbackSaving"
      ok-text="保存"
      cancel-text="取消"
      width="520px"
      @ok="saveFeedback"
    >
      <div class="feedback-form">
        <div class="feedback-field">
          <label class="feedback-form-label">订单反馈</label>
          <a-radio-group v-model:value="feedbackForm.order_feedback_status" @change="handleOrderFeedbackStatusChange">
            <a-radio-button value="未反馈">未反馈</a-radio-button>
            <a-radio-button value="已反馈">已反馈</a-radio-button>
          </a-radio-group>
          <div v-if="feedbackForm.order_feedback_status === '已反馈'" class="feedback-date-field">
            <label class="feedback-date-label">反馈日期</label>
            <a-date-picker
              v-model:value="feedbackForm.order_feedback_date_picker"
              style="width:100%"
              placeholder="选择订单反馈日期"
              value-format="YYYY-MM-DD"
            />
          </div>
        </div>
        <div class="feedback-field">
          <label class="feedback-form-label">评论反馈</label>
          <a-radio-group v-model:value="feedbackForm.review_feedback_status" @change="handleReviewFeedbackStatusChange">
            <a-radio-button value="未反馈">未反馈</a-radio-button>
            <a-radio-button value="已反馈">已反馈</a-radio-button>
          </a-radio-group>
          <div v-if="feedbackForm.review_feedback_status === '已反馈'" class="feedback-date-field">
            <label class="feedback-date-label">反馈日期</label>
            <a-date-picker
              v-model:value="feedbackForm.review_feedback_date_picker"
              style="width:100%"
              placeholder="选择评论反馈日期"
              value-format="YYYY-MM-DD"
            />
          </div>
        </div>
      </div>
    </a-modal>

    <a-modal
      v-model:open="copyModalOpen"
      title="复制任务信息"
      width="560px"
      ok-text="复制到剪贴板"
      cancel-text="取消"
      @ok="doConfirmCopy"
    >
      <div class="copy-modal-body">
        <div class="copy-fields-label">选择要复制的字段：</div>
        <a-checkbox-group v-model:value="copyCheckedFields" class="copy-checkbox-group">
          <div v-for="group in copyFieldGroups" :key="group.title" class="copy-field-group">
            <div class="copy-field-group-title">{{ group.title }}</div>
            <a-row :gutter="[8, 8]">
              <a-col v-for="field in group.fields" :key="field.key" :span="12">
                <a-checkbox :value="field.key">{{ field.label }}</a-checkbox>
              </a-col>
            </a-row>
          </div>
        </a-checkbox-group>
      </div>
    </a-modal>

    <a-modal
      v-model:open="afterSaleDetailModalOpen"
      :title="afterSaleDetailTitle"
      width="1180px"
      :footer="null"
    >
      <a-table
        :columns="afterSaleDetailColumns"
        :data-source="afterSaleDetailRows"
        :pagination="false"
        row-key="key"
        size="small"
        bordered
        :scroll="{ x: 1680 }"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'sub_order_id'">
            <span class="sub-no copyable-text" title="点击复制子订单ID" @click="copyText(record.sub_order_id)">
              {{ record.sub_order_id || '-' }}
            </span>
          </template>

          <template v-else-if="column.key === 'placed_at'">
            {{ formatDateTime(record.placed_at) }}
          </template>

          <template v-else-if="column.key === 'inbound_time'">
            {{ formatDateTime(record.inbound_time) }}
          </template>

          <template v-else-if="column.key === 'product_info'">
            <div class="product-info-cell">
              <div class="product-name">{{ record.product_name || '-' }}</div>
              <div class="product-meta">ASIN：{{ record.asin || '-' }}</div>
            </div>
          </template>

          <template v-else-if="column.key === 'type_level'">
            <div class="tag-stack">
              <a-tag v-if="record.review_type" color="blue" size="small">{{ record.review_type }}</a-tag>
              <a-tag v-if="record.review_level" color="purple" size="small">{{ record.review_level }}</a-tag>
              <span v-if="!record.review_type && !record.review_level" class="muted-text">-</span>
            </div>
          </template>

          <template v-else-if="column.key === 'staff_buyer'">
            <div class="info-stack-cell">
              <div><span class="info-stack-label">业务员</span>{{ record.staff_name || '-' }}</div>
              <div><span class="info-stack-label">买手</span>{{ record.buyer_name || '-' }}</div>
            </div>
          </template>

          <template v-else-if="column.key === 'order_number'">
            <span class="order-num-sm copyable-text" title="点击复制订单号" @click="copyText(record.order_number)">
              {{ record.order_number || '-' }}
            </span>
          </template>

          <template v-else-if="column.key === 'price_paid_refund'">
            <div class="price-pair-cell">
              <div><span class="price-pair-label">售价</span><span class="price-text">{{ formatMoney(record.product_price, '$') }}</span></div>
              <div><span class="price-pair-label">实付</span><span class="price-text">{{ formatMoney(record.actual_paid, '$') }}</span></div>
              <div><span class="price-pair-label">实返</span><span class="refund-amount">{{ formatMoney(record.refund_amount, '¥') }}</span></div>
            </div>
          </template>

          <template v-else-if="column.key === 'refund_status'">
            <a-tag v-if="record.refund_status" :color="getRefundStatusTagColor(record.refund_status)" size="small">
              {{ normalizeRefundStatus(record.refund_status) }}
            </a-tag>
            <span v-else class="muted-text">-</span>
          </template>

          <template v-else-if="column.key === 'after_sale_reason'">
            <a-tag color="orange" size="small">{{ record.after_sale_reason || '-' }}</a-tag>
          </template>

          <template v-else-if="column.key === 'remark'">
            <span class="notes-text">{{ record.remark || '-' }}</span>
          </template>
        </template>
      </a-table>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { message } from 'ant-design-vue'
import { supabase } from '../lib/supabase'

type TaskCompletedRow = Record<string, any> & {
  id: string
  status?: string
  order_number?: string
  product_image?: string
  product_name?: string
  store_name?: string
  brand_name?: string
  asin?: string
  country?: string
  category?: string
  product_price?: number
  review_type?: string
  order_type?: string
  order_types?: string[]
  review_level?: string
  order_quantity?: number
  total_orders?: number
  debt_status?: string
  debt_amount?: number
  notes?: string
  task_notes?: string
  sales_person?: string
  business_manager_name?: string
  customer_name?: string
  group_name?: string
  status_changed_at?: string
  updated_at?: string
  created_at?: string
  _ordered_count?: number
  _review_count?: number
  _sub_total?: number
  _today_ordered_count?: number
  _batch_total?: number
  _batch_unfinished?: number
  order_feedback_status?: string
  order_feedback_date?: string
  review_feedback_status?: string
  review_feedback_date?: string
  seller_name?: string
  seller?: string
  _mock_sub_orders?: any[]
}

type AfterSaleRow = Record<string, any> & {
  id: string
  issue_number?: string
  issue_type?: string
  issue_status?: string
  sub_order_number?: string
  order_number?: string
  old_amazon_order_id?: string
  new_amazon_order_id?: string
  replacement_sub_order_number?: string
  replacement_buyer_name?: string
  asin?: string
  country?: string
  product_image?: string
  product_name?: string
  store_name?: string
  review_level?: string
  product_price?: number
  profit_diff?: number
  principal_amount?: number
  loss_amount?: number
  description?: string
  resolution_notes?: string
  business_manager_name?: string
  sales_person?: string
  customer_name?: string
  group_name?: string
  initial_issue_status?: string
  after_sale_reason?: string
  buyer_name?: string
  staff_name?: string
  amazon_order_placed_at?: string
  actual_paid?: number
  refund_amount?: number
  refund_status?: string
  refund_method?: string
  created_at?: string
  updated_at?: string
  resolved_at?: string
  _task_leftovers?: any[]
  _seller_leftovers?: any[]
}

type FeedbackForm = {
  order_feedback_status: string
  order_feedback_date_picker: string | null
  review_feedback_status: string
  review_feedback_date_picker: string | null
}

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const taskCompletedRowsRaw = ref<TaskCompletedRow[]>([])
const firstReviewRowsRaw = ref<TaskCompletedRow[]>([])
const afterSaleRowsRaw = ref<AfterSaleRow[]>([])
const markedId = ref<string>(loadMarkedId())
const selectedRowKeys = ref<string[]>([])
const firstReviewSelectedRowKeys = ref<string[]>([])
const subOrderDrawerOpen = ref(false)
const subOrderLoading = ref(false)
const subOrderRows = ref<any[]>([])
const selectedTask = ref<TaskCompletedRow | null>(null)
const feedbackModalOpen = ref(false)
const feedbackSaving = ref(false)
const feedbackTargetIds = ref<string[]>([])
const feedbackForm = ref<FeedbackForm>({
  order_feedback_status: '未反馈',
  order_feedback_date_picker: null,
  review_feedback_status: '未反馈',
  review_feedback_date_picker: null,
})
const editingNotesId = ref('')
const editingNotesValue = ref('')
const notesSaving = ref(false)
const copyModalOpen = ref(false)
const copyCheckedFields = ref<string[]>(['asin', 'order_number'])
const afterSaleDetailModalOpen = ref(false)
const afterSaleDetailTitle = ref('')
const afterSaleDetailRows = ref<any[]>([])

const copyFieldGroups = [
  {
    title: '任务信息',
    fields: [
      { key: 'asin', label: 'ASIN' },
      { key: 'product_price', label: '产品售价' },
      { key: 'store_name', label: '店铺名称' },
      { key: 'brand_name', label: '品牌名称' },
      { key: 'review_type', label: '类型' },
      { key: 'review_level', label: '等级' },
      { key: 'category', label: '类目' },
      { key: 'country', label: '国家' },
      { key: 'customer_name', label: '客户名称' },
      { key: 'created_at', label: '创建时间' },
      { key: 'status', label: '任务状态' },
    ],
  },
  {
    title: '执行信息',
    fields: [
      { key: 'product_name', label: '产品名称' },
      { key: 'order_number', label: '订单号' },
      { key: 'actual_paid', label: '实付金额' },
      { key: 'price_diff', label: '差价' },
      { key: 'placed_at', label: '下单时间' },
      { key: 'review_link', label: '评论链接' },
    ],
  },
]

const activeType = computed({
  get: () => String(route.query.type || 'task-completed'),
  set: value => {
    router.replace({ name: 'business-notifications', query: { type: value } })
  },
})

const taskCompletedRows = computed(() => {
  const mockRows = appendBatchStats(mockTaskCompletedSourceRows).filter(row => isTerminalTaskStatus(row.status))
  const rows = taskCompletedRowsRaw.value.length
    ? [...taskCompletedRowsRaw.value, ...mockRows]
    : mockRows
  return [...rows].sort((a, b) => {
    const aTime = dayjs(a.status_changed_at || a.updated_at || a.created_at).valueOf()
    const bTime = dayjs(b.status_changed_at || b.updated_at || b.created_at).valueOf()
    return bTime - aTime
  })
})

const firstReviewRows = computed(() => {
  const realRows = [...firstReviewRowsRaw.value]
    .filter(row => getReviewRate(row) >= 70 && row.review_feedback_status !== '已反馈')
    .sort((a, b) => {
      const aTime = dayjs(a.updated_at || a.created_at).valueOf()
      const bTime = dayjs(b.updated_at || b.created_at).valueOf()
      return bTime - aTime
    })
  return realRows.length ? realRows : mockFirstReviewRows
})

const newReviewRows = computed(() => {
  const realRows = [...firstReviewRowsRaw.value]
    .filter(row => getReviewRate(row) >= 70 && row.review_feedback_status === '已反馈')
    .sort((a, b) => {
      const aTime = dayjs(a.updated_at || a.created_at).valueOf()
      const bTime = dayjs(b.updated_at || b.created_at).valueOf()
      return bTime - aTime
    })
  return realRows.length ? realRows : mockNewReviewRows
})

const afterSaleRows = computed(() => {
  const realRows = [...afterSaleRowsRaw.value]
    .filter(row => isHandledAfterSale(row))
    .sort((a, b) => {
      const aTime = dayjs(a.resolved_at || a.updated_at || a.created_at).valueOf()
      const bTime = dayjs(b.resolved_at || b.updated_at || b.created_at).valueOf()
      return bTime - aTime
    })
  return realRows.length ? realRows : mockAfterSaleRows
})

const dailyFeedbackRows = computed(() => {
  const realRows = [...firstReviewRowsRaw.value]
    .filter(row => isDailyFeedbackTask(row))
    .filter(row => !['已完成', '已完结', '已截单'].includes(String(row.status || '').trim()))
    .sort((a, b) => {
      const aTime = dayjs(a.updated_at || a.created_at).valueOf()
      const bTime = dayjs(b.updated_at || b.created_at).valueOf()
      return bTime - aTime
    })
  return realRows.length ? realRows : mockDailyFeedbackRows
})

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: string[]) => {
    selectedRowKeys.value = keys
  },
}))

const firstReviewRowSelection = computed(() => ({
  selectedRowKeys: firstReviewSelectedRowKeys.value,
  onChange: (keys: string[]) => {
    firstReviewSelectedRowKeys.value = keys
  },
}))

const taskCompletedColumns = [
  { title: '创建时间', key: 'created_at', width: 120 },
  { title: '图片', key: 'image', width: 80 },
  { title: '国家', dataIndex: 'country', key: 'country', width: 80 },
  { title: '产品信息', key: 'product_info', width: 260 },
  { title: '类型 / 等级', key: 'type_level', width: 150 },
  { title: '总单量', key: 'total_orders', width: 90 },
  { title: '消息内容', key: 'message', width: 420 },
  { title: '客户姓名', key: 'customer_name', width: 140 },
  { title: '商务备注', key: 'notes', width: 180 },
  { title: '商务', key: 'sales_person', width: 110 },
  { title: '推送时间', key: 'push_time', width: 120 },
  { title: '操作', key: 'action', width: 210, fixed: 'right' as const },
]

const firstReviewColumns = [
  { title: '创建时间', key: 'created_at', width: 120 },
  { title: '图片', key: 'image', width: 80 },
  { title: '国家', dataIndex: 'country', key: 'country', width: 80 },
  { title: '产品信息', key: 'product_info', width: 260 },
  { title: '类型 / 等级', key: 'type_level', width: 150 },
  { title: '评论进度', key: 'review_progress', width: 110 },
  { title: '留评率', key: 'review_rate', width: 90 },
  { title: '客户姓名', key: 'customer_name', width: 140 },
  { title: '商务备注', key: 'notes', width: 180 },
  { title: '商务', key: 'sales_person', width: 110 },
  { title: '推送时间', key: 'push_time', width: 120 },
  { title: '操作', key: 'action', width: 240, fixed: 'right' as const },
]

const newReviewColumns = [
  { title: '下单时间', key: 'created_at', width: 120 },
  { title: '图片', key: 'image', width: 80 },
  { title: '国家', dataIndex: 'country', key: 'country', width: 80 },
  { title: '产品信息', key: 'product_info', width: 260 },
  { title: '类型 / 等级', key: 'type_level', width: 150 },
  { title: '评论进度', key: 'review_progress', width: 110 },
  { title: '留评率', key: 'review_rate', width: 90 },
  { title: '客户姓名', key: 'customer_name', width: 140 },
  { title: '商务备注', key: 'notes', width: 180 },
  { title: '商务', key: 'sales_person', width: 110 },
  { title: '推送时间', key: 'push_time', width: 120 },
  { title: '操作', key: 'action', width: 210, fixed: 'right' as const },
]

const afterSaleColumns = [
  { title: '创建时间', key: 'created_at', width: 120 },
  { title: '图片', key: 'image', width: 80 },
  { title: '国家', dataIndex: 'country', key: 'country', width: 80 },
  { title: '产品信息', key: 'product_info', width: 240 },
  { title: '类型 / 等级', key: 'type_level', width: 130 },
  { title: '转售后原因', key: 'after_sale_reason', width: 120 },
  { title: '处理结果', key: 'resolution_result', width: 190 },
  { title: '单号修改', key: 'order_change', width: 220 },
  { title: '差价', key: 'price_diff', width: 90 },
  { title: '任务遗留单', key: 'task_leftover', width: 100 },
  { title: '客户遗留单', key: 'seller_leftover', width: 100 },
  { title: '任务状态', key: 'task_status', width: 110 },
  { title: '订单备注', key: 'order_notes', width: 180 },
  { title: '客户姓名', key: 'customer_name', width: 140 },
  { title: '商务', key: 'sales_person', width: 110 },
  { title: '推送时间', key: 'push_time', width: 120 },
  { title: '操作', key: 'action', width: 150, fixed: 'right' as const },
]

const afterSaleDetailColumns = [
  { title: '子订单ID', key: 'sub_order_id', width: 150 },
  { title: '入库时间', key: 'inbound_time', width: 120 },
  { title: '转售后原因', key: 'after_sale_reason', width: 120 },
  { title: '卖家', dataIndex: 'seller_name', key: 'seller_name', width: 120 },
  { title: '产品信息', key: 'product_info', width: 220 },
  { title: '类型 / 等级', key: 'type_level', width: 120 },
  { title: '业务员 / 买手', key: 'staff_buyer', width: 145 },
  { title: '下单时间', key: 'placed_at', width: 120 },
  { title: '订单号', key: 'order_number', width: 180 },
  { title: '售价 / 实付 / 实返', key: 'price_paid_refund', width: 150 },
  { title: '返款状态', key: 'refund_status', width: 110 },
  { title: '订单备注', key: 'remark', width: 180 },
]

const dailyFeedbackColumns = [
  { title: '创建时间', key: 'created_at', width: 120 },
  { title: '图片', key: 'image', width: 80 },
  { title: '国家', dataIndex: 'country', key: 'country', width: 80 },
  { title: '产品信息', key: 'product_info', width: 260 },
  { title: '类型 / 等级', key: 'type_level', width: 150 },
  { title: '今日下单量', key: 'today_order_count', width: 110 },
  { title: '客户姓名', key: 'customer_name', width: 140 },
  { title: '商务备注', key: 'notes', width: 180 },
  { title: '商务', key: 'sales_person', width: 110 },
  { title: '推送时间', key: 'push_time', width: 120 },
  { title: '操作', key: 'action', width: 160, fixed: 'right' as const },
]

const mockTaskCompletedSourceRows: TaskCompletedRow[] = [
  {
    id: 'mock-task-completed-001',
    order_number: 'MOCK-TC-20260703-001',
    batch_number: 'MOCK-BATCH-20260703-01',
    product_image: 'https://picsum.photos/seed/task-completed-001/120/120',
    product_name: 'Insulated Travel Mug',
    store_name: 'NorthPeak Home',
    asin: 'B0MOCKTC001',
    country: '美国',
    order_type: '文字评',
    review_level: '普通',
    order_quantity: 5,
    status: '已完成',
    sales_person: '陈婷',
    customer_name: '深圳云帆科技',
    notes: '完成后待反馈客户同批进度',
    created_at: dayjs().subtract(5, 'day').hour(10).minute(12).toISOString(),
    updated_at: dayjs().hour(11).minute(20).toISOString(),
    _ordered_count: 5,
  },
  {
    id: 'mock-task-completed-002',
    order_number: 'MOCK-TC-20260703-002',
    batch_number: 'MOCK-BATCH-20260703-01',
    product_image: 'https://picsum.photos/seed/task-completed-002/120/120',
    product_name: 'Cable Organizer Box',
    store_name: 'DeskPro',
    asin: 'B0MOCKTC002',
    country: '美国',
    order_type: '图片评',
    review_level: '高等',
    order_quantity: 5,
    status: '已截单',
    debt_status: 'owed',
    debt_amount: 18.2,
    sales_person: '陈婷',
    customer_name: '深圳云帆科技',
    notes: '截单后需要同步补本金',
    created_at: dayjs().subtract(4, 'day').hour(15).minute(5).toISOString(),
    updated_at: dayjs().hour(10).minute(45).toISOString(),
    _ordered_count: 3,
  },
  {
    id: 'mock-task-completed-007',
    order_number: 'MOCK-TC-20260703-007',
    batch_number: 'MOCK-BATCH-20260703-01',
    product_image: 'https://picsum.photos/seed/task-completed-007/120/120',
    product_name: 'Wireless Desk Charger',
    store_name: 'DeskPro',
    asin: 'B0MOCKTC007',
    country: '美国',
    order_type: '视频评',
    review_level: '极高等',
    order_quantity: 8,
    status: '已完成',
    debt_status: 'owed',
    debt_amount: 12.75,
    sales_person: '陈婷',
    customer_name: '深圳云帆科技',
    notes: '实做少于总单量，同时需要客户补本金',
    created_at: dayjs().subtract(4, 'day').hour(16).minute(25).toISOString(),
    updated_at: dayjs().hour(10).minute(18).toISOString(),
    _ordered_count: 6,
  },
  {
    id: 'mock-task-completed-003',
    order_number: 'MOCK-TC-20260703-003',
    batch_number: 'MOCK-BATCH-20260703-01',
    product_image: 'https://picsum.photos/seed/task-completed-003/120/120',
    product_name: 'Laptop Stand',
    store_name: 'DeskPro',
    asin: 'B0MOCKTC003',
    country: '美国',
    order_type: '免评',
    review_level: '普通',
    order_quantity: 2,
    status: '进行中',
    sales_person: '陈婷',
    customer_name: '深圳云帆科技',
    created_at: dayjs().subtract(3, 'day').hour(9).minute(20).toISOString(),
    updated_at: dayjs().subtract(1, 'hour').toISOString(),
    _ordered_count: 1,
  },
  {
    id: 'mock-task-completed-004',
    order_number: 'MOCK-TC-20260703-004',
    batch_number: 'MOCK-BATCH-20260703-01',
    product_image: 'https://picsum.photos/seed/task-completed-004/120/120',
    product_name: 'Monitor Light Bar',
    store_name: 'DeskPro',
    asin: 'B0MOCKTC004',
    country: '美国',
    order_type: '文字评',
    review_level: '普通',
    order_quantity: 3,
    status: '已下单',
    sales_person: '陈婷',
    customer_name: '深圳云帆科技',
    created_at: dayjs().subtract(2, 'day').hour(14).minute(16).toISOString(),
    updated_at: dayjs().subtract(2, 'hour').toISOString(),
    _ordered_count: 2,
  },
  {
    id: 'mock-task-completed-005',
    order_number: 'MOCK-TC-20260703-005',
    batch_number: 'MOCK-BATCH-20260703-02',
    product_image: 'https://picsum.photos/seed/task-completed-005/120/120',
    product_name: 'Kitchen Storage Rack',
    store_name: 'EuroHome',
    asin: 'B0MOCKTC005',
    country: '德国',
    order_type: '视频评',
    review_level: '高等',
    order_quantity: 4,
    status: '已完成',
    debt_status: 'surplus',
    debt_amount: 6.5,
    sales_person: '刘洋',
    customer_name: '杭州欧品贸易',
    notes: '同批最后一个任务完成',
    created_at: dayjs().subtract(6, 'day').hour(13).minute(35).toISOString(),
    updated_at: dayjs().hour(9).minute(30).toISOString(),
    _ordered_count: 4,
  },
  {
    id: 'mock-task-completed-006',
    order_number: 'MOCK-TC-20260703-006',
    batch_number: 'MOCK-BATCH-20260703-02',
    product_image: 'https://picsum.photos/seed/task-completed-006/120/120',
    product_name: 'Sink Organizer',
    store_name: 'EuroHome',
    asin: 'B0MOCKTC006',
    country: '德国',
    order_type: '文字评',
    review_level: '普通',
    order_quantity: 2,
    status: '已完成',
    sales_person: '刘洋',
    customer_name: '杭州欧品贸易',
    notes: '实做单量大于总单量，确认后同步客户',
    created_at: dayjs().subtract(7, 'day').hour(11).minute(6).toISOString(),
    updated_at: dayjs().subtract(1, 'day').hour(17).minute(8).toISOString(),
    _ordered_count: 3,
  },
  {
    id: 'mock-task-completed-008',
    order_number: 'MOCK-TC-20260703-008',
    batch_number: 'MOCK-BATCH-20260703-03',
    product_image: 'https://picsum.photos/seed/task-completed-008/120/120',
    product_name: 'Garden Solar Light',
    store_name: 'Maple Outdoor',
    asin: 'B0MOCKTC008',
    country: '加拿大',
    order_type: '图片评',
    review_level: '普通',
    order_quantity: 9,
    status: '已截单',
    debt_status: 'surplus',
    debt_amount: 9.4,
    sales_person: '王敏',
    customer_name: '广州枫叶户外',
    notes: '截单但实做较多，需退差价',
    created_at: dayjs().subtract(8, 'day').hour(10).minute(15).toISOString(),
    updated_at: dayjs().hour(8).minute(40).toISOString(),
    _ordered_count: 7,
  },
  {
    id: 'mock-task-completed-009',
    order_number: 'MOCK-TC-20260703-009',
    batch_number: 'MOCK-BATCH-20260703-03',
    product_image: 'https://picsum.photos/seed/task-completed-009/120/120',
    product_name: 'Patio Storage Bag',
    store_name: 'Maple Outdoor',
    asin: 'B0MOCKTC009',
    country: '加拿大',
    order_type: '免评',
    review_level: '普通',
    order_quantity: 4,
    status: '进行中',
    sales_person: '王敏',
    customer_name: '广州枫叶户外',
    created_at: dayjs().subtract(6, 'day').hour(12).minute(10).toISOString(),
    updated_at: dayjs().subtract(30, 'minute').toISOString(),
    _ordered_count: 2,
  },
]

const mockFirstReviewRows: TaskCompletedRow[] = [
  {
    id: 'mock-first-review-001',
    order_number: 'MOCK-FR-20260513-001',
    product_image: 'https://picsum.photos/seed/first-review-001/120/120',
    product_name: 'Silicone Kitchen Mat Non-slip',
    store_name: 'NorthPeak Home',
    brand_name: 'NorthPeak',
    asin: 'B0MOCKFR001',
    country: '美国',
    category: 'Kitchen',
    product_price: 29.99,
    order_type: '图片评',
    review_level: '高等',
    order_quantity: 20,
    notes: '评论进度已达标，待同步客户首轮留评情况。',
    sales_person: '陈婷',
    customer_name: '深圳云帆科技',
    seller_name: 'NorthPeak Seller',
    status: '进行中',
    created_at: dayjs().subtract(6, 'day').hour(10).minute(18).second(0).toISOString(),
    updated_at: dayjs().hour(9).minute(40).second(0).toISOString(),
    review_feedback_status: '未反馈',
    _ordered_count: 18,
    _review_count: 15,
    _sub_total: 20,
    _mock_sub_orders: [
      {
        id: 'mock-fr-sub-001',
        sub_order_number: 'SUB-MOCK-FR-001',
        asin: 'B0MOCKFR001',
        scheduled_date: dayjs().subtract(4, 'day').format('YYYY-MM-DD'),
        review_type: '图片',
        review_level: '高等',
        keyword: 'silicone kitchen mat',
        staff_name: '王浩',
        buyer_name: '买手A',
        amazon_order_id: '111-2222222-3333333',
        amazon_order_placed_at: dayjs().subtract(3, 'day').hour(14).minute(22).toISOString(),
        product_price: 29.99,
        actual_paid: 28.99,
        refund_amount: 208.8,
        refund_status: '已返款',
        refund_method: '支付宝',
        status: '已留评',
        order_status: '正常',
        review_link: 'https://example.com/review/mock-fr-001',
        notes: '首批评论已完成',
      },
      {
        id: 'mock-fr-sub-002',
        sub_order_number: 'SUB-MOCK-FR-002',
        asin: 'B0MOCKFR001',
        scheduled_date: dayjs().subtract(3, 'day').format('YYYY-MM-DD'),
        review_type: '图片',
        review_level: '高等',
        keyword: 'kitchen mat non slip',
        staff_name: '王浩',
        buyer_name: '买手B',
        amazon_order_id: '111-2222222-4444444',
        amazon_order_placed_at: dayjs().subtract(2, 'day').hour(10).minute(12).toISOString(),
        product_price: 29.99,
        actual_paid: 30.49,
        refund_amount: 219.4,
        refund_status: '返款中',
        refund_method: '银行卡',
        status: '已完成',
        order_status: '正常',
        review_link: 'https://example.com/review/mock-fr-002',
        notes: '评论链接已同步',
      },
    ],
  },
  {
    id: 'mock-first-review-002',
    order_number: 'MOCK-FR-20260513-002',
    product_image: 'https://picsum.photos/seed/first-review-002/120/120',
    product_name: 'Cable Management Box',
    store_name: 'DeskPro',
    brand_name: 'DeskPro',
    asin: 'B0MOCKFR002',
    country: '德国',
    category: 'Office',
    product_price: 18.5,
    order_type: '文字评',
    review_level: '普通',
    order_quantity: 10,
    notes: '达到 70% 后需首次反馈卖家。',
    sales_person: '赵蕾',
    customer_name: '杭州晨星贸易',
    seller_name: 'DeskPro Seller',
    status: '进行中',
    created_at: dayjs().subtract(4, 'day').hour(11).minute(5).second(0).toISOString(),
    updated_at: dayjs().hour(11).minute(15).second(0).toISOString(),
    review_feedback_status: '未反馈',
    _ordered_count: 9,
    _review_count: 7,
    _sub_total: 10,
    _mock_sub_orders: [
      {
        id: 'mock-fr-sub-003',
        sub_order_number: 'SUB-MOCK-FR-003',
        asin: 'B0MOCKFR002',
        scheduled_date: dayjs().subtract(2, 'day').format('YYYY-MM-DD'),
        review_type: '文字',
        review_level: '普通',
        keyword: 'cable management box',
        staff_name: '陈婷',
        buyer_name: '买手C',
        amazon_order_id: '222-3333333-4444444',
        amazon_order_placed_at: dayjs().subtract(2, 'day').hour(16).minute(5).toISOString(),
        product_price: 18.5,
        actual_paid: 18.5,
        refund_amount: 133.2,
        refund_status: '已返款',
        refund_method: 'PayPal',
        status: '已留评',
        order_status: '正常',
        review_link: 'https://example.com/review/mock-fr-003',
        notes: '70% 留评达成',
      },
      {
        id: 'mock-fr-sub-004',
        sub_order_number: 'SUB-MOCK-FR-004',
        asin: 'B0MOCKFR002',
        scheduled_date: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
        review_type: '文字',
        review_level: '普通',
        keyword: 'desk cable organizer',
        staff_name: '陈婷',
        buyer_name: '买手D',
        amazon_order_id: '222-3333333-5555555',
        amazon_order_placed_at: dayjs().subtract(1, 'day').hour(9).minute(48).toISOString(),
        product_price: 18.5,
        actual_paid: 17.99,
        refund_amount: 129.5,
        refund_status: '返款中',
        refund_method: '支付宝',
        status: '已下单',
        order_status: '正常',
        review_link: '',
        notes: '等待评论上传',
      },
    ],
  },
]

const mockNewReviewRows: TaskCompletedRow[] = [
  {
    id: 'mock-new-review-001',
    order_number: 'MOCK-NR-20260513-001',
    product_image: 'https://picsum.photos/seed/new-review-001/120/120',
    product_name: 'Mini Portable Projector',
    store_name: 'VisionMax',
    brand_name: 'VisionMax',
    asin: 'B0MOCKNR001',
    country: '美国',
    category: 'Electronics',
    product_price: 89.99,
    order_type: '视频评',
    review_level: '极高等',
    order_quantity: 30,
    notes: '70% 已反馈后新增评论 4 单，需再次同步客户。',
    sales_person: '黄思',
    customer_name: '宁波艾森家居',
    seller_name: 'VisionMax Seller',
    status: '进行中',
    created_at: dayjs().subtract(9, 'day').hour(9).minute(30).second(0).toISOString(),
    updated_at: dayjs().hour(15).minute(20).second(0).toISOString(),
    review_feedback_status: '已反馈',
    review_feedback_date: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
    _ordered_count: 28,
    _review_count: 25,
    _sub_total: 30,
    _mock_sub_orders: [
      {
        id: 'mock-nr-sub-001',
        sub_order_number: 'SUB-MOCK-NR-001',
        asin: 'B0MOCKNR001',
        scheduled_date: dayjs().subtract(2, 'day').format('YYYY-MM-DD'),
        review_type: '视频',
        review_level: '极高等',
        keyword: 'portable projector',
        staff_name: '王浩',
        buyer_name: '买手E',
        amazon_order_id: '333-4444444-5555555',
        amazon_order_placed_at: dayjs().subtract(2, 'day').hour(13).minute(35).toISOString(),
        product_price: 89.99,
        actual_paid: 88.99,
        refund_amount: 640.7,
        refund_status: '已返款',
        refund_method: '银行卡',
        status: '已留评',
        order_status: '正常',
        review_link: 'https://example.com/review/mock-nr-001',
        notes: '已新增评论',
      },
      {
        id: 'mock-nr-sub-002',
        sub_order_number: 'SUB-MOCK-NR-002',
        asin: 'B0MOCKNR001',
        scheduled_date: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
        review_type: '视频',
        review_level: '极高等',
        keyword: 'mini projector',
        staff_name: '王浩',
        buyer_name: '买手F',
        amazon_order_id: '333-4444444-6666666',
        amazon_order_placed_at: dayjs().subtract(1, 'day').hour(18).minute(8).toISOString(),
        product_price: 89.99,
        actual_paid: 90.49,
        refund_amount: 651.5,
        refund_status: '返款中',
        refund_method: 'PayPal',
        status: '已完成',
        order_status: '正常',
        review_link: 'https://example.com/review/mock-nr-002',
        notes: '新增评论待反馈客户',
      },
    ],
  },
  {
    id: 'mock-new-review-002',
    order_number: 'MOCK-NR-20260513-002',
    product_image: 'https://picsum.photos/seed/new-review-002/120/120',
    product_name: 'Pet Grooming Brush',
    store_name: 'PetDaily',
    brand_name: 'PetDaily',
    asin: 'B0MOCKNR002',
    country: '加拿大',
    category: 'Pet Supplies',
    product_price: 16.99,
    order_type: '图片评',
    review_level: '高等',
    order_quantity: 15,
    notes: '新增 3 条图片评论，建议今日反馈。',
    sales_person: '陈婷',
    customer_name: '广州星河电子',
    seller_name: 'PetDaily Seller',
    status: '进行中',
    created_at: dayjs().subtract(7, 'day').hour(14).minute(5).second(0).toISOString(),
    updated_at: dayjs().hour(16).minute(10).second(0).toISOString(),
    review_feedback_status: '已反馈',
    review_feedback_date: dayjs().subtract(2, 'day').format('YYYY-MM-DD'),
    _ordered_count: 14,
    _review_count: 12,
    _sub_total: 15,
    _mock_sub_orders: [],
  },
]

const mockAfterSaleRows: AfterSaleRow[] = [
  {
    id: 'mock-after-sale-001',
    issue_number: 'ASI-MOCK-20260430-001',
    sub_order_number: 'SUB-MOCK-AS-3001',
    order_number: 'MOCK-AS-3001',
    product_image: 'https://picsum.photos/seed/after-sale-001/120/120',
    product_name: 'Magnetic Phone Holder',
    store_name: 'DriveMate',
    asin: 'B0F1N2HHKP',
    country: '美国',
    issue_type: '无此订单',
    review_level: '高等',
    issue_status: '已替换单号',
    old_amazon_order_id: '113-9760152-0549867',
    new_amazon_order_id: '113-2029760-7457834',
    profit_diff: 2.5,
    resolution_notes: '买手填写错误，已确认并替换为新订单号。',
    description: '客户反馈后台查无此订单。',
    business_manager_name: '陈婷',
    customer_name: '深圳云帆科技',
    created_at: dayjs('2026-04-30 10:18').toISOString(),
    updated_at: dayjs('2026-04-30 15:36').toISOString(),
    resolved_at: dayjs('2026-04-30 15:36').toISOString(),
    _task_leftovers: [
      {
        type: '任务遗留单',
        related_no: 'SUB-MOCK-AS-3001',
        order_number: '113-9760152-0549867',
        status: '已替换',
        remark: '原任务单号填写错误，需同步客户新单号。',
      },
    ],
    _seller_leftovers: [
      {
        type: '客户遗留单',
        related_no: 'MOCK-AS-3001',
        order_number: '113-2029760-7457834',
        status: '待客户确认',
        remark: '客户后台需按新订单号核对。',
      },
    ],
  },
  {
    id: 'mock-after-sale-002',
    issue_number: 'ASI-MOCK-20260508-002',
    sub_order_number: 'SUB-MOCK-AS-3002',
    order_number: 'MOCK-AS-3002',
    product_image: 'https://picsum.photos/seed/after-sale-002/120/120',
    product_name: 'USB C Desk Charger',
    store_name: 'ChargeHub',
    asin: 'B0MOCKAS3002',
    country: '英国',
    issue_type: '退款',
    review_level: '普通',
    issue_status: '无需处理',
    old_amazon_order_id: '444-4444444-4444444',
    new_amazon_order_id: '',
    principal_amount: 31.8,
    resolution_notes: '客户已确认转余额抵扣。',
    description: '买手退款导致订单无法继续。',
    business_manager_name: '赵蕾',
    customer_name: '杭州晨星贸易',
    created_at: dayjs().subtract(4, 'day').hour(13).minute(0).second(0).toISOString(),
    updated_at: dayjs().subtract(3, 'day').hour(16).minute(45).second(0).toISOString(),
    resolved_at: dayjs().subtract(3, 'day').hour(16).minute(45).second(0).toISOString(),
    _task_leftovers: [
      {
        type: '任务遗留单',
        related_no: 'SUB-MOCK-AS-3002',
        order_number: '444-4444444-4444444',
        status: '已关闭',
        remark: '原订单退款，任务侧记录本金损失。',
      },
    ],
    _seller_leftovers: [],
  },
]

const mockDailyFeedbackRows: TaskCompletedRow[] = [
  {
    id: 'mock-daily-feedback-001',
    order_number: 'MOCK-DF-20260514-001',
    product_image: 'https://picsum.photos/seed/daily-feedback-001/120/120',
    product_name: 'Adjustable Laptop Stand',
    store_name: 'ErgoDesk',
    brand_name: 'ErgoDesk',
    asin: 'B0MOCKDF001',
    country: '美国',
    category: 'Office',
    product_price: 35.99,
    order_type: '文字评',
    review_level: '普通',
    order_quantity: 18,
    notes: '每日反馈任务，今日新增订单号需同步客户。',
    sales_person: '王慧',
    customer_name: '深圳云帆科技',
    status: '进行中',
    daily_feedback: true,
    created_at: dayjs().subtract(5, 'day').hour(10).minute(8).second(0).toISOString(),
    updated_at: dayjs().hour(10).minute(30).second(0).toISOString(),
    _ordered_count: 9,
    _review_count: 3,
    _sub_total: 18,
    _today_ordered_count: 2,
    _mock_sub_orders: [
      {
        id: 'mock-df-sub-001',
        sub_order_number: 'SUB-MOCK-DF-001',
        asin: 'B0MOCKDF001',
        scheduled_date: dayjs().format('YYYY-MM-DD'),
        review_type: '文字',
        review_level: '普通',
        keyword: 'adjustable laptop stand',
        staff_name: '王慧',
        buyer_name: '买手G',
        amazon_order_id: '114-1234567-0000001',
        amazon_order_placed_at: dayjs().hour(9).minute(18).second(0).toISOString(),
        product_price: 35.99,
        actual_paid: 35.49,
        refund_amount: 255.5,
        refund_status: '返款中',
        refund_method: '支付宝',
        status: '已下单',
        order_status: '正常',
        notes: '今日已上传订单号',
      },
      {
        id: 'mock-df-sub-002',
        sub_order_number: 'SUB-MOCK-DF-002',
        asin: 'B0MOCKDF001',
        scheduled_date: dayjs().format('YYYY-MM-DD'),
        review_type: '文字',
        review_level: '普通',
        keyword: 'laptop riser',
        staff_name: '王慧',
        buyer_name: '买手H',
        amazon_order_id: '114-1234567-0000002',
        amazon_order_placed_at: dayjs().hour(11).minute(6).second(0).toISOString(),
        product_price: 35.99,
        actual_paid: 36.29,
        refund_amount: 261.3,
        refund_status: '未返款',
        refund_method: '银行卡',
        status: '已下单',
        order_status: '正常',
        notes: '今日新增订单',
      },
      {
        id: 'mock-df-sub-003',
        sub_order_number: 'SUB-MOCK-DF-003',
        asin: 'B0MOCKDF001',
        scheduled_date: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
        review_type: '文字',
        review_level: '普通',
        keyword: 'desk stand',
        staff_name: '王慧',
        buyer_name: '买手I',
        amazon_order_id: '114-1234567-0000003',
        amazon_order_placed_at: dayjs().subtract(1, 'day').hour(15).minute(30).second(0).toISOString(),
        product_price: 35.99,
        actual_paid: 35.99,
        refund_amount: 259.1,
        refund_status: '已返款',
        refund_method: 'PayPal',
        status: '已下单',
        order_status: '正常',
        notes: '昨日订单，不在今日反馈抽屉中展示',
      },
    ],
  },
]

const subColumns = [
  { title: '子订单ID', key: 'sub_no', width: 165 },
  { title: 'ASIN', key: 'sub_asin', width: 145 },
  { title: '排单日期', key: 'sub_scheduled', width: 110 },
  { title: '类型 / 等级', key: 'sub_type_level', width: 120 },
  { title: '关键词', key: 'sub_keyword', width: 130 },
  { title: '业务员 / 买手', key: 'sub_staff_buyer', width: 145 },
  { title: '订单号 / 上传时间', key: 'sub_order_upload', width: 180 },
  { title: '售价 / 实付 / 实返', key: 'sub_price_paid_refund', width: 150 },
  { title: '返款状态 / 方式', key: 'sub_refund_info', width: 145 },
  { title: '订单进度', key: 'sub_progress', width: 120 },
  { title: '评论/FB', key: 'sub_review_fb', width: 130 },
  { title: '订单状态', key: 'sub_order_status', width: 100 },
  { title: '订单备注', key: 'sub_notes', width: 160 },
]

onMounted(() => {
  loadTaskCompletedNotifications()
})

watch(
  () => route.query.type,
  value => {
    if (!value) router.replace({ name: 'business-notifications', query: { type: 'task-completed' } })
  },
)

async function loadTaskCompletedNotifications() {
  loading.value = true
  try {
    selectedRowKeys.value = []
    firstReviewSelectedRowKeys.value = []
    const { data: orders, error } = await supabase
      .from('erp_orders')
      .select('*')
      .order('updated_at', { ascending: false, nullsFirst: false })
      .limit(300)
    if (error) throw error

    const orderIds = (orders || []).map((row: any) => row.id).filter(Boolean)
    const statsMap = await loadSubOrderStats(orderIds)
    const mappedRows = appendBatchStats((orders || []).map((row: any) => ({
      ...row,
      _ordered_count: statsMap[row.id]?.ordered || 0,
      _review_count: statsMap[row.id]?.reviewed || 0,
      _sub_total: statsMap[row.id]?.total || 0,
      _today_ordered_count: statsMap[row.id]?.todayOrdered || 0,
    })))
    taskCompletedRowsRaw.value = mappedRows.filter((row: any) => ['已完成', '已完结', '已截单'].includes(String(row.status || '').trim()))
    firstReviewRowsRaw.value = mappedRows
    afterSaleRowsRaw.value = await loadAfterSaleNotifications()
  } catch (error: any) {
    message.error(`任务完成通知加载失败：${error?.message || '未知错误'}`)
  } finally {
    loading.value = false
  }
}

async function loadAfterSaleNotifications(): Promise<AfterSaleRow[]> {
  const { data, error } = await supabase
    .from('after_sale_issues')
    .select('*')
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(200)
  if (error) throw error
  return (data || []).map((row: any) => ({
    ...row,
    _task_leftovers: buildAfterSaleTaskLeftovers(row),
    _seller_leftovers: buildAfterSaleSellerLeftovers(row),
  }))
}

async function loadSubOrderStats(orderIds: string[]) {
  const statsMap: Record<string, { ordered: number; reviewed: number; total: number; todayOrdered: number }> = {}
  if (!orderIds.length) return statsMap

  const { data } = await supabase
    .from('sub_orders')
    .select('order_id, status, amazon_order_id, amazon_order_placed_at, updated_at, created_at')
    .in('order_id', orderIds)

  ;(data || []).forEach((sub: any) => {
    if (!statsMap[sub.order_id]) statsMap[sub.order_id] = { ordered: 0, reviewed: 0, total: 0, todayOrdered: 0 }
    statsMap[sub.order_id].total += 1
    if (sub.amazon_order_id || ['已下单', '已留评', '已完成'].includes(String(sub.status || '').trim())) {
      statsMap[sub.order_id].ordered += 1
    }
    if (isTodayOrderedSubOrder(sub)) {
      statsMap[sub.order_id].todayOrdered += 1
    }
    if (['已留评', '已完成'].includes(String(sub.status || '').trim())) {
      statsMap[sub.order_id].reviewed += 1
    }
  })

  return statsMap
}

function getOrderTypes(record: TaskCompletedRow) {
  if (Array.isArray(record.order_types) && record.order_types.length) return record.order_types
  return record.order_type ? [record.order_type] : []
}

function getTaskTotal(record: TaskCompletedRow) {
  return Number(record.order_quantity || record.total_orders || 0)
}

function getReviewRate(record: TaskCompletedRow) {
  const target = getReviewTargetCount(record)
  if (!target) return 0
  return Math.floor((Number(record._review_count || 0) / target) * 100)
}

function getReviewTargetCount(record: TaskCompletedRow) {
  const orderTypes = getOrderTypes(record).map(type => formatReviewType(type))
  if (orderTypes.length && orderTypes.every(type => type === '免评')) return 0
  return getTaskTotal(record)
}

function isDailyFeedbackTask(record: TaskCompletedRow) {
  const dailyValue = [
    record.daily_feedback_status,
    record.daily_feedback,
    record.is_daily_feedback,
    record.need_daily_feedback,
    record.daily_update_required,
    record.daily_feedback_required,
    record.need_daily_update,
  ].find(value => value !== undefined && value !== null && value !== '')

  if (typeof dailyValue === 'boolean') return dailyValue
  return ['是', '需要', '需反馈', '每日反馈', 'true', '1', 'yes'].includes(String(dailyValue || '').trim().toLowerCase())
}

function getSubOrderUploadTime(sub: any) {
  return sub?.amazon_order_placed_at || sub?.updated_at || sub?.created_at
}

function isTodayOrderedSubOrder(sub: any) {
  if (!sub?.amazon_order_id) return false
  const uploadTime = getSubOrderUploadTime(sub)
  const date = dayjs(uploadTime)
  return Boolean(date.isValid() && date.isSame(dayjs(), 'day'))
}

function getTodayOrderedCount(record: TaskCompletedRow) {
  if (record._today_ordered_count != null) return Number(record._today_ordered_count || 0)
  return (record._mock_sub_orders || []).filter(isTodayOrderedSubOrder).length
}

function getSellerName(record: TaskCompletedRow) {
  return record.seller_name || record.seller || record.customer_name || record.group_name || '-'
}

function isTerminalTaskStatus(status: any) {
  return ['已完成', '已完结', '已截单'].includes(String(status || '').trim())
}

function appendBatchStats(rows: TaskCompletedRow[]) {
  const batchMap = new Map<string, { total: number; unfinished: number }>()
  rows.forEach(row => {
    const batchNumber = String(row.batch_number || '').trim()
    if (!batchNumber) return
    const stat = batchMap.get(batchNumber) || { total: 0, unfinished: 0 }
    stat.total += 1
    if (!isTerminalTaskStatus(row.status)) stat.unfinished += 1
    batchMap.set(batchNumber, stat)
  })

  return rows.map(row => {
    const stat = batchMap.get(String(row.batch_number || '').trim())
    return {
      ...row,
      _batch_total: stat?.total || 0,
      _batch_unfinished: stat?.unfinished || 0,
    }
  })
}

function getTaskStatusTagColor(record: TaskCompletedRow) {
  if (record.status === '已截单') return 'red'
  if (record.status === '已完结') return 'cyan'
  return 'green'
}

function getActualDiffText(record: TaskCompletedRow) {
  const total = getTaskTotal(record)
  const actual = Number(record._ordered_count || 0)
  if (!total || actual === total) return ''
  return `实做 ${actual} 单`
}

function getPrincipalMessage(record: TaskCompletedRow): { type: 'owed' | 'surplus'; text: string } | null {
  const amount = Number(record.debt_amount || 0)
  const symbol = getPrincipalCurrencySymbol(record)
  if (record.debt_status === 'owed' && amount > 0) return { type: 'owed', text: `需补差价 ${symbol}${amount.toFixed(2)}` }
  if (record.debt_status === 'surplus' && amount > 0) return { type: 'surplus', text: `需退差价 ${symbol}${amount.toFixed(2)}` }
  return null
}

function getPrincipalCurrencySymbol(record: TaskCompletedRow) {
  const map: Record<string, string> = {
    美国: '$',
    德国: '€',
    英国: '£',
    加拿大: 'C$',
    US: '$',
    DE: '€',
    UK: '£',
    CA: 'C$',
  }
  return map[String(record.country || '').trim()] || '$'
}

function getBatchProgressInfo(record: TaskCompletedRow): { type: 'unfinished'; unfinished: number; total: number } | { type: 'completed'; total: number } | null {
  const total = Number(record._batch_total || 0)
  if (total <= 1) return null
  const unfinished = Number(record._batch_unfinished || 0)
  if (unfinished > 0) return { type: 'unfinished', unfinished, total }
  return { type: 'completed', total }
}

function hasBatchUnfinished(record: TaskCompletedRow) {
  return Number(record._batch_total || 0) > 1 && Number(record._batch_unfinished || 0) > 0
}

function getBatchUnfinishedCount(record: TaskCompletedRow) {
  return Number(record._batch_unfinished || 0)
}

function getBatchTotalCount(record: TaskCompletedRow) {
  return Number(record._batch_total || 0)
}

function getBatchProgressText(record: TaskCompletedRow) {
  const info = getBatchProgressInfo(record)
  if (!info) return ''
  if (info.type === 'unfinished') return `同批还有 ${info.unfinished} 个任务未完成（共 ${info.total} 个）`
  return '此批任务都已完成'
}

function buildMessage(record: TaskCompletedRow) {
  const lines = [String(record.status || '').trim(), getActualDiffText(record), getPrincipalMessage(record)?.text, getBatchProgressText(record)]
    .filter(Boolean)
  return lines.join('，')
}

function getPrincipalText(record: TaskCompletedRow) {
  const principal = getPrincipalMessage(record)
  if (principal) return principal.text
  return ''
}

function formatDateTime(value: any) {
  if (!value) return '-'
  const date = dayjs(value)
  return date.isValid() ? date.format('MM-DD HH:mm') : String(value)
}

function formatFullDateTime(value: any) {
  if (!value) return ''
  const date = dayjs(value)
  return date.isValid() ? date.format('YYYY-MM-DD HH:mm') : String(value)
}

function formatMonthDay(value: any) {
  if (!value) return ''
  const date = dayjs(value)
  return date.isValid() ? date.format('M月D日') : String(value)
}

function loadMarkedId() {
  try {
    const raw = localStorage.getItem('business-notification-task-completed-marked')
    if (!raw) return ''
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? String(parsed[0] || '') : String(parsed || '')
  } catch {
    return ''
  }
}

function persistMarkedId() {
  localStorage.setItem('business-notification-task-completed-marked', JSON.stringify(markedId.value))
}

function getNotificationMarkKey(record: { id: string }, type = 'task-completed') {
  return `${type}:${record.id}`
}

function isMarked(record: { id: string }, type = 'task-completed') {
  return markedId.value === getNotificationMarkKey(record, type) || markedId.value === record.id
}

function getTaskRowClassName(record: TaskCompletedRow, type = 'task-completed') {
  return isMarked(record, type) ? 'notification-row-marked' : ''
}

function getFirstReviewRowClassName(record: TaskCompletedRow) {
  return getTaskRowClassName(record, 'first-review')
}

function getNewReviewRowClassName(record: TaskCompletedRow) {
  return getTaskRowClassName(record, 'new-review')
}

function getDailyFeedbackRowClassName(record: TaskCompletedRow) {
  return getTaskRowClassName(record, 'daily-feedback')
}

function getAfterSaleRowClassName(record: AfterSaleRow) {
  return isMarked(record, 'after-sale') ? 'notification-row-marked' : ''
}

function markNotification(record: { id: string }, type = 'task-completed') {
  if (isMarked(record, type)) return
  markedId.value = getNotificationMarkKey(record, type)
  persistMarkedId()
  message.success('已标记')
}

function normalizeAfterSaleStatus(value: any) {
  const raw = String(value || '').trim()
  if (raw === '已替换订单') return '已替换单号'
  if (raw === '已退款给客户') return '无需处理'
  if (raw === '需补单') return '无新单号'
  return raw
}

function isHandledAfterSale(record: AfterSaleRow) {
  return ['已替换单号', '已补单', '已追回本金', '已关闭', '无需处理'].includes(normalizeAfterSaleStatus(record.issue_status))
}

function getAfterSaleOrderChangeText(record: AfterSaleRow) {
  const oldNo = record.old_amazon_order_id || '-'
  const newNo = record.new_amazon_order_id || ''
  if (newNo) return `${oldNo}修改为${newNo}`
  if (record.replacement_sub_order_number) return `${record.sub_order_number || '-'}补单为${record.replacement_sub_order_number}`
  return oldNo && oldNo !== '-' ? `${oldNo}未修改` : '-'
}

function getAfterSaleReason(record: AfterSaleRow) {
  return record.after_sale_reason || record.initial_issue_status || record.issue_type || '-'
}

function getAfterSaleResultLabel(record: AfterSaleRow) {
  const normalized = normalizeAfterSaleStatus(record.issue_status)
  if (normalized === '已替换单号') return '已修改订单号'
  if (normalized === '已补单') return '已补单'
  if (normalized === '已追回本金') return '已追回本金'
  if (normalized === '已关闭') return '已关闭'
  if (normalized === '无需处理') return '无需处理'
  return normalized || '-'
}

function getAfterSaleStatusColor(status: any) {
  const normalized = normalizeAfterSaleStatus(status)
  if (['已替换单号', '已补单', '已追回本金', '已关闭', '无需处理'].includes(normalized)) return 'green'
  if (['处理中', '无新单号'].includes(normalized)) return 'processing'
  if (['待处理', '待确认'].includes(normalized)) return 'orange'
  return 'default'
}

function getAfterSalePriceDiff(record: AfterSaleRow) {
  return Number(record.profit_diff || record.principal_amount || record.loss_amount || 0)
}

function formatAfterSalePriceDiff(record: AfterSaleRow) {
  const amount = getAfterSalePriceDiff(record)
  return amount ? `$${amount.toFixed(2)}` : '-'
}

function formatMoney(value: any, prefix = '$') {
  if (value === undefined || value === null || value === '') return '-'
  const amount = Number(value)
  return Number.isFinite(amount) ? `${prefix}${amount.toFixed(2)}` : String(value)
}

function buildAfterSaleTaskLeftovers(record: AfterSaleRow) {
  const rows = []
  if (record.sub_order_number || record.old_amazon_order_id) {
    rows.push({
      type: '任务遗留单',
      sub_order_id: record.sub_order_number || record.order_number || record.issue_number || '-',
      order_number: record.old_amazon_order_id || record.new_amazon_order_id || '-',
      status: record.issue_status || '-',
      remark: record.description || record.resolution_notes || '-',
    })
  }
  if (record.replacement_sub_order_number) {
    rows.push({
      type: '补单记录',
      sub_order_id: record.replacement_sub_order_number,
      order_number: record.new_amazon_order_id || '-',
      status: '已补单',
      remark: `补单买手：${record.replacement_buyer_name || '-'}`,
    })
  }
  return rows
}

function buildAfterSaleSellerLeftovers(record: AfterSaleRow) {
  if (!record.old_amazon_order_id && !record.new_amazon_order_id) return []
  return [
    {
      type: '客户遗留单',
      sub_order_id: record.sub_order_number || record.order_number || '-',
      order_number: record.new_amazon_order_id || record.old_amazon_order_id || '-',
      status: record.new_amazon_order_id ? '待按新单号核对' : '待确认',
      remark: getAfterSaleOrderChangeText(record),
    },
  ]
}

function enrichAfterSaleDetailRow(row: any, record: AfterSaleRow, index: number) {
  return {
    key: row.key || `${row.type || 'detail'}-${row.sub_order_id || row.related_no || index}-${index}`,
    sub_order_id: row.sub_order_id || row.related_no || record.sub_order_number || record.order_number || '-',
    inbound_time: row.inbound_time || row.created_at || record.created_at,
    placed_at: row.placed_at || row.amazon_order_placed_at || record.amazon_order_placed_at || record.created_at,
    seller_name: row.seller_name || row.seller || record.seller_name || record.store_name || '-',
    product_name: row.product_name || record.product_name || record.store_name || '-',
    asin: row.asin || record.asin || '-',
    review_type: row.review_type || row.order_type || record.review_type || record.order_type || record.issue_type || '',
    review_level: row.review_level || record.review_level || '',
    staff_name: row.staff_name || record.staff_name || record.business_manager_name || record.sales_person || '-',
    buyer_name: row.buyer_name || record.buyer_name || record.replacement_buyer_name || '-',
    order_number: row.order_number || row.amazon_order_id || record.old_amazon_order_id || record.new_amazon_order_id || '-',
    product_price: row.product_price ?? record.product_price,
    actual_paid: row.actual_paid ?? record.actual_paid,
    refund_amount: row.refund_amount ?? record.refund_amount ?? record.principal_amount,
    refund_status: row.refund_status || record.refund_status || '',
    after_sale_reason: row.after_sale_reason || getAfterSaleReason(record),
    remark: row.remark || record.resolution_notes || record.description || '-',
  }
}

function normalizeAfterSaleDetailRows(rows: any[], record: AfterSaleRow) {
  return rows.map((row, index) => ({
    ...row,
    ...enrichAfterSaleDetailRow(row, record, index),
  }))
}

function getAfterSaleTaskLeftovers(record: AfterSaleRow) {
  return normalizeAfterSaleDetailRows(record._task_leftovers || buildAfterSaleTaskLeftovers(record), record)
}

function getAfterSaleSellerLeftovers(record: AfterSaleRow) {
  return normalizeAfterSaleDetailRows(record._seller_leftovers || buildAfterSaleSellerLeftovers(record), record)
}

function openAfterSaleDetail(record: AfterSaleRow, type: 'task' | 'seller') {
  const isTask = type === 'task'
  afterSaleDetailTitle.value = `${record.issue_number || record.id} ${isTask ? '任务遗留单明细' : '客户遗留单明细'}`
  afterSaleDetailRows.value = isTask ? getAfterSaleTaskLeftovers(record) : getAfterSaleSellerLeftovers(record)
  afterSaleDetailModalOpen.value = true
}

async function viewOrder(record: TaskCompletedRow) {
  selectedTask.value = record
  subOrderDrawerOpen.value = true
  if (record._mock_sub_orders) {
    subOrderRows.value = record._mock_sub_orders
    subOrderLoading.value = false
    return
  }
  subOrderLoading.value = true
  try {
    const { data, error } = await supabase
      .from('sub_orders')
      .select('*')
      .eq('order_id', record.id)
      .order('created_at', { ascending: true })
    if (error) throw error
    subOrderRows.value = (data || []).map(row => ({
      ...row,
      review_type: formatReviewType(row.review_type || row.order_type),
      refund_status: normalizeRefundStatus(row.refund_status),
    }))
  } catch (error: any) {
    message.error(`子订单加载失败：${error?.message || '未知错误'}`)
  } finally {
    subOrderLoading.value = false
  }
}

async function viewTodayOrders(record: TaskCompletedRow) {
  selectedTask.value = record
  subOrderDrawerOpen.value = true
  if (record._mock_sub_orders) {
    subOrderRows.value = record._mock_sub_orders.filter(isTodayOrderedSubOrder)
    subOrderLoading.value = false
    return
  }
  subOrderLoading.value = true
  try {
    const { data, error } = await supabase
      .from('sub_orders')
      .select('*')
      .eq('order_id', record.id)
      .not('amazon_order_id', 'is', null)
      .order('created_at', { ascending: true })
    if (error) throw error
    subOrderRows.value = (data || [])
      .filter(isTodayOrderedSubOrder)
      .map(row => ({
        ...row,
        review_type: formatReviewType(row.review_type || row.order_type),
        refund_status: normalizeRefundStatus(row.refund_status),
      }))
  } catch (error: any) {
    message.error(`今日订单加载失败：${error?.message || '未知错误'}`)
  } finally {
    subOrderLoading.value = false
  }
}

function openFeedbackModal(record: TaskCompletedRow) {
  feedbackTargetIds.value = [record.id]
  feedbackForm.value = {
    order_feedback_status: record.order_feedback_status || '未反馈',
    order_feedback_date_picker: record.order_feedback_date || null,
    review_feedback_status: record.review_feedback_status || '未反馈',
    review_feedback_date_picker: record.review_feedback_date || null,
  }
  feedbackModalOpen.value = true
}

function openBatchFeedbackModal() {
  if (!selectedRowKeys.value.length) return
  feedbackTargetIds.value = [...selectedRowKeys.value]
  feedbackForm.value = {
    order_feedback_status: '已反馈',
    order_feedback_date_picker: dayjs().format('YYYY-MM-DD'),
    review_feedback_status: '未反馈',
    review_feedback_date_picker: null,
  }
  feedbackModalOpen.value = true
}

function openFirstReviewBatchFeedbackModal() {
  if (!firstReviewSelectedRowKeys.value.length) return
  feedbackTargetIds.value = [...firstReviewSelectedRowKeys.value]
  feedbackForm.value = {
    order_feedback_status: '未反馈',
    order_feedback_date_picker: null,
    review_feedback_status: '已反馈',
    review_feedback_date_picker: dayjs().format('YYYY-MM-DD'),
  }
  feedbackModalOpen.value = true
}

async function saveFeedback() {
  if (!feedbackTargetIds.value.length) return
  feedbackSaving.value = true
  try {
    const isOrderFb = feedbackForm.value.order_feedback_status === '已反馈'
    const isReviewFb = feedbackForm.value.review_feedback_status === '已反馈'

    if (isOrderFb && !feedbackForm.value.order_feedback_date_picker) {
      message.warning('请选择订单反馈日期')
      feedbackSaving.value = false
      return
    }
    if (isReviewFb && !feedbackForm.value.review_feedback_date_picker) {
      message.warning('请选择评论反馈日期')
      feedbackSaving.value = false
      return
    }

    const payload = {
      order_feedback_status: feedbackForm.value.order_feedback_status,
      order_feedback_date: isOrderFb ? feedbackForm.value.order_feedback_date_picker : null,
      review_feedback_status: feedbackForm.value.review_feedback_status,
      review_feedback_date: isReviewFb ? feedbackForm.value.review_feedback_date_picker : null,
      updated_at: new Date().toISOString(),
    }

    if (feedbackTargetIds.value.every(id => id.startsWith('mock-'))) {
      firstReviewRowsRaw.value.forEach(row => {
        if (feedbackTargetIds.value.includes(row.id)) Object.assign(row, payload)
      })
      ;[...mockFirstReviewRows, ...mockNewReviewRows].forEach(row => {
        if (feedbackTargetIds.value.includes(row.id)) Object.assign(row, payload)
      })
      message.success('反馈状态已保存')
      feedbackModalOpen.value = false
      return
    }

    const query = supabase.from('erp_orders').update(payload)
    const { error } = feedbackTargetIds.value.length === 1
      ? await query.eq('id', feedbackTargetIds.value[0])
      : await query.in('id', feedbackTargetIds.value)
    if (error) throw error

    taskCompletedRowsRaw.value.forEach(row => {
      if (feedbackTargetIds.value.includes(row.id)) Object.assign(row, payload)
    })
    message.success('反馈状态已保存')
    feedbackModalOpen.value = false
  } catch (error: any) {
    message.error(`保存失败：${error?.message || '未知错误'}`)
  } finally {
    feedbackSaving.value = false
  }
}

function handleOrderFeedbackStatusChange() {
  if (feedbackForm.value.order_feedback_status === '已反馈' && !feedbackForm.value.order_feedback_date_picker) {
    feedbackForm.value.order_feedback_date_picker = dayjs().format('YYYY-MM-DD')
  }
}

function handleReviewFeedbackStatusChange() {
  if (feedbackForm.value.review_feedback_status === '已反馈' && !feedbackForm.value.review_feedback_date_picker) {
    feedbackForm.value.review_feedback_date_picker = dayjs().format('YYYY-MM-DD')
  }
}

function startEditNotes(record: TaskCompletedRow) {
  editingNotesId.value = record.id
  editingNotesValue.value = record.notes || record.task_notes || ''
}

async function saveNotes(record: TaskCompletedRow) {
  if (editingNotesId.value !== record.id) return
  const nextNotes = editingNotesValue.value.trim()
  const previousNotes = record.notes || ''
  editingNotesId.value = ''
  if (nextNotes === previousNotes) return
  notesSaving.value = true
  try {
    const { error } = await supabase
      .from('erp_orders')
      .update({ notes: nextNotes || null, updated_at: new Date().toISOString() })
      .eq('id', record.id)
    if (error) throw error
    record.notes = nextNotes
    message.success('商务备注已保存')
  } catch (error: any) {
    message.error(`备注保存失败：${error?.message || '未知错误'}`)
  } finally {
    notesSaving.value = false
  }
}

function openCopyModal() {
  if (!selectedTask.value) return
  copyCheckedFields.value = ['asin', 'order_number']
  copyModalOpen.value = true
}

async function openRowCopyModal(record: TaskCompletedRow) {
  selectedTask.value = record
  if (record._mock_sub_orders) {
    subOrderRows.value = record._mock_sub_orders
  } else {
    const { data } = await supabase
      .from('sub_orders')
      .select('*')
      .eq('order_id', record.id)
      .order('created_at', { ascending: true })
    subOrderRows.value = (data || []).map(row => ({
      ...row,
      review_type: formatReviewType(row.review_type || row.order_type),
      refund_status: normalizeRefundStatus(row.refund_status),
    }))
  }
  openCopyModal()
}

function copyNewReviewSummary(record: TaskCompletedRow) {
  const dateText = formatMonthDay(record.created_at)
  const copyValue = [
    dateText,
    record.asin || '-',
    record.order_number || record.id,
    `此批任务当前留评率为${getReviewRate(record)}%`,
  ].join('\t')
  copyText(copyValue)
}

function copyAfterSaleSummary(record: AfterSaleRow) {
  const copyValue = [
    formatMonthDay(record.created_at),
    record.asin || '-',
    getAfterSaleOrderChangeText(record),
  ].join('\t')
  copyText(copyValue)
}

function buildSelectedTaskCopyText() {
  const task = selectedTask.value
  if (!task) return ''
  const firstPaidSub = subOrderRows.value.find(row => row.actual_paid != null)
  const actualPaid = firstPaidSub?.actual_paid
  const priceDiff = actualPaid != null ? Number(actualPaid || 0) - Number(task.product_price || 0) : null
  const firstPlacedAt = subOrderRows.value
    .map(row => row.amazon_order_placed_at || row.created_at)
    .filter(Boolean)
    .sort()[0]
  const reviewLinks = subOrderRows.value
    .map(row => row.review_link || row.fb_link)
    .filter(Boolean)

  const valueMap: Record<string, any> = {
    asin: task.asin,
    order_number: task.order_number,
    product_name: task.product_name,
    store_name: task.store_name,
    brand_name: task.brand_name,
    country: task.country,
    review_type: formatReviewType(task.review_type || task.order_type || ''),
    review_level: task.review_level,
    product_price: task.product_price != null ? `$${Number(task.product_price).toFixed(2)}` : '',
    created_at: formatFullDateTime(task.created_at),
    actual_paid: actualPaid != null ? `$${Number(actualPaid).toFixed(2)}` : '',
    price_diff: priceDiff != null ? `$${priceDiff.toFixed(2)}` : '',
    placed_at: formatFullDateTime(firstPlacedAt),
    review_link: reviewLinks.join(' / '),
    category: task.category,
    customer_name: task.customer_name || task.group_name,
    status: task.status,
  }

  return copyFieldGroups
    .map(group => {
      const lines = group.fields
        .filter(field => copyCheckedFields.value.includes(field.key))
        .map(field => [field.label, valueMap[field.key]])
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([label, value]) => `${label}：${value}`)
      return lines.length ? `${group.title}\n${lines.join('\n')}` : ''
    })
    .filter(Boolean)
    .join('\n\n')
}

function doConfirmCopy() {
  const copyTextValue = buildSelectedTaskCopyText()
  if (!copyTextValue) {
    message.warning('没有可复制的内容')
    return
  }
  copyText(copyTextValue)
  copyModalOpen.value = false
}

function copyProductInfo(record: TaskCompletedRow) {
  const value = [
    record.product_name || record.store_name || '-',
    record.asin || '-',
    record.order_number || record.id,
  ].join(' / ')
  copyText(value)
}

function copyAfterSaleProductInfo(record: AfterSaleRow) {
  const value = [
    record.product_name || record.store_name || '-',
    record.asin || '-',
    record.issue_number || record.order_number || record.id,
  ].join(' / ')
  copyText(value)
}

function exportFirstReview(record: TaskCompletedRow) {
  const headers = ['创建时间', '国家', '产品信息', '类型/等级', '总单量', '留评量', '留评率', '商务备注', '推送时间', '商务', '卖家姓名']
  const values = [
    formatFullDateTime(record.created_at),
    record.country || '',
    `${record.product_name || record.store_name || ''} / ${record.asin || ''} / ${record.order_number || record.id}`,
    [...getOrderTypes(record), record.review_level].filter(Boolean).join('/'),
    getTaskTotal(record),
    Number(record._review_count || 0),
    `${getReviewRate(record)}%`,
    record.notes || record.task_notes || '',
    formatFullDateTime(record.updated_at || record.created_at),
    record.sales_person || record.business_manager_name || '',
    getSellerName(record),
  ]
  const csv = [headers, values]
    .map(row => row.map(value => `"${String(value ?? '').replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `首次评论反馈-${record.order_number || record.id}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

async function copyText(value: any) {
  const text = String(value || '').trim()
  if (!text || text === '-') return
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
    } else {
      const textarea = document.createElement('textarea')
      textarea.value = text
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    message.success('已复制')
  } catch {
    message.warning('复制失败，请手动复制')
  }
}

function getSubStatusColor(status: string) {
  const map: Record<string, string> = { '待分配': 'default', '已分配': 'cyan', '进行中': 'blue', '已下单': 'orange', '已留评': 'geekblue', '已完成': 'green', '已取消': 'red' }
  return map[status] || 'default'
}

function getSubOrderStatusColor(status: string) {
  const map: Record<string, string> = { '正常': 'green', '不下单': 'orange', '无此订单': 'red', '取消': 'red', '退款': 'gold' }
  return map[status] || 'default'
}

function getSubProgressLabel(sub: any): string {
  if (sub.review_screenshot_url) return '已留评'
  if (sub.delivery_confirmed_at) return '已签收'
  if (sub.amazon_order_id) return '已下单'
  if (sub.buyer_id) return '已分配'
  return '待分配'
}

function getSubReviewFbItems(sub: any) {
  const seed = encodeURIComponent(String(sub?.sub_order_number || sub?.id || 'sub-order'))
  const linkUrl = sub?.review_link || sub?.fb_link || sub?.keyword_link || `https://example.com/review/${seed}`
  const imageUrl = sub?.review_screenshot_url || sub?.review_image_url || sub?.product_image || `https://picsum.photos/seed/${seed}/900/600`
  return [
    { label: '链接', type: 'link', url: linkUrl },
    { label: '图片', type: 'image', url: imageUrl },
  ]
}

function formatReviewType(value: string) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw === '文字评' || raw === '文字') return '文字'
  if (raw === '图片评' || raw === '图片') return '图片'
  if (raw === '视频评' || raw === '视频') return '视频'
  if (raw === 'FB' || raw === 'Feedback') return 'Feedback'
  if (raw === '免评') return '免评'
  return raw
}

function getOrderTypeTagColor(type: string) {
  const map: Record<string, string> = { '文字': 'cyan', '图片': 'blue', '视频': 'geekblue', '免评': 'green', 'Feedback': 'gold' }
  return map[formatReviewType(type)] || 'default'
}

function getReviewLevelTagColor(level: string) {
  const map: Record<string, string> = { '普通': 'default', '高等': 'blue', '极高等': 'gold' }
  return map[level] || 'default'
}

function normalizeRefundStatus(value: string) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw === '待退款' || raw === '未返款') return '未返款'
  if (raw === '退款中' || raw === '返款中') return '返款中'
  if (raw === '已退款' || raw === '已返款') return '已返款'
  if (raw === '无需退款' || raw === '无需返款') return '无需返款'
  if (raw === 'On Hold') return 'On Hold'
  if (raw === '退款失败' || raw === '返款失败') return '返款失败'
  if (raw === '失误多返') return '失误多返'
  return raw
}

function getRefundStatusTagColor(status: string) {
  const normalized = normalizeRefundStatus(status)
  const map: Record<string, string> = {
    '未返款': 'default',
    '返款中': 'blue',
    '已返款': 'green',
    'On Hold': 'gold',
    '返款失败': 'red',
    '无需返款': 'cyan',
    '失误多返': 'magenta',
  }
  return map[normalized] || 'default'
}

function showPrincipalLossHint(sub: any) {
  return normalizeRefundStatus(sub?.refund_status) === '已返款' && Boolean(sub?._mock_principal_loss)
}

function getSubUploadTime(sub: any) {
  return sub?.amazon_order_placed_at || null
}

function getSubRemark(sub: any) {
  return String(sub?.notes || sub?.task_notes || '').trim()
}

function fmtTime(value: string | null) {
  if (!value) return '-'
  const date = dayjs(value)
  return date.isValid() ? date.format('YYYY-MM-DD HH:mm') : String(value)
}
</script>

<style scoped>
.business-notification-view {
  padding: 20px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
  padding: 18px 20px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
}

.page-title {
  margin: 0;
  color: #1a1a2e;
  font-size: 22px;
  font-weight: 700;
}

.page-subtitle {
  margin: 6px 0 0;
  color: #6b7280;
  font-size: 13px;
}

.notification-tabs {
  padding: 16px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
}

.table-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-bottom: 12px;
}

.selected-hint {
  color: #6b7280;
  font-size: 13px;
}

.notification-tabs :deep(.notification-row-marked td) {
  background: rgba(5, 150, 105, 0.08) !important;
}

.product-image {
  object-fit: cover;
  border-radius: 8px;
}

.image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  color: #9ca3af;
  font-size: 12px;
  background: #f5f7fa;
  border: 1px dashed #e5e7eb;
  border-radius: 8px;
}

.product-info-cell {
  line-height: 1.5;
}

.product-name {
  color: #1a1a2e;
  font-weight: 600;
}

.product-meta {
  color: #6b7280;
  font-size: 12px;
}

.copyable-cell,
.copyable-text {
  cursor: pointer;
}

.copyable-cell:hover .product-name,
.copyable-text:hover {
  color: #2563eb;
}

.tag-stack {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.message-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 3px;
  line-height: 1.5;
}

.message-main-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.message-actual {
  color: #6b7280;
  font-size: 12px;
}

.message-principal {
  font-size: 12px;
  font-weight: 600;
}

.message-principal.is-owed {
  color: #dc2626;
}

.message-principal.is-surplus {
  color: #059669;
}

.message-batch {
  color: #6b7280;
  font-size: 12px;
}

.message-batch strong {
  color: #1a1a2e;
  font-weight: 700;
}

.review-progress-cell {
  line-height: 1.4;
}

.review-progress-main {
  color: #1a1a2e;
  font-weight: 600;
}

.review-progress-sub {
  margin-top: 2px;
  color: #9ca3af;
  font-size: 12px;
}

.order-change-text {
  color: #1a1a2e;
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
}

.price-diff-danger {
  color: #dc2626;
  font-weight: 600;
}

.notes-text {
  display: -webkit-box;
  overflow: hidden;
  color: #6b7280;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.editable-notes {
  cursor: pointer;
}

.editable-notes:hover {
  color: #2563eb;
}

.muted-text {
  color: #9ca3af;
}

.sub-no,
.asin-code,
.order-num-sm {
  color: #2563eb;
  font-family: Consolas, Monaco, monospace;
  font-size: 12px;
}

.keyword-tag {
  display: inline-block;
  max-width: 110px;
  overflow: hidden;
  color: #2563eb;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info-stack-cell,
.price-pair-cell,
.refund-status-cell,
.review-fb-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

.info-stack-label,
.price-pair-label {
  display: inline-block;
  min-width: 42px;
  margin-right: 4px;
  color: #6b7280;
}

.price-text {
  color: #1a1a2e;
  font-weight: 600;
}

.refund-amount {
  color: #059669;
  font-weight: 600;
}

.refund-method-tag,
.principal-loss-hint {
  color: #6b7280;
  font-size: 12px;
}

.principal-loss-hint {
  color: #dc2626;
}

.review-fb-link {
  color: #2563eb;
  line-height: 1.4;
}

.feedback-form {
  display: grid;
  gap: 18px;
}

.feedback-field {
  padding: 14px;
  background: #f5f7fa;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}

.feedback-form-label {
  display: block;
  margin-bottom: 10px;
  color: #1a1a2e;
  font-weight: 600;
}

.feedback-date-field {
  margin-top: 12px;
}

.feedback-date-label {
  display: block;
  margin-bottom: 6px;
  color: #6b7280;
  font-size: 12px;
}

.copy-modal-body {
  display: grid;
  gap: 14px;
}

.copy-fields-label {
  color: #1a1a2e;
  font-weight: 600;
}

.copy-checkbox-group {
  width: 100%;
}

.copy-field-group + .copy-field-group {
  margin-top: 14px;
}

.copy-field-group-title {
  margin-bottom: 8px;
  color: #6b7280;
  font-size: 13px;
  font-weight: 600;
}

@media (max-width: 767px) {
  .business-notification-view {
    padding: 12px;
  }

  .page-header {
    display: block;
  }

  .page-header :deep(.ant-btn) {
    margin-top: 12px;
  }
}
</style>
