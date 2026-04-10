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
                          <a-tag v-if="group.review_type" color="default" class="info-tag">{{ group.review_type }}</a-tag>
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
                        <a-button size="small" type="primary" ghost @click="focusTask(sub)">去处理</a-button>
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
                    <div class="wb-section-desc">聚合退款/售后相关子订单，优先跟进异常处理</div>
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
                      <a-tag v-if="task._is_mock" color="purple" style="font-size:10px">模拟数据</a-tag>
                      <a-tag :color="getStatusColor(task.status)" style="margin-left:6px;font-size:11px">{{ task.status }}</a-tag>
                      <a-tag v-if="isOverdue(task.scheduled_date) && !isDone(task.status)" color="error" style="font-size:10px">日超期 {{ overdayCount(task.scheduled_date) }} 天</a-tag>
                      <a-tag v-if="task.refund_status && task.refund_status !== '无需退款'" color="orange" style="font-size:10px">{{ task.refund_status }}</a-tag>
                      <a-tag v-if="task.order_type" color="default" style="font-size:10px">{{ task.order_type }}</a-tag>
                      <span v-if="task.product_name" class="product-name-sm">{{ task.product_name }}</span>
                    </div>
                    <div class="meta-row2">
                      <span v-if="task._order_number" class="order-chip">{{ task._order_number }}</span>
                      <span class="mono-sm">{{ task.asin }}</span>
                      <span class="sep">{{ task.store_name }}</span>
                      <span class="price-sm">${{ Number(task.product_price || 0).toFixed(2) }}</span>
                      <span v-if="task.review_type" class="sep text-gray">{{ task.review_type }}</span>
                      <span v-if="task.category" class="sep text-gray">{{ task.category }}</span>
                      <span v-if="task.country" class="sep text-gray">{{ task.country }}</span>
                    </div>
                  </div>
                </div>

                <div class="card-header-right">
                  <template v-if="task.keyword_type === 'link' && task.search_link">
                    <a :href="task.search_link" target="_blank" rel="noopener noreferrer" class="keyword-badge keyword-link-badge" @click.stop>
                      链接操作
                    </a>
                  </template>
                  <div v-else-if="task.keyword" class="keyword-badge">{{ task.keyword }}</div>
                  <div v-if="task.scheduled_date" :class="['date-badge', isOverdue(task.scheduled_date) && !isDone(task.status) ? 'date-overdue' : 'date-ok']">
                    截止 {{ task.scheduled_date }}
                  </div>
                  <!-- 进度点 -->
                  <div class="progress-dots">
                    <span v-for="(_step, i) in workflowSteps" :key="i" :class="['dot', getStepDone(task, i) ? 'done' : getStepCurrent(task, i) ? 'current' : 'pending']"></span>
                  </div>
                  <div class="header-assign">
                    <span v-if="task.buyer_name" class="buyer-badge">{{ task.buyer_name }}</span>
                    <span v-else class="buyer-none">未分配买手</span>
                  </div>
                  <div class="commission-badge">佣金 <strong>¥{{ Number(task.commission_fee || 0).toFixed(2) }}</strong></div>
                </div>
              </div>

              <!-- 展开：步骤化做单流程 -->
              <div v-if="task._expanded" class="workflow-body">
                <!-- 产品信息栏 -->
                <div class="product-info-bar">
                  <div class="pi-item"><span class="pi-label">产品名称</span><span class="pi-val">{{ task.product_name || '—' }}</span></div>
                  <div class="pi-item"><span class="pi-label">品牌</span><span class="pi-val">{{ task.brand_name || '—' }}</span></div>
                  <div class="pi-item"><span class="pi-label">类目</span><span class="pi-val">{{ task.category || '—' }}</span></div>
                  <div class="pi-item"><span class="pi-label">测评等级</span><span class="pi-val">{{ task.review_level || '—' }}</span></div>
                  <div class="pi-item"><span class="pi-label">变参</span>
                    <a-input v-model:value="task._edit_variant" size="small" style="width:90px" placeholder="无" @blur="quickSave(task, 'variant_info', task._edit_variant)" />
                  </div>
                  <div class="pi-item"><span class="pi-label">客户</span><span class="pi-val">{{ task.customer_name || '—' }}</span></div>
                  <div class="pi-item">
                    <span class="pi-label">任务备注</span>
                    <a-input v-model:value="task._edit_task_notes" size="small" style="width:150px" placeholder="备注" @blur="quickSave(task, 'task_notes', task._edit_task_notes)" />
                  </div>
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
                        <span>{{ isRefundStepReadonly(task) ? '财务返款申请' : '返款申请' }}</span>
                        <span v-if="isRefundStepReadonly(task)" class="wf-panel-status done">已完成</span>
                        <span v-else class="wf-panel-status todo">当前待办</span>
                      </div>
                    </div>
                    <div class="wf-panel-body">
                        <template v-if="isRefundStepReadonly(task)">
                          <div class="refund-readonly-summary">
                            <span>{{ task._refund_request?.refund_method || task.refund_method || '—' }}</span>
                            <span>🔒 ${{ Number(task._refund_request?.refund_amount_usd || task.refund_amount || 0).toFixed(2) }}</span>
                            <span>返款时间: {{ fmtShortTime(task._refund_request?.updated_at || task._refund_request?.created_at || task.refund_date) }}</span>
                          </div>
                          <div class="refund-proof-row">
                            <span class="proof-label">返款凭证</span>
                            <template v-if="task._refund_request?.paypal_receipt_screenshot">
                              <a :href="task._refund_request.paypal_receipt_screenshot" target="_blank" class="screenshot-link">
                                <img :src="task._refund_request.paypal_receipt_screenshot" class="screenshot-preview" referrerpolicy="no-referrer" @error="onImgError" />
                              </a>
                            </template>
                            <template v-else>
                              <span class="text-gray">暂无</span>
                              <a-button type="link" size="small" @click="notifyFinanceForReceipt(task)">催财务补充截图</a-button>
                            </template>
                          </div>
                          <div class="extra-refund-bar">
                            <a-button size="small" @click="message.info('追加返款功能待接后端流程')">追加返款</a-button>
                            <a-input-number v-model:value="task._extra_refund_amount" size="small" :min="0" :precision="2" style="width:130px" placeholder="填写金额" />
                            <a-radio-group v-model:value="task._extra_refund_reason" size="small">
                              <a-radio value="产品涨价">产品涨价</a-radio>
                              <a-radio value="产品额外佣金">产品额外佣金</a-radio>
                            </a-radio-group>
                          </div>
                        </template>

                        <template v-else>
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
                            <label>贝宝账号</label>
                            <a-input v-model:value="task._buyer_paypal_email" size="small" style="width:220px" placeholder="amanda@example.com" />
                          </div>

                          <div class="refund-amount-box">
                            <div class="refund-amount-title">金额明细</div>
                            <div v-if="task._sel_refund_method === 'PayPal'" class="refund-formula-row">
                              <a-input-number v-model:value="task._refund_amount_usd" size="small" :min="0" :precision="2" style="width:120px" prefix="$" @change="syncRefundComputed(task)" />
                              <span>+</span>
                              <a-input-number v-model:value="task._refund_fee_usd" size="small" :min="0" :precision="2" style="width:120px" prefix="$" @change="syncRefundComputed(task)" />
                              <span>=</span>
                              <a-input-number :value="getRefundFinalAmount(task)" size="small" style="width:130px" prefix="$" disabled />
                            </div>
                            <div v-else class="refund-formula-row">
                              <a-input-number v-model:value="task._refund_amount_usd" size="small" :min="0" :precision="2" style="width:120px" prefix="$" @change="syncRefundComputed(task)" />
                              <span>➡️</span>
                              <a-input-number v-model:value="task._refund_final_amount_usd" size="small" :min="0" :precision="2" style="width:130px" prefix="$" />
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
                            >提交返款申请</a-button>
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
                          <a-button type="primary" size="small" :loading="task._completing" @click="completeTask(task)" style="background:#059669;border-color:#059669">标记已完成</a-button>
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

