<template>
  <div class="after-sale-list">
    <div v-if="props.showStats" class="after-sale-overview">
      <div class="after-sale-overview-head">
        <div>
          <div class="after-sale-overview-title">售后数据概览</div>
          <div class="after-sale-overview-desc">按创建时间筛选问题单，列表和汇总使用同一时间范围</div>
        </div>
        <a-range-picker
          v-model:value="dateRange"
          format="YYYY-MM-DD"
          :allow-clear="false"
          @change="handleDateRangeChange"
        />
      </div>
      <div class="after-sale-overview-grid">
        <div class="after-sale-overview-metric">
          <span>问题单量</span>
          <strong>{{ stats.total }}</strong>
          <em>当前时间范围</em>
        </div>
        <div class="after-sale-overview-metric">
          <span>处理中</span>
          <strong>{{ stats.processing }}</strong>
          <em>含需补单 {{ stats.needReorder }}</em>
        </div>
        <div class="after-sale-overview-metric is-success">
          <span>今日已处理</span>
          <strong>{{ stats.todayHandled }}</strong>
          <em>按处理时间统计</em>
        </div>
        <div class="after-sale-overview-metric is-danger">
          <span>本金损失金额</span>
          <strong>${{ stats.principalLossAmount.toFixed(2) }}</strong>
          <em>{{ stats.principalLossCount }} 单已损失</em>
        </div>
      </div>
    </div>

    <div class="card-panel">
      <div class="toolbar">
        <a-select v-model:value="filterType" style="width: 110px" @change="load" allow-clear placeholder="订单状态">
          <a-select-option v-for="t in issueTypes" :key="t" :value="t">{{ t }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterStatus" style="width: 120px" @change="load" allow-clear placeholder="处理进度">
          <a-select-option v-for="s in processStatusOptions" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterResolutionResult" style="width: 140px" @change="load" allow-clear placeholder="处理结果">
          <a-select-option v-for="s in resolutionResultOptions" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-select v-model:value="filterPrincipalStatus" style="width: 120px" @change="load" allow-clear placeholder="本金状态">
          <a-select-option v-for="s in principalStatusOptions" :key="s" :value="s">{{ s }}</a-select-option>
        </a-select>
        <a-input-search
          v-model:value="filterSearch"
          placeholder="搜索子订单号/买手/客户/ASIN..."
          style="width: 260px"
          @search="load"
          allow-clear
        />
        <a-button @click="load"><ReloadOutlined /> 刷新</a-button>
        <span class="total-hint">共 {{ pagination.total }} 条</span>
      </div>

      <a-table
        :columns="columns"
        :data-source="issues"
        :loading="loading"
        :pagination="pagination"
        row-key="id"
        size="middle"
        :scroll="{ x: filterStatus === '已处理' ? 1600 : 1400 }"
        @change="handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'sub_info'">
            <div class="cell-info">
              <a class="link-text" @click="openDetail(record)">{{ record.sub_order_number }}</a>
              <div class="cell-meta">{{ record.product_name || '--' }} / {{ record.asin || '--' }}</div>
              <div class="cell-amazon-id">订单号: {{ record.old_amazon_order_id || '--' }}</div>
            </div>
          </template>
          <template v-if="column.key === 'client'">
            <div class="cell-client-name">{{ record.customer_name || '--' }}</div>
            <div v-if="record.business_manager_name" class="cell-meta">商务: {{ record.business_manager_name }}</div>
          </template>
          <template v-if="column.key === 'buyer'">
            <div>{{ record.staff_name || '--' }}</div>
            <div class="cell-meta">买手: {{ record.buyer_name || '--' }}</div>
            <div class="cell-meta">聊单号: {{ getBuyerChatDisplay(record) }}</div>
          </template>
          <template v-if="column.key === 'order_status'">
            <a-tag :color="issueTypeColor[record.issue_type] || 'default'">{{ record.issue_type }}</a-tag>
          </template>
          <template v-if="column.key === 'principal_status'">
            <template v-if="shouldShowPrincipalAmount(record)">
              <a-tag :color="getPrincipalStatusColor(record)">{{ getPrincipalStatus(record) }}</a-tag>
              <div class="amount-loss">${{ getPrincipalAmount(record).toFixed(2) }}</div>
              <div v-if="record.principal_reason" class="cell-meta">{{ record.principal_reason }}</div>
            </template>
            <a-tag v-else :color="getPrincipalStatusColor(record)">{{ getPrincipalStatus(record) }}</a-tag>
          </template>
          <template v-if="column.key === 'after_sale_progress'">
            <div class="after-sale-progress-cell">
              <div class="after-sale-progress-main">
                <a-tag :color="afterSaleProgressTagColor(record)" class="after-sale-progress-tag">{{ getAfterSaleProgressMainStatus(record) }}</a-tag>
                <a-tag v-if="showPendingReorderAlert(record)" color="red" class="after-sale-alert-tag">待补单</a-tag>
              </div>
              <div class="after-sale-progress-sub">{{ getAfterSaleProgressSubText(record) }}</div>
            </div>
          </template>
          <template v-if="column.key === 'remark'">
            <span v-if="record.resolution_notes" class="remark-text">{{ record.resolution_notes }}</span>
            <span v-else class="text-gray">--</span>
          </template>
          <template v-if="column.key === 'resolution_result'">
            <div class="cell-result-main">{{ getResolutionMethodLabel(record) || '--' }}</div>
            <div v-if="getResolutionSummary(record)" class="cell-meta">{{ getResolutionSummary(record) }}</div>
          </template>
          <template v-if="column.key === 'handled_at'">
            <span>{{ fmtShortTime(getHandledTime(record)) }}</span>
          </template>
          <template v-if="column.key === 'action'">
            <div class="action-btns">
              <a-button type="link" size="small" @click="openDetail(record)">详情</a-button>
              <a-button type="link" size="small" @click="openHandle(record)">处理</a-button>
            </div>
          </template>
        </template>
      </a-table>
    </div>

    <a-drawer
      v-model:open="drawerOpen"
      :title="drawerMode === 'handle' ? `操作问题单 · ${currentIssue?.sub_order_number || ''}` : (currentIssue?.sub_order_number || '问题单详情')"
      width="860"
      placement="right"
      destroy-on-close
    >
      <template v-if="currentIssue">
        <div v-if="drawerMode === 'detail'" class="after-sale-detail">
          <div class="after-sale-hero">
            <div class="after-sale-hero-main">
              <div class="after-sale-title-line">
                <span>{{ currentIssue.product_name || currentIssue.asin || '--' }}</span>
                <a-tag :color="issueTypeColor[currentIssue.issue_type] || 'default'">{{ currentIssue.issue_type }}</a-tag>
                <a-tag :color="statusColorMap[normalizeIssueStatus(currentIssue.issue_status)] || 'default'">{{ normalizeIssueStatus(currentIssue.issue_status) }}</a-tag>
              </div>
              <div class="after-sale-meta">
                <span class="mono">{{ currentIssue.asin || '--' }}</span>
                <span>主任务ID：{{ currentIssue.order_number || '--' }}</span>
              </div>
            </div>
            <div class="after-sale-risk-card">
              <span>本金状态</span>
              <strong>{{ getPrincipalStatus(currentIssue) }}</strong>
              <em v-if="shouldShowPrincipalAmount(currentIssue)">${{ getPrincipalAmount(currentIssue).toFixed(2) }}</em>
            </div>
          </div>

          <div class="after-sale-detail-grid">
            <div class="after-sale-card">
              <div class="after-sale-card-title">任务信息</div>
              <div class="after-sale-field-grid">
                <div class="after-sale-field"><span>店铺</span><strong>{{ currentIssue.store_name || '--' }}</strong></div>
                <div class="after-sale-field"><span>产品价格</span><strong class="amount-usd">${{ Number(currentIssue.product_price || 0).toFixed(2) }}</strong></div>
                <div class="after-sale-field"><span>客户</span><strong>{{ currentIssue.customer_name || '--' }}</strong></div>
                <div class="after-sale-field"><span>商务</span><strong>{{ currentIssue.business_manager_name || '--' }}</strong></div>
              </div>
            </div>

            <div class="after-sale-card">
              <div class="after-sale-card-title">执行信息</div>
              <div class="after-sale-field-grid">
                <div class="after-sale-field"><span>亚马逊订单号</span><strong class="mono">{{ currentIssue.old_amazon_order_id || '--' }}</strong></div>
                <div class="after-sale-field"><span>买手</span><strong>{{ currentIssue.buyer_name || '--' }}</strong></div>
                <div class="after-sale-field"><span>聊单号</span><strong>{{ getBuyerChatDisplay(currentIssue) }}</strong></div>
                <div class="after-sale-field"><span>业务员</span><strong>{{ currentIssue.staff_name || '--' }}</strong></div>
                <div class="after-sale-field"><span>下单时间</span><strong>{{ fmtDateTime(currentIssue.amazon_order_placed_at) }}</strong></div>
                <div class="after-sale-field"><span>入库时间</span><strong>{{ fmtDateTime(currentIssue.created_at) }}</strong></div>
              </div>
            </div>

            <div class="after-sale-card is-wide">
              <div class="after-sale-card-title">处理详情</div>
              <div class="after-sale-field-grid">
                <div v-if="getResolutionMethodLabel(currentIssue)" class="after-sale-field"><span>处理结果</span><strong>{{ getResolutionMethodLabel(currentIssue) }}</strong></div>
                <template v-if="isOrderNumberReplacement(currentIssue)">
                  <div class="after-sale-field wide"><span>订单号变更</span><strong class="mono">{{ currentIssue.old_amazon_order_id || '--' }} -> {{ currentIssue.new_amazon_order_id || '--' }}</strong></div>
                </template>
                <template v-if="isReorderResult(currentIssue)">
                  <div class="after-sale-field wide"><span>子单ID变更</span><strong class="mono">{{ currentIssue.sub_order_number || '--' }} -> {{ currentIssue.replacement_sub_order_number || '--' }}</strong></div>
                </template>
                <div v-if="shouldShowPrincipalAmount(currentIssue)" class="after-sale-field"><span>{{ currentIssue.issue_type === '本金多返' ? '差价金额' : '损失金额' }}</span><strong class="amount-usd">${{ getPrincipalAmount(currentIssue).toFixed(2) }}</strong></div>
                <div v-if="currentIssue.refund_to_client_method" class="after-sale-field"><span>返款方式</span><strong>{{ currentIssue.refund_to_client_method }}</strong></div>
                <div v-if="currentIssue.refund_to_client_amount" class="after-sale-field"><span>返款金额</span><strong class="amount-usd">${{ Number(currentIssue.refund_to_client_amount || 0).toFixed(2) }}</strong></div>
                <div v-if="currentIssue.resolution_notes" class="after-sale-field wide"><span>处理备注</span><strong>{{ currentIssue.resolution_notes }}</strong></div>
                <div v-if="currentIssue.refund_to_client_notes" class="after-sale-field wide"><span>返款备注</span><strong>{{ currentIssue.refund_to_client_notes }}</strong></div>
                <div v-if="!hasAfterSaleResult(currentIssue)" class="after-sale-empty-row">暂无处理结果</div>
              </div>
            </div>
          </div>

          <div class="after-sale-flow">
            <div class="after-sale-flow-title">处理动态</div>
            <div class="after-sale-timeline">
              <div v-for="item in getAfterSaleDetailTimeline(currentIssue)" :key="item.key" class="after-sale-timeline-item">
                <div class="after-sale-timeline-axis">
                  <span :class="['after-sale-timeline-dot', `is-${item.type}`]"></span>
                  <span class="after-sale-timeline-line"></span>
                </div>
                <div class="after-sale-timeline-content">
                  <div class="after-sale-timeline-title">
                    <strong>{{ item.title }}</strong>
                    <span>{{ fmtDateTime(item.time) }}</span>
                  </div>
                  <div v-if="item.desc" class="after-sale-timeline-desc">{{ item.desc }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="drawer-section">
          <div class="drawer-section-title">操作</div>
          <div class="handle-panel">
            <div class="handle-action-grid">
              <button
                v-for="action in handleActionOptions"
                :key="action.key"
                type="button"
                :class="['handle-action-card', handleAction === action.key ? 'active' : '', action.tone]"
                @click="setHandleAction(action.key)"
              >
                <strong>{{ action.label }}</strong>
                <span>{{ action.desc }}</span>
              </button>
            </div>

            <div class="handle-box">
              <template v-if="handleAction === 'replace-order'">
                <div class="handle-box-title">修改订单号</div>
                <a-form layout="vertical">
                  <a-form-item label="原亚马逊订单号">
                    <a-input :value="currentIssue.old_amazon_order_id || '--'" disabled />
                  </a-form-item>
                  <a-form-item label="新亚马逊订单号">
                    <a-input v-model:value="editForm.new_amazon_order_id" placeholder="输入新的亚马逊订单号..." />
                  </a-form-item>
                  <a-form-item label="处理备注">
                    <a-textarea v-model:value="editForm.resolution_notes" :rows="3" placeholder="说明订单号修改原因..." />
                  </a-form-item>
                </a-form>
              </template>

              <template v-else-if="handleAction === 'reorder'">
                <div class="handle-box-title">创建补单</div>
                <div class="reorder-editor">
                  <div class="reorder-editor-hero">
                    <div>
                      <div class="reorder-editor-title">新子订单编辑</div>
                      <div class="reorder-editor-sub">基于当前问题单生成新订单，保存后回流到业务员工作台继续处理。</div>
                    </div>
                    <a-tag color="blue">补单</a-tag>
                  </div>

                  <div class="reorder-flow-card">
                    <div>
                      <span>原子订单</span>
                      <strong class="mono">{{ currentIssue.sub_order_number || '--' }}</strong>
                    </div>
                    <div class="reorder-arrow">-></div>
                    <div>
                      <span>新子订单</span>
                      <strong class="mono">{{ editForm.replacement_sub_order_number || '待填写' }}</strong>
                    </div>
                  </div>

                  <a-form layout="vertical">
                    <div class="reorder-editor-section">
                      <div class="reorder-editor-section-title">任务信息</div>
                      <div class="handle-form-grid">
                        <a-form-item label="新子订单ID">
                          <a-input v-model:value="editForm.replacement_sub_order_number" placeholder="如 SUB-NEW-1001" />
                        </a-form-item>
                        <a-form-item label="新订单号">
                          <a-input v-model:value="editForm.new_amazon_order_id" placeholder="有新亚马逊订单号时填写" />
                        </a-form-item>
                        <a-form-item label="产品名称">
                          <a-input :value="currentIssue.product_name || currentIssue.asin || '--'" disabled />
                        </a-form-item>
                        <a-form-item label="ASIN">
                          <a-input :value="currentIssue.asin || '--'" disabled />
                        </a-form-item>
                        <a-form-item label="店铺">
                          <a-input :value="currentIssue.store_name || '--'" disabled />
                        </a-form-item>
                        <a-form-item label="售价">
                          <a-input :value="`$${Number(currentIssue.product_price || 0).toFixed(2)}`" disabled />
                        </a-form-item>
                      </div>
                    </div>

                    <div class="reorder-editor-section">
                      <div class="reorder-editor-section-title">执行信息</div>
                      <div class="handle-form-grid">
                        <a-form-item label="补单买手">
                          <a-select
                            v-model:value="editForm.replacement_buyer_id"
                            show-search
                            :filter-option="false"
                            placeholder="搜索买手..."
                            @search="searchBuyers"
                            style="width: 100%"
                            allow-clear
                            :not-found-content="searchingBuyers ? '搜索中...' : '无结果'"
                            @change="onReplacementBuyerChange"
                          >
                            <a-select-option v-for="b in buyerResults" :key="b.id" :value="b.id">
                              <div class="buyer-option">
                                <span>{{ b.buyer_number }} - {{ b.name }}</span>
                                <span class="buyer-option-meta">{{ b.country }} · 完成 {{ b.total_completed }} 单</span>
                              </div>
                            </a-select-option>
                          </a-select>
                        </a-form-item>
                        <a-form-item label="补单备注">
                          <a-textarea v-model:value="editForm.resolution_notes" :rows="3" placeholder="说明补单原因和回流安排..." />
                        </a-form-item>
                      </div>
                    </div>
                  </a-form>
                  </div>
              </template>

              <template v-else-if="handleAction === 'recover-principal'">
                <div class="handle-box-title">追回本金</div>
                <a-form layout="vertical">
                  <div class="handle-form-grid">
                    <a-form-item label="追回金额">
                      <a-input-number v-model:value="editForm.recovered_amount" :min="0" :precision="2" style="width: 100%" prefix="$" />
                    </a-form-item>
                    <a-form-item label="追回方式">
                      <a-radio-group v-model:value="editForm.recovery_method" button-style="solid">
                        <a-radio-button value="direct">买手直接退还</a-radio-button>
                        <a-radio-button value="offset">新单抵扣</a-radio-button>
                      </a-radio-group>
                    </a-form-item>
                    <a-form-item v-if="editForm.recovery_method === 'offset'" label="抵扣新子订单ID">
                      <a-input v-model:value="editForm.recovery_new_sub_order_number" placeholder="填写用于抵扣的新子订单ID" />
                    </a-form-item>
                    <a-form-item label="处理备注">
                      <a-textarea v-model:value="editForm.resolution_notes" :rows="3" placeholder="说明本金追回过程..." />
                    </a-form-item>
                  </div>
                </a-form>
              </template>

              <template v-else-if="handleAction === 'transfer-other' || handleAction === 'release-grab'">
                <div class="handle-box-title">{{ getHandleActionTitle() }}</div>
                <div :class="['handle-confirm-card', handleAction === 'release-grab' ? 'is-purple' : '']">
                  <strong>{{ getHandleActionTitle() }}</strong>
                  <span>{{ getHandleActionHint() }}</span>
                </div>
                <a-form layout="vertical" class="handle-note-form">
                  <a-form-item v-if="handleAction === 'transfer-other'" label="转交给">
                    <a-input v-model:value="editForm.transfer_to_staff" placeholder="填写接手人姓名或账号" />
                  </a-form-item>
                  <a-form-item label="处理备注">
                    <a-textarea v-model:value="editForm.resolution_notes" :rows="3" :placeholder="getHandleNotePlaceholder()" />
                  </a-form-item>
                </a-form>
              </template>

              <template v-else>
                <div class="handle-box-title">{{ getHandleActionTitle() }}</div>
                <div :class="['handle-confirm-card', handleAction === 'mark-no-need' ? 'is-purple' : handleAction === 'mark-closed' ? 'is-gray' : '']">
                  <strong>{{ getHandleActionTitle() }}</strong>
                  <span>{{ getHandleActionHint() }}</span>
                </div>
                <a-form layout="vertical" class="handle-note-form">
                  <a-form-item label="处理备注">
                    <a-textarea v-model:value="editForm.resolution_notes" :rows="3" :placeholder="getHandleNotePlaceholder()" />
                  </a-form-item>
                </a-form>
              </template>
            </div>
          </div>
        </div>

        <div class="drawer-footer">
          <div style="flex: 1"></div>
          <a-button @click="drawerOpen = false">关闭</a-button>
          <a-button v-if="drawerMode === 'handle'" type="primary" :loading="saving" @click="handleUpdate">确认操作</a-button>
        </div>
      </template>
    </a-drawer>

    <a-modal
      v-model:open="actionModalOpen"
      :title="actionModalType === 'replace-order' ? '修改订单号' : '补单'"
      :confirm-loading="saving"
      @ok="submitActionModal"
      @cancel="closeActionModal"
    >
      <a-form layout="vertical">
        <a-form-item v-if="actionModalType === 'replace-order'" label="新亚马逊订单号">
          <a-input v-model:value="editForm.new_amazon_order_id" placeholder="输入新的亚马逊订单号..." />
        </a-form-item>
        <template v-if="actionModalType === 'reorder'">
          <a-form-item label="补单买手">
            <a-select
              v-model:value="editForm.replacement_buyer_id"
              show-search
              :filter-option="false"
              placeholder="搜索买手..."
              @search="searchBuyers"
              style="width: 100%"
              allow-clear
              :not-found-content="searchingBuyers ? '搜索中...' : '无结果'"
              @change="onReplacementBuyerChange"
            >
              <a-select-option v-for="b in buyerResults" :key="b.id" :value="b.id">
                <div class="buyer-option">
                  <span>{{ b.buyer_number }} - {{ b.name }}</span>
                  <span class="buyer-option-meta">{{ b.country }} · 完成 {{ b.total_completed }} 单</span>
                </div>
              </a-select-option>
            </a-select>
          </a-form-item>
          <a-form-item label="补单子订单号">
            <a-input v-model:value="editForm.replacement_sub_order_number" placeholder="关联新的子订单号..." />
          </a-form-item>
        </template>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { message } from 'ant-design-vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { supabase } from '../lib/supabase'

const props = withDefaults(defineProps<{
  staffId?: string
  issueId?: string
  subOrder?: string
  showStats?: boolean
}>(), {
  staffId: undefined,
  issueId: undefined,
  subOrder: undefined,
  showStats: true,
})

const emit = defineEmits<{
  (e: 'changed'): void
}>()

const MOCK_AFTER_SALE_ISSUES_KEY = 'mock_after_sale_issue_list_v3'
const MOCK_AFTER_SALE_ISSUES = [
  {
    id: 'mock_after_sale_principal_overpaid',
    issue_number: 'ASI-MOCK-20260415-0001',
    sub_order_id: 'mock_sub_order_principal_overpaid',
    sub_order_number: 'SUB-MOCK-AS-2001',
    order_number: 'MOCK-AS-2001',
    buyer_name: 'Liam Carter',
    staff_name: '王浩',
    customer_name: '深圳云帆科技',
    business_manager_name: '陈婷',
    asin: 'B0MOCKAS2001',
    store_name: 'US-Store-09',
    product_price: 18.9,
    issue_type: '本金多返',
    issue_status: '待处理',
    principal_status: '待追回',
    principal_amount: 4.5,
    principal_reason: '原应返 18.90 USD，误返 23.40 USD，待追回差价。',
    old_amazon_order_id: '333-3333333-3333333',
    amazon_order_placed_at: dayjs().subtract(20, 'day').hour(16).minute(10).second(0).millisecond(0).toISOString(),
    resolution_notes: '已联系买手确认退回多返本金，等待到账。',
    description: '财务多返了 4.50 USD，本金差价待追回。',
    created_at: dayjs().subtract(18, 'day').hour(9).minute(30).second(0).millisecond(0).toISOString(),
    updated_at: dayjs().subtract(18, 'day').hour(10).minute(20).second(0).millisecond(0).toISOString(),
    _mock_timeline: [
      { title: '创建问题单', desc: '本金多返，待追回差价', time: dayjs().subtract(18, 'day').hour(9).minute(30).toISOString(), type: 'created' },
      { title: '联系买手', desc: '确认多返 $4.50，等待买手退回', time: dayjs().subtract(18, 'day').hour(10).minute(20).toISOString(), type: 'processing' },
    ],
  },
  {
    id: 'mock_after_sale_replace_order',
    issue_number: 'ASI-MOCK-20260502-0002',
    sub_order_id: 'mock_sub_order_replace_order',
    sub_order_number: 'SUB-MOCK-AS-2002',
    order_number: 'MOCK-AS-2002',
    buyer_name: 'Emma Wilson',
    staff_name: '李娜',
    customer_name: '杭州晨星贸易',
    business_manager_name: '赵蕾',
    asin: 'B0MOCKAS2002',
    store_name: 'US-Store-12',
    product_name: 'Wireless Milk Frother',
    product_price: 25.99,
    commission_fee: 42,
    issue_type: '无此订单',
    issue_status: '已替换单号',
    principal_status: '正常',
    old_amazon_order_id: '111-1111111-1111111',
    amazon_order_placed_at: dayjs().subtract(12, 'day').hour(9).minute(45).second(0).millisecond(0).toISOString(),
    new_amazon_order_id: '222-2222222-2222222',
    buyer_chat_id: 'CHAT-US-2002',
    description: '客户核对后台无此订单，需要业务员确认买手填写的订单号。',
    resolution_notes: '买手确认填写错误，已将订单号从 111-1111111-1111111 修改为 222-2222222-2222222。',
    created_at: dayjs().subtract(10, 'day').hour(14).minute(10).second(0).millisecond(0).toISOString(),
    updated_at: dayjs().subtract(9, 'day').hour(11).minute(25).second(0).millisecond(0).toISOString(),
    resolved_at: dayjs().subtract(9, 'day').hour(11).minute(25).second(0).millisecond(0).toISOString(),
    _mock_timeline: [
      { title: '创建问题单', desc: '无此订单，订单号待核对', time: dayjs().subtract(10, 'day').hour(14).minute(10).toISOString(), type: 'created' },
      { title: '核对订单号', desc: '买手反馈原订单号填写错误', time: dayjs().subtract(10, 'day').hour(17).minute(40).toISOString(), type: 'processing' },
      { title: '已替换单号', desc: '订单号：111-1111111-1111111 -> 222-2222222-2222222', time: dayjs().subtract(9, 'day').hour(11).minute(25).toISOString(), type: 'resolved' },
    ],
  },
  {
    id: 'mock_after_sale_reorder',
    issue_number: 'ASI-MOCK-20260505-0003',
    sub_order_id: 'mock_sub_order_reorder',
    sub_order_number: 'SUB-MOCK-AS-2003',
    order_number: 'MOCK-AS-2003',
    buyer_name: 'Noah Brown',
    staff_name: '周敏',
    customer_name: '宁波艾森家居',
    business_manager_name: '黄思',
    asin: 'B0MOCKAS2003',
    store_name: 'CA-Store-03',
    product_name: 'Pet Grooming Glove',
    product_price: 14.5,
    commission_fee: 36,
    issue_type: '不下单',
    issue_status: '已补单',
    principal_status: '正常',
    old_amazon_order_id: '',
    new_amazon_order_id: '777-7777777-7777777',
    amazon_order_placed_at: '',
    replacement_buyer_name: 'Olivia Davis',
    replacement_sub_order_number: 'SUB-MOCK-AS-2103',
    buyer_chat_id: 'CHAT-CA-2003',
    description: '原买手接单后未下单且失联，需要重新安排补单。',
    resolution_notes: '已从 SUB-MOCK-AS-2003 补单到 SUB-MOCK-AS-2103，新订单号为 777-7777777-7777777。',
    created_at: dayjs().subtract(7, 'day').hour(10).minute(5).second(0).millisecond(0).toISOString(),
    updated_at: dayjs().subtract(6, 'day').hour(15).minute(15).second(0).millisecond(0).toISOString(),
    resolved_at: dayjs().subtract(6, 'day').hour(15).minute(15).second(0).millisecond(0).toISOString(),
    _mock_timeline: [
      { title: '创建问题单', desc: '原买手未下单', time: dayjs().subtract(7, 'day').hour(10).minute(5).toISOString(), type: 'created' },
      { title: '判定需补单', desc: '原买手失联，转补单处理', time: dayjs().subtract(7, 'day').hour(16).minute(30).toISOString(), type: 'processing' },
      { title: '已补单', desc: '订单号：-- -> 777-7777777-7777777；子单ID：SUB-MOCK-AS-2003 -> SUB-MOCK-AS-2103', time: dayjs().subtract(6, 'day').hour(15).minute(15).toISOString(), type: 'resolved' },
    ],
  },
  {
    id: 'mock_after_sale_refund_loss',
    issue_number: 'ASI-MOCK-20260508-0004',
    sub_order_id: 'mock_sub_order_refund_loss',
    sub_order_number: 'SUB-MOCK-AS-2004',
    order_number: 'MOCK-AS-2004',
    buyer_name: 'Mia Taylor',
    staff_name: '王浩',
    customer_name: '广州星河电子',
    business_manager_name: '陈婷',
    asin: 'B0MOCKAS2004',
    store_name: 'UK-Store-02',
    product_name: 'USB C Desk Charger',
    product_price: 31.8,
    commission_fee: 48,
    issue_type: '退款',
    issue_status: '无需处理',
    principal_status: '已损失',
    principal_amount: 31.8,
    principal_reason: '买手已退款但本金无法追回，确认为本金损失。',
    old_amazon_order_id: '444-4444444-4444444',
    amazon_order_placed_at: dayjs().subtract(6, 'day').hour(10).minute(30).second(0).millisecond(0).toISOString(),
    buyer_chat_id: 'CHAT-UK-2004',
    refund_to_client_method: '余额抵扣',
    refund_to_client_amount: 31.8,
    refund_to_client_notes: '客户同意转为余额抵扣。',
    description: '买手退款导致客户订单无法继续，需确认客户处理方式和本金损失。',
    resolution_notes: '客户已确认余额抵扣，本金记录为损失。',
    created_at: dayjs().subtract(4, 'day').hour(13).minute(0).second(0).millisecond(0).toISOString(),
    updated_at: dayjs().subtract(3, 'day').hour(16).minute(45).second(0).millisecond(0).toISOString(),
    resolved_at: dayjs().subtract(3, 'day').hour(16).minute(45).second(0).millisecond(0).toISOString(),
    _mock_timeline: [
      { title: '创建问题单', desc: '退款导致订单无法继续', time: dayjs().subtract(4, 'day').hour(13).minute(0).toISOString(), type: 'created' },
      { title: '确认本金损失', desc: '本金损失 $31.80', time: dayjs().subtract(4, 'day').hour(18).minute(10).toISOString(), type: 'processing' },
      { title: '无需处理', desc: '客户已确认余额抵扣 $31.80', time: dayjs().subtract(3, 'day').hour(16).minute(45).toISOString(), type: 'resolved' },
    ],
  },
  {
    id: 'mock_after_sale_cancel_pending',
    issue_number: 'ASI-MOCK-20260511-0005',
    sub_order_id: 'mock_sub_order_cancel_pending',
    sub_order_number: 'SUB-MOCK-AS-2005',
    order_number: 'MOCK-AS-2005',
    buyer_name: 'Lucas Moore',
    staff_name: '李娜',
    customer_name: '厦门蓝鲸科技',
    business_manager_name: '赵蕾',
    asin: 'B0MOCKAS2005',
    store_name: 'DE-Store-04',
    product_name: 'Kitchen Timer Digital',
    product_price: 12.99,
    commission_fee: 30,
    issue_type: '取消',
    issue_status: '处理中',
    principal_status: '待确定',
    old_amazon_order_id: '555-5555555-5555555',
    amazon_order_placed_at: dayjs().subtract(2, 'day').hour(18).minute(20).second(0).millisecond(0).toISOString(),
    buyer_chat_id: 'CHAT-DE-2005',
    description: '客户临时取消订单，需要确认是否已下单、是否涉及本金损失。',
    resolution_notes: '已联系买手确认取消节点，等待买手回复。',
    created_at: dayjs().subtract(1, 'day').hour(11).minute(20).second(0).millisecond(0).toISOString(),
    updated_at: dayjs().subtract(1, 'day').hour(15).minute(5).second(0).millisecond(0).toISOString(),
    _mock_timeline: [
      { title: '创建问题单', desc: '客户取消，待确认执行状态', time: dayjs().subtract(1, 'day').hour(11).minute(20).toISOString(), type: 'created' },
      { title: '处理中', desc: '等待买手确认是否已下单', time: dayjs().subtract(1, 'day').hour(15).minute(5).toISOString(), type: 'processing' },
    ],
  },
]

const loading = ref(false)
const saving = ref(false)
const issues = ref<any[]>([])
const filterStatus = ref<string | undefined>(undefined)
const filterType = ref<string | undefined>(undefined)
const filterResolutionResult = ref<string | undefined>(undefined)
const filterPrincipalStatus = ref<string | undefined>(undefined)
const filterSearch = ref('')
const dateRange = ref<[dayjs.Dayjs, dayjs.Dayjs]>([dayjs().subtract(29, 'day'), dayjs()])
const drawerOpen = ref(false)
const currentIssue = ref<any>(null)
const actionModalOpen = ref(false)
const actionModalType = ref<'replace-order' | 'reorder' | ''>('')
const drawerMode = ref<'detail' | 'handle'>('detail')
type HandleActionKey = 'mark-need-reorder' | 'replace-order' | 'reorder' | 'recover-principal' | 'transfer-other' | 'release-grab' | 'mark-closed' | 'mark-no-need'
const handleAction = ref<HandleActionKey | ''>('')
const pagination = ref({ current: 1, pageSize: 20, total: 0 })

const issueTypes = ['不下单', '取消', '退款', '无此订单', '本金多返']
const processStatusOptions = ['待处理', '处理中', '已处理']
const resolutionResultOptions = ['已替换单号', '已补新单', '已追回本金', '已关闭', '无需处理']
const principalStatusOptions = ['正常', '待确定', '待追回', '已损失']

const issueTypeColor: Record<string, string> = {
  '不下单': 'orange',
  '取消': 'red',
  '退款': 'blue',
  '无此订单': 'volcano',
  '本金多返': 'gold',
}

const statusColorMap: Record<string, string> = {
  '待处理': 'orange',
  '处理中': 'processing',
  '已处理': 'blue',
  '已替换单号': 'cyan',
  '需补单': 'red',
  '已补单': 'green',
  '已追回本金': 'green',
  '无需处理': 'purple',
  '已关闭': 'default',
}

const stats = ref({
  total: 0,
  pending: 0,
  processing: 0,
  needReorder: 0,
  handled: 0,
  todayHandled: 0,
  principalLossCount: 0,
  principalLossAmount: 0,
})

const buyerResults = ref<any[]>([])
const searchingBuyers = ref(false)

const editForm = reactive({
  principal_status: '待确定',
  principal_reason: '',
  principal_amount: 0,
  recovered_amount: 0,
  recovery_method: 'direct',
  recovery_new_sub_order_number: '',
  new_amazon_order_id: '',
  profit_diff: 0,
  loss_amount: 0,
  replacement_buyer_id: undefined as string | undefined,
  replacement_buyer_name: '',
  replacement_sub_order_number: '',
  refund_to_client_method: '',
  refund_to_client_amount: 0,
  refund_to_client_notes: '',
  resolution_notes: '',
  transfer_to_staff: '',
  issue_status: '待处理',
  blacklist_buyer: false,
})

const handleActionOptions: Array<{
  key: HandleActionKey
  label: string
  desc: string
  tone?: string
}> = [
  { key: 'mark-need-reorder', label: '需补单', desc: '先标记，稍后补齐新单信息', tone: 'is-danger' },
  { key: 'reorder', label: '补单', desc: '生成新子订单并回流处理', tone: 'is-primary' },
  { key: 'replace-order', label: '替换单号', desc: '订单号填错或无此订单时使用' },
  { key: 'recover-principal', label: '追回本金', desc: '记录追回金额和方式', tone: 'is-success' },
  { key: 'transfer-other', label: '转给他人', desc: '当前业务员处理不了，转交他人', tone: 'is-purple' },
  { key: 'release-grab', label: '放入抢单大厅', desc: '释放给其他业务员抢单', tone: 'is-purple' },
  { key: 'mark-closed', label: '关闭', desc: '问题已终止，不再继续处理' },
  { key: 'mark-no-need', label: '无需处理', desc: '确认不需要补单或返款', tone: 'is-purple' },
]

const columns = computed(() => {
  const baseColumns: any[] = [
  { title: '子订单ID / 产品名称 / ASIN / 订单号', key: 'sub_info', width: 240 },
  { title: '客户/商务', key: 'client', width: 140 },
  { title: '业务员 / 买手 / 聊单号', key: 'buyer', width: 180 },
  { title: '订单状态', key: 'order_status', width: 95 },
  { title: '本金状态', key: 'principal_status', width: 110 },
  { title: '售后进度', key: 'after_sale_progress', width: 220 },
  { title: '备注', key: 'remark', width: 180 },
  {
    title: '上传时间',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 100,
    customRender: ({ text }: any) => text ? dayjs(text).format('MM-DD HH:mm') : '',
  },
  {
    title: '入库时间',
    dataIndex: 'updated_at',
    key: 'updated_at',
    width: 100,
    customRender: ({ text }: any) => text ? dayjs(text).format('MM-DD HH:mm') : '',
  },
  ]
  if (filterStatus.value === '已处理') {
    baseColumns.push(
      { title: '处理结果', key: 'resolution_result', width: 180 },
      { title: '处理时间', key: 'handled_at', width: 120 },
    )
  }
  baseColumns.push({ title: '操作', key: 'action', width: 300, fixed: 'right' as const })
  return baseColumns
})

function getBuyerChatDisplay(record: any) {
  return record?.buyer_chat_id || record?.buyer_number || record?.buyer_id || '--'
}

function getDateRangeBounds() {
  const [start, end] = dateRange.value
  return {
    start: start.startOf('day').toISOString(),
    end: end.endOf('day').toISOString(),
  }
}

function handleDateRangeChange() {
  pagination.value.current = 1
  load()
}

async function loadStats() {
  let query = supabase.from('after_sale_issues').select('issue_status, principal_status, principal_amount, profit_diff, loss_amount, issue_type, updated_at, resolved_at, created_at')
  query = applyIssueFilters(query, { includeStatusFilter: false })
  const { data } = await query
  const filteredMockIssues = filterMockIssues(loadMockIssuesState(), { includeStatusFilter: false })
  const rows = [...filteredMockIssues, ...(data || [])]
  const isHandled = (record: any) => ['已替换单号', '已补单', '已追回本金', '已关闭', '无需处理'].includes(normalizeIssueStatus(record.issue_status))
  const lossRows = rows.filter(record => getPrincipalStatus(record) === '已损失')
  stats.value = {
    total: rows.length,
    pending: rows.filter(d => normalizeIssueStatus(d.issue_status) === '待处理').length,
    processing: rows.filter(d => ['处理中', '需补单'].includes(normalizeIssueStatus(d.issue_status))).length,
    needReorder: rows.filter(d => normalizeIssueStatus(d.issue_status) === '需补单').length,
    handled: rows.filter(isHandled).length,
    todayHandled: rows.filter(record => {
      const handledAt = record.resolved_at || record.updated_at
      return isHandled(record) && handledAt && dayjs(handledAt).isSame(dayjs(), 'day')
    }).length,
    principalLossCount: lossRows.length,
    principalLossAmount: lossRows.reduce((sum, record) => sum + getPrincipalAmount(record), 0),
  }
}

function getSearchValue() {
  return props.subOrder ? String(props.subOrder) : filterSearch.value.trim()
}

function applyIssueFilters<T>(query: T, options?: { includeStatusFilter?: boolean }) {
  let nextQuery: any = query
  const { start, end } = getDateRangeBounds()
  if (props.staffId) nextQuery = nextQuery.eq('staff_id', props.staffId)
  if (props.issueId) nextQuery = nextQuery.eq('id', props.issueId)
  if (!props.issueId) nextQuery = nextQuery.gte('created_at', start).lte('created_at', end)
  if (options?.includeStatusFilter !== false && filterStatus.value) nextQuery = applyProcessStatusFilter(nextQuery, filterStatus.value)
  if (filterResolutionResult.value) nextQuery = applyResolutionResultFilter(nextQuery, filterResolutionResult.value)
  if (filterType.value) nextQuery = nextQuery.eq('issue_type', filterType.value)
  if (filterPrincipalStatus.value) nextQuery = applyPrincipalStatusFilter(nextQuery, filterPrincipalStatus.value)

  const searchVal = getSearchValue()
  if (searchVal) {
    filterSearch.value = searchVal
    const kw = `%${searchVal}%`
    nextQuery = nextQuery.or(`sub_order_number.ilike.${kw},buyer_name.ilike.${kw},customer_name.ilike.${kw},asin.ilike.${kw},old_amazon_order_id.ilike.${kw},business_manager_name.ilike.${kw}`)
  }

  return nextQuery
}

function applyProcessStatusFilter<T>(query: T, status: string) {
  let nextQuery: any = query
  if (status === '处理中') return nextQuery.in('issue_status', ['处理中', '需补单'])
  if (status === '已处理') return nextQuery.in('issue_status', ['已替换单号', '已替换订单', '已补单', '已追回本金', '已关闭', '无需处理', '已退款给客户'])
  return nextQuery.eq('issue_status', status)
}

function applyResolutionResultFilter<T>(query: T, result: string) {
  let nextQuery: any = query
  if (result === '已替换单号') return nextQuery.in('issue_status', ['已替换单号', '已替换订单'])
  if (result === '已补新单') return nextQuery.eq('issue_status', '已补单')
  if (result === '已追回本金') return nextQuery.eq('issue_status', '已追回本金')
  if (result === '无需处理') return nextQuery.in('issue_status', ['无需处理', '已退款给客户'])
  return nextQuery.eq('issue_status', result)
}

function applyPrincipalStatusFilter<T>(query: T, status: string) {
  let nextQuery: any = query
  if (status === '已损失') return nextQuery.in('principal_status', ['已损失', '损失'])
  return nextQuery.eq('principal_status', status)
}

async function load() {
  loading.value = true
  try {
    const filteredMockIssues = filterMockIssues(loadMockIssuesState())
    const mockCount = filteredMockIssues.length
    const pageStart = (pagination.value.current - 1) * pagination.value.pageSize
    const mockOnEarlierPages = Math.min(mockCount, pageStart)
    const mockOnCurrentPage = Math.max(Math.min(mockCount - pageStart, pagination.value.pageSize), 0)
    const dbPageSize = pagination.value.pageSize - mockOnCurrentPage

    let query = supabase
      .from('after_sale_issues')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })

    query = applyIssueFilters(query, { includeStatusFilter: true })

    if (dbPageSize > 0) {
      const dbFrom = Math.max(pageStart - mockOnEarlierPages, 0)
      query = query.range(dbFrom, dbFrom + dbPageSize - 1)
    } else {
      query = query.range(0, 0)
    }

    const { data, count, error } = await query
    if (error) throw error
    const mockPageRows = filteredMockIssues.slice(pageStart, pageStart + mockOnCurrentPage)
    const dbRows = dbPageSize > 0 ? (data || []) : []
    issues.value = [...mockPageRows, ...dbRows]
    pagination.value.total = (count || 0) + mockCount

    if ((props.issueId || props.subOrder) && issues.value.length === 1) {
      openDetail(issues.value[0])
    }
  } finally {
    loading.value = false
  }

  if (props.showStats) {
    await loadStats()
  }
}

