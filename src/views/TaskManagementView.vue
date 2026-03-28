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
                <a class="order-num-link">{{ record.order_number }}</a>
                <a-tag :color="getStatusColor(record.status)" class="status-tag">{{ record.status }}</a-tag>
                <a-tag color="default" class="info-tag">{{ record.country }}</a-tag>
                <template v-if="record.order_types && record.order_types.length">
                  <a-tag v-for="ot in record.order_types" :key="ot" :color="getOrderTypeColor(ot)" class="info-tag">{{ ot }}</a-tag>
                </template>
                <template v-else-if="record.order_type">
                  <a-tag :color="getOrderTypeColor(record.order_type)" class="info-tag">{{ record.order_type }}</a-tag>
                </template>
                <a-tag v-if="record.review_level" :color="getReviewLevelColor(record.review_level)" class="info-tag">{{ record.review_level }}</a-tag>
              </div>
              <div class="task-detail-row">
                <span class="detail-item-text">产品：{{ record.product_name || record.asin }}</span>
                <span class="detail-sep">ASIN：<span class="mono-sm">{{ record.asin }}</span></span>
                <span class="detail-sep">店铺：{{ record.store_name }}</span>
                <span class="detail-sep">品牌：{{ record.brand_name || '—' }}</span>
              </div>
              <div class="task-detail-row">
                <span class="detail-item-text">类目：{{ record.category || '—' }}</span>
                <span class="detail-sep">客户：{{ record.customer_name || '—' }}</span>
                <span class="detail-sep">商务：{{ record.sales_person || '—' }}</span>
                <span class="detail-sep">售价：<span class="price-text">${{ Number(record.product_price || 0).toFixed(2) }}</span></span>
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
              <!-- 右侧：买手分配 / 已返款 / 已留评 -->
              <div class="stat-right-col">
                <div class="stat-mini-row">
                  <span class="stat-mini-label assign-label">买手分配 {{ record._scheduled_count || 0 }}</span>
                  <span class="stat-mini-label refund-label">已返款 {{ record._refunded_count || 0 }}</span>
                </div>
                <div class="stat-mini-row">
                  <span class="stat-mini-label review-label">已留评 {{ record._review_count || 0 }}</span>
                </div>
              </div>
            </div>

            <div class="task-actions">
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
              <a-popconfirm title="确定删除此任务及所有子订单吗?" @confirm="deleteTask(record.id)">
                <a-button size="small" type="text" class="icon-btn danger-btn"><DeleteOutlined /></a-button>
              </a-popconfirm>
            </div>
          </div>

          <div v-if="expandedRowKeys.includes(record.id)" class="sub-orders-panel">
            <div class="sub-orders-header">
              <span class="sub-orders-title">子订单列表（{{ subOrdersMap[record.id]?.length || 0 }} / {{ record.order_quantity }} 单）</span>
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
                    >{{ t }}</span>
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
              :pagination="false"
              row-key="id"
              size="small"
              :scroll="{ x: 1800 }"
              style="margin-top:10px"
            >
              <template #bodyCell="{ column, record: sub }">
                <template v-if="column.key === 'sub_no'">
                  <span class="sub-no">{{ sub.sub_order_number }}</span>
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
                <template v-if="column.key === 'sub_variant'">
                  <span v-if="sub.variant_info" class="variant-text">{{ sub.variant_info }}</span>
                  <span v-else class="text-gray">—</span>
                </template>
                <template v-if="column.key === 'sub_scheduled'">
                  <span v-if="sub.scheduled_date" :class="isOverdue(sub.scheduled_date) ? 'date-overdue' : 'date-normal'">
                    {{ sub.scheduled_date }}
                  </span>
                  <span v-else class="text-gray">—</span>
                </template>
                <template v-if="column.key === 'sub_status'">
                  <a-tag :color="getSubStatusColor(sub.status)" size="small">{{ sub.status || '待分配' }}</a-tag>
                </template>
                <template v-if="column.key === 'sub_order_type'">
                  <a-tag v-if="sub.order_type" :color="getOrderTypeColor(sub.order_type)" size="small">{{ sub.order_type }}</a-tag>
                  <span v-else class="text-gray">—</span>
                </template>
                <template v-if="column.key === 'sub_review_type'">
                  <span style="font-size:12px">{{ sub.review_type || '—' }}</span>
                </template>
                <template v-if="column.key === 'sub_review_level'">
                  <span style="font-size:12px">{{ sub.review_level || '—' }}</span>
                </template>
                <template v-if="column.key === 'sub_staff'">
                  <span v-if="sub.staff_name" class="staff-name">{{ sub.staff_name }}</span>
                  <span v-else class="text-gray">未分配</span>
                </template>
                <template v-if="column.key === 'sub_buyer'">
                  <span v-if="sub.buyer_name">{{ sub.buyer_name }}</span>
                  <span v-else class="text-gray">—</span>
                </template>
                <template v-if="column.key === 'sub_amazon_order'">
                  <span v-if="sub.amazon_order_id" class="order-num-sm">{{ sub.amazon_order_id }}</span>
                  <span v-else class="text-gray">—</span>
                </template>
                <template v-if="column.key === 'sub_refund'">
                  <div v-if="sub.refund_status">
                    <a-tag color="orange" size="small">{{ sub.refund_status }}</a-tag>
                    <div v-if="sub.refund_amount" class="refund-amount">¥{{ Number(sub.refund_amount).toFixed(2) }}</div>
                  </div>
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
              >{{ t }}</span>
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
              <div class="detail-item"><label>下单类型</label><span>{{ detailRecord.order_type || '—' }}</span></div>
              <div class="detail-item"><label>测评类型</label><span>{{ detailRecord.review_type || '—' }}</span></div>
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
                  <a-tag v-if="detailRecord.refund_status" color="orange">{{ detailRecord.refund_status }}</a-tag>
                  <span v-else class="text-gray">—</span>
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

  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  ReloadOutlined, RightOutlined, ThunderboltOutlined,
  DeleteOutlined, EditOutlined, SaveOutlined, LinkOutlined, PictureOutlined
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

