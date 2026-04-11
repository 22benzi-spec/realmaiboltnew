<template>
  <div class="page-content">
    <h1 class="page-title">业务员工作台</h1>

    <div class="workbench-layout">
      <!-- 左侧工作导航 -->
      <div class="staff-sidebar">
        <div class="wb-nav-title">工作导航</div>
        <div class="wb-nav-list">
          <div
            v-for="item in wbNavItems"
            :key="item.key"
            :class="['wb-nav-item', wbNav === item.key ? 'active' : '']"
            @click="wbNav = item.key"
          >
            <span class="wb-nav-label">{{ item.label }}</span>
            <span class="wb-nav-count">{{ item.count }}</span>
          </div>
        </div>
      </div>

      <!-- 右侧主内容 -->
      <div class="workbench-main">
        <template v-if="selectedStaffId">
          <!-- 统计栏 + 筛选 -->
          <div class="top-bar">
            <div class="filter-tabs">
              <span
                v-for="tab in filterTabs"
                :key="tab.value"
                :class="['filter-tab', taskFilter === tab.value ? 'active' : '']"
                @click="setFilter(tab.value)"
              >
                {{ tab.label }}
                <em v-if="tab.count !== undefined">{{ tab.count }}</em>
              </span>
            </div>
            <div class="filter-right">
              <a-checkbox v-model:checked="filterOverdue" @change="filterTaskList">
                <span class="overdue-label">逾期</span>
              </a-checkbox>
              <a-checkbox v-model:checked="filterToday" @change="filterTaskList">今日</a-checkbox>
              <a-checkbox v-model:checked="filterSoon" @change="filterTaskList">即将到期</a-checkbox>
              <a-input-search
                v-model:value="taskSearch"
                placeholder="搜索主订单号/子订单号/ASIN/买手/关键词..."
                style="width:260px"
                @search="filterTaskList"
                allow-clear
                size="small"
              />
              <div class="wb-view-toggle">
                <span :class="['wb-vbtn', wbViewMode === 'order' ? 'active' : '']" @click="wbViewMode = 'order'">主订单视角</span>
                <span :class="['wb-vbtn', wbViewMode === 'sub' ? 'active' : '']" @click="wbViewMode = 'sub'">子订单平铺</span>
              </div>
              <span class="total-hint">{{ workbenchSummary.resultCount }} 条结果</span>
            </div>
          </div>

          <div class="workbench-overview">
            <div class="overview-card">
              <span class="overview-label">待操作主订单</span>
              <strong class="overview-value">{{ workbenchSummary.actionableOrderCount }}</strong>
            </div>
            <div class="overview-card">
              <span class="overview-label">待完善主订单</span>
              <strong class="overview-value">{{ workbenchSummary.improvingOrderCount }}</strong>
            </div>
            <div class="overview-card">
              <span class="overview-label">今日</span>
              <strong class="overview-value">{{ workbenchSummary.todayCount }}</strong>
            </div>
            <div class="overview-card">
              <span class="overview-label">明日</span>
              <strong class="overview-value">{{ workbenchSummary.tomorrowCount }}</strong>
            </div>
            <div class="overview-card">
              <span class="overview-label">后日</span>
              <strong class="overview-value">{{ workbenchSummary.dayAfterTomorrowCount }}</strong>
            </div>
          </div>

          <div v-if="tasksLoading" class="loading-wrap"><a-spin /></div>

          <div v-else-if="filteredTasks.length === 0" class="empty-list">
            <a-empty description="暂无任务数据" />
          </div>

          <div v-else>
            <div v-if="wbViewMode === 'order' && wbNav === 'pending'" class="workbench-sections">
              <div class="wb-section">
                <div class="wb-section-header">
                  <div>
                    <div class="wb-section-title">待操作订单</div>
                    <div class="wb-section-desc">0操作订单，先按主订单启动分配</div>
                  </div>
                  <span class="wb-section-count">{{ pendingOrderGroups.length }} 个主订单</span>
                </div>
                <div v-if="pendingOrderGroups.length === 0" class="empty-list compact-empty">
                  <a-empty description="暂无待操作订单" />
                </div>
                <div v-else class="main-order-list">
                  <div
                    v-for="group in pendingOrderGroups"
                    :key="group.order_id"
                    class="main-order-card"
                  >
                    <div class="main-order-main-row">
                      <div class="main-order-product-img">
                        <img
                          v-if="group.product_image"
                          :src="group.product_image"
                          class="main-order-thumb"
                          referrerpolicy="no-referrer"
                          @error="onImgError"
                        />
                        <div v-else class="main-order-thumb-placeholder">?</div>
                      </div>

                      <div class="main-order-info">
                        <div class="main-order-title-row">
                          <span class="main-order-number">{{ group.order_number || '未关联主订单' }}</span>
                          <a-tag :color="getMainOrderStatusColor(group.order_status)" class="status-tag">{{ group.order_status || '进行中' }}</a-tag>
                          <a-tag v-if="group.country" color="default" class="info-tag">{{ group.country }}</a-tag>
                          <a-tag v-if="group.order_type" color="default" class="info-tag">{{ group.order_type }}</a-tag>
                          <a-tag v-if="group.review_level" color="default" class="info-tag">{{ group.review_level }}</a-tag>
                        </div>
                        <div class="main-order-detail-row">
                          <span class="detail-item-text">产品：{{ group.product_name || group.asin || '—' }}</span>
                          <span class="detail-sep">ASIN：<span class="mono-sm">{{ group.asin || '—' }}</span></span>
                          <span class="detail-sep">店铺：{{ group.store_name || '—' }}</span>
                          <span class="detail-sep">品牌：{{ group.brand_name || '—' }}</span>
                        </div>
                        <div class="main-order-detail-row">
                          <span class="detail-item-text">类目：{{ group.category || '—' }}</span>
                          <span class="detail-sep">客户：{{ group.customer_name || '—' }}</span>
                          <span class="detail-sep">商务：{{ group.sales_person || '—' }}</span>
                          <span class="detail-sep">售价：<span class="price-text">${{ Number(group.product_price || 0).toFixed(2) }}</span></span>
                        </div>
                        <div class="main-order-detail-row">
                          <span class="detail-item-text">最早截止：{{ group.nextDate || '—' }}</span>
                          <span class="detail-sep">今日 {{ group.todayCount }}</span>
                          <span class="detail-sep">明日 {{ group.tomorrowCount }}</span>
                          <span class="detail-sep">后日 {{ group.dayAfterTomorrowCount }}</span>
                        </div>
                      </div>
                    </div>

                    <div class="main-order-footer">
                      <div class="main-order-progress">
                        <span class="main-order-progress-text">待操作 {{ group.actionableSubCount }} / 总子单 {{ group.subs.length }}</span>
                        <div class="main-order-progress-bar">
                          <div class="main-order-progress-fill" :style="{ width: `${getGroupCompletionPct(group)}%` }"></div>
                        </div>
                      </div>
                      <div class="main-order-sub-preview">
                        <span v-for="sub in group.subs.slice(0, 3)" :key="sub.id" class="sub-preview-chip">
                          {{ sub.sub_order_number }}
                        </span>
                        <span v-if="group.subs.length > 3" class="sub-preview-chip more">+{{ group.subs.length - 3 }} 个子单</span>
                      </div>
                      <a-button type="primary" ghost size="small" @click="toggleOrderExpand(group.order_id)">
                        {{ expandedOrderIds.includes(group.order_id) ? '收起子订单' : '展开子订单' }}
                      </a-button>
                    </div>

                    <div v-if="expandedOrderIds.includes(group.order_id)" class="inline-sub-list">
                      <div v-for="sub in group.subs" :key="sub.id" class="inline-sub-row">
                        <div class="inline-sub-main">
                          <div class="inline-sub-line">
                            <span class="inline-sub-no">{{ sub.sub_order_number }}</span>
                            <a-tag :color="getStatusColor(sub.status)" size="small">{{ sub.status }}</a-tag>
                            <span class="inline-sub-checkpoint">{{ getTaskCheckpoint(sub) }}</span>
                          </div>
                          <div class="inline-sub-meta">
                            <span>ASIN：{{ sub.asin || '—' }}</span>
                            <span>买手：{{ sub.buyer_name || '未分配' }}</span>
                            <span>截止：{{ sub.scheduled_date || '—' }}</span>
                          </div>
                        </div>
                        <a-space>
                          <a-button size="small" type="primary" ghost @click="focusTask(sub)">编辑</a-button>
                          <a-button size="small" @click="openTaskOpsDetail(sub)">详情</a-button>
                        </a-space>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
            <div v-if="wbViewMode === 'order' && wbNav === 'improving'" class="workbench-sections">
              <div class="wb-section">
                <div class="wb-section-header">
                  <div>
                    <div class="wb-section-title">待完善订单</div>
                    <div class="wb-section-desc">已分配买手后进入这里，按子订单平铺处理</div>
                  </div>
                  <span class="wb-section-count">{{ improvingTasks.length }} 个子订单</span>
                </div>
              </div>
            </div>
            <div v-if="wbViewMode === 'order' && wbNav === 'afterSale'" class="workbench-sections">
              <div class="wb-section">
                <div class="wb-section-header">
                  <div>
                    <div class="wb-section-title">问题单售后</div>
                    <div class="wb-section-desc">聚合返款/售后相关子订单，优先跟进异常处理</div>
                  </div>
                  <span class="wb-section-count">{{ afterSaleTasks.length }} 个子订单</span>
                </div>
              </div>
            </div>

            <div v-if="wbNav !== 'pending' && displayedTaskCards.length === 0" class="empty-list compact-empty">
              <a-empty :description="wbNav === 'afterSale' ? '暂无问题单售后' : '暂无待完善订单'" />
            </div>

            <!-- 任务卡片列表 -->
            <div v-if="wbNav !== 'pending' && displayedTaskCards.length > 0" class="task-card-list">
            <div
              v-for="task in displayedTaskCards"
              :key="task.id"
              :class="['task-card', task._expanded ? 'expanded' : '', getDangerClass(task)]"
            >
              <!-- 任务卡头 -->
              <div class="task-card-header" @click="toggleExpand(task)">
                <div class="card-header-left">
                  <span class="toggle-icon">{{ task._expanded ? '▼' : '▶' }}</span>
                  <img v-if="task.product_image" :src="task.product_image" class="product-thumb" referrerpolicy="no-referrer" @error="onImgError" />
                  <div v-else class="product-thumb-placeholder"><span>?</span></div>

                  <div class="task-meta">
                    <div class="meta-row1">
                      <span class="sub-no-text">{{ task.sub_order_number }}</span>
                      <a-tag :color="getStatusColor(task.status)" style="margin-left:6px;font-size:11px">{{ task.status }}</a-tag>
                      <a-tag v-if="isOverdue(task.scheduled_date) && !isDone(task.status)" color="error" style="font-size:10px">日超期 {{ overdayCount(task.scheduled_date) }} 天</a-tag>
                      <a-tag v-if="task.order_type" color="default" style="font-size:10px">{{ task.order_type }}</a-tag>
                      <template v-if="task.keyword_type === 'link' && task.search_link">
                        <a :href="task.search_link" target="_blank" rel="noopener noreferrer" class="keyword-badge keyword-link-badge" @click.stop>
                          链接操作
                        </a>
                      </template>
                      <div v-else-if="task.keyword" class="keyword-badge">{{ task.keyword }}</div>
                      <span v-if="task.product_name" class="product-name-sm">{{ task.product_name }}</span>
                    </div>
                    <div class="meta-row2">
                      <span v-if="task._order_number" class="order-chip">{{ task._order_number }}</span>
                      <span class="mono-sm">{{ task.asin }}</span>
                      <span class="sep">{{ task.store_name }}</span>
                      <span class="price-sm">${{ Number(task.product_price || 0).toFixed(2) }}</span>
                      <span v-if="task.category" class="sep text-gray">{{ task.category }}</span>
                      <span v-if="task.country" class="sep text-gray">{{ task.country }}</span>
                    </div>
                    <div class="meta-row3">
                      <span class="meta-focus-item"><span class="meta-focus-label">测评等级</span><span class="meta-focus-value">{{ task.review_level || '—' }}</span></span>
                      <span class="meta-focus-item"><span class="meta-focus-label">指定变体</span><span class="meta-focus-value">{{ task.variant_info || '—' }}</span></span>
                      <span class="meta-focus-item meta-focus-item-wide"><span class="meta-focus-label">任务备注</span><span class="meta-focus-value">{{ task.task_notes || '—' }}</span></span>
                    </div>
                  </div>
                </div>

                <div class="card-header-right">
                  <div v-if="task.scheduled_date" :class="['date-badge', isOverdue(task.scheduled_date) && !isDone(task.status) ? 'date-overdue' : 'date-ok']">
                    截止 {{ task.scheduled_date }}
                  </div>
                  <!-- 进度点 -->
                  <div class="progress-dots">
                    <span v-for="(_step, i) in workflowSteps" :key="i" :class="['dot', getStepDone(task, i) ? 'done' : getStepCurrent(task, i) ? 'current' : 'pending']"></span>
                  </div>
                  <div class="header-assign">
                    <span :class="task.buyer_name ? 'buyer-badge' : 'buyer-none'">{{ task.buyer_name ? '已匹配' : '待匹配' }}</span>
                    <span v-if="task.buyer_name" class="assign-name">{{ task.buyer_name }}</span>
                  </div>
                  <a-tag v-if="task.refund_status && task.refund_status !== '无需退款'" color="orange" style="font-size:10px;margin:0">{{ refundStatusLabel(task.refund_status) }}</a-tag>
                  <a-space size="small" @click.stop>
                    <a-button size="small" type="primary" ghost @click.stop="focusTask(task)">编辑</a-button>
                    <a-button size="small" @click.stop="openTaskOpsDetail(task)">详情</a-button>
                  </a-space>
                </div>
              </div>

              <!-- 展开：步骤化做单流程 -->
              <div v-if="task._expanded" class="workflow-body">
                <!-- 产品信息栏 -->
                <div class="product-info-bar">
                  <div class="pi-item"><span class="pi-label">产品名称</span><span class="pi-val">{{ task.product_name || '—' }}</span></div>
                  <div class="pi-item"><span class="pi-label">品牌</span><span class="pi-val">{{ task.brand_name || '—' }}</span></div>
                  <div class="pi-item"><span class="pi-label">类目</span><span class="pi-val">{{ task.category || '—' }}</span></div>
                  <div class="pi-item"><span class="pi-label">客户</span><span class="pi-val">{{ task.customer_name || '—' }}</span></div>
                  <div class="pi-item"><span class="pi-label">商务</span><span class="pi-val">{{ task.sales_person || '—' }}</span></div>
                </div>

                <!-- 流程面板（直接平铺） -->
                <div class="workflow-steps-modern">
                  <div class="wf-panel">
                    <div class="wf-panel-head">
                      <div class="wf-panel-header">
                        <span class="wf-panel-index">1.</span>
                        <span>匹配买手</span>
                        <span v-if="task.buyer_name" class="wf-panel-status done">已匹配</span>
                        <span v-else class="wf-panel-status todo">待处理</span>
                      </div>
                      <a class="re-edit" @click.stop="task._editing_buyer = true; task._buyer_validation = null">更换买手</a>
                    </div>
                    <div class="wf-panel-body">
                        <div v-if="task.buyer_id && !task._editing_buyer" class="buyer-brief-row">
                          <UserOutlined />
                          <span class="buyer-name-text">{{ task.buyer_name }}</span>
                        </div>
                        <div v-if="task.buyer_id && !task._editing_buyer" class="buyer-brief-desc">
                          {{ task.buyer?.country || '—' }} · {{ task.buyer?.level || '—' }}
                        </div>
                        <div v-if="!task.buyer_id || task._editing_buyer" class="buyer-assign-area">
                          <div class="step-input-row">
                            <a-select
                              v-model:value="task._sel_buyer_id"
                              style="width:220px"
                              show-search
                              option-filter-prop="label"
                              placeholder="选择买手"
                              size="small"
                              allow-clear
                              @change="(val: string) => onBuyerSelect(task, val)"
                            >
                              <a-select-option v-for="b in buyerList" :key="b.id" :value="b.id" :label="b.name" :disabled="!!getBuyerBlockReason(task, b.id)">
                                <div class="buyer-opt-row">
                                  <span>{{ b.name }}</span>
                                  <span class="buyer-opt-meta"> · {{ b.country || '—' }} · {{ b.level }}</span>
                                  <span v-if="getBuyerBlockReason(task, b.id)" class="buyer-opt-blocked">{{ getBuyerBlockReason(task, b.id) }}</span>
                                </div>
                              </a-select-option>
                            </a-select>
                            <a-button
                              type="primary" size="small"
                              :loading="task._saving_buyer || task._validating_buyer"
                              :disabled="!task._sel_buyer_id || task._buyer_validation?.blocked"
                              @click="assignBuyer(task)"
                            >确认分配</a-button>
                          </div>
                          <div v-if="task._validating_buyer" class="buyer-validation-hint checking">
                            <LoadingOutlined /> 验证买手资格...
                          </div>
                          <div v-else-if="task._buyer_validation?.blocked" class="buyer-validation-hint blocked">
                            <ExclamationCircleOutlined />
                            <span>{{ task._buyer_validation.reason }}</span>
                          </div>
                          <div v-else-if="task._buyer_validation && !task._buyer_validation.blocked" class="buyer-validation-hint passed">
                            <CheckCircleFilled /> 买手资格验证通过
                            <span v-if="task._buyer_validation.monthlyCount !== undefined" class="val-detail">· 本月已接单 {{ task._buyer_validation.monthlyCount }}/2</span>
                          </div>
                        </div>
                    </div>
                  </div>

                  <div class="wf-panel">
                    <div class="wf-panel-head">
                      <div class="wf-panel-header">
                        <span class="wf-panel-index">2.</span>
                        <span>{{ refundPanelTitle(task) }}</span>
                        <span v-if="isRefundStepReadonly(task)" class="wf-panel-status done">已完成</span>
                        <span v-else-if="task._refund_request_pending" class="wf-panel-status todo">待财务审核</span>
                        <span v-else class="wf-panel-status todo">当前待办</span>
                      </div>
                    </div>
                    <div class="wf-panel-body">
                        <template v-if="isRefundStepReadonly(task)">
                          <div class="refund-compact-card">
                            <div class="refund-compact-main">
                              <div class="refund-compact-title">
                                <span>已处理返款 {{ processedRefundsForDisplay(task).length }} 笔</span>
                              </div>
                              <div class="refund-compact-meta">
                                <span v-if="task.refund_method">当前方式 {{ task.refund_method }}</span>
                                <span v-if="aggregateProcessedRefunds(task).any">累计 ${{ (aggregateProcessedRefunds(task).paypalTotal + aggregateProcessedRefunds(task).giftFace).toFixed(2) }}</span>
                                <span>明细请点子订单后的「详情」查看</span>
                              </div>
                            </div>
                          </div>
                          <div class="extra-refund-bar">
                            <a-button size="small" type="primary" ghost @click="startSupplementalRefund(task)">追加返款</a-button>
                            <a-input-number v-model:value="task._extra_refund_amount" size="small" :min="0" :precision="2" style="width:130px" placeholder="追加基数$" />
                            <span class="extra-method-label">追加方式</span>
                            <a-radio-group v-model:value="task._extra_refund_method" size="small">
                              <a-radio value="同首笔">同首笔</a-radio>
                              <a-radio value="礼品卡">礼品卡</a-radio>
                              <a-radio value="PayPal">PayPal</a-radio>
                            </a-radio-group>
                            <a-radio-group v-model:value="task._extra_refund_reason" size="small">
                              <a-radio value="产品涨价">产品涨价</a-radio>
                              <a-radio value="产品额外佣金">产品额外佣金</a-radio>
                            </a-radio-group>
                          </div>
                        </template>

                        <template v-else>
                          <a-alert
                            v-if="task._refund_supplement_mode"
                            type="info"
                            show-icon
                            style="margin-bottom:8px"
                            :message="'追加返款：原因「' + (task._extra_refund_reason || '—') + '」。' + (task._extra_refund_reason === '产品涨价' ? '请务必将「实付金额」改为涨价后的真实金额（不可仍等于系统标价）。' : '')"
                          />
                          <a-alert
                            v-if="task._refund_correction_mode"
                            type="warning"
                            show-icon
                            style="margin-bottom:8px"
                            message="更正返款：将生成新的待财务处理申请。若上一笔为打款失败，也可请财务先将原单标记「已取消」后再提交本单。"
                          />
                          <a-alert
                            v-if="task._refund_request_pending && !task._refund_supplement_mode && !task._refund_correction_mode"
                            type="info"
                            show-icon
                            style="margin-bottom:8px"
                            message="当前有一条待财务审核的返款申请，您可修改金额或 PayPal 邮箱后再次提交更新；每次有效变更会追加一条留痕记录。"
                          />
                          <div
                            v-if="(task._refund_request_pending?.staff_change_log || []).length && !task._refund_supplement_mode && !task._refund_correction_mode"
                            class="refund-audit-trail"
                          >
                            <div class="rat-title">业务员修改留痕</div>
                            <div v-for="(entry, ei) in (task._refund_request_pending.staff_change_log || [])" :key="ei" class="rat-entry">
                              <div class="rat-meta">{{ fmtShortTime(entry.at) }} · {{ entry.staff_name }}</div>
                              <ul class="rat-ul">
                                <li v-for="(ed, ej) in (entry.edits || [])" :key="ej">{{ formatAuditEdit(ed) }}</li>
                              </ul>
                            </div>
                          </div>
                          <div v-if="task._refund_supplement_mode || task._refund_correction_mode" class="refund-action-row" style="margin-bottom:4px">
                            <a-button size="small" @click="cancelRefundSpecialModes(task)">取消</a-button>
                          </div>
                          <div class="refund-setup-row">
                            <span class="refund-setup-label">返款节点</span>
                            <a-radio-group v-model:value="task._sel_refund_sequence" size="small" @change="syncRefundComputed(task)">
                              <a-radio value="预付">预付</a-radio>
                              <a-radio value="出单后返">出单后返</a-radio>
                              <a-radio value="收货后返">收货后返</a-radio>
                              <a-radio value="评后返">评后返</a-radio>
                            </a-radio-group>
                          </div>
                          <div class="refund-setup-row">
                            <span class="refund-setup-label">返款方式</span>
                            <a-radio-group v-model:value="task._sel_refund_method" size="small" @change="syncRefundComputed(task)">
                              <a-radio value="礼品卡">礼品卡</a-radio>
                              <a-radio value="PayPal">贝宝(PayPal)</a-radio>
                              <a-radio value="其他">其他</a-radio>
                            </a-radio-group>
                          </div>

                          <div v-if="task._sel_refund_method === 'PayPal'" class="refund-row">
                            <label>买手 PayPal 邮箱</label>
                            <a-input v-model:value="task._buyer_paypal_email" size="small" style="width:220px" placeholder="amanda@example.com" />
                          </div>

                          <div class="refund-amount-box">
                            <div class="refund-amount-title">金额明细</div>
                            <div class="refund-product-ref">系统产品标价（参考）<span class="refund-product-ref-val">${{ Number(task.product_price || 0).toFixed(2) }}</span></div>
                            <div v-if="task._sel_refund_method === 'PayPal'" class="refund-amount-fields">
                              <div class="raf-line">
                                <span class="raf-label">实付金额</span>
                                <a-input-number v-model:value="task._refund_amount_usd" size="small" :min="0" :precision="2" style="width:140px" prefix="$" @change="syncRefundComputed(task)" />
                                <span class="raf-hint">买手实际支付</span>
                              </div>
                              <div class="raf-line">
                                <span class="raf-label">贝宝手续费</span>
                                <a-input-number v-model:value="task._refund_fee_usd" size="small" :min="0" :precision="2" style="width:140px" prefix="$" @change="syncRefundComputed(task)" />
                                <span class="raf-hint">由财务承担的手续费，计入打款总额</span>
                              </div>
                              <div class="raf-line raf-total">
                                <span class="raf-label">合计返款</span>
                                <span class="raf-total-val">${{ getRefundFinalAmount(task).toFixed(2) }}</span>
                              </div>
                            </div>
                            <div v-else class="refund-amount-fields">
                              <div class="raf-line">
                                <span class="raf-label">实付金额</span>
                                <a-input-number v-model:value="task._refund_amount_usd" size="small" :min="0" :precision="2" style="width:140px" prefix="$" @change="syncRefundComputed(task)" />
                                <span class="raf-hint">买手实际支付（可与标价不同）</span>
                              </div>
                              <div class="raf-line">
                                <span class="raf-label">应返礼品卡面额</span>
                                <a-input-number v-model:value="task._refund_final_amount_usd" size="small" :min="0" :precision="2" style="width:140px" prefix="$" />
                                <span class="raf-hint">发给买手的卡面金额，可与实付一致或含补贴</span>
                              </div>
                            </div>
                          </div>

                          <div class="refund-row">
                            <label>备注</label>
                            <a-input v-model:value="task._refund_apply_notes" size="small" style="width:320px" placeholder="选填，例如：买手催款..." />
                          </div>
                          <div class="refund-row">
                            <a-checkbox v-model:checked="task._need_finance_screenshot">需财务提供返款截图</a-checkbox>
                          </div>
                          <div class="refund-action-row">
                            <a-button
                              type="primary" size="small"
                              :loading="task._submitting_refund"
                              :disabled="!getRefundFinalAmount(task)"
                              @click="submitRefundRequest(task)"
                            >{{ refundSubmitButtonText(task) }}</a-button>
                          </div>
                        </template>
                    </div>
                  </div>

                  <div class="wf-panel">
                    <div class="wf-panel-head">
                      <div class="wf-panel-header">
                        <span class="wf-panel-index">3.</span>
                        <span>填写Amazon订单号</span>
                        <span v-if="task.amazon_order_id" class="wf-panel-status done">已完成</span>
                        <span v-else class="wf-panel-status todo">待处理</span>
                      </div>
                    </div>
                    <div class="wf-panel-body">
                        <a-alert
                          v-if="isPrepayMode(task) && !isRefundStepReadonly(task)"
                          type="info"
                          show-icon
                          message="预付模式需等待财务返款完成后，才可填写Amazon订单号"
                          style="margin-bottom:10px"
                        />
                        <div class="step-input-row">
                          <a-input
                            v-model:value="task._input_amazon_order_id"
                            size="small"
                            style="width:220px"
                            placeholder="111-1111111-1111111"
                            :disabled="isPrepayMode(task) && !isRefundStepReadonly(task)"
                          />
                          <a-button
                            type="primary"
                            size="small"
                            :loading="task._saving_amazon"
                            :disabled="!task._input_amazon_order_id || (isPrepayMode(task) && !isRefundStepReadonly(task))"
                            @click="saveAmazonOrder(task)"
                          >确认</a-button>
                        </div>
                    </div>
                  </div>

                  <div class="wf-panel">
                    <div class="wf-panel-head">
                      <div class="wf-panel-header">
                        <span class="wf-panel-index">4.</span>
                        <span>留评凭证上传</span>
                        <span v-if="task.review_screenshot_url" class="wf-panel-status done">已完成</span>
                        <span v-else class="wf-panel-status todo">待处理</span>
                      </div>
                    </div>
                    <div class="wf-panel-body">
                        <div class="refund-row">
                          <label>凭证类型</label>
                          <a-radio-group v-model:value="task._proof_type" size="small">
                            <a-radio value="Review">Review(留评)</a-radio>
                            <a-radio value="Feedback">Feedback(店铺反馈)</a-radio>
                          </a-radio-group>
                        </div>
                        <div class="refund-row">
                          <label>评论链接</label>
                          <a-input v-model:value="task._proof_comment_link" size="small" style="width:360px" placeholder="https://..." />
                        </div>
                        <div class="refund-row">
                          <label>凭证图片</label>
                          <a-input
                            v-model:value="task._input_screenshot_url"
                            size="small"
                            style="width:360px"
                            placeholder="粘贴图片URL（支持多张可用逗号分隔）"
                          />
                        </div>
                        <div class="refund-action-row">
                          <a-button type="primary" size="small" :loading="task._saving_screenshot" :disabled="!task._input_screenshot_url" @click="saveScreenshot(task)">提交</a-button>
                        </div>
                    </div>
                  </div>

                  <div class="wf-panel">
                    <div class="wf-panel-head">
                      <div class="wf-panel-header">
                        <span class="wf-panel-index">5.</span>
                        <span>子单备注</span>
                        <span v-if="task.notes" class="wf-panel-status done">已填写</span>
                        <span v-else class="wf-panel-status todo">选填</span>
                      </div>
                    </div>
                    <div class="wf-panel-body">
                      <div class="refund-row">
                        <label>子单备注</label>
                        <a-input
                          v-model:value="task._edit_order_notes"
                          size="small"
                          style="width:360px"
                          placeholder="填写子单备注"
                          @blur="quickSave(task, 'notes', task._edit_order_notes)"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 底部操作栏 -->
                <div class="workflow-footer">
                  <a-button size="small" ghost style="color:#f59e0b;border-color:#f59e0b" @click="releaseToHall(task)">↗️ 放到抢单大厅</a-button>
                  <span class="wf-footer-divider">|</span>
                  <a-button size="small" type="primary" ghost style="color:#0284c7;border-color:#0284c7" @click="openTransferModal(task)">👤 转给他人</a-button>
                </div>
              </div>
            </div>
          </div>
          </div>
        </template>

        <!-- 待接收的互转请求 -->
        <div v-if="selectedStaffId && !isAllStaffSelected && incomingRequests.length > 0" class="incoming-transfer-panel">
          <div class="incoming-header">
            <SwapOutlined style="color:#f59e0b" />
            <span class="incoming-title">待接收的互转请求</span>
            <a-badge :count="incomingRequests.length" :overflow-count="99" style="margin-left:4px" />
          </div>
          <div class="incoming-list">
            <div v-for="req in incomingRequests" :key="req.id" class="incoming-item">
              <div class="incoming-item-left">
                <div class="incoming-from">
                  <ArrowRightOutlined style="color:#f59e0b;font-size:11px" />
                  <span class="incoming-from-name">{{ req.from_staff_name }}</span>
                  <span class="incoming-from-label">发起转单</span>
                </div>
                <div class="incoming-sub-info">
                  <span class="incoming-sub-no">{{ req.sub_order_number }}</span>
                  <span v-if="req._sub?.asin" class="incoming-asin">{{ req._sub?.asin }}</span>
                  <span v-if="req._sub?.product_name" class="incoming-pname">{{ req._sub?.product_name }}</span>
                  <span v-if="req._sub?.scheduled_date" class="incoming-date">截止 {{ req._sub?.scheduled_date }}</span>
                </div>
                <div v-if="req.reason" class="incoming-reason">原因：{{ req.reason }}</div>
              </div>
              <div class="incoming-item-right">
                <span class="incoming-time">{{ fmtTime(req.created_at) }}</span>
                <div class="incoming-actions">
                  <a-button type="primary" size="small" :loading="req._accepting" @click="acceptTransfer(req)" style="background:#059669;border-color:#059669">接受</a-button>
                  <a-button size="small" danger ghost :loading="req._rejecting" @click="openRejectModal(req)">拒绝</a-button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 我发出的待确认互转 -->
        <div v-if="selectedStaffId && !isAllStaffSelected && outgoingRequests.length > 0" class="outgoing-transfer-panel">
          <div class="outgoing-header">
            <ClockCircleOutlined style="color:#6b7280" />
            <span class="outgoing-title">我发出的互转请求（等待对方确认）</span>
          </div>
          <div class="outgoing-list">
            <div v-for="req in outgoingRequests" :key="req.id" class="outgoing-item">
              <span class="outgoing-sub-no">{{ req.sub_order_number }}</span>
              <ArrowRightOutlined style="color:#9ca3af;font-size:10px;margin:0 4px" />
              <span class="outgoing-to">{{ req.to_staff_name }}</span>
              <span v-if="req.reason" class="outgoing-reason">· {{ req.reason }}</span>
              <span class="outgoing-time">{{ fmtTime(req.created_at) }}</span>
              <a-button type="link" size="small" danger @click="cancelTransferRequest(req)">撤销</a-button>
            </div>
          </div>
        </div>

        <div v-if="!selectedStaffId" class="empty-state">
          <TeamOutlined style="font-size:48px; color:#d1d5db" />
          <p>暂无可用业务员数据</p>
        </div>
      </div>
    </div>

    <!-- 取消弹窗 -->
    <a-modal v-model:open="cancelModalOpen" title="客户取消 & 补单" @ok="submitCancel" :confirm-loading="cancelSaving">
      <a-form layout="vertical">
        <a-form-item label="取消原因">
          <a-textarea v-model:value="cancelForm.reason" :rows="3" placeholder="请填写取消原因" />
        </a-form-item>
        <a-form-item label="是否需要补单">
          <a-radio-group v-model:value="cancelForm.needComplement">
            <a-radio :value="true">需要补单</a-radio>
            <a-radio :value="false">无需补单</a-radio>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 互转请求弹窗 -->
    <a-modal
      v-model:open="transferModalOpen"
      title="发起互转请求"
      @ok="submitTransfer"
      :confirm-loading="transferSaving"
      ok-text="发送请求"
    >
      <div v-if="transferTarget" class="transfer-req-modal-body">
        <div class="transfer-req-info">
          <span>子订单号：<strong>{{ transferTarget.sub_order_number }}</strong></span>
          <span v-if="transferTarget.asin">ASIN：<strong>{{ transferTarget.asin }}</strong></span>
          <span v-if="transferTarget.scheduled_date">截止：<strong>{{ transferTarget.scheduled_date }}</strong></span>
        </div>
        <a-alert message="发送后对方业务员需要主动接受，接受后订单才会转移。" type="info" show-icon style="margin-bottom:16px" />
        <a-form layout="vertical">
          <a-form-item label="目标业务员">
            <a-select v-model:value="transferForm.staffId" style="width:100%" show-search option-filter-prop="label" placeholder="选择业务员">
              <a-select-option
                v-for="s in staffList.filter(s => s.id !== selectedStaffId)"
                :key="s.id" :value="s.id" :label="s.name"
              >{{ s.name }}</a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="转单原因（可选）">
            <a-input v-model:value="transferForm.reason" placeholder="如：客户指定、负载均衡、专业匹配等" />
          </a-form-item>
        </a-form>
      </div>
    </a-modal>

    <!-- 拒绝互转弹窗 -->
    <a-modal
      v-model:open="rejectModalOpen"
      title="拒绝转单请求"
      @ok="submitReject"
      :confirm-loading="rejectSaving"
      ok-text="确认拒绝"
      ok-type="danger"
    >
      <a-form layout="vertical">
        <a-form-item label="拒绝原因（可选）">
          <a-textarea v-model:value="rejectForm.reason" :rows="3" placeholder="请填写拒绝原因" />
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 回转弹窗 -->
    <a-modal
      v-model:open="returnModalOpen"
      title="回转给管理员重新分配"
      @ok="submitReturn"
      :confirm-loading="returnSaving"
      ok-text="确认回转"
    >
      <div v-if="returnTarget" class="return-modal-body">
        <div class="return-info-bar">
          <span class="return-info-item">子订单号：<strong>{{ returnTarget.sub_order_number }}</strong></span>
          <span class="return-info-item">当前状态：<a-tag :color="getStatusColor(returnTarget.status)" size="small">{{ returnTarget.status }}</a-tag></span>
          <span v-if="returnTarget.buyer_name" class="return-info-item">当前买手：<strong>{{ returnTarget.buyer_name }}</strong></span>
        </div>
        <a-alert
          message="回转后该子单将重新变为「待分配」状态，从当前业务员工作台移除，等待管理员重新分配。"
          type="warning"
          show-icon
          style="margin-bottom:16px"
        />
        <a-form layout="vertical">
          <a-form-item label="回转原因（必填）">
            <a-textarea v-model:value="returnForm.reason" :rows="3" placeholder="请说明回转原因，如：买手不合适、排期冲突、客户要求更换等" />
          </a-form-item>
          <a-form-item label="是否同时清除买手分配">
            <a-radio-group v-model:value="returnForm.clearBuyer">
              <a-radio :value="true">是，清除买手（重新分配买手）</a-radio>
              <a-radio :value="false">否，保留当前买手</a-radio>
            </a-radio-group>
          </a-form-item>
        </a-form>
      </div>
    </a-modal>

    <SubOrderOpsDrawer
      v-model:open="taskOpsDetailOpen"
      :sub-order-id="taskOpsDetailTarget?.id || ''"
      :fallback-detail="taskOpsDetailTarget"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import {
  TeamOutlined, UserOutlined, CheckCircleFilled,
  SwapOutlined, LoadingOutlined, ExclamationCircleOutlined,
  ArrowRightOutlined, ClockCircleOutlined
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'
import { useCurrentUser } from '../composables/useCurrentUser'
import SubOrderOpsDrawer from '../components/SubOrderOpsDrawer.vue'

const ALL_STAFF_KEY = '__all_staff__'
const { currentUser, isAdmin, loadFromStorage } = useCurrentUser()

const staffList = ref<any[]>([])
const selectedStaffId = ref('')
const allTasks = ref<any[]>([])
const filteredTasks = ref<any[]>([])
const tasksLoading = ref(false)
const taskFilter = ref('')
const taskSearch = ref('')
const filterOverdue = ref(false)
const filterToday = ref(false)
const filterSoon = ref(false)
const buyerList = ref<any[]>([])
const buyerMonthlyCountMap = ref<Record<string, number>>({})
const buyerAsinMap = ref<Record<string, string[]>>({})

const cancelModalOpen = ref(false)
const cancelSaving = ref(false)
const cancelForm = ref<any>({ reason: '', needComplement: false })
const cancelTarget = ref<any>(null)

const transferModalOpen = ref(false)
const transferSaving = ref(false)
const transferForm = ref<any>({ staffId: null, reason: '' })
const transferTarget = ref<any>(null)

const returnModalOpen = ref(false)
const returnSaving = ref(false)
const returnForm = ref<any>({ reason: '', clearBuyer: true })
const returnTarget = ref<any>(null)

const incomingRequests = ref<any[]>([])
const outgoingRequests = ref<any[]>([])

const rejectModalOpen = ref(false)
const rejectSaving = ref(false)
const rejectForm = ref<any>({ reason: '' })
const rejectTarget = ref<any>(null)
const taskOpsDetailOpen = ref(false)
const taskOpsDetailTarget = ref<any>(null)

type WorkbenchNavKey = 'pending' | 'improving' | 'afterSale'

const workflowSteps = [0, 1, 2, 3, 4]
const wbViewMode = ref<'order' | 'sub'>('order')
const wbNav = ref<WorkbenchNavKey>('pending')
const expandedOrderIds = ref<string[]>([])
const enableMockPreview = ref(true)

const isAllStaffSelected = computed(() => selectedStaffId.value === ALL_STAFF_KEY)

const filterTabs = computed(() => {
  const all = allTasks.value
  return [
    { label: '全部', value: '', count: all.length },
    { label: '已分配', value: '已分配', count: all.filter(t => t.status === '已分配').length },
    { label: '进行中', value: '进行中', count: all.filter(t => t.status === '进行中').length },
    { label: '已下单', value: '已下单', count: all.filter(t => t.status === '已下单').length },
    { label: '已留评', value: '已留评', count: all.filter(t => t.status === '已留评').length },
    { label: '已完成', value: '已完成', count: all.filter(t => t.status === '已完成').length },
    { label: '已取消', value: '已取消', count: all.filter(t => t.status === '已取消').length },
  ]
})

const actionableTasks = computed(() => filteredTasks.value.filter(task => !isDone(task.status)))
const improvingTasks = computed(() => actionableTasks.value.filter(task => !!task.buyer_id))
const afterSaleTasks = computed(() =>
  filteredTasks.value.filter(task => !!task.refund_status && task.refund_status !== '无需退款')
)
const displayedTaskCards = computed(() => {
  if (wbNav.value === 'pending') return []
  if (wbNav.value === 'afterSale') return afterSaleTasks.value
  return improvingTasks.value
})
const wbNavItems = computed<Array<{ key: WorkbenchNavKey; label: string; count: number }>>(() => ([
  { key: 'pending', label: '待操作订单', count: pendingOrderGroups.value.length },
  { key: 'improving', label: '待完善订单', count: improvingTasks.value.length },
  { key: 'afterSale', label: '问题单售后', count: afterSaleTasks.value.length },
]))

const workbenchSummary = computed(() => {
  const actionableOrderIds = new Set(actionableTasks.value.map(task => task.order_id || task.id))
  const improvingOrderIds = new Set(improvingTasks.value.map(task => task.order_id || task.id))
  const today = dayjs().format('YYYY-MM-DD')
  const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD')
  const dayAfterTomorrow = dayjs().add(2, 'day').format('YYYY-MM-DD')

  return {
    actionableOrderCount: actionableOrderIds.size,
    improvingOrderCount: improvingOrderIds.size,
    todayCount: actionableTasks.value.filter(task => task.scheduled_date === today).length,
    tomorrowCount: actionableTasks.value.filter(task => task.scheduled_date === tomorrow).length,
    dayAfterTomorrowCount: actionableTasks.value.filter(task => task.scheduled_date === dayAfterTomorrow).length,
    resultCount: filteredTasks.value.length,
  }
})

const groupedWorkbenchOrders = computed(() => {
  const groupMap = new Map<string, any>()

  for (const task of actionableTasks.value) {
    const orderId = task.order_id || task.id
    if (!groupMap.has(orderId)) {
      groupMap.set(orderId, {
        order_id: orderId,
        order_number: task._order_number || '',
        order_status: task._order_status || '',
        customer_name: task.customer_name || '',
        sales_person: task.sales_person || '',
        country: task.country || '',
        product_image: task.product_image || '',
        product_name: task.product_name || '',
        asin: task.asin || '',
        store_name: task.store_name || '',
        brand_name: task.brand_name || '',
        category: task.category || '',
        product_price: task.product_price || 0,
        order_type: task.order_type || '',
        review_type: task.review_type || '',
        review_level: task.review_level || '',
        subs: [],
      })
    }
    groupMap.get(orderId).subs.push(task)
  }

  return Array.from(groupMap.values())
    .map(group => {
      const actionableSubs = group.subs.filter((sub: any) => !isDone(sub.status))
      const nextDate = group.subs
        .filter((sub: any) => sub.scheduled_date && !isDone(sub.status))
        .map((sub: any) => sub.scheduled_date)
        .sort()[0] || ''
      const today = dayjs().format('YYYY-MM-DD')
      const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD')
      const dayAfterTomorrow = dayjs().add(2, 'day').format('YYYY-MM-DD')
      const startedCount = actionableSubs.filter((sub: any) => !!sub.buyer_id).length

      return {
        ...group,
        actionableSubCount: actionableSubs.length,
        completedCount: group.subs.filter((sub: any) => sub.status === '已完成').length,
        startedCount,
        hasStarted: startedCount > 0,
        todayCount: actionableSubs.filter((sub: any) => sub.scheduled_date === today).length,
        tomorrowCount: actionableSubs.filter((sub: any) => sub.scheduled_date === tomorrow).length,
        dayAfterTomorrowCount: actionableSubs.filter((sub: any) => sub.scheduled_date === dayAfterTomorrow).length,
        nextDate,
      }
    })
    .sort((a, b) => {
      if (Number(b.hasStarted) !== Number(a.hasStarted)) return Number(a.hasStarted) - Number(b.hasStarted)
      if (b.actionableSubCount !== a.actionableSubCount) return b.actionableSubCount - a.actionableSubCount
      if (a.nextDate && b.nextDate) return a.nextDate.localeCompare(b.nextDate)
      if (a.nextDate) return -1
      if (b.nextDate) return 1
      return (a.order_number || '').localeCompare(b.order_number || '')
    })
})

const pendingOrderGroups = computed(() => groupedWorkbenchOrders.value.filter(group => !group.hasStarted))

function getStatusColor(s: string) {
  const map: Record<string, string> = {
    '已分配': 'cyan', '进行中': 'blue', '已下单': 'orange',
    '已留评': 'geekblue', '已完成': 'green', '已取消': 'red', '待分配': 'default'
  }
  return map[s] || 'default'
}

function getMainOrderStatusColor(status: string) {
  const map: Record<string, string> = {
    '待处理': 'default',
    '进行中': 'blue',
    '已完成': 'green',
    '已取消': 'red',
    '暂停': 'orange',
  }
  return map[status] || 'default'
}

function isDone(status: string) {
  return ['已完成', '已取消'].includes(status)
}

function isOverdue(dateStr: string) {
  if (!dateStr) return false
  return dayjs(dateStr).isBefore(dayjs(), 'day')
}

function overdayCount(dateStr: string) {
  if (!dateStr) return 0
  return dayjs().diff(dayjs(dateStr), 'day')
}

function getDangerClass(task: any) {
  if (isDone(task.status)) return ''
  if (isOverdue(task.scheduled_date)) return 'card-overdue'
  return ''
}

function getTaskCheckpoint(task: any) {
  if (isDone(task.status)) return '已完成'
  if (!task.buyer_id) return '待分配买手'
  if (!task.refund_method || !task.refund_sequence) return '待设置返款'
  if (task.refund_status !== '已退款') return task._refund_request ? '待返款完成' : '待申请返款'
  if (!task.amazon_order_id) return '待填写订单号'
  if (!task.review_screenshot_url) return '待上传留评'
  return '处理中'
}

function getGroupCompletionPct(group: any) {
  if (!group?.subs?.length) return 0
  return Math.round((group.completedCount / group.subs.length) * 100)
}

function fmtTime(t: string | null) {
  if (!t) return '—'
  return dayjs(t).format('YYYY-MM-DD HH:mm')
}

function onImgError(e: Event) {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
}

function estimateDeliveryDays(placedAt: string) {
  const deliverDate = dayjs(placedAt).add(7, 'day')
  const diff = deliverDate.diff(dayjs(), 'day')
  return diff < 0 ? 0 : diff
}

function estimateDeliveryDate(placedAt: string) {
  return dayjs(placedAt).add(7, 'day').format('M/D')
}

function isRefundStepReadonly(task: any) {
  if (task._refund_supplement_mode || task._refund_correction_mode) return false
  if (task._refund_request_pending) return false
  return task.refund_status === '已退款' || task._refund_request_latest_processed?.status === '已处理'
}

function refundPanelTitle(task: any) {
  if (task._refund_supplement_mode) return '追加返款申请'
  if (task._refund_correction_mode) return '更正返款申请'
  if (isRefundStepReadonly(task)) return '财务返款申请'
  if (task._refund_request_pending) return '返款申请（待审核）'
  return '返款申请'
}

function inferActualPaidUsd(req: any) {
  if (!req) return 0
  const total = Number(req.refund_amount_usd || 0)
  const fee = Number(req.paypal_fee_usd || 0)
  const stored = Number(req.actual_paid_usd || 0)
  if (stored > 0) return stored
  return Math.max(0, Number((total - fee).toFixed(2)))
}

function refundRequestTypeLabel(req: any) {
  if (!req?.request_type || req.request_type === 'initial') return '首笔'
  if (req.request_type === 'supplement') return '追加'
  if (req.request_type === 'correction') return '更正'
  return String(req.request_type)
}

function refundStatusLabel(status: string) {
  const map: Record<string, string> = {
    '待退款': '待返款',
    '退款中': '返款中',
    '已退款': '已返款',
    '退款失败': '返款失败',
  }
  return map[status] || status || ''
}

function processedRefundsForDisplay(task: any) {
  const raw = (task._refund_requests_list || []).filter((r: any) => r.status === '已处理')
  if (raw.length) {
    return raw.slice().sort((a: any, b: any) =>
      new Date(a.created_at || a.updated_at).getTime() - new Date(b.created_at || b.updated_at).getTime())
  }
  if (task.refund_status === '已退款' && Number(task.refund_amount) > 0) {
    return [{
      id: 'synthetic-from-sub-order',
      status: '已处理',
      refund_method: task.refund_method || 'PayPal',
      refund_amount_usd: Number(task.refund_amount || 0),
      actual_paid_usd: Number(task.actual_paid_usd || 0),
      paypal_fee_usd: Number(task.paypal_fee_usd || 0),
      request_type: 'initial',
      product_price: task.product_price,
      buyer_paypal_email: task.buyer_paypal_email,
      created_at: task.refund_date,
      updated_at: task.refund_date,
      _synthetic: true,
    }]
  }
  return []
}

function hasPaypalReceiptInProcessed(task: any) {
  return processedRefundsForDisplay(task).some((r: any) => !!r.paypal_receipt_screenshot)
}

function aggregateProcessedRefunds(task: any) {
  const rows = processedRefundsForDisplay(task)
  let paypalActual = 0
  let paypalFee = 0
  let paypalTotal = 0
  let paypalCount = 0
  let giftFace = 0
  let giftCount = 0
  for (const r of rows) {
    if (r.refund_method === 'PayPal') {
      paypalCount++
      paypalActual += inferActualPaidUsd(r)
      paypalFee += Number(r.paypal_fee_usd || 0)
      paypalTotal += Number(r.refund_amount_usd || 0)
    } else if (r.refund_method === '礼品卡') {
      giftCount++
      giftFace += Number(r.gift_card_face_value_usd || r.refund_amount_usd || 0)
    }
  }
  const any = paypalCount > 0 || giftCount > 0
  return {
    any,
    paypalActual,
    paypalFee,
    paypalTotal,
    paypalCount,
    giftFace,
    giftCount,
  }
}

function formatAuditEdit(e: any) {
  const labels: Record<string, string> = {
    buyer_paypal_email: '买手 PayPal 邮箱',
    actual_paid_usd: '实付金额 (USD)',
    paypal_fee_usd: '贝宝手续费 (USD)',
    refund_amount_usd: '合计返款 (USD)',
    refund_method: '返款方式',
    refund_sequence: '返款节点',
  }
  const lb = labels[e.field] || e.field
  const fromVal = e.from === '' || e.from == null ? '（空）' : String(e.from)
  const toVal = e.to === '' || e.to == null ? '（空）' : String(e.to)
  return `${lb}：${fromVal} → ${toVal}`
}

function hydrateRefundFormFromRequest(task: any, req: any) {
  if (!req) return
  task._sel_refund_method = req.refund_method || task._sel_refund_method
  task._sel_refund_sequence = req.refund_sequence || task._sel_refund_sequence || task.refund_sequence
  task._buyer_paypal_email = req.buyer_paypal_email || task._buyer_paypal_email || ''
  const method = req.refund_method || task._sel_refund_method
  if (method === 'PayPal') {
    const fee = Number(req.paypal_fee_usd || 0)
    const total = Number(req.refund_amount_usd || 0)
    const storedActual = Number(req.actual_paid_usd || 0)
    if (storedActual > 0 || fee > 0) {
      task._refund_amount_usd = storedActual > 0 ? storedActual : Math.max(0, Number((total - fee).toFixed(2)))
      task._refund_fee_usd = fee
    } else {
      task._refund_amount_usd = total
      task._refund_fee_usd = 0
    }
  } else {
    const actual = Number(req.actual_paid_usd || 0)
    task._refund_amount_usd = actual > 0 ? actual : Number(req.product_price || task.product_price || 0)
    const face = Number(req.refund_amount_usd || req.gift_card_face_value_usd || 0)
    task._refund_final_amount_usd = face > 0 ? face : Number(task._refund_amount_usd || 0)
  }
  const rawNotes = req.notes || ''
  task._need_finance_screenshot = /\[需财务返款截图\]/.test(rawNotes)
  task._refund_apply_notes = rawNotes.replace(/\s*\[需财务返款截图\]\s*$/, '').trim()
  syncRefundComputed(task)
}

function startSupplementalRefund(task: any) {
  if (!task._extra_refund_amount || Number(task._extra_refund_amount) <= 0) {
    message.warning('请先填写追加基数金额（美元）')
    return
  }
  task._refund_supplement_mode = true
  task._refund_correction_mode = false
  task._refund_correction_target_id = null
  task._refund_amount_usd = Number(task._extra_refund_amount)
  task._refund_fee_usd = 0
  let method = task._refund_request_latest_processed?.refund_method || task.refund_method || '礼品卡'
  if (task._extra_refund_method === '礼品卡') method = '礼品卡'
  else if (task._extra_refund_method === 'PayPal') method = 'PayPal'
  else if (task._extra_refund_method === '同首笔') {
    method = task._refund_request_latest_processed?.refund_method || task.refund_method || '礼品卡'
  }
  task._sel_refund_method = method
  syncRefundComputed(task)
  if (task._sel_refund_method === '礼品卡') {
    task._refund_final_amount_usd = Number(task._extra_refund_amount)
  }
}

function startCorrectionRefund(task: any) {
  const base = task._refund_request_latest_processed
  if (!base) {
    message.info('暂无已处理的返款记录可关联更正')
    return
  }
  task._refund_correction_mode = true
  task._refund_supplement_mode = false
  task._refund_correction_target_id = base.id
  hydrateRefundFormFromRequest(task, base)
  message.info('已带入上一笔信息，请修改 PayPal 邮箱或金额后提交')
}

function cancelRefundSpecialModes(task: any) {
  task._refund_supplement_mode = false
  task._refund_correction_mode = false
  task._refund_correction_target_id = null
  if (task._refund_request_pending) {
    hydrateRefundFormFromRequest(task, task._refund_request_pending)
  } else {
    task._sel_refund_sequence = task.refund_sequence || '预付'
    task._sel_refund_method = task.refund_method || '礼品卡'
    task._refund_amount_usd = task.product_price ? Number(task.product_price) : 0
    task._refund_fee_usd = task.__mock_refund_fee_usd || 0
    task._refund_final_amount_usd = task.product_price ? Number(task.product_price) : 0
    task._buyer_paypal_email = task.__mock_paypal_email || task.buyer?.paypal_email || ''
    syncRefundComputed(task)
  }
}

function refundSubmitButtonText(task: any) {
  if (task._refund_supplement_mode) return '提交追加返款申请'
  if (task._refund_correction_mode) return '提交更正返款申请'
  if (task._refund_request_pending && !task._refund_supplement_mode && !task._refund_correction_mode) return '更新返款申请'
  return '提交返款申请'
}

function isPrepayMode(task: any) {
  return ['预付', '先退款后给单'].includes(task._sel_refund_sequence || task.refund_sequence || '')
}

function getRefundFinalAmount(task: any) {
  const base = Number(task._refund_amount_usd || 0)
  if (task._sel_refund_method === 'PayPal') {
    return Number((base + Number(task._refund_fee_usd || 0)).toFixed(2))
  }
  return Number(task._refund_final_amount_usd ?? base)
}

function syncRefundComputed(task: any) {
  if (task._sel_refund_method === 'PayPal') {
    if (!task._buyer_paypal_email) {
      const buyer = buyerList.value.find(b => b.id === task.buyer_id)
      task._buyer_paypal_email = buyer?.paypal_email || ''
    }
    task._refund_final_amount_usd = getRefundFinalAmount(task)
  } else if (!task._refund_final_amount_usd) {
    task._refund_final_amount_usd = Number(task._refund_amount_usd || 0)
  }
}

function fmtShortTime(t: string | null) {
  if (!t) return '—'
  return dayjs(t).format('MM-DD HH:mm')
}

function notifyFinanceForReceipt(_task: any) {
  message.success('已向财务发送补充返款凭证提醒')
}

function buildMockTasks() {
  const now = dayjs()
  const today = now.format('YYYY-MM-DD')
  const tomorrow = now.add(1, 'day').format('YYYY-MM-DD')
  const dayAfter = now.add(2, 'day').format('YYYY-MM-DD')

  return [
    {
      id: 'mock_prepay_gift_pending',
      order_id: 'mock_order_1001',
      _order_number: 'MOCK-2026-1001',
      _order_status: '进行中',
      sub_order_number: 'SUB-MOCK-1001',
      status: '已分配',
      staff_name: '张敏',
      buyer_id: 'mock_buyer_amanda',
      buyer_name: 'Amanda Garcia',
      refund_status: '退款中',
      refund_amount: 23.71,
      refund_method: '礼品卡',
      refund_sequence: '预付',
      product_name: '便携榨汁杯',
      brand_name: 'RealmAI',
      category: 'Kitchen',
      review_level: 'A',
      asin: 'B0MOCK1001',
      store_name: 'US-Store-01',
      country: 'US',
      product_price: 21.21,
      scheduled_date: tomorrow,
      keyword: 'portable blender',
      order_type: '免评',
      review_type: '文字评',
      customer_name: '广州优品贸易',
      sales_person: '王浩',
      variant_info: '白色',
      task_notes: '商务备注：预付模式，买手确认后尽快返款',
      notes: '订单备注：客户要求先发礼品卡',
      created_at: now.subtract(1, 'day').toISOString(),
      buyer_assigned_at: now.subtract(10, 'hour').toISOString(),
      _is_mock: true,
      __mock_refund_requests: [
        {
          id: 'mock_rr_gift_initial_1001',
          sub_order_id: 'mock_prepay_gift_pending',
          status: '已处理',
          request_type: 'initial',
          refund_method: '礼品卡',
          refund_sequence: '预付',
          refund_amount_usd: 21.21,
          actual_paid_usd: 21.21,
          gift_card_face_value_usd: 21.21,
          paypal_fee_usd: 0,
          assigned_gift_card_number: 'GC-1001-INIT',
          assigned_gift_card_code: 'INIT-11AA-22BB',
          notes: '先按原始售价发首笔礼品卡',
          finance_notes: '礼品卡已发放，买手确认可正常兑换',
          created_at: now.subtract(9, 'hour').toISOString(),
          handled_at: now.subtract(8, 'hour').toISOString(),
          updated_at: now.subtract(8, 'hour').toISOString(),
        },
        {
          id: 'mock_rr_gift_supplement_1001',
          sub_order_id: 'mock_prepay_gift_pending',
          status: '待处理',
          request_type: 'supplement',
          supplement_reason: '产品涨价',
          refund_method: '礼品卡',
          refund_sequence: '预付',
          refund_amount_usd: 2.50,
          actual_paid_usd: 23.71,
          gift_card_face_value_usd: 2.50,
          paypal_fee_usd: 0,
          assigned_gift_card_number: 'GC-1001-SUP',
          assigned_gift_card_code: 'SUP-33CC-44DD',
          notes: '买手反馈下单时价格上涨，补差额礼品卡',
          finance_notes: '待财务分配补差礼品卡',
          created_at: now.subtract(3, 'hour').toISOString(),
          updated_at: now.subtract(2, 'hour').toISOString(),
          staff_change_log: [
            {
              at: now.subtract(2, 'hour').subtract(20, 'minute').toISOString(),
              staff_name: '张敏',
              edits: [
                { field: 'actual_paid_usd', from: '21.21', to: '23.71' },
                { field: 'refund_amount_usd', from: '0', to: '2.50' },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'mock_prepay_paypal_pending',
      order_id: 'mock_order_1002',
      _order_number: 'MOCK-2026-1002',
      _order_status: '进行中',
      sub_order_number: 'SUB-MOCK-1002',
      status: '进行中',
      staff_name: '李倩',
      buyer_id: 'mock_buyer_emily',
      buyer_name: 'Emily Smith',
      refund_status: '待退款',
      refund_method: 'PayPal',
      refund_sequence: '预付',
      product_name: '蓝牙耳机',
      brand_name: 'RealmAI',
      category: 'Electronics',
      review_level: 'S',
      asin: 'B0MOCK1002',
      store_name: 'US-Store-02',
      country: 'US',
      product_price: 21.21,
      scheduled_date: dayAfter,
      keyword: 'wireless earbuds',
      order_type: '图外评',
      review_type: '图片评',
      customer_name: '深圳芯选电子',
      sales_person: 'Luna',
      variant_info: '黑色蓝牙5.3',
      task_notes: '商务备注：客户急单，今天要回传订单号',
      notes: '订单备注：先返款再下单',
      created_at: now.subtract(2, 'day').toISOString(),
      buyer_assigned_at: now.subtract(20, 'hour').toISOString(),
      _is_mock: true,
      __mock_refund_fee_usd: 1.5,
      __mock_paypal_email: 'emily.smith@example.com',
    },
    {
      id: 'mock_after_review_paypal_done',
      order_id: 'mock_order_1003',
      _order_number: 'MOCK-2026-1003',
      _order_status: '进行中',
      sub_order_number: 'SUB-MOCK-1003',
      status: '已下单',
      staff_name: '王磊',
      buyer_id: 'mock_buyer_olivia',
      buyer_name: 'Olivia White',
      refund_status: '已退款',
      refund_amount: 29.16,
      refund_method: 'PayPal',
      refund_sequence: '评后返',
      product_name: '人体工学鼠标',
      brand_name: 'RealmAI',
      category: 'Office',
      review_level: 'A',
      asin: 'B0MOCK1003',
      store_name: 'US-Store-03',
      country: 'US',
      product_price: 21.21,
      scheduled_date: today,
      amazon_order_id: '111-1111111-1111111',
      order_type: '图外评',
      review_type: '图片评',
      customer_name: '上海森拓科技',
      sales_person: '王浩',
      variant_info: '人体工学版',
      task_notes: '商务备注：客户要求 4/5 前完成全部返款',
      notes: '订单备注：首笔贝宝，涨价部分改走礼品卡',
      created_at: now.subtract(8, 'day').toISOString(),
      buyer_assigned_at: now.subtract(7, 'day').toISOString(),
      amazon_order_placed_at: now.subtract(6, 'day').toISOString(),
      delivery_confirmed_at: now.subtract(4, 'day').toISOString(),
      review_submitted_at: now.subtract(2, 'day').toISOString(),
      _is_mock: true,
      __mock_refund_requests: [
        {
          id: 'mock_rr_paypal_initial',
          sub_order_id: 'mock_after_review_paypal_done',
          status: '已处理',
          request_type: 'initial',
          refund_method: 'PayPal',
          refund_sequence: '评后返',
          refund_amount_usd: 22.71,
          actual_paid_usd: 21.21,
          paypal_fee_usd: 1.5,
          buyer_paypal_email: 'olivia.white@example.com',
          paypal_receipt_screenshot: 'https://placehold.co/240x120/e2e8f0/64748b?text=PayPal+Receipt+1',
          product_price: 21.21,
          notes: '买手要求使用本人主邮箱收款',
          finance_notes: '财务已使用公司 PayPal 完成首笔返款',
          created_at: now.subtract(6, 'day').toISOString(),
          handled_at: now.subtract(5, 'day').add(1, 'hour').toISOString(),
          updated_at: now.subtract(5, 'day').toISOString(),
          staff_change_log: [
            {
              at: now.subtract(5, 'day').subtract(3, 'hour').toISOString(),
              staff_name: '业务员',
              edits: [
                { field: 'buyer_paypal_email', from: 'olivia.typo@wrong.com', to: 'olivia.white@example.com' },
              ],
            },
          ],
        },
        {
          id: 'mock_rr_gift_supplement',
          sub_order_id: 'mock_after_review_paypal_done',
          status: '已处理',
          request_type: 'supplement',
          supplement_reason: '产品涨价',
          refund_method: '礼品卡',
          refund_sequence: '评后返',
          refund_amount_usd: 5.25,
          actual_paid_usd: 24.99,
          gift_card_face_value_usd: 5.25,
          paypal_fee_usd: 0,
          assigned_gift_card_number: 'GC-SUP-7788',
          assigned_gift_card_code: 'SUPP-AB12-CD34',
          product_price: 21.21,
          notes: '产品涨价补差额，改发礼品卡',
          finance_notes: '已分配礼品卡并通知买手兑换',
          created_at: now.subtract(3, 'day').toISOString(),
          handled_at: now.subtract(1, 'day').subtract(2, 'hour').toISOString(),
          updated_at: now.subtract(1, 'day').toISOString(),
        },
        {
          id: 'mock_rr_paypal_correction',
          sub_order_id: 'mock_after_review_paypal_done',
          status: '已处理',
          request_type: 'correction',
          supplement_reason: '更正贝宝邮箱',
          refund_method: 'PayPal',
          refund_sequence: '评后返',
          refund_amount_usd: 1.20,
          actual_paid_usd: 0,
          paypal_fee_usd: 1.2,
          buyer_paypal_email: 'olivia.new@example.com',
          paypal_receipt_screenshot: 'https://placehold.co/240x120/e2e8f0/64748b?text=PayPal+Receipt+2',
          notes: '原邮箱填写错误，补发手续费并更正到账邮箱',
          finance_notes: '原付款失败后已重新打款到新邮箱',
          created_at: now.subtract(22, 'hour').toISOString(),
          handled_at: now.subtract(20, 'hour').toISOString(),
          updated_at: now.subtract(20, 'hour').toISOString(),
          staff_change_log: [
            {
              at: now.subtract(21, 'hour').toISOString(),
              staff_name: '王磊',
              edits: [
                { field: 'buyer_paypal_email', from: 'olivia.white@example.com', to: 'olivia.new@example.com' },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'mock_after_review_gift_done',
      order_id: 'mock_order_1004',
      _order_number: 'MOCK-2026-1004',
      _order_status: '进行中',
      sub_order_number: 'SUB-MOCK-1004',
      status: '已下单',
      staff_name: '陈晨',
      buyer_id: 'mock_buyer_mia',
      buyer_name: 'Mia Brown',
      refund_status: '已退款',
      refund_amount: 23.5,
      refund_method: '礼品卡',
      refund_sequence: '评后返',
      product_name: '运动水壶',
      brand_name: 'RealmAI',
      category: 'Sports',
      review_level: 'B',
      asin: 'B0MOCK1004',
      store_name: 'US-Store-04',
      country: 'US',
      product_price: 23.5,
      scheduled_date: today,
      amazon_order_id: '222-2222222-2222222',
      order_type: '免评',
      review_type: '文字评',
      customer_name: '杭州山野户外',
      sales_person: '陈婷',
      variant_info: '650ml',
      task_notes: '商务备注：本单返礼品卡即可',
      notes: '订单备注：优先发 25 面额礼品卡',
      created_at: now.subtract(9, 'day').toISOString(),
      buyer_assigned_at: now.subtract(8, 'day').toISOString(),
      amazon_order_placed_at: now.subtract(7, 'day').toISOString(),
      delivery_confirmed_at: now.subtract(5, 'day').toISOString(),
      review_submitted_at: now.subtract(3, 'day').toISOString(),
      _is_mock: true,
      __mock_refund_request: {
        id: 'mock_rr_gift_done',
        sub_order_id: 'mock_after_review_gift_done',
        status: '已处理',
        refund_method: '礼品卡',
        refund_amount_usd: 23.5,
        actual_paid_usd: 23.5,
        gift_card_face_value_usd: 23.5,
        request_type: 'initial',
        assigned_gift_card_number: 'GC-7788-9922',
        assigned_gift_card_code: 'A1B2-C3D4-E5F6',
        paypal_receipt_screenshot: '',
        notes: '礼品卡返款',
        finance_notes: '礼品卡已发放并确认可用',
        created_at: now.subtract(3, 'day').toISOString(),
        updated_at: now.subtract(2, 'day').toISOString(),
      },
    },
  ]
}

// 步骤逻辑
function getStepDone(task: any, step: number): boolean {
  switch (step) {
    case 0: return !!task.buyer_id
    case 1: return isRefundStepReadonly(task)
    case 2: return !!task.amazon_order_id
    case 3: return !!task.review_screenshot_url
    case 4: return !!(task.notes || '').trim()
    default: return false
  }
}

function getStepCurrent(task: any, step: number): boolean {
  if (getStepDone(task, step)) return false
  if (step === 0) return true
  return getStepDone(task, step - 1)
}

async function loadStaff() {
  const { data } = await supabase
    .from('staff')
    .select('id, name, role, avatar_color, status')
    .in('status', ['在职', '休假'])
    .order('name')
  if (data) {
    const ids = data.map(s => s.id)
    const { data: counts } = await supabase
      .from('sub_orders')
      .select('staff_id, buyer_id, status')
      .in('staff_id', ids)
      .not('staff_id', 'is', null)
    const pendingMap: Record<string, number> = {}
    const improvingMap: Record<string, number> = {}
    counts?.forEach(c => {
      if (isDone(c.status)) return
      if (c.buyer_id) improvingMap[c.staff_id] = (improvingMap[c.staff_id] || 0) + 1
      else pendingMap[c.staff_id] = (pendingMap[c.staff_id] || 0) + 1
    })

    let rows = data.map(s => ({
      ...s,
      pending_count: pendingMap[s.id] || 0,
      improving_count: improvingMap[s.id] || 0,
      total_count: (pendingMap[s.id] || 0) + (improvingMap[s.id] || 0),
    }))

    if (!isAdmin.value) {
      rows = rows.filter(s => s.id === currentUser.value.id || s.name === currentUser.value.name)
    } else {
      rows.unshift({
        id: ALL_STAFF_KEY,
        name: '全部业务员',
        role: '管理员',
        status: '活跃',
        avatar_color: '#2563eb',
        pending_count: rows.reduce((sum, s) => sum + (s.pending_count || 0), 0),
        improving_count: rows.reduce((sum, s) => sum + (s.improving_count || 0), 0),
        total_count: rows.reduce((sum, s) => sum + (s.total_count || 0), 0),
      })
    }

    staffList.value = rows

    if (!selectedStaffId.value) {
      selectedStaffId.value = isAdmin.value ? ALL_STAFF_KEY : (rows[0]?.id || '')
      if (selectedStaffId.value) await Promise.all([loadTasks(), loadTransferRequests()])
    }
  }
}

async function loadBuyers() {
  const { data } = await supabase
    .from('erp_buyers')
    .select('id, name, country, level, status, paypal_email, purchased_asins')
    .eq('status', '活跃')
    .order('name')
  buyerList.value = data || []

  if (data && data.length > 0) {
    const ids = data.map(b => b.id)
    const monthStart = dayjs().startOf('month').toISOString()
    const { data: monthOrders } = await supabase
      .from('sub_orders')
      .select('buyer_id')
      .in('buyer_id', ids)
      .not('status', 'in', '("已取消")')
      .gte('buyer_assigned_at', monthStart)
    const countMap: Record<string, number> = {}
    monthOrders?.forEach(o => { countMap[o.buyer_id] = (countMap[o.buyer_id] || 0) + 1 })
    buyerMonthlyCountMap.value = countMap

    const asinMap: Record<string, string[]> = {}
    const { data: asinOrders } = await supabase
      .from('sub_orders')
      .select('buyer_id, asin')
      .in('buyer_id', ids)
      .not('status', 'in', '("已取消")')
      .not('asin', 'eq', '')
    asinOrders?.forEach(o => {
      if (!asinMap[o.buyer_id]) asinMap[o.buyer_id] = []
      if (o.asin && !asinMap[o.buyer_id].includes(o.asin)) asinMap[o.buyer_id].push(o.asin)
    })
    data.forEach(b => {
      if (b.purchased_asins) {
        const existing = asinMap[b.id] || []
        const fromProfile = b.purchased_asins.split(/[,，\s]+/).map((s: string) => s.trim()).filter(Boolean)
        asinMap[b.id] = [...new Set([...existing, ...fromProfile])]
      }
    })
    buyerAsinMap.value = asinMap
  }
}

function getBuyerBlockReason(task: any, buyerId: string): string {
  if (!buyerId) return ''
  const monthlyCount = buyerMonthlyCountMap.value[buyerId] || 0
  if (monthlyCount >= 2) return `本月已接单 ${monthlyCount}/2`
  const boughtAsins = buyerAsinMap.value[buyerId] || []
  if (task.asin && boughtAsins.includes(task.asin)) return '已购过此ASIN'
  return ''
}

async function selectStaff(id: string) {
  selectedStaffId.value = id
  taskFilter.value = ''
  filterOverdue.value = false
  filterToday.value = false
  filterSoon.value = false
  taskSearch.value = ''
  await Promise.all([loadTasks(), loadTransferRequests()])
}

async function loadTransferRequests() {
  if (!selectedStaffId.value || isAllStaffSelected.value) {
    incomingRequests.value = []
    outgoingRequests.value = []
    return
  }
  const { data: incoming } = await supabase
    .from('transfer_requests')
    .select('*')
    .eq('to_staff_id', selectedStaffId.value)
    .eq('status', '待接受')
    .order('created_at', { ascending: false })

  const { data: outgoing } = await supabase
    .from('transfer_requests')
    .select('*')
    .eq('from_staff_id', selectedStaffId.value)
    .eq('status', '待接受')
    .order('created_at', { ascending: false })

  const allReqs = [...(incoming || []), ...(outgoing || [])]
  const subIds = [...new Set(allReqs.map(r => r.sub_order_id))]
  let subMap: Record<string, any> = {}
  if (subIds.length > 0) {
    const { data: subs } = await supabase
      .from('sub_orders')
      .select('id, asin, product_name, scheduled_date, status')
      .in('id', subIds)
    ;(subs || []).forEach(s => { subMap[s.id] = s })
  }

  incomingRequests.value = (incoming || []).map(r => ({ ...r, _sub: subMap[r.sub_order_id] || null }))
  outgoingRequests.value = (outgoing || []).map(r => ({ ...r, _sub: subMap[r.sub_order_id] || null }))
}

function initTaskFields(task: any) {
  task._expanded = false
  task._edit_variant = task.variant_info || ''
  task._edit_task_notes = task.task_notes || ''
  task._edit_order_notes = task.notes || ''
  task._sel_buyer_id = task.buyer_id || null
  task._editing_buyer = false
  task._saving_buyer = false
  task._validating_buyer = false
  task._buyer_validation = null
  task._sel_refund_sequence = task.refund_sequence || '预付'
  task._sel_refund_method = task.refund_method || '礼品卡'
  task._editing_refund_method = false
  task._refund_amount_usd = task.product_price ? Number(task.product_price) : 0
  task._refund_fee_usd = task.__mock_refund_fee_usd || 0
  task._refund_final_amount_usd = task.product_price ? Number(task.product_price) : 0
  task._buyer_paypal_email = task.__mock_paypal_email || task.buyer?.paypal_email || ''
  task._need_finance_screenshot = false
  task._extra_refund_amount = null
  task._extra_refund_method = '同首笔'
  task._extra_refund_reason = '产品涨价'
  task._refund_apply_notes = ''
  task._submitting_refund = false
  task._refund_supplement_mode = false
  task._refund_correction_mode = false
  task._refund_correction_target_id = null
  task._refund_requests_list = []
  task._refund_request_pending = null
  task._refund_request_latest_processed = null
  task._refund_request = null
  const mockMulti = task.__mock_refund_requests
  const mockOne = task.__mock_refund_request
  if (mockMulti?.length) {
    task._refund_requests_list = mockMulti
    task._refund_request_pending = mockMulti.find((r: any) => r.status === '待处理') || null
    const proc = mockMulti.filter((r: any) => r.status === '已处理')
    task._refund_request_latest_processed = proc.length
      ? proc.slice().sort((a: any, b: any) =>
          new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())[0]
      : null
    task._refund_request = task._refund_request_pending || task._refund_request_latest_processed
  } else if (mockOne) {
    task._refund_requests_list = [mockOne]
    task._refund_request_pending = mockOne.status === '待处理' ? mockOne : null
    task._refund_request_latest_processed = mockOne.status === '已处理' ? mockOne : null
    task._refund_request = task._refund_request_pending || task._refund_request_latest_processed
  }
  task._input_amazon_order_id = task.amazon_order_id || ''
  task._editing_amazon = false
  task._saving_amazon = false
  task._saving_delivery = false
  task._show_delivery_estimate = false
  task._proof_type = 'Review'
  task._proof_comment_link = ''
  task._input_screenshot_url = task.review_screenshot_url || ''
  task._editing_screenshot = false
  task._saving_screenshot = false
  task._completing = false
  syncRefundComputed(task)
  return task
}

async function loadTasks() {
  if (!selectedStaffId.value) return
  tasksLoading.value = true
  try {
    let query = supabase
      .from('sub_orders')
      .select('*')
      .order('scheduled_date', { ascending: true, nullsFirst: false })
    query = isAllStaffSelected.value
      ? query.not('staff_id', 'is', null)
      : query.eq('staff_id', selectedStaffId.value)

    const { data, error } = await query
    if (error) throw error
    const tasks = (data || []).map(initTaskFields)

    const orderIds = [...new Set(tasks.map(t => t.order_id).filter(Boolean))]
    if (orderIds.length > 0) {
      const { data: orders } = await supabase
        .from('erp_orders')
        .select('id, order_number, status')
        .in('id', orderIds)
      const orderMap: Record<string, any> = {}
      ;(orders || []).forEach(order => { orderMap[order.id] = order })
      tasks.forEach(task => {
        task._order_number = orderMap[task.order_id]?.order_number || ''
        task._order_status = orderMap[task.order_id]?.status || ''
      })
    }

    const subOrderIds = tasks.map(t => t.id)
    if (subOrderIds.length > 0) {
      const { data: refundReqs } = await supabase
        .from('refund_requests')
        .select('*')
        .in('sub_order_id', subOrderIds)
        .order('created_at', { ascending: false })
      const bySub: Record<string, any[]> = {}
      ;(refundReqs || []).forEach(r => {
        if (!bySub[r.sub_order_id]) bySub[r.sub_order_id] = []
        bySub[r.sub_order_id].push(r)
      })
      tasks.forEach(t => {
        const list = (bySub[t.id] || []).slice().sort((a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        t._refund_requests_list = list
        t._refund_request_pending = list.find(r => r.status === '待处理') || null
        t._refund_request_latest_processed = list.find(r => r.status === '已处理') || null
        t._refund_request = t._refund_request_pending || t._refund_request_latest_processed || null
        if (t._refund_request_pending) {
          hydrateRefundFormFromRequest(t, t._refund_request_pending)
        }
      })
    }

    let mergedTasks = tasks
    if (enableMockPreview.value) {
      const mockTasks = buildMockTasks().map(initTaskFields)
      mergedTasks = [...mockTasks, ...tasks]
    }
    allTasks.value = mergedTasks
    filterTaskList()
  } finally {
    tasksLoading.value = false
  }
}

function setFilter(val: string) {
  taskFilter.value = val
  filterTaskList()
}

function filterTaskList() {
  let list = allTasks.value
  if (taskFilter.value) list = list.filter(t => t.status === taskFilter.value)
  if (filterOverdue.value) list = list.filter(t => isOverdue(t.scheduled_date) && !isDone(t.status))
  if (filterToday.value) list = list.filter(t => t.scheduled_date === dayjs().format('YYYY-MM-DD'))
  if (filterSoon.value) list = list.filter(t => {
    if (!t.scheduled_date || isDone(t.status)) return false
    const diff = dayjs(t.scheduled_date).diff(dayjs(), 'day')
    return diff >= 0 && diff <= 2
  })
  if (taskSearch.value) {
    const kw = taskSearch.value.toLowerCase()
    list = list.filter(t =>
      (t._order_number || '').toLowerCase().includes(kw) ||
      (t.sub_order_number || '').toLowerCase().includes(kw) ||
      (t.asin || '').toLowerCase().includes(kw) ||
      (t.buyer_name || '').toLowerCase().includes(kw) ||
      (t.keyword || '').toLowerCase().includes(kw) ||
      (t.product_name || '').toLowerCase().includes(kw)
    )
  }
  filteredTasks.value = list
}

function toggleExpand(task: any) {
  task._expanded = !task._expanded
}

function toggleOrderExpand(orderId: string) {
  if (expandedOrderIds.value.includes(orderId)) {
    expandedOrderIds.value = expandedOrderIds.value.filter(id => id !== orderId)
  } else {
    expandedOrderIds.value = [...expandedOrderIds.value, orderId]
  }
}

function focusTask(task: any) {
  wbViewMode.value = 'sub'
  taskSearch.value = task.sub_order_number || task._order_number || ''
  filterTaskList()
  allTasks.value.forEach(t => { t._expanded = t.id === task.id })
}

function openTaskOpsDetail(task: any) {
  taskOpsDetailTarget.value = task
  taskOpsDetailOpen.value = true
}

async function quickSave(task: any, field: string, value: any) {
  const { error } = await supabase.from('sub_orders').update({ [field]: value }).eq('id', task.id)
  if (!error) task[field] = value
}

async function onBuyerSelect(task: any, buyerId: string) {
  if (!buyerId) { task._buyer_validation = null; return }
  task._validating_buyer = true
  task._buyer_validation = null
  try {
    const monthStart = dayjs().startOf('month').toISOString()
    const { data: monthOrders, error: e1 } = await supabase
      .from('sub_orders')
      .select('id')
      .eq('buyer_id', buyerId)
      .not('status', 'in', '("已取消")')
      .gte('buyer_assigned_at', monthStart)
    if (e1) throw e1
    const monthlyCount = monthOrders?.length || 0

    if (monthlyCount >= 2) {
      task._buyer_validation = { blocked: true, reason: `该买手本月已接单 ${monthlyCount} 次，超过每月限额（2次）` }
      return
    }

    if (task.asin) {
      const { data: asinOrders, error: e2 } = await supabase
        .from('sub_orders')
        .select('id')
        .eq('buyer_id', buyerId)
        .eq('asin', task.asin)
        .not('status', 'in', '("已取消")')
        .limit(1)
      if (e2) throw e2
      if (asinOrders && asinOrders.length > 0) {
        task._buyer_validation = { blocked: true, reason: `该买手已购买过 ASIN: ${task.asin}，不能重复购买` }
        return
      }
      const buyer = buyerList.value.find(b => b.id === buyerId)
      if (buyer?.purchased_asins) {
        const asins = buyer.purchased_asins.split(/[,，\s]+/).map((s: string) => s.trim()).filter(Boolean)
        if (asins.includes(task.asin)) {
          task._buyer_validation = { blocked: true, reason: `该买手历史记录中已购买过 ASIN: ${task.asin}` }
          return
        }
      }
    }

    task._buyer_validation = { blocked: false, monthlyCount }
  } catch (e: any) {
    task._buyer_validation = { blocked: false, monthlyCount: 0 }
  } finally {
    task._validating_buyer = false
  }
}

async function assignBuyer(task: any) {
  if (!task._sel_buyer_id) return
  if (task._buyer_validation?.blocked) {
    message.error(task._buyer_validation.reason)
    return
  }
  task._saving_buyer = true
  try {
    const buyer = buyerList.value.find(b => b.id === task._sel_buyer_id)
    const payload = {
      buyer_id: task._sel_buyer_id,
      buyer_name: buyer?.name || '',
      status: task.status === '待分配' ? '已分配' : task.status,
      buyer_assigned_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('sub_orders').update(payload).eq('id', task.id)
    if (error) throw error
    Object.assign(task, payload)
    task._editing_buyer = false
    task._buyer_validation = null
    message.success('买手已分配')
    buyerMonthlyCountMap.value[task._sel_buyer_id] = (buyerMonthlyCountMap.value[task._sel_buyer_id] || 0) + 1
    if (task.asin && buyerAsinMap.value[task._sel_buyer_id]) {
      if (!buyerAsinMap.value[task._sel_buyer_id].includes(task.asin)) {
        buyerAsinMap.value[task._sel_buyer_id].push(task.asin)
      }
    }
    await loadStaff()
  } catch (e: any) {
    message.error('分配失败：' + e.message)
  } finally {
    task._saving_buyer = false
  }
}

async function submitRefundRequest(task: any) {
  const finalAmount = getRefundFinalAmount(task)
  if (!finalAmount) return

  if (task._refund_supplement_mode && task._extra_refund_reason === '产品涨价') {
    const ap = Number(task._refund_amount_usd || 0)
    const pp = Number(task.product_price || 0)
    if (Math.abs(ap - pp) < 0.005) {
      message.error('选择「产品涨价」追加时，实付金额必须与系统标价不同，请填写涨价后的真实支付金额')
      return
    }
  }

  const buyer = buyerList.value.find(b => b.id === task.buyer_id)
  const selectedMethod = task._sel_refund_method || task.refund_method
  const paypalEmail = selectedMethod === 'PayPal'
    ? (task._buyer_paypal_email || buyer?.paypal_email || '')
    : ''
  if (selectedMethod === 'PayPal' && !paypalEmail) {
    message.error('请填写买手 PayPal 邮箱')
    return
  }

  const pending = task._refund_request_pending
  const isUpdatePending = !!(pending && !task._refund_supplement_mode && !task._refund_correction_mode)

  const actualPaid = Number(task._refund_amount_usd || 0)
  const feeUsd = selectedMethod === 'PayPal' ? Number(task._refund_fee_usd || 0) : 0
  const notes = `${task._refund_apply_notes || ''}${task._need_finance_screenshot ? ' [需财务返款截图]' : ''}`.trim()
  const supplementReason = task._refund_supplement_mode
    ? (task._extra_refund_reason || '追加返款')
    : task._refund_correction_mode
      ? '邮箱或金额更正'
      : ''

  const wasSupplement = task._refund_supplement_mode
  const wasCorrection = task._refund_correction_mode

  task._submitting_refund = true
  try {
    const configPayload = {
      refund_method: task._sel_refund_method || task.refund_method,
      refund_sequence: task._sel_refund_sequence || task.refund_sequence,
    }
    const { error: e1 } = await supabase.from('sub_orders').update(configPayload).eq('id', task.id)
    if (e1) throw e1
    Object.assign(task, configPayload)

    const commonFields: Record<string, any> = {
      buyer_paypal_email: paypalEmail,
      refund_amount_usd: finalAmount,
      refund_amount: finalAmount,
      actual_paid_usd: actualPaid,
      paypal_fee_usd: feeUsd,
      refund_method: selectedMethod,
      refund_sequence: task._sel_refund_sequence || task.refund_sequence,
      product_name: task.product_name || '',
      product_price: task.product_price || 0,
      asin: task.asin || '',
      store_name: task.store_name || '',
      staff_name: staffList.value.find(s => s.id === selectedStaffId.value)?.name || '',
      notes,
    }

    if (isUpdatePending) {
      const staffName = staffList.value.find(s => s.id === selectedStaffId.value)?.name || ''
      const existingLog = Array.isArray(pending.staff_change_log) ? pending.staff_change_log : []
      const edits: { field: string; from: any; to: any }[] = []
      if ((pending.buyer_paypal_email || '') !== paypalEmail) {
        edits.push({ field: 'buyer_paypal_email', from: pending.buyer_paypal_email || '', to: paypalEmail })
      }
      if (Number(pending.actual_paid_usd ?? 0) !== actualPaid) {
        edits.push({ field: 'actual_paid_usd', from: Number(pending.actual_paid_usd ?? 0), to: actualPaid })
      }
      if (Number(pending.paypal_fee_usd ?? 0) !== feeUsd) {
        edits.push({ field: 'paypal_fee_usd', from: Number(pending.paypal_fee_usd ?? 0), to: feeUsd })
      }
      if (Number(pending.refund_amount_usd ?? 0) !== finalAmount) {
        edits.push({ field: 'refund_amount_usd', from: Number(pending.refund_amount_usd ?? 0), to: finalAmount })
      }
      if ((pending.refund_method || '') !== selectedMethod) {
        edits.push({ field: 'refund_method', from: pending.refund_method || '', to: selectedMethod })
      }
      if ((pending.refund_sequence || '') !== (task._sel_refund_sequence || task.refund_sequence || '')) {
        edits.push({
          field: 'refund_sequence',
          from: pending.refund_sequence || '',
          to: task._sel_refund_sequence || task.refund_sequence || '',
        })
      }
      const updatePayload: Record<string, any> = { ...commonFields }
      if (edits.length) {
        updatePayload.staff_change_log = [...existingLog, { at: new Date().toISOString(), staff_name: staffName, edits }]
      }

      const { data, error } = await supabase
        .from('refund_requests')
        .update(updatePayload)
        .eq('id', pending.id)
        .select()
        .maybeSingle()
      if (error) throw error
      task._refund_request_pending = data
      task._refund_request = data
      const idx = (task._refund_requests_list || []).findIndex((r: any) => r.id === pending.id)
      if (idx >= 0) task._refund_requests_list[idx] = data
      message.success('返款申请已更新')
    } else {
      const insertPayload: Record<string, any> = {
        ...commonFields,
        sub_order_id: task.id,
        order_id: task.order_id,
        sub_order_number: task.sub_order_number,
        buyer_name: task.buyer_name || '',
        status: '待处理',
        request_type: wasSupplement ? 'supplement' : wasCorrection ? 'correction' : 'initial',
        supersedes_request_id: wasCorrection ? task._refund_correction_target_id : null,
        supplement_reason: wasSupplement || wasCorrection ? supplementReason : '',
      }
      const { data, error } = await supabase.from('refund_requests').insert(insertPayload).select().maybeSingle()
      if (error) throw error
      task._refund_request_pending = data
      task._refund_request = data
      task._refund_requests_list = [data, ...((task._refund_requests_list || []).filter((r: any) => r.id !== data.id))]
      task._refund_supplement_mode = false
      task._refund_correction_mode = false
      task._refund_correction_target_id = null
      if (wasCorrection) message.success('更正返款申请已提交，等待财务处理')
      else if (wasSupplement) message.success('追加返款申请已提交，等待财务处理')
      else message.success('返款申请已提交，等待财务处理')
    }
    task._refund_apply_notes = ''
  } catch (e: any) {
    message.error('提交失败：' + e.message)
  } finally {
    task._submitting_refund = false
  }
}

async function markRefundDone(task: any) {
  try {
    const payload = {
      refund_status: '已退款',
      refund_amount: task._refund_request?.refund_amount_usd || 0,
      refund_date: dayjs().format('YYYY-MM-DD'),
      status: '进行中',
    }
    const { error } = await supabase.from('sub_orders').update(payload).eq('id', task.id)
    if (error) throw error
    Object.assign(task, payload)
    message.success('返款已确认完成')
  } catch (e: any) {
    message.error('操作失败：' + e.message)
  }
}

function copyText(text: string) {
  if (!text) return
  navigator.clipboard.writeText(text).then(() => message.success('已复制'))
}

async function saveAmazonOrder(task: any) {
  if (!task._input_amazon_order_id) return
  task._saving_amazon = true
  try {
    const payload = {
      amazon_order_id: task._input_amazon_order_id,
      amazon_order_placed_at: new Date().toISOString(),
      status: '已下单',
    }
    const { error } = await supabase.from('sub_orders').update(payload).eq('id', task.id)
    if (error) throw error
    Object.assign(task, payload)
    task._editing_amazon = false
    message.success('Amazon订单号已保存')
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    task._saving_amazon = false
  }
}

async function confirmDelivery(task: any) {
  task._saving_delivery = true
  try {
    const payload = { delivery_confirmed_at: new Date().toISOString() }
    const { error } = await supabase.from('sub_orders').update(payload).eq('id', task.id)
    if (error) throw error
    Object.assign(task, payload)
    message.success('签收已确认')
  } catch (e: any) {
    message.error('操作失败：' + e.message)
  } finally {
    task._saving_delivery = false
  }
}

async function saveScreenshot(task: any) {
  if (!task._input_screenshot_url) return
  task._saving_screenshot = true
  try {
    const payload = {
      review_screenshot_url: task._input_screenshot_url,
      review_submitted_at: new Date().toISOString(),
      status: '已留评',
    }
    const { error } = await supabase.from('sub_orders').update(payload).eq('id', task.id)
    if (error) throw error
    Object.assign(task, payload)
    task._editing_screenshot = false
    message.success('截图已提交')
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    task._saving_screenshot = false
  }
}

async function completeTask(task: any) {
  task._completing = true
  try {
    const { error } = await supabase.from('sub_orders').update({ status: '已完成' }).eq('id', task.id)
    if (error) throw error
    task.status = '已完成'
    filterTaskList()
    message.success('任务已标记完成')
    await loadStaff()
  } catch (e: any) {
    message.error('操作失败：' + e.message)
  } finally {
    task._completing = false
  }
}

function openCancelModal(task: any) {
  cancelTarget.value = task
  cancelForm.value = { reason: '', needComplement: false }
  cancelModalOpen.value = true
}

async function submitCancel() {
  if (!cancelTarget.value || !cancelForm.value.reason) {
    message.warning('请填写取消原因')
    return
  }
  cancelSaving.value = true
  try {
    const { error } = await supabase.from('sub_orders').update({
      status: '已取消',
      cancel_reason: cancelForm.value.reason,
    }).eq('id', cancelTarget.value.id)
    if (error) throw error
    cancelTarget.value.status = '已取消'
    cancelTarget.value.cancel_reason = cancelForm.value.reason
    filterTaskList()
    cancelModalOpen.value = false
    message.success('已取消')
    await loadStaff()
  } catch (e: any) {
    message.error(e.message)
  } finally {
    cancelSaving.value = false
  }
}

function openTransferModal(task: any) {
  transferTarget.value = task
  transferForm.value = { staffId: null, reason: '' }
  transferModalOpen.value = true
}

async function submitTransfer() {
  if (!transferTarget.value || !transferForm.value.staffId) {
    message.warning('请选择目标业务员')
    return
  }
  transferSaving.value = true
  try {
    const toStaff = staffList.value.find(s => s.id === transferForm.value.staffId)
    const fromStaff = staffList.value.find(s => s.id === selectedStaffId.value)
    const { error } = await supabase.from('transfer_requests').insert({
      sub_order_id: transferTarget.value.id,
      sub_order_number: transferTarget.value.sub_order_number,
      from_staff_id: selectedStaffId.value,
      from_staff_name: fromStaff?.name || '',
      to_staff_id: transferForm.value.staffId,
      to_staff_name: toStaff?.name || '',
      reason: transferForm.value.reason || '',
      status: '待接受',
    })
    if (error) throw error

    transferModalOpen.value = false
    message.success(`互转请求已发送给 ${toStaff?.name}，等待对方确认`)
    await loadTransferRequests()
  } catch (e: any) {
    message.error(e.message)
  } finally {
    transferSaving.value = false
  }
}

async function acceptTransfer(req: any) {
  req._accepting = true
  try {
    const { error: updateSubErr } = await supabase.from('sub_orders').update({
      staff_id: req.to_staff_id,
      staff_name: req.to_staff_name,
    }).eq('id', req.sub_order_id)
    if (updateSubErr) throw updateSubErr

    const { error: updateReqErr } = await supabase.from('transfer_requests').update({
      status: '已接受',
      responded_at: new Date().toISOString(),
    }).eq('id', req.id)
    if (updateReqErr) throw updateReqErr

    await supabase.from('grab_hall_logs').insert({
      sub_order_id: req.sub_order_id,
      sub_order_number: req.sub_order_number,
      action: '互转接受',
      from_staff_id: req.from_staff_id,
      from_staff_name: req.from_staff_name,
      to_staff_id: req.to_staff_id,
      to_staff_name: req.to_staff_name,
      reason: req.reason,
    })

    incomingRequests.value = incomingRequests.value.filter(r => r.id !== req.id)
    message.success('已接受转单，订单已加入你的工作台')
    await loadTasks()
    await loadStaff()
  } catch (e: any) {
    message.error(e.message)
  } finally {
    req._accepting = false
  }
}

function openRejectModal(req: any) {
  rejectTarget.value = req
  rejectForm.value = { reason: '' }
  rejectModalOpen.value = true
}

async function submitReject() {
  if (!rejectTarget.value) return
  rejectSaving.value = true
  try {
    const { error } = await supabase.from('transfer_requests').update({
      status: '已拒绝',
      reject_reason: rejectForm.value.reason || '',
      responded_at: new Date().toISOString(),
    }).eq('id', rejectTarget.value.id)
    if (error) throw error

    incomingRequests.value = incomingRequests.value.filter(r => r.id !== rejectTarget.value.id)
    rejectModalOpen.value = false
    message.success('已拒绝该转单请求')
  } catch (e: any) {
    message.error(e.message)
  } finally {
    rejectSaving.value = false
  }
}

async function cancelTransferRequest(req: any) {
  try {
    const { error } = await supabase.from('transfer_requests').update({
      status: '已取消',
      responded_at: new Date().toISOString(),
    }).eq('id', req.id)
    if (error) throw error
    outgoingRequests.value = outgoingRequests.value.filter(r => r.id !== req.id)
    message.success('已撤销转单请求')
  } catch (e: any) {
    message.error(e.message)
  }
}

function openReturnModal(task: any) {
  returnTarget.value = task
  returnForm.value = { reason: '', clearBuyer: true }
  returnModalOpen.value = true
}

async function submitReturn() {
  if (!returnTarget.value || !returnForm.value.reason.trim()) {
    message.warning('请填写回转原因')
    return
  }
  returnSaving.value = true
  try {
    const fromStaff = staffList.value.find(s => s.id === selectedStaffId.value)
    const updateData: any = {
      status: '待分配',
      staff_id: null,
      staff_name: null,
      return_reason: returnForm.value.reason,
      returned_at: new Date().toISOString(),
    }
    if (returnForm.value.clearBuyer) {
      updateData.buyer_id = null
      updateData.buyer_name = null
      updateData.buyer_assigned_at = null
    }
    const { error } = await supabase.from('sub_orders').update(updateData).eq('id', returnTarget.value.id)
    if (error) throw error

    await supabase.from('grab_hall_logs').insert({
      sub_order_id: returnTarget.value.id,
      sub_order_number: returnTarget.value.sub_order_number,
      action: '回转',
      from_staff_id: selectedStaffId.value,
      from_staff_name: fromStaff?.name || '',
      reason: returnForm.value.reason,
    })

    allTasks.value = allTasks.value.filter(t => t.id !== returnTarget.value.id)
    filterTaskList()
    returnModalOpen.value = false
    message.success('已回转，等待管理员重新分配')
    await loadStaff()
  } catch (e: any) {
    message.error(e.message)
  } finally {
    returnSaving.value = false
  }
}

async function releaseToHall(task: any) {
  try {
    const { error } = await supabase.from('sub_orders').update({
      released_to_hall: true,
      released_at: new Date().toISOString(),
      released_by_staff_id: selectedStaffId.value,
      released_by_staff_name: staffList.value.find(s => s.id === selectedStaffId.value)?.name || '',
      status: '待分配',
      staff_id: null,
      staff_name: null,
    }).eq('id', task.id)
    if (error) throw error

    await supabase.from('grab_hall_logs').insert({
      sub_order_id: task.id,
      sub_order_number: task.sub_order_number,
      action: '放入抢单大厅',
      from_staff_id: selectedStaffId.value,
      from_staff_name: staffList.value.find(s => s.id === selectedStaffId.value)?.name || '',
      reason: '放入抢单大厅',
    })

    allTasks.value = allTasks.value.filter(t => t.id !== task.id)
    filterTaskList()
    message.success('已放到抢单大厅')
    await loadStaff()
  } catch (e: any) {
    message.error(e.message)
  }
}

onMounted(() => {
  loadFromStorage()
  loadStaff()
  loadBuyers()
})
</script>

<style scoped>
.page-content { padding: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }

.workbench-layout { display: flex; gap: 16px; min-height: calc(100vh - 140px); }

/* 左侧侧栏 */
.staff-sidebar { width: 200px; flex-shrink: 0; background: #fff; border-radius: 12px; border: 1px solid #f0f0f0; overflow: hidden; display: flex; flex-direction: column; }
.wb-nav-title {
  padding: 12px 14px;
  border-bottom: 1px solid #f0f0f0;
  font-size: 12px;
  color: #6b7280;
  font-weight: 600;
}
.wb-nav-list { padding: 8px; display: flex; flex-direction: column; gap: 6px; }
.wb-nav-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 10px;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s;
}
.wb-nav-item:hover { border-color: #bfdbfe; background: #eff6ff; }
.wb-nav-item.active { border-color: #2563eb; background: #eff6ff; }
.wb-nav-label { font-size: 13px; color: #1a1a2e; }
.wb-nav-count {
  min-width: 24px;
  text-align: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  color: #2563eb;
  background: rgba(37, 99, 235, 0.12);
}

/* 右侧主区 */
.workbench-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 12px; }

/* 顶部筛选栏 */
.top-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; background: #fff; border-radius: 10px; padding: 10px 16px; border: 1px solid #f0f0f0; }
.filter-tabs { display: flex; gap: 4px; }
.filter-tab {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  cursor: pointer;
  color: #6b7280;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  transition: all 0.15s;
  white-space: nowrap;
}
.filter-tab:hover { color: #2563eb; border-color: #bfdbfe; background: #eff6ff; }
.filter-tab.active { color: #2563eb; background: #eff6ff; border-color: #2563eb; font-weight: 600; }
.filter-tab em { font-style: normal; margin-left: 4px; font-size: 11px; color: #9ca3af; }
.filter-tab.active em { color: #2563eb; }
.filter-right { display: flex; align-items: center; gap: 12px; margin-left: auto; }
.overdue-label { color: #ef4444; font-weight: 600; }
.total-hint { font-size: 12px; color: #9ca3af; white-space: nowrap; }

.wb-view-toggle { display: flex; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
.wb-vbtn { padding: 2px 10px; font-size: 12px; cursor: pointer; color: #6b7280; background: #fff; user-select: none; }
.wb-vbtn.active { background: #2563eb; color: #fff; }

.workbench-overview {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 12px;
  margin-top: 8px;
}
.overview-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.overview-label { font-size: 12px; color: #6b7280; }
.overview-value { font-size: 24px; line-height: 1; color: #1a1a2e; }

.workbench-sections { display: flex; flex-direction: column; gap: 18px; }
.wb-section { display: flex; flex-direction: column; gap: 12px; }
.wb-section-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}
.wb-section-title { font-size: 16px; font-weight: 700; color: #1a1a2e; }
.wb-section-desc { font-size: 12px; color: #6b7280; margin-top: 4px; }
.wb-section-count {
  font-size: 12px;
  color: #2563eb;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  padding: 4px 10px;
  white-space: nowrap;
}
.compact-empty { padding: 24px 0; }

.main-order-list { display: flex; flex-direction: column; gap: 12px; }
.main-order-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.main-order-card:hover { box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); }
.main-order-main-row { display: flex; align-items: flex-start; gap: 14px; }
.main-order-product-img { width: 56px; height: 56px; flex-shrink: 0; }
.main-order-thumb {
  width: 56px;
  height: 56px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid #f0f0f0;
  display: block;
}
.main-order-thumb-placeholder {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  background: #f3f4f6;
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
}
.main-order-info { min-width: 0; flex: 1; }
.main-order-title-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.main-order-number { font-size: 15px; font-weight: 700; color: #1a1a2e; font-family: 'Courier New', monospace; }
.status-tag { margin-inline-end: 0; }
.info-tag { margin-inline-end: 0; }
.main-order-detail-row {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
}
.detail-item-text { color: #374151; }
.detail-sep { color: #6b7280; }
.price-text { color: #16a34a; font-weight: 600; }
.main-order-footer { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.main-order-progress { display: flex; align-items: center; gap: 10px; min-width: 220px; flex: 1; }
.main-order-progress-text { font-size: 12px; color: #6b7280; white-space: nowrap; }
.main-order-progress-bar {
  flex: 1;
  height: 8px;
  background: #e5e7eb;
  border-radius: 999px;
  overflow: hidden;
}
.main-order-progress-fill {
  height: 100%;
  background: #2563eb;
  border-radius: 999px;
  transition: width 0.2s ease;
}
.inline-sub-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid #f0f0f0;
  padding-top: 12px;
}
.inline-sub-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}
.inline-sub-main { flex: 1; min-width: 0; }
.inline-sub-line { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.inline-sub-no { font-size: 12px; font-weight: 700; color: #1a1a2e; font-family: 'Courier New', monospace; }
.inline-sub-checkpoint {
  font-size: 11px;
  color: #7c3aed;
  background: #f5f3ff;
  border: 1px solid #ddd6fe;
  border-radius: 999px;
  padding: 2px 8px;
}
.inline-sub-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 6px;
  font-size: 12px;
  color: #6b7280;
}
.main-order-sub-preview { display: flex; gap: 8px; flex-wrap: wrap; }
.sub-preview-chip {
  font-size: 11px;
  color: #374151;
  background: #f3f4f6;
  border-radius: 999px;
  padding: 3px 8px;
  font-family: 'Courier New', monospace;
}
.sub-preview-chip.more { color: #6b7280; font-family: inherit; }

.sub-product-cell { max-width: 180px; }
.sub-product-name { font-size: 12px; color: #374151; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px; }
.sub-asin { font-family: 'Courier New', monospace; font-size: 11px; color: #6b7280; }
.variant-text { font-size: 12px; color: #374151; }
.keyword-tag { font-size: 12px; color: #2563eb; }

.loading-wrap { display: flex; justify-content: center; padding: 60px 0; background: #fff; border-radius: 12px; }
.empty-list { background: #fff; border-radius: 12px; padding: 40px 0; }

/* 任务卡片 */
.task-card-list { display: flex; flex-direction: column; gap: 10px; }
.task-card {
  background: #fff;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  transition: box-shadow 0.15s;
}
.task-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.task-card.card-overdue { border-left: 4px solid #ef4444; }
.task-card.expanded { border-color: #2563eb; box-shadow: 0 2px 12px rgba(37,99,235,0.1); }

/* 卡片头 */
.task-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  cursor: pointer;
  user-select: none;
}
.task-card-header:hover { background: #fafbff; }
.card-header-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.toggle-icon { font-size: 10px; color: #9ca3af; width: 14px; flex-shrink: 0; }
.product-thumb { width: 44px; height: 44px; object-fit: cover; border-radius: 6px; border: 1px solid #f0f0f0; flex-shrink: 0; }
.product-thumb-placeholder { width: 44px; height: 44px; border-radius: 6px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; color: #d1d5db; font-size: 18px; flex-shrink: 0; }
.task-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.meta-row1 { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
.meta-row2 { display: flex; align-items: center; flex-wrap: wrap; gap: 0; font-size: 12px; color: #6b7280; }
.meta-row3 { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 2px; }
.sub-no-text { font-family: 'Courier New', monospace; font-size: 12px; font-weight: 700; color: #1a1a2e; }
.product-name-sm { font-size: 12px; color: #374151; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mono-sm { font-family: 'Courier New', monospace; font-size: 11px; font-weight: 600; color: #374151; }
.order-chip {
  font-size: 11px;
  color: #2563eb;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 999px;
  padding: 1px 8px;
  margin-right: 2px;
  font-family: 'Courier New', monospace;
}
.sep { padding-left: 10px; }
.price-sm { font-size: 12px; font-weight: 600; color: #16a34a; padding-left: 10px; }
.text-gray { color: #9ca3af; }
.card-header-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; margin-left: 12px; }
.keyword-badge { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; border-radius: 12px; padding: 2px 8px; font-size: 11px; font-weight: 500; white-space: nowrap; max-width: 140px; overflow: hidden; text-overflow: ellipsis; }
.keyword-link-badge { background: #ecfeff; color: #0891b2; border-color: #a5f3fc; text-decoration: none; cursor: pointer; display: inline-block; }
.keyword-link-badge:hover { background: #cffafe; color: #0e7490; }
.meta-focus-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  padding: 1px 0;
  color: #1a1a2e;
}
.meta-focus-item-wide { max-width: 420px; }
.meta-focus-label {
  font-size: 12px;
  font-weight: 600;
  color: #1a1a2e;
  white-space: nowrap;
}
.meta-focus-value {
  font-size: 12px;
  font-weight: 500;
  color: #1a1a2e;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.date-badge { font-size: 11px; font-weight: 600; border-radius: 10px; padding: 2px 8px; white-space: nowrap; }
.date-ok { background: #f0fdf4; color: #16a34a; }
.date-overdue { background: #fef2f2; color: #dc2626; }
.progress-dots { display: flex; gap: 4px; }
.dot { width: 8px; height: 8px; border-radius: 50%; }
.dot.done { background: #059669; }
.dot.current { background: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,0.2); }
.dot.pending { background: #e5e7eb; }
.header-assign { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.buyer-badge { background: #f0fdf4; color: #059669; border: 1px solid #bbf7d0; border-radius: 10px; padding: 2px 8px; font-weight: 500; white-space: nowrap; }
.buyer-none {
  color: #d97706;
  font-size: 11px;
  border: 1px solid rgba(217, 119, 6, 0.18);
  background: rgba(217, 119, 6, 0.08);
  border-radius: 10px;
  padding: 2px 8px;
  white-space: nowrap;
}
.assign-name {
  font-size: 12px;
  font-weight: 500;
  color: #1a1a2e;
  white-space: nowrap;
}

/* 工作流主体 */
.workflow-body { border-top: 1px solid #e5e7eb; }

/* 产品信息栏 */
.product-info-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  padding: 8px 16px;
}
.pi-item { display: flex; align-items: center; gap: 5px; padding: 3px 12px; border-right: 1px solid #e5e7eb; }
.pi-item:last-child { border-right: none; }
.pi-label { font-size: 12px; color: #1a1a2e; font-weight: 600; white-space: nowrap; }
.pi-val { font-size: 12px; color: #1a1a2e; font-weight: 500; }

/* Steps + Collapse 流程 */
.workflow-steps-modern { padding: 14px 16px 6px; display: flex; flex-direction: column; gap: 12px; }
.wf-panel { border: 1px solid #e5e7eb; border-radius: 10px; background: #fff; }
.wf-panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid #f0f0f0;
  background: #f8fafc;
}
.wf-panel-header { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #1a1a2e; font-weight: 600; }
.wf-panel-index { color: #2563eb; min-width: 18px; }
.wf-panel-status {
  margin-left: 6px;
  padding: 1px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 500;
}
.wf-panel-status.todo { color: #d97706; background: rgba(217, 119, 6, 0.12); }
.wf-panel-status.done { color: #059669; background: rgba(5, 150, 105, 0.12); }
.wf-panel-body { display: flex; flex-direction: column; gap: 10px; padding: 12px; }
.buyer-brief-row { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.buyer-brief-desc { font-size: 12px; color: #6b7280; margin-top: -2px; }
.refund-setup-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.refund-setup-label { min-width: 70px; font-size: 12px; color: #6b7280; }
.refund-amount-box {
  border: 1px dashed #dbeafe;
  border-radius: 8px;
  background: #eff6ff;
  padding: 10px 12px;
}
.refund-amount-title { font-size: 12px; color: #1a1a2e; font-weight: 600; margin-bottom: 8px; }
.refund-formula-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.refund-action-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.refund-compact-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f8fafc;
}
.refund-compact-main { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.refund-compact-title { font-size: 13px; font-weight: 700; color: #1f2937; }
.refund-compact-meta { display: flex; flex-wrap: wrap; gap: 10px; font-size: 12px; color: #6b7280; }
.refund-compact-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.refund-readonly-summary {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  color: #1a1a2e;
  font-size: 12px;
  font-weight: 600;
}
.refund-proof-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 12px; }
.proof-label { color: #6b7280; min-width: 64px; }
.extra-refund-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  border-top: 1px dashed #e5e7eb;
  padding-top: 10px;
}
.extra-refund-tip { font-size: 11px; color: #6b7280; flex: 1 1 100%; }
.refund-readonly-hint { font-size: 11px; color: #6b7280; font-weight: 500; }
.refund-breakdown-readonly {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 8px 10px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  font-size: 12px;
}
.rb-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.rb-row.muted { color: #9ca3af; font-size: 11px; margin-top: 2px; }
.rb-row.rb-strong { font-weight: 600; color: #1a1a2e; padding-top: 4px; border-top: 1px dashed #e5e7eb; margin-top: 4px; }
.rb-k { color: #6b7280; }
.rb-v { color: #1a1a2e; font-variant-numeric: tabular-nums; }
.refund-history-box {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 10px;
  background: #fff;
}
.refund-history-title { font-size: 11px; color: #6b7280; margin-bottom: 6px; font-weight: 600; }
.refund-history-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  padding: 4px 0;
  border-bottom: 1px solid #f0f0f0;
}
.refund-history-row:last-child { border-bottom: none; }
.refund-correct-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding-top: 8px;
  border-top: 1px dashed #e5e7eb;
  font-size: 11px;
  color: #6b7280;
}
.correct-hint { font-weight: 500; color: #374151; }
.correct-sub { flex: 1 1 100%; }
.refund-product-ref { font-size: 11px; color: #6b7280; margin-bottom: 8px; }
.refund-product-ref-val { font-weight: 600; color: #1a1a2e; margin-left: 6px; }
.refund-amount-fields { display: flex; flex-direction: column; gap: 8px; }
.raf-line { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.raf-label { min-width: 100px; font-size: 12px; color: #374151; font-weight: 500; }
.raf-hint { font-size: 11px; color: #9ca3af; flex: 1 1 140px; }
.raf-line.raf-total { padding-top: 6px; border-top: 1px dashed #bfdbfe; margin-top: 2px; }
.raf-total-val { font-size: 14px; font-weight: 700; color: #2563eb; font-variant-numeric: tabular-nums; }
.mono { font-family: ui-monospace, monospace; }
.refund-processed-list { display: flex; flex-direction: column; gap: 10px; }
.refund-processed-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
}
.rpc-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 10px;
  background: #f8fafc;
  border-bottom: 1px solid #f0f0f0;
}
.rpc-reason { font-size: 11px; color: #7c3aed; font-weight: 500; }
.rpc-time { margin-left: auto; font-size: 11px; color: #9ca3af; }
.rpc-body { border: none !important; background: transparent !important; }
.refund-grandsum {
  margin-top: 6px;
  padding: 10px 12px;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  background: #eff6ff;
}
.rgs-title { font-size: 12px; font-weight: 700; color: #1e40af; margin-bottom: 6px; }
.rgs-note { font-size: 11px; margin-top: 6px; line-height: 1.4; }
.refund-mini-audit {
  margin: 0 10px 8px;
  padding: 8px 10px;
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 8px;
  font-size: 11px;
}
.rma-title { font-weight: 600; color: #b45309; margin-bottom: 4px; }
.rma-line { margin-top: 4px; color: #6b7280; }
.rma-ul { margin: 4px 0 0 18px; padding: 0; color: #374151; }
.refund-audit-trail {
  margin-bottom: 10px;
  padding: 10px 12px;
  border: 1px solid #e9d5ff;
  border-radius: 8px;
  background: #faf5ff;
  font-size: 12px;
}
.rat-title { font-weight: 600; color: #6b21a8; margin-bottom: 6px; }
.rat-entry { margin-top: 6px; padding-top: 6px; border-top: 1px dashed #e9d5ff; }
.rat-entry:first-of-type { border-top: none; padding-top: 0; margin-top: 0; }
.rat-meta { color: #6b7280; font-size: 11px; }
.rat-ul { margin: 4px 0 0 18px; padding: 0; color: #374151; }
.extra-method-label { font-size: 12px; color: #6b7280; white-space: nowrap; }
.rpc-proof { padding: 0 10px 10px; }
.refund-breakdown-readonly.empty-hint { padding: 12px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; }

.workflow-steps { padding: 16px 20px 10px; display: flex; flex-direction: column; gap: 0; }
.step-block { display: flex; gap: 14px; padding: 10px 0; position: relative; }
.step-block::before {
  content: '';
  position: absolute;
  left: 13px;
  top: 32px;
  bottom: -10px;
  width: 2px;
  background: #e5e7eb;
  z-index: 0;
}
.step-block:last-child::before { display: none; }

.step-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
  margin-top: 2px;
}
.num-done { background: #059669; color: #fff; font-size: 14px; }
.num-active { background: #2563eb; color: #fff; }
.num-locked { background: #e5e7eb; color: #9ca3af; }

.step-content { flex: 1; min-width: 0; }
.step-title { font-size: 13px; font-weight: 600; color: #1a1a2e; margin-bottom: 6px; }
.step-done { opacity: 1; }
.step-active { opacity: 1; }
.step-locked { opacity: 0.6; pointer-events: none; }
.step-locked .step-title { color: #9ca3af; }

.step-done-info { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 13px; }
.re-edit { font-size: 11px; color: #2563eb; cursor: pointer; text-decoration: underline; margin-left: 4px; }
.buyer-name-text { font-weight: 600; color: #374151; }
.refund-method-badge { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; border-radius: 10px; padding: 2px 8px; font-size: 12px; font-weight: 600; }
.refund-seq { font-size: 11px; color: #9ca3af; }
.green-text { color: #059669; font-weight: 600; }
.refund-amount-text { color: #f59e0b; font-weight: 600; }
.amazon-order-text { font-family: 'Courier New', monospace; font-size: 13px; font-weight: 700; color: #374151; }
.time-hint { font-size: 11px; color: #9ca3af; }

.step-input-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.step-input-col { display: flex; flex-direction: column; gap: 8px; }

.buyer-opt-meta { font-size: 11px; color: #9ca3af; }
.buyer-opt-row { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.buyer-opt-blocked { font-size: 10px; color: #ef4444; background: #fef2f2; border-radius: 6px; padding: 1px 5px; margin-left: auto; white-space: nowrap; font-weight: 600; }

.buyer-assign-area { display: flex; flex-direction: column; gap: 6px; }
.buyer-validation-hint { display: flex; align-items: center; gap: 6px; font-size: 12px; padding: 5px 10px; border-radius: 6px; }
.buyer-validation-hint.checking { background: #f0f9ff; color: #0369a1; border: 1px solid #bae6fd; }
.buyer-validation-hint.blocked { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; font-weight: 500; }
.buyer-validation-hint.passed { background: #f0fdf4; color: #059669; border: 1px solid #bbf7d0; }
.val-detail { font-size: 11px; color: #6b7280; margin-left: 4px; }

/* 退款面板 */
.refund-gift-panel, .refund-paypal-panel, .refund-other-panel {
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 8px;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.refund-panel-label { font-size: 11px; font-weight: 600; color: #059669; }
.refund-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #374151; }
.refund-row label { white-space: nowrap; font-weight: 500; min-width: 110px; }
.price-hint { font-size: 11px; color: #9ca3af; }
.confirm-btn-gray { background: #6b7280; border-color: #6b7280; color: #fff; }
.confirm-btn-gray:hover { background: #4b5563 !important; border-color: #4b5563 !important; }

/* 截图预览 */
.screenshot-preview { max-width: 200px; max-height: 100px; border-radius: 6px; border: 1px solid #f0f0f0; object-fit: cover; }

/* 签收预估 */
.delivery-estimate-box {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 10px 14px;
}
.estimate-icon { font-size: 18px; }
.estimate-label { font-size: 11px; color: #6b7280; }
.estimate-val { font-size: 14px; font-weight: 600; color: #2563eb; }
.estimate-date { font-size: 11px; color: #9ca3af; }

/* 底部操作 */
.workflow-footer {
  position: sticky;
  bottom: 0;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px 20px 12px;
  border-top: 1px dashed #f0f0f0;
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(2px);
}
.wf-footer-divider { color: #9ca3af; font-size: 12px; }

/* 空状态 */
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; color: #9ca3af; gap: 12px; font-size: 14px; background: #fff; border-radius: 12px; }

/* 回转弹窗 */
.return-modal-body { padding: 4px 0; }
.return-info-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  background: #f9fafb;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 10px 14px;
  margin-bottom: 14px;
  font-size: 12px;
  color: #6b7280;
}
.return-info-item strong { color: #374151; }

/* 互转请求弹窗 */
.transfer-req-modal-body { padding: 4px 0; }
.transfer-req-info {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  background: #f9fafb;
  border: 1px solid #f0f0f0;
  border-radius: 6px;
  padding: 10px 14px;
  margin-bottom: 14px;
  font-size: 12px;
  color: #6b7280;
}
.transfer-req-info strong { color: #374151; }

/* 待接收互转面板 */
.incoming-transfer-panel {
  background: #fffbeb;
  border: 1px solid #fde68a;
  border-radius: 10px;
  padding: 12px 16px;
  margin-bottom: 8px;
}
.incoming-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
}
.incoming-title {
  font-size: 13px;
  font-weight: 700;
  color: #92400e;
}
.incoming-list { display: flex; flex-direction: column; gap: 8px; }
.incoming-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  background: #fff;
  border: 1px solid #fde68a;
  border-radius: 8px;
  padding: 10px 14px;
  gap: 12px;
}
.incoming-item-left { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.incoming-from { display: flex; align-items: center; gap: 6px; }
.incoming-from-name { font-weight: 700; color: #374151; font-size: 13px; }
.incoming-from-label { font-size: 11px; color: #9ca3af; }
.incoming-sub-info { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; font-size: 12px; }
.incoming-sub-no { font-family: 'Courier New', monospace; font-weight: 700; color: #1a1a2e; background: #f3f4f6; padding: 1px 6px; border-radius: 4px; }
.incoming-asin { font-family: 'Courier New', monospace; font-size: 11px; color: #6b7280; }
.incoming-pname { color: #374151; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.incoming-date { color: #dc2626; font-size: 11px; font-weight: 600; }
.incoming-reason { font-size: 11px; color: #9ca3af; }
.incoming-item-right { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; flex-shrink: 0; }
.incoming-time { font-size: 11px; color: #9ca3af; white-space: nowrap; }
.incoming-actions { display: flex; gap: 6px; }

/* 我发出的互转面板 */
.outgoing-transfer-panel {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 10px 16px;
  margin-bottom: 8px;
}
.outgoing-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.outgoing-title { font-size: 12px; font-weight: 600; color: #6b7280; }
.outgoing-list { display: flex; flex-direction: column; gap: 4px; }
.outgoing-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #374151;
  padding: 6px 8px;
  background: #fff;
  border-radius: 6px;
  border: 1px solid #f0f0f0;
}
.outgoing-sub-no { font-family: 'Courier New', monospace; font-size: 11px; font-weight: 700; color: #1a1a2e; }
.outgoing-to { font-weight: 600; color: #374151; }
.outgoing-reason { color: #9ca3af; font-size: 11px; flex: 1; }
.outgoing-time { font-size: 11px; color: #9ca3af; white-space: nowrap; margin-left: auto; }
</style>
