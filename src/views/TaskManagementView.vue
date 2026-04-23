<template>
  <div class="page-content">
    <h1 class="page-title">任务中心</h1>

    <a-tabs v-model:activeKey="activeTab" class="main-tabs">
      <a-tab-pane key="tasks" tab="任务列表" />
    </a-tabs>

    <!-- ===== 任务列表 Tab ===== -->
    <div v-show="activeTab === 'tasks'" class="card-panel">
      <div class="toolbar">
        <a-input-search v-model:value="searchText" placeholder="搜索订单号/ASIN/店铺" style="width:260px" @search="load" allow-clear />
        <a-select v-model:value="filterStatus" style="width:130px" @change="load" allow-clear placeholder="任务状态">
          <a-select-option value="">全部状态</a-select-option>
          <a-select-option v-for="s in taskStatuses" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterCountry" style="width:100px" @change="load" allow-clear placeholder="国家">
          <a-select-option value="">全部</a-select-option>
          <a-select-option v-for="c in countries" :key="c" :value="c">{{ c }}</a-select-option>
        </a-select>
        <a-button type="primary" @click="load"><ReloadOutlined /> 刷新</a-button>
        <span class="total-hint">共 {{ pagination.total }} 个任务</span>
      </div>

      <div v-if="loading" class="loading-wrap"><a-spin /></div>

      <div v-else class="task-list">
        <div v-for="record in tasks" :key="record.id" class="task-card">
          <div class="task-main-row">
            <div class="task-expand-btn" @click="toggleExpand(record)">
              <RightOutlined :class="['expand-icon', { 'expanded': expandedRowKeys.includes(record.id) }]" />
            </div>

            <div class="task-product-img" @click="toggleExpand(record)">
              <img
                v-if="record.product_image"
                :src="record.product_image"
                class="task-product-thumb"
                referrerpolicy="no-referrer"
                @error="onImgError($event)"
              />
              <div v-else class="task-product-placeholder">
                <PictureOutlined />
              </div>
            </div>

            <div class="task-info">
              <div class="task-top-row">
                <span class="detail-item-text">主订单ID：</span>
                <a class="order-num-link">{{ record.order_number }}</a>
                <a-tag :color="getStatusColor(record.status)" class="status-tag">{{ record.status }}</a-tag>
                <a-tag color="default" class="info-tag">{{ record.country }}</a-tag>
                <template v-if="record.order_types && record.order_types.length">
                  <a-tag v-for="(ot, index) in record.order_types" :key="`${ot}-${index}`" :color="getOrderTypeColor(ot)" class="info-tag">{{ formatReviewType(ot) }}</a-tag>
                </template>
                <template v-else-if="record.order_type">
                  <a-tag :color="getOrderTypeColor(record.order_type)" class="info-tag">{{ formatReviewType(record.order_type) }}</a-tag>
                </template>
                <a-tag v-if="record.review_level" :color="getReviewLevelColor(record.review_level)" class="info-tag">{{ record.review_level }}</a-tag>
              </div>
              <div class="task-detail-row">
                <span class="detail-item-text">产品名称：{{ record.product_name || '—' }}</span>
                <span class="detail-sep">ASIN：<span class="mono-sm">{{ record.asin }}</span></span>
                <span class="detail-sep">售价：<span class="price-text">${{ Number(record.product_price || 0).toFixed(2) }}</span></span>
              </div>
              <div class="task-detail-row">
                <span class="detail-item-text">客户：{{ record.customer_name || '—' }}</span>
                <span class="detail-sep">商务：{{ record.sales_person || '—' }}</span>
                <span class="detail-sep">类目：{{ record.category || '—' }}</span>
              </div>
              <div class="task-detail-row">
                <span class="detail-item-text">任务备注：</span>
                <span class="task-note-text" :title="getTaskRemark(record)">{{ getTaskRemark(record) }}</span>
              </div>
              <div class="task-detail-row">
                <span class="detail-item-text">创建时间：{{ fmtTime(record.created_at) }}</span>
              </div>
            </div>

            <div class="task-stats">
              <!-- 左侧：总量 / 已下单 / 排期 -->
              <div class="stat-item">
                <span class="stat-label">总量</span>
                <span class="stat-val stat-total">{{ record.order_quantity || 0 }}</span>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item">
                <span class="stat-label">已下单</span>
                <span class="stat-val stat-ordered">{{ record._ordered_count || 0 }}</span>
              </div>
              <div class="stat-divider"></div>
              <div class="stat-item stat-item-clickable" @click.stop="openScheduleModal(record)">
                <span class="stat-label">排期</span>
                <span class="stat-val stat-schedule">{{ record._schedule_days || 0 }}<span class="stat-unit">天</span></span>
                <span class="stat-daily">
                  <template v-if="(record.fixed_daily_orders || 0) > 0">固定 {{ record.fixed_daily_orders }} 单/天</template>
                  <template v-else-if="(record.new_daily_orders || 0) > 0">
                    <span class="stat-daily-flex">灵活·点击查看</span>
                  </template>
                  <template v-else>点击查看详情</template>
                </span>
              </div>
              <!-- 右侧：买手匹配 / 已返款 / 已留评 -->
              <div class="stat-right-col">
                <div class="stat-mini-row">
                  <span class="stat-mini-label assign-label">买手匹配 {{ record._scheduled_count || 0 }}</span>
                  <span class="stat-mini-label refund-label">已返款 {{ record._refunded_count || 0 }}</span>
                </div>
                <div class="stat-mini-row">
                  <span class="stat-mini-label review-label">已留评 {{ record._review_count || 0 }}</span>
                </div>
              </div>
            </div>

            <div class="task-actions">
              <a-button size="small" @click.stop="openTaskDetail(record)">
                详情
              </a-button>
              <a-select
                :value="record.status"
                size="small"
                class="task-status-select"
                :loading="taskStatusSavingId === record.id"
                @change="(value: string) => requestTaskStatusChange(record, value)"
                @click.stop
              >
                <a-select-option v-for="s in taskStatuses" :key="s" :value="s">{{ s }}</a-select-option>
              </a-select>
              <a-button
                type="primary"
                size="small"
                :loading="genLoadingId === record.id"
                :disabled="(record._sub_total || 0) >= (record.order_quantity || 0)"
                @click.stop="generateSubOrders(record)"
                class="gen-btn"
              >
                <ThunderboltOutlined /> 生成
              </a-button>
              <a-button size="small" class="copy-sub-btn" @click.stop="openCopyModal(record)">
                <CopyOutlined /> 复制
              </a-button>
              <a-button size="small" @click.stop="() => openAppendModal(record)">
                追加订单
              </a-button>
              <a-popconfirm v-if="canDeleteTask(record)" title="确定删除此任务吗?" @confirm="deleteTask(record.id)">
                <a-button size="small" type="text" class="icon-btn danger-btn"><DeleteOutlined /></a-button>
              </a-popconfirm>
            </div>
          </div>

          <div v-if="expandedRowKeys.includes(record.id)" class="sub-orders-panel">
            <div class="sub-orders-header">
              <span class="sub-orders-title">子订单列表（{{ subOrdersMap[record.id]?.length || 0 }} / {{ record.order_quantity }} 单）</span>
              <div v-if="subOrdersMap[record.id]?.length" class="sub-orders-header-actions">
                <a-checkbox
                  :checked="isAllSubSelected(record.id)"
                  :indeterminate="isSubSelectionIndeterminate(record.id)"
                  :disabled="getSelectableSubCount(record.id) === 0"
                  @change="(e: any) => toggleAllSubSelection(record.id, e.target.checked)"
                >
                  全选未匹配买手
                </a-checkbox>
                <span v-if="getSelectedSubCount(record.id) > 0" class="sub-orders-selected">
                  已选 {{ getSelectedSubCount(record.id) }} 条
                </span>
                <span v-else class="sub-orders-eligible">可选 {{ getSelectableSubCount(record.id) }} 条</span>
                <a-button size="small" :disabled="getSelectedSubCount(record.id) === 0" @click="openBatchEdit(record)">
                  批量修改 ({{ getSelectedSubCount(record.id) }})
                </a-button>
              </div>
            </div>

            <div v-if="getTaskStatusTimeline(record).length" class="task-status-history">
              <div class="task-status-history-title">状态记录</div>
              <div class="task-status-history-list">
                <div
                  v-for="item in getTaskStatusTimeline(record)"
                  :key="item.key"
                  class="task-status-history-item"
                >
                  <div class="task-status-history-main">
                    <template v-if="item.kind === 'created'">
                      <span class="task-status-history-text">创建任务</span>
                    </template>
                    <template v-else>
                      <a-tag :color="getStatusColor(item.to_status)" size="small">{{ item.to_status || '未知状态' }}</a-tag>
                      <span class="task-status-history-text">
                        {{ item.from_status || '初始状态' }} -> {{ item.to_status || '未知状态' }}
                      </span>
                    </template>
                  </div>
                  <div class="task-status-history-meta">
                    <span>{{ fmtTime(item.changed_at) }}</span>
                    <span v-if="item.reason">原因：{{ item.reason }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- 排期一览 -->
            <div v-if="schedulesMap[record.id]?.length" class="schedules-preview">
              <div class="schedules-preview-title">排期一览</div>
              <div class="schedules-preview-list">
                <div
                  v-for="s in schedulesMap[record.id]"
                  :key="s.id"
                  class="schedule-preview-card"
                >
                  <div class="spc-date">{{ s.schedule_date }}</div>
                  <div class="spc-qty">{{ s.quantity }}单</div>
                  <div class="spc-types">
                    <span
                      v-for="t in (s.order_types && s.order_types.length ? s.order_types : (s.keywords || []).slice(0,0))"
                      :key="t"
                      class="spc-type-badge"
                      :style="{ background: getOrderTypeBg(t), color: getOrderTypeTextColor(t) }"
                    >{{ formatReviewType(t) }}</span>
                    <span v-if="!s.order_types || s.order_types.length === 0" class="spc-type-none">未指定类型</span>
                  </div>
                  <div v-if="s.keywords && s.keywords.length" class="spc-keywords">
                    <span v-for="kw in s.keywords" :key="kw" class="spc-kw">{{ kw }}</span>
                  </div>
                </div>
              </div>
            </div>

            <a-table
              v-if="subOrdersMap[record.id]?.length"
              :columns="subColumns"
              :data-source="subOrdersMap[record.id]"
              :row-selection="getSubRowSelection(record.id)"
              :pagination="false"
              row-key="id"
              size="small"
              :scroll="{ x: 1860 }"
              style="margin-top:10px"
            >
              <template #bodyCell="{ column, record: sub }">
                <template v-if="column.key === 'sub_no'">
                  <span class="sub-no">{{ sub.sub_order_number }}</span>
                </template>
                <template v-if="column.key === 'sub_asin'">
                  <div class="editable-cell editable-cell-stack" @click="openQuickEdit(sub, 'asin')">
                    <div class="asin-code">{{ sub.asin || '—' }}</div>
                    <EditOutlined class="kw-edit-icon" />
                  </div>
                </template>
                <template v-if="column.key === 'sub_keyword'">
                  <div class="kw-cell" @click="openKwEdit(sub)">
                    <template v-if="sub.keyword_type === 'link'">
                      <a-tag color="cyan" size="small" style="cursor:pointer">
                        <LinkOutlined /> 链接
                      </a-tag>
                    </template>
                    <template v-else-if="sub.keyword">
                      <span class="keyword-tag" style="cursor:pointer">{{ sub.keyword }}</span>
                    </template>
                    <template v-else>
                      <span class="text-gray kw-empty" style="cursor:pointer">点击设置</span>
                    </template>
                    <EditOutlined class="kw-edit-icon" />
                  </div>
                </template>
                <template v-if="column.key === 'sub_scheduled'">
                  <div class="editable-cell" @click="openQuickEdit(sub, 'scheduled_date')">
                    <span v-if="sub.scheduled_date" :class="isOverdue(sub.scheduled_date) ? 'date-overdue' : 'date-normal'">
                      {{ sub.scheduled_date }}
                    </span>
                    <span v-else class="text-gray">—</span>
                    <EditOutlined class="kw-edit-icon" />
                  </div>
                </template>
                <template v-if="column.key === 'sub_type_level'">
                  <div class="editable-cell editable-cell-stack" @click="openQuickEdit(sub, 'review_type')">
                    <a-tag v-if="formatReviewType(sub.review_type || sub.order_type)" :color="getOrderTypeTagColor(sub.review_type || sub.order_type)" size="small">
                      {{ formatReviewType(sub.review_type || sub.order_type) }}
                    </a-tag>
                    <a-tag v-if="sub.review_level" :color="getReviewLevelTagColor(sub.review_level)" size="small">
                      {{ sub.review_level }}
                    </a-tag>
                    <span v-if="!formatReviewType(sub.review_type || sub.order_type) && !sub.review_level" class="text-gray">—</span>
                    <EditOutlined class="kw-edit-icon" />
                  </div>
                </template>
                <template v-if="column.key === 'sub_staff_buyer'">
                  <div class="info-stack-cell">
                    <div><span class="info-stack-label">业务员</span>{{ sub.staff_name || '未分配' }}</div>
                    <div><span class="info-stack-label">买手</span>{{ sub.buyer_name || '—' }}</div>
                  </div>
                </template>
                <template v-if="column.key === 'sub_order_upload'">
                  <div class="info-stack-cell">
                    <div>
                      <span class="info-stack-label">订单号</span>
                      <span v-if="sub.amazon_order_id" class="order-num-sm">{{ sub.amazon_order_id }}</span>
                      <span v-else class="text-gray">—</span>
                    </div>
                    <div>
                      <span class="info-stack-label">上传</span>
                      <span class="created-at-text">{{ fmtTime(getSubUploadTime(sub)) }}</span>
                    </div>
                  </div>
                </template>
                <template v-if="column.key === 'sub_price_paid_refund'">
                  <div class="price-pair-cell editable-cell-stack" @click="openQuickEdit(sub, 'product_price')">
                    <div class="price-pair-row">
                      <span class="price-pair-label">售价</span>
                      <span class="price-text">${{ Number(sub.product_price || 0).toFixed(2) }}</span>
                      <EditOutlined class="kw-edit-icon" />
                    </div>
                    <div class="price-pair-row">
                      <span class="price-pair-label">实付</span>
                      <span v-if="sub.actual_paid != null" class="price-text actual-paid-text">${{ Number(sub.actual_paid).toFixed(2) }}</span>
                      <span v-else class="text-gray">—</span>
                    </div>
                    <div class="price-pair-row">
                      <span class="price-pair-label">实返</span>
                      <span v-if="sub.refund_amount != null" class="refund-amount refund-actual">¥{{ Number(sub.refund_amount).toFixed(2) }}</span>
                      <span v-else class="text-gray">—</span>
                    </div>
                  </div>
                </template>
                <template v-if="column.key === 'sub_refund_info'">
                  <div class="refund-status-cell">
                    <a-tag v-if="normalizeRefundStatus(sub.refund_status)" :color="getRefundStatusTagColor(sub.refund_status)" size="small">
                      {{ normalizeRefundStatus(sub.refund_status) }}
                    </a-tag>
                    <span v-else class="text-gray">—</span>
                    <span v-if="sub.refund_method" class="refund-method-tag">方式：{{ sub.refund_method }}</span>
                    <span v-if="showPrincipalLossHint(sub)" class="principal-loss-hint">本金损失</span>
                  </div>
                </template>
                <template v-if="column.key === 'sub_progress'">
                  <a-tag :color="getSubStatusColor(getSubProgressLabel(sub))" size="small">{{ getSubProgressLabel(sub) }}</a-tag>
                </template>
                <template v-if="column.key === 'sub_order_status'">
                  <a-tag :color="getSubOrderStatusColor(sub.order_status)" size="small">{{ sub.order_status || '正常' }}</a-tag>
                </template>
                <template v-if="column.key === 'sub_notes'">
                  <span v-if="getSubRemark(sub)" class="notes-text" :title="getSubRemark(sub)">{{ getSubRemark(sub) }}</span>
                  <span v-else class="text-gray">—</span>
                </template>
                <template v-if="column.key === 'sub_action'">
                  <a-space>
                    <a-button type="link" size="small" @click="openDetail(sub, record.id)">详情</a-button>
                    <a-popconfirm title="确定删除这条子订单吗?" @confirm="deleteSubOrder(sub.id, record.id)">
                      <a-button type="link" size="small" danger>删除</a-button>
                    </a-popconfirm>
                  </a-space>
                </template>
              </template>
            </a-table>
            <div v-else class="no-sub-orders">暂无子订单，点击「生成」按钮批量生成</div>
          </div>
        </div>

        <div v-if="tasks.length === 0" class="empty-list">
          <a-empty description="暂无任务数据" />
        </div>
      </div>

      <div class="pagination-wrap">
        <a-pagination
          v-model:current="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          show-size-changer
          :page-size-options="['10','20','50']"
          @change="onPageChange"
          @show-size-change="onPageChange"
        />
      </div>
    </div>

    <a-drawer
      v-model:open="taskDetailOpen"
      :title="`任务详情 - ${currentTaskDetail?.order_number || ''}`"
      width="760"
      placement="right"
    >
      <template v-if="currentTaskDetail">
        <div class="task-drawer-header">
          <div class="task-drawer-product">
            <div class="task-drawer-img-wrap">
              <img
                v-if="currentTaskDetail.product_image"
                :src="currentTaskDetail.product_image"
                class="task-drawer-img"
                referrerpolicy="no-referrer"
                @error="onImgError($event)"
              />
              <div v-else class="task-drawer-img-placeholder"><PictureOutlined /></div>
            </div>
            <div>
              <div v-if="currentTaskDetail.product_name" class="task-drawer-product-name">{{ currentTaskDetail.product_name }}</div>
              <div class="task-drawer-asin">{{ currentTaskDetail.asin || '—' }}</div>
              <div class="task-drawer-store">{{ currentTaskDetail.store_name || '—' }}</div>
              <div class="task-drawer-tag-row">
                <a-tag :color="getStatusColor(currentTaskDetail.status)">{{ currentTaskDetail.status || '待分配' }}</a-tag>
                <a-tag color="default">{{ currentTaskDetail.country || '—' }}</a-tag>
                <template v-for="item in getTaskTypeRows(currentTaskDetail)" :key="item.type">
                  <a-tag :color="getOrderTypeColor(item.type)">{{ item.type }}</a-tag>
                </template>
              </div>
            </div>
          </div>
        </div>

        <a-divider style="margin: 16px 0" />

        <a-descriptions :column="2" bordered size="small">
          <a-descriptions-item label="任务编号" :span="2">
            <span class="task-drawer-order-num">{{ currentTaskDetail.order_number || '—' }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="产品名称" :span="2">{{ currentTaskDetail.product_name || '-' }}</a-descriptions-item>
          <a-descriptions-item label="ASIN">{{ currentTaskDetail.asin || '-' }}</a-descriptions-item>
          <a-descriptions-item label="店铺">{{ currentTaskDetail.store_name || '-' }}</a-descriptions-item>
          <a-descriptions-item label="品牌">{{ currentTaskDetail.brand_name || '-' }}</a-descriptions-item>
          <a-descriptions-item label="国家">{{ currentTaskDetail.country || '-' }}</a-descriptions-item>
          <a-descriptions-item label="测评等级">{{ currentTaskDetail.review_level || '-' }}</a-descriptions-item>
          <a-descriptions-item label="类目">{{ currentTaskDetail.category || '-' }}</a-descriptions-item>
          <a-descriptions-item label="下单类型">
            <div class="task-drawer-type-list">
              <template v-for="item in getTaskTypeRows(currentTaskDetail)" :key="item.type">
                <div class="task-drawer-type-row">
                  <a-tag :color="getOrderTypeColor(item.type)" size="small">{{ item.type }}</a-tag>
                  <span class="task-drawer-type-qty">&times;{{ item.qty }}</span>
                </div>
              </template>
              <span v-if="getTaskTypeRows(currentTaskDetail).length === 0">-</span>
            </div>
          </a-descriptions-item>
          <a-descriptions-item label="任务状态">
            <a-tag :color="getStatusColor(currentTaskDetail.status)">{{ currentTaskDetail.status || '待分配' }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="任务数量">{{ currentTaskDetail.order_quantity || 0 }}</a-descriptions-item>
          <a-descriptions-item label="已生成子订单">{{ currentTaskDetail._sub_total || 0 }}</a-descriptions-item>
          <a-descriptions-item label="已下单">{{ currentTaskDetail._ordered_count || 0 }}</a-descriptions-item>
          <a-descriptions-item label="已留评">{{ currentTaskDetail._review_count || 0 }}</a-descriptions-item>
          <a-descriptions-item label="买手匹配">{{ currentTaskDetail._scheduled_count || 0 }}</a-descriptions-item>
          <a-descriptions-item label="排期天数">{{ currentTaskDetail._schedule_days || 0 }}</a-descriptions-item>
          <a-descriptions-item label="变体信息">{{ getTaskVariantText(currentTaskDetail) }}</a-descriptions-item>
          <a-descriptions-item label="对接商务">{{ currentTaskDetail.sales_person || '-' }}</a-descriptions-item>
          <a-descriptions-item label="客户名称">{{ currentTaskDetail.customer_name || '-' }}</a-descriptions-item>
          <a-descriptions-item label="创建时间">{{ fmtTime(currentTaskDetail.created_at) }}</a-descriptions-item>
          <a-descriptions-item label="备注" :span="2">{{ currentTaskDetail.notes || '-' }}</a-descriptions-item>
        </a-descriptions>

        <a-divider style="margin: 20px 0 16px" />
        <div class="task-drawer-section-title">状态变更记录</div>
        <div class="task-drawer-timeline">
          <div
            v-for="item in getTaskStatusJourney(currentTaskDetail)"
            :key="item.key"
            class="task-drawer-timeline-item"
          >
            <div class="task-drawer-timeline-axis">
              <span class="task-drawer-timeline-dot"></span>
              <span class="task-drawer-timeline-line"></span>
            </div>
            <div class="task-drawer-timeline-content">
              <div class="task-drawer-timeline-title">
                <template v-if="item.kind === 'created'">
                  创建任务
                </template>
                <template v-else>
                  状态由「{{ item.from_status || '初始状态' }}」变更为「{{ item.to_status || '未知状态' }}」
                </template>
              </div>
              <div class="task-drawer-timeline-meta">
                <span>{{ fmtTime(item.changed_at) }}</span>
                <span v-if="item.reason">原因：{{ item.reason }}</span>
              </div>
            </div>
          </div>
        </div>

        <a-divider style="margin: 20px 0 16px" />
        <div class="task-drawer-section-title">修改记录</div>
        <div v-if="getTaskEditHistory(currentTaskDetail).length" class="task-drawer-timeline">
          <div
            v-for="item in getTaskEditHistory(currentTaskDetail)"
            :key="item.key"
            class="task-drawer-timeline-item"
          >
            <div class="task-drawer-timeline-axis">
              <span class="task-drawer-timeline-dot edit"></span>
              <span class="task-drawer-timeline-line"></span>
            </div>
            <div class="task-drawer-timeline-content">
              <div class="task-drawer-timeline-title">
                {{ item.staff_name || '任务管理' }}修改了 {{ item.changes.length }} 项信息
              </div>
              <div class="task-drawer-timeline-meta">
                <span>{{ fmtTime(item.changed_at) }}</span>
                <span>剩余 {{ item.affected_sub_count || 0 }} 单子订单被修改了</span>
              </div>
              <ul class="task-drawer-edit-list">
                <li v-for="(change, index) in item.changes" :key="`${item.key}-${index}`">
                  {{ formatTaskEdit(change) }}
                </li>
              </ul>
            </div>
          </div>
        </div>
        <a-empty v-else description="暂无修改记录" />

        <a-divider style="margin: 20px 0 16px" />
        <div class="task-drawer-section-title">反馈状态</div>
        <div class="task-drawer-feedback-panel">
          <div class="task-drawer-feedback-row">
            <span class="task-drawer-feedback-key">订单反馈：</span>
            <a-tag :color="currentTaskDetail.order_feedback_status === '已反馈' ? 'green' : 'default'">
              {{ currentTaskDetail.order_feedback_status || '未反馈' }}
            </a-tag>
            <span v-if="currentTaskDetail.order_feedback_date" class="task-drawer-feedback-date">
              {{ currentTaskDetail.order_feedback_date }}
            </span>
          </div>
          <div class="task-drawer-feedback-row">
            <span class="task-drawer-feedback-key">评论反馈：</span>
            <a-tag :color="currentTaskDetail.review_feedback_status === '已反馈' ? 'green' : 'default'">
              {{ currentTaskDetail.review_feedback_status || '未反馈' }}
            </a-tag>
            <span v-if="currentTaskDetail.review_feedback_date" class="task-drawer-feedback-date">
              {{ currentTaskDetail.review_feedback_date }}
            </span>
          </div>
          <div v-if="currentTaskDetail.feedback_notes" class="task-drawer-feedback-row">
            <span class="task-drawer-feedback-key">反馈备注：</span>
            <span class="task-drawer-feedback-notes">{{ currentTaskDetail.feedback_notes }}</span>
          </div>
        </div>
      </template>
    </a-drawer>

    <!-- 排期详情弹窗 -->
    <a-modal
      v-model:open="scheduleModalOpen"
      :title="`排期详情 — ${scheduleModalOrder?.order_number || ''}`"
      :footer="null"
      width="640px"
    >
      <div v-if="scheduleModalOrder" class="sched-modal-body">
        <div class="sched-modal-meta">
          <span class="sched-meta-item">总量：<b>{{ scheduleModalOrder.order_quantity }}</b> 单</span>
          <span class="sched-meta-item">
            每日单数：
            <template v-if="(scheduleModalOrder.fixed_daily_orders || 0) > 0">
              <span class="sched-fixed-badge">固定 {{ scheduleModalOrder.fixed_daily_orders }} 单/天</span>
            </template>
            <template v-else-if="(scheduleModalOrder.new_daily_orders || 0) > 0">
              <span class="sched-flex-badge">灵活排单</span>
            </template>
            <template v-else>
              <span class="text-gray">未设置</span>
            </template>
          </span>
          <span class="sched-meta-item">排期天数：<b>{{ scheduleModalSchedules.length }}</b> 天</span>
        </div>
        <div v-if="scheduleModalLoading" class="sched-loading"><a-spin /></div>
        <div v-else-if="scheduleModalSchedules.length === 0" class="sched-empty">暂无排期数据</div>
        <div v-else class="sched-list">
          <div v-for="s in scheduleModalSchedules" :key="s.id" class="sched-row">
            <div class="sched-row-date">
              <span :class="isOverdue(s.schedule_date) ? 'sched-date-overdue' : 'sched-date-normal'">{{ s.schedule_date }}</span>
            </div>
            <div class="sched-row-qty">
              <span class="sched-qty-badge">{{ s.quantity }} 单</span>
            </div>
            <div class="sched-row-types">
              <span
                v-for="t in (s.order_types && s.order_types.length ? s.order_types : [])"
                :key="t"
                class="spc-type-badge"
                :style="{ background: getOrderTypeBg(t), color: getOrderTypeTextColor(t) }"
              >{{ formatReviewType(t) }}</span>
              <span v-if="!s.order_types || s.order_types.length === 0" class="text-gray" style="font-size:11px">未指定类型</span>
            </div>
            <div class="sched-row-kws">
              <span v-for="kw in (s.keywords || [])" :key="kw" class="sched-kw-tag">{{ kw }}</span>
            </div>
          </div>
        </div>
      </div>
    </a-modal>

    <!-- 关键词/链接编辑弹窗 -->
    <a-modal
      v-model:open="kwEditOpen"
      title="修改关键词 / 链接"
      @ok="saveKwEdit"
      :confirm-loading="kwEditSaving"
      ok-text="保存"
      cancel-text="取消"
      width="460px"
    >
      <div class="kw-edit-modal-body">
        <div class="kw-edit-sub-no" v-if="kwEditRecord">子单号：{{ kwEditRecord.sub_order_number }}</div>
        <div class="kw-edit-mode-row">
          <span class="kw-edit-label">类型：</span>
          <div class="kw-mode-toggle">
            <span :class="['kw-mode-btn', kwEditMode === 'keyword' ? 'active' : '']" @click="kwEditMode = 'keyword'">关键词搜索</span>
            <span :class="['kw-mode-btn', kwEditMode === 'link' ? 'active kw-mode-link' : '']" @click="kwEditMode = 'link'">操作链接</span>
          </div>
        </div>
        <div class="kw-edit-input-row">
          <span class="kw-edit-label">{{ kwEditMode === 'keyword' ? '关键词：' : '链接：' }}</span>
          <a-input
            v-model:value="kwEditValue"
            :placeholder="kwEditMode === 'keyword' ? '输入搜索关键词' : '粘贴操作链接 (https://...)'"
            allow-clear
            style="flex:1"
          />
        </div>
        <div v-if="kwEditMode === 'link' && kwEditValue" class="kw-link-preview">
          <a :href="kwEditValue" target="_blank" rel="noopener noreferrer">预览链接</a>
        </div>
      </div>
    </a-modal>

    <!-- 单字段快捷编辑弹窗 -->
    <a-modal
      v-model:open="quickEditOpen"
      :title="`修改${quickEditMeta?.label || ''}`"
      @ok="saveQuickEdit"
      :confirm-loading="quickEditSaving"
      ok-text="保存"
      cancel-text="取消"
      width="420px"
    >
      <div class="kw-edit-modal-body">
        <div class="kw-edit-sub-no" v-if="quickEditRecord">子单号：{{ quickEditRecord.sub_order_number }}</div>
        <div class="kw-edit-input-row" v-if="quickEditMeta">
          <span class="kw-edit-label">{{ quickEditMeta.label }}：</span>
          <a-input
            v-if="quickEditMeta.type === 'text'"
            v-model:value="quickEditValue"
            :placeholder="`输入${quickEditMeta.label}`"
            allow-clear
            style="flex:1"
          />
          <a-select
            v-else-if="quickEditMeta.type === 'select'"
            v-model:value="quickEditValue"
            :placeholder="`选择${quickEditMeta.label}`"
            allow-clear
            style="flex:1"
          >
            <a-select-option v-for="opt in quickEditMeta.options || []" :key="opt" :value="opt">{{ opt }}</a-select-option>
          </a-select>
          <input
            v-else-if="quickEditMeta.type === 'date'"
            v-model="quickEditValue"
            type="date"
            class="bme-date-input"
            style="flex:1;width:auto"
          />
          <a-input-number
            v-else-if="quickEditMeta.type === 'number'"
            v-model:value="quickEditValue"
            :min="0"
            :precision="2"
            :controls="false"
            :placeholder="`输入${quickEditMeta.label}`"
            style="flex:1"
          />
        </div>
      </div>
    </a-modal>

    <!-- 追加订单弹窗 -->
    <a-modal
      v-model:open="appendModalOpen"
      title="追加订单"
      width="920px"
      ok-text="确认追加"
      cancel-text="取消"
      :confirm-loading="appendSaving"
      :destroy-on-close="true"
      @ok="saveAppendOrders"
      @cancel="resetAppendModal"
    >
      <div v-if="appendSourceTask" class="append-modal-body">
        <div class="append-modal-summary">
          <div class="append-modal-order">任务：{{ appendSourceTask.order_number || '—' }}</div>
          <div class="append-modal-count-row">
            <span class="append-modal-label">增加几单</span>
            <a-input-number
              v-model:value="appendCount"
              :min="1"
              :precision="0"
              :controls="true"
              @change="handleAppendCountChange"
            />
          </div>
        </div>
        <div class="append-modal-hint">
          默认沿用主任务信息，可逐条调整新增子订单明细后再提交。
        </div>
        <div class="append-batch-card">
          <div class="append-batch-header">
            <div class="append-batch-title">批量填写</div>
            <a-space>
              <a-button size="small" @click="fillAppendBatchFromFirstRow">读取第 1 单内容</a-button>
              <a-button type="primary" size="small" @click="applyAppendBatchToAll">应用到全部新增单</a-button>
            </a-space>
          </div>
          <div class="append-grid">
            <div class="append-field">
              <label>排单日期</label>
              <input v-model="appendBatchForm.scheduled_date" type="date" class="bme-date-input append-date-input" />
            </div>
            <div class="append-field">
              <label>ASIN</label>
              <a-input v-model:value="appendBatchForm.asin" placeholder="输入 ASIN" allow-clear />
            </div>
            <div class="append-field">
              <label>测评类型</label>
              <a-select v-model:value="appendBatchForm.review_type" placeholder="选择测评类型" allow-clear>
                <a-select-option v-for="opt in reviewTypeOptions" :key="opt" :value="opt">{{ opt }}</a-select-option>
              </a-select>
            </div>
            <div class="append-field">
              <label>测评等级</label>
              <a-select v-model:value="appendBatchForm.review_level" placeholder="选择测评等级" allow-clear>
                <a-select-option v-for="opt in ['普通', '高等', '极高等']" :key="opt" :value="opt">{{ opt }}</a-select-option>
              </a-select>
            </div>
            <div class="append-field">
              <label>产品售价</label>
              <a-input-number
                v-model:value="appendBatchForm.product_price"
                :min="0"
                :precision="2"
                :controls="false"
                style="width: 100%"
                placeholder="输入产品售价"
              />
            </div>
            <div class="append-field append-field-span-2">
              <label>关键词/链接</label>
              <a-input v-model:value="appendBatchForm.keyword_or_link" placeholder="输入关键词或粘贴链接" allow-clear />
            </div>
            <div class="append-field append-field-span-3">
              <label>任务备注</label>
              <a-input v-model:value="appendBatchForm.task_notes" placeholder="输入任务备注" allow-clear />
            </div>
          </div>
        </div>
        <div class="append-card-list">
          <div v-for="(row, index) in appendRows" :key="row.key" class="append-card">
            <div class="append-card-title">追加单 {{ index + 1 }}</div>
            <div class="append-grid">
              <div class="append-field">
                <label>排单日期</label>
                <input v-model="row.scheduled_date" type="date" class="bme-date-input append-date-input" />
              </div>
              <div class="append-field">
                <label>ASIN</label>
                <a-input v-model:value="row.asin" placeholder="输入 ASIN" allow-clear />
              </div>
              <div class="append-field">
                <label>测评类型</label>
                <a-select v-model:value="row.review_type" placeholder="选择测评类型" allow-clear>
                  <a-select-option v-for="opt in reviewTypeOptions" :key="opt" :value="opt">{{ opt }}</a-select-option>
                </a-select>
              </div>
              <div class="append-field">
                <label>测评等级</label>
                <a-select v-model:value="row.review_level" placeholder="选择测评等级" allow-clear>
                  <a-select-option v-for="opt in ['普通', '高等', '极高等']" :key="opt" :value="opt">{{ opt }}</a-select-option>
                </a-select>
              </div>
              <div class="append-field">
                <label>产品售价</label>
                <a-input-number
                  v-model:value="row.product_price"
                  :min="0"
                  :precision="2"
                  :controls="false"
                  style="width: 100%"
                  placeholder="输入产品售价"
                />
              </div>
              <div class="append-field append-field-span-2">
                <label>关键词/链接</label>
                <a-input v-model:value="row.keyword_or_link" placeholder="输入关键词或粘贴链接" allow-clear />
              </div>
              <div class="append-field append-field-span-3">
                <label>任务备注</label>
                <a-input v-model:value="row.task_notes" placeholder="输入任务备注" allow-clear />
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-modal>

    <!-- 子订单详情/编辑弹窗 -->
    <a-modal
      v-model:open="detailOpen"
      :title="editMode ? '编辑子订单' : '子订单详情'"
      :footer="null"
      width="860px"
      :body-style="{ padding: '0' }"
      :destroy-on-close="true"
    >
      <div v-if="detailRecord" class="detail-modal-body">
        <div class="detail-header">
          <div class="detail-sub-number">{{ detailRecord.sub_order_number }}</div>
          <a-tag :color="getSubStatusColor(detailRecord.status)">{{ detailRecord.status || '待分配' }}</a-tag>
          <div style="flex:1"></div>
          <a-button v-if="!editMode" type="primary" size="small" @click="startEdit"><EditOutlined /> 编辑</a-button>
          <template v-else>
            <a-button type="primary" size="small" :loading="saveLoading" @click="saveDetail"><SaveOutlined /> 保存</a-button>
            <a-button size="small" style="margin-left:8px" @click="cancelEdit">取消</a-button>
          </template>
        </div>

        <div class="detail-sections">
          <!-- 订单状态 -->
          <div class="detail-section">
            <div class="detail-section-title">订单状态</div>
            <div class="detail-grid">
              <div class="detail-item">
                <label>状态</label>
                <template v-if="editMode">
                  <a-select v-model:value="editForm.status" size="small" style="width:100%">
                    <a-select-option v-for="s in subStatuses" :key="s" :value="s">{{ s }}</a-select-option>
                  </a-select>
                </template>
                <a-tag v-else :color="getSubStatusColor(detailRecord.status)">{{ detailRecord.status || '待分配' }}</a-tag>
              </div>
              <div class="detail-item">
                <label>排期日期</label>
                <template v-if="editMode">
                  <a-input v-model:value="editForm.scheduled_date" size="small" placeholder="YYYY-MM-DD" />
                </template>
                <span v-else :class="detailRecord.scheduled_date && isOverdue(detailRecord.scheduled_date) ? 'date-overdue' : 'date-normal'">{{ detailRecord.scheduled_date || '—' }}</span>
              </div>
              <div class="detail-item">
                <label>亚马逊订单号</label>
                <template v-if="editMode">
                  <a-input v-model:value="editForm.amazon_order_id" size="small" placeholder="亚马逊订单号" />
                </template>
                <span v-else class="mono">{{ detailRecord.amazon_order_id || '—' }}</span>
              </div>
            </div>
          </div>

          <!-- 产品信息 -->
          <div class="detail-section">
            <div class="detail-section-title">产品信息</div>
            <div class="detail-grid">
              <div class="detail-item" v-if="detailRecord.product_image">
                <label>产品图片</label>
                <div><img :src="detailRecord.product_image" class="detail-product-img" referrerpolicy="no-referrer" @error="onImgError($event)" /></div>
              </div>
              <div class="detail-item"><label>ASIN</label><span class="mono">{{ detailRecord.asin || '—' }}</span></div>
              <div class="detail-item"><label>产品名称</label><span>{{ detailRecord.product_name || '—' }}</span></div>
              <div class="detail-item"><label>品牌名称</label><span>{{ detailRecord.brand_name || '—' }}</span></div>
              <div class="detail-item"><label>店铺名称</label><span>{{ detailRecord.store_name || '—' }}</span></div>
              <div class="detail-item"><label>国家/站点</label><span>{{ detailRecord.country || '—' }}</span></div>
              <div class="detail-item"><label>类目</label><span>{{ detailRecord.category || '—' }}</span></div>
              <div class="detail-item">
                <label>变参信息</label>
                <template v-if="editMode">
                  <a-input v-model:value="editForm.variant_info" size="small" placeholder="变参信息" />
                </template>
                <span v-else>{{ detailRecord.variant_info || '—' }}</span>
              </div>
            </div>
          </div>

          <!-- 订单信息 -->
          <div class="detail-section">
            <div class="detail-section-title">订单信息</div>
            <div class="detail-grid">
              <div class="detail-item">
                <label>测评类型</label>
                <template v-if="editMode">
                  <a-select v-model:value="editForm.review_type" size="small" style="width:100%" allow-clear placeholder="选择测评类型">
                    <a-select-option v-for="s in reviewTypeOptions" :key="s" :value="s">{{ s }}</a-select-option>
                  </a-select>
                </template>
                <span v-else>{{ formatReviewType(detailRecord.review_type || detailRecord.order_type) || '—' }}</span>
              </div>
              <div class="detail-item"><label>评价等级</label><span>{{ detailRecord.review_level || '—' }}</span></div>
              <div class="detail-item">
                <label>关键词</label>
                <template v-if="editMode">
                  <a-input v-model:value="editForm.keyword" size="small" placeholder="搜索关键词" />
                </template>
                <span v-else class="keyword-highlight">{{ detailRecord.keyword || '—' }}</span>
              </div>
            </div>
          </div>

          <!-- 人员信息 -->
          <div class="detail-section">
            <div class="detail-section-title">客户 / 人员</div>
            <div class="detail-grid">
              <div class="detail-item"><label>客户名称</label><span>{{ detailRecord.customer_name || '—' }}</span></div>
              <div class="detail-item"><label>客户ID</label><span class="mono">{{ detailRecord.customer_id_str || '—' }}</span></div>
              <div class="detail-item"><label>销售人员</label><span>{{ detailRecord.sales_person || '—' }}</span></div>
              <div class="detail-item">
                <label>业务员</label>
                <template v-if="editMode">
                  <a-input v-model:value="editForm.staff_name" size="small" placeholder="业务员姓名" />
                </template>
                <span v-else>{{ detailRecord.staff_name || '未分配' }}</span>
              </div>
              <div class="detail-item">
                <label>买手</label>
                <template v-if="editMode">
                  <a-input v-model:value="editForm.buyer_name" size="small" placeholder="买手姓名" />
                </template>
                <span v-else>{{ detailRecord.buyer_name || '未分配' }}</span>
              </div>
            </div>
          </div>

          <!-- 退款信息 -->
          <div class="detail-section">
            <div class="detail-section-title">退款信息</div>
            <div class="detail-grid">
              <div class="detail-item">
                <label>退款状态</label>
                <template v-if="editMode">
                  <a-select v-model:value="editForm.refund_status" size="small" style="width:100%" allow-clear placeholder="无退款">
                    <a-select-option v-for="s in refundStatuses" :key="s" :value="s">{{ s }}</a-select-option>
                  </a-select>
                </template>
                <template v-else>
                  <div class="refund-status-cell">
                    <a-tag v-if="detailRecord.refund_status" :color="getRefundStatusTagColor(detailRecord.refund_status)">{{ normalizeRefundStatus(detailRecord.refund_status) }}</a-tag>
                    <span v-else class="text-gray">—</span>
                    <span v-if="showPrincipalLossHint(detailRecord)" class="principal-loss-hint">本金损失</span>
                  </div>
                </template>
              </div>
              <div class="detail-item">
                <label>退款方式</label>
                <template v-if="editMode">
                  <a-input v-model:value="editForm.refund_method" size="small" placeholder="退款方式" />
                </template>
                <span v-else>{{ detailRecord.refund_method || '—' }}</span>
              </div>
              <div class="detail-item">
                <label>退款金额</label>
                <template v-if="editMode">
                  <a-input-number v-model:value="editForm.refund_amount" size="small" :min="0" :precision="2" prefix="¥" style="width:100%" />
                </template>
                <span v-else-if="detailRecord.refund_amount" class="refund-highlight">¥{{ Number(detailRecord.refund_amount).toFixed(2) }}</span>
                <span v-else class="text-gray">—</span>
              </div>
              <div class="detail-item">
                <label>退款日期</label>
                <template v-if="editMode">
                  <a-input v-model:value="editForm.refund_date" size="small" placeholder="YYYY-MM-DD" />
                </template>
                <span v-else>{{ detailRecord.refund_date || '—' }}</span>
              </div>
              <div class="detail-item">
                <label>退款顺序</label>
                <template v-if="editMode">
                  <a-input v-model:value="editForm.refund_sequence" size="small" placeholder="退款顺序" />
                </template>
                <span v-else>{{ detailRecord.refund_sequence || '—' }}</span>
              </div>
            </div>
          </div>

          <!-- 时间节点 -->
          <div class="detail-section">
            <div class="detail-section-title">时间节点</div>
            <div class="detail-grid">
              <div class="detail-item">
                <label>买手接单时间</label>
                <template v-if="editMode">
                  <a-input v-model:value="editForm.buyer_assigned_at" size="small" placeholder="YYYY-MM-DD HH:mm" />
                </template>
                <span v-else>{{ fmtTime(detailRecord.buyer_assigned_at) }}</span>
              </div>
              <div class="detail-item">
                <label>亚马逊下单时间</label>
                <template v-if="editMode">
                  <a-input v-model:value="editForm.amazon_order_placed_at" size="small" placeholder="YYYY-MM-DD HH:mm" />
                </template>
                <span v-else>{{ fmtTime(detailRecord.amazon_order_placed_at) }}</span>
              </div>
              <div class="detail-item">
                <label>收货确认时间</label>
                <template v-if="editMode">
                  <a-input v-model:value="editForm.delivery_confirmed_at" size="small" placeholder="YYYY-MM-DD HH:mm" />
                </template>
                <span v-else>{{ fmtTime(detailRecord.delivery_confirmed_at) }}</span>
              </div>
              <div class="detail-item">
                <label>留评提交时间</label>
                <template v-if="editMode">
                  <a-input v-model:value="editForm.review_submitted_at" size="small" placeholder="YYYY-MM-DD HH:mm" />
                </template>
                <span v-else>{{ fmtTime(detailRecord.review_submitted_at) }}</span>
              </div>
              <div class="detail-item"><label>创建时间</label><span>{{ fmtTime(detailRecord.created_at) }}</span></div>
              <div class="detail-item"><label>更新时间</label><span>{{ fmtTime(detailRecord.updated_at) }}</span></div>
            </div>
          </div>

          <!-- 备注信息 -->
          <div class="detail-section">
            <div class="detail-section-title">备注信息</div>
            <div class="detail-grid">
              <div class="detail-item detail-full">
                <label>订单备注</label>
                <template v-if="editMode">
                  <a-textarea v-model:value="editForm.notes" :rows="2" size="small" placeholder="备注内容" />
                </template>
                <span v-else>{{ detailRecord.notes || '—' }}</span>
              </div>
              <div class="detail-item detail-full">
                <label>任务备注</label>
                <template v-if="editMode">
                  <a-textarea v-model:value="editForm.task_notes" :rows="2" size="small" placeholder="任务备注" />
                </template>
                <span v-else>{{ detailRecord.task_notes || '—' }}</span>
              </div>
              <div class="detail-item detail-full" v-if="editMode || detailRecord.cancel_reason">
                <label>取消原因</label>
                <template v-if="editMode">
                  <a-input v-model:value="editForm.cancel_reason" size="small" placeholder="取消原因" />
                </template>
                <span v-else class="text-red">{{ detailRecord.cancel_reason }}</span>
              </div>
            </div>
          </div>

          <!-- 留评截图 -->
          <div class="detail-section">
            <div class="detail-section-title">留评截图</div>
            <div class="detail-grid">
              <div class="detail-item detail-full">
                <label>截图链接</label>
                <template v-if="editMode">
                  <a-input v-model:value="editForm.review_screenshot_url" size="small" placeholder="留评截图URL" />
                </template>
                <template v-else>
                  <div v-if="detailRecord.review_screenshot_url">
                    <img :src="detailRecord.review_screenshot_url" class="review-screenshot" referrerpolicy="no-referrer" @error="onImgError($event)" />
                  </div>
                  <span v-else class="text-gray">—</span>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-modal>

    <!-- 批量修改子订单弹窗 -->
    <a-modal
      v-model:open="editSubModalOpen"
      title="批量修改子订单"
      @ok="saveBatchEdit"
      :confirm-loading="editSubSaving"
      :ok-button-props="{ disabled: activeBatchEditFields.length === 0 }"
      ok-text="确认修改"
      cancel-text="取消"
      width="760px"
    >
      <div class="bme-wrap">
        <div class="bme-count-bar">
          已选 <strong>{{ currentBatchSelectedIds.length }}</strong> 条子订单，填写的内容会统一应用到本次选中的记录
        </div>
        <div class="bme-picker">
          <span class="bme-picker-label">选择要修改的字段：</span>
          <a-button
            v-for="field in inactiveBatchEditFields"
            :key="field.key"
            size="small"
            @click="activateBatchField(field.key)"
          >
            {{ field.label }}
          </a-button>
        </div>
        <div v-if="activeBatchEditFields.length" class="bme-fields">
          <div v-for="field in activeBatchEditFields" :key="field.key" class="bme-field-row">
            <div class="bme-field-label">{{ field.label }}</div>
            <div class="bme-field-input">
              <a-input
                v-if="field.type === 'text'"
                v-model:value="batchEditForm[field.key]"
                size="small"
                :placeholder="`输入新的${field.label}`"
                allow-clear
              />
              <a-select
                v-else-if="field.type === 'select'"
                v-model:value="batchEditForm[field.key]"
                size="small"
                :placeholder="`选择${field.label}`"
                style="width:100%"
                allow-clear
              >
                <a-select-option v-for="opt in field.options" :key="opt" :value="opt">{{ opt }}</a-select-option>
              </a-select>
              <input
                v-else-if="field.type === 'date'"
                v-model="batchEditForm[field.key]"
                type="date"
                class="bme-date-input bme-date-input-full"
              />
              <a-input-number
                v-else-if="field.type === 'number'"
                v-model:value="batchEditForm[field.key]"
                size="small"
                :min="0"
                :precision="2"
                :controls="false"
                style="width:100%"
                :placeholder="`输入新的${field.label}`"
              />
            </div>
            <a-button type="text" size="small" @click="deactivateBatchField(field.key)">移除</a-button>
          </div>
        </div>
        <div v-else class="bme-empty">请先选择要修改的字段</div>
        <div class="bme-preview">
          <span class="bme-preview-label">说明：</span>
          <template v-if="activeBatchEditFields.length">
            <a-tag v-for="field in activeBatchEditFields" :key="field.key" color="blue" size="small">
              {{ field.label }}
            </a-tag>
          </template>
          <span class="bme-preview-empty">未添加的字段不会修改；已添加字段留空时会清空对应值</span>
        </div>
      </div>
    </a-modal>

    <!-- 复制弹窗（复制主任务信息） -->
    <a-modal
      v-model:open="copyModalOpen"
      title="复制任务信息"
      width="560px"
      ok-text="复制到剪贴板"
      cancel-text="取消"
      @ok="doConfirmCopy"
    >
      <div class="copy-modal-body">
        <div class="copy-fields-label">选择要复制的字段（默认 ASIN 和订单号）：</div>
        <a-checkbox-group v-model:value="copyCheckedFields" class="copy-checkbox-group">
          <a-row :gutter="[8,8]">
            <a-col :span="12" v-for="f in copyFieldOptions" :key="f.key">
              <a-checkbox :value="f.key">{{ f.label }}</a-checkbox>
            </a-col>
          </a-row>
        </a-checkbox-group>
        <div v-if="copyPreviewText" class="copy-preview">
          <div class="copy-preview-label">预览：</div>
          <div class="copy-preview-text">{{ copyPreviewText }}</div>
        </div>
      </div>
    </a-modal>

    <a-modal
      v-model:open="taskStatusReasonModalOpen"
      :title="`修改任务状态为${pendingTaskStatus || ''}`"
      @ok="confirmTaskStatusChange"
      :confirm-loading="taskStatusSavingId === pendingTaskStatusRecord?.id"
      :ok-button-props="{ disabled: !pendingTaskStatusReason }"
      ok-text="确认修改"
      cancel-text="取消"
      width="460px"
    >
      <div class="status-reason-modal-body">
        <div v-if="pendingTaskStatusRecord" class="status-reason-modal-order">
          订单号：{{ pendingTaskStatusRecord.order_number }}
        </div>
        <div class="status-reason-modal-label">请选择{{ pendingTaskStatus }}原因</div>
        <a-select
          v-model:value="pendingTaskStatusReason"
          :options="currentTaskStatusReasonOptions.map(item => ({ label: item, value: item }))"
          placeholder="请选择原因"
          style="width:100%"
          show-search
        />
      </div>
    </a-modal>

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { message } from 'ant-design-vue'
import {
  ReloadOutlined, RightOutlined, ThunderboltOutlined,
  DeleteOutlined, EditOutlined, SaveOutlined, LinkOutlined, PictureOutlined, CopyOutlined
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

// ===== Tab =====
const activeTab = ref('tasks')
const ORDER_EDIT_HISTORY_STORAGE_KEY = 'task_management_order_edit_history_v1'
const ORDER_EDIT_HISTORY_SEED: Record<string, any[]> = {
  mock_order_pending_a: [
    {
      changed_at: '2026-04-14T10:30:00.000Z',
      staff_name: '任务管理',
      affected_sub_count: 2,
      changes: [
        { field: 'product_price', from: 15.99, to: 17.99 },
        { field: 'store_name', from: 'AAA', to: 'BBB' },
      ],
    },
  ],
}

// ===== 任务列表 =====
const loading = ref(false)
const tasks = ref<any[]>([])
const searchText = ref('')
const filterStatus = ref('进行中')
const filterCountry = ref('')
const pagination = ref({ current: 1, pageSize: 20, total: 0 })
const expandedRowKeys = ref<string[]>([])
const subOrdersMap = ref<Record<string, any[]>>({})
const genLoadingId = ref<string | null>(null)
const taskStatusSavingId = ref<string | null>(null)
const detailOpen = ref(false)
const detailRecord = ref<any>(null)
const detailOrderId = ref<string>('')
const editMode = ref(false)
const saveLoading = ref(false)
const editForm = ref<any>({})
const orderEditHistoryMap = ref<Record<string, any[]>>({})

const taskStatuses = ['待分配', '进行中', '已完成', '已截单', '暂停中']
const subStatuses = ['待分配', '已分配', '进行中', '已下单', '已留评', '已完成', '已取消']
const refundStatuses = ['未返款', '返款中', '已返款', 'On Hold', '返款失败', '无需返款', '失误多返']
const reviewTypeOptions = ['文字', '图片', '视频', '免评', 'Feedback']
const countries = ['美国', '德国', '英国', '加拿大']
const pauseStatusReasons = ['库存不足', '链接问题', '店铺问题', '计划调整', '风控预警', '不知原因']
const cutoffStatusReasons = ['未按计划做单', '库存不足', '链接问题', '店铺问题', '计划调整', '目标达成', '风控预警', '不知原因']

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
  { title: '订单状态', key: 'sub_order_status', width: 100 },
  { title: '订单备注', key: 'sub_notes', width: 160 },
  { title: '操作', key: 'sub_action', width: 80, fixed: 'right' as const },
]

const schedulesMap = ref<Record<string, any[]>>({})
const defaultVisibleTaskStatuses = ['待分配', '进行中', '已截单', '暂停中']
const taskDetailOpen = ref(false)
const currentTaskDetail = ref<any>(null)
const taskStatusReasonModalOpen = ref(false)
const pendingTaskStatusRecord = ref<any>(null)
const pendingTaskStatus = ref('')
const pendingTaskStatusReason = ref<string | undefined>(undefined)
const currentTaskStatusReasonOptions = computed(() => getTaskStatusReasonOptions(pendingTaskStatus.value))

function getStatusColor(status: string) {
  const map: Record<string, string> = { '待分配': 'default', '进行中': 'blue', '已完成': 'green', '已截单': 'red', '暂停中': 'orange' }
  return map[status] || 'default'
}

function isTaskStatusReasonRequired(status: string) {
  return status === '暂停中' || status === '已截单'
}

function getTaskStatusReasonOptions(status: string) {
  if (status === '暂停中') return pauseStatusReasons
  if (status === '已截单') return cutoffStatusReasons
  return []
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

function getReviewLevelColor(level: string) {
  const map: Record<string, string> = { '普通': 'default', '高等': 'blue', '极高等': 'gold' }
  return map[level] || 'default'
}

function getReviewLevelTagColor(level: string) {
  const map: Record<string, string> = { '普通': 'default', '高等': 'blue', '极高等': 'gold' }
  return map[level] || 'default'
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

function shouldInjectPrincipalLossMock(orderId: string) {
  return tasks.value.slice(0, 2).some((task: any) => task.id === orderId)
}

function showPrincipalLossHint(sub: any) {
  return normalizeRefundStatus(sub?.refund_status) === '已返款' && Boolean(sub?._mock_principal_loss)
}

function decorateSubOrdersForDisplay(orderId: string, rows: any[]) {
  const normalized = rows.map((row, index) => ({
    ...row,
    review_type: formatReviewType(row.review_type || row.order_type),
    refund_status: normalizeRefundStatus(row.refund_status),
    _mock_principal_loss: false,
    _display_index: index,
  }))
  if (!shouldInjectPrincipalLossMock(orderId)) return normalized
  let injected = 0
  return normalized.map((row) => {
    if (injected >= 3 || row.status === '已取消') return row
    injected += 1
    return {
      ...row,
      refund_status: '已返款',
      _mock_principal_loss: true,
      task_notes: row.task_notes || `Mock ${injected}: 已返款但出现本金损失提示`,
    }
  })
}

function getOrderTypeTagColor(t: string) {
  const map: Record<string, string> = { '文字': 'cyan', '图片': 'blue', '视频': 'geekblue', '免评': 'green', 'Feedback': 'gold' }
  return map[formatReviewType(t)] || 'default'
}

function getOrderTypeColor(t: string) {
  const map: Record<string, string> = { '免评': 'green', '文字': 'cyan', '图片': 'blue', '视频': 'geekblue', 'Feedback': 'gold' }
  return map[formatReviewType(t)] || 'default'
}

function getOrderTypeBg(t: string) {
  const map: Record<string, string> = { '免评': '#f0fdf4', '文字': '#eff6ff', '图片': '#f5f3ff', '视频': '#fef2f2', 'Feedback': '#fffbeb' }
  return map[formatReviewType(t)] || '#f3f4f6'
}

function getOrderTypeTextColor(t: string) {
  const map: Record<string, string> = { '免评': '#15803d', '文字': '#1d4ed8', '图片': '#7c3aed', '视频': '#b91c1c', 'Feedback': '#b45309' }
  return map[formatReviewType(t)] || '#374151'
}

async function loadSchedules(orderId: string) {
  if (schedulesMap.value[orderId]) return
  const { data } = await supabase
    .from('order_schedules')
    .select('id, schedule_date, quantity, keywords, order_types')
    .eq('order_id', orderId)
    .order('schedule_date', { ascending: true })
  schedulesMap.value[orderId] = data || []
}

function onImgError(e: Event) {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
}

function isOverdue(dateStr: string) {
  return dayjs(dateStr).isBefore(dayjs(), 'day')
}

function fmtTime(t: string | null) {
  if (!t) return '—'
  return dayjs(t).format('YYYY-MM-DD HH:mm')
}

function getTaskRemark(record: any) {
  return String(record?.notes || record?.task_notes || '—')
}

function getSubUploadTime(sub: any) {
  return sub?.amazon_order_placed_at || null
}

function getSubRemark(sub: any) {
  return String(sub?.notes || sub?.task_notes || '').trim()
}

function getTaskCurrentStatusTime(record: any) {
  return record?.status_changed_at || record?.updated_at || record?.created_at || null
}

function getTaskTypeRows(record: any) {
  const rawTypes = Array.isArray(record?.order_types) && record.order_types.length
    ? record.order_types
    : (record?.order_type ? [record.order_type] : [])
  return rawTypes.map((rawType: string) => ({
    type: formatReviewType(rawType),
    qty: record?.type_quantities && record.type_quantities[rawType] !== undefined
      ? Number(record.type_quantities[rawType] || 0)
      : Number(record?.order_quantity || 0),
  }))
}

function getTaskVariantText(record: any) {
  const variantInfo = String(record?.variant_info || '').trim()
  return variantInfo ? `指定变体 (${variantInfo})` : '默认变体'
}

function shouldInjectTaskStatusMock(record: any) {
  return !Array.isArray(record?.status_change_log) || record.status_change_log.length === 0
}

function canDeleteTask(record: any) {
  return Number(record?._sub_total || 0) === 0
}

function getTaskStatusTimeline(record: any) {
  const history = Array.isArray(record?.status_change_log)
    ? record.status_change_log.map((item: any, index: number) => ({
      key: `${record.id}-status-${index}-${item?.changed_at || 'unknown'}`,
      kind: 'status',
      from_status: String(item?.from_status || ''),
      to_status: String(item?.to_status || ''),
      reason: String(item?.reason || ''),
      changed_at: item?.changed_at || null,
    }))
    : []

  const createdEntry = record?.created_at
    ? [{
      key: `${record.id}-created`,
      kind: 'created',
      from_status: '',
      to_status: '',
      reason: '',
      changed_at: record.created_at,
    }]
    : []

  const mockEntries = shouldInjectTaskStatusMock(record)
    && ['暂停中', '已截单'].includes(String(record?.status || ''))
    && record?.status_reason
    ? [{
      key: `${record.id}-mock-status-change`,
      kind: 'status',
      from_status: '进行中',
      to_status: String(record.status || ''),
      reason: String(record.status_reason || ''),
      changed_at: dayjs(record.created_at || undefined).add(2, 'day').toISOString(),
    }]
    : []

  return [...history, ...createdEntry, ...mockEntries].sort((a, b) => {
    const left = dayjs(a.changed_at).valueOf()
    const right = dayjs(b.changed_at).valueOf()
    return right - left
  })
}

function getTaskStatusJourney(record: any) {
  return [...getTaskStatusTimeline(record)].sort((a, b) => {
    const left = dayjs(a.changed_at).valueOf()
    const right = dayjs(b.changed_at).valueOf()
    return left - right
  })
}

function loadOrderEditHistoryMap() {
  if (typeof window === 'undefined') return { ...ORDER_EDIT_HISTORY_SEED }
  try {
    const raw = window.localStorage.getItem(ORDER_EDIT_HISTORY_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    const nextMap = typeof parsed === 'object' && parsed ? parsed : {}
    for (const [orderId, logs] of Object.entries(ORDER_EDIT_HISTORY_SEED)) {
      if (!Array.isArray(nextMap[orderId])) nextMap[orderId] = logs
    }
    window.localStorage.setItem(ORDER_EDIT_HISTORY_STORAGE_KEY, JSON.stringify(nextMap))
    return nextMap
  } catch {
    return { ...ORDER_EDIT_HISTORY_SEED }
  }
}

function persistOrderEditHistoryMap() {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(ORDER_EDIT_HISTORY_STORAGE_KEY, JSON.stringify(orderEditHistoryMap.value))
}

function getTaskEditHistory(record: any) {
  if (!record) return []
  const orderId = String(record.id || record.order_id || '')
  const storedHistory = orderEditHistoryMap.value[orderId] || []
  const inlineHistory = Array.isArray(record.edit_change_log)
    ? record.edit_change_log
    : Array.isArray(record.change_log)
      ? record.change_log
      : []
  const sourceHistory = storedHistory.length ? storedHistory : inlineHistory
  return sourceHistory
    .map((item: any, index: number) => ({
      key: `${orderId}-edit-${index}-${item?.changed_at || item?.at || 'unknown'}`,
      changed_at: item?.changed_at || item?.at || null,
      staff_name: item?.staff_name || item?.operator || '任务管理',
      affected_sub_count: Number(item?.affected_sub_count || item?.sub_count || 0),
      changes: Array.isArray(item?.changes)
        ? item.changes
        : Array.isArray(item?.edits)
          ? item.edits
          : [],
    }))
    .filter((item: any) => item.changes.length > 0)
    .sort((a: any, b: any) => dayjs(b.changed_at).valueOf() - dayjs(a.changed_at).valueOf())
}

function formatTaskEdit(change: any) {
  const labels: Record<string, string> = {
    asin: 'ASIN',
    scheduled_date: '排单日期',
    review_type: '测评类型',
    review_level: '测评等级',
    product_price: '售价',
    keyword: '关键词',
    task_notes: '备注',
    store_name: '店铺',
  }
  const label = labels[change?.field] || change?.field || '字段'
  const formatValue = (field: string, value: any) => {
    if (value == null || value === '') return '空'
    if (field === 'product_price') return `$${Number(value).toFixed(2)}`
    if (field === 'review_type') return formatReviewType(String(value))
    return String(value)
  }
  return `${label} 从 ${formatValue(change?.field, change?.from)} 修改成了 ${formatValue(change?.field, change?.to)}`
}

function appendTaskEditHistory(orderId: string, entry: any) {
  if (!orderId) return
  const list = Array.isArray(orderEditHistoryMap.value[orderId]) ? [...orderEditHistoryMap.value[orderId]] : []
  list.unshift(entry)
  orderEditHistoryMap.value = {
    ...orderEditHistoryMap.value,
    [orderId]: list,
  }
  persistOrderEditHistoryMap()

  const task = tasks.value.find((item: any) => item.id === orderId)
  if (task) {
    task.edit_change_log = list
  }
  if (currentTaskDetail.value?.id === orderId) {
    currentTaskDetail.value = {
      ...currentTaskDetail.value,
      edit_change_log: list,
    }
  }
}

function openDetail(sub: any, orderId: string) {
  detailRecord.value = { ...sub }
  detailOrderId.value = orderId
  editMode.value = false
  const d = sub
  editForm.value = {
    status: d.status || '待分配',
    scheduled_date: d.scheduled_date || '',
    amazon_order_id: d.amazon_order_id || '',
    variant_info: d.variant_info || '',
    product_price: d.product_price != null ? Number(d.product_price) : undefined,
    unit_price: d.unit_price != null ? Number(d.unit_price) : undefined,
    commission_fee: d.commission_fee != null ? Number(d.commission_fee) : undefined,
    keyword: d.keyword || '',
    review_type: formatReviewType(d.review_type || d.order_type) || undefined,
    staff_name: d.staff_name || '',
    buyer_name: d.buyer_name || '',
    refund_status: normalizeRefundStatus(d.refund_status) || null,
    refund_method: d.refund_method || '',
    refund_amount: d.refund_amount != null ? Number(d.refund_amount) : undefined,
    refund_date: d.refund_date || '',
    refund_sequence: d.refund_sequence || '',
    buyer_assigned_at: d.buyer_assigned_at ? dayjs(d.buyer_assigned_at).format('YYYY-MM-DD HH:mm') : '',
    amazon_order_placed_at: d.amazon_order_placed_at ? dayjs(d.amazon_order_placed_at).format('YYYY-MM-DD HH:mm') : '',
    delivery_confirmed_at: d.delivery_confirmed_at ? dayjs(d.delivery_confirmed_at).format('YYYY-MM-DD HH:mm') : '',
    review_submitted_at: d.review_submitted_at ? dayjs(d.review_submitted_at).format('YYYY-MM-DD HH:mm') : '',
    notes: d.notes || '',
    task_notes: d.task_notes || '',
    cancel_reason: d.cancel_reason || '',
    review_screenshot_url: d.review_screenshot_url || '',
  }
  detailOpen.value = true
}

type AppendSubOrderFormRow = {
  key: string
  asin: string
  scheduled_date: string
  review_type: string | undefined
  review_level: string | undefined
  product_price: number | undefined
  keyword_or_link: string
  task_notes: string
}

type AppendBatchForm = Omit<AppendSubOrderFormRow, 'key'>

const appendModalOpen = ref(false)
const appendSaving = ref(false)
const appendCount = ref(1)
const appendRows = ref<AppendSubOrderFormRow[]>([])
const appendBatchForm = ref<AppendBatchForm>({
  asin: '',
  scheduled_date: '',
  review_type: undefined,
  review_level: undefined,
  product_price: undefined,
  keyword_or_link: '',
  task_notes: '',
})
const appendSourceTask = ref<any>(null)
const appendSourceSub = ref<any>(null)
let appendRowSeed = 0

function getKeywordOrLinkValue(sub?: any) {
  if (!sub) return ''
  if (sub.keyword_type === 'link') return sub.search_link || ''
  return sub.keyword || ''
}

function createAppendDraft(task: any, sub?: any): AppendBatchForm {
  return {
    asin: sub?.asin || task?.asin || '',
    scheduled_date: sub?.scheduled_date || '',
    review_type: formatReviewType(sub?.review_type || sub?.order_type || task?.review_type || task?.order_type) || undefined,
    review_level: sub?.review_level || task?.review_level || undefined,
    product_price: sub?.product_price != null ? Number(sub.product_price) : (task?.product_price != null ? Number(task.product_price) : undefined),
    keyword_or_link: getKeywordOrLinkValue(sub),
    task_notes: sub?.task_notes || '',
  }
}

function createAppendRowFromDraft(draft: AppendBatchForm): AppendSubOrderFormRow {
  appendRowSeed += 1
  return {
    key: `append-row-${Date.now()}-${appendRowSeed}`,
    asin: draft.asin,
    scheduled_date: draft.scheduled_date,
    review_type: draft.review_type,
    review_level: draft.review_level,
    product_price: draft.product_price,
    keyword_or_link: draft.keyword_or_link,
    task_notes: draft.task_notes,
  }
}

function syncAppendBatchForm(task: any, sub?: any) {
  appendBatchForm.value = createAppendDraft(task, sub)
}

function resetAppendModal() {
  appendModalOpen.value = false
  appendSaving.value = false
  appendCount.value = 1
  appendRows.value = []
  appendBatchForm.value = {
    asin: '',
    scheduled_date: '',
    review_type: undefined,
    review_level: undefined,
    product_price: undefined,
    keyword_or_link: '',
    task_notes: '',
  }
  appendSourceTask.value = null
  appendSourceSub.value = null
}

function syncAppendRows(count: number) {
  const safeCount = Math.max(1, Math.trunc(Number(count) || 1))
  appendCount.value = safeCount
  const current = [...appendRows.value]
  if (current.length > safeCount) {
    appendRows.value = current.slice(0, safeCount)
    return
  }
  const task = appendSourceTask.value
  if (!task) return
  const draft = appendBatchForm.value
  while (current.length < safeCount) {
    current.push(createAppendRowFromDraft(draft))
  }
  appendRows.value = current
}

function handleAppendCountChange(value: number | null) {
  syncAppendRows(value || 1)
}

function openAppendModal(task: any) {
  const sourceSub = Array.isArray(subOrdersMap.value[task.id]) && subOrdersMap.value[task.id].length
    ? { ...subOrdersMap.value[task.id][subOrdersMap.value[task.id].length - 1] }
    : null
  appendSourceTask.value = task
  appendSourceSub.value = sourceSub
  syncAppendBatchForm(task, sourceSub || undefined)
  appendCount.value = 1
  appendRows.value = [createAppendRowFromDraft(appendBatchForm.value)]
  appendModalOpen.value = true
}

function fillAppendBatchFromFirstRow() {
  const first = appendRows.value[0]
  if (!first) return
  appendBatchForm.value = {
    asin: first.asin,
    scheduled_date: first.scheduled_date,
    review_type: first.review_type,
    review_level: first.review_level,
    product_price: first.product_price,
    keyword_or_link: first.keyword_or_link,
    task_notes: first.task_notes,
  }
}

function applyAppendBatchToAll() {
  if (appendRows.value.length === 0) return
  const draft = appendBatchForm.value
  appendRows.value = appendRows.value.map((row) => ({
    ...row,
    asin: draft.asin,
    scheduled_date: draft.scheduled_date,
    review_type: draft.review_type,
    review_level: draft.review_level,
    product_price: draft.product_price,
    keyword_or_link: draft.keyword_or_link,
    task_notes: draft.task_notes,
  }))
}

function parseAppendKeywordInput(value: string) {
  const normalized = String(value || '').trim()
  const isLink = /^(https?:\/\/|www\.)/i.test(normalized)
  return {
    keyword_type: isLink ? 'link' : 'keyword',
    keyword: isLink ? '' : normalized,
    search_link: isLink ? normalized : '',
  }
}

async function saveAppendOrders() {
  if (!appendSourceTask.value?.id) return
  const count = appendRows.value.length
  if (count <= 0) {
    message.warning('请先填写追加单数量')
    return
  }

  appendSaving.value = true
  const sourceTask = appendSourceTask.value
  const sourceSub = appendSourceSub.value
  const orderId = String(sourceTask.id)

  try {
    const rows = appendRows.value.map((row) => {
      const keywordPayload = parseAppendKeywordInput(row.keyword_or_link)
      const reviewType = row.review_type
        ? formatReviewType(row.review_type)
        : (formatReviewType(sourceSub?.review_type || sourceSub?.order_type || sourceTask.review_type || sourceTask.order_type) || null)
      return {
        order_id: orderId,
        asin: row.asin?.trim() || sourceSub?.asin || sourceTask.asin || null,
        store_name: sourceSub?.store_name || sourceTask.store_name || null,
        country: sourceSub?.country || sourceTask.country || null,
        order_type: sourceSub?.order_type || sourceTask.order_type || reviewType || null,
        product_price: row.product_price ?? (sourceSub?.product_price != null ? Number(sourceSub.product_price) : sourceTask.product_price),
        unit_price: sourceSub?.unit_price != null ? Number(sourceSub.unit_price) : (sourceTask.unit_price != null ? Number(sourceTask.unit_price) : null),
        commission_fee: sourceSub?.commission_fee != null ? Number(sourceSub.commission_fee) : (sourceTask.commission_fee != null ? Number(sourceTask.commission_fee) : 0),
        exchange_rate: sourceSub?.exchange_rate ?? sourceTask.exchange_rate ?? null,
        product_image: sourceSub?.product_image || sourceTask.product_image || null,
        product_name: sourceSub?.product_name || sourceTask.product_name || null,
        brand_name: sourceSub?.brand_name || sourceTask.brand_name || null,
        category: sourceSub?.category || sourceTask.category || null,
        review_level: row.review_level || sourceSub?.review_level || sourceTask.review_level || null,
        review_type: reviewType,
        variant_info: sourceSub?.variant_info || sourceTask.variant_info || null,
        customer_name: sourceSub?.customer_name || sourceTask.customer_name || null,
        customer_id_str: sourceSub?.customer_id_str || sourceTask.customer_id_str || null,
        sales_person: sourceSub?.sales_person || sourceTask.sales_person || null,
        scheduled_date: row.scheduled_date || null,
        keyword_type: keywordPayload.keyword_type,
        keyword: keywordPayload.keyword,
        search_link: keywordPayload.search_link,
        task_notes: row.task_notes?.trim() || sourceSub?.task_notes || null,
        notes: sourceSub?.notes || '订单备注：同主任务下的追加子单',
        status: '待分配',
      }
    })

    const { data: insertedRows, error: insertError } = await supabase
      .from('sub_orders')
      .insert(rows)
      .select('id')
    if (insertError) throw insertError

    const nextQty = Number(sourceTask.order_quantity || 0) + count
    const { error: orderError } = await supabase
      .from('erp_orders')
      .update({
        order_quantity: nextQty,
        total_orders: nextQty,
      })
      .eq('id', orderId)

    if (orderError) {
      const insertedIds = (insertedRows || []).map((item: any) => item.id).filter(Boolean)
      if (insertedIds.length > 0) {
        await supabase.from('sub_orders').delete().in('id', insertedIds)
      }
      throw orderError
    }

    sourceTask.order_quantity = nextQty
    sourceTask.total_orders = nextQty
    sourceTask._sub_total = Number(sourceTask._sub_total || 0) + count

    const taskInList = tasks.value.find((item: any) => item.id === orderId)
    if (taskInList) {
      taskInList.order_quantity = nextQty
      taskInList.total_orders = nextQty
      taskInList._sub_total = Number(taskInList._sub_total || 0) + count
    }
    if (currentTaskDetail.value?.id === orderId) {
      currentTaskDetail.value = {
        ...currentTaskDetail.value,
        order_quantity: nextQty,
        total_orders: nextQty,
        _sub_total: Number(currentTaskDetail.value._sub_total || 0) + count,
      }
    }
    if (scheduleModalOrder.value?.id === orderId) {
      scheduleModalOrder.value = {
        ...scheduleModalOrder.value,
        order_quantity: nextQty,
        total_orders: nextQty,
      }
    }

    await loadSubOrders(orderId)
    message.success(`已追加 ${count} 条子订单`)
    resetAppendModal()
  } catch (e: any) {
    message.error('追加订单失败：' + e.message)
  } finally {
    appendSaving.value = false
  }
}

function startEdit() {
  if (!detailRecord.value) return
  const d = detailRecord.value
  const form = {
    status: d.status || '待分配',
    scheduled_date: d.scheduled_date || '',
    amazon_order_id: d.amazon_order_id || '',
    variant_info: d.variant_info || '',
    product_price: d.product_price != null ? Number(d.product_price) : undefined,
    unit_price: d.unit_price != null ? Number(d.unit_price) : undefined,
    commission_fee: d.commission_fee != null ? Number(d.commission_fee) : undefined,
    keyword: d.keyword || '',
    review_type: formatReviewType(d.review_type || d.order_type) || undefined,
    staff_name: d.staff_name || '',
    buyer_name: d.buyer_name || '',
    refund_status: normalizeRefundStatus(d.refund_status) || null,
    refund_method: d.refund_method || '',
    refund_amount: d.refund_amount != null ? Number(d.refund_amount) : undefined,
    refund_date: d.refund_date || '',
    refund_sequence: d.refund_sequence || '',
    buyer_assigned_at: d.buyer_assigned_at ? dayjs(d.buyer_assigned_at).format('YYYY-MM-DD HH:mm') : '',
    amazon_order_placed_at: d.amazon_order_placed_at ? dayjs(d.amazon_order_placed_at).format('YYYY-MM-DD HH:mm') : '',
    delivery_confirmed_at: d.delivery_confirmed_at ? dayjs(d.delivery_confirmed_at).format('YYYY-MM-DD HH:mm') : '',
    review_submitted_at: d.review_submitted_at ? dayjs(d.review_submitted_at).format('YYYY-MM-DD HH:mm') : '',
    notes: d.notes || '',
    task_notes: d.task_notes || '',
    cancel_reason: d.cancel_reason || '',
    review_screenshot_url: d.review_screenshot_url || '',
  }
  editForm.value = form
  editMode.value = true
}

function cancelEdit() {
  editMode.value = false
  editForm.value = {}
}

async function saveDetail() {
  if (!detailRecord.value?.id) return
  saveLoading.value = true
  try {
    const f = editForm.value
    const parseTs = (v: string) => v ? dayjs(v, 'YYYY-MM-DD HH:mm').toISOString() : null

    const payload: any = {
      status: f.status,
      scheduled_date: f.scheduled_date || null,
      amazon_order_id: f.amazon_order_id || null,
      variant_info: f.variant_info || null,
      product_price: f.product_price,
      unit_price: f.unit_price,
      commission_fee: f.commission_fee,
      keyword: f.keyword || null,
      review_type: f.review_type ? formatReviewType(f.review_type) : null,
      staff_name: f.staff_name || null,
      buyer_name: f.buyer_name || null,
      refund_status: normalizeRefundStatus(f.refund_status) || null,
      refund_method: f.refund_method || null,
      refund_amount: f.refund_amount,
      refund_date: f.refund_date || null,
      refund_sequence: f.refund_sequence || null,
      buyer_assigned_at: parseTs(f.buyer_assigned_at),
      amazon_order_placed_at: parseTs(f.amazon_order_placed_at),
      delivery_confirmed_at: parseTs(f.delivery_confirmed_at),
      review_submitted_at: parseTs(f.review_submitted_at),
      notes: f.notes || null,
      task_notes: f.task_notes || null,
      cancel_reason: f.cancel_reason || null,
      review_screenshot_url: f.review_screenshot_url || null,
    }

    const { error } = await supabase.from('sub_orders').update(payload).eq('id', detailRecord.value.id)
    if (error) throw error

    Object.assign(detailRecord.value, payload)
    editMode.value = false

    if (detailOrderId.value) {
      await loadSubOrders(detailOrderId.value)
    }
    message.success('子订单已保存')
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    saveLoading.value = false
  }
}

async function toggleExpand(record: any) {
  if (expandedRowKeys.value.includes(record.id)) {
    expandedRowKeys.value = expandedRowKeys.value.filter(k => k !== record.id)
  } else {
    expandedRowKeys.value = [...expandedRowKeys.value, record.id]
    await Promise.all([loadSubOrders(record.id), loadSchedules(record.id)])
  }
}

function openTaskDetail(record: any) {
  currentTaskDetail.value = record
  taskDetailOpen.value = true
}

async function load() {
  loading.value = true
  try {
    let query = supabase.from('erp_orders').select('*', { count: 'exact' }).order('updated_at', { ascending: false })
    if (searchText.value) {
      query = query.or(`order_number.ilike.%${searchText.value}%,asin.ilike.%${searchText.value}%,store_name.ilike.%${searchText.value}%`)
    }
    if (filterStatus.value) {
      query = query.eq('status', filterStatus.value)
    } else {
      query = query.in('status', defaultVisibleTaskStatuses)
    }
    if (filterCountry.value) query = query.eq('country', filterCountry.value)

    const from = (pagination.value.current - 1) * pagination.value.pageSize
    query = query.range(from, from + pagination.value.pageSize - 1)

    const { data, count, error } = await query
    if (error) throw error

    const orderIds = (data || []).map((o: any) => o.id)
    let statsMap: Record<string, { scheduled: number; ordered: number; reviewed: number; refunded: number; total: number }> = {}
    let scheduleDaysMap: Record<string, number> = {}
    let scheduleQtyMap: Record<string, number> = {}

    if (orderIds.length > 0) {
      const { data: subData } = await supabase
        .from('sub_orders')
        .select('order_id, status, buyer_name, amazon_order_id, refund_status')
        .in('order_id', orderIds)

      const { data: schedData } = await supabase
        .from('order_schedules')
        .select('order_id, quantity, schedule_date')
        .in('order_id', orderIds)

      ;(subData || []).forEach((s: any) => {
        if (!statsMap[s.order_id]) statsMap[s.order_id] = { scheduled: 0, ordered: 0, reviewed: 0, refunded: 0, total: 0 }
        statsMap[s.order_id].total++
        if (s.buyer_name) statsMap[s.order_id].scheduled++
        if (s.amazon_order_id) statsMap[s.order_id].ordered++
        if (['已完成', '已留评'].includes(s.status)) statsMap[s.order_id].reviewed++
        if (normalizeRefundStatus(s.refund_status) === '已返款') statsMap[s.order_id].refunded++
      })

      const daysCountMap: Record<string, Set<string>> = {}
      ;(schedData || []).forEach((s: any) => {
        scheduleQtyMap[s.order_id] = (scheduleQtyMap[s.order_id] || 0) + (s.quantity || 0)
        if (!daysCountMap[s.order_id]) daysCountMap[s.order_id] = new Set()
        daysCountMap[s.order_id].add(s.schedule_date)
      })
      for (const oid in daysCountMap) {
        scheduleDaysMap[oid] = daysCountMap[oid].size
      }
    }

    const mapped = (data || []).map((o: any) => ({
      ...o,
      _scheduled_count: statsMap[o.id]?.scheduled || 0,
      _ordered_count: statsMap[o.id]?.ordered || 0,
      _review_count: statsMap[o.id]?.reviewed || 0,
      _refunded_count: statsMap[o.id]?.refunded || 0,
      _sub_total: statsMap[o.id]?.total || 0,
      _schedule_count: scheduleQtyMap[o.id] || 0,
      _schedule_days: scheduleDaysMap[o.id] || 0,
    }))
    mapped.sort((a: any, b: any) => (b._sub_total || 0) - (a._sub_total || 0))
    tasks.value = mapped
    pagination.value.total = count || 0
  } catch (e: any) {
    message.error('加载失败：' + e.message)
  } finally {
    loading.value = false
  }
}

function requestTaskStatusChange(record: any, nextStatus: string) {
  if (!record?.id || !nextStatus || nextStatus === record.status) return

  if (isTaskStatusReasonRequired(nextStatus)) {
    pendingTaskStatusRecord.value = record
    pendingTaskStatus.value = nextStatus
    pendingTaskStatusReason.value = undefined
    taskStatusReasonModalOpen.value = true
    return
  }

  void updateTaskStatus(record, nextStatus, null)
}

async function confirmTaskStatusChange() {
  if (!pendingTaskStatusRecord.value || !pendingTaskStatus.value || !pendingTaskStatusReason.value) {
    message.warning('请先选择原因')
    return
  }
  const success = await updateTaskStatus(pendingTaskStatusRecord.value, pendingTaskStatus.value, pendingTaskStatusReason.value)
  if (!success) return
  taskStatusReasonModalOpen.value = false
  pendingTaskStatusRecord.value = null
  pendingTaskStatus.value = ''
  pendingTaskStatusReason.value = undefined
}

function appendTaskStatusHistory(record: any, fromStatus: string, toStatus: string, reason: string | null, changedAt: string) {
  const nextLog = {
    from_status: fromStatus || '',
    to_status: toStatus || '',
    reason: reason || null,
    changed_at: changedAt,
  }
  const history = Array.isArray(record.status_change_log) ? [...record.status_change_log] : []
  history.push(nextLog)
  record.status_change_log = history
}

async function updateTaskStatus(record: any, nextStatus: string, reason: string | null) {
  if (!record?.id || !nextStatus || nextStatus === record.status) return false
  const previousStatus = record.status
  const previousReason = record.status_reason || null
  const previousChangedAt = record.status_changed_at || null
  taskStatusSavingId.value = record.id
  try {
    const nowIso = new Date().toISOString()
    const { error } = await supabase
      .from('erp_orders')
      .update({
        status: nextStatus,
        status_reason: isTaskStatusReasonRequired(nextStatus) ? reason : null,
      })
      .eq('id', record.id)
    if (error) throw error

    record.status = nextStatus
    record.status_reason = isTaskStatusReasonRequired(nextStatus) ? reason : null
    record.status_changed_at = nowIso
    appendTaskStatusHistory(record, previousStatus, nextStatus, record.status_reason, nowIso)
    const listRecord = tasks.value.find((item: any) => item.id === record.id)
    if (listRecord) {
      listRecord.status = nextStatus
      listRecord.status_reason = record.status_reason
      listRecord.status_changed_at = nowIso
      listRecord.status_change_log = record.status_change_log
    }

    const shouldKeepInList = filterStatus.value
      ? filterStatus.value === nextStatus
      : defaultVisibleTaskStatuses.includes(nextStatus)

    if (!shouldKeepInList) {
      tasks.value = tasks.value.filter((item: any) => item.id !== record.id)
      expandedRowKeys.value = expandedRowKeys.value.filter(id => id !== record.id)
      pagination.value.total = Math.max(0, pagination.value.total - 1)
    }

    message.success(`任务状态已改为${nextStatus}`)
    return true
  } catch (e: any) {
    record.status = previousStatus
    record.status_reason = previousReason
    record.status_changed_at = previousChangedAt
    message.error('状态修改失败：' + e.message)
    return false
  } finally {
    taskStatusSavingId.value = null
  }
}

async function loadSubOrders(orderId: string) {
  const { data, error } = await supabase
    .from('sub_orders')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })
  if (error) { message.error('加载子订单失败'); return }
  const displayRows = decorateSubOrdersForDisplay(orderId, data || [])
  subOrdersMap.value[orderId] = displayRows
  const validIds = new Set(displayRows.filter((sub: any) => canBatchEditSub(sub)).map((sub: any) => sub.id))
  selectedSubIdsMap.value[orderId] = getSelectedSubIds(orderId).filter(id => validIds.has(id))
}

async function generateSubOrders(record: any) {
  genLoadingId.value = record.id
  try {
    const { data: allSubs } = await supabase
      .from('sub_orders')
      .select('id')
      .eq('order_id', record.id)
    const existingTotal = allSubs?.length || 0

    const toCreate = (record.order_quantity || 0) - existingTotal
    if (toCreate <= 0) {
      message.info('子订单已全部生成')
      return
    }

    const commissionFee = Number(record.commission_fee || 0) > 0
      ? Number(record.commission_fee)
      : Number(record.unit_price || 0) - Number(record.product_price || 0) * Number(record.exchange_rate || 1)

    const { data: schedules } = await supabase
      .from('order_schedules')
      .select('schedule_date, quantity, keywords, kw_entries')
      .eq('order_id', record.id)
      .order('schedule_date', { ascending: true })

    interface KwEntrySlot { mode: 'keyword' | 'link'; value: string }
    const scheduleSlots: Array<{ date: string; kwEntry: KwEntrySlot | null }> = []
    for (const s of (schedules || [])) {
      const entries: KwEntrySlot[] = Array.isArray(s.kw_entries) && s.kw_entries.length > 0
        ? (s.kw_entries as KwEntrySlot[]).filter(e => e.value?.trim())
        : (s.keywords || []).filter((k: string) => k.trim()).map((k: string) => ({ mode: 'keyword' as const, value: k }))
      for (let i = 0; i < (s.quantity || 1); i++) {
        scheduleSlots.push({
          date: s.schedule_date,
          kwEntry: entries.length > 0 ? entries[i % entries.length] : null,
        })
      }
    }

    const rows = Array.from({ length: toCreate }, (_, i) => {
      const slot = scheduleSlots[existingTotal + i]
      const kwEntry = slot?.kwEntry
      return {
        order_id: record.id,
        asin: record.asin,
        store_name: record.store_name,
        country: record.country,
        order_type: record.order_type,
        product_price: record.product_price,
        unit_price: record.unit_price,
        commission_fee: commissionFee > 0 ? commissionFee : 0,
        exchange_rate: record.exchange_rate,
        product_image: record.product_image,
        product_name: record.product_name,
        brand_name: record.brand_name,
        category: record.category,
        review_level: record.review_level,
        review_type: formatReviewType(record.review_type || record.order_type),
        variant_info: record.variant_info,
        customer_name: record.customer_name,
        customer_id_str: record.customer_id_str,
        sales_person: record.sales_person,
        scheduled_date: slot?.date || null,
        keyword: kwEntry?.mode === 'keyword' ? kwEntry.value : '',
        keyword_type: kwEntry?.mode || 'keyword',
        search_link: kwEntry?.mode === 'link' ? kwEntry.value : '',
        status: '待分配',
      }
    })

    const { error } = await supabase.from('sub_orders').insert(rows)
    if (error) throw error
    message.success(`成功生成 ${toCreate} 条子订单`)
    await loadSubOrders(record.id)
    await load()
  } catch (e: any) {
    message.error('生成子订单失败：' + e.message)
  } finally {
    genLoadingId.value = null
  }
}

async function deleteSubOrder(subId: string, orderId: string) {
  const { error } = await supabase.from('sub_orders').delete().eq('id', subId)
  if (error) { message.error('删除失败'); return }
  message.success('子订单已删除')
  await loadSubOrders(orderId)
}

async function deleteTask(id: string) {
  const { count, error: countErr } = await supabase
    .from('sub_orders')
    .select('id', { count: 'exact', head: true })
    .eq('order_id', id)
  if (countErr) { message.error('校验任务是否可删除失败'); return }
  if ((count || 0) > 0) {
    message.warning('该任务已生成子订单，不能删除，请使用现有截单流程')
    return
  }
  const { error } = await supabase.from('erp_orders').delete().eq('id', id)
  if (error) { message.error('删除任务失败'); return }
  message.success('任务已删除')
  delete subOrdersMap.value[id]
  delete selectedSubIdsMap.value[id]
  expandedRowKeys.value = expandedRowKeys.value.filter(k => k !== id)
  load()
}

function onPageChange(page: number, pageSize: number) {
  pagination.value.current = page
  pagination.value.pageSize = pageSize
  load()
}

const scheduleModalOpen = ref(false)
const scheduleModalOrder = ref<any>(null)
const scheduleModalSchedules = ref<any[]>([])
const scheduleModalLoading = ref(false)

async function openScheduleModal(record: any) {
  scheduleModalOrder.value = record
  scheduleModalOpen.value = true
  scheduleModalLoading.value = true
  const { data } = await supabase
    .from('order_schedules')
    .select('id, schedule_date, quantity, keywords, order_types')
    .eq('order_id', record.id)
    .order('schedule_date', { ascending: true })
  scheduleModalSchedules.value = data || []
  scheduleModalLoading.value = false
}

const kwEditOpen = ref(false)
const kwEditRecord = ref<any>(null)
const kwEditMode = ref<'keyword' | 'link'>('keyword')
const kwEditValue = ref('')
const kwEditSaving = ref(false)
const quickEditOpen = ref(false)
const quickEditRecord = ref<any>(null)
const quickEditField = ref<'asin' | 'scheduled_date' | 'review_type' | 'review_level' | 'product_price' | ''>('')
const quickEditValue = ref<any>('')
const quickEditSaving = ref(false)
const quickEditConfigs: Record<string, { label: string; type: 'text' | 'select' | 'date' | 'number'; options?: string[] }> = {
  asin: { label: 'ASIN', type: 'text' },
  scheduled_date: { label: '排单日期', type: 'date' },
  review_type: { label: '测评类型', type: 'select', options: reviewTypeOptions },
  review_level: { label: '测评等级', type: 'select', options: ['普通', '高等', '极高等'] },
  product_price: { label: '售价', type: 'number' },
}
const quickEditMeta = computed(() => quickEditField.value ? quickEditConfigs[quickEditField.value] : null)

function openKwEdit(sub: any) {
  kwEditRecord.value = sub
  kwEditMode.value = (sub.keyword_type === 'link' ? 'link' : 'keyword') as 'keyword' | 'link'
  kwEditValue.value = sub.keyword_type === 'link' ? (sub.search_link || '') : (sub.keyword || '')
  kwEditOpen.value = true
}

function openQuickEdit(sub: any, field: 'asin' | 'scheduled_date' | 'review_type' | 'review_level' | 'product_price') {
  quickEditRecord.value = sub
  quickEditField.value = field
  quickEditValue.value = field === 'product_price'
    ? (sub[field] != null ? Number(sub[field]) : undefined)
    : (field === 'review_type' ? formatReviewType(sub.review_type || sub.order_type) : (sub[field] || ''))
  quickEditOpen.value = true
}

async function saveKwEdit() {
  if (!kwEditRecord.value) return
  kwEditSaving.value = true
  try {
    const updates: Record<string, any> = {
      keyword_type: kwEditMode.value,
      keyword: kwEditMode.value === 'keyword' ? kwEditValue.value.trim() : '',
      search_link: kwEditMode.value === 'link' ? kwEditValue.value.trim() : '',
    }
    const { error } = await supabase.from('sub_orders').update(updates).eq('id', kwEditRecord.value.id)
    if (error) throw error
    Object.assign(kwEditRecord.value, updates)
    const orderId = kwEditRecord.value.order_id
    if (orderId && subOrdersMap.value[orderId]) {
      const sub = subOrdersMap.value[orderId].find((s: any) => s.id === kwEditRecord.value.id)
      if (sub) Object.assign(sub, updates)
    }
    message.success('关键词/链接已更新')
    kwEditOpen.value = false
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    kwEditSaving.value = false
  }
}

async function saveQuickEdit() {
  if (!quickEditRecord.value || !quickEditField.value) return
  quickEditSaving.value = true
  try {
    const field = quickEditField.value
    const beforeValue = field === 'review_type'
      ? formatReviewType(quickEditRecord.value.review_type || quickEditRecord.value.order_type)
      : quickEditRecord.value[field]
    const value = field === 'product_price'
      ? (quickEditValue.value == null || quickEditValue.value === '' ? null : Number(quickEditValue.value))
      : (typeof quickEditValue.value === 'string' ? quickEditValue.value.trim() : quickEditValue.value) || null
    const normalizedValue = field === 'review_type' && value ? formatReviewType(String(value)) : value
    const updates = { [field]: normalizedValue }
    const { error } = await supabase.from('sub_orders').update(updates).eq('id', quickEditRecord.value.id)
    if (error) throw error
    Object.assign(quickEditRecord.value, updates)
    const orderId = quickEditRecord.value.order_id
    if (orderId && subOrdersMap.value[orderId]) {
      const sub = subOrdersMap.value[orderId].find((s: any) => s.id === quickEditRecord.value.id)
      if (sub) Object.assign(sub, updates)
    }
    if (orderId && beforeValue !== normalizedValue) {
      appendTaskEditHistory(orderId, {
        changed_at: new Date().toISOString(),
        staff_name: '任务管理',
        affected_sub_count: 1,
        changes: [{ field, from: beforeValue, to: normalizedValue }],
      })
    }
    message.success(`${quickEditMeta.value?.label || '字段'}已更新`)
    quickEditOpen.value = false
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    quickEditSaving.value = false
  }
}

// ===== 批量修改子订单弹窗 =====
const editSubModalOpen = ref(false)
const editSubSaving = ref(false)
const selectedSubIdsMap = ref<Record<string, string[]>>({})
const batchEditOrderId = ref<string>('')
const batchEditFieldOptions = [
  { key: 'keyword', label: '关键词', type: 'text', options: [] as string[] },
  { key: 'review_type', label: '测评类型', type: 'select', options: reviewTypeOptions },
  { key: 'review_level', label: '测评等级', type: 'select', options: ['普通', '高等', '极高等'] },
  { key: 'scheduled_date', label: '排单日期', type: 'date', options: [] as string[] },
  { key: 'asin', label: 'ASIN', type: 'text', options: [] as string[] },
  { key: 'product_price', label: '产品售价', type: 'number', options: [] as string[] },
  { key: 'task_notes', label: '备注', type: 'text', options: [] as string[] },
] as const
const activeBatchEditKeys = ref<string[]>([])
const batchEditForm = ref<Record<string, any>>({})
const currentBatchSelectedIds = computed(() => {
  return batchEditOrderId.value ? (selectedSubIdsMap.value[batchEditOrderId.value] || []) : []
})
const activeBatchEditFields = computed(() => batchEditFieldOptions.filter(field => activeBatchEditKeys.value.includes(field.key)))
const inactiveBatchEditFields = computed(() => batchEditFieldOptions.filter(field => !activeBatchEditKeys.value.includes(field.key)))

function resetBatchEditForm() {
  activeBatchEditKeys.value = []
  batchEditForm.value = {
    keyword: '',
    review_type: undefined,
    review_level: undefined,
    scheduled_date: '',
    asin: '',
    product_price: undefined,
    task_notes: '',
  }
}

function activateBatchField(key: string) {
  if (activeBatchEditKeys.value.includes(key)) return
  activeBatchEditKeys.value = [...activeBatchEditKeys.value, key]
}

function deactivateBatchField(key: string) {
  activeBatchEditKeys.value = activeBatchEditKeys.value.filter(item => item !== key)
  batchEditForm.value[key] = key === 'product_price' ? undefined : key === 'review_type' || key === 'review_level' ? undefined : ''
}

function getSelectedSubIds(orderId: string) {
  return selectedSubIdsMap.value[orderId] || []
}

function getSelectedSubCount(orderId: string) {
  return getSelectedSubIds(orderId).length
}

function canBatchEditSub(sub: any) {
  return !sub?.buyer_id && !sub?.buyer_name
}

function getSelectableSubOrders(orderId: string) {
  return (subOrdersMap.value[orderId] || []).filter((sub: any) => canBatchEditSub(sub))
}

function getSelectableSubCount(orderId: string) {
  return getSelectableSubOrders(orderId).length
}

function setSelectedSubIds(orderId: string, ids: string[]) {
  selectedSubIdsMap.value[orderId] = ids
}

function isAllSubSelected(orderId: string) {
  const selectableSubs = getSelectableSubOrders(orderId)
  return selectableSubs.length > 0 && getSelectedSubCount(orderId) === selectableSubs.length
}

function isSubSelectionIndeterminate(orderId: string) {
  const count = getSelectedSubCount(orderId)
  const total = getSelectableSubCount(orderId)
  return count > 0 && count < total
}

function toggleAllSubSelection(orderId: string, checked: boolean) {
  const selectableSubs = getSelectableSubOrders(orderId)
  setSelectedSubIds(orderId, checked ? selectableSubs.map((sub: any) => sub.id) : [])
}

function getSubRowSelection(orderId: string) {
  return {
    selectedRowKeys: getSelectedSubIds(orderId),
    onChange: (keys: (string | number)[]) => setSelectedSubIds(orderId, keys.map(key => String(key))),
    getCheckboxProps: (record: any) => ({ disabled: !canBatchEditSub(record) }),
  }
}

async function openBatchEdit(record: any) {
  if (!subOrdersMap.value[record.id]) {
    await loadSubOrders(record.id)
  }
  if (getSelectedSubCount(record.id) === 0) {
    message.warning('请先在子订单列表中选择要修改的记录')
    return
  }
  batchEditOrderId.value = record.id
  resetBatchEditForm()
  editSubModalOpen.value = true
}

async function saveBatchEdit() {
  if (currentBatchSelectedIds.value.length === 0) return
  editSubSaving.value = true
  try {
    if (activeBatchEditFields.value.length === 0) { message.warning('请先选择至少一个修改字段'); return }

    const selectedCount = currentBatchSelectedIds.value.length
    const payload: Record<string, any> = {}
    const orderId = batchEditOrderId.value
    const targetSubs = (subOrdersMap.value[orderId] || []).filter((sub: any) => currentBatchSelectedIds.value.includes(sub.id))
    const changeList: any[] = []
    for (const field of activeBatchEditFields.value) {
      const value = batchEditForm.value[field.key]
      payload[field.key] = field.key === 'product_price'
        ? (value == null || value === '' ? null : Number(value))
        : field.key === 'review_type'
          ? ((value ? formatReviewType(String(value)) : null))
          : (value ?? '') || null
      const beforeValue = targetSubs[0]
        ? (field.key === 'review_type'
          ? formatReviewType(targetSubs[0].review_type || targetSubs[0].order_type)
          : targetSubs[0][field.key])
        : null
      changeList.push({
        field: field.key,
        from: beforeValue,
        to: payload[field.key],
      })
    }
    const effectiveChanges = changeList.filter(item => item.from !== item.to)

    const { error } = await supabase.from('sub_orders').update(payload).in('id', currentBatchSelectedIds.value)
    if (error) throw error
    await loadSubOrders(orderId)
    selectedSubIdsMap.value[orderId] = []
    if (orderId && effectiveChanges.length) {
      appendTaskEditHistory(orderId, {
        changed_at: new Date().toISOString(),
        staff_name: '任务管理',
        affected_sub_count: selectedCount,
        changes: effectiveChanges,
      })
    }
    resetBatchEditForm()
    message.success(`已批量修改 ${selectedCount} 条子订单`)
    editSubModalOpen.value = false
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    editSubSaving.value = false
  }
}

// ===== 复制弹窗（复制主任务信息）=====
const copyModalOpen = ref(false)
const copyOrderRecord = ref<any>(null)
const copyCheckedFields = ref<string[]>(['asin', 'order_number'])
const copyPreviewText = ref('')

const copyFieldOptions = [
  { key: 'asin', label: 'ASIN' },
  { key: 'order_number', label: '订单号' },
  { key: 'product_name', label: '产品名称' },
  { key: 'store_name', label: '店铺名称' },
  { key: 'brand_name', label: '品牌名称' },
  { key: 'country', label: '国家/站点' },
  { key: 'review_type', label: '测评类型' },
  { key: 'review_level', label: '测评等级' },
  { key: 'product_price', label: '产品售价' },
  { key: 'order_quantity', label: '订单数量' },
  { key: 'category', label: '类目' },
  { key: 'customer_name', label: '客户名称' },
  { key: 'variant_info', label: '变参信息' },
  { key: 'status', label: '任务状态' },
]

function openCopyModal(record: any) {
  copyOrderRecord.value = record
  copyCheckedFields.value = ['asin', 'order_number']
  updateCopyPreview()
  copyModalOpen.value = true
}

function updateCopyPreview() {
  const rec = copyOrderRecord.value
  if (!rec) { copyPreviewText.value = ''; return }
  const parts: string[] = []
  for (const f of copyFieldOptions) {
    if (!copyCheckedFields.value.includes(f.key)) continue
    let val = rec[f.key]
    if (f.key === 'product_price' && val != null) val = '$' + Number(val).toFixed(2)
    if (f.key === 'review_type') val = formatReviewType(rec.review_type || rec.order_type)
    if (val != null && val !== '') parts.push(`${f.label}：${val}`)
  }
  copyPreviewText.value = parts.join('\n')
}

watch(copyCheckedFields, updateCopyPreview, { deep: true })

function doConfirmCopy() {
  updateCopyPreview()
  if (!copyPreviewText.value) { message.warning('没有可复制的内容'); return }
  navigator.clipboard.writeText(copyPreviewText.value).then(() => {
    message.success('已复制到剪贴板')
    copyModalOpen.value = false
  }).catch(() => {
    message.error('复制失败，请手动复制')
  })
}

onMounted(() => {
  orderEditHistoryMap.value = loadOrderEditHistoryMap()
  load()
})
</script>

<style scoped>
.page-content { padding: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }
.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 12px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.total-hint { font-size: 13px; color: #6b7280; margin-left: 4px; }
.loading-wrap { display: flex; justify-content: center; padding: 60px 0; }

.task-list { display: flex; flex-direction: column; gap: 0; }

.task-card { border-bottom: 1px solid #f0f0f0; }
.task-card:last-child { border-bottom: none; }

.task-main-row {
  display: flex;
  align-items: flex-start;
  gap: 0;
  padding: 14px 4px 14px 0;
  transition: background 0.15s;
}
.task-main-row:hover { background: #fafbff; }

.task-expand-btn {
  width: 32px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 3px;
  cursor: pointer;
  color: #9ca3af;
}
.expand-icon { font-size: 11px; transition: transform 0.2s; }
.expand-icon.expanded { transform: rotate(90deg); color: #2563eb; }

.task-product-img {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  margin-right: 12px;
  cursor: pointer;
}
.task-product-thumb {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  display: block;
  transition: box-shadow 0.15s;
}
.task-product-thumb:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
.task-product-placeholder {
  width: 60px;
  height: 60px;
  border-radius: 8px;
  border: 1px dashed #d1d5db;
  background: #f9fafb;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #d1d5db;
  font-size: 20px;
}

.task-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.task-top-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.order-num-link {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  font-weight: 700;
  color: #2563eb;
  cursor: pointer;
  text-decoration: none;
}
.order-num-link:hover { text-decoration: underline; }
.status-tag { font-size: 11px; }
.info-tag { font-size: 11px; }
.task-detail-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  font-size: 12px;
  color: #6b7280;
  line-height: 1.6;
}
.detail-item-text { color: #374151; }
.detail-sep { color: #6b7280; padding-left: 12px; }
.mono-sm { font-family: 'Courier New', monospace; font-size: 11px; color: #374151; }
.price-text { color: #16a34a; font-weight: 600; }
.task-note-text {
  color: #6b7280;
  display: inline-block;
  max-width: 420px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-stats {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin: 0 20px;
  background: #f8fafc;
  border-radius: 8px;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
}
.stat-item { display: flex; flex-direction: column; align-items: center; min-width: 48px; gap: 2px; }
.stat-item-clickable { cursor: pointer; border-radius: 6px; padding: 4px 6px; margin: -4px -6px; transition: background 0.15s; }
.stat-item-clickable:hover { background: #eff6ff; }
.stat-label { font-size: 11px; color: #9ca3af; line-height: 1; }
.stat-val { font-size: 20px; font-weight: 700; line-height: 1.2; }
.stat-unit { font-size: 12px; font-weight: 400; color: #9ca3af; margin-left: 1px; }
.stat-daily { font-size: 11px; color: #6b7280; white-space: nowrap; margin-top: 1px; }
.stat-daily-flex { color: #2563eb; cursor: pointer; font-weight: 500; }
.stat-daily-flex:hover { text-decoration: underline; }
.stat-total { color: #1a1a2e; }
.stat-ordered { color: #2563eb; }
.stat-schedule { color: #f59e0b; }
.stat-sub { color: #2563eb; }
.stat-divider { width: 1px; height: 32px; background: #e5e7eb; margin: 0 10px; }
.stat-right-col {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-left: 12px;
  padding-left: 12px;
  border-left: 1px solid #e5e7eb;
}
.stat-mini-row { display: flex; gap: 8px; }
.stat-mini-label {
  font-size: 11px;
  white-space: nowrap;
  padding: 1px 6px;
  border-radius: 10px;
  font-weight: 500;
}
.assign-label { background: #ecfdf5; color: #059669; }
.refund-label { background: #fef3c7; color: #d97706; }
.review-label { background: #eff6ff; color: #3b82f6; }

.task-actions { display: flex; align-items: center; gap: 4px; flex-shrink: 0; padding-left: 8px; }
.task-status-select { width: 110px; }
.gen-btn { font-size: 12px; }
.icon-btn { color: #6b7280; font-size: 14px; }
.danger-btn:hover { color: #dc2626 !important; }
.task-drawer-header { display: flex; align-items: flex-start; }
.task-drawer-product { display: flex; gap: 16px; align-items: flex-start; }
.task-drawer-img-wrap { width: 80px; height: 80px; flex-shrink: 0; }
.task-drawer-img { width: 80px; height: 80px; object-fit: cover; border-radius: 10px; border: 1px solid #e5e7eb; display: block; }
.task-drawer-img-placeholder { width: 80px; height: 80px; border-radius: 10px; border: 1px dashed #d1d5db; background: #f9fafb; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 28px; }
.task-drawer-product-name { font-size: 15px; font-weight: 600; color: #111827; margin-bottom: 2px; }
.task-drawer-asin { font-size: 16px; font-weight: 700; color: #1e40af; }
.task-drawer-store { font-size: 13px; color: #6b7280; margin-top: 2px; }
.task-drawer-tag-row { display: flex; gap: 6px; margin-top: 6px; flex-wrap: wrap; }
.task-drawer-order-num { font-family: 'Courier New', monospace; font-weight: 700; font-size: 14px; color: #1e3a8a; }
.task-drawer-section-title { font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 10px; }
.task-drawer-type-list { display: flex; flex-direction: column; gap: 4px; }
.task-drawer-type-row { display: flex; align-items: center; gap: 6px; }
.task-drawer-type-qty { font-size: 12px; color: #374151; }
.task-drawer-timeline {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f9fafb;
  padding: 14px 18px;
}
.task-drawer-timeline-item {
  display: flex;
  gap: 12px;
}
.task-drawer-timeline-item:last-child .task-drawer-timeline-line {
  display: none;
}
.task-drawer-timeline-axis {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}
.task-drawer-timeline-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #2563eb;
  margin-top: 4px;
}
.task-drawer-timeline-dot.edit {
  background: #7c3aed;
}
.task-drawer-timeline-line {
  width: 2px;
  flex: 1;
  background: #dbeafe;
  margin-top: 4px;
  min-height: 28px;
}
.task-drawer-timeline-content {
  flex: 1;
  padding-bottom: 14px;
}
.task-drawer-timeline-title {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
}
.task-drawer-timeline-meta {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-top: 4px;
  font-size: 12px;
  color: #6b7280;
}
.task-drawer-feedback-panel {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 14px 18px;
  background: #f9fafb;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.task-drawer-feedback-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.task-drawer-feedback-key { font-size: 13px; color: #6b7280; flex-shrink: 0; }
.task-drawer-feedback-date { font-size: 12px; color: #374151; margin-left: 4px; }
.task-drawer-feedback-notes { font-size: 13px; color: #374151; }
.task-drawer-edit-list {
  margin: 8px 0 0;
  padding-left: 18px;
  color: #374151;
  font-size: 12px;
}
.task-drawer-edit-list li + li {
  margin-top: 4px;
}

.sub-orders-panel {
  background: #f8fafc;
  border-top: 1px dashed #e5e7eb;
  padding: 12px 16px 16px 32px;
}
.sub-orders-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.sub-orders-title { font-size: 12px; font-weight: 600; color: #374151; }
.sub-orders-header-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.sub-orders-selected { font-size: 12px; color: #2563eb; font-weight: 600; }
.sub-orders-eligible { font-size: 12px; color: #6b7280; }
.no-sub-orders { margin-top: 10px; color: #9ca3af; font-size: 13px; text-align: center; padding: 12px 0; }
.task-status-history {
  margin-top: 12px;
  margin-bottom: 12px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: #ffffff;
}
.task-status-history-title {
  font-size: 12px;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 10px;
}
.task-status-history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.task-status-history-item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  border-radius: 8px;
  background: #f8fafc;
  border: 1px solid #f0f0f0;
}
.task-status-history-main {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.task-status-history-text {
  font-size: 12px;
  color: #374151;
  word-break: break-all;
}
.task-status-history-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
  font-size: 12px;
  color: #6b7280;
}
.status-reason-modal-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.status-reason-modal-order {
  font-size: 12px;
  color: #6b7280;
}
.status-reason-modal-label {
  font-size: 13px;
  color: #374151;
  font-weight: 600;
}

.sub-no { font-family: 'Courier New', monospace; font-size: 11px; color: #374151; }
.order-num-sm { font-family: 'Courier New', monospace; font-size: 11px; color: #374151; }
.keyword-tag {
  display: inline-block;
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 11px;
  font-weight: 500;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.variant-text { font-size: 11px; color: #6b7280; }
.date-normal { font-size: 12px; color: #374151; }
.date-overdue { font-size: 12px; color: #dc2626; font-weight: 600; }
.price-main { font-size: 11px; font-weight: 600; color: #16a34a; }
.price-sub { font-size: 11px; color: #6b7280; }
.commission-val { font-size: 12px; font-weight: 600; color: #059669; }
.refund-amount { font-size: 11px; color: #f59e0b; font-weight: 600; margin-top: 2px; }
.refund-method-tag { font-size: 11px; color: #6b7280; }
.refund-status-cell { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
.principal-loss-hint {
  align-self: flex-end;
  font-size: 10px;
  line-height: 1;
  color: #dc2626;
  background: rgba(220, 38, 38, 0.08);
  border: 1px solid rgba(220, 38, 38, 0.18);
  border-radius: 999px;
  padding: 2px 6px;
}
.media-link { font-size: 11px; color: #2563eb; display: inline-flex; align-items: center; gap: 2px; }
.sub-progress-cell { display: flex; align-items: center; gap: 3px; flex-wrap: wrap; }
.prog-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
.prog-dot.done { background: #16a34a; }
.prog-dot.pending { background: #d1d5db; }
.prog-label { font-size: 10px; color: #6b7280; margin-left: 2px; }
.staff-name { color: #374151; font-size: 12px; }
.notes-text { font-size: 11px; color: #6b7280; max-width: 150px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle; }
.text-gray { color: #9ca3af; font-size: 12px; }
.text-red { color: #dc2626; }
.remark-text { color: #dc2626; font-weight: 500; font-size: 12px; }
.info-stack-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: #374151;
}
.info-stack-label {
  display: inline-block;
  min-width: 40px;
  color: #6b7280;
}

.empty-list { padding: 40px 0; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; padding-top: 16px; border-top: 1px solid #f0f0f0; }

/* 详情弹窗 */
.detail-modal-body { padding: 0; }
.detail-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  border-bottom: 1px solid #f0f0f0;
  background: #f8fafc;
}
.detail-sub-number {
  font-family: 'Courier New', monospace;
  font-size: 15px;
  font-weight: 700;
  color: #1a1a2e;
}
.detail-sections {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: calc(90vh - 120px);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.append-modal-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.append-modal-summary {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f8fafc;
}
.append-modal-order {
  font-size: 13px;
  color: #374151;
  font-weight: 500;
}
.append-modal-count-row {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}
.append-modal-label {
  font-size: 13px;
  color: #1a1a2e;
  font-weight: 600;
}
.append-modal-hint {
  font-size: 12px;
  color: #6b7280;
}
.append-batch-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f8fafc;
  padding: 14px;
}
.append-batch-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}
.append-batch-title {
  font-size: 13px;
  font-weight: 700;
  color: #1a1a2e;
}
.append-card-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 56vh;
  overflow-y: auto;
  padding-right: 4px;
}
.append-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #ffffff;
  padding: 14px;
}
.append-card-title {
  font-size: 13px;
  font-weight: 700;
  color: #1a1a2e;
  margin-bottom: 12px;
}
.append-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}
.append-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.append-field label {
  font-size: 12px;
  color: #6b7280;
  font-weight: 600;
}
.append-field-span-2 {
  grid-column: span 2;
}
.append-field-span-3 {
  grid-column: span 3;
}
.append-date-input {
  width: 100%;
}

@media (max-width: 767px) {
  .append-modal-count-row {
    margin-left: 0;
  }
  .append-batch-header {
    align-items: flex-start;
  }
  .append-grid {
    grid-template-columns: 1fr;
  }
  .append-field-span-2,
  .append-field-span-3 {
    grid-column: span 1;
  }
  .detail-sections {
    max-height: calc(100dvh - 110px);
    padding: 12px;
  }
  .detail-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }
  .detail-item:nth-child(3n) {
    border-right: 1px solid #f0f0f0;
  }
  .detail-item:nth-child(2n) {
    border-right: none;
  }
}
.detail-section { border: 1px solid #f0f0f0; border-radius: 8px; overflow: hidden; }
.detail-section-title {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: #f9fafb;
  padding: 7px 14px;
  border-bottom: 1px solid #f0f0f0;
}
.detail-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0;
}
.detail-item {
  padding: 9px 14px;
  border-right: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.detail-item:nth-child(3n) { border-right: none; }
.detail-item label { font-size: 11px; color: #9ca3af; font-weight: 500; }
.detail-item span { font-size: 13px; color: #374151; word-break: break-all; }
.detail-full { grid-column: 1 / -1; }
.mono { font-family: 'Courier New', monospace; font-size: 12px; }
.price-usd { color: #16a34a; font-weight: 600; font-size: 13px; }
.price-highlight { color: #2563eb; font-weight: 600; }
.commission-highlight { color: #059669; font-weight: 600; }
.refund-highlight { color: #f59e0b; font-weight: 600; }
.keyword-highlight {
  color: #2563eb;
  font-weight: 600;
  background: #eff6ff;
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid #bfdbfe;
  font-size: 12px;
}
.detail-product-img { width: 60px; height: 60px; object-fit: cover; border-radius: 6px; border: 1px solid #f0f0f0; }
.review-screenshot { max-width: 100%; border-radius: 8px; border: 1px solid #f0f0f0; margin-top: 4px; }

/* ===== Main Tabs ===== */
.main-tabs {
  margin-bottom: -1px;
}
:deep(.main-tabs .ant-tabs-nav) {
  margin-bottom: 0;
}
:deep(.main-tabs .ant-tabs-tab) {
  font-size: 14px;
  font-weight: 500;
}
:deep(.main-tabs .ant-tabs-tab-active .ant-tabs-tab-btn) {
  color: #2563eb;
}
:deep(.main-tabs .ant-tabs-ink-bar) {
  background: #2563eb;
}


/* ===== 排期详情弹窗 ===== */
.sched-modal-body { padding: 4px 0 8px; }
.sched-modal-meta {
  display: flex;
  gap: 20px;
  align-items: center;
  padding: 10px 16px;
  background: #f8fafc;
  border-radius: 8px;
  margin-bottom: 16px;
  border: 1px solid #e5e7eb;
}
.sched-meta-item { font-size: 13px; color: #374151; }
.sched-meta-item b { color: #1a1a2e; }
.sched-fixed-badge {
  display: inline-block;
  background: #dcfce7;
  color: #16a34a;
  border-radius: 4px;
  padding: 1px 8px;
  font-size: 12px;
  font-weight: 600;
}
.sched-flex-badge {
  display: inline-block;
  background: #dbeafe;
  color: #1d4ed8;
  border-radius: 4px;
  padding: 1px 8px;
  font-size: 12px;
  font-weight: 600;
}
.sched-loading { display: flex; justify-content: center; padding: 24px; }
.sched-empty { text-align: center; color: #9ca3af; padding: 24px; font-size: 13px; }
.sched-list { display: flex; flex-direction: column; gap: 6px; }
.sched-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}
.sched-row-date { min-width: 88px; }
.sched-date-normal { font-family: monospace; font-size: 13px; color: #1d4ed8; font-weight: 600; }
.sched-date-overdue { font-family: monospace; font-size: 13px; color: #dc2626; font-weight: 600; }
.sched-row-qty { min-width: 52px; }
.sched-qty-badge {
  background: #dbeafe;
  color: #1d4ed8;
  border-radius: 4px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
}
.sched-row-types { display: flex; gap: 4px; flex-wrap: wrap; min-width: 60px; }
.sched-row-kws { display: flex; gap: 4px; flex-wrap: wrap; flex: 1; }
.sched-kw-tag {
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 11px;
}

/* ===== 排期一览 ===== */
.schedules-preview {
  margin-bottom: 14px;
  padding: 12px 14px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
}
.schedules-preview-title {
  font-size: 12px;
  font-weight: 600;
  color: #64748b;
  margin-bottom: 8px;
}
.schedules-preview-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.schedule-preview-card {
  display: flex;
  align-items: center;
  gap: 6px;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 6px 10px;
  font-size: 12px;
  flex-wrap: wrap;
}
.spc-date {
  font-weight: 700;
  color: #1d4ed8;
  font-size: 12px;
  font-family: monospace;
}
.spc-qty {
  background: #dbeafe;
  color: #1d4ed8;
  border-radius: 4px;
  padding: 1px 6px;
  font-weight: 600;
  font-size: 11px;
}
.spc-types {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.spc-type-badge {
  border-radius: 4px;
  padding: 1px 7px;
  font-size: 11px;
  font-weight: 600;
}
.spc-type-none {
  font-size: 11px;
  color: #9ca3af;
}
.spc-keywords {
  display: flex;
  gap: 3px;
  flex-wrap: wrap;
}
.spc-kw {
  background: #f1f5f9;
  color: #475569;
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 11px;
  border: 1px solid #e2e8f0;
}

.kw-cell,
.editable-cell {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}
.editable-cell-stack {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  cursor: pointer;
}
.kw-cell:hover .kw-edit-icon,
.editable-cell:hover .kw-edit-icon,
.editable-cell-stack:hover .kw-edit-icon { opacity: 1; }
.kw-edit-icon {
  font-size: 11px;
  color: #9ca3af;
  opacity: 0;
  transition: opacity 0.15s;
  flex-shrink: 0;
}
.kw-empty { font-size: 11px; }
.kw-mode-toggle {
  display: flex;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  overflow: hidden;
}
.kw-mode-btn {
  padding: 4px 12px;
  font-size: 13px;
  cursor: pointer;
  color: #6b7280;
  background: #f9fafb;
  transition: background 0.15s, color 0.15s;
  user-select: none;
}
.kw-mode-btn:first-child { border-right: 1px solid #d1d5db; }
.kw-mode-btn.active { background: #2563eb; color: #fff; }
.kw-mode-btn.active.kw-mode-link { background: #0891b2; }
.kw-edit-modal-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 4px 0;
}
.kw-edit-sub-no { font-size: 12px; color: #9ca3af; font-family: 'Courier New', monospace; }
.kw-edit-mode-row, .kw-edit-input-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.kw-edit-label { font-size: 13px; color: #374151; white-space: nowrap; min-width: 52px; }
.kw-link-preview { font-size: 12px; color: #0891b2; padding-left: 62px; }

/* ===== 价格对列 ===== */
.price-pair-cell { display: flex; flex-direction: column; gap: 2px; }
.price-pair-row { display: flex; align-items: center; gap: 4px; }
.price-pair-label { font-size: 10px; color: #9ca3af; min-width: 24px; }
.actual-paid-text { color: #2563eb; }
.refund-actual { color: #16a34a; }

/* ===== 修改/复制按钮 ===== */
.edit-sub-btn { font-size: 12px; color: #374151; }
.copy-sub-btn { font-size: 12px; color: #374151; }

/* ===== ASIN列 ===== */
.asin-cell { display: flex; flex-direction: column; gap: 1px; }
.asin-code { font-family: 'Courier New', monospace; font-size: 11px; color: #374151; font-weight: 600; }
.asin-name { font-size: 10px; color: #9ca3af; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 150px; }
.created-at-text { font-size: 11px; color: #6b7280; }

/* ===== 批量修改弹窗 ===== */
.bme-wrap { padding: 4px 0; }
.bme-count-bar {
  font-size: 13px;
  color: #6b7280;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #fafafa;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
}
.bme-count-bar strong { color: #374151; }
.bme-picker {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 12px;
}
.bme-picker-label { font-size: 12px; color: #374151; font-weight: 600; }
.bme-fields {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.bme-field-row {
  display: grid;
  grid-template-columns: 92px 1fr 56px;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: #fafafa;
}
.bme-field-label { font-size: 13px; color: #374151; font-weight: 600; }
.bme-field-input { min-width: 0; }
.bme-empty {
  padding: 28px 12px;
  text-align: center;
  color: #9ca3af;
  font-size: 13px;
  border: 1px dashed #d1d5db;
  border-radius: 8px;
  background: #fafafa;
}
.bme-date-input {
  height: 28px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0 8px;
  font-size: 12px;
  color: #374151;
  background: #fff;
  outline: none;
  width: 160px;
}
.bme-date-input-full { width: 100%; }
.bme-date-input:focus { border-color: #2563eb; box-shadow: 0 0 0 2px #bfdbfe; }
.bme-preview {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #f9fafb;
  border-radius: 6px;
  border: 1px dashed #d1d5db;
  margin-top: 12px;
}
.bme-preview-label { font-size: 12px; font-weight: 600; color: #374151; margin-right: 4px; }
.bme-preview-empty { color: #9ca3af; font-size: 12px; }

/* ===== 复制弹窗 ===== */
.copy-modal-body { display: flex; flex-direction: column; gap: 14px; padding: 4px 0; }
.copy-sub-selector { display: flex; flex-direction: column; gap: 6px; }
.copy-field-label { font-size: 13px; color: #374151; font-weight: 500; }
.copy-fields-label { font-size: 13px; color: #374151; font-weight: 500; }
.copy-checkbox-group { width: 100%; }
.copy-preview {
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px 14px;
}
.copy-preview-label { font-size: 11px; color: #9ca3af; margin-bottom: 6px; }
.copy-preview-text { font-size: 13px; color: #374151; white-space: pre-line; line-height: 1.7; }
</style>