type WorkbenchNavKey = 'pending' | 'improving' | 'afterSale'

const workflowSteps = [0, 1, 2, 3]
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
  if (!task.refund_method || !task.refund_sequence) return '待设置退款'
  if (task.refund_status !== '已退款') return task._refund_request ? '待退款完成' : '待申请退款'
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
  return task.refund_status === '已退款' || task._refund_request?.status === '已处理'
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
      buyer_id: 'mock_buyer_amanda',
      buyer_name: 'Amanda Garcia',
      refund_status: '待退款',
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
      _is_mock: true,
    },
    {
      id: 'mock_prepay_paypal_pending',
      order_id: 'mock_order_1002',
      _order_number: 'MOCK-2026-1002',
      _order_status: '进行中',
      sub_order_number: 'SUB-MOCK-1002',
      status: '进行中',
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
      buyer_id: 'mock_buyer_olivia',
      buyer_name: 'Olivia White',
      refund_status: '已退款',
      refund_amount: 22.71,
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
      _is_mock: true,
      __mock_refund_request: {
        status: '已处理',
        refund_method: 'PayPal',
        refund_amount_usd: 22.71,
        assigned_paypal_email: 'olivia.white@example.com',
        paypal_receipt_screenshot: '',
        updated_at: now.subtract(1, 'day').toISOString(),
      },
    },
    {
      id: 'mock_after_review_gift_done',
      order_id: 'mock_order_1004',
      _order_number: 'MOCK-2026-1004',
      _order_status: '进行中',
      sub_order_number: 'SUB-MOCK-1004',
      status: '已下单',
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
      _is_mock: true,
      __mock_refund_request: {
        status: '已处理',
        refund_method: '礼品卡',
        refund_amount_usd: 23.5,
        assigned_gift_card_number: 'GC-7788-9922',
        assigned_gift_card_code: 'A1B2-C3D4-E5F6',
        paypal_receipt_screenshot: '',
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
  task._extra_refund_reason = '产品涨价'
  task._refund_apply_notes = ''
  task._submitting_refund = false
  task._refund_request = task.__mock_refund_request || null
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
        .in('status', ['待处理', '已处理'])
        .order('created_at', { ascending: false })
      if (refundReqs) {
        const reqMap: Record<string, any> = {}
        refundReqs.forEach(r => {
          if (!reqMap[r.sub_order_id]) reqMap[r.sub_order_id] = r
        })
        tasks.forEach(t => { t._refund_request = reqMap[t.id] || null })
      }
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
  task._submitting_refund = true
  try {
    const buyer = buyerList.value.find(b => b.id === task.buyer_id)
    const selectedMethod = task._sel_refund_method || task.refund_method
    const paypalEmail = selectedMethod === 'PayPal'
      ? (task._buyer_paypal_email || buyer?.paypal_email || '')
      : ''

    const payload = {
      sub_order_id: task.id,
      order_id: task.order_id,
      sub_order_number: task.sub_order_number,
      buyer_name: task.buyer_name || '',
      buyer_paypal_email: paypalEmail,
      refund_amount_usd: finalAmount,
      refund_amount: finalAmount,
      refund_method: selectedMethod,
      refund_sequence: task._sel_refund_sequence || task.refund_sequence,
      product_name: task.product_name || '',
      product_price: task.product_price || 0,
      asin: task.asin || '',
      store_name: task.store_name || '',
      staff_name: staffList.value.find(s => s.id === selectedStaffId.value)?.name || '',
      notes: `${task._refund_apply_notes || ''}${task._need_finance_screenshot ? ' [需财务返款截图]' : ''}`.trim(),
      status: '待处理',
    }
    const configPayload = {
      refund_method: task._sel_refund_method || task.refund_method,
      refund_sequence: task._sel_refund_sequence || task.refund_sequence,
    }
    const { error: e1 } = await supabase.from('sub_orders').update(configPayload).eq('id', task.id)
    if (e1) throw e1
    Object.assign(task, configPayload)

    const { data, error } = await supabase.from('refund_requests').insert(payload).select().maybeSingle()
    if (error) throw error
    task._refund_request = data
    task._refund_apply_notes = ''
    message.success('退款申请已提交，等待财务处理')
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
    message.success('退款已确认完成')
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
.date-badge { font-size: 11px; font-weight: 600; border-radius: 10px; padding: 2px 8px; white-space: nowrap; }
.date-ok { background: #f0fdf4; color: #16a34a; }
.date-overdue { background: #fef2f2; color: #dc2626; }
.progress-dots { display: flex; gap: 4px; }
.dot { width: 8px; height: 8px; border-radius: 50%; }
.dot.done { background: #059669; }
.dot.current { background: #2563eb; box-shadow: 0 0 0 2px rgba(37,99,235,0.2); }
.dot.pending { background: #e5e7eb; }
.header-assign { font-size: 12px; }
.buyer-badge { background: #f0fdf4; color: #059669; border: 1px solid #bbf7d0; border-radius: 10px; padding: 2px 8px; font-weight: 500; white-space: nowrap; }
.buyer-none { color: #f59e0b; font-size: 11px; }
.commission-badge { font-size: 12px; color: #6b7280; white-space: nowrap; }
.commission-badge strong { color: #059669; }

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
.pi-label { font-size: 11px; color: #9ca3af; font-weight: 500; white-space: nowrap; }
.pi-val { font-size: 12px; color: #374151; }

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
