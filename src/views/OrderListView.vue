<template>
  <div class="page-content">
    <h1 class="page-title">接单管理</h1>

    <div class="card-panel">
      <div class="toolbar">
        <a-input-search
          v-model:value="searchText"
          placeholder="搜索任务号/ASIN/店铺/产品名"
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

        <a-divider type="vertical" />
        <a-popconfirm v-if="selectedRowKeys.length > 0" title="确定批量删除选中的订单吗?" @confirm="batchDelete">
          <a-button danger>批量删除（{{ selectedRowKeys.length }}）</a-button>
        </a-popconfirm>
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
            <div class="order-number-cell">
              <div v-if="record._isMultiBatch && record._isFirstInBatch" class="batch-group-header" @click.stop="showGroupDetail(record)">
                <span class="batch-group-icon"><LinkOutlined /></span>
                <span class="batch-group-name">{{ record.batch_number }}</span>
              </div>
              <div class="order-number-row">
                <div v-if="record._isMultiBatch" class="batch-side-bar" :style="{ background: record._batchColor }"></div>
                <a class="order-number-link" @click="viewDetail(record)">{{ record.order_number }}</a>
              </div>
            </div>
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
              <div class="review-type-line">
                <a-tag :color="getReviewTypeColor(record.review_type)" size="small">{{ record.review_type || '—' }}</a-tag>
                <span class="total-qty-badge">共{{ record.order_quantity || 0 }}单</span>
              </div>
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
              <div v-if="hasRealDebt(record)" class="debt-row">
                <span class="billing-label">欠款：</span>
                <a-tag color="orange" size="small">&yen;{{ Number(record.debt_amount).toFixed(0) }}</a-tag>
              </div>
              <div v-else-if="hasRealSurplus(record)" class="debt-row">
                <span class="billing-label">溢款：</span>
                <a-tag color="blue" size="small">退&yen;{{ Number(record.debt_amount).toFixed(0) }}</a-tag>
              </div>
              <div v-else-if="record.debt_status === 'cleared'" class="billing-row">
                <a-tag color="green" size="small">已结清</a-tag>
              </div>
            </div>
          </template>

          <template v-if="column.key === 'country'">
            <a-tag>{{ record.country }}</a-tag>
          </template>

          <template v-if="column.key === 'sales_person'">
            <div v-if="record.sales_person" class="sales-cell">
              <span class="sales-name">{{ record.sales_person }}</span>
              <template v-if="managerWechatMap[record.sales_person]?.length">
                <span v-for="wx in managerWechatMap[record.sales_person]" :key="wx" class="sales-wechat">{{ wx }}</span>
              </template>
            </div>
            <span v-else class="text-empty">-</span>
          </template>

          <template v-if="column.key === 'customer'">
            <div class="customer-cell">
              <template v-if="record.feedback_channel === '群组'">
                <span class="customer-group-name">{{ record.group_name || record.customer_name || '-' }}</span>
                <a-tag color="blue" size="small" class="feedback-channel-tag" style="margin-top:2px;display:inline-block">群组</a-tag>
              </template>
              <template v-else>
                <span v-if="record.customer_name" class="customer-name-cell">{{ record.customer_name }}</span>
                <span v-else class="text-empty">-</span>
                <a-tag v-if="record.feedback_channel" color="cyan" size="small" class="feedback-channel-tag" style="margin-left:4px">私聊</a-tag>
              </template>
            </div>
          </template>

          <template v-if="column.key === 'product_price'">
            <div v-if="record.product_price" class="price-cell">
              <span class="price-usd">$ {{ Number(record.product_price).toFixed(2) }}</span>
            </div>
            <span v-else class="text-empty">—</span>
          </template>

          <template v-if="column.key === 'notes'">
            <span v-if="record.notes" class="notes-text">{{ record.notes }}</span>
            <span v-else class="text-empty">—</span>
          </template>

          <template v-if="column.key === 'exchange_rate'">
            <span v-if="record.exchange_rate" class="rate-text">{{ Number(record.exchange_rate).toFixed(2) }}</span>
            <span v-else class="text-empty">—</span>
          </template>

          <template v-if="column.key === 'receivable_amount'">
            <div class="amount-cell">
              <div v-if="(record.product_price || 0) > 0" class="amount-usd-part">
                <span class="amount-usd-tag">$ {{ (Number(record.product_price || 0) * Number(record.order_quantity || 1)).toFixed(2) }}</span>
              </div>
              <div class="amount-cny-main">&yen;{{ Number(record.total_amount || 0).toFixed(2) }}</div>
            </div>
          </template>

          <template v-if="column.key === 'actual_received'">
            <div class="amount-cell">
              <div v-if="(record._payment_total_usd || 0) > 0" class="amount-usd-part">
                <span class="amount-usd-tag">$ {{ Number(record._payment_total_usd || 0).toFixed(2) }}</span>
              </div>
              <div v-if="(record._payment_total_cny || 0) > 0" class="amount-cny-main amount-received">&yen;{{ Number(record._payment_total_cny || 0).toFixed(2) }}</div>
              <div v-else class="text-empty">—</div>
            </div>
          </template>

          <template v-if="column.key === 'task_status'">
            <a-tag :color="getStatusColor(record.status)" size="small">{{ record.status || '待处理' }}</a-tag>
          </template>

          <template v-if="column.key === 'action'">
            <a-space>
              <a-button type="link" size="small" @click="viewDetail(record)">详情</a-button>
              <a-button type="link" size="small" @click="openFeedbackModal(record)">反馈</a-button>
              <a-button type="link" size="small" @click="openBillingDrawer(record)">账单</a-button>
              <a-popconfirm title="确定删除这条任务吗?" @confirm="deleteOrder(record.id)">
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
      :title="`任务详情 - ${currentOrder?.order_number}`"
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
                <a-tag v-else-if="currentOrder.debt_status === 'cleared'" color="green">已结清</a-tag>
              </div>
            </div>
          </div>
        </div>

        <a-divider style="margin: 16px 0" />

        <a-descriptions :column="2" bordered size="small">
          <a-descriptions-item label="任务编号" :span="2">
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
          <a-descriptions-item label="客户名称">
            <span>{{ currentOrder.customer_name || '-' }}</span>
            <a-tag v-if="currentOrder.feedback_channel" :color="currentOrder.feedback_channel === '群组' ? 'blue' : 'cyan'" size="small" style="margin-left:6px">{{ currentOrder.feedback_channel }}</a-tag>
          </a-descriptions-item>
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
              <span class="amount-label-total">应收总额</span>
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

        <!-- Billing + Payment Records (Merged) -->
        <a-divider style="margin: 20px 0 16px" />
        <div class="detail-section-title" style="display:flex;align-items:center;justify-content:space-between">
          <span>账单 & 收款记录</span>
          <a-button size="small" type="link" @click="openBillingDrawer(currentOrder)">账单管理</a-button>
        </div>

        <!-- Billing Summary -->
        <div class="billing-panel" :class="{ 'billing-warn': currentOrder.billing_status === '未完成', 'billing-debt': hasRealDebt(currentOrder) }">
          <div class="billing-summary-row">
            <div class="billing-summary-item">
              <span class="billing-summary-label">签单金额</span>
              <span class="billing-summary-val">&yen;{{ Number(currentOrder.total_amount || 0).toFixed(2) }}</span>
              <span class="billing-summary-hint">本次任务约定总价</span>
            </div>
            <div class="billing-summary-divider"></div>
            <div class="billing-summary-item">
              <span class="billing-summary-label">累计到账</span>
              <span class="billing-summary-val" :style="{ color: paymentTotal > 0 ? '#16a34a' : '#9ca3af' }">&yen;{{ paymentTotal.toFixed(2) }}</span>
              <span class="billing-summary-hint">
                <template v-if="paymentsByType.base > 0">首款¥{{ paymentsByType.base.toFixed(0) }}</template>
                <template v-if="paymentsByType.supplement > 0"> + 补¥{{ paymentsByType.supplement.toFixed(0) }}</template>
                <template v-if="paymentsByType.refund > 0"> - 退¥{{ paymentsByType.refund.toFixed(0) }}</template>
                <template v-if="paymentTotal === 0">暂无到账</template>
              </span>
            </div>
            <div class="billing-summary-divider"></div>
            <div class="billing-summary-item">
              <span class="billing-summary-label">剩余待结</span>
              <span class="billing-summary-val" :style="{ color: paymentDiff < 0 ? '#dc2626' : paymentDiff > 0 ? '#2563eb' : '#16a34a' }">
                <template v-if="paymentDiff < 0">&yen;{{ Math.abs(paymentDiff).toFixed(2) }}</template>
                <template v-else-if="paymentDiff > 0">-&yen;{{ paymentDiff.toFixed(2) }}</template>
                <template v-else>&yen;0</template>
              </span>
              <span class="billing-summary-hint">
                <template v-if="paymentDiff < 0">待客户补款</template>
                <template v-else-if="paymentDiff > 0">待退客户</template>
                <template v-else>已结清</template>
              </span>
            </div>
          </div>
          <div class="billing-status-row">
            <div class="billing-info-row">
              <span class="billing-key">入账状态：</span>
              <a-tag :color="currentOrder.billing_status === '未完成' ? 'red' : 'green'">{{ currentOrder.billing_status || '已完成' }}</a-tag>
            </div>
            <div class="billing-info-row">
              <span class="billing-key">账款状态：</span>
              <a-tag v-if="hasRealDebt(currentOrder)" color="orange">客户欠款</a-tag>
              <a-tag v-else-if="hasRealSurplus(currentOrder)" color="blue">我方溢收</a-tag>
              <a-tag v-else-if="currentOrder.debt_status === 'cleared'" color="green">已结清</a-tag>
              <a-tag v-else color="green">无异常</a-tag>
            </div>
            <template v-if="hasRealDebt(currentOrder) || hasRealSurplus(currentOrder)">
              <div class="billing-info-row">
                <span class="billing-key">{{ hasRealSurplus(currentOrder) ? '溢收金额：' : '欠款金额：' }}</span>
                <span :class="hasRealSurplus(currentOrder) ? 'surplus-amount-text' : 'debt-amount-text'">&yen;{{ Number(currentOrder.debt_amount || 0).toFixed(2) }}</span>
              </div>
              <div class="billing-info-row billing-notes-row" v-if="currentOrder.debt_notes">
                <span class="billing-key">{{ hasRealSurplus(currentOrder) ? '溢款说明：' : '欠款说明：' }}</span>
                <span class="debt-notes-text">{{ currentOrder.debt_notes }}</span>
              </div>
              <div class="billing-info-row" v-if="currentOrder.debt_marked_by">
                <span class="billing-key">标记商务：</span>
                <span class="billing-val">{{ currentOrder.debt_marked_by }}
                  <span v-if="currentOrder.debt_marked_at" style="color:#9ca3af;font-size:11px;margin-left:4px">{{ dayjs(currentOrder.debt_marked_at).format('MM-DD HH:mm') }}</span>
                </span>
              </div>
            </template>
          </div>
        </div>

        <!-- Payment Flow Records -->
        <div class="payment-records-title">流水明细</div>
        <div v-if="batchPayments.length === 0" class="payment-empty">暂无收款流水</div>
        <div v-else class="payment-list">
          <div v-for="p in batchPayments" :key="p.id" class="payment-card" :class="getPaymentCardClass(p.payment_type)">
            <div class="payment-main">
              <div class="payment-top">
                <span class="payment-amount" :class="p.payment_type === '退款' ? 'payment-amount-refund' : ''">
                  {{ p.payment_type === '退款' ? '-' : '' }}&yen;{{ Number(p.amount_cny).toFixed(2) }}
                </span>
                <a-tag :color="getPaymentTypeColor(p.payment_type)" size="small">{{ p.payment_type || '基础收款' }}</a-tag>
              </div>
              <div class="payment-meta">
                <span>{{ p.payment_date }}</span>
                <span v-if="p.payment_method" class="payment-method">{{ p.payment_method }}</span>
                <span v-if="p.payer_name" class="payment-payer">{{ p.payer_name }}</span>
              </div>
              <div v-if="p.payment_group_id && p.group_orders && p.group_orders.length > 1" class="payment-group-info">
                <span class="payment-group-label">合并收款订单：</span>
                <span v-for="(go, gi) in p.group_orders" :key="gi" class="payment-group-order">
                  {{ go.asin || go.order_number }}
                  <span v-if="go.allocated_amount" class="payment-group-alloc">(&yen;{{ Number(go.allocated_amount).toFixed(0) }})</span>
                  <span v-if="gi < p.group_orders.length - 1"> / </span>
                </span>
              </div>
              <div v-if="p.notes" class="payment-notes">{{ p.notes }}</div>
            </div>
            <div class="payment-actions">
              <a-popconfirm title="确认删除此收款记录？" @confirm="deletePayment(p)">
                <a-button type="text" size="small" danger><DeleteOutlined /></a-button>
              </a-popconfirm>
            </div>
          </div>
        </div>
      </template>
    </a-drawer>

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
      :title="paymentModalTitle"
      :confirm-loading="paymentSaving"
      @ok="savePayment"
      :ok-text="paymentForm.payment_type === '退款' ? '保存退款' : '保存收款'"
      cancel-text="取消"
      :width="paymentForm.enableGroupPay ? 720 : 520"
    >
      <div class="payment-form">
        <div class="payment-form-info">
          <span>当前订单：{{ currentOrder?.order_number }}</span>
          <span>客户：{{ currentOrder?.customer_name || '-' }}</span>
          <span>应收：&yen;{{ Number(currentOrder?.total_amount || 0).toFixed(2) }}</span>
        </div>

        <div class="payment-form-field" v-if="paymentForm.payment_type !== '退款'">
          <a-checkbox v-model:checked="paymentForm.enableGroupPay" @change="onGroupPayToggle">
            合并收款（同时关联该客户的其他订单）
          </a-checkbox>
        </div>

        <div v-if="paymentForm.enableGroupPay && sameCustomerOrders.length > 0" class="group-pay-section">
          <div class="group-pay-title">选择要合并的订单（同客户：{{ currentOrder?.customer_name }}）</div>
          <div class="group-pay-list">
            <div v-for="o in sameCustomerOrders" :key="o.id" class="group-pay-item"
              :class="{ 'group-pay-selected': groupPaySelected.includes(o.id) }"
              @click="toggleGroupOrder(o.id)">
              <a-checkbox :checked="groupPaySelected.includes(o.id)" />
              <div class="group-pay-order-info">
                <div class="group-pay-asin">{{ o.asin }}</div>
                <div class="group-pay-detail">{{ o.order_number }} | {{ o.product_name || o.store_name }}</div>
              </div>
              <div class="group-pay-amount">&yen;{{ Number(o.total_amount).toFixed(2) }}</div>
            </div>
          </div>
          <div class="group-pay-summary">
            <span>合并应收合计：</span>
            <span class="group-pay-total">&yen;{{ groupPayTotalAmount.toFixed(2) }}</span>
            <span class="group-pay-count">（{{ groupPaySelected.length + 1 }} 个订单）</span>
          </div>

          <div class="group-alloc-section" v-if="groupPaySelected.length > 0">
            <div class="group-alloc-title">金额分配（可选，不填按应收比例自动分配）</div>
            <div v-for="ao in allGroupOrders" :key="ao.id" class="group-alloc-row">
              <span class="group-alloc-asin">{{ ao.asin }}</span>
              <span class="group-alloc-expected">应收 &yen;{{ Number(ao.total_amount).toFixed(0) }}</span>
              <a-input-number
                v-model:value="groupAllocations[ao.id]"
                :min="0" :precision="2" size="small" style="width:120px"
                placeholder="自动"
              />
            </div>
          </div>
        </div>

        <div class="payment-form-field">
          <label class="payment-form-label">{{ paymentForm.payment_type === '退款' ? '退款金额（元）' : '收款金额（元）' }}<span class="required">*</span></label>
          <a-input-number v-model:value="paymentForm.amount_cny" style="width:100%" :min="0.01" :precision="2"
            :placeholder="paymentForm.enableGroupPay ? `建议 ¥${groupPayTotalAmount.toFixed(2)}` : '输入金额'" />
        </div>
        <div class="payment-form-field">
          <label class="payment-form-label">{{ paymentForm.payment_type === '退款' ? '退款日期' : '收款日期' }} <span class="required">*</span></label>
          <a-date-picker
            v-model:value="paymentForm.payment_date_picker"
            style="width:100%"
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
          />
        </div>
        <div class="payment-form-field">
          <label class="payment-form-label">{{ paymentForm.payment_type === '退款' ? '退款方式' : '收款方式' }}</label>
          <a-select v-model:value="paymentForm.payment_method" style="width:100%">
            <a-select-option value="银行转账">银行转账</a-select-option>
            <a-select-option value="微信">微信</a-select-option>
            <a-select-option value="支付宝">支付宝</a-select-option>
            <a-select-option value="现金">现金</a-select-option>
            <a-select-option value="其他">其他</a-select-option>
          </a-select>
        </div>
        <div class="payment-form-field">
          <label class="payment-form-label">{{ paymentForm.payment_type === '退款' ? '退款对象' : '付款人' }}</label>
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
        <div class="payment-form-tip" :class="paymentForm.payment_type === '退款' ? 'payment-form-tip-refund' : ''">
          {{ paymentForm.payment_type === '退款'
            ? '保存后将生成一条退款交易流水'
            : '保存后将自动生成一条交易流水，供财务核验' }}
        </div>
      </div>
    </a-modal>

    <!-- Create Task Group Modal -->
    <a-modal
      v-model:open="createGroupModalOpen"
      title="创建任务组"
      :confirm-loading="createGroupSaving"
      @ok="saveCreateGroup"
      ok-text="确认创建"
      cancel-text="取消"
      width="560px"
    >
      <div class="task-group-form">
        <div class="task-group-hint">将选中的订单绑定为一个任务组，表示它们由同一客户同批次下达，需要一起结算和反馈。</div>
        <div class="task-group-field">
          <label class="task-group-label">任务组名称 <span class="required">*</span></label>
          <a-input v-model:value="createGroupForm.label" placeholder="如：李婷 3月26日批次" />
        </div>
        <div class="task-group-field">
          <label class="task-group-label">日期</label>
          <a-date-picker v-model:value="createGroupForm.date_picker" style="width:100%" value-format="YYYY-MM-DD" />
        </div>
        <div class="task-group-field">
          <label class="task-group-label">备注</label>
          <a-textarea v-model:value="createGroupForm.notes" :rows="2" placeholder="备注（可选）" />
        </div>
        <div class="task-group-orders-preview">
          <div class="task-group-preview-title">包含订单（{{ createGroupOrders.length }} 个）</div>
          <div v-for="o in createGroupOrders" :key="o.id" class="task-group-order-row">
            <LinkOutlined style="color:#7c3aed;font-size:11px" />
            <span class="task-group-order-num">{{ o.order_number }}</span>
            <span class="task-group-order-asin">{{ o.asin }}</span>
            <span class="task-group-order-amount">¥{{ Number(o.total_amount).toFixed(2) }}</span>
          </div>
          <div class="task-group-total">合计应收：¥{{ createGroupOrders.reduce((s,o)=>s+Number(o.total_amount||0),0).toFixed(2) }}</div>
        </div>
      </div>
    </a-modal>

    <!-- Group Billing Drawer -->
    <GroupBillingDrawer
      :open="groupDetailModalOpen"
      :group-data="groupDetailData"
      :group-orders="groupDetailOrders"
      @close="groupDetailModalOpen = false"
      @updated="loadOrders"
    />

    <!-- 统一账单抽屉 -->
    <BillingDrawer
      :open="billingDrawerOpen"
      :order="billingDrawerOrder"
      @close="billingDrawerOpen = false"
      @updated="onBillingUpdated"
    />

    <!-- 聊单号编辑弹窗 -->
    <a-modal v-model:open="editChatIdOpen" title="设置聊单号" :footer="null" width="400px">
      <div style="padding:8px 0 16px">
        <a-input v-model:value="editChatIdValue" placeholder="输入聊单号..." allow-clear />
      </div>
      <div style="display:flex;justify-content:flex-end;gap:8px">
        <a-button @click="editChatIdOpen = false">取消</a-button>
        <a-button type="primary" :loading="savingChatId" @click="saveChatId">保存</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined, DownOutlined, PictureOutlined, UserOutlined, DeleteOutlined, DollarOutlined, RollbackOutlined, PlusOutlined, LinkOutlined } from '@ant-design/icons-vue'