// ===== Tab =====
const activeTab = ref('tasks')

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
const detailOpen = ref(false)
const detailRecord = ref<any>(null)
const detailOrderId = ref<string>('')
const editMode = ref(false)
const saveLoading = ref(false)
const editForm = ref<any>({})

const taskStatuses = ['待处理', '进行中', '已完成', '已取消', '暂停']
const subStatuses = ['待分配', '已分配', '进行中', '已下单', '已留评', '已完成', '已取消']
const refundStatuses = ['待退款', '退款中', '已退款', '退款失败']
const countries = ['美国', '德国', '英国', '加拿大']

const subColumns = [
  { title: '子订单号', key: 'sub_no', width: 165 },
  { title: '关键词', key: 'sub_keyword', width: 130 },
  { title: '变参', key: 'sub_variant', width: 80 },
  { title: '排期日期', key: 'sub_scheduled', width: 95 },
  { title: '状态', key: 'sub_status', width: 85 },
  { title: '下单类型', key: 'sub_order_type', width: 80 },
  { title: '测评类型', key: 'sub_review_type', width: 80 },
  { title: '评价等级', key: 'sub_review_level', width: 75 },
  { title: '业务员', key: 'sub_staff', width: 80 },
  { title: '买手', key: 'sub_buyer', width: 80 },
  { title: '亚马逊订单号', key: 'sub_amazon_order', width: 145 },
  { title: '退款', key: 'sub_refund', width: 100 },
  { title: '操作', key: 'sub_action', width: 100, fixed: 'right' },
]

const schedulesMap = ref<Record<string, any[]>>({})

function getStatusColor(status: string) {
  const map: Record<string, string> = { '待处理': 'default', '进行中': 'blue', '已完成': 'green', '已取消': 'red', '暂停': 'orange' }
  return map[status] || 'default'
}

