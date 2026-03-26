<template>
  <div class="page-content">
    <h1 class="page-title">接单管理</h1>

    <div class="card-panel">
      <div class="toolbar">
        <a-input-search
          v-model:value="searchText"
          placeholder="搜索订单号/ASIN/店铺/产品名"
          style="width: 300px"
          @search="loadOrders"
          allow-clear
        />
        <a-select v-model:value="filterStatus" style="width: 140px" @change="loadOrders" allow-clear placeholder="状态筛选">
          <a-select-option value="">全部状态</a-select-option>
          <a-select-option v-for="s in statuses" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterCountry" style="width: 120px" @change="loadOrders" allow-clear placeholder="国家筛选">
          <a-select-option value="">全部国家</a-select-option>
          <a-select-option v-for="c in countries" :key="c" :value="c">{{ c }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterOrderType" style="width: 130px" @change="loadOrders" allow-clear placeholder="下单类型">
          <a-select-option value="">全部类型</a-select-option>
          <a-select-option v-for="t in orderTypeOptions" :key="t" :value="t">{{ t }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterBilling" style="width: 130px" @change="loadOrders" allow-clear placeholder="账单状态">
          <a-select-option value="">全部账单</a-select-option>
          <a-select-option value="billing_incomplete">入账未完成</a-select-option>
          <a-select-option value="debt">有欠款</a-select-option>
        </a-select>
        <a-button type="primary" @click="loadOrders"><ReloadOutlined /> 刷新</a-button>

        <template v-if="selectedRowKeys.length > 0">
          <a-divider type="vertical" />
          <span class="batch-hint">已选 {{ selectedRowKeys.length }} 条</span>
          <a-dropdown>
            <a-button type="default">批量改状态 <DownOutlined /></a-button>
            <template #overlay>
              <a-menu @click="(info: any) => batchUpdateStatus(info.key as string)">
                <a-menu-item v-for="s in statuses" :key="s">{{ s }}</a-menu-item>
              </a-menu>
            </template>
          </a-dropdown>
          <a-popconfirm title="确定批量删除选中的订单吗?" @confirm="batchDelete">
            <a-button danger>批量删除</a-button>
          </a-popconfirm>
        </template>
      </div>

      <a-table
        :columns="columns"
        :data-source="orders"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        size="middle"
        :row-selection="rowSelection"
        @change="handleTableChange"
        :scroll="{ x: 1900 }"
        :row-class-name="getRowClass"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'order_number'">
            <a class="order-number-link" @click="viewDetail(record)">{{ record.order_number }}</a>
          </template>

          <template v-if="column.key === 'product'">
            <div class="product-cell">
              <div class="product-img-wrap">
                <img
                  v-if="record.product_image"
                  :src="record.product_image"
                  class="product-img"
                  referrerpolicy="no-referrer"
                  @error="onImgError($event)"
                />
                <div v-else class="product-img-placeholder"><PictureOutlined /></div>
              </div>
              <div class="product-info">
                <div class="product-name" v-if="record.product_name">{{ record.product_name }}</div>
                <div class="asin">{{ record.asin }}</div>
                <div class="store">{{ record.store_name }}</div>
              </div>
            </div>
          </template>

          <template v-if="column.key === 'order_types'">
            <div class="order-types-cell">
              <template v-if="hasMultipleTypes(record)">
                <div v-for="t in record.order_types" :key="t" class="type-qty-row">
                  <a-tag :color="getOrderTypeColor(t)" size="small">{{ t }}</a-tag>
                  <span class="type-qty">&times;{{ getTypeQty(record, t) }}</span>
                </div>
              </template>
              <template v-else>
                <a-tag :color="getOrderTypeColor(record.order_type || (record.order_types && record.order_types[0]))" size="small">
                  {{ record.order_type || (record.order_types && record.order_types[0]) || '-' }}
                </a-tag>
                <span class="type-qty">&times;{{ record.order_quantity }}</span>
              </template>
            </div>
          </template>

          <template v-if="column.key === 'feedback'">
            <div class="feedback-cell">
              <div class="feedback-row">
                <span class="feedback-label">订单：</span>
                <a-tag :color="record.order_feedback_status === '已反馈' ? 'green' : 'default'" size="small">
                  {{ record.order_feedback_status || '未反馈' }}
                </a-tag>
              </div>
              <div class="feedback-row">
                <span class="feedback-label">评论：</span>
                <a-tag :color="record.review_feedback_status === '已反馈' ? 'green' : 'default'" size="small">
                  {{ record.review_feedback_status || '未反馈' }}
                </a-tag>
              </div>
            </div>
          </template>

          <template v-if="column.key === 'billing'">
            <div class="billing-cell">
              <div class="billing-row">
                <span class="billing-label">入账：</span>
                <a-tag
                  :color="record.billing_status === '未完成' ? 'red' : 'green'"
                  size="small"
                >{{ record.billing_status || '已完成' }}</a-tag>
              </div>
              <div v-if="record.debt_status === 'owed' && Number(record.debt_amount || 0) > 0" class="debt-row">
                <span class="billing-label">欠款：</span>
                <a-tag color="orange" size="small">&yen;{{ Number(record.debt_amount).toFixed(0) }}</a-tag>
              </div>
              <div v-else-if="record.debt_status === 'surplus' && Number(record.debt_amount || 0) > 0" class="debt-row">
                <span class="billing-label">溢款：</span>
                <a-tag color="blue" size="small">退&yen;{{ Number(record.debt_amount).toFixed(0) }}</a-tag>
              </div>
              <div v-else-if="record.debt_status === 'cleared'" class="billing-row">
                <span class="billing-label">已结清</span>
                <a-tag color="default" size="small">清</a-tag>
              </div>
            </div>
          </template>

          <template v-if="column.key === 'status'">
            <a-tag :color="getStatusColor(record.status)">{{ record.status }}</a-tag>
          </template>

          <template v-if="column.key === 'total_amount'">
            <span class="amount">&yen;{{ Number(record.total_amount).toFixed(2) }}</span>
          </template>

          <template v-if="column.key === 'country'">
            <a-tag>{{ record.country }}</a-tag>
          </template>

          <template v-if="column.key === 'sales_person'">
            <div v-if="record.sales_person || record.customer_name" class="sales-cell">
              <div v-if="record.sales_person" class="sales-name">
                <UserOutlined style="font-size:11px;margin-right:3px;color:#6b7280" />{{ record.sales_person }}
              </div>
              <div v-if="record.customer_name" class="customer-name">{{ record.customer_name }}</div>
            </div>
            <span v-else class="text-empty">-</span>
          </template>

          <template v-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="viewDetail(record)">详情</a-button>
              <a-button type="link" size="small" @click="openFeedbackModal(record)">反馈</a-button>
              <a-button type="link" size="small" @click="openDebtModal(record)">账单</a-button>
              <a-popconfirm title="确定删除这条订单吗?" @confirm="deleteOrder(record.id)">
                <a-button type="link" size="small" danger>删除</a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <!-- Detail Drawer -->
    <a-drawer
      v-model:open="drawerOpen"
      :title="`接单详情 - ${currentOrder?.order_number}`"
      width="820"
      placement="right"
    >
      <template v-if="currentOrder">
        <div class="detail-header">
          <div class="detail-product">
            <div class="detail-img-wrap">
              <img
                v-if="currentOrder.product_image"
                :src="currentOrder.product_image"
                class="detail-img"
                referrerpolicy="no-referrer"
                @error="onImgError($event)"
              />
              <div v-else class="detail-img-placeholder"><PictureOutlined /></div>
            </div>
            <div>
              <div v-if="currentOrder.product_name" class="detail-product-name">{{ currentOrder.product_name }}</div>
              <div class="detail-asin">{{ currentOrder.asin }}</div>
              <div class="detail-store">{{ currentOrder.store_name }}</div>
              <div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap">
                <a-tag :color="getStatusColor(currentOrder.status)">{{ currentOrder.status }}</a-tag>
                <a-tag :color="currentOrder.billing_status === '未完成' ? 'red' : 'green'">入账{{ currentOrder.billing_status || '已完成' }}</a-tag>
                <a-tag v-if="hasRealDebt(currentOrder)" color="orange">欠款 &yen;{{ Number(currentOrder.debt_amount).toFixed(0) }}</a-tag>
                <a-tag v-else-if="hasRealSurplus(currentOrder)" color="blue">溢款退&yen;{{ Number(currentOrder.debt_amount).toFixed(0) }}</a-tag>
                <a-tag v-else-if="currentOrder.debt_status === 'cleared'" color="default">已结清</a-tag>
              </div>
            </div>
          </div>
        </div>

        <a-divider style="margin: 16px 0" />

        <a-descriptions :column="2" bordered size="small">
          <a-descriptions-item label="订单编号" :span="2">
            <span class="detail-order-num">{{ currentOrder.order_number }}</span>
          </a-descriptions-item>
          <a-descriptions-item label="产品名称" :span="2" v-if="currentOrder.product_name">
            {{ currentOrder.product_name }}
          </a-descriptions-item>
          <a-descriptions-item label="ASIN">{{ currentOrder.asin }}</a-descriptions-item>
          <a-descriptions-item label="店铺">{{ currentOrder.store_name }}</a-descriptions-item>
          <a-descriptions-item label="品牌">{{ currentOrder.brand_name || '-' }}</a-descriptions-item>
          <a-descriptions-item label="国家">{{ currentOrder.country }}</a-descriptions-item>
          <a-descriptions-item label="测评类型">{{ currentOrder.review_type }}</a-descriptions-item>
          <a-descriptions-item label="下单类型">
            <div class="order-types-cell">
              <template v-if="hasMultipleTypes(currentOrder)">
                <div v-for="t in currentOrder.order_types" :key="t" class="type-qty-row">
                  <a-tag :color="getOrderTypeColor(t)" size="small">{{ t }}</a-tag>
                  <span class="type-qty">&times;{{ getTypeQty(currentOrder, t) }}</span>
                </div>
              </template>
              <template v-else>
                <a-tag :color="getOrderTypeColor(currentOrder.order_type)" size="small">{{ currentOrder.order_type || '-' }}</a-tag>
                <span class="type-qty">&times;{{ currentOrder.order_quantity }}</span>
              </template>
            </div>
          </a-descriptions-item>
          <a-descriptions-item label="总下单数量">{{ currentOrder.order_quantity }}</a-descriptions-item>
          <a-descriptions-item label="状态">
            <a-tag :color="getStatusColor(currentOrder.status)">{{ currentOrder.status }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="对接商务">{{ currentOrder.sales_person || '-' }}</a-descriptions-item>
          <a-descriptions-item label="客户名称">{{ currentOrder.customer_name || '-' }}</a-descriptions-item>
          <a-descriptions-item label="创建时间" :span="2">{{ dayjs(currentOrder.created_at).format('YYYY-MM-DD HH:mm') }}</a-descriptions-item>
          <a-descriptions-item label="备注" :span="2">{{ currentOrder.notes || '-' }}</a-descriptions-item>
        </a-descriptions>

        <a-divider style="margin: 20px 0 16px" />
        <div class="detail-section-title">金额明细</div>
        <div class="amount-breakdown">
          <div class="amount-section-label">产品回款</div>
          <div class="amount-row">
            <span class="amount-label">产品单价（USD）</span>
            <span class="amount-usd">$ {{ Number(currentOrder.product_price || 0).toFixed(2) }}</span>
          </div>
          <div class="amount-row amount-row-sub">
            <span class="amount-label amount-label-sm">&times; 汇率 {{ Number(currentOrder.exchange_rate || 1).toFixed(2) }} &times; 数量 {{ currentOrder.order_quantity }} 单</span>
            <span class="amount-cny-sm">小计 &yen;{{ (Number(currentOrder.product_price || 0) * Number(currentOrder.exchange_rate || 1) * Number(currentOrder.order_quantity || 1)).toFixed(2) }}</span>
          </div>

          <div class="amount-divider"></div>
          <div class="amount-section-label">佣金收费</div>
          <template v-if="hasMultipleTypes(currentOrder)">
            <div v-for="t in currentOrder.order_types" :key="t" class="amount-row">
              <span class="amount-label">
                <a-tag :color="getOrderTypeColor(t)" size="small" style="margin-right:4px">{{ t }}</a-tag>
                &times; {{ getTypeQty(currentOrder, t) }} 单 &times; &yen;{{ getTypeUnitPrice(currentOrder, t).toFixed(2) }}
              </span>
              <span class="amount-commission">&yen;{{ (getTypeQty(currentOrder, t) * getTypeUnitPrice(currentOrder, t)).toFixed(2) }}</span>
            </div>
          </template>
          <template v-else>
            <div class="amount-row">
              <span class="amount-label">{{ currentOrder.order_type }} &times; {{ currentOrder.order_quantity }} 单 &times; &yen;{{ getCommissionUnitPrice(currentOrder).toFixed(2) }}</span>
              <span class="amount-commission">&yen;{{ (getCommissionUnitPrice(currentOrder) * Number(currentOrder.order_quantity || 1)).toFixed(2) }}</span>
            </div>
          </template>

          <div class="amount-divider amount-divider-bold"></div>
          <div class="amount-row amount-row-total">
            <div style="display:flex;align-items:center;gap:8px">
              <span class="amount-label-total">总金额</span>
              <span class="amount-desc">产品回款 + 佣金</span>
            </div>
            <span class="amount-total">&yen;{{ Number(currentOrder.total_amount || 0).toFixed(2) }}</span>
          </div>
        </div>

        <!-- Feedback Section -->
        <a-divider style="margin: 20px 0 16px" />
        <div class="detail-section-title" style="display:flex;align-items:center;justify-content:space-between">
          <span>反馈状态</span>
          <a-button size="small" type="link" @click="openFeedbackModal(currentOrder)">编辑反馈</a-button>
        </div>
        <div class="feedback-panel">
          <div class="feedback-info-row">
            <span class="feedback-key">订单反馈：</span>
            <a-tag :color="currentOrder.order_feedback_status === '已反馈' ? 'green' : 'default'">
              {{ currentOrder.order_feedback_status || '未反馈' }}
            </a-tag>
            <span v-if="currentOrder.order_feedback_date" class="feedback-date">
              {{ currentOrder.order_feedback_date }}
            </span>
          </div>
          <div class="feedback-info-row">
            <span class="feedback-key">评论反馈：</span>
            <a-tag :color="currentOrder.review_feedback_status === '已反馈' ? 'green' : 'default'">
              {{ currentOrder.review_feedback_status || '未反馈' }}
            </a-tag>
            <span v-if="currentOrder.review_feedback_date" class="feedback-date">
              {{ currentOrder.review_feedback_date }}
            </span>
          </div>
          <div v-if="currentOrder.feedback_notes" class="feedback-info-row">
            <span class="feedback-key">备注：</span>
            <span class="feedback-notes-text">{{ currentOrder.feedback_notes }}</span>
          </div>
        </div>

        <!-- Billing Section -->
        <a-divider style="margin: 20px 0 16px" />
        <div class="detail-section-title" style="display:flex;align-items:center;justify-content:space-between">
          <span>任务账单</span>
          <a-button size="small" type="link" @click="openDebtModal(currentOrder)">编辑账单</a-button>
        </div>
        <div class="billing-panel" :class="{ 'billing-warn': currentOrder.billing_status === '未完成', 'billing-debt': hasRealDebt(currentOrder) }">
          <div class="billing-info-row">
            <span class="billing-key">基础入账：</span>
            <a-tag :color="currentOrder.billing_status === '未完成' ? 'red' : 'green'">{{ currentOrder.billing_status || '已完成' }}</a-tag>
          </div>
          <div class="billing-info-row">
            <span class="billing-key">账款状态：</span>
            <a-tag v-if="hasRealDebt(currentOrder)" color="orange">客户欠款</a-tag>
            <a-tag v-else-if="hasRealSurplus(currentOrder)" color="blue">我方溢收</a-tag>
            <a-tag v-else-if="currentOrder.debt_status === 'cleared'" color="default">已结清</a-tag>
            <a-tag v-else color="green">无异常</a-tag>
          </div>
          <template v-if="hasRealDebt(currentOrder) || hasRealSurplus(currentOrder)">
            <div class="billing-info-row">
              <span class="billing-key">{{ hasRealSurplus(currentOrder) ? '溢收金额：' : '欠款金额：' }}</span>
              <span :class="hasRealSurplus(currentOrder) ? 'surplus-amount-text' : 'debt-amount-text'">&yen;{{ Number(currentOrder.debt_amount || 0).toFixed(2) }}</span>
            </div>
            <div class="billing-info-row billing-notes-row" v-if="currentOrder.debt_notes">
              <span class="billing-key">{{ hasRealSurplus(currentOrder) ? '溢款明细：' : '欠款明细：' }}</span>
              <span class="debt-notes-text">{{ currentOrder.debt_notes }}</span>
            </div>
            <div class="billing-info-row" v-if="currentOrder.debt_marked_by">
              <span class="billing-key">标记商务：</span>
              <span class="billing-val">{{ currentOrder.debt_marked_by }}
                <span v-if="currentOrder.debt_marked_at" style="color:#9ca3af;font-size:11px;margin-left:4px">{{ dayjs(currentOrder.debt_marked_at).format('MM-DD HH:mm') }}</span>
              </span>
            </div>
          </template>
          <div v-if="currentOrder.billing_status !== '未完成' && !hasRealDebt(currentOrder) && !hasRealSurplus(currentOrder)" class="billing-all-clear">
            账单正常，无异常
          </div>
        </div>

        <!-- Batch Payment Section -->
        <a-divider style="margin: 20px 0 16px" />
        <div class="detail-section-title" style="display:flex;align-items:center;justify-content:space-between">
          <span>收款记录</span>
          <a-button size="small" type="primary" @click="openPaymentModal">录入收款</a-button>
        </div>
        <div v-if="batchPayments.length === 0" class="payment-empty">暂无收款记录</div>
        <div v-else class="payment-list">
          <div v-for="p in batchPayments" :key="p.id" class="payment-card">
            <div class="payment-main">
              <div class="payment-amount">&yen;{{ Number(p.amount_cny).toFixed(2) }}</div>
              <div class="payment-meta">
                <span>{{ p.payment_date }}</span>
                <span v-if="p.payment_method" class="payment-method">{{ p.payment_method }}</span>
                <span v-if="p.payer_name" class="payment-payer">{{ p.payer_name }}</span>
              </div>
              <div v-if="p.notes" class="payment-notes">{{ p.notes }}</div>
            </div>
            <div class="payment-actions">
              <a-tag color="cyan" size="small">已同步流水</a-tag>
              <a-popconfirm title="确认删除此收款记录？" @confirm="deletePayment(p)">
                <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
              </a-popconfirm>
            </div>
          </div>
          <div class="payment-summary">
            <span>收款合计：</span>
            <span class="payment-summary-val">&yen;{{ paymentTotal.toFixed(2) }}</span>
          </div>
        </div>
      </template>
    </a-drawer>

    <!-- Debt Modal -->
    <a-modal
      v-model:open="debtModalOpen"
      title="编辑任务账单"
      :confirm-loading="debtSaving"
      @ok="saveDebt"
      ok-text="保存"
      cancel-text="取消"
      width="500px"
    >
      <div class="debt-form">
        <div class="debt-field">
          <label class="debt-label">基础入账状态</label>
          <a-radio-group v-model:value="debtForm.billing_status">
            <a-radio-button value="已完成">已完成</a-radio-button>
            <a-radio-button value="未完成">未完成</a-radio-button>
          </a-radio-group>
        </div>
        <div class="debt-field">
          <label class="debt-label">欠款/溢款状态</label>
          <a-radio-group v-model:value="debtForm.debt_status">
            <a-radio-button value="none">无异常</a-radio-button>
            <a-radio-button value="owed">客户欠款</a-radio-button>
            <a-radio-button value="surplus">我方溢收</a-radio-button>
            <a-radio-button value="cleared">已结清</a-radio-button>
          </a-radio-group>
          <div v-if="debtForm.debt_status === 'surplus'" class="debt-status-hint debt-hint-surplus">
            溢款：我方多收了客户的钱，需退还给客户
          </div>
          <div v-if="debtForm.debt_status === 'owed'" class="debt-status-hint debt-hint-owed">
            欠款：客户还需补付款项给我方
          </div>
        </div>
        <template v-if="debtForm.debt_status === 'owed' || debtForm.debt_status === 'surplus'">
          <div class="debt-field">
            <label class="debt-label">{{ debtForm.debt_status === 'surplus' ? '溢收金额（元）' : '欠款金额（元）' }}</label>
            <a-input-number v-model:value="debtForm.debt_amount" style="width:100%" :min="0" :precision="2" :placeholder="debtForm.debt_status === 'surplus' ? '多收的金额' : '欠款金额'" />
          </div>
          <div class="debt-field">
            <label class="debt-label">{{ debtForm.debt_status === 'surplus' ? '溢款明细备注' : '欠款明细备注' }}</label>
            <a-textarea v-model:value="debtForm.debt_notes" :rows="3" :placeholder="debtForm.debt_status === 'surplus' ? '如：预收超出实际 ¥150，需退还' : '如：税费 ¥120 + 本金差价 ¥200'" />
          </div>
          <div class="debt-field">
            <label class="debt-label">标记商务</label>
            <a-input v-model:value="debtForm.debt_marked_by" placeholder="输入商务姓名" />
          </div>
        </template>
      </div>
    </a-modal>

    <!-- Feedback Modal -->
    <a-modal
      v-model:open="feedbackModalOpen"
      title="编辑反馈状态"
      :confirm-loading="feedbackSaving"
      @ok="saveFeedback"
      ok-text="保存"
      cancel-text="取消"
      width="520px"
    >
      <div class="feedback-form">
        <div class="feedback-field">
          <label class="feedback-form-label">订单反馈</label>
          <a-radio-group v-model:value="feedbackForm.order_feedback_status">
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
          <a-radio-group v-model:value="feedbackForm.review_feedback_status">
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
        <div class="feedback-field">
          <label class="feedback-form-label">反馈备注</label>
          <a-textarea v-model:value="feedbackForm.feedback_notes" :rows="2" placeholder="如：客户已确认全部订单到货" />
        </div>
      </div>
    </a-modal>

    <!-- Payment Modal -->
    <a-modal
      v-model:open="paymentModalOpen"
      title="录入收款"
      :confirm-loading="paymentSaving"
      @ok="savePayment"
      ok-text="保存并同步流水"
      cancel-text="取消"
      width="520px"
    >
      <div class="payment-form">
        <div class="payment-form-info">
          <span>订单：{{ currentOrder?.order_number }}</span>
          <span>客户：{{ currentOrder?.customer_name || '-' }}</span>
        </div>
        <div class="payment-form-field">
          <label class="payment-form-label">收款金额（元）<span class="required">*</span></label>
          <a-input-number v-model:value="paymentForm.amount_cny" style="width:100%" :min="0.01" :precision="2" placeholder="输入收款金额" />
        </div>
        <div class="payment-form-field">
          <label class="payment-form-label">收款日期 <span class="required">*</span></label>
          <a-date-picker
            v-model:value="paymentForm.payment_date_picker"
            style="width:100%"
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
          />
        </div>
        <div class="payment-form-field">
          <label class="payment-form-label">收款方式</label>
          <a-select v-model:value="paymentForm.payment_method" style="width:100%">
            <a-select-option value="银行转账">银行转账</a-select-option>
            <a-select-option value="微信">微信</a-select-option>
            <a-select-option value="支付宝">支付宝</a-select-option>
            <a-select-option value="现金">现金</a-select-option>
            <a-select-option value="其他">其他</a-select-option>
          </a-select>
        </div>
        <div class="payment-form-field">
          <label class="payment-form-label">付款人</label>
          <a-input v-model:value="paymentForm.payer_name" placeholder="付款方名称" />
        </div>
        <div class="payment-form-field">
          <label class="payment-form-label">操作人</label>
          <a-input v-model:value="paymentForm.recorded_by" placeholder="录入人姓名" />
        </div>
        <div class="payment-form-field">
          <label class="payment-form-label">备注</label>
          <a-textarea v-model:value="paymentForm.notes" :rows="2" placeholder="收款备注（可选）" />
        </div>
        <div class="payment-form-tip">
          保存后将自动生成一条交易流水，供财务核验
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined, DownOutlined, PictureOutlined, UserOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

const loading = ref(false)
const orders = ref<any[]>([])
const searchText = ref('')
const filterStatus = ref('')
const filterCountry = ref('')
const filterOrderType = ref('')
const filterBilling = ref('')
const drawerOpen = ref(false)
const currentOrder = ref<any>(null)

const debtModalOpen = ref(false)
const debtSaving = ref(false)
const debtTargetId = ref<string | null>(null)
const debtForm = ref({
  billing_status: '已完成',
  debt_status: 'none',
  debt_amount: 0,
  debt_notes: '',
  debt_marked_by: '',
})

const feedbackModalOpen = ref(false)
const feedbackSaving = ref(false)
const feedbackTargetId = ref<string | null>(null)
const feedbackForm = ref({
  order_feedback_status: '未反馈',
  order_feedback_date_picker: null as any,
  review_feedback_status: '未反馈',
  review_feedback_date_picker: null as any,
  feedback_notes: '',
})

const paymentModalOpen = ref(false)
const paymentSaving = ref(false)
const paymentForm = ref({
  amount_cny: 0,
  payment_date_picker: null as any,
  payment_method: '银行转账',
  payer_name: '',
  recorded_by: '',
  notes: '',
})

const batchPayments = ref<any[]>([])

const paymentTotal = computed(() =>
  batchPayments.value.reduce((s, p) => s + Number(p.amount_cny || 0), 0)
)

const selectedRowKeys = ref<string[]>([])

const statuses = ['待处理', '进行中', '已完成', '已取消', '暂停']
const countries = ['美国', '德国', '英国', '加拿大']
const orderTypeOptions = ['免评', '文字评', '图片评', '视频评', 'Feedback']

const pagination = ref({ current: 1, pageSize: 20, total: 0, showSizeChanger: true })

const rowSelection = computed(() => ({
  selectedRowKeys: selectedRowKeys.value,
  onChange: (keys: string[]) => { selectedRowKeys.value = keys },
}))

const columns = [
  { title: '订单号', key: 'order_number', dataIndex: 'order_number', width: 175 },
  { title: '产品信息', key: 'product', width: 220 },
  { title: '国家', key: 'country', dataIndex: 'country', width: 75 },
  { title: '测评类型', dataIndex: 'review_type', key: 'review_type', width: 95 },
  { title: '下单类型/量', key: 'order_types', width: 150 },
  { title: '反馈状态', key: 'feedback', width: 140 },
  { title: '账单状态', key: 'billing', width: 140 },
  { title: '总金额', key: 'total_amount', width: 100 },
  { title: '状态', key: 'status', width: 85 },
  { title: '对接商务/客户', key: 'sales_person', width: 125 },
  { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 110, customRender: ({ text }: any) => text ? dayjs(text).format('MM-DD HH:mm') : '' },
  { title: '操作', key: 'action', width: 200, fixed: 'right' as const },
]

function getStatusColor(status: string) {
  const map: Record<string, string> = { '待处理': 'default', '进行中': 'blue', '已完成': 'green', '已取消': 'red', '暂停': 'orange' }
  return map[status] || 'default'
}

function getOrderTypeColor(type: string) {
  const map: Record<string, string> = { '免评': 'default', '文字评': 'blue', '图片评': 'cyan', '视频评': 'geekblue', 'Feedback': 'orange' }
  return map[type] || 'default'
}

function hasMultipleTypes(record: any): boolean {
  return record.order_types && record.order_types.length > 1
}

function getTypeQty(record: any, type: string): number {
  if (record.type_quantities && record.type_quantities[type] !== undefined) {
    return Number(record.type_quantities[type])
  }
  if (!hasMultipleTypes(record)) return Number(record.order_quantity || 0)
  const n = record.order_types?.length || 1
  return Math.round(Number(record.order_quantity || 0) / n)
}

function getTypeUnitPrice(record: any, type: string): number {
  const map: Record<string, string> = {
    '免评': 'price_no_review',
    '文字评': 'price_text',
    '图片评': 'price_image',
    '视频评': 'price_video',
    'Feedback': 'price_feedback',
  }
  const field = map[type]
  if (field && record[field] !== undefined) return Number(record[field] || 0)
  return getCommissionUnitPrice(record)
}

function getCommissionUnitPrice(order: any): number {
  const cf = Number(order.commission_fee || 0)
  if (cf > 0) return cf
  const unitPrice = Number(order.unit_price || 0)
  const productCostCny = Number(order.product_price || 0) * Number(order.exchange_rate || 1)
  const derived = unitPrice - productCostCny
  return derived > 0 ? derived : 0
}

function hasRealDebt(record: any): boolean {
  return record.debt_status === 'owed' && Number(record.debt_amount || 0) > 0
}

function hasRealSurplus(record: any): boolean {
  return record.debt_status === 'surplus' && Number(record.debt_amount || 0) > 0
}

function getRowClass(record: any): string {
  if (record.billing_status === '未完成' && hasRealDebt(record)) return 'row-billing-debt'
  if (record.billing_status === '未完成') return 'row-billing-warn'
  if (hasRealDebt(record)) return 'row-debt-warn'
  if (hasRealSurplus(record)) return 'row-surplus-warn'
  return ''
}

function onImgError(e: Event) {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
  const placeholder = img.nextElementSibling as HTMLElement
  if (placeholder) placeholder.style.display = 'flex'
}

async function loadOrders() {
  loading.value = true
  selectedRowKeys.value = []
  try {
    let query = supabase.from('erp_orders').select('*', { count: 'exact' }).order('created_at', { ascending: false })
    if (searchText.value) {
      query = query.or(`order_number.ilike.%${searchText.value}%,asin.ilike.%${searchText.value}%,store_name.ilike.%${searchText.value}%,product_name.ilike.%${searchText.value}%`)
    }
    if (filterStatus.value) query = query.eq('status', filterStatus.value)
    if (filterCountry.value) query = query.eq('country', filterCountry.value)
    if (filterOrderType.value) query = query.or(`order_type.eq.${filterOrderType.value},order_types.cs.{${filterOrderType.value}}`)
    if (filterBilling.value === 'billing_incomplete') query = query.eq('billing_status', '未完成')
    if (filterBilling.value === 'debt') query = query.eq('debt_status', 'owed')

    const from = (pagination.value.current - 1) * pagination.value.pageSize
    const to = from + pagination.value.pageSize - 1
    query = query.range(from, to)

    const { data, count, error } = await query
    if (error) throw error
    orders.value = data || []
    pagination.value.total = count || 0
  } catch (e: any) {
    message.error('加载失败：' + e.message)
  } finally {
    loading.value = false
  }
}

function handleTableChange(pag: any) {
  pagination.value.current = pag.current
  pagination.value.pageSize = pag.pageSize
  loadOrders()
}

async function viewDetail(record: any) {
  currentOrder.value = record
  drawerOpen.value = true
  await loadPayments(record.id)
}

async function loadPayments(orderId: string) {
  const { data } = await supabase
    .from('batch_payments')
    .select('*')
    .eq('batch_id', orderId)
    .order('payment_date', { ascending: false })
  batchPayments.value = data || []
}

function openDebtModal(record: any) {
  debtTargetId.value = record.id
  debtForm.value = {
    billing_status: record.billing_status || '已完成',
    debt_status: record.debt_status || 'none',
    debt_amount: record.debt_amount || 0,
    debt_notes: record.debt_notes || '',
    debt_marked_by: record.debt_marked_by || '',
  }
  debtModalOpen.value = true
}

async function saveDebt() {
  if (!debtTargetId.value) return
  debtSaving.value = true
  try {
    const hasIssue = debtForm.value.debt_status === 'owed' || debtForm.value.debt_status === 'surplus'
    const payload: any = {
      billing_status: debtForm.value.billing_status,
      debt_status: debtForm.value.debt_status,
      debt_amount: hasIssue ? debtForm.value.debt_amount : 0,
      debt_notes: hasIssue ? debtForm.value.debt_notes : null,
      debt_marked_by: hasIssue ? debtForm.value.debt_marked_by : null,
      debt_marked_at: hasIssue ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('erp_orders').update(payload).eq('id', debtTargetId.value)
    if (error) throw error

    const idx = orders.value.findIndex(o => o.id === debtTargetId.value)
    if (idx !== -1) Object.assign(orders.value[idx], payload)
    if (currentOrder.value?.id === debtTargetId.value) Object.assign(currentOrder.value, payload)

    message.success('账单已保存')
    debtModalOpen.value = false
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    debtSaving.value = false
  }
}

function openFeedbackModal(record: any) {
  feedbackTargetId.value = record.id
  feedbackForm.value = {
    order_feedback_status: record.order_feedback_status || '未反馈',
    order_feedback_date_picker: record.order_feedback_date ? dayjs(record.order_feedback_date) : null,
    review_feedback_status: record.review_feedback_status || '未反馈',
    review_feedback_date_picker: record.review_feedback_date ? dayjs(record.review_feedback_date) : null,
    feedback_notes: record.feedback_notes || '',
  }
  feedbackModalOpen.value = true
}

async function saveFeedback() {
  if (!feedbackTargetId.value) return
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

    const payload: any = {
      order_feedback_status: feedbackForm.value.order_feedback_status,
      order_feedback_date: isOrderFb
        ? (typeof feedbackForm.value.order_feedback_date_picker === 'string'
          ? feedbackForm.value.order_feedback_date_picker
          : feedbackForm.value.order_feedback_date_picker?.format('YYYY-MM-DD'))
        : null,
      review_feedback_status: feedbackForm.value.review_feedback_status,
      review_feedback_date: isReviewFb
        ? (typeof feedbackForm.value.review_feedback_date_picker === 'string'
          ? feedbackForm.value.review_feedback_date_picker
          : feedbackForm.value.review_feedback_date_picker?.format('YYYY-MM-DD'))
        : null,
      feedback_notes: feedbackForm.value.feedback_notes || null,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('erp_orders').update(payload).eq('id', feedbackTargetId.value)
    if (error) throw error

    const idx = orders.value.findIndex(o => o.id === feedbackTargetId.value)
    if (idx !== -1) Object.assign(orders.value[idx], payload)
    if (currentOrder.value?.id === feedbackTargetId.value) Object.assign(currentOrder.value, payload)

    message.success('反馈状态已保存')
    feedbackModalOpen.value = false
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    feedbackSaving.value = false
  }
}

function openPaymentModal() {
  paymentForm.value = {
    amount_cny: 0,
    payment_date_picker: dayjs(),
    payment_method: '银行转账',
    payer_name: currentOrder.value?.customer_name || '',
    recorded_by: '',
    notes: '',
  }
  paymentModalOpen.value = true
}

async function savePayment() {
  if (!currentOrder.value) return
  if (!paymentForm.value.amount_cny || paymentForm.value.amount_cny <= 0) {
    message.warning('请输入收款金额')
    return
  }
  if (!paymentForm.value.payment_date_picker) {
    message.warning('请选择收款日期')
    return
  }
  paymentSaving.value = true
  try {
    const paymentDate = typeof paymentForm.value.payment_date_picker === 'string'
      ? paymentForm.value.payment_date_picker
      : paymentForm.value.payment_date_picker?.format('YYYY-MM-DD')

    const { data: txNo } = await supabase.rpc('generate_transaction_no')
    const transactionNo = txNo || `FT-${Date.now()}`

    const { data: txData, error: txErr } = await supabase.from('financial_transactions').insert({
      transaction_no: transactionNo,
      transaction_type: '批次收款',
      direction: '收入',
      amount_cny: paymentForm.value.amount_cny,
      exchange_rate: currentOrder.value.exchange_rate || 7.25,
      customer_name: currentOrder.value.customer_name || '',
      customer_id_str: currentOrder.value.customer_id_str || '',
      order_id: currentOrder.value.id,
      order_number: currentOrder.value.order_number,
      staff_name: paymentForm.value.recorded_by,
      status: '待审批',
      notes: `批次收款 - ${paymentForm.value.payment_method}${paymentForm.value.notes ? ' | ' + paymentForm.value.notes : ''}`,
      transaction_date: paymentDate,
    }).select('id').maybeSingle()
    if (txErr) throw txErr

    const { error: pmErr } = await supabase.from('batch_payments').insert({
      batch_id: currentOrder.value.id,
      batch_number: currentOrder.value.order_number,
      transaction_id: txData?.id || null,
      amount_cny: paymentForm.value.amount_cny,
      payment_date: paymentDate,
      payment_method: paymentForm.value.payment_method,
      payer_name: paymentForm.value.payer_name,
      recorded_by: paymentForm.value.recorded_by,
      notes: paymentForm.value.notes,
    })
    if (pmErr) throw pmErr

    message.success('收款已录入，交易流水已同步')
    paymentModalOpen.value = false
    await loadPayments(currentOrder.value.id)
  } catch (e: any) {
    message.error('录入失败：' + e.message)
  } finally {
    paymentSaving.value = false
  }
}

async function deletePayment(payment: any) {
  try {
    if (payment.transaction_id) {
      await supabase.from('financial_transactions').delete().eq('id', payment.transaction_id)
    }
    await supabase.from('batch_payments').delete().eq('id', payment.id)
    message.success('已删除收款记录及对应流水')
    if (currentOrder.value) await loadPayments(currentOrder.value.id)
  } catch (e: any) {
    message.error('删除失败：' + e.message)
  }
}

async function deleteOrder(id: string) {
  const { error } = await supabase.from('erp_orders').delete().eq('id', id)
  if (error) { message.error('删除失败'); return }
  message.success('删除成功')
  loadOrders()
}

async function batchDelete() {
  if (!selectedRowKeys.value.length) return
  const { error } = await supabase.from('erp_orders').delete().in('id', selectedRowKeys.value)
  if (error) { message.error('批量删除失败'); return }
  message.success(`已删除 ${selectedRowKeys.value.length} 条订单`)
  selectedRowKeys.value = []
  loadOrders()
}

async function batchUpdateStatus(status: string) {
  if (!selectedRowKeys.value.length) return
  const { error } = await supabase.from('erp_orders').update({ status }).in('id', selectedRowKeys.value)
  if (error) { message.error('批量更新失败'); return }
  message.success(`已将 ${selectedRowKeys.value.length} 条订单状态更新为「${status}」`)
  selectedRowKeys.value = []
  loadOrders()
}

onMounted(loadOrders)
</script>

<style scoped>
.page-content { padding: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }
.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 10px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.batch-hint { font-size: 13px; color: #2563eb; font-weight: 500; }

.order-number-link {
  color: #2563eb; font-weight: 600; font-size: 12px;
  cursor: pointer; text-decoration: none;
  font-family: 'Courier New', monospace;
}
.order-number-link:hover { text-decoration: underline; }

.product-cell { display: flex; align-items: center; gap: 10px; }
.product-img-wrap { width: 42px; height: 42px; flex-shrink: 0; }
.product-img { width: 42px; height: 42px; object-fit: cover; border-radius: 6px; border: 1px solid #f0f0f0; display: block; }
.product-img-placeholder { width: 42px; height: 42px; border-radius: 6px; border: 1px dashed #d1d5db; background: #f9fafb; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 15px; }
.product-info { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.product-name { font-weight: 600; font-size: 12px; color: #111827; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 148px; }
.asin { font-weight: 600; font-size: 12px; color: #2563eb; }
.store { color: #6b7280; font-size: 11px; }

.order-types-cell { display: flex; flex-direction: column; gap: 3px; }
.type-qty-row { display: flex; align-items: center; gap: 4px; }
.type-qty { font-size: 12px; color: #374151; font-weight: 500; }

.feedback-cell { display: flex; flex-direction: column; gap: 3px; }
.feedback-row { display: flex; align-items: center; gap: 4px; }
.feedback-label { font-size: 11px; color: #9ca3af; }

.billing-cell { display: flex; flex-direction: column; gap: 3px; }
.billing-row { display: flex; align-items: center; gap: 4px; }
.debt-row { display: flex; align-items: center; gap: 4px; }
.billing-label { font-size: 11px; color: #9ca3af; }

.amount { font-weight: 600; color: #2563eb; }
.text-empty { color: #d1d5db; font-size: 13px; }

.sales-cell { display: flex; flex-direction: column; gap: 2px; }
.sales-name { font-size: 13px; font-weight: 500; color: #374151; display: flex; align-items: center; }
.customer-name { font-size: 11px; color: #9ca3af; }

:global(.row-billing-warn td) { background-color: #fff7ed !important; }
:global(.row-debt-warn td) { background-color: #fffbeb !important; }
:global(.row-billing-debt td) { background-color: #fff1f2 !important; }
:global(.row-surplus-warn td) { background-color: #eff6ff !important; }

.detail-header { display: flex; align-items: flex-start; }
.detail-product { display: flex; gap: 16px; align-items: flex-start; }
.detail-img-wrap { width: 80px; height: 80px; flex-shrink: 0; }
.detail-img { width: 80px; height: 80px; object-fit: cover; border-radius: 10px; border: 1px solid #e5e7eb; display: block; }
.detail-img-placeholder { width: 80px; height: 80px; border-radius: 10px; border: 1px dashed #d1d5db; background: #f9fafb; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 28px; }
.detail-product-name { font-size: 15px; font-weight: 600; color: #111827; margin-bottom: 2px; }
.detail-asin { font-size: 16px; font-weight: 700; color: #1e40af; }
.detail-store { font-size: 13px; color: #6b7280; margin-top: 2px; }
.detail-order-num { font-family: 'Courier New', monospace; font-weight: 700; font-size: 14px; color: #1e3a8a; }
.detail-section-title { font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 10px; }

.amount-breakdown { background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px 20px; }
.amount-row { display: flex; align-items: center; justify-content: space-between; padding: 7px 0; }
.amount-row-sub { padding: 2px 0 5px 8px; opacity: 0.75; }
.amount-row-total { padding: 10px 0 2px; }
.amount-section-label { font-size: 11px; font-weight: 600; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.8px; margin: 4px 0 2px; }
.amount-label { font-size: 13px; color: #374151; font-weight: 500; }
.amount-label-sm { font-size: 12px; color: #6b7280; font-weight: 400; }
.amount-label-total { font-size: 15px; font-weight: 700; color: #111827; }
.amount-desc { font-size: 12px; color: #9ca3af; }
.amount-usd { font-size: 15px; font-weight: 700; color: #0369a1; font-family: 'Courier New', monospace; }
.amount-cny-sm { font-size: 12px; color: #6b7280; font-family: 'Courier New', monospace; }
.amount-commission { font-size: 14px; font-weight: 600; color: #d97706; font-family: 'Courier New', monospace; }
.amount-total { font-size: 20px; font-weight: 800; color: #dc2626; font-family: 'Courier New', monospace; }
.amount-divider { height: 1px; background: #e5e7eb; margin: 4px 0; }
.amount-divider-bold { height: 2px; background: #d1d5db; margin: 6px 0; }

.feedback-panel {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 14px 18px;
  background: #f9fafb;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.feedback-info-row { display: flex; align-items: center; gap: 6px; }
.feedback-key { font-size: 13px; color: #6b7280; flex-shrink: 0; }
.feedback-date { font-size: 12px; color: #374151; margin-left: 4px; }
.feedback-notes-text { font-size: 13px; color: #374151; }

.billing-panel {
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 14px 18px;
  background: #f9fafb;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.billing-panel.billing-warn { background: #fff7ed; border-color: #fed7aa; }
.billing-panel.billing-debt { background: #fffbeb; border-color: #fde68a; }
.billing-panel.billing-warn.billing-debt { background: #fff1f2; border-color: #fecdd3; }
.billing-info-row { display: flex; align-items: flex-start; gap: 6px; }
.billing-notes-row { align-items: flex-start; }
.billing-key { font-size: 13px; color: #6b7280; flex-shrink: 0; padding-top: 1px; }
.billing-val { font-size: 13px; color: #374151; }
.debt-amount-text { font-size: 15px; font-weight: 700; color: #d97706; }
.surplus-amount-text { font-size: 15px; font-weight: 700; color: #2563eb; }
.debt-notes-text { font-size: 13px; color: #92400e; line-height: 1.6; }
.billing-all-clear { font-size: 13px; color: #16a34a; text-align: center; padding: 4px 0; }

.payment-empty {
  text-align: center;
  color: #9ca3af;
  padding: 20px;
  font-size: 13px;
  background: #f9fafb;
  border-radius: 10px;
  border: 1px dashed #e5e7eb;
}
.payment-list { display: flex; flex-direction: column; gap: 8px; }
.payment-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 12px 16px;
  transition: border-color 0.2s;
}
.payment-card:hover { border-color: #93c5fd; }
.payment-main { flex: 1; min-width: 0; }
.payment-amount { font-size: 16px; font-weight: 700; color: #16a34a; font-family: 'Courier New', monospace; }
.payment-meta {
  display: flex;
  gap: 10px;
  font-size: 12px;
  color: #6b7280;
  margin-top: 2px;
}
.payment-method { color: #2563eb; }
.payment-payer { color: #374151; }
.payment-notes { font-size: 12px; color: #9ca3af; margin-top: 2px; }
.payment-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.payment-summary {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  padding: 10px 16px;
  font-size: 13px;
  color: #6b7280;
  background: #f8fafc;
  border-radius: 8px;
  margin-top: 4px;
}
.payment-summary-val { font-size: 16px; font-weight: 700; color: #16a34a; font-family: 'Courier New', monospace; }

.debt-form { display: flex; flex-direction: column; gap: 16px; padding: 4px 0; }
.debt-field { display: flex; flex-direction: column; gap: 6px; }
.debt-label { font-size: 13px; font-weight: 500; color: #374151; }
.debt-status-hint { font-size: 12px; padding: 6px 10px; border-radius: 6px; margin-top: 2px; }
.debt-hint-surplus { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
.debt-hint-owed { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }

.feedback-form { display: flex; flex-direction: column; gap: 18px; padding: 4px 0; }
.feedback-field { display: flex; flex-direction: column; gap: 6px; }
.feedback-form-label { font-size: 13px; font-weight: 500; color: #374151; }
.feedback-date-field {
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}
.feedback-date-label { font-size: 12px; color: #6b7280; }

.payment-form { display: flex; flex-direction: column; gap: 14px; padding: 4px 0; }
.payment-form-info {
  display: flex; gap: 16px;
  font-size: 13px; color: #374151; font-weight: 500;
  padding: 10px 14px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}
.payment-form-field { display: flex; flex-direction: column; gap: 4px; }
.payment-form-label { font-size: 13px; font-weight: 500; color: #374151; }
.required { color: #ef4444; margin-left: 2px; }
.payment-form-tip {
  font-size: 12px;
  color: #2563eb;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 8px 12px;
  text-align: center;
}
</style>