import { useCurrentUser } from '../composables/useCurrentUser'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'
import BillingDrawer from '../components/BillingDrawer.vue'
import GroupBillingDrawer from '../components/GroupBillingDrawer.vue'

const loading = ref(false)
const orders = ref<any[]>([])
const searchText = ref('')
const filterStatus = ref('')
const filterCountry = ref('')
const filterOrderType = ref('')
const filterBilling = ref('')
const drawerOpen = ref(false)
const currentOrder = ref<any>(null)

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
  payment_type: '基础收款',
  amount_cny: 0,
  payment_date_picker: null as any,
  payment_method: '银行转账',
  payer_name: '',
  recorded_by: '',
  notes: '',
  enableGroupPay: false,
})

const { currentUser } = useCurrentUser()

const billingDrawerOpen = ref(false)
const billingDrawerOrder = ref<any>(null)

function openBillingDrawer(record: any) {
  billingDrawerOrder.value = record
  billingDrawerOpen.value = true
}

function onBillingUpdated(payload: any) {
  const idx = orders.value.findIndex(o => o.id === payload.id)
  if (idx !== -1) Object.assign(orders.value[idx], payload)
  if (currentOrder.value?.id === payload.id) Object.assign(currentOrder.value, payload)
  if (billingDrawerOrder.value?.id === payload.id) Object.assign(billingDrawerOrder.value, payload)
}

