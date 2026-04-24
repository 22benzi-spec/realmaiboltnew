<template>
  <div class="page-content">
    <div class="page-header">
      <div>
        <h1 class="page-title">订单列表</h1>
        <p class="page-desc">管理所有子订单，统一查看测评与返款进度</p>
      </div>
      <div class="header-stats" v-if="!loading">
        <div class="stat-pill">共 <strong>{{ totalOrders }}</strong> 单</div>
        <div class="stat-pill today">今日 <strong>{{ todayCount }}</strong> 单</div>
        <div class="stat-pill green">已返款 <strong>{{ paidCount }}</strong> 单</div>
        <div class="stat-pill orange">未返款 <strong>{{ unpaidCount }}</strong> 单</div>
        <div class="stat-pill red">问题单 <strong>{{ problemCount }}</strong> 单</div>
      </div>
    </div>

    <div class="main-card">
      <div class="toolbar">
        <a-input-search
          v-model:value="searchText"
          placeholder="搜索ASIN/产品名/订单号/买手/聊单号"
          style="width: 260px"
          allow-clear
          size="small"
          @change="applyFilters"
        />
        <a-select v-model:value="filterSales" style="width: 110px" allow-clear placeholder="业务员" size="small" @change="applyFilters">
          <a-select-option v-for="s in salesOptions" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterProgress" style="width: 120px" allow-clear placeholder="进度" size="small" @change="applyFilters">
          <a-select-option v-for="s in PROGRESS_OPTIONS" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterRefundStatus" style="width: 120px" allow-clear placeholder="返款状态" size="small" @change="applyFilters">
          <a-select-option v-for="s in REFUND_STATUS_OPTIONS" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterType" style="width: 120px" allow-clear placeholder="测评类型" size="small" @change="applyFilters">
          <a-select-option v-for="t in typeOptions" :key="t" :value="t">{{ t }}</a-select-option>
        </a-select>
        <a-range-picker v-model:value="dateRange" style="width: 220px" size="small" :placeholder="['开始', '结束']" @change="applyFilters" />
        <a-button size="small" @click="resetFilters">重置</a-button>
        <a-button size="small" type="primary" @click="loadData">刷新</a-button>
        <a-button size="small" @click="exportCSV">导出CSV</a-button>
        <span class="result-count">{{ filteredData.length }} 条</span>
      </div>

      <a-table
        :columns="columns"
        :data-source="filteredData"
        :loading="loading"
        :pagination="pagination"
        :scroll="{ x: 1680 }"
        row-key="id"
        size="small"
        @change="onTableChange"
      >
        <template #bodyCell="{ column, record }">

          <template v-if="column.key === 'sub_no'">
            <div class="ids-cell">
              <div class="id-row">
                <span class="id-val mono">{{ record.sub_order_number }}</span>
              </div>
            </div>
          </template>

          <template v-else-if="column.key === 'assignment'">
            <div class="assignment-cell">
              <div class="assign-row">
                <span class="assign-label">业务员</span>
                <a-tag v-if="record.sales_person" color="blue" class="mini-tag">{{ record.sales_person }}</a-tag>
                <span v-else class="empty-text">-</span>
              </div>
              <div class="assign-row">
                <span class="assign-label">买手</span>
                <span v-if="record.buyer_name" class="buyer-name">{{ record.buyer_name }}</span>
                <span v-else class="empty-text">未分配</span>
              </div>
              <div class="assign-row">
                <span class="assign-label">聊单号</span>
                <span v-if="record.buyer_chat_id" class="chat-id">{{ record.buyer_chat_id }}</span>
                <span v-else class="empty-text">-</span>
              </div>
            </div>
          </template>

          <template v-else-if="column.key === 'country'">
            <a-tag v-if="record.country" color="default" class="status-tag">{{ record.country }}</a-tag>
            <span v-else class="empty-text">-</span>
          </template>

          <template v-else-if="column.key === 'product'">
            <div class="product-cell">
              <img v-if="record.product_image" :src="record.product_image" class="product-thumb" referrerpolicy="no-referrer" @error="(e:any) => e.target.style.display='none'" />
              <div class="product-info">
                <div class="product-name" :title="record.product_name">{{ record.product_name || '-' }}</div>
                <div class="product-meta">
                  <a :href="'https://www.amazon.com/dp/' + record.asin" target="_blank" class="asin-link">{{ record.asin }}</a>
                </div>
              </div>
            </div>
          </template>

          <template v-else-if="column.key === 'type_level'">
            <div class="type-level-cell">
              <a-tag v-if="getDisplayReviewType(record)" :color="getTypeColor(getDisplayReviewType(record))" class="type-tag">
                {{ getDisplayReviewType(record) }}
              </a-tag>
              <a-tag v-if="record.review_level" color="gold" class="type-tag">
                {{ record.review_level }}
              </a-tag>
              <span v-if="!getDisplayReviewType(record) && !record.review_level" class="empty-text">-</span>
            </div>
          </template>

          <template v-else-if="column.key === 'order_upload'">
            <div class="ids-cell">
              <div class="id-row">
                <span class="id-label">订单号</span>
                <span v-if="record.amazon_order_id" class="id-val mono small">{{ record.amazon_order_id }}</span>
                <span v-else class="empty-text">-</span>
              </div>
              <div class="id-row">
                <span class="id-label">上传</span>
                <span class="date-text">{{ fmtDate(record.amazon_order_placed_at || '') }}</span>
              </div>
            </div>
          </template>

          <template v-else-if="column.key === 'price_refund'">
            <div class="price-cell">
              <div class="price-row">
                <span class="price-label">售价</span>
                <span class="price-val">${{ fmt(record.product_price) }}</span>
              </div>
              <div class="price-row">
                <span class="price-label">实付</span>
                <span v-if="record.actual_paid != null" class="price-val actual">${{ fmt(record.actual_paid) }}</span>
                <span v-else class="empty-text">-</span>
              </div>
              <div class="price-row">
                <span class="price-label">返款</span>
                <span v-if="Number(record.refund_amount) > 0" class="price-val refund">${{ fmt(record.refund_amount) }}</span>
                <span v-else class="empty-text">-</span>
              </div>
            </div>
          </template>

          <template v-else-if="column.key === 'progress'">
            <a-tag :color="getProgressColor(computeProgress(record))" class="status-tag">
              {{ computeProgress(record) }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'refund_info'">
            <div class="refund-info-wrap">
              <a-tag :color="getRefundStatusColor(getRefundStatus(record))" class="status-tag">
                {{ getRefundStatus(record) }}
              </a-tag>
              <span class="date-text">{{ fmtDate(record.refund_date || '') }}</span>
              <span v-if="record.refund_method" class="refund-method-inline">{{ record.refund_method }}</span>
              <span v-else class="empty-text">-</span>
              <span v-if="showPrincipalLossHint(record)" class="principal-loss-hint">本金损失</span>
            </div>
          </template>

          <template v-else-if="column.key === 'order_status'">
            <a-tag :color="getOrderStatusColor(getOrderStatus(record))" class="status-tag">
              {{ getOrderStatus(record) }}
            </a-tag>
          </template>

          <template v-else-if="column.key === 'notes'">
            <div v-if="record.notes || record.task_notes" class="notes-inline" :title="record.notes || record.task_notes">{{ record.notes || record.task_notes }}</div>
            <span v-else class="empty-text">-</span>
          </template>

          <template v-else-if="column.key === 'action'">
            <a-space size="small">
              <a-button type="link" size="small" class="edit-btn" @click="openOpsDetail(record)">详情</a-button>
              <a-button type="link" size="small" class="edit-btn" @click="openEdit(record)">编辑</a-button>
            </a-space>
          </template>

        </template>
      </a-table>
    </div>

    <!-- 编辑弹窗 -->
    <a-modal
      v-model:open="editOpen"
      title="编辑子订单"
      :footer="null"
      width="980px"
      :destroy-on-close="true"
    >
      <div v-if="editTask" class="workflow-edit-modal">
        <div class="workflow-edit-header">
          <div class="task-meta">
            <div class="meta-row1">
              <span class="sub-no-text">{{ editTask.sub_order_number }}</span>
              <a-tag v-if="editTask.order_type" color="default" style="font-size:10px">{{ editTask.order_type }}</a-tag>
              <div v-if="editTask.keyword" class="keyword-badge">{{ editTask.keyword }}</div>
              <span v-if="editTask.product_name" class="product-name-sm">{{ editTask.product_name }}</span>
            </div>
            <div class="meta-row2">
              <span class="mono-sm">{{ editTask.asin || '—' }}</span>
              <span class="sep">{{ editTask.store_name || '—' }}</span>
              <span class="price-sm">${{ Number(editTask.product_price || 0).toFixed(2) }}</span>
              <span v-if="editTask.category" class="sep text-gray">{{ editTask.category }}</span>
              <span v-if="editTask.country" class="sep text-gray">{{ editTask.country }}</span>
            </div>
            <div class="meta-row3">
              <span class="meta-focus-item"><span class="meta-focus-label">测评等级</span><span class="meta-focus-value">{{ editTask.review_level || '—' }}</span></span>
              <span class="meta-focus-item"><span class="meta-focus-label">指定变体</span><span class="meta-focus-value">{{ editTask.variant_info || '—' }}</span></span>
              <span class="meta-focus-item meta-focus-item-wide"><span class="meta-focus-label">任务备注</span><span class="meta-focus-value">{{ editTask.task_notes || '—' }}</span></span>
            </div>
          </div>
          <div class="workflow-edit-side">
            <span :class="getWorkflowProgressBadgeClass(editTask)">{{ getWorkflowProgressLabel(editTask) }}</span>
            <span v-if="editTask.buyer_name" class="assign-name">{{ editTask.buyer_name }}</span>
          </div>
        </div>

        <div class="product-info-bar">
          <div class="pi-item"><span class="pi-label">产品名称</span><span class="pi-val">{{ editTask.product_name || '—' }}</span></div>
          <div class="pi-item"><span class="pi-label">品牌</span><span class="pi-val">{{ editTask.brand_name || '—' }}</span></div>
          <div class="pi-item"><span class="pi-label">类目</span><span class="pi-val">{{ editTask.category || '—' }}</span></div>
          <div class="pi-item"><span class="pi-label">客户</span><span class="pi-val">{{ editTask.customer_name || '—' }}</span></div>
          <div class="pi-item"><span class="pi-label">商务</span><span class="pi-val">{{ editTask.sales_person || '—' }}</span></div>
          <div class="pi-actions">
            <a-button size="small" @click="openReplaceProduct()">更换产品</a-button>
          </div>
        </div>

        <div class="workflow-steps-modern">
          <div class="wf-panel">
            <div class="wf-panel-head">
              <div class="wf-panel-header">
                <span class="wf-panel-index">1.</span>
                <span>匹配买手</span>
                <span v-if="editTask.buyer_name" class="wf-panel-status done">已匹配</span>
                <span v-else class="wf-panel-status todo">待处理</span>
              </div>
              <a class="re-edit" @click.stop="editTask._editing_buyer = true; editTask._buyer_validation = null">更换买手</a>
            </div>
            <div class="wf-panel-body">
              <div v-if="editTask.buyer_id && !editTask._editing_buyer" class="buyer-brief-row">
                <span class="buyer-name-text">{{ editTask.buyer_name }}</span>
              </div>
              <div v-if="editTask.buyer_id && !editTask._editing_buyer" class="buyer-brief-desc">
                {{ editTask._buyer_country || '—' }} · {{ editTask._buyer_level || '—' }}
              </div>
              <div v-if="!editTask.buyer_id || editTask._editing_buyer" class="buyer-assign-area">
                <div class="step-input-row">
                  <a-select
                    v-model:value="editTask._sel_buyer_id"
                    style="width:240px"
                    show-search
                    option-filter-prop="label"
                    placeholder="选择买手"
                    size="small"
                    allow-clear
                    @change="(val: string) => onBuyerSelect(editTask, val)"
                  >
                    <a-select-option v-for="b in buyerList" :key="b.id" :value="b.id" :label="b.name" :disabled="!!getBuyerBlockReason(editTask, b.id)">
                      <div class="buyer-opt-row">
                        <span>{{ b.name }}</span>
                        <span class="buyer-opt-meta"> · {{ b.country || '—' }} · {{ b.level || '—' }}</span>
                        <span v-if="getBuyerBlockReason(editTask, b.id)" class="buyer-opt-blocked">{{ getBuyerBlockReason(editTask, b.id) }}</span>
                      </div>
                    </a-select-option>
                  </a-select>
                  <a-button type="primary" size="small" :loading="editTask._saving_buyer || editTask._validating_buyer" :disabled="!editTask._sel_buyer_id || editTask._buyer_validation?.blocked" @click="assignBuyer(editTask)">确认分配</a-button>
                </div>
                <div v-if="editTask._validating_buyer" class="buyer-validation-hint checking">验证买手资格...</div>
                <div v-else-if="editTask._buyer_validation?.blocked" class="buyer-validation-hint blocked">{{ editTask._buyer_validation.reason }}</div>
                <div v-else-if="editTask._buyer_validation && !editTask._buyer_validation.blocked" class="buyer-validation-hint passed">
                  买手资格验证通过
                  <span v-if="editTask._buyer_validation.monthlyCount !== undefined" class="val-detail">· 本月已接单 {{ editTask._buyer_validation.monthlyCount }}/2</span>
                </div>
              </div>
            </div>
          </div>

          <div class="wf-panel">
            <div class="wf-panel-head">
              <div class="wf-panel-header">
                <span class="wf-panel-index">2.</span>
                <span>{{ refundPanelTitle(editTask) }}</span>
                <span v-if="isRefundStepReadonly(editTask)" class="wf-panel-status done">已完成</span>
                <span v-else-if="editTask._refund_request_pending" class="wf-panel-status todo">待财务审核</span>
                <span v-else class="wf-panel-status todo">当前待办</span>
              </div>
            </div>
            <div class="wf-panel-body">
              <template v-if="isRefundStepReadonly(editTask)">
                <div class="refund-compact-card">
                  <div class="refund-compact-main">
                    <div class="refund-compact-title">已处理返款 {{ processedRefundsForDisplay(editTask).length }} 笔</div>
                    <div class="refund-compact-meta">
                      <span v-if="editTask.refund_method">当前方式 {{ editTask.refund_method }}</span>
                      <span v-if="aggregateProcessedRefunds(editTask).any">累计 ${{ (aggregateProcessedRefunds(editTask).paypalTotal + aggregateProcessedRefunds(editTask).giftFace).toFixed(2) }}</span>
                      <span>明细请点右侧「详情」查看</span>
                    </div>
                  </div>
                </div>
                <div v-if="processedRefundsForDisplay(editTask).length" class="refund-processed-list">
                  <div v-for="row in processedRefundsForDisplay(editTask)" :key="row.id" class="refund-processed-card">
                    <div class="rpc-head">
                      <div class="rpc-head-main">
                        <span class="rpc-type">{{ refundRequestTypeLabel(row) }}</span>
                        <span class="rpc-method">{{ row.refund_method || '—' }}</span>
                        <span class="rpc-status">{{ refundStatusLabel(row.status) || row.status || '已处理' }}</span>
                      </div>
                      <span class="rpc-time">{{ fmtDate(row.updated_at || row.created_at) }}</span>
                    </div>
                    <div class="rpc-body">
                      <span>返款金额 ${{ Number(row.refund_amount_usd || row.refund_amount || 0).toFixed(2) }}</span>
                      <span v-if="row.refund_method === 'PayPal'">实付 ${{ inferActualPaidUsd(row).toFixed(2) }}</span>
                      <span v-if="row.refund_method === 'PayPal'">手续费 ${{ Number(row.paypal_fee_usd || 0).toFixed(2) }}</span>
                      <span v-if="row.buyer_paypal_email">PayPal {{ row.buyer_paypal_email }}</span>
                    </div>
                  </div>
                </div>
                <div class="extra-refund-bar">
                  <a-button size="small" type="primary" ghost @click="startSupplementalRefund(editTask)">追加返款</a-button>
                  <a-button size="small" @click="startCorrectionRefund(editTask)" :disabled="!editTask._refund_request_latest_processed">更正返款</a-button>
                  <a-input-number v-model:value="editTask._extra_refund_amount" size="small" :min="0" :precision="2" style="width:130px" placeholder="追加基数$" />
                  <span class="extra-method-label">追加方式</span>
                  <a-radio-group v-model:value="editTask._extra_refund_method" size="small">
                    <a-radio value="同首笔">同首笔</a-radio>
                    <a-radio value="礼品卡">礼品卡</a-radio>
                    <a-radio value="PayPal">PayPal</a-radio>
                  </a-radio-group>
                  <a-radio-group v-model:value="editTask._extra_refund_reason" size="small">
                    <a-radio value="产品涨价">产品涨价</a-radio>
                    <a-radio value="产品额外佣金">产品额外佣金</a-radio>
                  </a-radio-group>
                </div>
              </template>
              <template v-else>
                <a-alert v-if="editTask._refund_supplement_mode" type="info" show-icon style="margin-bottom:8px" :message="'追加返款：原因「' + (editTask._extra_refund_reason || '—') + '」。' + (editTask._extra_refund_reason === '产品涨价' ? '请务必将「实付金额」改为涨价后的真实金额。' : '')" />
                <a-alert v-if="editTask._refund_correction_mode" type="warning" show-icon style="margin-bottom:8px" message="更正返款：将生成新的待财务处理申请，请修改邮箱或金额后重新提交。" />
                <a-alert v-if="editTask._refund_request_pending && !editTask._refund_supplement_mode && !editTask._refund_correction_mode" type="info" show-icon style="margin-bottom:8px" message="当前有一条待财务审核的返款申请，更新后会保留修改留痕。" />
                <div v-if="(editTask._refund_request_pending?.staff_change_log || []).length && !editTask._refund_supplement_mode && !editTask._refund_correction_mode" class="refund-audit-trail">
                  <div class="rat-title">业务员修改留痕</div>
                  <div v-for="(entry, ei) in (editTask._refund_request_pending.staff_change_log || [])" :key="ei" class="rat-entry">
                    <div class="rat-meta">{{ fmtDate(entry.at) }} · {{ entry.staff_name }}</div>
                    <ul class="rat-ul">
                      <li v-for="(ed, ej) in (entry.edits || [])" :key="ej">{{ formatAuditEdit(ed) }}</li>
                    </ul>
                  </div>
                </div>
                <div v-if="editTask._refund_supplement_mode || editTask._refund_correction_mode" class="refund-action-row" style="margin-bottom:4px">
                  <a-button size="small" @click="cancelRefundSpecialModes(editTask)">取消</a-button>
                </div>
                <div class="refund-setup-row">
                  <span class="refund-setup-label">返款节点</span>
                  <a-radio-group v-model:value="editTask._sel_refund_sequence" size="small" @change="syncRefundComputed(editTask)">
                    <a-radio value="预付">预付</a-radio>
                    <a-radio value="出单后返">出单后返</a-radio>
                    <a-radio value="收货后返">收货后返</a-radio>
                    <a-radio value="评后返">评后返</a-radio>
                    <a-radio value="无需返款">无需返款</a-radio>
                  </a-radio-group>
                </div>
                <div v-if="isNoRefundSelection(editTask)" class="refund-no-need-tip">选择“无需返款”后，保存将直接标记为无需退款，不会生成新的财务返款申请。</div>
                <div v-if="!isNoRefundSelection(editTask)" class="refund-setup-row">
                  <span class="refund-setup-label">返款方式</span>
                  <a-radio-group v-model:value="editTask._sel_refund_method" size="small" @change="syncRefundComputed(editTask)">
                    <a-radio value="礼品卡">礼品卡</a-radio>
                    <a-radio value="PayPal">贝宝(PayPal)</a-radio>
                    <a-radio value="其他">其他</a-radio>
                  </a-radio-group>
                </div>
                <div v-if="!isNoRefundSelection(editTask) && editTask._sel_refund_method === 'PayPal'" class="refund-row">
                  <label>买手 PayPal 邮箱</label>
                  <a-input v-model:value="editTask._buyer_paypal_email" size="small" style="width:240px" placeholder="amanda@example.com" />
                </div>
                <div v-if="!isNoRefundSelection(editTask)" class="refund-amount-box">
                  <div class="refund-amount-title">金额明细</div>
                  <div class="refund-product-ref">系统产品标价（参考）<span class="refund-product-ref-val">${{ Number(editTask.product_price || 0).toFixed(2) }}</span></div>
                  <div v-if="editTask._sel_refund_method === 'PayPal'" class="refund-amount-fields">
                    <div class="raf-line">
                      <span class="raf-label">实付金额</span>
                      <a-input-number v-model:value="editTask._refund_amount_usd" size="small" :min="0" :precision="2" style="width:140px" prefix="$" @change="syncRefundComputed(editTask)" />
                      <span class="raf-hint">买手实际支付</span>
                    </div>
                    <div class="raf-line">
                      <span class="raf-label">贝宝手续费</span>
                      <a-input-number v-model:value="editTask._refund_fee_usd" size="small" :min="0" :precision="2" style="width:140px" prefix="$" @change="syncRefundComputed(editTask)" />
                      <span class="raf-hint">由财务承担的手续费，计入打款总额</span>
                    </div>
                    <div class="raf-line raf-total">
                      <span class="raf-label">合计返款</span>
                      <span class="raf-total-val">${{ getRefundFinalAmount(editTask).toFixed(2) }}</span>
                    </div>
                  </div>
                  <div v-else class="refund-amount-fields">
                    <div class="raf-line">
                      <span class="raf-label">实付金额</span>
                      <a-input-number v-model:value="editTask._refund_amount_usd" size="small" :min="0" :precision="2" style="width:140px" prefix="$" @change="syncRefundComputed(editTask)" />
                      <span class="raf-hint">买手实际支付（可与标价不同）</span>
                    </div>
                    <div class="raf-line">
                      <span class="raf-label">应返礼品卡面额</span>
                      <a-input-number v-model:value="editTask._refund_final_amount_usd" size="small" :min="0" :precision="2" style="width:140px" prefix="$" />
                      <span class="raf-hint">发给买手的卡面金额，可与实付一致或含补贴</span>
                    </div>
                  </div>
                </div>
                <div class="refund-row">
                  <label>备注</label>
                  <a-input v-model:value="editTask._refund_apply_notes" size="small" style="width:360px" placeholder="选填，例如：买手催款..." />
                </div>
                <div v-if="!isNoRefundSelection(editTask)" class="refund-row">
                  <a-checkbox v-model:checked="editTask._need_finance_screenshot">需财务提供水单</a-checkbox>
                </div>
                <div class="refund-action-row">
                  <a-button type="primary" size="small" :loading="editTask._submitting_refund" :disabled="!isNoRefundSelection(editTask) && !getRefundFinalAmount(editTask)" @click="submitRefundRequest(editTask)">{{ refundSubmitButtonText(editTask) }}</a-button>
                </div>
              </template>
            </div>
          </div>

          <div class="wf-panel">
            <div class="wf-panel-head">
              <div class="wf-panel-header">
                <span class="wf-panel-index">3.</span>
                <span>填写Amazon订单号</span>
                <span v-if="editTask.amazon_order_id" class="wf-panel-status done">已完成</span>
                <span v-else class="wf-panel-status todo">待处理</span>
              </div>
            </div>
            <div class="wf-panel-body">
              <a-alert v-if="isPrepayMode(editTask) && !isRefundStepReadonly(editTask)" type="info" show-icon message="预付模式需等待财务返款完成后，才可填写Amazon订单号" style="margin-bottom:10px" />
              <div class="step-input-row">
                <a-input v-model:value="editTask._input_amazon_order_id" size="small" style="width:260px" placeholder="111-1111111-1111111" :disabled="isPrepayMode(editTask) && !isRefundStepReadonly(editTask)" />
                <a-button type="primary" size="small" :loading="editTask._saving_amazon" :disabled="!editTask._input_amazon_order_id || (isPrepayMode(editTask) && !isRefundStepReadonly(editTask))" @click="saveAmazonOrder(editTask)">确认</a-button>
              </div>
            </div>
          </div>

          <div class="wf-panel">
            <div class="wf-panel-head">
              <div class="wf-panel-header">
                <span class="wf-panel-index">4.</span>
                <span>留评凭证上传</span>
                <span v-if="editTask.review_screenshot_url || editTask.fb_image_url" class="wf-panel-status done">已完成</span>
                <span v-else class="wf-panel-status todo">待处理</span>
              </div>
            </div>
            <div class="wf-panel-body">
              <div class="refund-row">
                <label>凭证类型</label>
                <a-radio-group v-model:value="editTask._proof_type" size="small">
                  <a-radio value="Review">Review(留评)</a-radio>
                  <a-radio value="Feedback">Feedback(店铺反馈)</a-radio>
                </a-radio-group>
              </div>
              <div class="refund-row">
                <label>{{ editTask._proof_type === 'Feedback' ? '反馈链接' : '评论链接' }}</label>
                <a-input v-model:value="editTask._proof_comment_link" size="small" style="width:360px" placeholder="https://..." />
              </div>
              <div class="refund-row">
                <label>{{ editTask._proof_type === 'Feedback' ? '反馈图片' : '凭证图片' }}</label>
                <a-input v-model:value="editTask._input_screenshot_url" size="small" style="width:360px" placeholder="粘贴图片URL（支持多张可用逗号分隔）" />
              </div>
              <div class="refund-action-row">
                <a-button type="primary" size="small" :loading="editTask._saving_screenshot" :disabled="!editTask._input_screenshot_url" @click="saveScreenshot(editTask)">提交</a-button>
              </div>
            </div>
          </div>

          <div class="wf-panel">
            <div class="wf-panel-head">
              <div class="wf-panel-header">
                <span class="wf-panel-index">5.</span>
                <span>子单备注</span>
                <span v-if="editTask.notes" class="wf-panel-status done">已填写</span>
                <span v-else class="wf-panel-status todo">选填</span>
              </div>
            </div>
            <div class="wf-panel-body">
              <div class="refund-row">
                <label>子单备注</label>
                <a-input v-model:value="editTask._edit_order_notes" size="small" style="width:360px" placeholder="填写子单备注" @blur="saveOrderNotes(editTask)" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </a-modal>

    <a-modal
      v-model:open="replaceProductOpen"
      title="更换产品"
      @ok="saveReplaceProduct"
      :confirm-loading="replaceProductSaving"
      ok-text="保存"
      cancel-text="取消"
      width="720px"
      :destroy-on-close="true"
    >
      <a-form v-if="replaceProductForm" layout="vertical" size="small">
        <div class="form-row-2">
          <a-form-item label="ASIN">
            <a-input v-model:value="replaceProductForm.asin" placeholder="输入新的 ASIN" />
          </a-form-item>
          <a-form-item label="产品名称">
            <a-input v-model:value="replaceProductForm.product_name" placeholder="输入新的产品名称" />
          </a-form-item>
          <a-form-item label="店铺">
            <a-input v-model:value="replaceProductForm.store_name" placeholder="输入新的店铺" />
          </a-form-item>
          <a-form-item label="品牌">
            <a-input v-model:value="replaceProductForm.brand_name" placeholder="输入新的品牌" />
          </a-form-item>
          <a-form-item label="类目">
            <a-input v-model:value="replaceProductForm.category" placeholder="输入新的类目" />
          </a-form-item>
          <a-form-item label="变体">
            <a-input v-model:value="replaceProductForm.variant_info" placeholder="输入新的变体/变参" />
          </a-form-item>
          <a-form-item label="售价 ($)">
            <a-input-number v-model:value="replaceProductForm.product_price" :min="0" :precision="2" style="width:100%" />
          </a-form-item>
        </div>
      </a-form>
    </a-modal>

    <!-- 图片预览 -->
    <a-modal v-model:open="imgOpen" :footer="null" width="auto" title="图片预览" :destroy-on-close="true">
      <div style="text-align:center;padding:8px">
        <img :src="imgUrl" style="max-width:75vw;max-height:75vh;border-radius:6px" />
      </div>
    </a-modal>

    <SubOrderOpsDrawer
      v-model:open="opsDetailOpen"
      :sub-order-id="opsDetailTarget?.id || ''"
      :fallback-detail="opsDetailTarget"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { supabase } from '../lib/supabase'
import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
import SubOrderOpsDrawer from '../components/SubOrderOpsDrawer.vue'
import { useCurrentUser } from '../composables/useCurrentUser'

interface SubOrder {
  id: string
  order_id?: string
  sub_order_number: string
  asin: string
  product_name: string
  product_image: string
  store_name: string
  brand_name?: string
  category?: string
  variant_info?: string
  keyword?: string
  customer_name?: string
  task_notes?: string
  country: string
  order_type: string
  review_level: string
  review_type: string
  sales_person: string
  staff_name: string
  buyer_name: string
  buyer_id: string | null
  buyer_chat_id: string
  amazon_order_id: string
  amazon_order_placed_at?: string
  product_price: number
  actual_paid: number
  refund_amount: number
  refund_method: string
  refund_date?: string
  refund_sequence?: string
  buyer_paypal_email?: string
  paypal_fee_usd?: number
  buyer_assigned_at?: string
  review_submitted_at?: string
  fb_link: string
  fb_image_url: string
  review_link: string
  review_screenshot_url: string
  status: string
  refund_status?: string
  notes: string
  created_at: string
}

const PROGRESS_OPTIONS = ['待匹配', '待下单', '待留评', '已完成', '已掉评', '无法完成']
const PROBLEM_STATUSES = ['已取消', '已退款', '无此订单', '本金多返', '不下单']
const REVIEW_TYPE_OPTIONS = ['文字', '图片', '视频', '免评', 'Feedback']
const REFUND_STATUS_OPTIONS = ['未返款', '返款中', '已返款', 'On Hold', '返款失败', '无需返款', '失误多返']
const REFUND_METHODS = ['PayPal', '礼品卡', '银行转账', '微信', '支付宝', 'Zelle']
const LIST_PREVIEW_MOCKS = [
  {
    sales_person: 'Luna',
    buyer_name: 'Emma',
    buyer_chat_id: 'CHAT-90217',
    country: '美国',
    product_name: 'Portable Blender Personal Size',
    asin: 'B0C8PX21LM',
    review_type: '图片',
    review_level: '高等',
    amazon_order_id: '113-9283746-1827364',
    amazon_order_placed_at: dayjs().subtract(2, 'day').toISOString(),
    product_price: 39.99,
    actual_paid: 41.26,
    refund_amount: 43.5,
    refund_method: 'PayPal',
    refund_date: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
    refund_status: '已返款',
    notes: '买手反馈包装完好，已完成返款',
  },
  {
    sales_person: 'Ivy',
    buyer_name: 'Sophia',
    buyer_chat_id: 'TG-11802',
    country: '英国',
    product_name: 'Memory Foam Seat Cushion',
    asin: 'B09W8Q7ZRM',
    review_type: '文字',
    review_level: '普通',
    amazon_order_id: '204-5173628-4419023',
    amazon_order_placed_at: dayjs().subtract(4, 'day').toISOString(),
    product_price: 26.8,
    actual_paid: 27.35,
    refund_amount: 0,
    refund_method: '礼品卡',
    refund_date: '',
    refund_status: '返款中',
    notes: '订单已上传，等待财务处理礼品卡',
  },
  {
    sales_person: 'Aiden',
    buyer_name: 'Mia',
    buyer_chat_id: 'WA-77129',
    country: '德国',
    product_name: 'LED Desk Lamp with USB Port',
    asin: 'B0BVT92KQP',
    review_type: '视频',
    review_level: '极高等',
    amazon_order_id: '305-6629134-5102287',
    amazon_order_placed_at: dayjs().subtract(1, 'day').toISOString(),
    product_price: 54.2,
    actual_paid: 55.89,
    refund_amount: 58.0,
    refund_method: '银行转账',
    refund_date: dayjs().format('YYYY-MM-DD'),
    refund_status: '已返款',
    notes: '视频素材已确认，可作为高等级展示样例',
  },
]

function buildSyntheticListPreviewRows() {
  const now = dayjs()
  return [
    {
      id: 'preview-sub-order-001',
      order_id: 'preview-order-001',
      sub_order_number: 'SUB-PREVIEW-001',
      asin: 'B0C8PX21LM',
      product_name: 'Portable Blender Personal Size',
      product_image: '',
      store_name: 'US-Preview-Store',
      brand_name: 'BlendNova',
      category: 'Kitchen',
      variant_info: '粉色便携款',
      keyword: 'portable blender',
      customer_name: '杭州云海贸易',
      task_notes: '预览数据：优先匹配北美买手',
      country: '美国',
      order_type: '图片',
      review_level: '高等',
      review_type: '图片',
      sales_person: 'Luna',
      staff_name: 'Luna',
      buyer_name: 'Emma',
      buyer_id: 'preview-buyer-001',
      buyer_chat_id: 'CHAT-90217',
      amazon_order_id: '',
      amazon_order_placed_at: '',
      product_price: 39.99,
      actual_paid: 0,
      refund_amount: 0,
      refund_method: '',
      refund_date: '',
      refund_sequence: '预付',
      buyer_paypal_email: 'emma-preview@example.com',
      paypal_fee_usd: 0,
      buyer_assigned_at: now.subtract(1, 'day').toISOString(),
      review_submitted_at: '',
      fb_link: '',
      fb_image_url: '',
      review_link: '',
      review_screenshot_url: '',
      status: '已分配',
      refund_status: '未返款',
      notes: '预览交互：待下单场景',
      created_at: now.subtract(1, 'day').toISOString(),
      status_change_log: [
        {
          from_status: '待分配',
          to_status: '已分配',
          reason: '业务员完成首次匹配',
          changed_at: now.subtract(1, 'day').add(2, 'hour').toISOString(),
        },
      ],
      _edit_change_log: [
        {
          at: now.subtract(1, 'day').add(2, 'hour').toISOString(),
          staff_name: 'Luna',
          edits: [
            { field: 'buyer_name', from: '空', to: 'Emma' },
            { field: 'buyer_chat_id', from: '空', to: 'CHAT-90217' },
          ],
        },
      ],
      _is_preview_mock: true,
    },
    {
      id: 'preview-sub-order-002',
      order_id: 'preview-order-002',
      sub_order_number: 'SUB-PREVIEW-002',
      asin: 'B09W8Q7ZRM',
      product_name: 'Memory Foam Seat Cushion',
      product_image: '',
      store_name: 'UK-Preview-Store',
      brand_name: 'SoftEase',
      category: 'Home',
      variant_info: '灰色加厚款',
      keyword: 'seat cushion',
      customer_name: '深圳森语家居',
      task_notes: '预览数据：观察返款中状态',
      country: '英国',
      order_type: '文字',
      review_level: '普通',
      review_type: '文字',
      sales_person: 'Ivy',
      staff_name: 'Ivy',
      buyer_name: 'Sophia',
      buyer_id: 'preview-buyer-002',
      buyer_chat_id: 'TG-11802',
      amazon_order_id: '204-5173628-4419023',
      amazon_order_placed_at: now.subtract(4, 'day').toISOString(),
      product_price: 26.8,
      actual_paid: 27.35,
      refund_amount: 27.35,
      refund_method: '礼品卡',
      refund_date: '',
      refund_sequence: '评后返',
      buyer_paypal_email: '',
      paypal_fee_usd: 0,
      buyer_assigned_at: now.subtract(5, 'day').toISOString(),
      review_submitted_at: '',
      fb_link: '',
      fb_image_url: '',
      review_link: '',
      review_screenshot_url: '',
      status: '已下单',
      refund_status: '返款中',
      notes: '预览交互：待留评 + 返款中',
      created_at: now.subtract(5, 'day').toISOString(),
      status_change_log: [
        {
          from_status: '待分配',
          to_status: '已分配',
          reason: '主管指派业务员',
          changed_at: now.subtract(5, 'day').add(1, 'hour').toISOString(),
        },
        {
          from_status: '已分配',
          to_status: '已下单',
          reason: '已上传 Amazon 订单号',
          changed_at: now.subtract(4, 'day').add(2, 'hour').toISOString(),
        },
      ],
      _edit_change_log: [
        {
          at: now.subtract(5, 'day').add(1, 'hour').toISOString(),
          staff_name: 'Ivy',
          edits: [
            { field: 'buyer_name', from: '空', to: 'Sophia' },
          ],
        },
        {
          at: now.subtract(4, 'day').add(2, 'hour').toISOString(),
          staff_name: 'Sophia',
          edits: [
            { field: 'amazon_order_id', from: '空', to: '204-5173628-4419023' },
          ],
        },
      ],
      _is_preview_mock: true,
    },
    {
      id: 'preview-sub-order-003',
      order_id: 'preview-order-003',
      sub_order_number: 'SUB-PREVIEW-003',
      asin: 'B0BVT92KQP',
      product_name: 'LED Desk Lamp with USB Port',
      product_image: '',
      store_name: 'DE-Preview-Store',
      brand_name: 'Lumina',
      category: 'Office',
      variant_info: '黑色欧规版',
      keyword: 'desk lamp',
      customer_name: '宁波朗行科技',
      task_notes: '预览数据：完整闭环样例',
      country: '德国',
      order_type: '视频',
      review_level: '极高等',
      review_type: '视频',
      sales_person: 'Aiden',
      staff_name: 'Aiden',
      buyer_name: 'Mia',
      buyer_id: 'preview-buyer-003',
      buyer_chat_id: 'WA-77129',
      amazon_order_id: '305-6629134-5102287',
      amazon_order_placed_at: now.subtract(3, 'day').toISOString(),
      product_price: 54.2,
      actual_paid: 55.89,
      refund_amount: 58.0,
      refund_method: '银行转账',
      refund_date: now.subtract(1, 'day').format('YYYY-MM-DD'),
      refund_sequence: '评后返',
      buyer_paypal_email: '',
      paypal_fee_usd: 0,
      buyer_assigned_at: now.subtract(4, 'day').toISOString(),
      review_submitted_at: now.subtract(1, 'day').toISOString(),
      fb_link: '',
      fb_image_url: '',
      review_link: 'https://example.com/review/preview-003',
      review_screenshot_url: 'https://placehold.co/320x180/e2e8f0/64748b?text=Review+Preview',
      status: '已完成',
      refund_status: '已返款',
      notes: '预览交互：已完成 + 已返款',
      created_at: now.subtract(6, 'day').toISOString(),
      _mock_principal_loss: true,
      status_change_log: [
        {
          from_status: '待分配',
          to_status: '已分配',
          reason: '优先分配高等级买手',
          changed_at: now.subtract(5, 'day').toISOString(),
        },
        {
          from_status: '已分配',
          to_status: '已下单',
          reason: '订单号已回传',
          changed_at: now.subtract(3, 'day').add(4, 'hour').toISOString(),
        },
        {
          from_status: '已下单',
          to_status: '已完成',
          reason: '评论凭证已上传',
          changed_at: now.subtract(1, 'day').add(3, 'hour').toISOString(),
        },
      ],
      _edit_change_log: [
        {
          at: now.subtract(5, 'day').toISOString(),
          staff_name: 'Aiden',
          edits: [
            { field: 'buyer_name', from: '空', to: 'Mia' },
            { field: 'buyer_chat_id', from: '空', to: 'WA-77129' },
          ],
        },
        {
          at: now.subtract(3, 'day').add(4, 'hour').toISOString(),
          staff_name: 'Mia',
          edits: [
            { field: 'amazon_order_id', from: '空', to: '305-6629134-5102287' },
          ],
        },
        {
          at: now.subtract(1, 'day').add(2, 'hour').toISOString(),
          staff_name: 'Mia',
          edits: [
            { field: 'review_screenshot_url', from: '空', to: '已上传凭证' },
          ],
        },
      ],
      _is_preview_mock: true,
    },
    {
      id: 'preview-sub-order-004',
      order_id: 'preview-order-004',
      sub_order_number: 'SUB-PREVIEW-004',
      asin: 'B0DROP9K11',
      product_name: 'Travel Makeup Mirror',
      product_image: '',
      store_name: 'US-Preview-Store-2',
      brand_name: 'GlowKit',
      category: 'Beauty',
      variant_info: '白色补光版',
      keyword: 'makeup mirror',
      customer_name: '广州芊羽美妆',
      task_notes: '预览数据：掉评异常样例',
      country: '美国',
      order_type: '图片',
      review_level: '高等',
      review_type: '图片',
      sales_person: 'Nora',
      staff_name: 'Nora',
      buyer_name: 'Olivia',
      buyer_id: 'preview-buyer-004',
      buyer_chat_id: 'LINE-44902',
      amazon_order_id: '407-1122334-8899001',
      amazon_order_placed_at: now.subtract(7, 'day').toISOString(),
      product_price: 31.5,
      actual_paid: 32.1,
      refund_amount: 33.8,
      refund_method: 'PayPal',
      refund_date: now.subtract(3, 'day').format('YYYY-MM-DD'),
      refund_sequence: '评后返',
      buyer_paypal_email: 'olivia-preview@example.com',
      paypal_fee_usd: 1.7,
      buyer_assigned_at: now.subtract(8, 'day').toISOString(),
      review_submitted_at: now.subtract(4, 'day').toISOString(),
      fb_link: '',
      fb_image_url: '',
      review_link: '',
      review_screenshot_url: '',
      status: '已掉评',
      refund_status: '已返款',
      notes: '预览交互：掉评异常处理样例',
      created_at: now.subtract(8, 'day').toISOString(),
      status_change_log: [
        {
          from_status: '待分配',
          to_status: '已分配',
          reason: '首次匹配买手',
          changed_at: now.subtract(7, 'day').add(1, 'hour').toISOString(),
        },
        {
          from_status: '已分配',
          to_status: '已掉评',
          reason: '评论掉落，转异常处理',
          changed_at: now.subtract(2, 'day').toISOString(),
        },
      ],
      _edit_change_log: [
        {
          at: now.subtract(7, 'day').add(1, 'hour').toISOString(),
          staff_name: 'Nora',
          edits: [
            { field: 'buyer_name', from: '空', to: 'Olivia' },
            { field: 'buyer_chat_id', from: '空', to: 'LINE-44902' },
          ],
        },
        {
          at: now.subtract(6, 'day').add(3, 'hour').toISOString(),
          staff_name: 'Olivia',
          edits: [
            { field: 'amazon_order_id', from: '空', to: '407-1122334-8899001' },
          ],
        },
        {
          at: now.subtract(2, 'day').toISOString(),
          staff_name: 'Nora',
          edits: [
            { field: 'buyer_name', from: 'Olivia', to: '空' },
          ],
        },
      ],
      _is_preview_mock: true,
    },
  ] as any[]
}
const { currentUser, loadFromStorage } = useCurrentUser()

const loading = ref(false)
const allData = ref<SubOrder[]>([])
const searchText = ref('')
const filterSales = ref<string | undefined>()
const filterProgress = ref<string | undefined>()
const filterRefundStatus = ref<string | undefined>()
const filterType = ref<string | undefined>()
const dateRange = ref<[Dayjs, Dayjs] | null>(null)

const editOpen = ref(false)
const editTask = ref<any | null>(null)
const buyerList = ref<any[]>([])
const buyerMonthlyCountMap = ref<Record<string, number>>({})
const buyerAsinMap = ref<Record<string, string[]>>({})
const replaceProductOpen = ref(false)
const replaceProductSaving = ref(false)
const replaceProductForm = ref<any>({
  asin: '',
  product_name: '',
  store_name: '',
  brand_name: '',
  category: '',
  variant_info: '',
  product_price: undefined,
})

const imgOpen = ref(false)
const imgUrl = ref('')
const opsDetailOpen = ref(false)
const opsDetailTarget = ref<SubOrder | null>(null)

const pagination = ref({
  current: 1, pageSize: 50, showSizeChanger: true,
  pageSizeOptions: ['30', '50', '100'],
  showTotal: (t: number) => `共 ${t} 条`,
})

const columns = [
  { title: '子订单ID', key: 'sub_no', width: 150 },
  { title: '业务员 / 买手 / 聊单号', key: 'assignment', width: 180 },
  { title: '国家', key: 'country', width: 80, align: 'center' as const },
  { title: '产品名称 / ASIN', key: 'product', width: 240 },
  { title: '类型 / 等级', key: 'type_level', width: 120, align: 'center' as const },
  { title: '订单号 / 上传时间', key: 'order_upload', width: 170 },
  { title: '售价 / 实付 / 实返', key: 'price_refund', width: 170 },
  { title: '返款状态 / 时间 / 方式', key: 'refund_info', width: 160 },
  { title: '订单进度', key: 'progress', width: 110 },
  { title: '订单状态', key: 'order_status', width: 110 },
  { title: '订单备注', key: 'notes', width: 160 },
  { title: '操作', key: 'action', width: 110, fixed: 'right' as const, align: 'center' as const },
]

function normalizeReviewType(value: string) {
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
  if (raw === '待退款' || raw === '待返款' || raw === '未返款') return '未返款'
  if (raw === '退款中' || raw === '返款中') return '返款中'
  if (raw === '已退款' || raw === '已返款') return '已返款'
  if (raw === '退款失败' || raw === '返款失败') return '返款失败'
  if (raw === '无需退款' || raw === '无需返款') return '无需返款'
  if (raw === 'On Hold') return 'On Hold'
  if (raw === '失误多返') return '失误多返'
  return raw
}

function getDisplayReviewType(record: Pick<SubOrder, 'review_type' | 'order_type'>) {
  return normalizeReviewType(record.review_type || record.order_type || '')
}

function showPrincipalLossHint(record: any) {
  return getRefundStatus(record) === '已返款' && Boolean(record._mock_principal_loss)
}

function getWorkflowProgressLabel(task: any) {
  return computeProgress(task)
}

function getWorkflowProgressBadgeClass(task: any) {
  const progress = getWorkflowProgressLabel(task)
  if (progress === '已完成') return 'order-status-badge blue'
  if (progress === '待留评') return 'order-status-badge orange'
  if (progress === '待下单') return 'order-status-badge purple'
  if (progress === '待匹配') return 'order-status-badge gray'
  return 'order-status-badge red'
}

function computeProgress(r: SubOrder): string {
  if (r.status === '已掉评') return '已掉评'
  if (PROBLEM_STATUSES.includes(r.status)) return '无法完成'
  if (!r.staff_name && !r.buyer_name) return '待匹配'
  if (!r.buyer_name) return '待匹配'
  if (!r.amazon_order_id) return '待下单'
  if (!r.review_link && !r.review_screenshot_url && !['已留评', '已完成'].includes(r.status)) return '待留评'
  if (r.status === '已完成' || !!r.review_screenshot_url || !!r.review_link) return '已完成'
  return '待留评'
}

const salesOptions = computed(() => [...new Set(allData.value.map(r => r.sales_person).filter(Boolean))].sort())
const typeOptions = computed(() => [...new Set(allData.value.map(r => getDisplayReviewType(r)).filter(Boolean))].sort((a, b) => REVIEW_TYPE_OPTIONS.indexOf(a) - REVIEW_TYPE_OPTIONS.indexOf(b)))

const filteredData = computed(() => {
  let d = allData.value
  const q = searchText.value.trim().toLowerCase()
  if (q) d = d.filter(r =>
    r.asin?.toLowerCase().includes(q) ||
    r.product_name?.toLowerCase().includes(q) ||
    r.sub_order_number?.toLowerCase().includes(q) ||
    r.buyer_name?.toLowerCase().includes(q) ||
    r.buyer_chat_id?.toLowerCase().includes(q) ||
    r.amazon_order_id?.toLowerCase().includes(q)
  )
  if (filterSales.value) d = d.filter(r => r.sales_person === filterSales.value)
  if (filterProgress.value) d = d.filter(r => computeProgress(r) === filterProgress.value)
  if (filterRefundStatus.value) d = d.filter(r => getRefundStatus(r) === filterRefundStatus.value)
  if (filterType.value) d = d.filter(r => getDisplayReviewType(r) === filterType.value)
  if (dateRange.value) {
    const [s, e] = dateRange.value
    d = d.filter(r => {
      const dt = dayjs(r.created_at)
      return dt.isAfter(s.startOf('day')) && dt.isBefore(e.endOf('day'))
    })
  }
  return d
})

const totalOrders = computed(() => allData.value.length)
const todayCount = computed(() => allData.value.filter(r => dayjs(r.created_at).isAfter(dayjs().startOf('day'))).length)
const paidCount = computed(() => allData.value.filter(r => getRefundStatus(r) === '已返款').length)
const unpaidCount = computed(() => allData.value.filter(r => ['未返款', '返款中'].includes(getRefundStatus(r))).length)
const problemCount = computed(() => allData.value.filter(r => ['无法完成', '已掉评'].includes(computeProgress(r))).length)

function fmt(n: number | string) { return (Number(n) || 0).toFixed(2) }
function fmtDate(d: string) { return d ? dayjs(d).format('MM-DD HH:mm') : '-' }

function applyListPreviewMock(row: any, index: number) {
  const mock = LIST_PREVIEW_MOCKS[index % LIST_PREVIEW_MOCKS.length]
  return {
    ...row,
    sales_person: row.sales_person || mock.sales_person,
    buyer_name: row.buyer_name || mock.buyer_name,
    buyer_chat_id: row.buyer_chat_id || mock.buyer_chat_id,
    country: row.country || mock.country,
    product_name: row.product_name || mock.product_name,
    asin: row.asin || mock.asin,
    review_type: row.review_type || mock.review_type,
    review_level: row.review_level || mock.review_level,
    amazon_order_id: row.amazon_order_id || mock.amazon_order_id,
    amazon_order_placed_at: row.amazon_order_placed_at || mock.amazon_order_placed_at,
    product_price: Number(row.product_price || 0) > 0 ? row.product_price : mock.product_price,
    actual_paid: Number(row.actual_paid || 0) > 0 ? row.actual_paid : mock.actual_paid,
    refund_amount: Number(row.refund_amount || 0) > 0 ? row.refund_amount : mock.refund_amount,
    refund_method: row.refund_method || mock.refund_method,
    refund_date: row.refund_date || mock.refund_date,
    refund_status: row.refund_status || mock.refund_status,
    notes: row.notes || mock.notes,
  }
}

function getProgressColor(s: string) {
  const m: Record<string, string> = {
    '待匹配': 'default',
    '待下单': 'processing',
    '待留评': 'orange',
    '已完成': 'green',
    '已掉评': 'volcano',
    '无法完成': 'red',
  }
  return m[s] || 'default'
}

function getRefundStatus(r: SubOrder) {
  const normalized = normalizeRefundStatus(r.refund_status || '')
  if (normalized) return normalized
  if (Number(r.refund_amount) > 0) return '已返款'
  return '未返款'
}

function getRefundStatusColor(s: string) {
  const map: Record<string, string> = {
    '未返款': 'default',
    '返款中': 'processing',
    '已返款': 'green',
    'On Hold': 'gold',
    '返款失败': 'red',
    '无需返款': 'cyan',
    '失误多返': 'magenta',
  }
  return map[s] || 'default'
}

function getOrderStatus(r: SubOrder) {
  if (r.status === '不下单') return '不下单'
  if (r.status === '已取消') return '取消'
  if (r.status === '已退款') return '退款'
  if (r.status === '无此订单') return '无此订单'
  return '正常'
}

function getOrderStatusColor(s: string) {
  const map: Record<string, string> = {
    '正常': 'green',
    '不下单': 'orange',
    '取消': 'red',
    '退款': 'volcano',
    '无此订单': 'default',
  }
  return map[s] || 'default'
}

function getTypeColor(t: string) {
  const m: Record<string, string> = { '文字': 'cyan', '图片': 'blue', '视频': 'geekblue', '免评': 'green', 'Feedback': 'gold' }
  return m[normalizeReviewType(t)] || 'default'
}

function getRefundColor(m: string) {
  const map: Record<string, string> = { 'PayPal': 'blue', '礼品卡': 'orange', '银行转账': 'green', '微信': 'green', '支付宝': 'cyan', 'Zelle': 'geekblue' }
  return map[m] || 'default'
}

function openImg(url: string) { imgUrl.value = url; imgOpen.value = true }

function openOpsDetail(record: SubOrder | null) {
  opsDetailTarget.value = record
  opsDetailOpen.value = true
}

function refundStatusLabel(status: string) {
  const map: Record<string, string> = {
    '无需退款': '无需返款',
    '待退款': '待返款',
    '退款中': '返款中',
    '已退款': '已返款',
    '退款失败': '返款失败',
    '未返款': '未返款',
    '返款中': '返款中',
    '已返款': '已返款',
    'On Hold': 'On Hold',
    '返款失败': '返款失败',
    '失误多返': '失误多返',
  }
  return map[status] || status || ''
}

function refundRequestTypeLabel(req: any) {
  if (!req?.request_type || req.request_type === 'initial') return '首笔'
  if (req.request_type === 'supplement') return '追加'
  if (req.request_type === 'correction') return '更正'
  return String(req.request_type)
}

function inferActualPaidUsd(req: any) {
  if (!req) return 0
  const total = Number(req.refund_amount_usd || 0)
  const fee = Number(req.paypal_fee_usd || 0)
  const stored = Number(req.actual_paid_usd || 0)
  if (stored > 0) return stored
  return Math.max(0, Number((total - fee).toFixed(2)))
}

function processedRefundsForDisplay(task: any) {
  const raw = (task._refund_requests_list || []).filter((r: any) => r.status === '已处理')
  if (raw.length) {
    return raw.slice().sort((a: any, b: any) =>
      new Date(a.created_at || a.updated_at).getTime() - new Date(b.created_at || b.updated_at).getTime())
  }
  if (['已退款', '已返款'].includes(task.refund_status || '') && Number(task.refund_amount) > 0) {
    return [{
      id: 'synthetic-from-sub-order',
      status: '已处理',
      refund_method: task.refund_method || 'PayPal',
      refund_amount_usd: Number(task.refund_amount || 0),
      actual_paid_usd: Number(task.actual_paid || 0),
      paypal_fee_usd: Number(task.paypal_fee_usd || 0),
      request_type: 'initial',
      created_at: task.created_at,
      updated_at: task.created_at,
    }]
  }
  return []
}

function aggregateProcessedRefunds(task: any) {
  const rows = processedRefundsForDisplay(task)
  let paypalTotal = 0
  let giftFace = 0
  for (const row of rows) {
    if (row.refund_method === 'PayPal') paypalTotal += Number(row.refund_amount_usd || 0)
    else if (row.refund_method === '礼品卡') giftFace += Number(row.gift_card_face_value_usd || row.refund_amount_usd || 0)
  }
  return { any: rows.length > 0, paypalTotal, giftFace }
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

function isRefundStepReadonly(task: any) {
  if (task._refund_supplement_mode || task._refund_correction_mode) return false
  if (task._refund_request_pending) return false
  return ['已退款', '已返款'].includes(task.refund_status || '') || task._refund_request_latest_processed?.status === '已处理'
}

function refundPanelTitle(task: any) {
  if (task._refund_supplement_mode) return '追加返款申请'
  if (task._refund_correction_mode) return '更正返款申请'
  if (isRefundStepReadonly(task)) return '财务返款申请'
  if (task._refund_request_pending) return '返款申请（待审核）'
  return '返款申请'
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
  task._need_finance_screenshot = /\[需财务返款截图\]|\[需财务水单\]/.test(rawNotes)
  task._refund_apply_notes = rawNotes.replace(/\s*\[(需财务返款截图|需财务水单)\]\s*$/, '').trim()
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
  if (task._refund_request_pending) hydrateRefundFormFromRequest(task, task._refund_request_pending)
  else {
    task._sel_refund_sequence = task.refund_sequence || '预付'
    task._sel_refund_method = task.refund_method || '礼品卡'
    task._refund_amount_usd = Number(task.actual_paid || task.product_price || 0)
    task._refund_fee_usd = Number(task.paypal_fee_usd || 0)
    task._refund_final_amount_usd = Number(task.refund_amount || task.product_price || 0)
    task._buyer_paypal_email = task.buyer_paypal_email || ''
    syncRefundComputed(task)
  }
}

function refundSubmitButtonText(task: any) {
  if (isNoRefundSelection(task)) return '保存无需返款'
  if (task._refund_supplement_mode) return '提交追加返款申请'
  if (task._refund_correction_mode) return '提交更正返款申请'
  if (task._refund_request_pending && !task._refund_supplement_mode && !task._refund_correction_mode) return '更新返款申请'
  return '提交返款申请'
}

function isNoRefundSelection(task: any) {
  return (task._sel_refund_sequence || task.refund_sequence || '') === '无需返款'
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
  if (isNoRefundSelection(task)) {
    task._need_finance_screenshot = false
    return
  }
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

function getBuyerBlockReason(task: any, buyerId: string): string {
  if (!buyerId) return ''
  const monthlyCount = buyerMonthlyCountMap.value[buyerId] || 0
  if (monthlyCount >= 2) return `本月已接单 ${monthlyCount}/2`
  const boughtAsins = buyerAsinMap.value[buyerId] || []
  if (task.asin && boughtAsins.includes(task.asin)) return '已购过此ASIN'
  return ''
}

function initializeEditTask(raw: SubOrder) {
  const buyer = buyerList.value.find(b => b.id === raw.buyer_id)
  return {
    ...raw,
    _editing_buyer: !raw.buyer_id,
    _sel_buyer_id: raw.buyer_id || undefined,
    _buyer_validation: null,
    _validating_buyer: false,
    _saving_buyer: false,
    _buyer_country: buyer?.country || '',
    _buyer_level: buyer?.level || '',
    _sel_refund_method: raw.refund_method || '礼品卡',
    _sel_refund_sequence: raw.refund_sequence || '预付',
    _buyer_paypal_email: raw.buyer_paypal_email || buyer?.paypal_email || '',
    _refund_amount_usd: Number(raw.actual_paid || raw.product_price || 0),
    _refund_fee_usd: Number(raw.paypal_fee_usd || 0),
    _refund_final_amount_usd: Number(raw.refund_amount || raw.product_price || 0),
    _need_finance_screenshot: false,
    _refund_apply_notes: '',
    _refund_requests_list: [],
    _refund_request_pending: null,
    _refund_request_latest_processed: null,
    _refund_request: null,
    _refund_supplement_mode: false,
    _refund_correction_mode: false,
    _refund_correction_target_id: null,
    _submitting_refund: false,
    _extra_refund_amount: undefined,
    _extra_refund_method: '同首笔',
    _extra_refund_reason: '产品涨价',
    _input_amazon_order_id: raw.amazon_order_id || '',
    _saving_amazon: false,
    _proof_type: raw.fb_link || raw.fb_image_url ? 'Feedback' : 'Review',
    _proof_comment_link: raw.fb_link || raw.review_link || '',
    _input_screenshot_url: raw.fb_image_url || raw.review_screenshot_url || '',
    _saving_screenshot: false,
    _edit_order_notes: raw.notes || '',
  }
}

async function openEdit(r: SubOrder) {
  editTask.value = initializeEditTask(r)
  editOpen.value = true
  try {
    const { data } = await supabase
      .from('refund_requests')
      .select('*')
      .eq('sub_order_id', r.id)
      .order('created_at', { ascending: false })
    const list = data || []
    editTask.value._refund_requests_list = list
    editTask.value._refund_request_pending = list.find((item: any) => item.status === '待处理') || null
    editTask.value._refund_request_latest_processed = list.find((item: any) => item.status === '已处理') || null
    editTask.value._refund_request = editTask.value._refund_request_pending || editTask.value._refund_request_latest_processed || null
    if (editTask.value._refund_request_pending) hydrateRefundFormFromRequest(editTask.value, editTask.value._refund_request_pending)
    else if (editTask.value._refund_request_latest_processed) hydrateRefundFormFromRequest(editTask.value, editTask.value._refund_request_latest_processed)
    else syncRefundComputed(editTask.value)
  } catch {
    syncRefundComputed(editTask.value)
  }
}

async function onBuyerSelect(task: any, buyerId: string) {
  if (!buyerId) {
    task._buyer_validation = null
    return
  }
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
    }
    const buyer = buyerList.value.find(b => b.id === buyerId)
    task._buyer_country = buyer?.country || ''
    task._buyer_level = buyer?.level || ''
    task._buyer_validation = { blocked: false, monthlyCount }
  } catch {
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
      buyer_assigned_at: new Date().toISOString(),
      status: task.status === '待分配' ? '已分配' : task.status,
    }
    const { error } = await supabase.from('sub_orders').update(payload).eq('id', task.id)
    if (error) throw error
    Object.assign(task, payload)
    updateOrderRow(task.id, payload)
    task._editing_buyer = false
    task._buyer_validation = null
    task._buyer_country = buyer?.country || ''
    task._buyer_level = buyer?.level || ''
    buyerMonthlyCountMap.value[task._sel_buyer_id] = (buyerMonthlyCountMap.value[task._sel_buyer_id] || 0) + 1
    if (!buyerAsinMap.value[task._sel_buyer_id]) buyerAsinMap.value[task._sel_buyer_id] = []
    if (task.asin && !buyerAsinMap.value[task._sel_buyer_id].includes(task.asin)) buyerAsinMap.value[task._sel_buyer_id].push(task.asin)
    message.success('买手已分配')
  } catch (e: any) {
    message.error('分配失败：' + e.message)
  } finally {
    task._saving_buyer = false
  }
}

