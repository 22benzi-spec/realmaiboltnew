<template>
  <div class="page-content">
    <h1 class="page-title">付款审批</h1>

    <a-tabs v-model:activeKey="activeTab" @change="handleTabChange">
      <a-tab-pane key="paypal" tab="贝宝返款" />
      <a-tab-pane key="gift" tab="礼品卡返款" />
      <a-tab-pane key="other" tab="其他付款" />
    </a-tabs>

    <div class="card-panel">
      <div class="toolbar">
        <a-input-search
          v-model:value="filterSearch"
          :placeholder="searchPlaceholder"
          style="width:260px"
          @search="reloadFromFirstPage"
          allow-clear
          @change="onSearchChange"
        />
        <a-select
          v-if="activeTab === 'other'"
          v-model:value="filterOtherPrimaryCategory"
          style="width:140px"
          @change="onOtherFilterPrimaryChange"
          allow-clear
          placeholder="一级分类"
        >
          <a-select-option v-for="item in otherPaymentPrimaryOptions" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
        </a-select>
        <a-select
          v-if="activeTab === 'other'"
          v-model:value="filterOtherCategory"
          style="width:150px"
          @change="reloadFromFirstPage"
          allow-clear
          placeholder="二级分类"
        >
          <a-select-option v-for="item in otherPaymentFilterSecondaryOptions" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
        </a-select>
        <a-select
          v-if="activeTab === 'paypal'"
          v-model:value="selectedPaypalAccountId"
          style="width:280px"
          placeholder="选择我方转款 PayPal 邮箱"
          show-search
          option-filter-prop="label"
        >
          <a-select-option v-for="acc in paypalAccounts" :key="acc.id" :value="acc.id" :label="acc.email">
            <div>{{ acc.email }}</div>
            <div class="select-sub">{{ acc.account_alias }} · {{ acc.owner_name }}</div>
          </a-select-option>
        </a-select>
        <a-button @click="load"><ReloadOutlined /> 刷新</a-button>
        <a-button v-if="activeTab === 'other'" type="primary" @click="openOtherSubmitModal">提交付款</a-button>
        <span class="total-hint">{{ pagination.total }} 条</span>
      </div>

      <div v-if="activeTab === 'paypal'" class="queue-hint">
        <span>先在顶部选择我方转款贝宝邮箱，再针对子订单点击「返款」即可处理。</span>
      </div>
      <div v-if="activeTab === 'gift'" class="queue-hint">
        <span>点击「礼品卡返款」会弹出抽屉，展示礼品卡剩余库存和推荐返款面值组合。</span>
      </div>
      <div v-if="activeTab === 'other'" class="queue-hint">
        <span>其他付款同时承接业务支出、运营支出、行政办公等付款申请；未关联订单的行政/运营付款会在关联订单列显示为 --。</span>
      </div>
      <div v-if="selectedBatchRows.length" class="batch-bar">
        <span>已选择 <strong>{{ selectedBatchRows.length }}</strong> 条</span>
        <span>{{ batchTargetLabel }}</span>
        <span>自动合计 <strong>{{ selectedBatchTotalText }}</strong></span>
        <a-button v-if="activeTab === 'paypal'" type="primary" size="small" @click="openPaypalProcess(undefined, true)">批量返款</a-button>
        <a-button v-else-if="activeTab === 'gift'" type="primary" size="small" @click="openGiftProcess(undefined, true)">批量礼品卡返款</a-button>
        <a-button v-else type="primary" size="small" @click="openOtherProcess(undefined, true)">批量处理付款</a-button>
        <a-button size="small" @click="clearBatchSelection">清空</a-button>
      </div>

      <a-table
        :columns="tableColumns"
        :data-source="requests"
        :loading="loading"
        :pagination="pagination"
        :row-selection="rowSelection"
        row-key="id"
        size="middle"
        :scroll="{ x: 1380 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'info'">
            <div class="cell-info">
              <div class="cell-subno">{{ record.sub_order_number || record.sub_order_id || '—' }}</div>
              <div class="cell-product">{{ record.product_name || record.customer_name || '—' }}</div>
              <div class="cell-meta">{{ activeTab === 'other' ? (record.applicant_name || '—') : (record.asin || '—') }} · {{ record.store_name || record.payout_account || '—' }}</div>
            </div>
          </template>
          <template v-if="column.key === 'buyer'">
            <div>{{ record.buyer_name || '—' }}</div>
          </template>
          <template v-if="column.key === 'paypal_email'">
            <span class="mono-cell">{{ record.buyer_paypal_email || '—' }}</span>
          </template>
          <template v-if="column.key === 'receipt_required'">
            <a-tag :color="record._receipt_required === '需要' ? 'orange' : 'default'">{{ record._receipt_required || '不需要' }}</a-tag>
          </template>
          <template v-if="column.key === 'refund_times'">
            <span>{{ record._refund_times_label || '首次' }}</span>
          </template>
          <template v-if="column.key === 'notes_col'">
            <span class="note-preview">{{ record.notes || '—' }}</span>
          </template>
          <template v-if="column.key === 'receipt'">
            <a-space size="small">
              <a v-if="record.paypal_receipt_screenshot" :href="record.paypal_receipt_screenshot" target="_blank" class="result-link">查看水单</a>
              <a
                v-if="activeTab === 'paypal'"
                class="re-edit-link"
                @click="openPaypalReceipt(record)"
              >{{ record.paypal_receipt_screenshot ? '补传水单' : '上传水单' }}</a>
              <a
                v-else-if="activeTab === 'other' && record.status === '待处理'"
                class="re-edit-link"
                @click="openOtherProcess(record)"
              >{{ record.paypal_receipt_screenshot ? '补传水单' : '上传水单' }}</a>
            </a-space>
          </template>
          <template v-if="column.key === 'refund_method'">
            <a-tag :color="methodColor(record.refund_method)">{{ refundMethodLabel(record) }}</a-tag>
            <div v-if="record.refund_sequence" class="cell-seq">{{ record.refund_sequence }}</div>
          </template>
          <template v-if="column.key === 'refund_amount'">
            <span class="amount-usd">{{ formatRecordAmount(record) }}</span>
            <div v-if="activeTab === 'other' && getOtherUsdAmount(record) > 0" class="cell-product-price">
              USD ${{ money(getOtherUsdAmount(record)) }} / 汇率 {{ formatExchangeRate(getOtherExchangeRate(record)) }}
            </div>
            <div v-if="activeTab === 'other' && otherRefundOrderCountLabel(record)" class="cell-product-price">退款单量 {{ otherRefundOrderCountLabel(record) }}</div>
            <div v-else-if="record.product_price" class="cell-product-price">产品售价 ${{ money(record.product_price) }}</div>
          </template>
          <template v-if="column.key === 'refund_category'">
            <div class="type-stack">
              <span class="type-primary">{{ getOtherPaymentPrimaryLabel(record) }}</span>
              <span class="type-secondary">{{ getOtherPaymentSecondaryLabel(record) }}</span>
              <span v-if="record.refund_reason" class="type-reason">{{ record.refund_reason }}</span>
            </div>
          </template>
          <template v-if="column.key === 'order_ref'">
            <span class="mono-cell">{{ formatLinkedId(record.order_id) }}</span>
          </template>
          <template v-if="column.key === 'sub_order_ref'">
            <span class="mono-cell">{{ formatLinkedId(record.sub_order_id) }}</span>
          </template>
          <template v-if="column.key === 'payout_account'">
            <div>{{ record.payout_account || '—' }}</div>
            <div v-if="getProcessMetaText(record)" class="cell-product-price">
              {{ getProcessMetaText(record) }}
            </div>
          </template>
          <template v-if="column.key === 'refund_order_count'">
            <span>{{ otherRefundOrderCountLabel(record) || '—' }}</span>
          </template>
          <template v-if="column.key === 'action'">
            <a-space size="small" wrap>
              <a-button
                v-if="activeTab === 'paypal' && record.status === '待处理'"
                type="primary"
                size="small"
                @click="openPaypalProcess(record)"
              >返款</a-button>
              <a-button
                v-else-if="activeTab === 'gift' && record.status === '待处理'"
                type="primary"
                size="small"
                @click="openGiftProcess(record)"
              >礼品卡返款</a-button>
              <a-button
                v-else-if="activeTab === 'other' && record.status === '待处理'"
                type="primary"
                size="small"
                @click="openOtherProcess(record)"
              >处理付款</a-button>
              <span v-else class="text-gray">—</span>
            </a-space>
          </template>
        </template>
      </a-table>
    </div>

    <a-drawer v-model:open="detailOpen" title="退款详情" width="620" placement="right">
      <template v-if="currentRequest">
        <div class="drawer-section">
          <div class="drawer-section-title">申请信息</div>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">子订单号</span>
              <span class="detail-val mono">{{ currentRequest.sub_order_number }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">买手</span>
              <span class="detail-val">{{ currentRequest.buyer_name || '—' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">付款方式</span>
              <span class="detail-val">{{ refundMethodLabel(currentRequest) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">申请金额</span>
              <span class="detail-val amount-usd-lg">{{ formatRecordAmount(currentRequest) }}</span>
            </div>
            <div v-if="activeTab === 'other' && getOtherUsdAmount(currentRequest) > 0" class="detail-item">
              <span class="detail-label">外币金额</span>
              <span class="detail-val">${{ money(getOtherUsdAmount(currentRequest)) }}</span>
            </div>
            <div v-if="activeTab === 'other' && getOtherExchangeRate(currentRequest) > 0" class="detail-item">
              <span class="detail-label">汇率</span>
              <span class="detail-val">{{ formatExchangeRate(getOtherExchangeRate(currentRequest)) }}</span>
            </div>
            <div v-if="activeTab === 'other'" class="detail-item">
              <span class="detail-label">交易类型</span>
              <span class="detail-val">{{ getOtherPaymentPrimaryLabel(currentRequest) }} / {{ getOtherPaymentSecondaryLabel(currentRequest) }}</span>
            </div>
            <div v-if="activeTab === 'other'" class="detail-item">
              <span class="detail-label">关联主订单ID</span>
              <span class="detail-val mono">{{ formatLinkedId(currentRequest.order_id) }}</span>
            </div>
            <div v-if="activeTab === 'other'" class="detail-item">
              <span class="detail-label">关联子订单ID</span>
              <span class="detail-val mono">{{ formatLinkedId(currentRequest.sub_order_id) }}</span>
            </div>
            <div v-if="activeTab === 'other' && currentRequest.refund_reason" class="detail-item">
              <span class="detail-label">用途</span>
              <span class="detail-val">{{ currentRequest.refund_reason }}</span>
            </div>
            <div v-if="otherRefundOrderCountLabel(currentRequest)" class="detail-item">
              <span class="detail-label">退款单量</span>
              <span class="detail-val">{{ otherRefundOrderCountLabel(currentRequest) }}</span>
            </div>
            <div v-if="currentRequest.request_type && currentRequest.request_type !== 'initial'" class="detail-item">
              <span class="detail-label">申请类型</span>
              <span class="detail-val">{{ requestTypeLabel(currentRequest.request_type) }}</span>
            </div>
            <div v-if="currentRequest.supplement_reason" class="detail-item full">
              <span class="detail-label">原因说明</span>
              <span class="detail-val">{{ currentRequest.supplement_reason }}</span>
            </div>
            <div v-if="activeTab === 'other'" class="detail-item full">
              <span class="detail-label">收款账号</span>
              <span class="detail-val mono">{{ currentRequest.payout_account || '—' }}</span>
            </div>
            <div v-if="activeTab === 'other' && getProcessMethodText(currentRequest) !== '--'" class="detail-item">
              <span class="detail-label">付款方式</span>
              <span class="detail-val">{{ getProcessMethodText(currentRequest) }}</span>
            </div>
            <div v-if="activeTab === 'other' && getProcessAccountText(currentRequest) !== '--'" class="detail-item">
              <span class="detail-label">付款账号</span>
              <span class="detail-val mono">{{ getProcessAccountText(currentRequest) }}</span>
            </div>
            <div v-if="currentRequest.buyer_paypal_email" class="detail-item full">
              <span class="detail-label">买手 PayPal</span>
              <span class="detail-val mono">{{ currentRequest.buyer_paypal_email }}</span>
            </div>
            <div class="detail-item full">
              <span class="detail-label">产品</span>
              <span class="detail-val">{{ currentRequest.product_name || '—' }} ({{ currentRequest.asin || '—' }})</span>
            </div>
            <div v-if="currentRequest.notes" class="detail-item full">
              <span class="detail-label">业务员备注</span>
              <span class="detail-val">{{ currentRequest.notes }}</span>
            </div>
          </div>
        </div>

        <div class="drawer-section">
          <div class="drawer-section-title">处理结果</div>
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">处理人</span>
              <span class="detail-val">{{ handlerName(currentRequest) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">处理时间</span>
              <span class="detail-val">{{ fmtTime(currentRequest.handled_at) }}</span>
            </div>
            <div v-if="currentRequest.assigned_paypal_email" class="detail-item">
              <span class="detail-label">付款贝宝</span>
              <span class="detail-val mono">{{ currentRequest.assigned_paypal_email }}</span>
            </div>
            <div v-if="currentRequest.assigned_gift_card_number" class="detail-item full">
              <span class="detail-label">礼品卡号</span>
              <span class="detail-val pre-wrap mono">{{ currentRequest.assigned_gift_card_number }}</span>
            </div>
            <div v-if="currentRequest.assigned_gift_card_code" class="detail-item full">
              <span class="detail-label">礼品卡 Code</span>
              <span class="detail-val pre-wrap mono">{{ currentRequest.assigned_gift_card_code }}</span>
            </div>
            <div v-if="currentRequest.gift_card_face_value_usd" class="detail-item">
              <span class="detail-label">礼品卡面额</span>
              <span class="detail-val">${{ money(currentRequest.gift_card_face_value_usd) }}</span>
            </div>
            <div v-if="currentRequest.finance_notes" class="detail-item full">
              <span class="detail-label">账单备注</span>
              <span class="detail-val">{{ currentRequest.finance_notes }}</span>
            </div>
          </div>
          <div v-if="currentRequest.paypal_receipt_screenshot" class="detail-screenshot">
            <div class="detail-label">水单</div>
            <a :href="currentRequest.paypal_receipt_screenshot" target="_blank">
              <img :src="currentRequest.paypal_receipt_screenshot" class="screenshot-preview-img" referrerpolicy="no-referrer" @error="onImgError" />
            </a>
          </div>
        </div>
      </template>
    </a-drawer>

    <a-modal
      v-model:open="paypalProcessOpen"
      :title="paypalModalMode === 'receipt' ? '上传水单' : '贝宝返款'"
      width="560px"
      :confirm-loading="processing"
      @ok="handlePaypalProcess"
    >
      <div v-if="currentRequest" class="process-summary">
        <div>返款单数：<strong>{{ currentProcessRequests.length }}</strong></div>
        <div>子订单：<strong>{{ currentProcessSubOrdersText }}</strong></div>
        <div>业务员：<strong>{{ currentProcessRequests[0]?.staff_name || '—' }}</strong></div>
        <div>返款次数：<strong>{{ currentProcessRequests.length > 1 ? '批量' : (currentRequest._refund_times_label || '首次') }}</strong></div>
        <div>申请金额：<strong>{{ currentProcessTotalText }}</strong></div>
        <div>买手邮箱：<strong>{{ currentProcessBuyerLabel }}</strong></div>
      </div>
      <a-form layout="vertical">
        <a-form-item v-if="paypalModalMode !== 'receipt'" label="我方转款贝宝邮箱">
          <a-select v-model:value="selectedPaypalAccountId" style="width:100%" placeholder="选择公司 PayPal 账号" show-search option-filter-prop="label">
            <a-select-option v-for="acc in paypalAccounts" :key="acc.id" :value="acc.id" :label="acc.email">
              <div>{{ acc.email }}</div>
              <div class="select-sub">{{ acc.account_alias }} · {{ acc.owner_name }}</div>
            </a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="水单是否需要">
          <a-select :value="currentRequest?._receipt_required || '不需要'" style="width:100%" disabled>
            <a-select-option v-for="item in receiptNeedOptions" :key="item" :value="item">{{ item }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="水单截图 URL">
          <a-input v-model:value="paypalProcessForm.receipt" placeholder="粘贴水单截图 URL..." />
        </a-form-item>
        <a-form-item label="账单备注">
          <a-textarea v-model:value="paypalProcessForm.notes" :rows="3" placeholder="可选" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-drawer v-model:open="giftProcessOpen" title="礼品卡返款" width="760" placement="right">
      <template v-if="currentRequest">
        <div class="process-summary">
          <div>返款单数：<strong>{{ currentProcessRequests.length }}</strong></div>
          <div>子订单：<strong>{{ currentProcessSubOrdersText }}</strong></div>
          <div>业务员：<strong>{{ currentProcessRequests[0]?.staff_name || '—' }}</strong></div>
          <div>返款次数：<strong>{{ currentProcessRequests.length > 1 ? '批量' : (currentRequest._refund_times_label || '首次') }}</strong></div>
          <div>需返金额：<strong>{{ currentProcessTotalText }}</strong></div>
        </div>

        <div class="drawer-section">
          <div class="gift-filter-row">
            <a-select
              v-model:value="selectedGiftFaceValues"
              mode="multiple"
              allow-clear
              placeholder="筛选参与推荐的面值，不选默认全部"
              style="width:100%"
              @change="handleGiftFaceFilterChange"
            >
              <a-select-option v-for="face in giftFaceOptions" :key="face" :value="face">
                ${{ money(face) }}
              </a-select-option>
            </a-select>
          </div>
          <div class="drawer-section-title">剩余库存</div>
          <div v-if="giftInventorySpecs.length" class="inventory-grid">
            <div v-for="item in giftInventorySpecs" :key="item.faceValue" class="inventory-card">
              <span class="inventory-face">${{ money(item.faceValue) }}</span>
              <span class="inventory-count">剩余 {{ item.count }} 张</span>
            </div>
          </div>
          <a-empty v-else description="当前筛选下暂无可用面额" />
        </div>

        <div class="drawer-section">
          <div class="drawer-section-title">推荐返款组合</div>
          <div v-if="giftRecommendations.length" class="recommend-list">
            <div
              v-for="item in giftRecommendations"
              :key="item.id"
              :class="['recommend-card', selectedGiftRecommendationId === item.id ? 'active' : '']"
              @click="selectedGiftRecommendationId = item.id"
            >
              <div class="recommend-head">
                <span class="recommend-total">合计 ${{ money(item.total) }}</span>
                <span class="recommend-overpay">刚好匹配</span>
              </div>
              <div class="recommend-summary">{{ item.summary }}</div>
            </div>
          </div>
          <a-empty v-else description="当前面额无法支持返款" />
        </div>

        <a-form layout="vertical">
        <a-form-item label="账单备注">
            <a-textarea v-model:value="giftProcessForm.notes" :rows="3" placeholder="可选" />
          </a-form-item>
        </a-form>

        <div class="drawer-footer">
          <a-button @click="giftProcessOpen = false">取消</a-button>
          <a-button type="primary" :loading="processing" @click="handleGiftProcess">确认礼品卡返款</a-button>
        </div>
      </template>
    </a-drawer>

    <a-modal
      v-model:open="otherProcessOpen"
      title="处理其他付款"
      width="560px"
      :confirm-loading="processing"
      @ok="handleOtherProcess"
    >
      <div v-if="currentRequest" class="process-summary">
        <div>付款单数：<strong>{{ currentProcessRequests.length }}</strong></div>
        <div>关联主订单ID：<strong>{{ currentProcessOrderIdsText }}</strong></div>
        <div>关联子订单ID：<strong>{{ currentProcessSubOrdersText }}</strong></div>
        <div>收款对象：<strong>{{ currentProcessRequests[0]?.customer_name || '—' }}</strong></div>
        <div>申请人：<strong>{{ currentProcessRequests[0]?.applicant_name || '—' }}</strong></div>
        <div>收款账号：<strong>{{ currentProcessRequests[0]?.payout_account || '—' }}</strong></div>
        <div v-if="currentProcessOtherOrderCountText">退款单量：<strong>{{ currentProcessOtherOrderCountText }}</strong></div>
        <div>交易类型：<strong>{{ currentProcessCategoryText }}</strong></div>
        <div>申请金额：<strong>{{ currentProcessTotalText }}</strong></div>
        <div v-if="showOtherProcessUsdFields">外币金额：<strong>${{ money(otherProcessForm.amountUsd) }}</strong></div>
        <div v-if="showOtherProcessUsdFields">汇率：<strong>{{ formatExchangeRate(otherProcessForm.exchangeRate) }}</strong></div>
      </div>
      <a-form layout="vertical">
        <a-form-item label="一级分类">
          <a-input :value="otherProcessForm.primaryCategory" readonly />
        </a-form-item>
        <a-form-item label="二级分类">
          <a-select :value="otherProcessForm.category" mode="multiple" style="width:100%" disabled>
            <a-select-option v-for="item in otherProcessSecondaryOptions" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item v-if="showOtherProcessUsdFields" label="金额 (USD)">
          <a-input-number :value="otherProcessForm.amountUsd" style="width:100%" disabled />
        </a-form-item>
        <a-form-item v-if="showOtherProcessUsdFields" label="汇率">
          <a-input-number :value="otherProcessForm.exchangeRate" style="width:100%" disabled />
        </a-form-item>
        <a-form-item label="付款方式" required>
          <a-select v-model:value="otherProcessForm.paymentMethod" style="width:100%">
            <a-select-option v-for="item in payoutMethodOptions" :key="item" :value="item">{{ item }}</a-select-option>
          </a-select>
        </a-form-item>
        <a-form-item label="付款账号" required>
          <a-input v-model:value="otherProcessForm.paymentAccount" placeholder="填写本次财务付款账号" />
        </a-form-item>
        <a-form-item label="水单截图 URL">
          <a-input v-model:value="otherProcessForm.receipt" placeholder="粘贴水单截图 URL..." />
        </a-form-item>
        <a-form-item label="账单备注">
          <a-textarea v-model:value="otherProcessForm.notes" :rows="3" placeholder="可选" />
        </a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:open="otherSubmitOpen"
      title="提交付款申请"
      width="680px"
      :confirm-loading="submittingOther"
      @ok="handleOtherSubmit"
    >
      <a-form layout="vertical">
        <a-row :gutter="16">
          <a-col :span="12">
            <a-form-item label="一级分类" required>
              <a-select v-model:value="otherSubmitForm.primaryCategory" @change="onOtherSubmitPrimaryChange">
                <a-select-option v-for="item in otherPaymentPrimaryOptions" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="二级分类" required>
              <a-select v-model:value="otherSubmitForm.category" mode="multiple">
                <a-select-option v-for="item in otherSubmitSecondaryOptions" :key="item.value" :value="item.value">{{ item.label }}</a-select-option>
              </a-select>
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="申请人" required>
              <a-input v-model:value="otherSubmitForm.applicantName" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="收款对象" required>
              <a-input v-model:value="otherSubmitForm.customerName" placeholder="例如：供应商、服务商、客户公司" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="收款账号" required>
              <a-input v-model:value="otherSubmitForm.payoutAccount" placeholder="银行卡 / 支付宝 / 对公账户等" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="申请金额(人民币)" required>
              <a-input-number v-model:value="otherSubmitForm.amountCny" :min="0" :precision="2" style="width:100%" />
            </a-form-item>
          </a-col>
          <a-col v-if="showOtherSubmitUsdFields" :span="12">
            <a-form-item label="金额 (USD)" required>
              <a-input-number v-model:value="otherSubmitForm.amountUsd" :min="0" :precision="2" style="width:100%" placeholder="美金金额" />
            </a-form-item>
          </a-col>
          <a-col v-if="showOtherSubmitUsdFields" :span="12">
            <a-form-item label="汇率" required>
              <a-input-number v-model:value="otherSubmitForm.exchangeRate" :min="0" :precision="4" style="width:100%" placeholder="例如 7.2500" />
            </a-form-item>
          </a-col>
          <a-col :span="12">
            <a-form-item label="用途" required>
              <a-input v-model:value="otherSubmitForm.reason" placeholder="例如：办公室采购、服务器续费、截单退款" />
            </a-form-item>
          </a-col>
          <a-col :span="24">
            <a-alert
              type="info"
              show-icon
              message="提交阶段仅填写申请信息；付款方式、付款账号由财务在“处理付款”时补录。未关联订单的申请在审批列表里会显示为 --。"
              style="margin-bottom: 12px"
            />
          </a-col>
          <a-col :span="24">
            <a-form-item label="备注">
              <a-textarea v-model:value="otherSubmitForm.notes" :rows="3" placeholder="可选" />
            </a-form-item>
          </a-col>
        </a-row>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'
import { useCurrentUser } from '../composables/useCurrentUser'

const QUEUE_PAYPAL_EXTRA_KEY = 'refund-queue-extra-paypal-v1'
const QUEUE_GIFT_EXTRA_KEY = 'refund-queue-extra-gift-v1'

const activeTab = ref<'paypal' | 'gift' | 'other'>('paypal')
const loading = ref(false)
const processing = ref(false)
const requests = ref<any[]>([])
const currentRequest = ref<any>(null)
const currentProcessRequests = ref<any[]>([])
const detailOpen = ref(false)
const paypalProcessOpen = ref(false)
const giftProcessOpen = ref(false)
const otherProcessOpen = ref(false)
const otherSubmitOpen = ref(false)
const paypalAccounts = ref<any[]>([])
const availableGiftCards = ref<any[]>([])
const pagination = ref({ current: 1, pageSize: 20, total: 0 })
const { currentUser, loadFromStorage } = useCurrentUser()

const filterStatus = ref('待处理')
const filterSearch = ref('')
const filterOtherPrimaryCategory = ref<string | undefined>(undefined)
const filterOtherCategory = ref<string | undefined>(undefined)
const submittingOther = ref(false)
const selectedPaypalAccountId = ref('')
const selectedGiftRecommendationId = ref('')
const selectedGiftFaceValues = ref<number[]>([])
const selectedBatchRows = ref<any[]>([])
const paypalModalMode = ref<'process' | 'receipt'>('process')

const otherPaymentCategoryOptions = [
  {
    value: '业务支出',
    label: '业务支出',
    children: [
      { value: '截单退款', label: '截单退款' },
      { value: '赔付佣金', label: '赔付佣金' },
      { value: '退差价', label: '退差价' },
    ],
  },
  {
    value: '运营支出',
    label: '运营支出',
    children: [
      { value: 'IP采购', label: 'IP采购' },
      { value: '服务器', label: '服务器' },
      { value: '账号购买', label: '账号购买' },
      { value: '礼品卡', label: '礼品卡' },
      { value: '信用卡', label: '信用卡' },
    ],
  },
  {
    value: '行政办公',
    label: '行政办公',
    children: [
      { value: '行政支出', label: '行政支出' },
      { value: '行政冲销', label: '行政冲销' },
    ],
  },
  {
    value: '其他支出',
    label: '其他支出',
    children: [{ value: '其他支出', label: '其他支出' }],
  },
]
const otherPaymentPrimaryOptions = otherPaymentCategoryOptions.map(({ value, label }) => ({ value, label }))
const otherPaymentSecondaryToPrimaryMap = Object.fromEntries(
  otherPaymentCategoryOptions.flatMap(group => group.children.map(item => [item.value, group.value])),
) as Record<string, string>
const receiptNeedOptions = ['需要', '不需要']
const payoutMethodOptions = ['银行卡', '支付宝', '微信', '对公转账', '现金', '其他']
const extraMockPaypalRequests = ref<any[]>([])
const extraMockGiftRequests = ref<any[]>([])

const mockPaypalRequests = ref<any[]>([
  {
    id: 'mock-paypal-1',
    sub_order_id: 'SUB-PP-20260415-001',
    sub_order_number: 'SO-PP-20260415-001',
    buyer_name: '买手-Linda',
    buyer_paypal_email: 'linda.demo@gmail.com',
    product_name: 'USB Desk Lamp',
    asin: 'B0PAYPAL001',
    store_name: 'US Store A',
    staff_name: '业务员-陈晨',
    refund_method: 'PayPal',
    refund_amount_usd: 10,
    product_price: 29.99,
    status: '待处理',
    notes: '产品 1 退款 [需财务返款截图]',
    finance_notes: '',
    paypal_receipt_screenshot: '',
    created_at: dayjs().subtract(3, 'hour').toISOString(),
    handled_at: null,
  },
  {
    id: 'mock-paypal-2',
    sub_order_id: 'SUB-PP-20260415-002',
    sub_order_number: 'SO-PP-20260415-002',
    buyer_name: '买手-Linda',
    buyer_paypal_email: 'linda.demo@gmail.com',
    product_name: 'Portable Blender',
    asin: 'B0PAYPAL002',
    store_name: 'US Store A',
    staff_name: '业务员-陈晨',
    refund_method: 'PayPal',
    refund_amount_usd: 5,
    product_price: 21.5,
    status: '待处理',
    notes: '产品 2 退款，和上面一起打款',
    finance_notes: '',
    paypal_receipt_screenshot: '',
    created_at: dayjs().subtract(170, 'minute').toISOString(),
    handled_at: null,
  },
  {
    id: 'mock-paypal-3',
    sub_order_id: 'SUB-PP-20260414-009',
    sub_order_number: 'SO-PP-20260414-009',
    buyer_name: '买手-Jason',
    buyer_paypal_email: 'jason.demo@gmail.com',
    product_name: 'Mini Air Purifier',
    asin: 'B0PAYPAL003',
    store_name: 'US Store B',
    staff_name: '业务员-王薇',
    refund_method: 'PayPal',
    refund_amount_usd: 8.5,
    product_price: 35,
    status: '已处理',
    notes: '单笔返款示例',
    finance_notes: '已完成贝宝返款',
    paypal_receipt_screenshot: 'https://placehold.co/240x120/e2e8f0/64748b?text=PayPal+Receipt',
    created_at: dayjs().subtract(1, 'day').hour(11).minute(10).toISOString(),
    handled_at: dayjs().subtract(1, 'day').hour(12).minute(20).toISOString(),
  },
])

const mockGiftRequests = ref<any[]>([
  {
    id: 'mock-gift-1',
    sub_order_id: 'SUB-GC-20260415-001',
    sub_order_number: 'SO-GC-20260415-001',
    buyer_name: '买手-Amy',
    product_name: 'Silk Pillowcase',
    asin: 'B0GIFT001',
    store_name: 'US Store C',
    staff_name: '业务员-李妍',
    refund_method: '礼品卡',
    refund_amount_usd: 10,
    product_price: 24.8,
    status: '待处理',
    notes: '同一买手批量礼品卡返款示例',
    finance_notes: '',
    created_at: dayjs().subtract(4, 'hour').toISOString(),
    handled_at: null,
  },
  {
    id: 'mock-gift-2',
    sub_order_id: 'SUB-GC-20260415-002',
    sub_order_number: 'SO-GC-20260415-002',
    buyer_name: '买手-Amy',
    product_name: 'Phone Tripod',
    asin: 'B0GIFT002',
    store_name: 'US Store C',
    staff_name: '业务员-李妍',
    refund_method: '礼品卡',
    refund_amount_usd: 5,
    product_price: 18.6,
    status: '待处理',
    notes: '和上面一起退 15 美金，便于看推荐组合',
    finance_notes: '',
    created_at: dayjs().subtract(210, 'minute').toISOString(),
    handled_at: null,
  },
  {
    id: 'mock-gift-3',
    sub_order_id: 'SUB-GC-20260414-011',
    sub_order_number: 'SO-GC-20260414-011',
    buyer_name: '买手-Kevin',
    product_name: 'LED Strip Light',
    asin: 'B0GIFT003',
    store_name: 'US Store D',
    staff_name: '业务员-赵琪',
    refund_method: '礼品卡',
    refund_amount_usd: 12,
    product_price: 31.2,
    status: '已处理',
    notes: '历史礼品卡返款示例',
    finance_notes: '已发放礼品卡',
    assigned_gift_card_number: 'GC-7788-9900',
    assigned_gift_card_code: 'ABCD-EFGH-IJKL',
    gift_card_face_value_usd: 12,
    created_at: dayjs().subtract(2, 'day').hour(10).minute(5).toISOString(),
    handled_at: dayjs().subtract(2, 'day').hour(10).minute(55).toISOString(),
  },
])

const mockOtherRequests = ref<any[]>([
  {
    id: 'mock-other-1',
    order_id: 'ORD-20260415-001',
    sub_order_id: 'SUB-20260415-001',
    customer_name: '深圳星河科技',
    refund_reason: '产品截单付款',
    applicant_name: '商务-李婷',
    payout_account: 'alipay_shxhekeji@outlook.com',
    payout_method: '支付宝',
    refund_category: '截单退款',
    refund_method: '其他付款',
    refund_amount_cny: 268,
    status: '待处理',
    notes: '客户要求当天付款，已提供支付宝收款信息',
    finance_notes: '',
    paypal_receipt_screenshot: '',
    created_at: dayjs().subtract(2, 'hour').toISOString(),
    handled_at: null,
  },
  {
    id: 'mock-other-2',
    order_id: 'ORD-20260414-016',
    sub_order_id: 'SUB-20260414-064',
    customer_name: '宁波优品贸易',
    refund_reason: '任务取消付款',
    applicant_name: '商务-王晨',
    payout_account: '6222 8888 0199 7766',
    payout_method: '银行卡',
    refund_category: '退差价',
    refund_method: '其他付款',
    refund_amount_cny: 88,
    refund_order_count: 2,
    status: '待处理',
    notes: '同一客户第二笔付款，需要合并打款',
    finance_notes: '',
    paypal_receipt_screenshot: '',
    created_at: dayjs().subtract(1, 'day').hour(15).minute(42).toISOString(),
    handled_at: null,
  },
  {
    id: 'mock-other-2b',
    order_id: 'ORD-20260414-016',
    sub_order_id: 'SUB-20260414-063',
    customer_name: '宁波优品贸易',
    refund_reason: '任务取消付款',
    applicant_name: '商务-王晨',
    payout_account: '6222 8888 0199 7766',
    payout_method: '银行卡',
    refund_category: '退差价',
    refund_method: '其他付款',
    refund_amount_cny: 132,
    refund_order_count: 3,
    status: '待处理',
    notes: '主订单任务取消，需原路退回客户对公卡',
    finance_notes: '',
    paypal_receipt_screenshot: '',
    created_at: dayjs().subtract(1, 'day').hour(15).minute(30).toISOString(),
    handled_at: null,
  },
  {
    id: 'mock-other-3',
    order_id: 'ORD-20260413-008',
    sub_order_id: 'SUB-20260413-022',
    customer_name: '杭州远帆品牌',
    refund_reason: '佣金差额付款',
    applicant_name: '商务-周敏',
    payout_account: 'hz-yuanfan-finance@alipay',
    payout_method: '支付宝',
    refund_category: '赔付佣金',
    refund_method: '其他付款',
    refund_amount_cny: 56,
    refund_order_count: 1,
    status: '待处理',
    notes: '因佣金核算差额补付客户',
    finance_notes: '',
    paypal_receipt_screenshot: '',
    created_at: dayjs().subtract(2, 'day').hour(11).minute(12).toISOString(),
    handled_at: null,
  },
])

const paypalProcessForm = reactive({
  receipt: '',
  notes: '',
})

const giftProcessForm = reactive({
  notes: '',
})

const otherProcessForm = reactive({
  primaryCategory: '业务支出',
  category: ['截单退款'] as string[],
  amountUsd: 0,
  exchangeRate: 7.25,
  paymentMethod: '',
  paymentAccount: '',
  receipt: '',
  notes: '',
})
const otherSubmitForm = reactive({
  primaryCategory: '行政办公',
  category: ['行政支出'] as string[],
  applicantName: '',
  customerName: '',
  payoutAccount: '',
  amountCny: 0,
  amountUsd: 0,
  exchangeRate: 7.25,
  reason: '',
  notes: '',
})

const giftFaceOptions = computed(() =>
  Array.from(new Set(availableGiftCards.value.map(card => Number(card.face_value_usd || 0))))
    .filter(Boolean)
    .sort((a, b) => b - a),
)

const filteredGiftCards = computed(() => {
  if (!selectedGiftFaceValues.value.length) return availableGiftCards.value
  const faceSet = new Set(selectedGiftFaceValues.value.map(item => Number(item)))
  return availableGiftCards.value.filter(card => faceSet.has(Number(card.face_value_usd || 0)))
})

const otherPaymentFilterSecondaryOptions = computed(() => {
  if (filterOtherPrimaryCategory.value) {
    return otherPaymentCategoryOptions.find(item => item.value === filterOtherPrimaryCategory.value)?.children || []
  }
  return otherPaymentCategoryOptions.flatMap(item => item.children)
})

const otherProcessSecondaryOptions = computed(() =>
  otherPaymentCategoryOptions.find(item => item.value === otherProcessForm.primaryCategory)?.children || []
)
const otherSubmitSecondaryOptions = computed(() =>
  otherPaymentCategoryOptions.find(item => item.value === otherSubmitForm.primaryCategory)?.children || []
)
const showOtherSubmitUsdFields = computed(() => otherPaymentNeedsUsdFields(otherSubmitForm.category))
const showOtherProcessUsdFields = computed(() => otherPaymentNeedsUsdFields(otherProcessForm.category))

const giftInventorySpecs = computed(() => {
  const group = new Map<number, any[]>()
  for (const card of filteredGiftCards.value) {
    const face = Number(card.face_value_usd || 0)
    if (!group.has(face)) group.set(face, [])
    group.get(face)!.push(card)
  }
  return Array.from(group.entries())
    .map(([faceValue, cards]) => ({ faceValue, count: cards.length }))
    .sort((a, b) => b.faceValue - a.faceValue)
})

const giftRecommendations = computed(() => {
  const target = Number(currentProcessTotal.value || currentRequest.value?.refund_amount_usd || currentRequest.value?.refund_amount || 0)
  if (!target || !filteredGiftCards.value.length) return []
  const faceMap = new Map<number, any[]>()
  for (const card of filteredGiftCards.value) {
    const face = Number(card.face_value_usd || 0)
    if (!faceMap.has(face)) faceMap.set(face, [])
    faceMap.get(face)!.push(card)
  }
  const faces = Array.from(faceMap.keys()).sort((a, b) => b - a)
  const candidates: Array<{ counts: Record<number, number>; total: number; cardCount: number; values: number[] }> = []
  const maxCards = 8

  function pushCandidate(counts: Record<number, number>, total: number, cardCount: number) {
    const values = Object.entries(counts)
      .flatMap(([face, count]) => Array.from({ length: Number(count) }, () => Number(face)))
      .sort((a, b) => b - a)
    candidates.push({
      counts: { ...counts },
      total,
      cardCount,
      values,
    })
  }

  function dfs(index: number, total: number, counts: Record<number, number>, cardCount: number) {
    if (cardCount > maxCards || total > target) return
    if (total === target) {
      pushCandidate(counts, Number(total.toFixed(2)), cardCount)
      return
    }
    if (index >= faces.length) {
      return
    }

    const face = faces[index]
    const availableCount = faceMap.get(face)?.length || 0
    for (let use = availableCount; use >= 0; use--) {
      const nextTotal = Number((total + face * use).toFixed(2))
      const nextCount = cardCount + use
      if (use > 0) counts[face] = use
      else delete counts[face]
      dfs(index + 1, nextTotal, counts, nextCount)
    }
    delete counts[face]
  }

  dfs(0, 0, {}, 0)

  const unique = new Map<string, any>()
  candidates
    .filter(item => item.cardCount > 0)
    .sort((a, b) => a.cardCount - b.cardCount || b.values[0] - a.values[0])
    .forEach(candidate => {
      const summary = candidate.values.map(value => `$${money(value)}`).join(' + ')
      if (!summary || unique.has(summary)) return
      const cardIds: string[] = []
      const cardNumbers: string[] = []
      const cardCodes: string[] = []
      for (const [face, count] of Object.entries(candidate.counts)) {
        const cards = (faceMap.get(Number(face)) || []).slice(0, count)
        cardIds.push(...cards.map(card => card.id))
        cardNumbers.push(...cards.map(card => card.card_number))
        cardCodes.push(...cards.map(card => card.card_code))
      }
      unique.set(summary, {
        id: summary,
        total: candidate.total,
        summary,
        cardIds,
        cardNumbers,
        cardCodes,
      })
    })

  return Array.from(unique.values()).slice(0, 6)
})

const selectedGiftRecommendation = computed(() =>
  giftRecommendations.value.find(item => item.id === selectedGiftRecommendationId.value) || null,
)
const selectedBatchTotal = computed(() =>
  selectedBatchRows.value.reduce((sum, item) => sum + getAmountValue(item), 0),
)
const selectedBatchTotalText = computed(() => formatCurrency(selectedBatchTotal.value, activeTab.value === 'other' ? 'cny' : 'usd'))
const batchTargetLabel = computed(() => {
  const first = selectedBatchRows.value[0]
  if (!first) return ''
  if (activeTab.value === 'paypal') return `同一邮箱：${first.buyer_paypal_email || '—'}`
  if (activeTab.value === 'gift') return `同一买手：${first.buyer_name || '—'}`
  return `同一客户：${first.customer_name || '—'}`
})
const currentProcessTotal = computed(() =>
  currentProcessRequests.value.reduce((sum, item) => sum + getAmountValue(item), 0),
)
const currentProcessTotalText = computed(() => formatCurrency(currentProcessTotal.value, activeTab.value === 'other' ? 'cny' : 'usd'))
const currentProcessOtherOrderCountText = computed(() => {
  const total = currentProcessRequests.value.reduce((sum, item) => sum + getOtherRefundOrderCountValue(item), 0)
  return total ? `${total}单` : ''
})
const currentProcessSubOrdersText = computed(() =>
  currentProcessRequests.value
    .map(item => item.sub_order_number || item.sub_order_id || '—')
    .filter(Boolean)
    .join(' / '),
)
const currentProcessOrderIdsText = computed(() =>
  currentProcessRequests.value
    .map(item => item.order_id || '—')
    .filter(Boolean)
    .join(' / '),
)
const currentProcessBuyerLabel = computed(() => {
  const first = currentProcessRequests.value[0]
  if (!first) return '—'
  return first.buyer_paypal_email || first.buyer_name || '—'
})
const searchPlaceholder = computed(() =>
  activeTab.value === 'other'
    ? '搜索主订单ID/子订单ID/收款对象/用途/申请人...'
    : '搜索买手/订单号/产品...'
)
const rowSelection = computed(() => ({
  selectedRowKeys: selectedBatchRows.value.map(item => item.id),
  preserveSelectedRowKeys: false,
  onSelect: (record: any, selected: boolean) => {
    if (!selected) {
      selectedBatchRows.value = selectedBatchRows.value.filter(item => item.id !== record.id)
      return
    }
    if (!isSelectableRecord(record)) return
    if (selectedBatchRows.value.length > 0 && getBatchGroupKey(selectedBatchRows.value[0]) !== getBatchGroupKey(record)) {
      message.warning(`仅可勾选${batchGroupLabel()}的退款单进行批量处理`)
      return
    }
    selectedBatchRows.value = [...selectedBatchRows.value, record]
  },
  onSelectAll: (selected: boolean, selectedRows: any[]) => {
    if (!selected) {
      selectedBatchRows.value = []
      return
    }
    const rows = selectedRows.filter(isSelectableRecord)
    if (!rows.length) {
      selectedBatchRows.value = []
      return
    }
    const firstKey = getBatchGroupKey(rows[0])
    selectedBatchRows.value = rows.filter(item => getBatchGroupKey(item) === firstKey)
    if (selectedBatchRows.value.length !== rows.length) {
      message.warning(`已按${batchGroupLabel()}自动筛选可批量处理的记录`)
    }
  },
  getCheckboxProps: (record: any) => {
    const hasSelection = selectedBatchRows.value.length > 0
    const selectedKey = hasSelection ? getBatchGroupKey(selectedBatchRows.value[0]) : ''
    return {
      disabled: !isSelectableRecord(record) || (hasSelection && selectedKey !== getBatchGroupKey(record)),
    }
  },
}))

const tableColumns = computed(() => {
  if (activeTab.value === 'paypal') {
    return [
      { title: '子订单信息', key: 'info', width: 210 },
      { title: '业务员', dataIndex: 'staff_name', key: 'staff_name', width: 110 },
      { title: '返款截图是否需要', key: 'receipt_required', width: 130 },
      { title: '返款次数', key: 'refund_times', width: 90 },
      { title: '买手邮箱', key: 'paypal_email', width: 190 },
      { title: '备注', key: 'notes_col', width: 180 },
      { title: '申请金额', key: 'refund_amount', width: 120 },
      {
        title: '申请时间',
        dataIndex: 'created_at',
        key: 'created_at',
        width: 120,
        customRender: ({ text }: any) => text ? dayjs(text).format('MM-DD HH:mm') : '',
      },
      { title: '水单', key: 'receipt', width: 140 },
      { title: '操作', key: 'action', width: 90, fixed: 'right' as const },
    ]
  }
  if (activeTab.value === 'gift') {
    return [
      { title: '子订单信息', key: 'info', width: 220 },
      { title: '业务员', dataIndex: 'staff_name', key: 'staff_name', width: 110 },
      { title: '买手', key: 'buyer', width: 150 },
      { title: '返款次数', key: 'refund_times', width: 90 },
      { title: '备注', key: 'notes_col', width: 180 },
      { title: '申请金额', key: 'refund_amount', width: 120 },
      {
        title: '申请时间',
        dataIndex: 'created_at',
        key: 'created_at',
        width: 120,
        customRender: ({ text }: any) => text ? dayjs(text).format('MM-DD HH:mm') : '',
      },
      { title: '操作', key: 'action', width: 120, fixed: 'right' as const },
    ]
  }
  return [
    { title: '关联主订单ID', key: 'order_ref', width: 160 },
    { title: '关联子订单ID', key: 'sub_order_ref', width: 160 },
    { title: '收款对象', dataIndex: 'customer_name', key: 'customer_name', width: 140 },
    { title: '交易类型', key: 'refund_category', width: 180 },
    { title: '申请人', dataIndex: 'applicant_name', key: 'applicant_name', width: 120 },
    { title: '收款账号', key: 'payout_account', width: 180 },
    { title: '退款单量', key: 'refund_order_count', width: 100 },
    { title: '备注', key: 'notes_col', width: 180 },
    { title: '付款金额(人民币)', key: 'refund_amount', width: 130 },
    {
      title: '申请时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 120,
      customRender: ({ text }: any) => text ? dayjs(text).format('MM-DD HH:mm') : '',
    },
    { title: '水单', key: 'receipt', width: 140 },
    { title: '操作', key: 'action', width: 120, fixed: 'right' as const },
  ]
})

function annotateRefundRequests(data: any[]) {
  const sorted = [...(data || [])].sort((a, b) => dayjs(a.created_at).valueOf() - dayjs(b.created_at).valueOf())
  const countMap = new Map<string, number>()
  return sorted.map(row => {
    const key = row.sub_order_id || row.sub_order_number || row.id
    const next = (countMap.get(key) || 0) + 1
    countMap.set(key, next)
    return {
      ...row,
      _refund_times_label: next === 1 ? '首次' : `第${next}次`,
      _receipt_required: /\[需财务返款截图\]|\[需财务水单\]/.test(String(row.notes || '')) ? '需要' : '不需要',
    }
  }).sort((a, b) => dayjs(b.created_at).valueOf() - dayjs(a.created_at).valueOf())
}

function money(value: any) {
  return Number(value || 0).toFixed(2)
}

function formatExchangeRate(value: any) {
  return Number(value || 0).toFixed(4)
}

function csvCell(value: any) {
  const text = String(value ?? '').replace(/\r?\n/g, ' / ')
  return `"${text.replace(/"/g, '""')}"`
}

function downloadCsv(filename: string, headers: string[], rows: Array<Array<any>>) {
  const csv = ['\ufeff' + headers.map(csvCell).join(','), ...rows.map(row => row.map(csvCell).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

function getAmountValue(record: any) {
  if (!record) return 0
  if (['其他退款', '其他付款'].includes(record.refund_method) || activeTab.value === 'other') {
    return Number(record.refund_amount_cny || record.refund_amount || record.refund_amount_usd || 0)
  }
  return Number(record.refund_amount_usd || record.refund_amount || 0)
}

function formatCurrency(value: any, currency: 'usd' | 'cny' = 'usd') {
  return `${currency === 'cny' ? '￥' : '$'}${money(value)}`
}

function formatRecordAmount(record: any) {
  return formatCurrency(getAmountValue(record), ['其他退款', '其他付款'].includes(record?.refund_method) || activeTab.value === 'other' ? 'cny' : 'usd')
}

const UUID_LIKE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function formatLinkedId(value: any) {
  const text = String(value || '').trim()
  return text || '--'
}

function parseOtherPaymentSecondaryValues(value: any) {
  const raw = Array.isArray(value) ? value : String(value || '').split('|')
  return raw.map(item => String(item || '').trim()).filter(Boolean)
}

function otherPaymentNeedsUsdFields(value: any) {
  const values = parseOtherPaymentSecondaryValues(value)
  return values.includes('礼品卡') || values.includes('信用卡')
}

function resolveOtherPaymentCategories(record: any) {
  const rawCategory = String(record?.refund_category || '').trim()
  const rawCategoryValues = parseOtherPaymentSecondaryValues(record?.refund_category)
  const reason = String(record?.refund_reason || '').trim()
  const text = `${rawCategory} ${reason} ${record?.notes || ''} ${record?.finance_notes || ''}`

  if (rawCategoryValues.length && rawCategoryValues.every(item => otherPaymentSecondaryToPrimaryMap[item])) {
    return { primary: otherPaymentSecondaryToPrimaryMap[rawCategoryValues[0]], secondary: rawCategoryValues.join(' / ') }
  }
  if (otherPaymentSecondaryToPrimaryMap[rawCategory]) {
    return { primary: otherPaymentSecondaryToPrimaryMap[rawCategory], secondary: rawCategory }
  }
  if (rawCategory === '佣金付款') return { primary: '业务支出', secondary: '赔付佣金' }
  if (rawCategory === '任务付款') return { primary: '业务支出', secondary: '退差价' }
  if (rawCategory === '其他业务付款' && /截单|取消|撤单/.test(text)) return { primary: '业务支出', secondary: '截单退款' }
  if (/佣金/.test(text)) return { primary: '业务支出', secondary: '赔付佣金' }
  if (/差价|补差|任务/.test(text)) return { primary: '业务支出', secondary: '退差价' }
  if (/截单|退款|撤单/.test(text)) return { primary: '业务支出', secondary: '截单退款' }
  if (/ip|代理|网络/i.test(text)) return { primary: '运营支出', secondary: 'IP采购' }
  if (/服务器|server/i.test(text)) return { primary: '运营支出', secondary: '服务器' }
  if (/账号/.test(text)) return { primary: '运营支出', secondary: '账号购买' }
  if (/礼品卡/.test(text)) return { primary: '运营支出', secondary: '礼品卡' }
  if (/信用卡|卡费/.test(text)) return { primary: '运营支出', secondary: '信用卡' }
  if (/行政|办公|人事|工资/.test(text)) return { primary: '行政办公', secondary: '行政支出' }
  return { primary: '其他支出', secondary: '其他支出' }
}

function getOtherPaymentPrimaryLabel(record: any) {
  return resolveOtherPaymentCategories(record).primary
}

function getOtherPaymentSecondaryLabel(record: any) {
  return parseOtherPaymentSecondaryValues(record?.refund_category).join(' / ') || resolveOtherPaymentCategories(record).secondary
}

function getOtherPaymentTypeText(record: any) {
  const { primary, secondary } = resolveOtherPaymentCategories(record)
  return `${primary} / ${secondary}`
}

function normalizeOtherRequestRow(record: any) {
  return {
    ...record,
    refund_method: record?.refund_method || '其他付款',
    applicant_name: record?.applicant_name || record?.staff_name || '',
    payout_method: record?.payout_method || '',
    payout_account: record?.payout_account || '',
    customer_name: record?.customer_name || '',
    refund_reason: record?.refund_reason || '',
    refund_amount_usd: Number(record?.refund_amount_usd || 0),
    exchange_rate: record?.exchange_rate ? Number(record.exchange_rate) : null,
  }
}

function getOtherUsdAmount(record: any) {
  return Number(record?.refund_amount_usd || 0)
}

function getOtherExchangeRate(record: any) {
  return Number(record?.exchange_rate || 0)
}

function buildOtherPaymentLedgerNote(record: any, financeNotes: string) {
  return [
    '付款审批',
    getOtherPaymentTypeText(record),
    record?.refund_reason || '',
    record?.payout_method || '',
    financeNotes || '',
  ].filter(Boolean).join(' | ')
}

async function insertOtherPaymentTransactions(records: any[], handledAt: string) {
  if (!records.length) return
  const orderIds = Array.from(new Set(
    records
      .map(item => String(item.order_id || ''))
      .filter(id => UUID_LIKE_RE.test(id)),
  ))
  const orderNumberMap = new Map<string, string>()
  if (orderIds.length) {
    const { data: orders, error: orderError } = await supabase
      .from('erp_orders')
      .select('id, order_number')
      .in('id', orderIds)
    if (orderError) throw orderError
    ;(orders || []).forEach(item => orderNumberMap.set(item.id, item.order_number || ''))
  }

  for (const record of records) {
    const amountCny = Number(record.refund_amount_cny || record.refund_amount || 0)
    if (amountCny <= 0) continue
    const { data: txNo, error: txNoError } = await supabase.rpc('generate_transaction_no')
    if (txNoError) throw txNoError
    const { primary, secondary } = resolveOtherPaymentCategories(record)
    const secondaryValues = parseOtherPaymentSecondaryValues(record.refund_category)
    const amountUsd = otherPaymentNeedsUsdFields(record.refund_category) ? Number(record.refund_amount_usd || 0) : 0
    const exchangeRate = otherPaymentNeedsUsdFields(record.refund_category) ? Number(record.exchange_rate || 0) : 0
    const payload: any = {
      transaction_no: txNo || `FT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      entry_scope: primary,
      transaction_type: secondaryValues[0] || secondary,
      direction: '支出',
      amount_cny: amountCny,
      amount_usd: amountUsd > 0 ? amountUsd : null,
      exchange_rate: amountUsd > 0 && exchangeRate > 0 ? exchangeRate : null,
      customer_name: record.customer_name || '',
      order_number: orderNumberMap.get(String(record.order_id || '')) || record.order_number || String(record.order_id || ''),
      staff_name: record.applicant_name || record.staff_name || '',
      handler_name: currentUser.value?.name || '财务',
      status: '已确认',
      notes: buildOtherPaymentLedgerNote(record, record.finance_notes || ''),
      transaction_date: dayjs(handledAt).format('YYYY-MM-DD'),
      updated_at: handledAt,
    }
    if (UUID_LIKE_RE.test(String(record.order_id || ''))) {
      payload.order_id = record.order_id
    }
    if (record.paypal_receipt_screenshot) {
      payload.receipt_urls = [record.paypal_receipt_screenshot]
    }
    const { error: insertError } = await supabase.from('financial_transactions').insert(payload)
    if (insertError) throw insertError
  }
}

function otherRefundOrderCountLabel(record: any) {
  if (!record) return ''
  if (!parseOtherPaymentSecondaryValues(record.refund_category).some(item => ['截单退款', '赔付佣金', '退差价', '任务退款', '佣金退款', '任务付款', '佣金付款'].includes(item))) return ''
  const count = record.refund_order_count ?? record.order_count ?? record.sub_order_count ?? record.refund_order_qty
  if (count === undefined || count === null || count === '') return ''
  return `${count}单`
}

function getOtherRefundOrderCountValue(record: any) {
  if (!record || !parseOtherPaymentSecondaryValues(record.refund_category).some(item => ['截单退款', '赔付佣金', '退差价', '任务退款', '佣金退款', '任务付款', '佣金付款'].includes(item))) return 0
  return Number(record.refund_order_count ?? record.order_count ?? record.sub_order_count ?? record.refund_order_qty ?? 0)
}

async function fetchRealOtherRequests() {
  let query = supabase
    .from('refund_requests')
    .select('*')
    .neq('refund_method', 'PayPal')
    .neq('refund_method', '礼品卡')
    .order('created_at', { ascending: false })

  if (filterStatus.value) query = query.eq('status', filterStatus.value)
  const { data, error } = await query
  if (error) throw error
  return (data || []).map(normalizeOtherRequestRow)
}

function filterOtherRequestRows(rows: any[]) {
  return rows.filter(item => {
    const { primary } = resolveOtherPaymentCategories(item)
    const secondaryValues = parseOtherPaymentSecondaryValues(item.refund_category)
    if (filterOtherPrimaryCategory.value && primary !== filterOtherPrimaryCategory.value) return false
    if (filterOtherCategory.value && !secondaryValues.includes(filterOtherCategory.value)) return false
    if (filterSearch.value) {
      const kw = filterSearch.value.trim().toLowerCase()
      const haystack = [
        item.order_id,
        item.sub_order_id,
        item.customer_name,
        item.refund_reason,
        item.applicant_name,
        getOtherPaymentTypeText(item),
      ]
      if (!haystack.join(' ').toLowerCase().includes(kw)) return false
    }
    return true
  })
}

function readStoredArray(key: string) {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeStoredArray(key: string, value: any[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key, JSON.stringify(value))
}

function hydrateQueueMockStorage() {
  extraMockPaypalRequests.value = readStoredArray(QUEUE_PAYPAL_EXTRA_KEY)
  extraMockGiftRequests.value = readStoredArray(QUEUE_GIFT_EXTRA_KEY)
}

function persistQueueExtra(type: 'paypal' | 'gift') {
  writeStoredArray(type === 'paypal' ? QUEUE_PAYPAL_EXTRA_KEY : QUEUE_GIFT_EXTRA_KEY, type === 'paypal' ? extraMockPaypalRequests.value : extraMockGiftRequests.value)
}

function getActiveMockRequests() {
  if (activeTab.value === 'paypal') return [...mockPaypalRequests.value, ...extraMockPaypalRequests.value]
  if (activeTab.value === 'gift') return [...mockGiftRequests.value, ...extraMockGiftRequests.value]
  return mockOtherRequests.value
}

function filterMockRequests(list: any[]) {
  return list.filter(item => {
    if (filterStatus.value && item.status !== filterStatus.value) return false
    if (activeTab.value === 'other') {
      const { primary, secondary } = resolveOtherPaymentCategories(item)
      if (filterOtherPrimaryCategory.value && primary !== filterOtherPrimaryCategory.value) return false
      if (filterOtherCategory.value && secondary !== filterOtherCategory.value) return false
    }
    if (filterSearch.value) {
      const kw = filterSearch.value.trim().toLowerCase()
      const haystack = activeTab.value === 'other'
        ? [item.order_id, item.sub_order_id, item.customer_name, item.refund_reason, item.applicant_name, getOtherPaymentTypeText(item)]
        : [item.buyer_name, item.sub_order_number, item.product_name, item.buyer_paypal_email]
      if (!haystack.join(' ').toLowerCase().includes(kw)) return false
    }
    return true
  })
}

function batchGroupLabel() {
  if (activeTab.value === 'paypal') return '同一邮箱'
  if (activeTab.value === 'gift') return '同一买手'
  return '同一客户'
}

function handleGiftFaceFilterChange() {
  if (!giftRecommendations.value.find(item => item.id === selectedGiftRecommendationId.value)) {
    selectedGiftRecommendationId.value = giftRecommendations.value[0]?.id || ''
  }
}

function fmtTime(t: string | null) {
  if (!t) return '—'
  return dayjs(t).format('YYYY-MM-DD HH:mm')
}

function methodColor(method: string) {
  if (method === '礼品卡') return 'gold'
  if (method === 'PayPal') return 'blue'
  return 'purple'
}

function refundMethodLabel(record: any) {
  if (record.refund_method === 'PayPal') return '贝宝返款'
  if (record.refund_method === '礼品卡') return '礼品卡返款'
  return '其他付款'
}

function handlerName(record: any) {
  if (!record) return '—'
  return record.refund_operator || record.handled_by || record.processed_by || (record.handled_at ? '财务' : '—')
}

function requestTypeLabel(t: string) {
  if (t === 'supplement') return '追加'
  if (t === 'correction') return '更正'
  if (t === 'initial') return '首笔'
  return t || '—'
}

function onImgError(e: Event) {
  const img = e.target as HTMLImageElement
  img.style.display = 'none'
}

function onSearchChange() {
  if (!filterSearch.value) reloadFromFirstPage()
}

function handleTabChange() {
  filterOtherPrimaryCategory.value = undefined
  filterOtherCategory.value = undefined
  clearBatchSelection()
  reloadFromFirstPage()
}

function onOtherFilterPrimaryChange() {
  if (filterOtherCategory.value && !otherPaymentFilterSecondaryOptions.value.some(item => item.value === filterOtherCategory.value)) {
    filterOtherCategory.value = undefined
  }
  reloadFromFirstPage()
}

function onOtherProcessPrimaryChange() {
  if (!otherProcessForm.category.every(value => otherProcessSecondaryOptions.value.some(item => item.value === value))) {
    otherProcessForm.category = otherProcessSecondaryOptions.value.length ? [otherProcessSecondaryOptions.value[0].value] : ['其他支出']
  }
}

function onOtherSubmitPrimaryChange() {
  const nextValues = otherSubmitForm.category.filter(value => otherSubmitSecondaryOptions.value.some(item => item.value === value))
  otherSubmitForm.category = nextValues.length ? nextValues : (otherSubmitSecondaryOptions.value.length ? [otherSubmitSecondaryOptions.value[0].value] : ['其他支出'])
}

function buildStoredOtherCategory(values: string[]) {
  return parseOtherPaymentSecondaryValues(values).join('|')
}

function buildOtherProcessPaymentNote() {
  return [
    otherProcessForm.notes.trim(),
    otherProcessForm.paymentAccount ? `付款账号:${otherProcessForm.paymentAccount.trim()}` : '',
    otherProcessForm.paymentMethod ? `付款方式:${otherProcessForm.paymentMethod.trim()}` : '',
  ].filter(Boolean).join(' | ')
}

function extractOtherProcessPaymentMeta(record: any) {
  const text = String(record?.finance_notes || '')
  const account = text.match(/付款账号:([^|]+)/)?.[1]?.trim() || ''
  const method = text.match(/付款方式:([^|]+)/)?.[1]?.trim() || ''
  return { account, method }
}

function getCurrentProcessCategoryText(records: any[]) {
  const labels = Array.from(new Set(records.map(item => getOtherPaymentTypeText(item))))
  return labels.join(' / ')
}

const currentProcessCategoryText = computed(() => getCurrentProcessCategoryText(currentProcessRequests.value))

function getProcessMetaText(record: any) {
  const meta = extractOtherProcessPaymentMeta(record)
  if (!meta.account && !meta.method) return ''
  return `${meta.account || '--'} / ${meta.method || '--'}`
}

function getProcessMethodText(record: any) {
  return extractOtherProcessPaymentMeta(record).method || '--'
}

function getProcessAccountText(record: any) {
  return extractOtherProcessPaymentMeta(record).account || '--'
}

function getOrderSearchText(value: any) {
  return String(value || '').trim() || '--'
}

function openOtherProcess(record?: any, useSelection = false) {
  const targets = useSelection ? selectedBatchRows.value : (record ? [record] : [])
  if (!targets.length) {
    message.warning('请先选择要处理的退款记录')
    return
  }
  setProcessRequests(targets)
  const { primary } = resolveOtherPaymentCategories(targets[0])
  otherProcessForm.primaryCategory = primary
  otherProcessForm.category = parseOtherPaymentSecondaryValues(targets[0]?.refund_category)
  otherProcessForm.amountUsd = getOtherUsdAmount(targets[0])
  otherProcessForm.exchangeRate = getOtherExchangeRate(targets[0]) || 7.25
  const meta = extractOtherProcessPaymentMeta(targets[0])
  otherProcessForm.paymentMethod = meta.method
  otherProcessForm.paymentAccount = meta.account
  otherProcessForm.receipt = targets[0]?.paypal_receipt_screenshot || ''
  otherProcessForm.notes = targets[0]?.finance_notes || ''
  otherProcessOpen.value = true
}

function resetOtherSubmitForm() {
  otherSubmitForm.primaryCategory = '行政办公'
  otherSubmitForm.category = ['行政支出']
  otherSubmitForm.applicantName = currentUser.value?.name || ''
  otherSubmitForm.customerName = ''
  otherSubmitForm.payoutAccount = ''
  otherSubmitForm.amountCny = 0
  otherSubmitForm.amountUsd = 0
  otherSubmitForm.exchangeRate = 7.25
  otherSubmitForm.reason = ''
  otherSubmitForm.notes = ''
}

function reloadFromFirstPage() {
  pagination.value.current = 1
  clearBatchSelection()
  load()
}

function isSelectableRecord(record: any) {
  return record?.status === '待处理'
}

function getBatchGroupKey(record: any) {
  if (activeTab.value === 'paypal') return ['paypal', record.buyer_paypal_email || ''].join('|')
  if (activeTab.value === 'gift') return ['gift', record.buyer_name || ''].join('|')
  return ['other', record.customer_name || ''].join('|')
}

function clearBatchSelection() {
  selectedBatchRows.value = []
}

async function fetchQueueExportRecords() {
  hydrateQueueMockStorage()
  if (activeTab.value === 'other') {
    const realRows = await fetchRealOtherRequests()
    return annotateRefundRequests(filterOtherRequestRows([...mockOtherRequests.value, ...realRows]))
  }

  const filteredMock = annotateRefundRequests(filterMockRequests(getActiveMockRequests()))
  let query = supabase
    .from('refund_requests')
    .select('*')
    .order('created_at', { ascending: false })

  if (filterStatus.value) query = query.eq('status', filterStatus.value)
  if (filterSearch.value) {
    const kw = `%${filterSearch.value}%`
    query = query.or(`buyer_name.ilike.${kw},sub_order_number.ilike.${kw},product_name.ilike.${kw},buyer_paypal_email.ilike.${kw}`)
  }

  if (activeTab.value === 'paypal') {
    query = query.eq('refund_method', 'PayPal')
  } else {
    query = query.eq('refund_method', '礼品卡')
  }

  const { data, error } = await query
  if (error) throw error
  return [...filteredMock, ...annotateRefundRequests(data || [])]
}

async function exportQueue() {
  try {
    const rows = await fetchQueueExportRecords()
    const filenameMap: Record<string, string> = {
      paypal: '付款审批_贝宝返款',
      gift: '付款审批_礼品卡返款',
      other: '付款审批_其他付款',
    }
    const headers = activeTab.value === 'paypal'
      ? ['子订单号', '产品', '业务员', '买手邮箱', '返款次数', '申请金额', '申请时间', '水单需求', '账单备注']
      : activeTab.value === 'gift'
        ? ['子订单号', '产品', '业务员', '买手', '返款次数', '申请金额', '申请时间', '账单备注']
        : ['关联主订单ID', '关联子订单ID', '收款对象', '交易类型', '退款单量', '申请金额', '申请时间', '账单备注']
    const dataRows = rows.map(item => activeTab.value === 'paypal'
      ? [
          item.sub_order_number || item.sub_order_id || '',
          item.product_name || '',
          item.staff_name || '',
          item.buyer_paypal_email || '',
          item._refund_times_label || '',
          formatRecordAmount(item),
          fmtTime(item.created_at),
          item._receipt_required || '',
          item.finance_notes || item.notes || '',
        ]
      : activeTab.value === 'gift'
        ? [
            item.sub_order_number || item.sub_order_id || '',
            item.product_name || '',
            item.staff_name || '',
            item.buyer_name || '',
            item._refund_times_label || '',
            formatRecordAmount(item),
            fmtTime(item.created_at),
            item.finance_notes || item.notes || '',
          ]
        : [
            item.order_id || '',
            item.sub_order_id || '',
            item.customer_name || '',
            `${getOtherPaymentTypeText(item)}${item.refund_reason ? ` · ${item.refund_reason}` : ''}`,
            otherRefundOrderCountLabel(item),
            formatRecordAmount(item),
            fmtTime(item.created_at),
            item.finance_notes || item.notes || '',
          ])
    downloadCsv(`${filenameMap[activeTab.value]}_${dayjs().format('YYYYMMDD_HHmm')}.csv`, headers, dataRows)
    message.success('导出成功')
  } catch (e: any) {
    message.error(`导出失败：${e.message || e}`)
  }
}

function setProcessRequests(records: any[]) {
  currentProcessRequests.value = records
  currentRequest.value = records[0] || null
}

async function loadPaypalAccounts() {
  const { data } = await supabase
    .from('paypal_accounts')
    .select('id, email, account_alias, owner_name')
    .eq('status', '正常')
    .order('created_at', { ascending: false })
  paypalAccounts.value = data || []
  if (!selectedPaypalAccountId.value && paypalAccounts.value.length > 0) {
    selectedPaypalAccountId.value = paypalAccounts.value[0].id
  }
}

async function load() {
  loading.value = true
  try {
    hydrateQueueMockStorage()
    if (activeTab.value === 'other') {
      const realRows = await fetchRealOtherRequests()
      const filtered = annotateRefundRequests(filterOtherRequestRows([...mockOtherRequests.value, ...realRows]))
      pagination.value.total = filtered.length
      const from = (pagination.value.current - 1) * pagination.value.pageSize
      requests.value = filtered.slice(from, from + pagination.value.pageSize)
      return
    }

    const filteredMock = annotateRefundRequests(filterMockRequests(getActiveMockRequests()))
    const mockCount = filteredMock.length
    const pageStart = (pagination.value.current - 1) * pagination.value.pageSize
    const pageEnd = pageStart + pagination.value.pageSize
    const mockPageRows = filteredMock.slice(pageStart, pageEnd)
    const realStart = Math.max(pageStart - mockCount, 0)
    const realPageSize = pagination.value.pageSize - mockPageRows.length

    let query = supabase
      .from('refund_requests')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    if (filterStatus.value) query = query.eq('status', filterStatus.value)
    if (filterSearch.value) {
      const kw = `%${filterSearch.value}%`
      query = query.or(`buyer_name.ilike.${kw},sub_order_number.ilike.${kw},product_name.ilike.${kw},buyer_paypal_email.ilike.${kw}`)
    }

    if (activeTab.value === 'paypal') {
      query = query.eq('refund_method', 'PayPal')
    } else if (activeTab.value === 'gift') {
      query = query.eq('refund_method', '礼品卡')
    }

    if (realPageSize > 0) {
      query = query.range(realStart, realStart + realPageSize - 1)
    } else {
      query = query.range(0, -1)
    }
    const { data, count, error } = await query
    if (error) throw error
    requests.value = [...mockPageRows, ...annotateRefundRequests(data || [])]
    pagination.value.total = (count || 0) + mockCount
  } finally {
    loading.value = false
  }
}

async function loadAvailableGiftCards() {
  const { data, error } = await supabase
    .from('gift_cards')
    .select('id, card_number, card_code, face_value_usd')
    .eq('status', '未使用')
    .order('face_value_usd', { ascending: false })
    .order('created_at', { ascending: true })
  if (error) throw error
  availableGiftCards.value = data || []
}

function openDetail(record: any) {
  currentRequest.value = record
  detailOpen.value = true
}

function openPaypalProcess(record?: any, useSelection = false) {
  if (!selectedPaypalAccountId.value) {
    message.warning('请先在顶部选择我方转款贝宝邮箱')
    return
  }
  const targets = useSelection ? selectedBatchRows.value : (record ? [record] : [])
  if (!targets.length) {
    message.warning('请先选择要返款的记录')
    return
  }
  setProcessRequests(targets)
  paypalModalMode.value = 'process'
  paypalProcessForm.receipt = targets[0]?.paypal_receipt_screenshot || ''
  paypalProcessForm.notes = targets[0]?.finance_notes || ''
  paypalProcessOpen.value = true
}

function openPaypalReceipt(record: any) {
  setProcessRequests([record])
  paypalModalMode.value = 'receipt'
  paypalProcessForm.receipt = record.paypal_receipt_screenshot || ''
  paypalProcessForm.notes = record.finance_notes || ''
  paypalProcessOpen.value = true
}

async function openGiftProcess(record?: any, useSelection = false) {
  const targets = useSelection ? selectedBatchRows.value : (record ? [record] : [])
  if (!targets.length) {
    message.warning('请先选择要返款的记录')
    return
  }
  setProcessRequests(targets)
  giftProcessForm.notes = targets[0]?.finance_notes || ''
  selectedGiftFaceValues.value = []
  selectedGiftRecommendationId.value = ''
  await loadAvailableGiftCards()
  handleGiftFaceFilterChange()
  giftProcessOpen.value = true
}

function openOtherSubmitModal() {
  resetOtherSubmitForm()
  otherSubmitOpen.value = true
}

async function handleOtherSubmit() {
  if (!otherSubmitForm.category.length) {
    message.warning('请选择二级分类')
    return
  }
  if (!otherSubmitForm.applicantName.trim()) {
    message.warning('请填写申请人')
    return
  }
  if (!otherSubmitForm.customerName.trim()) {
    message.warning('请填写收款对象')
    return
  }
  if (!otherSubmitForm.payoutAccount.trim()) {
    message.warning('请填写收款账号')
    return
  }
  if (Number(otherSubmitForm.amountCny || 0) <= 0) {
    message.warning('请填写正确的付款金额')
    return
  }
  if (showOtherSubmitUsdFields.value && Number(otherSubmitForm.amountUsd || 0) <= 0) {
    message.warning('请填写金额 (USD)')
    return
  }
  if (showOtherSubmitUsdFields.value && Number(otherSubmitForm.exchangeRate || 0) <= 0) {
    message.warning('请填写汇率')
    return
  }
  if (!otherSubmitForm.reason.trim()) {
    message.warning('请填写用途')
    return
  }

  submittingOther.value = true
  try {
    const now = new Date().toISOString()
    const payload: any = {
      refund_method: '其他付款',
      status: '待处理',
      refund_amount: Number(otherSubmitForm.amountCny || 0),
      refund_amount_usd: showOtherSubmitUsdFields.value ? Number(otherSubmitForm.amountUsd || 0) : 0,
      exchange_rate: showOtherSubmitUsdFields.value ? Number(otherSubmitForm.exchangeRate || 0) : null,
      refund_category: buildStoredOtherCategory(otherSubmitForm.category),
      refund_reason: otherSubmitForm.reason.trim(),
      applicant_name: otherSubmitForm.applicantName.trim(),
      customer_name: otherSubmitForm.customerName.trim(),
      payout_account: otherSubmitForm.payoutAccount.trim(),
      notes: otherSubmitForm.notes.trim(),
      finance_notes: '',
      refund_operator: '',
      created_at: now,
      updated_at: now,
    }
    const { error } = await supabase.from('refund_requests').insert(payload)
    if (error) throw error
    message.success('付款申请已提交')
    otherSubmitOpen.value = false
    clearBatchSelection()
    await load()
  } catch (e: any) {
    message.error('提交失败：' + (e?.message || e))
  } finally {
    submittingOther.value = false
  }
}

async function handlePaypalProcess() {
  if (!currentProcessRequests.value.length) return
  if (!selectedPaypalAccountId.value) {
    message.warning('请选择我方转款贝宝邮箱')
    return
  }

  processing.value = true
  try {
    const account = paypalAccounts.value.find(item => item.id === selectedPaypalAccountId.value)
    const total = currentProcessTotal.value
    const nextStatus = paypalModalMode.value === 'receipt' && currentProcessRequests.value.length === 1
      ? currentProcessRequests.value[0]?.status || '待处理'
      : '已处理'
    const handledAt = nextStatus === '已处理' ? new Date().toISOString() : currentProcessRequests.value[0]?.handled_at || null
    const mockIds = currentProcessRequests.value.filter(item => String(item.id).startsWith('mock-paypal-')).map(item => item.id)
    const extraMockIds = currentProcessRequests.value.filter(item => String(item.id).startsWith('mock-paypal-resub-')).map(item => item.id)
    const realIds = currentProcessRequests.value.filter(item => !String(item.id).startsWith('mock-paypal-')).map(item => item.id)

    if (mockIds.length) {
      mockPaypalRequests.value = mockPaypalRequests.value.map(item =>
        mockIds.includes(item.id)
          ? {
              ...item,
              status: nextStatus,
              assigned_paypal_account_id: selectedPaypalAccountId.value,
              assigned_paypal_email: account?.email || '',
              paypal_receipt_screenshot: paypalProcessForm.receipt || '',
              finance_notes: paypalProcessForm.notes,
              handled_at: handledAt,
            }
          : item,
      )
    }

    if (extraMockIds.length) {
      extraMockPaypalRequests.value = extraMockPaypalRequests.value.map(item =>
        extraMockIds.includes(item.id)
          ? {
              ...item,
              status: nextStatus,
              assigned_paypal_account_id: selectedPaypalAccountId.value,
              assigned_paypal_email: account?.email || '',
              paypal_receipt_screenshot: paypalProcessForm.receipt || '',
              finance_notes: paypalProcessForm.notes,
              handled_at: handledAt,
            }
          : item,
      )
      persistQueueExtra('paypal')
    }

    if (realIds.length) {
      const { error } = await supabase
        .from('refund_requests')
        .update({
          status: nextStatus,
          assigned_paypal_account_id: selectedPaypalAccountId.value,
          assigned_paypal_email: account?.email || '',
          paypal_receipt_screenshot: paypalProcessForm.receipt || '',
          finance_notes: paypalProcessForm.notes,
          handled_at: handledAt,
        })
        .in('id', realIds)
      if (error) throw error
    }

    clearBatchSelection()
    currentProcessRequests.value = []
    message.success(paypalModalMode.value === 'receipt' ? '水单已更新' : `贝宝返款已处理，合计 $${money(total)}`)
    paypalProcessOpen.value = false
    await load()
  } catch (e: any) {
    message.error('处理失败：' + e.message)
  } finally {
    processing.value = false
  }
}

async function handleGiftProcess() {
  if (!currentProcessRequests.value.length) return
  if (!selectedGiftRecommendation.value) {
    message.warning('请选择一个推荐返款组合')
    return
  }

  processing.value = true
  try {
    const recommendation = selectedGiftRecommendation.value
    const now = new Date().toISOString()
    const total = currentProcessTotal.value
    const mockIds = currentProcessRequests.value.filter(item => String(item.id).startsWith('mock-gift-')).map(item => item.id)
    const extraMockIds = currentProcessRequests.value.filter(item => String(item.id).startsWith('mock-gift-resub-')).map(item => item.id)
    const realIds = currentProcessRequests.value.filter(item => !String(item.id).startsWith('mock-gift-')).map(item => item.id)

    const { error: cardError } = await supabase
      .from('gift_cards')
      .update({
        status: '已使用',
        used_at: now,
        used_for_sub_order_id: currentProcessRequests.value.map(item => item.sub_order_id).filter(Boolean).join(','),
        used_for_sub_order_no: currentProcessRequests.value.map(item => item.sub_order_number).filter(Boolean).join(','),
        used_by_buyer_name: currentProcessRequests.value[0]?.buyer_name || '',
        used_by_operator: currentUser.value?.name || '财务',
        refund_operator: currentUser.value?.name || '财务',
        refund_at: now,
      })
      .in('id', recommendation.cardIds)
    if (cardError) throw cardError

    if (mockIds.length) {
      mockGiftRequests.value = mockGiftRequests.value.map(item =>
        mockIds.includes(item.id)
          ? {
              ...item,
              status: '已处理',
              assigned_gift_card_id: recommendation.cardIds[0] || null,
              assigned_gift_card_number: recommendation.cardNumbers.join('\n'),
              assigned_gift_card_code: recommendation.cardCodes.join('\n'),
              gift_card_face_value_usd: recommendation.total,
              finance_notes: giftProcessForm.notes,
              handled_at: now,
            }
          : item,
      )
    }

    if (extraMockIds.length) {
      extraMockGiftRequests.value = extraMockGiftRequests.value.map(item =>
        extraMockIds.includes(item.id)
          ? {
              ...item,
              status: '已处理',
              assigned_gift_card_id: recommendation.cardIds[0] || null,
              assigned_gift_card_number: recommendation.cardNumbers.join('\n'),
              assigned_gift_card_code: recommendation.cardCodes.join('\n'),
              gift_card_face_value_usd: recommendation.total,
              finance_notes: giftProcessForm.notes,
              handled_at: now,
            }
          : item,
      )
      persistQueueExtra('gift')
    }

    if (realIds.length) {
      const { error } = await supabase
        .from('refund_requests')
        .update({
          status: '已处理',
          assigned_gift_card_id: recommendation.cardIds[0] || null,
          assigned_gift_card_number: recommendation.cardNumbers.join('\n'),
          assigned_gift_card_code: recommendation.cardCodes.join('\n'),
          gift_card_face_value_usd: recommendation.total,
          finance_notes: giftProcessForm.notes,
          handled_at: now,
        })
        .in('id', realIds)
      if (error) throw error
    }

    clearBatchSelection()
    currentProcessRequests.value = []
    message.success(`礼品卡返款已处理，合计 $${money(total)}`)
    giftProcessOpen.value = false
    await load()
  } catch (e: any) {
    message.error('处理失败：' + e.message)
  } finally {
    processing.value = false
  }
}

async function handleOtherProcess() {
  if (!currentProcessRequests.value.length) return
  if (!otherProcessForm.paymentMethod.trim()) {
    message.warning('请填写付款方式')
    return
  }
  if (!otherProcessForm.paymentAccount.trim()) {
    message.warning('请填写付款账号')
    return
  }

  processing.value = true
  try {
    const total = currentProcessTotal.value
    const now = new Date().toISOString()
    const mockIds = currentProcessRequests.value.filter(item => String(item.id).startsWith('mock-other-')).map(item => item.id)
    const realRecords = currentProcessRequests.value.filter(item => !String(item.id).startsWith('mock-other-'))
    const realIds = realRecords.map(item => item.id)
    const financeNote = buildOtherProcessPaymentNote()
    const storedCategory = buildStoredOtherCategory(otherProcessForm.category)

    if (mockIds.length) {
      mockOtherRequests.value = mockOtherRequests.value.map(item =>
        mockIds.includes(item.id)
          ? {
              ...item,
              status: '已处理',
              refund_method: '其他付款',
              refund_category: storedCategory,
              refund_operator: currentUser.value?.name || '财务',
              paypal_receipt_screenshot: otherProcessForm.receipt || '',
              finance_notes: financeNote,
              handled_at: now,
            }
          : item,
      )
    }

    if (realIds.length) {
      const { error } = await supabase
        .from('refund_requests')
        .update({
          status: '已处理',
          refund_method: '其他付款',
          refund_category: storedCategory,
          refund_operator: currentUser.value?.name || '财务',
          paypal_receipt_screenshot: otherProcessForm.receipt || '',
          finance_notes: financeNote,
          handled_at: now,
        })
        .in('id', realIds)
      if (error) throw error
      await insertOtherPaymentTransactions(realRecords.map(item => ({
        ...item,
        refund_category: storedCategory,
        finance_notes: financeNote,
        paypal_receipt_screenshot: otherProcessForm.receipt || '',
      })), now)
    }

    clearBatchSelection()
    currentProcessRequests.value = []
    message.success(`其他付款已处理，合计 ${formatCurrency(total, 'cny')}`)
    otherProcessOpen.value = false
    await load()
  } catch (e: any) {
    message.error('处理失败：' + e.message)
  } finally {
    processing.value = false
  }
}

async function cancelRequest(id: string) {
  if (String(id).startsWith('mock-other-')) {
    const idx = mockOtherRequests.value.findIndex(item => item.id === id)
    if (idx >= 0) {
      mockOtherRequests.value[idx] = { ...mockOtherRequests.value[idx], status: '已取消' }
    }
    message.success('已取消')
    await load()
    return
  }
  const { error } = await supabase.from('refund_requests').update({ status: '已取消' }).eq('id', id)
  if (error) {
    message.error('操作失败')
    return
  }
  message.success('已取消')
  await load()
}

function handleTableChange(pag: any) {
  pagination.value.current = pag.current
  pagination.value.pageSize = pag.pageSize
  clearBatchSelection()
  load()
}

onMounted(async () => {
  loadFromStorage()
  hydrateQueueMockStorage()
  await loadPaypalAccounts()
  await load()
})
</script>

<style scoped>
.page-content { padding: 24px; }
.page-title { font-size: 20px; font-weight: 700; color: #1a1a2e; margin-bottom: 20px; }
.card-panel { background: #fff; border-radius: 12px; padding: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); border: 1px solid #f0f0f0; }
.toolbar { display: flex; gap: 10px; margin-bottom: 12px; align-items: center; flex-wrap: wrap; }
.total-hint { font-size: 12px; color: #9ca3af; margin-left: auto; }
.queue-hint {
  margin-bottom: 16px;
  padding: 10px 14px;
  font-size: 12px;
  color: #6b7280;
  background: #f5f7fa;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
}

.batch-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
  padding: 10px 14px;
  font-size: 12px;
  color: #374151;
  background: #f8fafc;
  border: 1px solid #dbeafe;
  border-radius: 10px;
}

.cell-info { display: flex; flex-direction: column; gap: 2px; }
.cell-subno { font-family: 'Courier New', monospace; font-size: 11px; font-weight: 700; color: #1a1a2e; }
.cell-product { font-size: 12px; color: #374151; }
.cell-meta { font-size: 11px; color: #9ca3af; }
.cell-email { font-size: 11px; color: #6b7280; }
.cell-seq { font-size: 11px; color: #9ca3af; margin-top: 2px; }
.type-stack { display: flex; flex-direction: column; gap: 4px; }
.type-primary { font-size: 12px; color: #6b7280; line-height: 1.2; }
.type-secondary { font-size: 13px; color: #1a1a2e; font-weight: 600; line-height: 1.25; }
.type-reason { font-size: 11px; color: #9ca3af; line-height: 1.3; }
.amount-usd { font-weight: 700; color: #dc2626; font-size: 14px; }
.cell-product-price { font-size: 11px; color: #9ca3af; }
.text-gray { color: #9ca3af; font-size: 12px; }
.select-sub { font-size: 11px; color: #9ca3af; }
.re-edit-link { font-size: 12px; color: #2563eb; cursor: pointer; }
.mono-cell { font-family: 'Courier New', monospace; font-size: 12px; color: #1a1a2e; }
.note-preview {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 12px;
  color: #374151;
}

.result-stack { display: flex; flex-direction: column; gap: 2px; }
.result-acc { font-size: 12px; color: #374151; }
.result-link { font-size: 11px; color: #2563eb; }
.result-code { font-family: 'Courier New', monospace; font-size: 11px; color: #059669; font-weight: 700; white-space: pre-line; }
.clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.drawer-section { margin-bottom: 24px; }
.drawer-section-title { font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #f0f0f0; }
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.detail-item { display: flex; flex-direction: column; gap: 3px; }
.detail-item.full { grid-column: 1 / -1; }
.detail-label { font-size: 11px; color: #9ca3af; font-weight: 500; }
.detail-val { font-size: 13px; color: #1a1a2e; }
.detail-val.mono { font-family: 'Courier New', monospace; font-size: 12px; }
.detail-val.pre-wrap { white-space: pre-line; }
.detail-screenshot { margin-top: 12px; }
.amount-usd-lg { font-size: 18px; font-weight: 700; color: #dc2626; }
.screenshot-preview-img { max-width: 100%; max-height: 220px; border-radius: 8px; border: 1px solid #e5e7eb; object-fit: contain; }

.process-summary {
  margin-bottom: 16px;
  padding: 12px 14px;
  background: #f5f7fa;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  color: #374151;
}

.inventory-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}
.gift-filter-row {
  margin-bottom: 12px;
}
.inventory-card {
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.inventory-face { font-size: 16px; font-weight: 700; color: #2563eb; }
.inventory-count { font-size: 12px; color: #6b7280; }

.recommend-list { display: flex; flex-direction: column; gap: 10px; }
.recommend-card {
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  cursor: pointer;
  transition: all 0.15s ease;
}
.recommend-card.active {
  border-color: #2563eb;
  background: rgba(37, 99, 235, 0.06);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.12);
}
.recommend-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 4px; }
.recommend-total { font-size: 14px; font-weight: 700; color: #1a1a2e; }
.recommend-overpay { font-size: 12px; color: #6b7280; }
.recommend-summary { font-size: 12px; color: #374151; }

.drawer-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #f0f0f0; }

@media (max-width: 900px) {
  .detail-grid,
  .inventory-grid {
    grid-template-columns: 1fr;
  }
}
</style>