const batchPayments = ref<any[]>([])
const sameCustomerOrders = ref<any[]>([])
const groupPaySelected = ref<string[]>([])
const groupAllocations = reactive<Record<string, number | null>>({})

const paymentTotal = computed(() => {
  return batchPayments.value.reduce((s, p) => {
    const amt = Number(p.amount_cny || 0)
    return p.payment_type === '退款' ? s - amt : s + amt
  }, 0)
})

const paymentsByType = computed(() => {
  const base = batchPayments.value
    .filter(p => !p.payment_type || p.payment_type === '基础收款')
    .reduce((s, p) => s + Number(p.amount_cny || 0), 0)
  const supplement = batchPayments.value
    .filter(p => p.payment_type === '补款')
    .reduce((s, p) => s + Number(p.amount_cny || 0), 0)
  const refund = batchPayments.value
    .filter(p => p.payment_type === '退款')
    .reduce((s, p) => s + Number(p.amount_cny || 0), 0)
  return { base, supplement, refund }
})

const paymentDiff = computed(() => {
  return paymentTotal.value - Number(currentOrder.value?.total_amount || 0)
})

const canMarkCleared = computed(() => batchPayments.value.length > 0)

const paymentModalTitle = computed(() => {
  const m: Record<string, string> = { '基础收款': '录入收款', '补款': '录入补款', '退款': '录入退款' }
  return m[paymentForm.value.payment_type] || '录入收款'
})