function getSubStatusColor(status: string) {
  const map: Record<string, string> = { '待分配': 'default', '已分配': 'cyan', '进行中': 'blue', '已下单': 'orange', '已留评': 'geekblue', '已完成': 'green', '已取消': 'red' }
  return map[status] || 'default'
}

function getReviewLevelColor(level: string) {
  const map: Record<string, string> = { '普通': 'default', '高等': 'blue', '极高等': 'gold' }
  return map[level] || 'default'
}

function getOrderTypeColor(t: string) {
  const map: Record<string, string> = { '免评': 'green', '文字评': 'cyan', '图片评': 'blue', '视频评': 'geekblue', 'Feedback': 'gold' }
  return map[t] || 'default'
}

function getOrderTypeBg(t: string) {
  const map: Record<string, string> = { '免评': '#f0fdf4', '文字评': '#eff6ff', '图片评': '#f5f3ff', '视频评': '#fef2f2', 'Feedback': '#fffbeb' }
  return map[t] || '#f3f4f6'
}

function getOrderTypeTextColor(t: string) {
  const map: Record<string, string> = { '免评': '#15803d', '文字评': '#1d4ed8', '图片评': '#7c3aed', '视频评': '#b91c1c', 'Feedback': '#b45309' }
  return map[t] || '#374151'
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
    staff_name: d.staff_name || '',
    buyer_name: d.buyer_name || '',
    refund_status: d.refund_status || null,
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
    staff_name: d.staff_name || '',
    buyer_name: d.buyer_name || '',
    refund_status: d.refund_status || null,
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
      staff_name: f.staff_name || null,
      buyer_name: f.buyer_name || null,
      refund_status: f.refund_status || null,
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
      query = query.in('status', ['进行中', '待处理', '暂停'])
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
        .select('order_id, status, buyer_name, amazon_order_id')
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
        if (s.status === '已返款') statsMap[s.order_id].refunded++
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

async function loadSubOrders(orderId: string) {
  const { data, error } = await supabase
    .from('sub_orders')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })
  if (error) { message.error('加载子订单失败'); return }
  subOrdersMap.value[orderId] = data || []
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
        review_type: record.review_type,
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
  const { error: subErr } = await supabase.from('sub_orders').delete().eq('order_id', id)
  if (subErr) { message.error('删除子订单失败'); return }
  const { error } = await supabase.from('erp_orders').delete().eq('id', id)
  if (error) { message.error('删除任务失败'); return }
  message.success('任务及子订单已全部删除')
  delete subOrdersMap.value[id]
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

function openKwEdit(sub: any) {
  kwEditRecord.value = sub
  kwEditMode.value = (sub.keyword_type === 'link' ? 'link' : 'keyword') as 'keyword' | 'link'
  kwEditValue.value = sub.keyword_type === 'link' ? (sub.search_link || '') : (sub.keyword || '')
  kwEditOpen.value = true
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

onMounted(() => {
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
.gen-btn { font-size: 12px; }
.icon-btn { color: #6b7280; font-size: 14px; }
.danger-btn:hover { color: #dc2626 !important; }

.sub-orders-panel {
  background: #f8fafc;
  border-top: 1px dashed #e5e7eb;
  padding: 12px 16px 16px 32px;
}
.sub-orders-header { display: flex; align-items: center; justify-content: space-between; }
.sub-orders-title { font-size: 12px; font-weight: 600; color: #374151; }
.no-sub-orders { margin-top: 10px; color: #9ca3af; font-size: 13px; text-align: center; padding: 12px 0; }

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
.staff-name { color: #374151; font-size: 12px; }
.text-gray { color: #9ca3af; font-size: 12px; }
.text-red { color: #dc2626; }

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

@media (max-width: 767px) {
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

.kw-cell {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
}
.kw-cell:hover .kw-edit-icon { opacity: 1; }
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
</style>