function loadMockIssuesState() {
  if (typeof window === 'undefined') return MOCK_AFTER_SALE_ISSUES.map(item => ({ ...item }))
  try {
    const raw = window.localStorage.getItem(MOCK_AFTER_SALE_ISSUES_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    const seeded = Array.isArray(parsed) ? parsed : []
    const merged = [...seeded]
    MOCK_AFTER_SALE_ISSUES.forEach(seed => {
      if (!merged.some((item: any) => item.id === seed.id)) {
        merged.push({ ...seed })
      }
    })
    window.localStorage.setItem(MOCK_AFTER_SALE_ISSUES_KEY, JSON.stringify(merged))
    return merged
  } catch {
    return MOCK_AFTER_SALE_ISSUES.map(item => ({ ...item }))
  }
}

function saveMockIssuesState(nextIssues: any[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(MOCK_AFTER_SALE_ISSUES_KEY, JSON.stringify(nextIssues))
}

function isMockIssue(record: any) {
  return String(record?.id || '').startsWith('mock_after_sale_')
}

function filterMockIssues(records: any[], options?: { includeStatusFilter?: boolean }) {
  const keyword = getSearchValue().toLowerCase()
  const { start, end } = getDateRangeBounds()
  return records.filter(record => {
    if (props.issueId && record.id !== props.issueId) return false
    if (!props.issueId) {
      const createdAt = record.created_at ? dayjs(record.created_at).valueOf() : 0
      if (createdAt < dayjs(start).valueOf() || createdAt > dayjs(end).valueOf()) return false
    }
    if (filterType.value && record.issue_type !== filterType.value) return false
    if (options?.includeStatusFilter !== false && filterStatus.value && getAfterSaleProgressMainStatus(record) !== filterStatus.value) return false
    if (filterResolutionResult.value) {
      const normalized = normalizeIssueStatus(record.issue_status)
      if (filterResolutionResult.value === '已补新单' && normalized !== '已补单') return false
      else if (filterResolutionResult.value !== '已补新单' && normalized !== filterResolutionResult.value) return false
    }
    if (filterPrincipalStatus.value && getPrincipalStatus(record) !== filterPrincipalStatus.value) return false
    if (!keyword) return true

    const haystack = [
      record.sub_order_number,
      record.buyer_name,
      record.customer_name,
      record.asin,
      record.old_amazon_order_id,
      record.business_manager_name,
    ].join(' ').toLowerCase()
    return haystack.includes(keyword)
  })
}

let buyerSearchTimer: ReturnType<typeof setTimeout> | null = null
function searchBuyers(keyword: string) {
  if (buyerSearchTimer) clearTimeout(buyerSearchTimer)
  if (!keyword) {
    buyerResults.value = []
    return
  }
  buyerSearchTimer = setTimeout(async () => {
    searchingBuyers.value = true
    const kw = `%${keyword}%`
    const { data } = await supabase
      .from('erp_buyers')
      .select('id, buyer_number, name, country, total_completed')
      .neq('status', '黑名单')
      .or(`name.ilike.${kw},buyer_number.ilike.${kw}`)
      .limit(20)
    buyerResults.value = data || []
    searchingBuyers.value = false
  }, 300)
}

function onReplacementBuyerChange(buyerId: string) {
  const buyer = buyerResults.value.find(item => item.id === buyerId)
  editForm.replacement_buyer_name = buyer?.name || ''
}

function onPrincipalChange() {
  if (!['待追回', '已损失'].includes(editForm.principal_status)) {
    editForm.principal_amount = 0
    editForm.principal_reason = ''
    editForm.blacklist_buyer = false
  } else if (!editForm.principal_amount) {
    editForm.principal_amount = Number(currentIssue.value?.product_price || 0)
  }
}

function openDetail(record: any) {
  drawerMode.value = 'detail'
  hydrateIssueForm(record)
  drawerOpen.value = true
}

function openHandle(record: any) {
  drawerMode.value = 'handle'
  hydrateIssueForm(record)
  handleAction.value = inferHandleAction(normalizeIssueStatus(record.issue_status))
    || (record.issue_type === '本金多返' ? 'recover-principal' : '')
  drawerOpen.value = true
}

function openActionModal(record: any, type: 'replace-order' | 'reorder') {
  currentIssue.value = record
  hydrateIssueForm(record)
  actionModalType.value = type
  actionModalOpen.value = true
}

function closeActionModal() {
  actionModalOpen.value = false
  actionModalType.value = ''
}

function hydrateIssueForm(record: any) {
  currentIssue.value = record
  Object.assign(editForm, {
    principal_status: getPrincipalStatus(record),
    principal_reason: record.principal_reason || (record.principal_stolen ? '被骗' : ''),
    principal_amount: getPrincipalAmount(record),
    recovered_amount: getPrincipalAmount(record) || Number(record.product_price || 0),
    recovery_method: record.recovery_method || 'direct',
    recovery_new_sub_order_number: record.recovery_new_sub_order_number || '',
    new_amazon_order_id: record.new_amazon_order_id || '',
    profit_diff: Number(record.profit_diff || 0),
    loss_amount: Number(record.loss_amount || 0),
    replacement_buyer_id: record.replacement_buyer_id || undefined,
    replacement_buyer_name: record.replacement_buyer_name || '',
    replacement_sub_order_number: record.replacement_sub_order_number || '',
    refund_to_client_method: record.refund_to_client_method || '',
    refund_to_client_amount: Number(record.refund_to_client_amount || 0),
    refund_to_client_notes: record.refund_to_client_notes || '',
    resolution_notes: record.resolution_notes || '',
    transfer_to_staff: record.transfer_to_staff || '',
    issue_status: normalizeIssueStatus(record.issue_status),
    blacklist_buyer: false,
  })
}

function inferHandleAction(status: string) {
  if (status === '已替换单号') return 'replace-order'
  if (status === '已补单') return 'reorder'
  if (status === '需补单') return 'mark-need-reorder'
  if (status === '已追回本金') return 'recover-principal'
  if (status === '已关闭') return 'mark-closed'
  if (status === '无需处理') return 'mark-no-need'
  return ''
}

function setHandleAction(action: HandleActionKey) {
  handleAction.value = action
}

function getHandleActionHint() {
  if (handleAction.value === 'mark-need-reorder') return '仅标记为需补单，后续可再进入处理补齐新子订单信息。'
  if (handleAction.value === 'recover-principal') return '记录追回金额和追回方式，并将本金状态恢复正常。'
  if (handleAction.value === 'transfer-other') return '当前业务员处理不了，转交给指定人员继续处理。'
  if (handleAction.value === 'release-grab') return '当前业务员处理不了，释放到抢单大厅由其他人认领。'
  if (handleAction.value === 'mark-closed') return '确认该问题单不再继续处理，关闭后保留处理备注。'
  if (handleAction.value === 'mark-no-need') return '确认无需补单、无需追回或客户已接受当前处理。'
  return ''
}

function getHandleActionTitle() {
  return handleActionOptions.find(item => item.key === handleAction.value)?.label || '处理操作'
}

function getHandleNotePlaceholder() {
  if (handleAction.value === 'mark-need-reorder') return '说明为什么需要补单，以及后续安排...'
  if (handleAction.value === 'transfer-other') return '说明为什么需要转交，以及交接重点...'
  if (handleAction.value === 'release-grab') return '说明为什么放入抢单大厅，以及需要注意的事项...'
  if (handleAction.value === 'mark-closed') return '说明关闭原因...'
  if (handleAction.value === 'mark-no-need') return '说明无需处理的原因...'
  return '填写处理备注...'
}

function getRecoveryMethodLabel(method: string) {
  if (method === 'offset') return '新单抵扣'
  return '买手直接退还'
}

async function handleUpdate() {
  if (!currentIssue.value) return
  if (!handleAction.value) {
    message.warning('请选择一个操作')
    return
  }

  try {
    const actionStatusMap = {
      'replace-order': '已替换单号',
      'reorder': '已补单',
      'mark-need-reorder': '需补单',
      'recover-principal': '已追回本金',
      'transfer-other': '处理中',
      'release-grab': '处理中',
      'mark-closed': '已关闭',
      'mark-no-need': '无需处理',
    } as const
    const normalizedStatus = actionStatusMap[handleAction.value]
    const update: any = {
      issue_status: normalizedStatus,
    }

    if (handleAction.value === 'replace-order') {
      const newAmazonOrderId = editForm.new_amazon_order_id.trim()
      if (!newAmazonOrderId) {
        message.warning('请填写新的亚马逊订单号')
        return
      }
      update.new_amazon_order_id = newAmazonOrderId
    }

    if (handleAction.value === 'reorder') {
      const replacementSubOrderNumber = editForm.replacement_sub_order_number.trim()
      if (!editForm.replacement_buyer_id && !replacementSubOrderNumber) {
        message.warning('请至少填写补单买手或补单子订单号')
        return
      }
      update.replacement_buyer_id = editForm.replacement_buyer_id || null
      update.replacement_buyer_name = editForm.replacement_buyer_name
      update.replacement_sub_order_number = replacementSubOrderNumber
      update.new_amazon_order_id = editForm.new_amazon_order_id.trim() || null
      update.resolution_notes = editForm.resolution_notes?.trim()
        || `补单回流：${currentIssue.value.sub_order_number || '原子订单'} -> ${replacementSubOrderNumber || '新子订单待确认'}`
    }

    if (handleAction.value === 'recover-principal') {
      if (!editForm.recovered_amount || Number(editForm.recovered_amount) <= 0) {
        message.warning('请填写追回金额')
        return
      }
      if (editForm.recovery_method === 'offset' && !editForm.recovery_new_sub_order_number?.trim()) {
        message.warning('请填写抵扣新子订单ID')
        return
      }
      const recoveryDesc = editForm.recovery_method === 'offset'
        ? `追回本金 $${Number(editForm.recovered_amount).toFixed(2)}，方式：新单抵扣，新子订单ID：${editForm.recovery_new_sub_order_number.trim()}`
        : `追回本金 $${Number(editForm.recovered_amount).toFixed(2)}，方式：买手直接退还`
      update.principal_status = '正常'
      update.principal_amount = Number(editForm.recovered_amount)
      update.resolution_notes = editForm.resolution_notes?.trim() || recoveryDesc
      if (editForm.recovery_method === 'offset') {
        update.replacement_sub_order_number = editForm.recovery_new_sub_order_number.trim()
      }
    }

    if (['mark-need-reorder', 'mark-closed', 'mark-no-need'].includes(handleAction.value)) {
      update.resolution_notes = editForm.resolution_notes?.trim() || getHandleActionHint()
    }

    if (handleAction.value === 'transfer-other') {
      if (!editForm.transfer_to_staff?.trim()) {
        message.warning('请填写接手人')
        return
      }
      update.resolution_notes = editForm.resolution_notes?.trim() || `转交给 ${editForm.transfer_to_staff.trim()} 继续处理`
    }

    if (handleAction.value === 'release-grab') {
      update.resolution_notes = editForm.resolution_notes?.trim() || '已放入抢单大厅，等待其他业务员认领处理'
    }

    const closedStatuses = ['已替换单号', '已补单', '已追回本金', '已关闭', '无需处理']
    update.resolved_at = closedStatuses.includes(normalizedStatus) ? new Date().toISOString() : null
    if (normalizedStatus !== '无需处理') {
      update.refund_to_client_at = null
    }

    saving.value = true
    if (isMockIssue(currentIssue.value)) {
      const nextMockIssues = loadMockIssuesState().map(item => item.id === currentIssue.value.id ? {
        ...item,
        ...update,
        updated_at: new Date().toISOString(),
      } : item)
      saveMockIssuesState(nextMockIssues)
    } else {
      const { error } = await supabase.from('after_sale_issues').update(update).eq('id', currentIssue.value.id)
      if (error) throw error
    }

    if (!isMockIssue(currentIssue.value) && handleAction.value === 'replace-order' && editForm.new_amazon_order_id && currentIssue.value.sub_order_id) {
      await supabase.from('sub_orders').update({
        amazon_order_id: editForm.new_amazon_order_id.trim(),
      }).eq('id', currentIssue.value.sub_order_id)
    }

    message.success('操作已保存')
    drawerOpen.value = false
    await load()
    emit('changed')
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    saving.value = false
  }
}

async function submitActionModal() {
  if (!currentIssue.value || !actionModalType.value) return

  saving.value = true
  try {
    if (actionModalType.value === 'replace-order') {
      const newAmazonOrderId = editForm.new_amazon_order_id.trim()
      if (!newAmazonOrderId) {
        message.warning('请填写新的亚马逊订单号')
        return
      }

      const { error } = await supabase
        .from('after_sale_issues')
        .update({
          issue_status: '已替换单号',
          new_amazon_order_id: newAmazonOrderId,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', currentIssue.value.id)
      if (error) throw error

      if (currentIssue.value.sub_order_id) {
        await supabase.from('sub_orders').update({
          amazon_order_id: newAmazonOrderId,
        }).eq('id', currentIssue.value.sub_order_id)
      }
    }

    if (actionModalType.value === 'reorder') {
      const replacementSubOrderNumber = editForm.replacement_sub_order_number.trim()
      if (!editForm.replacement_buyer_id && !replacementSubOrderNumber) {
        message.warning('请至少填写补单买手或补单子订单号')
        return
      }

      const { error } = await supabase
        .from('after_sale_issues')
        .update({
          issue_status: '已补单',
          replacement_buyer_id: editForm.replacement_buyer_id || null,
          replacement_buyer_name: editForm.replacement_buyer_name,
          replacement_sub_order_number: replacementSubOrderNumber,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', currentIssue.value.id)
      if (error) throw error
    }

    message.success('操作已保存')
    closeActionModal()
    await load()
    emit('changed')
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    saving.value = false
  }
}

async function quickUpdateStatus(record: any, status: '需补单' | '已关闭' | '无需处理') {
  saving.value = true
  try {
    const update: any = {
      issue_status: status,
      resolved_at: status === '需补单' ? null : new Date().toISOString(),
    }
    if (status !== '无需处理') {
      update.refund_to_client_at = null
    }

    const { error } = await supabase.from('after_sale_issues').update(update).eq('id', record.id)
    if (error) throw error

    message.success('状态已更新')
    await load()
    emit('changed')
  } catch (e: any) {
    message.error('保存失败：' + e.message)
  } finally {
    saving.value = false
  }
}

function normalizeIssueStatus(status: string) {
  if (status === '已替换订单') return '已替换单号'
  if (status === '已退款给客户') return '无需处理'
  return status || '待处理'
}

function fmtDateTime(value: string) {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '--'
}

function fmtShortTime(value: string) {
  return value ? dayjs(value).format('MM-DD HH:mm') : '--'
}

function getHandledTime(record: any) {
  return record.resolved_at || record.updated_at || record.created_at || ''
}

function getAfterSaleDetailTimeline(record: any) {
  if (Array.isArray(record._mock_timeline) && record._mock_timeline.length) {
    return record._mock_timeline.map((item: any, index: number) => ({
      key: `mock-${index}`,
      type: item.type || 'processing',
      title: item.title,
      desc: item.desc || '',
      time: item.time,
    })).filter((item: any) => !!item.time)
  }
  const rows = [
    {
      key: 'created',
      type: 'created',
      title: '创建问题单',
      desc: record.issue_type || '',
      time: record.created_at,
    },
  ]
  const normalized = normalizeIssueStatus(record.issue_status)
  if (normalized !== '待处理') {
    rows.push({
      key: 'processing',
      type: 'processing',
      title: ['处理中', '需补单'].includes(normalized) ? normalized : '进入处理',
      desc: record.resolution_notes || '',
      time: record.updated_at || record.created_at,
    })
  }
  if (['已替换单号', '已补单', '已追回本金', '已关闭', '无需处理'].includes(normalized)) {
    rows.push({
      key: 'resolved',
      type: 'resolved',
      title: normalized,
      desc: getResolutionSummary(record) || getAfterSaleProgressSubText(record),
      time: record.resolved_at || record.updated_at || record.created_at,
    })
  }
  return rows.filter(item => !!item.time)
}

function getPrincipalDescription(record: any) {
  if (record.issue_type === '本金多返') return '多返本金待确认或追回'
  if (record.principal_stolen || getPrincipalAmount(record) > 0) return '存在本金损失风险'
  return '暂无本金异常'
}

function isOrderNumberReplacement(record: any) {
  return normalizeIssueStatus(record.issue_status) === '已替换单号' || !!record.new_amazon_order_id
}

function isReorderResult(record: any) {
  return normalizeIssueStatus(record.issue_status) === '已补单' || !!record.replacement_sub_order_number
}

function getResolutionMethodLabel(record: any) {
  const normalized = normalizeIssueStatus(record.issue_status)
  if (normalized === '已替换单号') return '已修改订单号'
  if (normalized === '已补单') return '已补单'
  if (normalized === '需补单') return '需补单'
  if (normalized === '已追回本金') return '已追回本金'
  if (normalized === '已关闭') return '已关闭'
  if (normalized === '无需处理') return '无需处理'
  if (normalized === '处理中') return '处理中'
  return ''
}

function getResolutionSummary(record: any) {
  const normalized = normalizeIssueStatus(record.issue_status)
  if (normalized === '已替换单号') {
    return record.new_amazon_order_id
      ? `订单号：${record.old_amazon_order_id || '原订单'} -> ${record.new_amazon_order_id}`
      : '已替换亚马逊订单号'
  }
  if (normalized === '已补单') {
    return record.replacement_sub_order_number
      ? `补单：${record.sub_order_number || '原子订单'} -> ${record.replacement_sub_order_number}`
      : '已安排补单'
  }
  if (normalized === '需补单') return '已判定需要补单，等待补单信息'
  if (normalized === '已追回本金') return `已追回本金 $${getPrincipalAmount(record).toFixed(2)}`
  if (normalized === '已关闭') return '问题单已关闭'
  if (normalized === '无需处理') return record.refund_to_client_amount
    ? `已处理客户返款 $${Number(record.refund_to_client_amount || 0).toFixed(2)}`
    : '无需继续处理'
  if (record.issue_type === '不下单') return '待判断补单、关闭或无需处理'
  if (record.issue_type === '取消') return '待确认取消后的本金和客户处理'
  if (record.issue_type === '退款') return '待确认退款方式和客户返款'
  if (record.issue_type === '无此订单') return '待确认订单号修改或补单'
  if (record.issue_type === '本金多返') return '待追回多返本金'
  return ''
}

function maskProgressValue(value: string) {
  const raw = String(value || '').trim()
  if (!raw) return ''
  if (raw.length <= 4) return raw
  return `${raw.slice(0, 4)}***`
}

function getAfterSaleProgressMainStatus(record: any) {
  const normalized = normalizeIssueStatus(record.issue_status)
  if (['已替换单号', '已补单', '已追回本金', '已关闭', '无需处理'].includes(normalized)) return '已处理'
  if (['处理中', '需补单'].includes(normalized)) return '处理中'
  return '待处理'
}

function showPendingReorderAlert(record: any) {
  return normalizeIssueStatus(record.issue_status) === '需补单'
}

function getAfterSaleProgressSubText(record: any) {
  const normalized = normalizeIssueStatus(record.issue_status)
  if (normalized === '已关闭') return '已关闭'
  if (normalized === '无需处理') return '无需处理'
  if (normalized === '已替换单号') {
    return record.new_amazon_order_id
      ? `已换新单号 ${maskProgressValue(record.new_amazon_order_id)}`
      : '已换新单号'
  }
  if (normalized === '已补单') {
    return record.replacement_sub_order_number
      ? `已补新单 ${maskProgressValue(record.replacement_sub_order_number)}`
      : '已补新单'
  }
  if (normalized === '已追回本金') {
    const amount = getPrincipalAmount(record)
    return amount > 0 ? `已追回本金 $${amount.toFixed(2)}` : '已追回本金'
  }
  if (normalized === '需补单') return '待确认补单方案'
  if (normalized === '处理中') return record.resolution_notes || '处理中'
  return record.resolution_notes || '待处理'
}

function afterSaleProgressTagColor(record: any) {
  const main = getAfterSaleProgressMainStatus(record)
  if (main === '已处理') return 'green'
  if (main === '处理中') return 'processing'
  return 'orange'
}

function getPrincipalStatus(record: any) {
  if (record.principal_status === '损失') return '已损失'
  if (record.principal_status) return record.principal_status
  if (record.issue_type === '本金多返') return '待追回'
  if (record.principal_stolen || Number(record.principal_amount || 0) > 0) return '已损失'
  return '待确定'
}

function getPrincipalStatusColor(record: any) {
  const status = getPrincipalStatus(record)
  if (status === '正常') return 'green'
  if (status === '待追回') return 'orange'
  if (status === '已损失') return 'red'
  return 'default'
}

function getPrincipalAmount(record: any) {
  return Number(record.principal_amount || record.profit_diff || record.loss_amount || 0)
}

function shouldShowPrincipalAmount(record: any) {
  return ['待追回', '已损失'].includes(getPrincipalStatus(record)) && getPrincipalAmount(record) > 0
}

function hasAfterSaleResult(record: any) {
  return !!getResolutionMethodLabel(record)
    || shouldShowPrincipalAmount(record)
    || !!record.new_amazon_order_id
    || !!record.replacement_sub_order_number
    || !!record.refund_to_client_method
    || !!record.refund_to_client_amount
    || !!record.resolution_notes
    || !!record.refund_to_client_notes
}

async function handleDelete() {
  if (!currentIssue.value) return
  const { error } = await supabase.from('after_sale_issues').delete().eq('id', currentIssue.value.id)
  if (error) {
    message.error('删除失败')
    return
  }
  message.success('已删除')
  drawerOpen.value = false
  await load()
  emit('changed')
}

function handleTableChange(pag: any) {
  pagination.value.current = pag.current
  pagination.value.pageSize = pag.pageSize
  load()
}

watch(() => [props.issueId, props.subOrder, props.staffId], () => {
  pagination.value.current = 1
  load()
}, { immediate: true })
</script>

<style scoped>
.after-sale-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.status-filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.status-filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s ease;
}

.status-filter-btn span {
  font-size: 13px;
  font-weight: 600;
}

.status-filter-btn em {
  font-style: normal;
  font-size: 12px;
  color: #9ca3af;
}

.status-filter-btn:hover {
  border-color: #bfdbfe;
  background: #eff6ff;
  color: #2563eb;
}

.status-filter-btn.active {
  border-color: #2563eb;
  background: #eff6ff;
  color: #2563eb;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.12);
}

.status-filter-btn.active em { color: inherit; }
.status-filter-btn.all.active { background: #eff6ff; }
.status-filter-btn.tone-pending.active { border-color: #d97706; background: rgba(217, 119, 6, 0.1); color: #d97706; }
.status-filter-btn.tone-processing.active { border-color: #2563eb; background: rgba(37, 99, 235, 0.1); color: #2563eb; }
.status-filter-btn.tone-replaced.active { border-color: #06b6d4; background: rgba(6, 182, 212, 0.1); color: #0891b2; }
.status-filter-btn.tone-need-reorder.active { border-color: #dc2626; background: rgba(220, 38, 38, 0.08); color: #dc2626; }
.status-filter-btn.tone-reordered.active { border-color: #059669; background: rgba(5, 150, 105, 0.08); color: #059669; }
.status-filter-btn.tone-closed.active { border-color: #6b7280; background: rgba(107, 114, 128, 0.08); color: #4b5563; }
.status-filter-btn.tone-refunded.active { border-color: #7c3aed; background: rgba(124, 58, 237, 0.08); color: #7c3aed; }

.after-sale-overview {
  padding: 16px 18px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
}
.after-sale-overview-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}
.after-sale-overview-title {
  color: #1a1a2e;
  font-size: 18px;
  font-weight: 800;
}
.after-sale-overview-desc {
  margin-top: 4px;
  color: #6b7280;
  font-size: 12px;
}
.after-sale-overview-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}
.after-sale-overview-metric {
  min-height: 88px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f8fafc;
}
.after-sale-overview-metric span {
  display: block;
  color: #6b7280;
  font-size: 12px;
  font-weight: 700;
}
.after-sale-overview-metric strong {
  display: block;
  margin-top: 8px;
  color: #1a1a2e;
  font-size: 28px;
  line-height: 1;
}
.after-sale-overview-metric em {
  display: block;
  margin-top: 8px;
  color: #6b7280;
  font-size: 12px;
  font-style: normal;
}
.after-sale-overview-metric.is-success strong { color: #059669; }
.after-sale-overview-metric.is-danger {
  border-color: rgba(220, 38, 38, 0.16);
  background: rgba(220, 38, 38, 0.05);
}
.after-sale-overview-metric.is-danger strong,
.after-sale-overview-metric.is-danger em { color: #dc2626; }

.stats-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 12px;
}

.stat-card {
  background: #fff;
  border-radius: 10px;
  padding: 16px;
  text-align: center;
  border: 1px solid #f0f0f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.stat-val { font-size: 24px; font-weight: 800; }
.stat-label { font-size: 11px; color: #6b7280; margin-top: 4px; }
.stat-pending .stat-val { color: #d97706; }
.stat-processing .stat-val { color: #2563eb; }
.stat-replaced .stat-val { color: #06b6d4; }
.stat-need-reorder .stat-val { color: #dc2626; }
.stat-reordered .stat-val { color: #059669; }
.stat-closed .stat-val { color: #6b7280; }
.stat-refunded .stat-val { color: #7c3aed; }

.card-panel {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  border: 1px solid #f0f0f0;
}

.toolbar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  align-items: center;
  flex-wrap: wrap;
}

.total-hint { font-size: 12px; color: #9ca3af; margin-left: auto; }

.link-text { color: #2563eb; cursor: pointer; font-family: 'Courier New', monospace; font-size: 12px; font-weight: 600; }
.cell-info { display: flex; flex-direction: column; gap: 2px; }
.cell-meta { font-size: 11px; color: #9ca3af; }
.cell-amazon-id { font-size: 10px; color: #9ca3af; font-family: 'Courier New', monospace; }
.cell-client-name { font-weight: 600; font-size: 13px; color: #1a1a2e; }
.cell-result-main { color: #1a1a2e; font-size: 12px; font-weight: 700; }
.amount-usd { font-weight: 700; color: #dc2626; }
.amount-loss { font-size: 12px; font-weight: 700; color: #dc2626; }
.text-gray { color: #9ca3af; font-size: 12px; }
.cell-new-order { font-family: 'Courier New', monospace; font-size: 11px; color: #059669; font-weight: 600; }
.cell-profit { font-size: 11px; color: #059669; }
.cell-replacement { font-size: 12px; color: #374151; }
.cell-refund-method { font-size: 12px; color: #7c3aed; font-weight: 600; }
.cell-refund-amount { font-size: 11px; color: #dc2626; font-weight: 700; }
.after-sale-progress-cell { display: flex; flex-direction: column; gap: 6px; }
.after-sale-progress-main { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.after-sale-progress-tag { margin: 0; }
.after-sale-alert-tag {
  margin: 0;
  font-weight: 700;
  border-color: #dc2626;
  color: #dc2626;
  background: rgba(220, 38, 38, 0.08);
}
.after-sale-progress-sub {
  font-size: 12px;
  color: #6b7280;
  line-height: 1.4;
  word-break: break-all;
}
.remark-text { font-size: 12px; color: #374151; }
.action-btns { display: flex; flex-wrap: wrap; gap: 2px 6px; }

.drawer-section { margin-bottom: 24px; }
.drawer-section-title { font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 12px; padding-bottom: 6px; border-bottom: 1px solid #f0f0f0; }

.after-sale-detail {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.after-sale-hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}
.after-sale-hero-main {
  min-width: 0;
  flex: 1;
}
.after-sale-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  color: #1a1a2e;
  font-size: 16px;
  font-weight: 800;
}
.after-sale-product {
  margin-top: 6px;
  color: #1f2937;
  font-size: 14px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.after-sale-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 6px;
  color: #6b7280;
  font-size: 12px;
}
.after-sale-risk-card {
  min-width: 120px;
  padding: 10px 12px;
  border: 1px solid rgba(220, 38, 38, 0.16);
  border-radius: 12px;
  background: rgba(220, 38, 38, 0.06);
  text-align: right;
}
.after-sale-risk-card span {
  display: block;
  color: #6b7280;
  font-size: 11px;
}
.after-sale-risk-card strong {
  display: block;
  margin-top: 3px;
  color: #dc2626;
  font-size: 16px;
}
.after-sale-risk-card em {
  display: block;
  margin-top: 2px;
  color: #dc2626;
  font-size: 12px;
  font-style: normal;
  font-weight: 700;
}
.after-sale-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.after-sale-card {
  padding: 10px 12px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.04);
}
.after-sale-card.is-wide {
  grid-column: 1 / -1;
}
.after-sale-card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid #eef2f7;
  color: #1f2937;
  font-size: 13px;
  font-weight: 700;
}
.after-sale-card-title::before {
  content: '';
  width: 4px;
  height: 14px;
  border-radius: 999px;
  background: #2563eb;
}
.after-sale-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}
.after-sale-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 34px;
  padding: 6px 9px;
  border: 1px solid #eef2f7;
  border-radius: 10px;
  background: #f8fafc;
}
.after-sale-field.wide {
  grid-column: 1 / -1;
  align-items: flex-start;
}
.after-sale-field span {
  min-width: 72px;
  padding-right: 8px;
  border-right: 1px solid #dbe3ee;
  color: #6b7280;
  font-size: 11px;
  font-weight: 600;
  flex-shrink: 0;
}
.after-sale-field strong {
  min-width: 0;
  flex: 1;
  color: #1f2937;
  font-size: 13px;
  text-align: right;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.after-sale-field.wide strong {
  text-align: left;
  white-space: normal;
  line-height: 1.5;
}
.after-sale-empty-row {
  grid-column: 1 / -1;
  padding: 10px;
  border: 1px dashed #dbe3ee;
  border-radius: 10px;
  background: #f8fafc;
  color: #9ca3af;
  font-size: 13px;
  text-align: center;
}
.after-sale-flow {
  padding: 4px 2px 0;
}
.after-sale-flow-title {
  margin-bottom: 12px;
  color: #1f2937;
  font-size: 13px;
  font-weight: 800;
}
.after-sale-timeline {
  display: flex;
  flex-direction: column;
  padding-left: 4px;
}
.after-sale-timeline-item {
  display: flex;
  gap: 10px;
}
.after-sale-timeline-item:last-child .after-sale-timeline-line {
  display: none;
}
.after-sale-timeline-axis {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}
.after-sale-timeline-dot {
  width: 10px;
  height: 10px;
  margin-top: 5px;
  border-radius: 50%;
  background: #d97706;
}
.after-sale-timeline-dot.is-processing { background: #2563eb; }
.after-sale-timeline-dot.is-resolved { background: #059669; }
.after-sale-timeline-line {
  width: 2px;
  flex: 1;
  min-height: 26px;
  margin-top: 4px;
  background: #e5e7eb;
}
.after-sale-timeline-content {
  flex: 1;
  min-width: 0;
  padding-bottom: 12px;
}
.after-sale-timeline-title {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  color: #1f2937;
  font-size: 13px;
}
.after-sale-timeline-title span {
  color: #6b7280;
  font-size: 12px;
  white-space: nowrap;
}
.after-sale-timeline-desc {
  margin-top: 4px;
  color: #6b7280;
  font-size: 12px;
}

.detail-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px 16px; }
.detail-item { display: flex; flex-direction: column; gap: 3px; }
.detail-item.full3 { grid-column: 1 / -1; }
.detail-label { font-size: 11px; color: #9ca3af; font-weight: 500; }
.detail-val { font-size: 13px; color: #1a1a2e; }
.detail-val.mono { font-family: 'Courier New', monospace; font-size: 12px; }

.handle-box {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 16px;
}

.handle-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.handle-action-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}
.handle-action-card {
  min-height: 72px;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  text-align: left;
  cursor: pointer;
  transition: all 0.16s ease;
}
.handle-action-card:hover {
  border-color: #bfdbfe;
  background: #eff6ff;
}
.handle-action-card.active {
  border-color: #2563eb;
  background: rgba(37, 99, 235, 0.08);
  box-shadow: 0 6px 14px rgba(37, 99, 235, 0.12);
}
.handle-action-card strong {
  display: block;
  color: #1a1a2e;
  font-size: 13px;
}
.handle-action-card span {
  display: block;
  margin-top: 5px;
  color: #6b7280;
  font-size: 12px;
  line-height: 1.4;
}
.handle-action-card.is-danger.active {
  border-color: rgba(220, 38, 38, 0.28);
  background: rgba(220, 38, 38, 0.07);
}
.handle-action-card.is-success.active {
  border-color: rgba(5, 150, 105, 0.28);
  background: rgba(5, 150, 105, 0.08);
}
.handle-action-card.is-purple.active {
  border-color: rgba(124, 58, 237, 0.28);
  background: rgba(124, 58, 237, 0.08);
}
.handle-box-title {
  margin-bottom: 12px;
  color: #1f2937;
  font-size: 14px;
  font-weight: 800;
}
.handle-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 12px;
}
.handle-form-grid :deep(.ant-form-item:last-child) {
  grid-column: 1 / -1;
}
.handle-alert {
  margin-bottom: 12px;
}
.reorder-editor {
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #f8fafc;
}
.reorder-editor-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.reorder-editor-title {
  color: #1a1a2e;
  font-size: 15px;
  font-weight: 800;
}
.reorder-editor-sub {
  margin-top: 4px;
  color: #6b7280;
  font-size: 12px;
}
.reorder-editor-section {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
}
.reorder-editor-section-title {
  margin-bottom: 10px;
  color: #1f2937;
  font-size: 13px;
  font-weight: 800;
}
.reorder-flow-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 36px minmax(0, 1fr);
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid #dbeafe;
  border-radius: 12px;
  background: #eff6ff;
}
.reorder-flow-card span {
  display: block;
  color: #6b7280;
  font-size: 11px;
  font-weight: 700;
}
.reorder-flow-card strong {
  display: block;
  margin-top: 4px;
  color: #1a1a2e;
  font-size: 13px;
}
.reorder-arrow {
  color: #2563eb;
  font-size: 18px;
  font-weight: 800;
  text-align: center;
}
.handle-confirm-card {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 12px;
  padding: 12px;
  border: 1px solid #dbeafe;
  border-radius: 12px;
  background: #eff6ff;
}
.handle-confirm-card strong {
  color: #1f2937;
  font-size: 14px;
}
.handle-confirm-card span {
  color: #6b7280;
  font-size: 12px;
}
.handle-confirm-card.is-purple {
  border-color: rgba(124, 58, 237, 0.2);
  background: rgba(124, 58, 237, 0.07);
}
.handle-confirm-card.is-gray {
  border-color: #e5e7eb;
  background: #f8fafc;
}
.handle-note-form {
  margin-top: 0;
}
.handle-action-hint { font-size: 13px; color: #6b7280; line-height: 1.6; }

.buyer-option { display: flex; flex-direction: column; }
.buyer-option-meta { font-size: 11px; color: #9ca3af; }

.drawer-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; padding-top: 16px; border-top: 1px solid #f0f0f0; }

@media (max-width: 900px) {
  .after-sale-overview-head { flex-direction: column; }
  .after-sale-overview-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .stats-row { grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .stat-card { padding: 10px; }
  .stat-val { font-size: 18px; }
  .after-sale-hero { align-items: flex-start; flex-direction: column; }
  .after-sale-risk-card { width: 100%; text-align: left; }
  .after-sale-detail-grid,
  .after-sale-field-grid { grid-template-columns: 1fr; }
  .handle-action-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .detail-grid-3 { grid-template-columns: 1fr 1fr; }
}
</style>