const allGroupOrders = computed(() => {
  if (!currentOrder.value) return []
  const list = [currentOrder.value]
  for (const o of sameCustomerOrders.value) {
    if (groupPaySelected.value.includes(o.id)) list.push(o)
  }
  return list
})

const groupPayTotalAmount = computed(() => {
  return allGroupOrders.value.reduce((s, o) => s + Number(o.total_amount || 0), 0)
})

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
  { title: '任务号', key: 'order_number', dataIndex: 'order_number', width: 175 },
  { title: '客户', key: 'customer', width: 160 },
  { title: '产品信息', key: 'product', width: 220 },
  { title: '国家', key: 'country', dataIndex: 'country', width: 65 },
  { title: '测评类型/量', key: 'order_types', width: 135 },
  { title: '产品售价', key: 'product_price', width: 90 },
  { title: '接单汇率', key: 'exchange_rate', width: 80 },
  { title: '应收基础款项', key: 'receivable_amount', width: 130 },
  { title: '实收基础款项', key: 'actual_received', width: 130 },
  { title: '账单状态', key: 'billing', width: 130 },
  { title: '反馈状态', key: 'feedback', width: 130 },
  { title: '商务备注', key: 'notes', width: 140 },
  { title: '商务', key: 'sales_person', width: 110 },
  { title: '任务状态', key: 'task_status', width: 95 },
  { title: '创建时间', dataIndex: 'created_at', key: 'created_at', width: 100, customRender: ({ text }: any) => text ? dayjs(text).format('MM-DD HH:mm') : '' },
  { title: '操作', key: 'action', width: 160, fixed: 'right' as const },
]

const editChatIdOpen = ref(false)
const editChatIdRecord = ref<any>(null)
const editChatIdValue = ref('')
const savingChatId = ref(false)

function openEditChatId(record: any) {
  editChatIdRecord.value = record
  editChatIdValue.value = record.chat_order_id || ''
  editChatIdOpen.value = true
}

async function saveChatId() {
  if (!editChatIdRecord.value) return
  savingChatId.value = true
  try {
    const { error } = await supabase.from('erp_orders').update({ chat_order_id: editChatIdValue.value || null }).eq('id', editChatIdRecord.value.id)
    if (error) throw error
    editChatIdRecord.value.chat_order_id = editChatIdValue.value
    editChatIdOpen.value = false
    message.success('聊单号已保存')
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    savingChatId.value = false
  }
}

function getReviewTypeColor(type: string) {
  const map: Record<string, string> = { '真人测评': 'blue', '自然测评': 'cyan', '催评': 'orange', 'Vine': 'green' }
  return map[type] || 'default'
}

function getOrderProgressPct(record: any): number {
  const total = Number(record.order_quantity || 0)
  if (!total) return 0
  return Math.round(((record._review_count || 0) / total) * 100)
}

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
    '免评': 'price_no_review', '文字评': 'price_text', '图片评': 'price_image',
    '视频评': 'price_video', 'Feedback': 'price_feedback',
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
  const classes: string[] = []
  if (record._isMultiBatch) {
    classes.push('row-in-batch')
    if (record._isFirstInBatch) classes.push('row-batch-first')
    if (record._isLastInBatch) classes.push('row-batch-last')
  }
  if (record.billing_status === '未完成' && hasRealDebt(record)) classes.push('row-billing-debt')
  else if (record.billing_status === '未完成') classes.push('row-billing-warn')
  else if (hasRealDebt(record)) classes.push('row-debt-warn')
  else if (hasRealSurplus(record)) classes.push('row-surplus-warn')
  return classes.join(' ')
}

function getPaymentTypeColor(type: string) {
  const map: Record<string, string> = { '基础收款': 'green', '补款': 'orange', '退款': 'red' }
  return map[type] || 'green'
}

function getPaymentCardClass(type: string) {
  if (type === '补款') return 'payment-card-supplement'
  if (type === '退款') return 'payment-card-refund'
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
    let query = supabase.from('erp_orders').select('*', { count: 'exact' })
      .order('batch_number', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: true })
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
    const rows = data || []
    const batchGroups: Record<string, any[]> = {}
    for (const row of rows) {
      const key = row.batch_number || `_solo_${row.id}`
      if (!batchGroups[key]) batchGroups[key] = []
      batchGroups[key].push(row)
    }
    const batchColorPalette = ['#2563eb', '#0891b2', '#16a34a', '#d97706', '#dc2626', '#7c3aed']
    let colorIdx = 0
    const batchColorMap: Record<string, string> = {}
    for (const key of Object.keys(batchGroups)) {
      const isMulti = batchGroups[key].length > 1
      batchColorMap[key] = isMulti ? batchColorPalette[colorIdx % batchColorPalette.length] : 'none'
      if (isMulti) colorIdx++
    }
    for (const row of rows) {
      const key = row.batch_number || `_solo_${row.id}`
      const group = batchGroups[key]
      row._batchColor = batchColorMap[key]
      row._isMultiBatch = group.length > 1
      row._isFirstInBatch = group[0].id === row.id
      row._isLastInBatch = group[group.length - 1].id === row.id
    }
    // 子订单统计
    const orderIds = rows.map((r: any) => r.id)
    if (orderIds.length > 0) {
      const { data: subs } = await supabase
        .from('sub_orders')
        .select('order_id, status, order_status, refund_method, refund_amount, refund_date')
        .in('order_id', orderIds)
      if (subs) {
        const statsMap: Record<string, any> = {}
        for (const s of subs) {
          if (!statsMap[s.order_id]) {
            statsMap[s.order_id] = { ordered: 0, reviewed: 0, cancel: 0, refund_count: 0, refund_total: 0, methods: new Set<string>(), dates: [] }
          }
          const st = statsMap[s.order_id]
          if (s.status && ['已下单', '已留评', '已完成'].includes(s.status)) st.ordered++
          if (s.status && ['已留评', '已完成'].includes(s.status)) st.reviewed++
          if (s.order_status === '取消') st.cancel++
          if (s.order_status === '退款' || s.refund_amount) { st.refund_count++; st.refund_total += Number(s.refund_amount || 0) }
          if (s.refund_method) st.methods.add(s.refund_method)
          if (s.refund_date) st.dates.push(s.refund_date)
        }
        for (const row of rows) {
          const st = statsMap[row.id]
          if (st) {
            row._ordered_count = st.ordered
            row._review_count = st.reviewed
            row._cancel_count = st.cancel
            row._refund_count = st.refund_count
            row._refund_total = st.refund_total
            row._refund_method_summary = [...st.methods].join('/')
            row._refund_date_summary = st.dates.length ? st.dates.sort().slice(-1)[0] : ''
          } else {
            row._ordered_count = 0; row._review_count = 0; row._cancel_count = 0
            row._refund_count = 0; row._refund_total = 0
          }
        }
      }
    }

    // 支付款项汇总（实收基础款项）
    if (orderIds.length > 0) {
      const { data: payments } = await supabase
        .from('batch_payments')
        .select('batch_id, amount_cny, payment_type')
        .in('batch_id', orderIds)
      if (payments) {
        const payMap: Record<string, number> = {}
        for (const p of payments) {
          if (!payMap[p.batch_id]) payMap[p.batch_id] = 0
          const amt = Number(p.amount_cny || 0)
          payMap[p.batch_id] += p.payment_type === '退款' ? -amt : amt
        }
        for (const row of rows) {
          row._payment_total_cny = payMap[row.id] || 0
          row._payment_total_usd = 0
        }
      }
    }

    orders.value = rows
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
  const payments = data || []

  for (const p of payments) {
    if (p.payment_group_id) {
      const { data: goData } = await supabase
        .from('payment_group_orders')
        .select('order_id, allocated_amount')
        .eq('payment_group_id', p.payment_group_id)
      if (goData && goData.length > 1) {
        const orderIds = goData.map((g: any) => g.order_id)
        const { data: orderData } = await supabase
          .from('erp_orders')
          .select('id, order_number, asin')
          .in('id', orderIds)
        p.group_orders = goData.map((g: any) => {
          const ord = orderData?.find((o: any) => o.id === g.order_id)
          return { ...g, order_number: ord?.order_number, asin: ord?.asin }
        })
      }
    }
  }
  batchPayments.value = payments
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


