<template>
  <div class="page-content">
    <h1 class="page-title">业务员工作台</h1>

    <div class="workbench-layout">
      <!-- 左侧业务员列表 -->
      <div class="staff-sidebar">
        <div class="staff-search">
          <a-input-search v-model:value="staffSearch" placeholder="搜索业务员" allow-clear size="small" />
        </div>
        <div class="staff-list">
          <div
            v-for="s in filteredStaff"
            :key="s.id"
            :class="['staff-item', selectedStaffId === s.id ? 'active' : '']"
            @click="selectStaff(s.id)"
          >
            <div class="staff-avatar" :style="{ background: s.avatar_color || '#2563eb' }">{{ s.name.charAt(0) }}</div>
            <div class="staff-info">
              <div class="staff-name">{{ s.name }}</div>
              <div class="staff-role">{{ s.role || '业务员' }}</div>
            </div>
            <a-badge :count="s.pending_count" :overflow-count="99" />
          </div>
          <div v-if="filteredStaff.length === 0" class="no-staff">暂无业务员</div>
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
                placeholder="搜索子订单号/ASIN/买手/关键词..."
                style="width:260px"
                @search="filterTaskList"
                allow-clear
                size="small"
              />
              <span class="total-hint">{{ filteredTasks.length }} 条任务</span>
            </div>
          </div>

          <div v-if="tasksLoading" class="loading-wrap"><a-spin /></div>

          <div v-else-if="filteredTasks.length === 0" class="empty-list">
            <a-empty description="暂无任务数据" />
          </div>

          <!-- 任务卡片列表 -->
          <div v-else class="task-card-list">
            <div
              v-for="task in filteredTasks"
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
                      <a-tag v-if="task.refund_status && task.refund_status !== '无需退款'" color="orange" style="font-size:10px">{{ task.refund_status }}</a-tag>
                      <a-tag v-if="task.order_type" color="default" style="font-size:10px">{{ task.order_type }}</a-tag>
                      <span v-if="task.product_name" class="product-name-sm">{{ task.product_name }}</span>
                    </div>
                    <div class="meta-row2">
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

                <!-- 步骤流程 -->
                <div class="workflow-steps">
                  <!-- Step 1: 分配买手 -->
                  <div :class="['step-block', getStepDone(task, 0) ? 'step-done' : 'step-active']">
                    <div class="step-number" :class="getStepDone(task, 0) ? 'num-done' : 'num-active'">
                      <CheckCircleFilled v-if="getStepDone(task, 0)" />
                      <span v-else>1</span>
                    </div>
                    <div class="step-content">
                      <div class="step-title">分配买手</div>
                      <div v-if="task.buyer_id && !task._editing_buyer" class="step-done-info">
                        <UserOutlined />
                        <span class="buyer-name-text">{{ task.buyer_name }}</span>
                        <a class="re-edit" @click.stop="task._editing_buyer = true; task._buyer_validation = null">更换</a>
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
                        <!-- 验证结果提示 -->
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

                  <!-- Step 2: 退款设置（时序 + 渠道） -->
                  <div :class="['step-block', getStepDone(task, 1) ? 'step-done' : getStepDone(task, 0) ? 'step-active' : 'step-locked']">
                    <div class="step-number" :class="getStepDone(task, 1) ? 'num-done' : getStepDone(task, 0) ? 'num-active' : 'num-locked'">
                      <CheckCircleFilled v-if="getStepDone(task, 1)" />
                      <span v-else>2</span>
                    </div>
                    <div class="step-content">
                      <div class="step-title">退款设置</div>
                      <div v-if="task.refund_sequence && task.refund_method && !task._editing_refund_method" class="step-done-info">
                        <span class="refund-seq-badge">{{ task.refund_sequence }}</span>
                        <span class="sep-dot">·</span>
                        <span class="refund-method-badge">{{ task.refund_method }}</span>
                        <a class="re-edit" @click.stop="task._editing_refund_method = true">修改</a>
                      </div>
                      <div v-if="!task.refund_sequence || !task.refund_method || task._editing_refund_method" class="refund-setup-panel">
                        <div class="refund-setup-row">
                          <span class="refund-setup-label">退款时序</span>
                          <a-radio-group v-model:value="task._sel_refund_sequence" size="small" button-style="solid">
                            <a-radio-button value="先退款后给单">先退款后给单</a-radio-button>
                            <a-radio-button value="先给单后退款">先给单后退款</a-radio-button>
                          </a-radio-group>
                        </div>
                        <div class="refund-setup-row">
                          <span class="refund-setup-label">退款渠道</span>
                          <a-radio-group v-model:value="task._sel_refund_method" size="small" button-style="solid">
                            <a-radio-button value="礼品卡">礼品卡</a-radio-button>
                            <a-radio-button value="PayPal">PayPal</a-radio-button>
                          </a-radio-group>
                        </div>
                        <a-button
                          type="primary" size="small"
                          :loading="task._saving_refund_method"
                          :disabled="!task._sel_refund_sequence || !task._sel_refund_method"
                          @click="saveRefundMethod(task)"
                          style="margin-top:4px"
                        >确认</a-button>
                      </div>
                    </div>
                  </div>

                  <!-- Step 3: 申请退款（向财务） -->
                  <div :class="['step-block', getStepDone(task, 2) ? 'step-done' : getStepDone(task, 1) ? 'step-active' : 'step-locked']">
                    <div class="step-number" :class="getStepDone(task, 2) ? 'num-done' : getStepDone(task, 1) ? 'num-active' : 'num-locked'">
                      <CheckCircleFilled v-if="getStepDone(task, 2)" />
                      <span v-else>3</span>
                    </div>
                    <div class="step-content">
                      <div class="step-title">申请退款</div>

                      <!-- 已有退款申请，显示状态 -->
                      <div v-if="task._refund_request" class="refund-request-status">
                        <div v-if="task._refund_request.status === '待处理'" class="refund-pending-box">
                          <span class="refund-pending-icon">⏳</span>
                          <div>
                            <div class="refund-pending-title">退款申请已提交，等待财务处理</div>
                            <div class="refund-pending-meta">
                              申请金额 <strong>${{ Number(task._refund_request.refund_amount_usd || 0).toFixed(2) }}</strong>
                              · 渠道 <strong>{{ task._refund_request.refund_method }}</strong>
                              <span v-if="task._refund_request.buyer_paypal_email"> · 买手PayPal: {{ task._refund_request.buyer_paypal_email }}</span>
                            </div>
                          </div>
                        </div>

                        <!-- 财务已处理 PayPal -->
                        <div v-else-if="task._refund_request.status === '已处理' && task._refund_request.refund_method === 'PayPal'" class="refund-done-box">
                          <div class="refund-done-header">
                            <span class="green-text">财务已完成 PayPal 退款</span>
                          </div>
                          <div class="refund-result-grid">
                            <div class="result-item">
                              <span class="result-label">付款账号</span>
                              <span class="result-val mono">{{ task._refund_request.assigned_paypal_email || '—' }}</span>
                            </div>
                            <div class="result-item">
                              <span class="result-label">退款金额</span>
                              <span class="result-val amount-usd">${{ Number(task._refund_request.refund_amount_usd || 0).toFixed(2) }}</span>
                            </div>
                            <div v-if="task._refund_request.paypal_receipt_screenshot" class="result-item full">
                              <span class="result-label">退款截图</span>
                              <a :href="task._refund_request.paypal_receipt_screenshot" target="_blank" class="screenshot-link">
                                <img :src="task._refund_request.paypal_receipt_screenshot" class="screenshot-preview" referrerpolicy="no-referrer" @error="onImgError" />
                              </a>
                            </div>
                            <div v-if="task._refund_request.finance_notes" class="result-item full">
                              <span class="result-label">财务备注</span>
                              <span class="result-val">{{ task._refund_request.finance_notes }}</span>
                            </div>
                          </div>
                          <a-button type="primary" size="small" style="margin-top:10px;background:#059669;border-color:#059669" @click="markRefundDone(task)">确认退款已到账</a-button>
                        </div>

                        <!-- 财务已处理 礼品卡 -->
                        <div v-else-if="task._refund_request.status === '已处理' && task._refund_request.refund_method === '礼品卡'" class="refund-done-box">
                          <div class="refund-done-header">
                            <span class="green-text">财务已分配礼品卡</span>
                          </div>
                          <div class="refund-result-grid">
                            <div class="result-item">
                              <span class="result-label">礼品卡面额</span>
                              <span class="result-val amount-usd">${{ Number(task._refund_request.gift_card_face_value_usd || task._refund_request.refund_amount_usd || 0).toFixed(2) }}</span>
                            </div>
                            <div class="result-item">
                              <span class="result-label">卡号</span>
                              <span class="result-val mono">{{ task._refund_request.assigned_gift_card_number || '—' }}</span>
                            </div>
                            <div class="result-item full">
                              <span class="result-label">卡Code</span>
                              <span class="result-val card-code">{{ task._refund_request.assigned_gift_card_code || '—' }}</span>
                              <a-button type="link" size="small" @click="copyText(task._refund_request.assigned_gift_card_code)">复制</a-button>
                            </div>
                            <div v-if="task._refund_request.finance_notes" class="result-item full">
                              <span class="result-label">财务备注</span>
                              <span class="result-val">{{ task._refund_request.finance_notes }}</span>
                            </div>
                          </div>
                          <a-button type="primary" size="small" style="margin-top:10px;background:#059669;border-color:#059669" @click="markRefundDone(task)">确认礼品卡已发给买手</a-button>
                        </div>

                        <!-- 已完成 -->
                        <div v-else-if="task.refund_status === '已退款'" class="step-done-info">
                          <span class="green-text">退款完成</span>
                          <span v-if="task.refund_amount" class="refund-amount-text">${{ Number(task._refund_request?.refund_amount_usd || 0).toFixed(2) }}</span>
                        </div>
                      </div>

                      <!-- 未提交申请，显示申请表单 -->
                      <div v-else-if="task.refund_status !== '已退款'" class="step-input-col">
                        <div class="refund-apply-panel">
                          <div class="refund-apply-label">
                            向财务申请退款
                            <span class="refund-apply-sub">· {{ task.refund_method === '礼品卡' ? '礼品卡' : 'PayPal' }} · {{ task.refund_sequence }}</span>
                          </div>
                          <div class="refund-row">
                            <label>退款金额 (USD)</label>
                            <a-input-number v-model:value="task._refund_amount_usd" size="small" :min="0" :precision="2" style="width:110px" prefix="$" />
                            <span class="price-hint">产品售价 ${{ Number(task.product_price || 0).toFixed(2) }}</span>
                          </div>
                          <div v-if="task.refund_method === 'PayPal'" class="refund-row">
                            <label>买手 PayPal 邮箱</label>
                            <a-input v-model:value="task._buyer_paypal_email" size="small" style="width:220px" placeholder="buyer@example.com" />
                          </div>
                          <div class="refund-row">
                            <label>备注</label>
                            <a-input v-model:value="task._refund_apply_notes" size="small" style="width:220px" placeholder="可选" />
                          </div>
                        </div>
                        <a-button
                          type="primary" size="small"
                          :loading="task._submitting_refund"
                          :disabled="!task._refund_amount_usd"
                          @click="submitRefundRequest(task)"
                          style="margin-top:8px"
                        >提交退款申请</a-button>
                      </div>

                      <!-- 已退款完成状态 -->
                      <div v-else class="step-done-info">
                        <span class="green-text">退款已完成</span>
                      </div>
                    </div>
                  </div>

                  <!-- Step 4: 填写Amazon订单号 -->
                  <div :class="['step-block', getStepDone(task, 3) ? 'step-done' : getStepDone(task, 2) ? 'step-active' : 'step-locked']">
                    <div class="step-number" :class="getStepDone(task, 3) ? 'num-done' : getStepDone(task, 2) ? 'num-active' : 'num-locked'">
                      <CheckCircleFilled v-if="getStepDone(task, 3)" />
                      <span v-else>4</span>
                    </div>
                    <div class="step-content">
                      <div class="step-title">填写Amazon订单号</div>
                      <div v-if="task.amazon_order_id && !task._editing_amazon" class="step-done-info">
                        <span class="amazon-order-text">{{ task.amazon_order_id }}</span>
                        <span v-if="task.amazon_order_placed_at" class="time-hint">{{ fmtTime(task.amazon_order_placed_at) }}</span>
                        <a class="re-edit" @click.stop="task._editing_amazon = true">修改</a>
                      </div>
                      <div v-if="!task.amazon_order_id || task._editing_amazon" class="step-input-row">
                        <a-input
                          v-model:value="task._input_amazon_order_id"
                          size="small"
                          style="width:220px"
                          placeholder="111-1111111-1111111"
                        />
                        <a-button type="primary" size="small" :loading="task._saving_amazon" :disabled="!task._input_amazon_order_id" @click="saveAmazonOrder(task)">确认</a-button>
                      </div>
                    </div>
                  </div>

                  <!-- Step 5: 确认签收 -->
                  <div :class="['step-block', getStepDone(task, 4) ? 'step-done' : getStepDone(task, 3) ? 'step-active' : 'step-locked']">
                    <div class="step-number" :class="getStepDone(task, 4) ? 'num-done' : getStepDone(task, 3) ? 'num-active' : 'num-locked'">
                      <CheckCircleFilled v-if="getStepDone(task, 4)" />
                      <span v-else>5</span>
                    </div>
                    <div class="step-content">
                      <div class="step-title">确认签收</div>
                      <div v-if="task.delivery_confirmed_at" class="step-done-info">
                        <span class="green-text">已签收</span>
                        <span class="time-hint">{{ fmtTime(task.delivery_confirmed_at) }}</span>
                        <a v-if="!task._show_delivery_estimate" class="re-edit" @click.stop="task._show_delivery_estimate = !task._show_delivery_estimate">查看预计</a>
                      </div>
                      <div v-else class="step-input-col">
                        <div v-if="task.amazon_order_placed_at" class="delivery-estimate-box">
                          <span class="estimate-icon">⏱</span>
                          <div>
                            <div class="estimate-label">预计签收时间</div>
                            <div class="estimate-val">还剩 <strong>{{ estimateDeliveryDays(task.amazon_order_placed_at) }} 天</strong></div>
                            <div class="estimate-date">预计送达 {{ estimateDeliveryDate(task.amazon_order_placed_at) }}</div>
                          </div>
                        </div>
                        <a-button type="default" size="small" :loading="task._saving_delivery" @click="confirmDelivery(task)" class="confirm-btn-gray">确认已签收</a-button>
                      </div>
                    </div>
                  </div>

                  <!-- Step 6: 上传留评截图 -->
                  <div :class="['step-block', getStepDone(task, 5) ? 'step-done' : getStepDone(task, 4) ? 'step-active' : 'step-locked']">
                    <div class="step-number" :class="getStepDone(task, 5) ? 'num-done' : getStepDone(task, 4) ? 'num-active' : 'num-locked'">
                      <CheckCircleFilled v-if="getStepDone(task, 5)" />
                      <span v-else>6</span>
                    </div>
                    <div class="step-content">
                      <div class="step-title">上传留评截图</div>
                      <div v-if="task.review_screenshot_url && !task._editing_screenshot" class="step-done-info">
                        <img :src="task.review_screenshot_url" class="screenshot-preview" referrerpolicy="no-referrer" @error="onImgError" />
                        <a class="re-edit" @click.stop="task._editing_screenshot = true">重传</a>
                      </div>
                      <div v-if="!task.review_screenshot_url || task._editing_screenshot" class="step-input-row">
                        <a-input
                          v-model:value="task._input_screenshot_url"
                          size="small"
                          style="width:280px"
                          placeholder="粘贴截图URL..."
                        />
                        <a-button type="primary" size="small" :loading="task._saving_screenshot" :disabled="!task._input_screenshot_url" @click="saveScreenshot(task)">提交</a-button>
                      </div>
                      <div v-if="getStepDone(task, 5)" class="step-input-row" style="margin-top:8px">
                        <a-button type="primary" size="small" :loading="task._completing" @click="completeTask(task)" style="background:#059669;border-color:#059669">标记已完成</a-button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 底部操作栏 -->
                <div class="workflow-footer">
                  <a-popconfirm title="确认客户取消？需填写原因" @confirm="openCancelModal(task)">
                    <a-button size="small" danger ghost><CloseCircleOutlined /> 客户取消 &amp; 补单</a-button>
                  </a-popconfirm>
                  <a-button size="small" ghost style="color:#7c3aed;border-color:#c4b5fd" @click="openReturnModal(task)"><RollbackOutlined /> 回转给管理员</a-button>
                  <a-button size="small" ghost style="color:#f59e0b;border-color:#f59e0b" @click="releaseToHall(task)"><ExportOutlined /> 放到抢单大厅</a-button>
                  <a-button size="small" type="primary" ghost style="color:#0284c7;border-color:#0284c7" @click="openTransferModal(task)"><SwapOutlined /> 订单互转</a-button>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- 待接收的互转请求 -->
        <div v-if="selectedStaffId && incomingRequests.length > 0" class="incoming-transfer-panel">
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
        <div v-if="selectedStaffId && outgoingRequests.length > 0" class="outgoing-transfer-panel">
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
          <p>请从左侧选择业务员</p>
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
  CloseCircleOutlined, SwapOutlined, ExportOutlined,
  LoadingOutlined, ExclamationCircleOutlined, RollbackOutlined,
  ArrowRightOutlined, ClockCircleOutlined
} from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