function updateOrderRow(id: string, payload: Record<string, any>) {
  const idx = allData.value.findIndex(item => item.id === id)
  if (idx >= 0) allData.value[idx] = { ...allData.value[idx], ...payload }
}

async function submitRefundRequest(task: any) {
  const noRefund = isNoRefundSelection(task)
  const finalAmount = getRefundFinalAmount(task)
  if (!noRefund && !finalAmount) return
  const selectedMethod = task._sel_refund_method || task.refund_method
  const buyer = buyerList.value.find(b => b.id === task.buyer_id)
  const paypalEmail = selectedMethod === 'PayPal' ? (task._buyer_paypal_email || buyer?.paypal_email || '') : ''
  if (selectedMethod === 'PayPal' && !noRefund && !paypalEmail) {
    message.error('请填写买手 PayPal 邮箱')
    return
  }
  const pending = task._refund_request_pending
  const isUpdatePending = !!(pending && !task._refund_supplement_mode && !task._refund_correction_mode)
  const actualPaid = Number(task._refund_amount_usd || 0)
  const feeUsd = selectedMethod === 'PayPal' ? Number(task._refund_fee_usd || 0) : 0
  const notes = `${task._refund_apply_notes || ''}${task._need_finance_screenshot ? ' [需财务水单]' : ''}`.trim()
  const staffName = currentUser.value?.name || task.sales_person || '订单列表'
  const supplementReason = task._refund_supplement_mode
    ? (task._extra_refund_reason || '追加返款')
    : task._refund_correction_mode
      ? '邮箱或金额更正'
      : ''
  const wasSupplement = task._refund_supplement_mode
  const wasCorrection = task._refund_correction_mode
  task._submitting_refund = true
  try {
    if (noRefund) {
      const configPayload = {
        refund_method: '',
        refund_sequence: '无需返款',
        refund_status: '无需退款',
        refund_amount: 0,
        actual_paid: 0,
      }
      const { error } = await supabase.from('sub_orders').update(configPayload).eq('id', task.id)
      if (error) throw error
      Object.assign(task, configPayload)
      updateOrderRow(task.id, configPayload)
      if (pending?.id) {
        await supabase.from('refund_requests').update({ status: '已取消', notes: [pending.notes, '业务改为无需返款，原待审核返款申请已取消'].filter(Boolean).join('；') }).eq('id', pending.id)
      }
      task._refund_request_pending = null
      task._refund_apply_notes = ''
      task._need_finance_screenshot = false
      message.success('已保存为无需返款')
      return
    }

    const configPayload = {
      refund_method: selectedMethod,
      refund_sequence: task._sel_refund_sequence || task.refund_sequence,
    }
    const { error: configError } = await supabase.from('sub_orders').update(configPayload).eq('id', task.id)
    if (configError) throw configError
    Object.assign(task, configPayload)
    updateOrderRow(task.id, configPayload)

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
      staff_name: staffName,
      notes,
    }

    if (isUpdatePending) {
      const existingLog = Array.isArray(pending.staff_change_log) ? pending.staff_change_log : []
      const edits: { field: string; from: any; to: any }[] = []
      if ((pending.buyer_paypal_email || '') !== paypalEmail) edits.push({ field: 'buyer_paypal_email', from: pending.buyer_paypal_email || '', to: paypalEmail })
      if (Number(pending.actual_paid_usd ?? 0) !== actualPaid) edits.push({ field: 'actual_paid_usd', from: Number(pending.actual_paid_usd ?? 0), to: actualPaid })
      if (Number(pending.paypal_fee_usd ?? 0) !== feeUsd) edits.push({ field: 'paypal_fee_usd', from: Number(pending.paypal_fee_usd ?? 0), to: feeUsd })
      if (Number(pending.refund_amount_usd ?? 0) !== finalAmount) edits.push({ field: 'refund_amount_usd', from: Number(pending.refund_amount_usd ?? 0), to: finalAmount })
      if ((pending.refund_method || '') !== selectedMethod) edits.push({ field: 'refund_method', from: pending.refund_method || '', to: selectedMethod })
      if ((pending.refund_sequence || '') !== (task._sel_refund_sequence || task.refund_sequence || '')) edits.push({ field: 'refund_sequence', from: pending.refund_sequence || '', to: task._sel_refund_sequence || task.refund_sequence || '' })
      const updatePayload: Record<string, any> = { ...commonFields }
      if (edits.length) updatePayload.staff_change_log = [...existingLog, { at: new Date().toISOString(), staff_name: staffName, edits }]
      const { data, error } = await supabase.from('refund_requests').update(updatePayload).eq('id', pending.id).select().maybeSingle()
      if (error) throw error
      task._refund_request_pending = data
      task._refund_request = data
      const idx = (task._refund_requests_list || []).findIndex((r: any) => r.id === pending.id)
      if (idx >= 0) task._refund_requests_list[idx] = data
      message.success('返款申请已更新')
    } else {
      const requestType = wasSupplement ? 'supplement' : wasCorrection ? 'correction' : 'initial'
      const { data, error } = await supabase.from('refund_requests').insert({
        ...commonFields,
        sub_order_id: task.id,
        order_id: task.order_id,
        sub_order_number: task.sub_order_number,
        buyer_name: task.buyer_name || '',
        status: '待处理',
        request_type: requestType,
        supersedes_request_id: wasCorrection ? task._refund_correction_target_id : null,
        supplement_reason: wasSupplement || wasCorrection ? supplementReason : '',
      }).select().maybeSingle()
      if (error) throw error
      task._refund_request_pending = data
      task._refund_request = data
      task._refund_requests_list = [data, ...task._refund_requests_list]
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

async function saveAmazonOrder(task: any) {
  if (!task._input_amazon_order_id) return
  task._saving_amazon = true
  try {
    const payload = {
      amazon_order_id: task._input_amazon_order_id,
      status: '已下单',
    }
    const { error } = await supabase.from('sub_orders').update(payload).eq('id', task.id)
    if (error) throw error
    Object.assign(task, payload)
    updateOrderRow(task.id, payload)
    message.success('Amazon订单号已保存')
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    task._saving_amazon = false
  }
}

async function saveScreenshot(task: any) {
  if (!task._input_screenshot_url) return
  task._saving_screenshot = true
  try {
    const isFeedback = task._proof_type === 'Feedback'
    const payload = isFeedback
      ? {
          fb_link: task._proof_comment_link || '',
          fb_image_url: task._input_screenshot_url,
          status: '已留评',
        }
      : {
          review_link: task._proof_comment_link || '',
          review_screenshot_url: task._input_screenshot_url,
          review_submitted_at: new Date().toISOString(),
          status: '已留评',
        }
    const { error } = await supabase.from('sub_orders').update(payload).eq('id', task.id)
    if (error) throw error
    Object.assign(task, payload)
    updateOrderRow(task.id, payload)
    message.success(isFeedback ? 'Feedback凭证已提交' : '留评凭证已提交')
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    task._saving_screenshot = false
  }
}

async function saveOrderNotes(task: any) {
  const nextValue = String(task._edit_order_notes || '')
  if (nextValue === String(task.notes || '')) return
  try {
    const { error } = await supabase.from('sub_orders').update({ notes: nextValue }).eq('id', task.id)
    if (error) throw error
    task.notes = nextValue
    updateOrderRow(task.id, { notes: nextValue })
    message.success('备注已保存')
  } catch (e: any) {
    message.error('备注保存失败：' + e.message)
  }
}

function openReplaceProduct() {
  if (!editTask.value) return
  replaceProductForm.value = {
    asin: editTask.value.asin || '',
    product_name: editTask.value.product_name || '',
    store_name: editTask.value.store_name || '',
    brand_name: editTask.value.brand_name || '',
    category: editTask.value.category || '',
    variant_info: editTask.value.variant_info || '',
    product_price: editTask.value.product_price != null ? Number(editTask.value.product_price) : undefined,
  }
  replaceProductOpen.value = true
}

async function saveReplaceProduct() {
  if (!editTask.value) return
  replaceProductSaving.value = true
  try {
    const payload = {
      asin: String(replaceProductForm.value.asin || '').trim(),
      product_name: String(replaceProductForm.value.product_name || '').trim(),
      store_name: String(replaceProductForm.value.store_name || '').trim(),
      brand_name: String(replaceProductForm.value.brand_name || '').trim(),
      category: String(replaceProductForm.value.category || '').trim(),
      variant_info: String(replaceProductForm.value.variant_info || '').trim(),
      product_price: Number(replaceProductForm.value.product_price || 0),
    }
    const { error } = await supabase.from('sub_orders').update(payload).eq('id', editTask.value.id)
    if (error) throw error
    Object.assign(editTask.value, payload)
    updateOrderRow(editTask.value.id, payload)
    if (!editTask.value._refund_request_pending) {
      editTask.value._refund_amount_usd = payload.product_price
      editTask.value._refund_final_amount_usd = payload.product_price
      syncRefundComputed(editTask.value)
    }
    replaceProductOpen.value = false
    message.success('产品信息已更新')
  } catch (e: any) {
    message.error('更换产品失败：' + e.message)
  } finally {
    replaceProductSaving.value = false
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
    monthOrders?.forEach((o: any) => { countMap[o.buyer_id] = (countMap[o.buyer_id] || 0) + 1 })
    buyerMonthlyCountMap.value = countMap
    const asinMap: Record<string, string[]> = {}
    const { data: asinOrders } = await supabase
      .from('sub_orders')
      .select('buyer_id, asin')
      .in('buyer_id', ids)
      .not('status', 'in', '("已取消")')
      .not('asin', 'eq', '')
    asinOrders?.forEach((o: any) => {
      if (!asinMap[o.buyer_id]) asinMap[o.buyer_id] = []
      if (o.asin && !asinMap[o.buyer_id].includes(o.asin)) asinMap[o.buyer_id].push(o.asin)
    })
    data.forEach((b: any) => {
      if (b.purchased_asins) {
        const existing = asinMap[b.id] || []
        const fromProfile = String(b.purchased_asins).split(/[,，\s]+/).map((s: string) => s.trim()).filter(Boolean)
        asinMap[b.id] = [...new Set([...existing, ...fromProfile])]
      }
    })
    buyerAsinMap.value = asinMap
  }
}

async function loadData() {
  loading.value = true
  try {
    const { data } = await supabase
      .from('sub_orders')
      .select(`
        id, order_id, sub_order_number, asin, product_name, product_image, store_name, brand_name, category, variant_info, keyword, customer_name, task_notes, country,
        order_type, review_level, review_type, sales_person, staff_name,
        buyer_name, buyer_id, amazon_order_id, amazon_order_placed_at, buyer_paypal_email, refund_sequence, paypal_fee_usd, buyer_assigned_at, review_submitted_at,
        product_price, actual_paid, refund_amount, refund_method, refund_date,
        fb_link, fb_image_url, review_link, review_screenshot_url,
        status, refund_status, notes, created_at
      `)
      .order('created_at', { ascending: false })
    const rows = (data || []) as any[]
    const buyerIds = [...new Set(rows.filter(r => r.buyer_id).map(r => r.buyer_id))]
    let chatMap: Record<string, string> = {}
    if (buyerIds.length > 0) {
      const { data: buyers } = await supabase.from('buyers').select('id, chat_order_id').in('id', buyerIds)
      if (buyers) buyers.forEach((b: any) => { if (b.chat_order_id) chatMap[b.id] = b.chat_order_id })
    }
    let principalLossInjected = 0
    const mappedRows = rows.map((r, index) => {
      const shouldInject = principalLossInjected < 3 && index < 12 && (Number(r.refund_amount) > 0 || normalizeRefundStatus(r.refund_status) === '已返款')
      if (shouldInject) principalLossInjected += 1
      return applyListPreviewMock({
        ...r,
        review_type: normalizeReviewType(r.review_type || r.order_type),
        refund_status: normalizeRefundStatus(r.refund_status),
        buyer_chat_id: (r.buyer_id && chatMap[r.buyer_id]) ? chatMap[r.buyer_id] : '',
        _mock_principal_loss: shouldInject,
      }, index)
    })
    const previewRows = buildSyntheticListPreviewRows()
    allData.value = [...previewRows, ...mappedRows]
  } catch (e: any) {
    allData.value = buildSyntheticListPreviewRows() as any
    message.warning('真实订单数据加载失败，已展示预览数据')
  } finally {
    loading.value = false
  }
}

function applyFilters() { pagination.value.current = 1 }

function resetFilters() {
  searchText.value = ''; filterSales.value = undefined
  filterProgress.value = undefined; filterRefundStatus.value = undefined; filterType.value = undefined
  dateRange.value = null; pagination.value.current = 1
}

function onTableChange(pag: any) {
  pagination.value.current = pag.current
  pagination.value.pageSize = pag.pageSize
}

function exportCSV() {
  const headers = ['子订单号', 'ASIN', '产品名称', '亚马逊单号', '业务员', '买手', '聊单号', '售价', '实付', '返款金额', '返款方式', 'FB链接', '评论链接', '进度', '返款状态', '订单状态', '备注', '创建时间']
  const rows = filteredData.value.map(r => [
    r.sub_order_number, r.asin, r.product_name, r.amazon_order_id,
    r.sales_person, r.buyer_name, r.buyer_chat_id,
    r.product_price, r.actual_paid, r.refund_amount, r.refund_method,
    r.fb_link, r.review_link, computeProgress(r), getRefundStatus(r), getOrderStatus(r), r.notes, fmtDate(r.created_at),
  ])
  const csv = '\uFEFF' + [headers, ...rows].map(row =>
    row.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')
  ).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `订单列表_${dayjs().format('YYYYMMDD_HHmm')}.csv`
  a.click()
}

onMounted(async () => {
  loadFromStorage()
  await Promise.all([loadBuyers(), loadData()])
})
</script>

<style scoped lang="less">
.page-content {
  padding: 24px 28px;
  background: #f5f6fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  gap: 16px;
  flex-wrap: wrap;
}

.page-title {
  font-size: 22px;
  font-weight: 800;
  color: #0f172a;
  margin: 0 0 2px;
}

.page-desc {
  font-size: 13px;
  color: #94a3b8;
  margin: 0;
}

.header-stats {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.stat-pill {
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 20px;
  padding: 4px 14px;
  font-size: 13px;
  color: #64748b;
  white-space: nowrap;
  strong { color: #0f172a; margin-left: 2px; }
  &.today { border-color: #bfdbfe; background: #eff6ff; strong { color: #2563eb; } }
  &.green { border-color: #bbf7d0; background: #f0fdf4; strong { color: #16a34a; } }
  &.orange { border-color: #fed7aa; background: #fff7ed; strong { color: #ea580c; } }
  &.red { border-color: #fecaca; background: #fef2f2; strong { color: #dc2626; } }
}

.main-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px 20px;
  box-shadow: 0 1px 6px rgba(0,0,0,.05);
  border: 1px solid #e2e8f0;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 14px;
}

.result-count {
  margin-left: auto;
  font-size: 12px;
  color: #94a3b8;
}

/* 产品列 */
.product-cell {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.product-thumb {
  width: 36px;
  height: 36px;
  border-radius: 4px;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid #f1f5f9;
}

.product-info {
  min-width: 0;
}

.product-name {
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 170px;
  line-height: 1.4;
}

.product-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 3px;
  margin-top: 2px;
}

.asin-link {
  font-size: 11px;
  color: #3b82f6;
  text-decoration: none;
  font-family: 'SF Mono', monospace;
  &:hover { text-decoration: underline; }
}

.country-text {
  font-size: 11px;
  color: #94a3b8;
}

.sep-dot {
  color: #cbd5e1;
  font-size: 10px;
}

.type-tag {
  font-size: 10px;
  line-height: 1.4;
  padding: 0 4px;
}
.type-cell {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 24px;
}

.type-level-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-height: 24px;
}

/* 分配列 */
.assignment-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.assign-row {
  display: flex;
  align-items: center;
  gap: 5px;
}

.assign-label {
  font-size: 10px;
  color: #94a3b8;
  width: 32px;
  flex-shrink: 0;
}

.buyer-name {
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
}

.chat-id {
  font-size: 11px;
  color: #0891b2;
  font-family: 'SF Mono', monospace;
  background: #ecfeff;
  border: 1px solid #a5f3fc;
  border-radius: 4px;
  padding: 0 4px;
}

.mini-tag {
  font-size: 10px;
  line-height: 1.4;
  padding: 0 4px;
}

/* 订单号列 */
.ids-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.id-row {
  display: flex;
  align-items: center;
  gap: 5px;
}

.id-label {
  font-size: 10px;
  color: #94a3b8;
  width: 30px;
  flex-shrink: 0;
}

.id-val {
  font-size: 12px;
  color: #334155;
  font-weight: 600;
  &.mono { font-family: 'SF Mono', monospace; }
  &.small { font-size: 11px; font-weight: 400; color: #64748b; }
}

/* 价格列 */
.price-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.price-row {
  display: flex;
  align-items: center;
  gap: 5px;
}

.price-label {
  font-size: 10px;
  color: #94a3b8;
  width: 22px;
  flex-shrink: 0;
}

.price-val {
  font-size: 12px;
  font-weight: 600;
  color: #1e293b;
  font-family: 'SF Mono', monospace;
  &.actual { color: #64748b; font-weight: 400; }
  &.refund { color: #dc2626; }
}

.method-tag {
  font-size: 10px;
  line-height: 1.4;
  padding: 0 4px;
}

/* 媒体列 */
.media-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.media-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.media-label {
  font-size: 10px;
  color: #94a3b8;
  width: 20px;
  flex-shrink: 0;
}

.media-link {
  font-size: 11px;
  color: #3b82f6;
  text-decoration: none;
  &:hover { text-decoration: underline; }
}

.media-img-btn {
  font-size: 11px;
  color: #0891b2;
  cursor: pointer;
  &:hover { text-decoration: underline; }
}

/* 进度/返款状态列 */
.refund-info-wrap {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  min-width: 92px;
}
.status-tag {
  font-size: 11px;
  display: inline-block;
}
.refund-method-inline {
  font-size: 11px;
  color: #64748b;
}
.principal-loss-hint {
  font-size: 10px;
  line-height: 1;
  color: #dc2626;
  background: rgba(220, 38, 38, 0.08);
  border: 1px solid rgba(220, 38, 38, 0.18);
  border-radius: 999px;
  padding: 2px 6px;
}

.notes-inline {
  font-size: 11px;
  color: #64748b;
  max-width: 140px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.date-text {
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
}

.empty-text {
  font-size: 11px;
  color: #cbd5e1;
}

.edit-btn {
  font-size: 12px;
  padding: 0 4px;
}

/* 编辑弹窗 */
.edit-modal {
  padding: 4px 0;
}

.edit-info {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px 14px;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #64748b;
  strong { color: #1e293b; }
}

.lbl {
  margin-right: 4px;
}

.form-row-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 16px;
}

.refund-entry-box {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #f8fafc;
}

.refund-entry-text {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.5;
}

.workflow-edit-modal {
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-height: 72vh;
  overflow: auto;
  padding-right: 4px;
}

.workflow-edit-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 14px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  background: linear-gradient(135deg, #f8fbff 0%, #f8fafc 100%);
}

.task-meta {
  flex: 1;
  min-width: 0;
}

.meta-row1,
.meta-row2,
.meta-row3 {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.meta-row2,
.meta-row3 {
  margin-top: 8px;
}

.sub-no-text {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
}

.keyword-badge {
  padding: 2px 10px;
  border-radius: 999px;
  background: #eef2ff;
  color: #4338ca;
  font-size: 12px;
  font-weight: 600;
}

.product-name-sm {
  color: #334155;
  font-size: 13px;
}

.mono-sm {
  font-family: 'SF Mono', monospace;
  font-size: 12px;
  color: #1d4ed8;
}

.sep {
  color: #64748b;
  font-size: 12px;
}

.text-gray {
  color: #94a3b8;
}

.price-sm {
  font-weight: 700;
  color: #ea580c;
  font-size: 13px;
}

.meta-focus-item {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid #e2e8f0;
  border-radius: 999px;
}

.meta-focus-item-wide {
  max-width: 100%;
}

.meta-focus-label {
  font-size: 12px;
  color: #64748b;
}

.meta-focus-value {
  font-size: 12px;
  font-weight: 600;
  color: #0f172a;
}

.workflow-edit-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
}

.assign-name {
  font-size: 12px;
  color: #475569;
}

.order-status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 84px;
  height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
}

.order-status-badge.blue { background: #dbeafe; color: #1d4ed8; }
.order-status-badge.orange { background: #ffedd5; color: #c2410c; }
.order-status-badge.purple { background: #ede9fe; color: #7c3aed; }
.order-status-badge.gray { background: #e2e8f0; color: #475569; }
.order-status-badge.red { background: #fee2e2; color: #dc2626; }

.product-info-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 10px 14px;
}

.pi-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 14px 4px 0;
  margin-right: 14px;
}

.pi-label {
  font-size: 12px;
  color: #64748b;
}

.pi-val {
  font-size: 12px;
  color: #0f172a;
  font-weight: 600;
}

.pi-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
}

.workflow-steps-modern {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.wf-panel {
  border: 1px solid #e2e8f0;
  border-radius: 14px;
  overflow: hidden;
  background: #fff;
}

.wf-panel-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.wf-panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.wf-panel-index {
  color: #2563eb;
}

.wf-panel-status {
  border-radius: 999px;
  padding: 2px 10px;
  font-size: 11px;
  font-weight: 600;
}

.wf-panel-status.done {
  color: #15803d;
  background: #dcfce7;
}

.wf-panel-status.todo {
  color: #92400e;
  background: #fef3c7;
}

.re-edit {
  font-size: 12px;
  color: #2563eb;
  cursor: pointer;
}

.wf-panel-body {
  padding: 14px;
}

.buyer-brief-row {
  font-size: 14px;
  font-weight: 600;
  color: #0f172a;
}

.buyer-brief-desc {
  margin-top: 6px;
  font-size: 12px;
  color: #64748b;
}

.buyer-assign-area,
.refund-amount-fields {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.step-input-row,
.refund-action-row,
.refund-setup-row,
.refund-row,
.extra-refund-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.refund-row label,
.refund-setup-label,
.extra-method-label {
  min-width: 96px;
  font-size: 12px;
  color: #64748b;
}

.buyer-validation-hint {
  margin-top: 10px;
  font-size: 12px;
}

.buyer-validation-hint.checking { color: #2563eb; }
.buyer-validation-hint.blocked { color: #dc2626; }
.buyer-validation-hint.passed { color: #15803d; }

.buyer-opt-row {
  display: flex;
  align-items: center;
  gap: 4px;
}

.buyer-opt-meta {
  color: #94a3b8;
  font-size: 12px;
}

.buyer-opt-blocked {
  color: #dc2626;
  font-size: 12px;
}

.refund-compact-card {
  padding: 12px;
  border: 1px solid #dbeafe;
  border-radius: 12px;
  background: #f8fbff;
}

.refund-compact-title {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}

.refund-compact-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 6px;
  font-size: 12px;
  color: #64748b;
}

.refund-processed-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 10px;
}

.refund-processed-card {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
}

.rpc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
}

.rpc-head-main,
.rpc-body {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.rpc-type,
.rpc-method,
.rpc-status {
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
}

.rpc-type {
  background: rgba(37, 99, 235, 0.12);
  color: #2563eb;
}

.rpc-method {
  background: #f3f4f6;
  color: #374151;
}

.rpc-status {
  background: rgba(5, 150, 105, 0.12);
  color: #059669;
}

.rpc-time {
  font-size: 11px;
  color: #9ca3af;
}

.rpc-body {
  padding: 10px 12px;
  font-size: 12px;
  color: #6b7280;
}

.refund-audit-trail {
  margin-bottom: 10px;
  padding: 12px;
  border-radius: 12px;
  background: #fff7ed;
  border: 1px solid #fed7aa;
}

.rat-title {
  font-size: 12px;
  font-weight: 700;
  color: #9a3412;
}

.rat-entry + .rat-entry {
  margin-top: 10px;
}

.rat-meta {
  margin-top: 8px;
  font-size: 12px;
  color: #7c2d12;
}

.rat-ul {
  margin: 6px 0 0 18px;
  color: #7c2d12;
  font-size: 12px;
}

.refund-no-need-tip {
  padding: 10px 12px;
  border-radius: 10px;
  background: #ecfeff;
  border: 1px solid #a5f3fc;
  color: #0f766e;
  font-size: 12px;
}

.refund-amount-box {
  padding: 12px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
}

.refund-amount-title {
  font-size: 12px;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 8px;
}

.refund-product-ref {
  margin-bottom: 10px;
  color: #64748b;
  font-size: 12px;
}

.refund-product-ref-val {
  margin-left: 6px;
  color: #ea580c;
  font-weight: 700;
}

.raf-line {
  display: flex;
  align-items: center;
  gap: 10px;
}

.raf-label {
  width: 96px;
  font-size: 12px;
  color: #64748b;
}

.raf-hint {
  font-size: 11px;
  color: #9ca3af;
  flex: 1 1 140px;
}

.raf-total-val {
  font-size: 14px;
  font-weight: 700;
  color: #dc2626;
}

@media (max-width: 900px) {
  .workflow-edit-header {
    flex-direction: column;
  }

  .workflow-edit-side {
    align-items: flex-start;
  }

  .form-row-2 {
    grid-template-columns: 1fr;
  }
}
</style>