async function onGroupPayToggle() {
  if (paymentForm.value.enableGroupPay && currentOrder.value?.customer_name) {
    const { data } = await supabase
      .from('erp_orders')
      .select('id, order_number, asin, product_name, store_name, total_amount, billing_status')
      .eq('customer_name', currentOrder.value.customer_name)
      .neq('id', currentOrder.value.id)
      .order('created_at', { ascending: false })
    sameCustomerOrders.value = data || []
  }
}

function toggleGroupOrder(orderId: string) {
  const idx = groupPaySelected.value.indexOf(orderId)
  if (idx === -1) {
    groupPaySelected.value.push(orderId)
  } else {
    groupPaySelected.value.splice(idx, 1)
    delete groupAllocations[orderId]
  }
}

async function savePayment() {
  if (!currentOrder.value) return
  if (!paymentForm.value.amount_cny || paymentForm.value.amount_cny <= 0) {
    message.warning('请输入金额')
    return
  }
  if (!paymentForm.value.payment_date_picker) {
    message.warning('请选择日期')
    return
  }
  paymentSaving.value = true
  try {
    const paymentDate = typeof paymentForm.value.payment_date_picker === 'string'
      ? paymentForm.value.payment_date_picker
      : paymentForm.value.payment_date_picker?.format('YYYY-MM-DD')

    const isGroupPay = paymentForm.value.enableGroupPay && groupPaySelected.value.length > 0
    const isRefund = paymentForm.value.payment_type === '退款'

    let groupId: string | null = null

    if (isGroupPay) {
      const { data: gData, error: gErr } = await supabase.from('payment_groups').insert({
        group_number: `PG-${Date.now()}`,
        customer_name: currentOrder.value.customer_name || '',
        total_amount: paymentForm.value.amount_cny,
        payment_date: paymentDate,
        payment_method: paymentForm.value.payment_method,
        payer_name: paymentForm.value.payer_name,
        recorded_by: paymentForm.value.recorded_by,
        notes: paymentForm.value.notes,
      }).select('id').maybeSingle()
      if (gErr) throw gErr
      groupId = gData?.id || null

      if (groupId) {
        const totalExpected = groupPayTotalAmount.value
        const groupOrderEntries = allGroupOrders.value.map(o => {
          const manualAlloc = groupAllocations[o.id]
          const autoAlloc = totalExpected > 0
            ? (Number(o.total_amount) / totalExpected) * paymentForm.value.amount_cny
            : paymentForm.value.amount_cny / allGroupOrders.value.length
          return {
            payment_group_id: groupId!,
            order_id: o.id,
            allocated_amount: manualAlloc != null ? manualAlloc : Number(autoAlloc.toFixed(2)),
          }
        })
        const { error: goErr } = await supabase.from('payment_group_orders').insert(groupOrderEntries)
        if (goErr) throw goErr
      }
    }

    const { data: txNo } = await supabase.rpc('generate_transaction_no')
    const transactionNo = txNo || `FT-${Date.now()}`

    const txType = isRefund ? '退款' : '批次收款'
    const txDirection = isRefund ? '支出' : '收入'
    const txNotes = `${paymentForm.value.payment_type} - ${paymentForm.value.payment_method}${paymentForm.value.notes ? ' | ' + paymentForm.value.notes : ''}${isGroupPay ? ' | 合并收款' : ''}`

    const { data: txData, error: txErr } = await supabase.from('financial_transactions').insert({
      transaction_no: transactionNo,
      transaction_type: txType,
      direction: txDirection,
      amount_cny: paymentForm.value.amount_cny,
      exchange_rate: currentOrder.value.exchange_rate || 7.25,
      customer_name: currentOrder.value.customer_name || '',
      customer_id_str: currentOrder.value.customer_id_str || '',
      order_id: currentOrder.value.id,
      order_number: currentOrder.value.order_number,
      staff_name: paymentForm.value.recorded_by,
      status: '待审批',
      notes: txNotes,
      transaction_date: paymentDate,
    }).select('id').maybeSingle()
    if (txErr) throw txErr

    const orderIds = isGroupPay
      ? [currentOrder.value.id, ...groupPaySelected.value]
      : [currentOrder.value.id]

    for (const oid of orderIds) {
      const order = oid === currentOrder.value.id ? currentOrder.value : sameCustomerOrders.value.find(o => o.id === oid)
      await supabase.from('batch_payments').insert({
        batch_id: oid,
        batch_number: order?.order_number || currentOrder.value.order_number,
        transaction_id: txData?.id || null,
        amount_cny: isGroupPay
          ? (groupAllocations[oid] != null
            ? groupAllocations[oid]
            : Number(((Number(order?.total_amount || 0) / groupPayTotalAmount.value) * paymentForm.value.amount_cny).toFixed(2)))
          : paymentForm.value.amount_cny,
        payment_date: paymentDate,
        payment_method: paymentForm.value.payment_method,
        payer_name: paymentForm.value.payer_name,
        recorded_by: paymentForm.value.recorded_by,
        notes: paymentForm.value.notes,
        payment_type: paymentForm.value.payment_type,
        payment_group_id: groupId,
      })
    }

    const typeLabel = isRefund ? '退款' : '收款'
    message.success(`${typeLabel}已录入${isGroupPay ? '（已合并关联 ' + orderIds.length + ' 个订单）' : ''}`)
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
    if (payment.payment_group_id) {
      await supabase.from('batch_payments').delete().eq('payment_group_id', payment.payment_group_id)
      await supabase.from('payment_group_orders').delete().eq('payment_group_id', payment.payment_group_id)
      await supabase.from('payment_groups').delete().eq('id', payment.payment_group_id)
      message.success('已删除合并收款记录及关联流水')
    } else {
      await supabase.from('batch_payments').delete().eq('id', payment.id)
      message.success('已删除收款记录及对应流水')
    }
    if (currentOrder.value) await loadPayments(currentOrder.value.id)
  } catch (e: any) {
    message.error('删除失败：' + e.message)
  }
}