const staffSearch = ref('')
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

const workflowSteps = [0, 1, 2, 3, 4, 5]

const filteredStaff = computed(() =>
  staffList.value.filter(s => !staffSearch.value || s.name.includes(staffSearch.value))
)

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

function getStatusColor(s: string) {
  const map: Record<string, string> = {
    '已分配': 'cyan', '进行中': 'blue', '已下单': 'orange',
    '已留评': 'geekblue', '已完成': 'green', '已取消': 'red', '待分配': 'default'
  }
  return map[s] || 'default'
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

// 步骤逻辑
function getStepDone(task: any, step: number): boolean {
  switch (step) {
    case 0: return !!task.buyer_id
    case 1: return !!task.refund_method
    case 2: return task.refund_status === '已退款'
    case 3: return !!task.amazon_order_id
    case 4: return !!task.delivery_confirmed_at
    case 5: return !!task.review_screenshot_url
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
      .select('staff_id')
      .in('staff_id', ids)
      .in('status', ['已分配', '进行中', '已下单', '已留评'])
    const countMap: Record<string, number> = {}
    counts?.forEach(c => { countMap[c.staff_id] = (countMap[c.staff_id] || 0) + 1 })
    staffList.value = data.map(s => ({ ...s, pending_count: countMap[s.id] || 0 }))
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
  if (!selectedStaffId.value) return
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
  task._sel_refund_sequence = task.refund_sequence || ''
  task._sel_refund_method = task.refund_method || ''
  task._editing_refund_method = false
  task._saving_refund_method = false
  task._refund_amount_usd = task.product_price ? Number(task.product_price) : null
  task._buyer_paypal_email = task.buyer?.paypal_email || ''
  task._refund_apply_notes = ''
  task._submitting_refund = false
  task._refund_request = null
  task._input_amazon_order_id = task.amazon_order_id || ''
  task._editing_amazon = false
  task._saving_amazon = false
  task._saving_delivery = false
  task._show_delivery_estimate = false
  task._input_screenshot_url = task.review_screenshot_url || ''
  task._editing_screenshot = false
  task._saving_screenshot = false
  task._completing = false
  return task
}

async function loadTasks() {
  if (!selectedStaffId.value) return
  tasksLoading.value = true
  try {
    const { data, error } = await supabase
      .from('sub_orders')
      .select('*')
      .eq('staff_id', selectedStaffId.value)
      .order('scheduled_date', { ascending: true, nullsFirst: false })
    if (error) throw error
    const tasks = (data || []).map(initTaskFields)

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

    allTasks.value = tasks
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

async function saveRefundMethod(task: any) {
  if (!task._sel_refund_method || !task._sel_refund_sequence) return
  task._saving_refund_method = true
  try {
    const payload = {
      refund_method: task._sel_refund_method,
      refund_sequence: task._sel_refund_sequence,
    }
    const { error } = await supabase.from('sub_orders').update(payload).eq('id', task.id)
    if (error) throw error
    Object.assign(task, payload)
    task._editing_refund_method = false
    message.success('退款设置已保存')
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    task._saving_refund_method = false
  }
}

async function submitRefundRequest(task: any) {
  if (!task._refund_amount_usd) return
  task._submitting_refund = true
  try {
    const buyer = buyerList.value.find(b => b.id === task.buyer_id)
    const paypalEmail = task.refund_method === 'PayPal'
      ? (task._buyer_paypal_email || buyer?.paypal_email || '')
      : ''

    const payload = {
      sub_order_id: task.id,
      order_id: task.order_id,
      sub_order_number: task.sub_order_number,
      buyer_name: task.buyer_name || '',
      buyer_paypal_email: paypalEmail,
      refund_amount_usd: Number(task._refund_amount_usd),
      refund_amount: Number(task._refund_amount_usd),
      refund_method: task.refund_method,
      refund_sequence: task.refund_sequence,
      product_name: task.product_name || '',
      product_price: task.product_price || 0,
      asin: task.asin || '',
      store_name: task.store_name || '',
      staff_name: staffList.value.find(s => s.id === selectedStaffId.value)?.name || '',
      notes: task._refund_apply_notes || '',
      status: '待处理',
    }
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

onMounted(() => { loadStaff(); loadBuyers() })
</script>

<style scoped>
.page-content { padding: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }

.workbench-layout { display: flex; gap: 16px; min-height: calc(100vh - 140px); }

/* 左侧侧栏 */
.staff-sidebar { width: 200px; flex-shrink: 0; background: #fff; border-radius: 12px; border: 1px solid #f0f0f0; overflow: hidden; display: flex; flex-direction: column; }
.staff-search { padding: 10px; border-bottom: 1px solid #f0f0f0; }
.staff-list { flex: 1; overflow-y: auto; padding: 6px; }
.staff-item { display: flex; align-items: center; gap: 8px; padding: 9px 8px; border-radius: 8px; cursor: pointer; transition: background 0.15s; margin-bottom: 2px; }
.staff-item:hover { background: #f5f7fa; }
.staff-item.active { background: #eff6ff; border: 1px solid #bfdbfe; }
.staff-avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-weight: 700; font-size: 13px; flex-shrink: 0; }
.staff-name { font-size: 13px; font-weight: 600; color: #374151; }
.staff-role { font-size: 10px; color: #9ca3af; }
.staff-info { flex: 1; min-width: 0; }
.no-staff { font-size: 12px; color: #9ca3af; text-align: center; padding: 20px 0; }

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

/* 步骤 */
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
.workflow-footer { display: flex; gap: 8px; padding: 10px 20px 14px; border-top: 1px dashed #f0f0f0; flex-wrap: wrap; }

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