const createGroupModalOpen = ref(false)
const createGroupSaving = ref(false)
const createGroupOrders = ref<any[]>([])
const createGroupForm = ref({ label: '', date_picker: dayjs().format('YYYY-MM-DD'), notes: '' })

const groupDetailModalOpen = ref(false)
const groupDetailData = ref<any>(null)
const groupDetailOrders = ref<any[]>([])

function openCreateGroupModal() {
  const selected = orders.value.filter(o => selectedRowKeys.value.includes(o.id))
  if (selected.length < 2) { message.warning('请至少选择2个订单'); return }
  createGroupOrders.value = selected
  const firstCustomer = selected[0]?.customer_name || ''
  const firstSales = selected[0]?.sales_person || ''
  createGroupForm.value = {
    label: `${firstSales || firstCustomer} ${dayjs().format('MM月DD日')}批次`,
    date_picker: dayjs().format('YYYY-MM-DD'),
    notes: '',
  }
  createGroupModalOpen.value = true
}

async function saveCreateGroup() {
  if (!createGroupForm.value.label.trim()) { message.warning('请填写任务组名称'); return }
  createGroupSaving.value = true
  try {
    const firstOrder = createGroupOrders.value[0]
    const batchNo = `BG-${Date.now()}`
    const totalAmt = createGroupOrders.value.reduce((s, o) => s + Number(o.total_amount || 0), 0)

    const { data: bData, error: bErr } = await supabase.from('order_batches').insert({
      batch_number: batchNo,
      label: createGroupForm.value.label.trim(),
      customer_name: firstOrder?.customer_name || '',
      sales_person: firstOrder?.sales_person || '',
      batch_date: createGroupForm.value.date_picker,
      actual_amount: totalAmt,
      notes: createGroupForm.value.notes,
      batch_status: '进行中',
      order_count: createGroupOrders.value.length,
    }).select('id').maybeSingle()
    if (bErr) throw bErr

    const batchId = bData?.id
    for (const o of createGroupOrders.value) {
      await supabase.from('erp_orders').update({
        batch_id: batchId,
        batch_number: createGroupForm.value.label.trim(),
      }).eq('id', o.id)
    }

    message.success(`任务组「${createGroupForm.value.label}」创建成功`)
    createGroupModalOpen.value = false
    selectedRowKeys.value = []
    loadOrders()
  } catch (e: any) {
    message.error('创建失败：' + e.message)
  } finally {
    createGroupSaving.value = false
  }
}

async function showGroupDetail(record: any) {
  if (!record.batch_id) return
  const { data: bData } = await supabase.from('order_batches').select('*').eq('id', record.batch_id).maybeSingle()
  if (!bData) { message.warning('任务组信息不存在'); return }
  groupDetailData.value = bData
  const { data: oData } = await supabase.from('erp_orders').select('*').eq('batch_id', record.batch_id).order('created_at')
  groupDetailOrders.value = oData || []
  groupDetailModalOpen.value = true
}

function batchPayGroupOrders(_type: string) {
  groupDetailModalOpen.value = false
  if (groupDetailOrders.value.length > 0) {
    openBillingDrawer(groupDetailOrders.value[0])
  }
}

async function dissolveGroup() {
  if (!groupDetailData.value) return
  const batchId = groupDetailData.value.id
  for (const o of groupDetailOrders.value) {
    await supabase.from('erp_orders').update({ batch_id: null, batch_number: null }).eq('id', o.id)
  }
  await supabase.from('order_batches').delete().eq('id', batchId)
  message.success('任务组已解散')
  groupDetailModalOpen.value = false
  loadOrders()
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

const managerWechatMap = ref<Record<string, string[]>>({})

async function loadManagerWechat() {
  const { data } = await supabase
    .from('business_wechat_accounts')
    .select('wechat_id, wechat_nickname, business_managers(name)')
    .eq('status', '在用')
  if (data) {
    const map: Record<string, string[]> = {}
    data.forEach((row: any) => {
      const managerName = row.business_managers?.name
      if (!managerName) return
      if (!map[managerName]) map[managerName] = []
      const label = row.wechat_nickname || row.wechat_id
      if (label && !map[managerName].includes(label)) map[managerName].push(label)
    })
    managerWechatMap.value = map
  }
}

onMounted(() => {
  loadOrders()
  loadManagerWechat()
})
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

.review-type-line { margin-bottom: 3px; }
.chat-order-id { font-size: 12px; color: #374151; font-family: 'Courier New', monospace; }
.set-link { padding: 0; height: auto; font-size: 11px; }

.order-progress-cell { display: flex; flex-direction: column; gap: 3px; min-width: 110px; }
.progress-bar-wrap { display: flex; align-items: center; gap: 5px; }
.progress-bar-bg { flex: 1; height: 6px; background: #e5e7eb; border-radius: 3px; overflow: hidden; }
.progress-bar-fill { height: 100%; background: #16a34a; border-radius: 3px; transition: width 0.3s; }
.progress-pct { font-size: 11px; font-weight: 600; color: #374151; min-width: 30px; }
.progress-stats-row { display: flex; align-items: center; gap: 3px; font-size: 10px; color: #6b7280; }
.ps-item b { color: #374151; }
.ps-sep { color: #d1d5db; }
.ps-total { color: #9ca3af; }

.sub-status-summary { display: flex; flex-direction: column; gap: 2px; }
.ss-item { font-size: 11px; padding: 1px 6px; border-radius: 3px; display: inline-block; width: fit-content; }
.ss-normal { background: #f0fdf4; color: #16a34a; }
.ss-cancel { background: #fef2f2; color: #dc2626; }
.ss-refund { background: #fffbeb; color: #d97706; }

.refund-summary-cell { display: flex; flex-direction: column; gap: 2px; }
.rs-method { font-size: 11px; color: #6b7280; }
.rs-amount { font-size: 12px; font-weight: 600; color: #f59e0b; }
.rs-date { font-size: 10px; color: #9ca3af; }

.sales-cell { display: flex; flex-direction: column; gap: 2px; }
.sales-name { font-size: 12px; font-weight: 500; color: #374151; }
.sales-wechat { font-size: 11px; color: #6b7280; }
.customer-name { font-size: 11px; color: #9ca3af; }
.customer-name-cell { font-size: 12px; color: #374151; }
.customer-cell { display: flex; flex-direction: column; gap: 3px; }
.feedback-channel-tag { margin-top: 2px; }
.notes-text { font-size: 11px; color: #6b7280; max-width: 130px; display: inline-block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; vertical-align: middle; }
.rate-text { font-size: 12px; color: #374151; font-family: monospace; }
.amount-cell { display: flex; flex-direction: column; gap: 2px; }
.amount-usd-part { display: flex; align-items: center; gap: 4px; }
.amount-usd-tag { font-size: 11px; color: #2563eb; font-weight: 600; background: #eff6ff; border-radius: 3px; padding: 1px 5px; }
.amount-rate-hint { font-size: 10px; color: #9ca3af; }
.amount-cny-main { font-size: 13px; font-weight: 600; color: #16a34a; }
.amount-received { color: #2563eb; }
.price-cell { display: inline-block; }
.price-usd { font-size: 12px; color: #1d4ed8; font-weight: 600; }
.customer-group-name { font-size: 12px; color: #1d4ed8; font-weight: 500; display: block; line-height: 1.4; }
.total-qty-badge { font-size: 11px; color: #374151; font-weight: 600; background: #f3f4f6; border-radius: 3px; padding: 1px 5px; margin-left: 4px; }

:global(.row-batch-first td) { border-top: 2px solid #e2e8f0 !important; }
:global(.row-batch-last td) { border-bottom: 2px solid #e2e8f0 !important; }

.order-number-cell {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.batch-group-header {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: #f0f4ff;
  border: 1px solid #c7d7fd;
  border-radius: 5px;
  padding: 2px 8px 2px 6px;
  cursor: pointer;
  transition: background 0.15s;
  max-width: 100%;
  overflow: hidden;
}
.batch-group-header:hover {
  background: #dbeafe;
  border-color: #93c5fd;
}
.batch-group-icon {
  font-size: 10px;
  color: #2563eb;
  flex-shrink: 0;
}
.batch-group-name {
  font-size: 11px;
  font-weight: 600;
  color: #1d4ed8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.order-number-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.batch-side-bar {
  width: 3px;
  height: 18px;
  border-radius: 2px;
  flex-shrink: 0;
  opacity: 0.85;
}

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
  border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 18px;
  background: #f9fafb; display: flex; flex-direction: column; gap: 8px;
}
.feedback-info-row { display: flex; align-items: center; gap: 6px; }
.feedback-key { font-size: 13px; color: #6b7280; flex-shrink: 0; }
.feedback-date { font-size: 12px; color: #374151; margin-left: 4px; }
.feedback-notes-text { font-size: 13px; color: #374151; }

.billing-panel {
  border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px 18px;
  background: #f9fafb; display: flex; flex-direction: column; gap: 8px;
}
.billing-panel.billing-warn { background: #fff7ed; border-color: #fed7aa; }
.billing-panel.billing-debt { background: #fffbeb; border-color: #fde68a; }
.billing-panel.billing-warn.billing-debt { background: #fff1f2; border-color: #fecdd3; }
.billing-info-row { display: flex; align-items: flex-start; gap: 6px; }
.billing-notes-row { align-items: flex-start; }
.billing-key { font-size: 13px; color: #6b7280; flex-shrink: 0; padding-top: 1px; min-width: 72px; }
.billing-val { font-size: 13px; color: #374151; }
.billing-diff { font-size: 12px; font-weight: 600; margin-left: 8px; padding: 1px 8px; border-radius: 4px; }
.diff-surplus { background: #eff6ff; color: #2563eb; }
.diff-deficit { background: #fff7ed; color: #d97706; }
.debt-amount-text { font-size: 15px; font-weight: 700; color: #d97706; }
.surplus-amount-text { font-size: 15px; font-weight: 700; color: #2563eb; }
.debt-notes-text { font-size: 13px; color: #92400e; line-height: 1.6; }

.billing-type-breakdown {
  background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px 12px;
  display: flex; flex-direction: column; gap: 4px; margin: 2px 0;
}
.billing-type-row { display: flex; align-items: center; justify-content: space-between; font-size: 12px; }
.billing-type-label { color: #6b7280; }
.billing-type-val { font-weight: 600; color: #374151; font-family: 'Courier New', monospace; }
.supplement-label { color: #d97706; }
.supplement-val { color: #d97706; }
.refund-label { color: #dc2626; }
.refund-val { color: #dc2626; }

.payment-empty {
  text-align: center; color: #9ca3af; padding: 20px; font-size: 13px;
  background: #f9fafb; border-radius: 10px; border: 1px dashed #e5e7eb;
}
.payment-list { display: flex; flex-direction: column; gap: 8px; }
.payment-card {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 16px;
  transition: border-color 0.2s;
}
.payment-card:hover { border-color: #93c5fd; }
.payment-card-supplement { border-left: 3px solid #d97706; }
.payment-card-refund { border-left: 3px solid #dc2626; background: #fef2f2; }
.payment-main { flex: 1; min-width: 0; }
.payment-top { display: flex; align-items: center; gap: 8px; }
.payment-amount { font-size: 16px; font-weight: 700; color: #16a34a; font-family: 'Courier New', monospace; }
.payment-amount-refund { color: #dc2626; }
.payment-meta {
  display: flex; gap: 10px; font-size: 12px; color: #6b7280; margin-top: 4px;
}
.payment-method { color: #2563eb; }
.payment-payer { color: #374151; }
.payment-notes { font-size: 12px; color: #9ca3af; margin-top: 2px; }
.payment-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

.payment-group-info {
  margin-top: 4px; padding: 6px 10px; background: #f0f9ff; border-radius: 6px;
  font-size: 12px; color: #1e40af; border: 1px solid #bfdbfe;
}
.payment-group-label { font-weight: 600; color: #1d4ed8; }
.payment-group-order { font-weight: 500; }
.payment-group-alloc { color: #6b7280; font-size: 11px; }

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
  margin-top: 8px; display: flex; flex-direction: column; gap: 4px;
  padding: 10px 12px; background: #f9fafb; border-radius: 8px; border: 1px solid #e5e7eb;
}
.feedback-date-label { font-size: 12px; color: #6b7280; }

.payment-form { display: flex; flex-direction: column; gap: 14px; padding: 4px 0; }
.payment-form-info {
  display: flex; gap: 16px; font-size: 13px; color: #374151; font-weight: 500;
  padding: 10px 14px; background: #f8fafc; border-radius: 8px; border: 1px solid #e5e7eb;
}
.payment-form-field { display: flex; flex-direction: column; gap: 4px; }
.payment-form-label { font-size: 13px; font-weight: 500; color: #374151; }
.required { color: #ef4444; margin-left: 2px; }
.payment-form-tip {
  font-size: 12px; color: #2563eb; background: #eff6ff;
  border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px 12px; text-align: center;
}
.payment-form-tip-refund { color: #dc2626; background: #fef2f2; border-color: #fecdd3; }

.group-pay-section {
  background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px;
}
.group-pay-title { font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 10px; }
.group-pay-list { display: flex; flex-direction: column; gap: 6px; }
.group-pay-item {
  display: flex; align-items: center; gap: 10px; padding: 8px 12px;
  background: #fff; border: 1px solid #e5e7eb; border-radius: 8px;
  cursor: pointer; transition: all 0.15s;
}
.group-pay-item:hover { border-color: #93c5fd; }
.group-pay-selected { border-color: #2563eb; background: #eff6ff; }
.group-pay-order-info { flex: 1; min-width: 0; }
.group-pay-asin { font-size: 13px; font-weight: 600; color: #1e40af; }
.group-pay-detail { font-size: 11px; color: #6b7280; margin-top: 1px; }
.group-pay-amount { font-size: 14px; font-weight: 700; color: #374151; font-family: 'Courier New', monospace; }
.group-pay-summary {
  display: flex; align-items: center; gap: 6px; margin-top: 10px;
  padding: 8px 12px; background: #fff; border-radius: 8px; border: 1px solid #e5e7eb;
  font-size: 13px; color: #6b7280;
}
.group-pay-total { font-size: 16px; font-weight: 700; color: #dc2626; font-family: 'Courier New', monospace; }
.group-pay-count { font-size: 12px; color: #9ca3af; }

.group-alloc-section { margin-top: 12px; }
.group-alloc-title { font-size: 12px; color: #6b7280; margin-bottom: 8px; }
.group-alloc-row {
  display: flex; align-items: center; gap: 10px; padding: 6px 0;
}
.group-alloc-asin { font-size: 13px; font-weight: 600; color: #1e40af; min-width: 120px; }
.group-alloc-expected { font-size: 12px; color: #6b7280; min-width: 100px; }

.batch-pay-form { display: flex; flex-direction: column; gap: 14px; }
.batch-pay-info-bar {
  font-size: 13px; color: #2563eb; background: #eff6ff; border: 1px solid #bfdbfe;
  border-radius: 8px; padding: 10px 14px; text-align: center; font-weight: 500;
}
.batch-pay-info-refund { color: #dc2626; background: #fef2f2; border-color: #fecdd3; }
.batch-pay-order-list {
  background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px;
}
.batch-pay-list-header {
  display: flex; align-items: center; justify-content: space-between;
  font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 8px;
}
.batch-pay-total-expected { color: #dc2626; font-family: 'Courier New', monospace; }
.batch-pay-order-row {
  display: flex; align-items: center; justify-content: space-between; gap: 10px;
  padding: 8px 10px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; margin-bottom: 6px;
}
.batch-pay-order-row:last-child { margin-bottom: 0; }
.batch-pay-order-left { flex: 1; min-width: 0; }
.batch-pay-asin { font-size: 13px; font-weight: 600; color: #1e40af; }
.batch-pay-order-detail { font-size: 11px; color: #6b7280; margin-top: 1px; }
.batch-pay-order-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
.batch-pay-order-expected { font-size: 12px; color: #6b7280; white-space: nowrap; }
.batch-pay-debt-label { font-size: 12px; color: #dc2626; font-weight: 600; white-space: nowrap; }
.batch-pay-surplus-label { font-size: 12px; color: #2563eb; font-weight: 600; white-space: nowrap; }
.batch-pay-no-debt { font-size: 12px; color: #10b981; white-space: nowrap; }
.batch-pay-summary-tags { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.batch-summary-owed { font-size: 12px; background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; border-radius: 4px; padding: 1px 8px; font-weight: 600; }
.batch-summary-surplus { font-size: 12px; background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; border-radius: 4px; padding: 1px 8px; font-weight: 600; }
.batch-summary-net { font-size: 12px; border-radius: 4px; padding: 1px 8px; font-weight: 700; }
.batch-summary-net-pos { background: #f0fdf4; color: #059669; border: 1px solid #bbf7d0; }
.batch-summary-net-neg { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
.batch-pay-fields { display: flex; flex-direction: column; gap: 12px; }
.batch-pay-field { display: flex; flex-direction: column; gap: 4px; }
.batch-pay-field-row { display: flex; gap: 12px; }
.batch-pay-label { font-size: 13px; font-weight: 500; color: #374151; }
.batch-pay-upload-area { background: #fafafa; border: 1px dashed #d1d5db; border-radius: 8px; padding: 8px 12px; }
.batch-pay-upload-btn { display: flex; flex-direction: column; align-items: center; justify-content: center; color: #6b7280; }

.billing-summary-row {
  display: flex; align-items: stretch; gap: 0; margin-bottom: 12px;
  background: #f8fafc; border-radius: 8px; border: 1px solid #e5e7eb; overflow: hidden;
}
.billing-summary-item {
  flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 12px 10px; gap: 3px; text-align: center;
}
.billing-summary-divider { width: 1px; background: #e5e7eb; flex-shrink: 0; }
.billing-summary-label { font-size: 11px; color: #6b7280; font-weight: 500; letter-spacing: 0.3px; }
.billing-summary-val { font-size: 16px; font-weight: 700; color: #111827; }
.billing-summary-hint { font-size: 11px; color: #9ca3af; }
.billing-status-row { display: flex; flex-wrap: wrap; gap: 0; }
.billing-status-row .billing-info-row { margin-right: 20px; }
.payment-records-title {
  font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase;
  letter-spacing: 0.5px; margin: 14px 0 8px; padding-bottom: 6px;
  border-bottom: 1px solid #f3f4f6;
}

.task-group-badge {
  display: inline-flex; align-items: center; gap: 3px; margin-top: 3px;
  background: #f5f3ff; color: #7c3aed; border: 1px solid #ddd6fe;
  border-radius: 4px; padding: 1px 6px; font-size: 11px; cursor: pointer;
  white-space: nowrap; max-width: 160px; overflow: hidden; text-overflow: ellipsis;
  transition: background 0.15s;
}
.task-group-badge:hover { background: #ede9fe; }
.task-group-form { display: flex; flex-direction: column; gap: 14px; padding: 4px 0; }
.task-group-hint { font-size: 13px; color: #6b7280; background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 8px; padding: 10px 14px; }
.task-group-field { display: flex; flex-direction: column; gap: 4px; }
.task-group-label { font-size: 13px; font-weight: 500; color: #374151; }
.task-group-orders-preview { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
.task-group-preview-title { font-size: 12px; color: #6b7280; margin-bottom: 8px; font-weight: 500; }
.task-group-order-row { display: flex; align-items: center; gap: 8px; padding: 5px 0; border-bottom: 1px solid #f3f4f6; font-size: 12px; }
.task-group-order-row:last-child { border-bottom: none; }
.task-group-order-num { font-weight: 600; color: #1e40af; }
.task-group-order-asin { color: #6b7280; flex: 1; }
.task-group-order-amount { font-weight: 600; color: #374151; }
.task-group-total { font-size: 13px; font-weight: 600; color: #374151; margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb; }

.group-detail-body { display: flex; flex-direction: column; gap: 16px; }
.group-detail-meta { display: flex; flex-wrap: wrap; gap: 16px; background: #f5f3ff; border-radius: 8px; padding: 12px 16px; }
.group-detail-item { font-size: 13px; color: #374151; }
.gd-label { color: #6b7280; }
.group-detail-orders { display: flex; flex-direction: column; gap: 4px; }
.gd-section-title { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
.gd-order-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #f9fafb; border-radius: 6px; border: 1px solid #e5e7eb; }
.gd-order-left { display: flex; align-items: center; gap: 10px; }
.gd-order-asin { font-size: 12px; color: #6b7280; }
.gd-order-right { display: flex; align-items: center; gap: 6px; }
.gd-order-amount { font-size: 13px; font-weight: 600; color: #374151; }
.group-detail-summary { display: flex; gap: 16px; padding: 10px 14px; background: #f8fafc; border-radius: 8px; border: 1px solid #e5e7eb; font-size: 13px; }
.gd-debt { color: #dc2626; font-weight: 600; }
.gd-surplus { color: #2563eb; font-weight: 600; }
.group-detail-actions { display: flex; gap: 8px; align-items: center; }
.gd-notes { font-size: 12px; color: #6b7280; padding: 8px 12px; background: #f9fafb; border-radius: 6px; }
</style>
