<template>
  <div class="create-task-form">
    <a-card class="form-card" :bordered="false">
      <div class="page-layout">
        <div class="basic-panel">
          <div class="section-card basic-section-card">
            <div class="section-header">
              <div class="section-title">基础信息</div>
            </div>
        <a-form
          ref="basicFormRef"
          :model="basicFormData"
          :rules="basicFormRules"
          :label-col="{ span: 8 }"
          :wrapper-col="{ span: 16 }"
          class="basic-info-form"
          :disabled="isView"
        >
          <!-- 客户姓名/ID 和 收款模式 左右布局 -->
          <a-row :gutter="24">
            <a-col :span="24">
              <a-form-item
                label="客户姓名/ID"
                name="customer_id"
                :label-col="{ span: 8 }"
                :wrapper-col="{ span: 16 }"
              >
                <a-select
                  :value="customerSelectValue"
                  placeholder="请选择客户姓名/ID"
                  size="middle"
                  show-search
                  :filter-option="false"
                  :loading="customerSearchLoading"
                  :options="customerOptions"
                  :field-names="{ label: 'label', value: 'option_key' }"
                  :not-found-content="customerSearchLoading ? undefined : (customerSearchKeyword ? '无匹配客户' : '请输入客户姓名/ID检索')"
                  @search="handleCustomerSearch"
                  @change="handleCustomerChange"
                  allow-clear
                />
                <div v-if="customerDiffBalanceHint" class="customer-diff-balance">
                  总差价：
                  <span :class="customerDiffBalanceHint.toneClass">{{ customerDiffBalanceHint.total }}</span>
                </div>
              </a-form-item>
            </a-col>
            <a-col v-if="groupChatOptions.length" :span="24">
              <a-form-item
                label="反馈群组"
                name="group_chat_name"
                :label-col="{ span: 8 }"
                :wrapper-col="{ span: 16 }"
              >
                <a-select
                  v-model:value="basicFormData.group_chat_name"
                  placeholder="请选择反馈到哪个群组"
                  size="middle"
                  :options="groupChatOptions"
                  allow-clear
                />
              </a-form-item>
            </a-col>
            <a-col :span="24">
              <a-form-item
                label="收款模式"
                name="payment_mode"
                :label-col="{ span: 8 }"
                :wrapper-col="{ span: 16 }"
              >
                <a-select
                  v-model:value="basicFormData.payment_mode"
                  placeholder="请选择收款模式"
                  size="middle"
                >
                  <a-select-option :value="1">纯人民币</a-select-option>
                  <a-select-option :value="2">混合模式</a-select-option>
                </a-select>
              </a-form-item>
            </a-col>
          </a-row>

          <!-- 纯人民币模式 -->
          <template v-if="basicFormData.payment_mode === 1">
            <a-row :gutter="24">
              <a-col :span="24">
                <a-form-item
                  label="应收款项"
                  name="receivable_rmb"
                  :label-col="{ span: 8 }"
                  :wrapper-col="{ span: 16 }"
                >
                  <a-input-number
                    v-model:value="basicFormData.receivable_rmb"
                    :min="0"
                    :precision="2"
                    placeholder="自动核算"
                    class="full-width"
                    size="middle"
                    :readonly="true"
                    :bordered="false"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="24">
                <a-form-item
                  label="实收款项"
                  :label-col="{ span: 8 }"
                  :wrapper-col="{ span: 16 }"
                >
                  <div class="batch-collection-list">
                    <div v-for="(row, index) in batchCollectionRows" :key="index" class="batch-collection-row">
                      <a-input-number
                        v-model:value="row.actual_cny_amount"
                        :min="0"
                        :precision="2"
                        placeholder="实收款项"
                        class="batch-collection-amount"
                        size="middle"
                        @change="syncBatchCollectionTotal"
                      />
                      <a-select
                        v-model:value="row.transfer_channel"
                        placeholder="收款账号"
                        class="batch-collection-account"
                        size="middle"
                        @change="syncBatchCollectionTotal"
                      >
                        <a-select-option :value="1">银行转账</a-select-option>
                        <a-select-option :value="2">支付宝</a-select-option>
                        <a-select-option :value="3">微信支付</a-select-option>
                        <a-select-option :value="4">PayPal</a-select-option>
                        <a-select-option :value="5">其他</a-select-option>
                      </a-select>
                      <a-button v-if="index === 0" :disabled="isView" @click="addBatchCollectionRow">+</a-button>
                      <a-button v-else danger :disabled="isView" @click="removeBatchCollectionRow(index)">删除</a-button>
                    </div>
                    <a-button :disabled="isView" @click="openOffsetModal">抵消</a-button>
                  </div>
                </a-form-item>
              </a-col>
            </a-row>
            <a-row :gutter="24">
              <a-col :span="24">
                <a-form-item
                  label="入账状态"
                  name="account_status"
                  :label-col="{ span: 8 }"
                  :wrapper-col="{ span: 16 }"
                >
                  <a-select
                    v-model:value="basicFormData.account_status"
                    placeholder="请选择入账状态"
                    size="middle"
                    @change="handleAccountStatusChange"
                  >
                    <a-select-option :value="1">基础入账完成</a-select-option>
                    <a-select-option :value="2">基础入账未完成</a-select-option>
                    <a-select-option :value="3">基础入账富余</a-select-option>
                  </a-select>
                  <!-- 只提示不拦截：提示出现时依然可以提交（李运侠 2026-09-03） -->
                  <div v-if="accountStatusExcessHint" class="account-status-hint">
                    {{ accountStatusExcessHint }}
                  </div>
                </a-form-item>
              </a-col>
            </a-row>
            <template v-if="showAccountDiffUi">
              <a-row :gutter="24">
                <a-col :span="24">
                  <a-form-item
                    :label="accountEntryAmountLabelCny"
                    :label-col="{ span: 8 }"
                    :wrapper-col="{ span: 16 }"
                  >
                    <a-input-number
                      v-model:value="accountEntryAmountForm.amount_cny"
                      :min="0"
                      :precision="2"
                      :placeholder="accountEntryAmountLabelCny"
                      class="full-width"
                      size="middle"
                      :disabled="isView"
                      @change="markAccountDiffManual"
                    />
                    <div class="account-diff-hint">默认按 |实收款项 − 应收款项| 带出，可改</div>
                  </a-form-item>
                </a-col>
              </a-row>
            </template>
            <a-form-item label="上传水单" name="upload_bill">
              <ImageUpload
                v-model="basicFormData.upload_bill"
                :multiple="false"
                :max-count="1"
                accept="image/*"
                :max-size="5"
                :disabled="isView"
                @file-change="handleBankSlipFileChange"
                @change="handleBankSlipListChange"
              />
            </a-form-item>
            <!-- 商务备注 -->
            <a-form-item
              label="商务备注"
              name="business_remarks"
              class="form-item"
            >
              <a-textarea
                v-model:value="basicFormData.business_remarks"
                placeholder="请输入商务备注"
                :rows="3"
                size="middle"
              />
            </a-form-item>
          </template>

          <!-- 混合模式 -->
          <template v-if="basicFormData.payment_mode === 2">
            <a-row :gutter="24">
              <a-col :span="24">
                <a-form-item
                  label="应收款项(USD)"
                  name="receivable_usd"
                  :label-col="{ span: 8 }"
                  :wrapper-col="{ span: 16 }"
                >
                  <a-input-number
                    v-model:value="basicFormData.receivable_usd"
                    :min="0"
                    :precision="2"
                    placeholder="自动核算"
                    class="full-width"
                    size="middle"
                    :readonly="true"
                    :bordered="false"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="24">
                <a-form-item
                  label="应收款项(CNY)"
                  name="receivable_rmb_mixed"
                  :label-col="{ span: 8 }"
                  :wrapper-col="{ span: 16 }"
                >
                  <a-input-number
                    v-model:value="basicFormData.receivable_rmb_mixed"
                    :min="0"
                    :precision="2"
                    placeholder="自动核算"
                    class="full-width"
                    size="middle"
                    :readonly="true"
                    :bordered="false"
                  />
                </a-form-item>
              </a-col>
            </a-row>
            <a-row :gutter="24">
              <a-col :span="24">
                <a-form-item
                  label="实收款项(USD)"
                  name="actually_amount_usd"
                  :label-col="{ span: 8 }"
                  :wrapper-col="{ span: 16 }"
                >
                  <div class="actual-amount-control">
                    <a-input-number
                      v-model:value="basicFormData.actually_amount_usd"
                      :min="0"
                      :precision="2"
                      placeholder="请输入实收款项"
                      class="actual-amount-input"
                      size="middle"
                      @change="handleActualAmountChange"
                    />
                    <a-button v-if="!props.createTaskOffset" :disabled="isView" @click="openOffsetModal">
                      抵消
                    </a-button>
                  </div>
                </a-form-item>
              </a-col>
              <a-col :span="24">
                <a-form-item
                  label="实收款项(CNY)"
                  name="actually_amount_mixed"
                  :label-col="{ span: 8 }"
                  :wrapper-col="{ span: 16 }"
                >
                  <div class="actual-amount-control">
                    <a-input-number
                      v-model:value="basicFormData.actually_amount_mixed"
                      :min="0"
                      :precision="2"
                      placeholder="请输入实收款项"
                      class="actual-amount-input"
                      size="middle"
                      @change="handleActualAmountChange"
                    />
                    <a-button v-if="!props.createTaskOffset" :disabled="isView" @click="openOffsetModal">
                      抵消
                    </a-button>
                  </div>
                </a-form-item>
              </a-col>
              <a-col v-if="props.createTaskOffset" :span="24">
                <a-form-item :wrapper-col="{ offset: 8, span: 16 }">
                  <a-button :disabled="isView" @click="openOffsetModal">抵消</a-button>
                </a-form-item>
              </a-col>
            </a-row>
            <!-- 汇款渠道 -->
            <a-row :gutter="24">
              <a-col :span="24">
                <a-form-item
                  label="汇款渠道"
                  name="remittance_channel"
                  :label-col="{ span: 8 }"
                  :wrapper-col="{ span: 16 }"
                >
                  <a-select
                    v-model:value="basicFormData.remittance_channel"
                    placeholder="请选择汇款渠道"
                    size="middle"
                  >
                    <a-select-option :value="1">银行转账</a-select-option>
                    <a-select-option :value="2">支付宝</a-select-option>
                    <a-select-option :value="3">微信支付</a-select-option>
                    <a-select-option :value="4">PayPal</a-select-option>
                    <a-select-option :value="5">其他</a-select-option>
                  </a-select>
                </a-form-item>
              </a-col>
            </a-row>
            <a-row :gutter="24">
              <a-col :span="24">
                <a-form-item
                  label="入账状态"
                  name="account_status"
                  :label-col="{ span: 8 }"
                  :wrapper-col="{ span: 16 }"
                >
                  <a-select
                    v-model:value="basicFormData.account_status"
                    placeholder="请选择入账状态"
                    size="middle"
                    @change="handleAccountStatusChange"
                  >
                    <a-select-option :value="1">基础入账完成</a-select-option>
                    <a-select-option :value="2">基础入账未完成</a-select-option>
                    <a-select-option :value="3">基础入账富余</a-select-option>
                  </a-select>
                  <!-- 只提示不拦截：提示出现时依然可以提交（李运侠 2026-09-03） -->
                  <div v-if="accountStatusExcessHint" class="account-status-hint">
                    {{ accountStatusExcessHint }}
                  </div>
                </a-form-item>
              </a-col>
            </a-row>
            <a-row v-if="!props.createTaskOffset" :gutter="24">
              <a-col :span="24">
                <a-form-item
                  label="现汇买入价格"
                  name="buying_price"
                  :label-col="{ span: 8 }"
                  :wrapper-col="{ span: 16 }"
                >
                  <a-input-number
                    v-model:value="basicFormData.buying_price"
                    :min="0"
                    :precision="4"
                    placeholder="请输入现汇买入价格"
                    class="full-width"
                    size="middle"
                  />
                </a-form-item>
              </a-col>
              <a-col :span="24">
                <a-form-item
                  label="现汇卖出价"
                  name="selling_price"
                  :label-col="{ span: 8 }"
                  :wrapper-col="{ span: 16 }"
                >
                  <a-input-number
                    v-model:value="basicFormData.selling_price"
                    :min="0"
                    :precision="4"
                    placeholder="请输入现汇卖出价"
                    class="full-width"
                    size="middle"
                  />
                </a-form-item>
              </a-col>
            </a-row>
            <template v-if="showAccountDiffUi">
              <a-row :gutter="24">
                <a-col :span="24">
                  <a-form-item
                    :label="accountEntryAmountLabelCny"
                    :label-col="{ span: 8 }"
                    :wrapper-col="{ span: 16 }"
                  >
                    <a-input-number
                      v-model:value="accountEntryAmountForm.amount_cny"
                      :min="0"
                      :precision="2"
                      :placeholder="accountEntryAmountLabelCny"
                      class="full-width"
                      size="middle"
                      :disabled="isView"
                      @change="markAccountDiffManual"
                    />
                    <div class="account-diff-hint">默认按 |实收款项 − 应收款项| 带出，可改</div>
                  </a-form-item>
                </a-col>
                <a-col :span="24">
                  <a-form-item
                    :label="accountEntryAmountLabelUsd"
                    :label-col="{ span: 8 }"
                    :wrapper-col="{ span: 16 }"
                  >
                    <a-input-number
                      v-model:value="accountEntryAmountForm.amount_usd"
                      :min="0"
                      :precision="2"
                      placeholder="混合模式可自动带出"
                      class="full-width"
                      size="middle"
                      :disabled="isView"
                      @change="markAccountDiffManual"
                    />
                  </a-form-item>
                </a-col>
              </a-row>
            </template>
            <a-form-item label="上传水单" name="upload_bill">
              <ImageUpload
                v-model="basicFormData.upload_bill"
                :multiple="true"
                :max-count="0"
                accept="image/*"
                :max-size="5"
                :disabled="isView"
                :capture-document-paste="!isView"
                @file-change="handleBankSlipFileChange"
                @change="handleBankSlipListChange"
              />
            </a-form-item>
            <!-- 商务备注 -->
            <a-form-item
              label="商务备注"
              name="business_remarks"
              class="form-item"
            >
              <a-textarea
                v-model:value="basicFormData.business_remarks"
                placeholder="请输入商务备注"
                :rows="3"
                size="middle"
              />
            </a-form-item>
          </template>
        </a-form>
          </div>
        </div>

        <div class="task-panel">
          <div class="section-card task-section-card">
            <div class="section-header task-section-header">
              <div class="section-title">任务信息</div>
              <a-button v-if="!isView" type="dashed" @click="addTask">
                新增任务
              </a-button>
            </div>
            <a-tabs v-model:activeKey="activeKey" class="task-tabs">
              <a-tab-pane
                v-for="pane in taskPanes"
                :key="pane.key"
                :closable="false"
              >
                <template #tab>
                  <div class="task-tab-label">
                    <span>{{ pane.title }}</span>
                    <button
                      v-if="!isView && pane.closable"
                      type="button"
                      class="task-tab-close"
                      @click.stop="removeTask(pane.key)"
                    >
                      <CloseOutlined />
                    </button>
                  </div>
                </template>
                <div class="task-item">
                  <TaskInfoForm
                    :key="`${formResetVersion}-${pane.key}`"
                    :ref="(instance: any) => setTaskFormRef(pane.key, instance)"
                    :task-key="pane.key"
                    :initial-data="tasksData[pane.key]"
                    :payment-mode="basicFormData.payment_mode"
                    :readonly="isView"
                    @update:data="handleTaskDataUpdate(pane.key, $event)"
                  />
                </div>
              </a-tab-pane>
            </a-tabs>
          </div>
        </div>
      </div>
    </a-card>
    <!--
      提交按钮。重置挪到最左侧、与提交拉开距离（《9.1 创建任务页面修改》6）：
      两个按钮原来紧挨着，重置会清空整张表单，误点代价很大。
    -->
    <div class="form-footer" v-if="!isView">
      <a-button
        size="large"
        @click="handleReset"
        class="reset-btn"
        :disabled="isView"
      >
        重置
      </a-button>
      <a-button
        type="primary"
        size="large"
        :loading="submitLoading"
        @click="handleSubmit"
        class="submit-btn"
      >
        提交
      </a-button>
    </div>
    <BillingAddRecordModal
      v-model:open="offsetModalOpen"
      v-model:record-type="offsetRecordType"
      :order="offsetModalOrder"
      :create-task-offset="props.createTaskOffset"
      :saved-record="offsetRecordPayload"
      @save="handleOffsetRecordSave"
    />
    <a-modal
      v-model:open="taskConfirmOpen"
      title="总任务确认"
      width="760px"
      ok-text="确认提交"
      cancel-text="取消"
      :confirm-loading="submitLoading"
      @ok="submitConfirmedTask"
    >
      <div class="task-confirm-summary">
        {{ taskConfirmSummaryText }}
      </div>
      <div class="task-confirm-table">
        <div class="task-confirm-row task-confirm-head">
          <span>ASIN</span>
          <span>当前任务量</span>
          <span>首日可操作时间</span>
          <span>距截止</span>
        </div>
        <div v-for="row in taskConfirmRows" :key="row.key" class="task-confirm-row">
          <span class="task-confirm-asin">{{ row.asin || "—" }}</span>
          <span>{{ row.quantity }} 单</span>
          <span>{{ row.firstWindow }}</span>
          <strong :class="{ 'task-confirm-expired': row.expired }">{{ row.remaining }}</strong>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: "AddEvaluation",
});
import { ref, watch, computed, toRefs, onUnmounted, nextTick } from "vue";
import { Modal, message } from "ant-design-vue";
import { CloseOutlined } from "@ant-design/icons-vue";
import dayjs from "dayjs";
import type { UploadFile } from "ant-design-vue";
import TaskInfoForm from "./create-task/TaskInfoForm.vue";
import BillingAddRecordModal from "./create-task/OffsetModal.vue";
import ImageUpload from "./create-task/ImageUpload.vue";
import { searchCommonEmployees } from "./create-task/dataSource";
import { normalizeGroupChatNames } from "./create-task/dataSource";
import {
  createReceiveTask,
  type CreateReceiveTaskItem,
  type CreateReceiveTaskRequest,
  type CreateReceiveTaskSchedule,
  type CreateReceiveTaskTypeCount,
} from "./create-task/dataSource";
import type { ApiResponse, EvaluationRecord } from "./create-task/formTypes";
import { useUserStore } from "./create-task/dataSource";
import { buildTaskConfirmSummary } from "./create-task/taskConfirmSummary";

const CUSTOMER_SEARCH_DEBOUNCE_MS = 200;

interface Props {
  currentEvaluationId?: number | string;
  viewData?: EvaluationRecord | undefined;
  viewType?: "edit" | "add" | "detail";
  createTaskOffset?: boolean;
}

type UploadBillValue = string | string[];

const props = withDefaults(defineProps<Props>(), {
  currentEvaluationId: undefined,
  viewData: undefined,
  viewType: "edit",
});

const { viewData, viewType } = toRefs(props);
const isView = computed(
  () => viewType.value === "edit" || viewType.value === "detail",
);
const userStore = useUserStore();

// 表单引用
const basicFormRef = ref();
const formResetVersion = ref(0);
const taskFormRefs: Record<string, any> = {};
function setTaskFormRef(key: string, instance: any) {
  if (instance) taskFormRefs[key] = instance;
  else delete taskFormRefs[key];
}

// 提交加载状态
const submitLoading = ref(false);
const taskConfirmOpen = ref(false);
const pendingSubmitData = ref<CreateReceiveTaskRequest | null>(null);
const taskConfirmRows = ref<Array<{
  key: string;
  asin: string;
  quantity: number;
  firstWindow: string;
  remaining: string;
  expired: boolean;
}>>([]);
const taskConfirmSummaryText = ref("");

// 客户下拉选项
const customerOptions = ref<
  Array<{
    id: number | string;
    label: string;
    name?: string;
    [key: string]: any;
  }>
>([]);
const customerSearchLoading = ref<boolean>(false);
const customerSearchKeyword = ref("");
let customerSearchTimer: ReturnType<typeof setTimeout> | null = null;
let customerSearchSeq = 0;
const groupChatOptions = ref<Array<{ label: string; value: string }>>([]);

function applyGroupChatOptions(raw: unknown) {
  const names = normalizeGroupChatNames(raw);
  groupChatOptions.value = names.map(name => ({ label: name, value: name }));
  if (!names.length) {
    basicFormData.value.group_chat_name = undefined;
    return;
  }
  if (!names.includes(String(basicFormData.value.group_chat_name || ""))) {
    basicFormData.value.group_chat_name = names.length === 1 ? names[0] : undefined;
  }
}

/**
 * 客户选项（禅道 #107，李娜 2026-08-07 备注 + 截图 fileID=357）。
 *
 * 一个客户配了**多个**群聊时，按群聊展开成多条选项，选中即同时确定客户与反馈群组；
 * 只有 1 个群聊或反馈方式为私聊时保持单条、不显示群聊名。
 *
 * `option_key` 是下拉的 value（复合键），`id` 仍是真实客户 ID，提交用 `id`。
 */
function mapEmployeeOption(item: any) {
  const customerName = item.name || item.customer_name || item.company_name || "";
  const baseLabel = customerName
    ? `${customerName} (ID: ${item.id})`
    : `ID: ${item.id}`;
  return {
    id: item.id,
    option_key: String(item.id),
    label: baseLabel,
    name: customerName,
    company_name: item.customer_name || item.company_name,
    customer_no: item.customer_no,
    ...item,
    group_chat_name: normalizeGroupChatNames(item.group_chat_name),
  };
}

/** 把「一个客户多个群聊」展开成多条选项；单群聊/私聊保持原样 */
function expandCustomerOptionsByGroupChat(list: any[]) {
  return list.flatMap((item) => {
    const groups = normalizeGroupChatNames(item.group_chat_name);
    if (groups.length <= 1) return [item];
    return groups.map(groupName => ({
      ...item,
      option_key: `${item.id}::${groupName}`,
      label: `${item.label} ${groupName}`,
      picked_group_chat_name: groupName,
    }));
  });
}

function keepSelectedCustomerOption(
  list: Array<{ id: number | string; label: string; [key: string]: any }>,
) {
  const selectedId = basicFormData.value.customer_id;
  if (selectedId === undefined || selectedId === null || selectedId === "") {
    return list;
  }
  if (list.some(item => String(item.option_key) === String(customerSelectValue.value))) {
    return list;
  }
  const selected = customerOptions.value.find(
    item => String(item.option_key) === String(customerSelectValue.value),
  );
  return selected ? [selected, ...list] : list;
}

/**
 * 下拉当前选中的复合键：多群聊时为 `客户ID::群聊名`，否则就是客户 ID。
 * 提交仍用 `basicFormData.customer_id`，此值只服务于下拉回显。
 */
const customerSelectValue = computed(() => {
  const id = basicFormData.value.customer_id;
  if (id === undefined || id === null || id === "") return undefined;
  const group = String(basicFormData.value.group_chat_name || "").trim();
  const composite = group ? `${id}::${group}` : "";
  if (composite && customerOptions.value.some(item => String(item.option_key) === composite))
    return composite;
  return String(id);
});

// 模糊检索客户员工（GET /admin/common/employee?keyword=）
const fetchCustomerOptions = async (keyword: string): Promise<void> => {
  const seq = ++customerSearchSeq;
  customerSearchLoading.value = true;
  try {
    const response = await searchCommonEmployees({ keyword });
    if (seq !== customerSearchSeq) return;
    if (response.code === 200) {
      const customerList = Array.isArray(response.data) ? response.data : [];
      customerOptions.value = keepSelectedCustomerOption(
        expandCustomerOptionsByGroupChat(customerList.map(mapEmployeeOption)),
      );
    }
  } catch (error: unknown) {
    if (seq !== customerSearchSeq) return;
    console.error("获取客户选项失败:", error);
    customerOptions.value = keepSelectedCustomerOption([]);
  } finally {
    if (seq === customerSearchSeq) {
      customerSearchLoading.value = false;
    }
  }
};

// 输入停顿 200ms 后再请求，避免无总数接口被连续输入打爆
const handleCustomerSearch = (value: string): void => {
  const keyword = String(value ?? "").trim();
  customerSearchKeyword.value = keyword;
  if (customerSearchTimer) {
    clearTimeout(customerSearchTimer);
    customerSearchTimer = null;
  }
  if (!keyword) {
    customerSearchSeq += 1;
    customerSearchLoading.value = false;
    customerOptions.value = keepSelectedCustomerOption([]);
    return;
  }
  customerSearchTimer = setTimeout(() => {
    customerSearchTimer = null;
    void fetchCustomerOptions(keyword);
  }, CUSTOMER_SEARCH_DEBOUNCE_MS);
};

onUnmounted(() => {
  if (customerSearchTimer) {
    clearTimeout(customerSearchTimer);
    customerSearchTimer = null;
  }
  customerSearchSeq += 1;
});

// 客户选择变化：同步可选反馈群组（禅道 #107，接单 create.group_chat_name）
const handleCustomerChange = async (optionKey: any) => {
  if (optionKey) {
    const selectedCustomer = customerOptions.value.find(
      (item: any) => String(item.option_key) === String(optionKey),
    );
    // 复合键形如 `客户ID::群聊名`；提交给后端的始终是真实客户 ID
    const value = selectedCustomer?.id ?? String(optionKey).split("::")[0];
    basicFormData.value.customer_id = value;
    if (selectedCustomer) {
      basicFormData.value.customer_name =
        selectedCustomer.name || selectedCustomer.label;
      let groups = normalizeGroupChatNames(selectedCustomer.group_chat_name);
      if (!groups.length) {
        try {
          const empRes = await searchCommonEmployees({
            keyword: String(selectedCustomer.name || selectedCustomer.employee_no || ""),
          });
          const matched = Array.isArray(empRes.data)
            ? empRes.data.find((item: any) => Number(item.id) === Number(value))
            : undefined;
          groups = normalizeGroupChatNames(matched?.group_chat_name);
          if (matched) {
            selectedCustomer.group_chat_name = groups;
          }
        } catch (error) {
          console.error("获取客户群组失败:", error);
        }
      }
      applyGroupChatOptions(groups);
      // 选项本身已带群聊（多群聊展开出来的），直接定为反馈群组，无需再选一次
      const pickedGroup = String(selectedCustomer.picked_group_chat_name || "").trim();
      if (pickedGroup && groups.includes(pickedGroup)) {
        basicFormData.value.group_chat_name = pickedGroup;
      }
    } else {
      applyGroupChatOptions([]);
    }
  } else {
    basicFormData.value.customer_name = undefined;
    basicFormData.value.customer_id = undefined;
    applyGroupChatOptions([]);
  }
};

// 基础信息表单数据
const basicFormData = ref({
  customer_name: undefined as number | string | undefined,
  customer_id: undefined as number | string | undefined,
  group_chat_name: undefined as string | undefined,
  payment_mode: 1 as 1 | 2, // 收款模式 1-纯人民币 2-混合模式
  buying_price: undefined as number | undefined, // 现汇买入价格
  selling_price: undefined as number | undefined, // 现汇卖出价
  // 纯人民币模式
  receivable_rmb: undefined as number | undefined, // 应收款项（自动核算）
  actually_amount: undefined as number | undefined, // 实收款项CNY（手动输入）
  // 混合模式
  receivable_usd: undefined as number | undefined, // 应收款项-美金（自动核算）
  receivable_rmb_mixed: undefined as number | undefined, // 应收款项-人民币（自动核算）
  actually_amount_usd: undefined as number | undefined, // 实收款项USD（手动输入）
  actually_amount_mixed: undefined as number | undefined, // 实收款项CNY（手动输入）
  // 汇款渠道不预设默认值（李运侠 改，2026-08-30，原默认 1 银行转账）；仍为必填，由用户主动选择
  remittance_channel: undefined as string | number | undefined, // 汇款渠道
  account_status: 1 as 1 | 2 | 3, // 入账状态
  upload_bill: "" as UploadBillValue, // 上传水单
  business_remarks: "" as string, // 商务备注
});

type BatchCollectionRow = {
  actual_cny_amount: number | undefined;
  transfer_channel: number | undefined;
};

const batchCollectionRows = ref<BatchCollectionRow[]>([
  { actual_cny_amount: undefined, transfer_channel: undefined },
]);

/** 实收金额填 0 也算已填写；未输入仍是空。（lyx 改） */
function isEnteredCollectionAmount(value: number | undefined): boolean {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function buildBatchCollectionPayload(rows: BatchCollectionRow[]) {
  const payload: Array<{ actual_cny_amount: number; transfer_channel: number }> = [];
  for (const row of rows) {
    const hasAmount = isEnteredCollectionAmount(row.actual_cny_amount);
    const transferChannel = Number(row.transfer_channel || 0);
    const hasAccount = transferChannel > 0;
    if (!hasAmount && !hasAccount)
      continue;
    if (hasAmount !== hasAccount)
      throw new Error("请完整填写每行实收款项和收款账号");
    payload.push({
      actual_cny_amount: row.actual_cny_amount as number,
      transfer_channel: transferChannel,
    });
  }
  return payload;
}

function syncBatchCollectionTotal() {
  const completeRows = batchCollectionRows.value.filter(
    (row) => isEnteredCollectionAmount(row.actual_cny_amount) && Number(row.transfer_channel || 0) > 0,
  );
  basicFormData.value.actually_amount = Number(
    completeRows.reduce((sum, row) => sum + Number(row.actual_cny_amount || 0), 0).toFixed(2),
  );
  // 汇款渠道只在纯人民币时从分批收款行回写。混合模式由用户单独选择，
  // 打开总任务确认前不能用空的分批行把它清掉。
  // （lyx 2026-10-26 改；Apifox 拉取 2026-10-26T12:38:55.691Z）
  if (basicFormData.value.payment_mode === 1) {
    basicFormData.value.remittance_channel = completeRows[0]?.transfer_channel;
  }
  handleActualAmountChange();
}

function addBatchCollectionRow() {
  batchCollectionRows.value.push({ actual_cny_amount: undefined, transfer_channel: undefined });
}

function removeBatchCollectionRow(index: number) {
  if (batchCollectionRows.value.length <= 1)
    return;
  batchCollectionRows.value.splice(index, 1);
  syncBatchCollectionTotal();
}

const getUploadBillUrls = (value: UploadBillValue | undefined): string[] => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];
  return value
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const formatUploadBillValue = (value: UploadBillValue | undefined): string => {
  return getUploadBillUrls(value).join(",");
};

// 记录最后一次有效的水单地址，避免被异常清空
const lastUploadBill = ref<UploadBillValue>("");
watch(
  () => basicFormData.value.upload_bill,
  (val) => {
    if (getUploadBillUrls(val).length > 0) {
      console.log("val", val);

      basicFormData.value.upload_bill = val;
      lastUploadBill.value = val;
    } else {
      console.log("upload_bill 被清空", new Error().stack);
    }
  },
);

// 基础信息表单验证规则
const basicFormRules = computed(() => {
  const rules: any = {
    customer_id: [
      { required: true, message: "请选择客户姓名/ID", trigger: "change" },
    ],
    group_chat_name: groupChatOptions.value.length
      ? [{ required: true, message: "请选择反馈群组", trigger: "change" }]
      : [],
    /*
     * 「实付金额大于应付金额」原来是 validator，会直接拦住提交。
     * 李运侠 2026-09-03：这一段只做提示不做限制，提示出来了也允许提交。
     * 所以这里只保留必填校验，超额改为 select 下方的一行文字提示
     * （见模板里的 account-status-hint / accountStatusExcessHint）。
     */
    account_status: [
      { required: true, message: "请选择入账状态", trigger: "change" },
    ],
  };

  // 根据收款模式动态设置验证规则
  if (basicFormData.value.payment_mode === 1) {
    // 纯人民币模式
    rules.actually_amount = [
      { required: true, message: "请输入实收款项", trigger: "blur" },
    ];
  } else {
    rules.remittance_channel = [
      { required: true, message: "请选择汇款渠道", trigger: "change" },
    ];
    // 混合模式
    rules.actually_amount_usd = [
      { required: true, message: "请输入实收款项(USD)", trigger: "blur" },
    ];
    rules.actually_amount_mixed = [
      { required: true, message: "请输入实收款项(CNY)", trigger: "blur" },
    ];
    if (!props.createTaskOffset) {
      rules.buying_price = [
        { required: true, message: "请输入现汇买入价格", trigger: "blur" },
      ];
      rules.selling_price = [
        { required: true, message: "请输入现汇卖出价", trigger: "blur" },
      ];
    }
  }

  return rules;
});

// 水单上传后同步值（兜底）
const handleBankSlipFileChange = (file: UploadFile) => {
  console.log("file", file);

  const url = (file as UploadFile).url || (file as UploadFile).thumbUrl || "";
  if (url) {
    if (basicFormData.value.payment_mode === 2) {
      const urls = getUploadBillUrls(basicFormData.value.upload_bill);
      if (!urls.includes(url)) {
        basicFormData.value.upload_bill = [...urls, url];
      }
      lastUploadBill.value = basicFormData.value.upload_bill;
      return;
    }
    basicFormData.value.upload_bill = url;
    lastUploadBill.value = url;
    console.log(
      "上传时回调函数，更新basicFormData.value.upload_bill",
      basicFormData.value.upload_bill,
    );
  }
};

const handleBankSlipListChange = (fileList: UploadFile[]) => {
  const urls = fileList
    .map((item) => (item.url || item.thumbUrl || "") as string)
    .filter(Boolean);

  if (basicFormData.value.payment_mode === 2) {
    basicFormData.value.upload_bill = urls;
    if (urls.length > 0) {
      lastUploadBill.value = urls;
    }
    return;
  }

  if (urls[0]) {
    basicFormData.value.upload_bill = urls[0];
    lastUploadBill.value = urls[0];
  }
};

const offsetModalOpen = ref(false);
const offsetRecordType = ref<"补款" | "退款" | "账面抵消">("账面抵消");
const offsetRecordPayload = ref<{ record: any; debtUpdate?: any } | null>(null);

const offsetTypeLabelMap: Record<string, string> = {
  free_review: "免评",
  feedback: "Feedback",
  words: "文字",
  video: "视频",
  image: "图片",
};

const offsetModalOrder = computed(() => {
  const task = tasksData.value[activeKey.value] || Object.values(tasksData.value)[0] || {};
  const reviewTypes = getOffsetReviewTypes(task);
  return {
    id: -1,
    task_no: "待创建任务",
    customer: { name: String(basicFormData.value.customer_name || "") },
    employee: { name: String(userStore.username || "") },
    review_types: reviewTypes,
    review_quantity_summary: {},
    total_order_quantity: normalizeNumberOrZero(task?.orders_number),
    country_id: normalizeNumberOrZero(task?.country_id) || undefined,
  };
});

function getOffsetReviewTypes(task: any): string[] {
  const rawTypes = Array.isArray(task?.remark_type)
    ? task.remark_type
    : Object.entries(task?.review_options || {})
        .filter(([, checked]) => Boolean(checked))
        .map(([key]) => key);

  return rawTypes
    .map((item: unknown) => offsetTypeLabelMap[String(item)] || String(item || ""))
    .filter(Boolean);
}

const openOffsetModal = (): void => {
  offsetRecordType.value = "账面抵消";
  offsetModalOpen.value = true;
};

const handleOffsetRecordSave = (payload: { record: any; debtUpdate?: any }): void => {
  offsetRecordPayload.value = payload;

  offsetModalOpen.value = false;
  message.success("账面抵消已录入");
  validateAccountStatus();
};

// 任务区域管理
const activeKey = ref<string>("task-1");
let taskTabIndex = 0;

interface TaskPane {
  key: string;
  title: string;
  closable: boolean;
}

const taskPanes = ref<TaskPane[]>([
  {
    key: `task-${++taskTabIndex}`,
    title: "任务1",
    closable: false, // 至少保留一个任务，第一个不可关闭
  },
]);

// 任务数据存储（每个任务独立）
const tasksData = ref<Record<string, any>>({});

type CommentKeywordItem = {
  keyword: string;
  num: number | undefined;
  type: 1 | 2;
};
type CommentOrderDatePlanItem = { date: string; order_num: number | undefined };
type CommentOrderDatePlanFixed = { everday_orders_num: number | undefined };
type CommentGroup = {
  keywords: CommentKeywordItem[];
  order_date_plans: CommentOrderDatePlanItem[] | CommentOrderDatePlanFixed;
};

const createEmptyComments = (): Record<string, CommentGroup> => ({
  free_review: {
    keywords: [] as CommentKeywordItem[],
    order_date_plans: [] as CommentOrderDatePlanItem[],
  },
  feedback: {
    keywords: [] as CommentKeywordItem[],
    order_date_plans: [] as CommentOrderDatePlanItem[],
  },
  words: {
    keywords: [] as CommentKeywordItem[],
    order_date_plans: [] as CommentOrderDatePlanItem[],
  },
  video: {
    keywords: [] as CommentKeywordItem[],
    order_date_plans: [] as CommentOrderDatePlanItem[],
  },
  image: {
    keywords: [] as CommentKeywordItem[],
    order_date_plans: [] as CommentOrderDatePlanItem[],
  },
});

const normalizeKeywordItem = (item: any) => {
  const rawKeyword = item?.keyword;
  const keyword = typeof rawKeyword === "string" ? rawKeyword : "";
  const rawNum = item?.num ?? item?.order_num;
  const num = rawNum === 0 || rawNum ? Number(rawNum) : undefined;
  const rawType = item?.type;
  return {
    keyword,
    num: typeof num === "number" && !Number.isNaN(num) ? num : undefined,
    type:
      Number(rawType) === 2 || rawType === "keyword_url" || rawType === "url"
        ? 2
        : 1,
  };
};

const normalizeOrderPlanItem = (item: any) => {
  const date = typeof item?.date === "string" ? item.date : "";
  const rawNum = item?.order_num;
  const orderNum = rawNum === 0 || rawNum ? Number(rawNum) : undefined;
  return {
    date,
    order_num:
      typeof orderNum === "number" && !Number.isNaN(orderNum)
        ? orderNum
        : undefined,
  };
};

const normalizeComments = (comments: any) => {
  const empty = createEmptyComments();
  if (!comments) return empty;

  const normalized = createEmptyComments();
  (["free_review", "feedback", "words", "video", "image"] as const).forEach(
    (type) => {
      const value = comments?.[type];
      if (value && typeof value === "object") {
        const rawKeywords = Array.isArray(value.keywords) ? value.keywords : [];
        const rawPlans = value.order_date_plans;
        normalized[type].keywords = rawKeywords.map(normalizeKeywordItem);
        if (Array.isArray(rawPlans)) {
          normalized[type].order_date_plans = rawPlans.map(
            normalizeOrderPlanItem,
          );
        } else if (rawPlans && typeof rawPlans === "object") {
          normalized[type].order_date_plans = {
            everday_orders_num:
              typeof rawPlans.everday_orders_num === "number"
                ? rawPlans.everday_orders_num
                : undefined,
          };
        }
      }
    },
  );

  return normalized;
};

// 初始化第一个任务的数据
const initTaskData = (taskKey: string) => {
  if (!tasksData.value[taskKey]) {
    tasksData.value[taskKey] = {
      site_task: "us",
      asin: "",
      product_name: "",
      shop: "", // 店铺
      brand: "",
      category: null as string | null, // 类目
      star_level: undefined as number | undefined, // 星级
      score: undefined as number | undefined, // 评分
      price: undefined as number | undefined,
      evaluation_level: "normal",
      evaluation_mode: "free",
      schedule_type: "fixed" as "fixed" | "irregular", // 周期安排
      variant_type: "any" as "any" | "single" | "multiple", // 变体情况
      variants: [""] as string[], // 多变体列表
      task_relation: 0 as 0 | 1 | 2 | 3, // 任务关联 0-无特殊关联 1-全店排重 2-组织级排重 3-指定店铺排重
      related_shops: [""] as string[], // 关联店铺列表
      review_options: {
        free_review: false,
        feedback: false,
        words: false,
        video: false,
        image: false,
      },
      comments: createEmptyComments(),
      exchange_rate: undefined as number | undefined,
      extra_buyer_commission_amount: undefined as number | undefined, // 额外买手佣金-外币金额
      extra_buyer_commission_orders: undefined as number | undefined, // 额外买手佣金-单量
      extra_service_commission: undefined as number | undefined, // 额外服务佣金-人民币金额
      total_orders: undefined as number | undefined,
      total_amount: undefined as number | undefined,
      fixed_daily_orders: undefined as number | undefined,
      remark_daily_orders: undefined as string | undefined,
      daily_orders_map: {} as Record<string, number | undefined>,
      is_send_msg: 0 as 0 | 1, // 凭证需求
      accounting_status: "completed" as "completed" | "incomplete" | "surplus", // 入账状态
      demand: "", // 任务备注
      business_remarks: "", // 商务备注
      daily_feedback: 0,
      amount_screenshot: 0,
      order_screenshot: 0,
      seller: "",
      order_account: "maizi",
    };
  }
};

// basicFormData.value = JSON.parse(localStorage.getItem('submitData') || '{}');
// console.log('basicFormData.value', basicFormData.value);

const initTasksFromAsins = (asins: any[]) => {
  if (asins.length > 0) {
    tasksData.value = {};
    taskPanes.value = asins.map((_: any, index: number) => ({
      key: `task-${index + 1}`,
      title: `任务${index + 1}`,
      closable: index !== 0,
    }));
    taskTabIndex = asins.length;
    asins.forEach((task: any, index: number) => {
      const normalizedTask = {
        ...(task || {}),
        is_erveryday_num:
          task?.is_erveryday_num !== undefined &&
          task?.is_erveryday_num !== null
            ? Number(task.is_erveryday_num)
            : task?.is_erveryday_num,
        star_level: normalizeNumber(task?.star_level),
        score: normalizeNumber(task?.score),
      };
      tasksData.value[`task-${index + 1}`] = normalizedTask;
    });
    activeKey.value = taskPanes.value[0]?.key || "task-1";
  } else {
    tasksData.value = {};
    taskTabIndex = 0;
    taskPanes.value = [
      {
        key: `task-${++taskTabIndex}`,
        title: "任务1",
        closable: false,
      },
    ];
    initTaskData(taskPanes.value[0].key);
    activeKey.value = taskPanes.value[0].key;
  }
};

const normalizeShopName = (shop: any): string => {
  if (!shop) return "";
  if (typeof shop === "string") return shop;
  if (Array.isArray(shop)) {
    return shop
      .map((item) => (typeof item === "string" ? item : item?.name))
      .filter(Boolean)
      .join(", ");
  }
  return typeof shop?.name === "string" ? shop.name : "";
};

const normalizeNumber = (value: any): number | undefined => {
  if (value === undefined || value === null || value === "") return undefined;
  const num = Number(value);
  return Number.isNaN(num) ? undefined : num;
};

function normalizeEntryStatus(value: any): 1 | 2 | 3 {
  const num = Number(value);
  if (num === 1 || num === 2 || num === 3) {
    return num as 1 | 2 | 3;
  }
  return 1;
}

function getSavedCommissions(payload: any) {
  const rates = payload?.commission_rates || {};
  const commissions: Record<string, number | undefined> = {
    ranking_commission: normalizeNumber(
      rates?.free_review ?? rates?.ranking ?? payload?.ranking_commission,
    ),
    words_commission: normalizeNumber(rates?.words ?? payload?.words_commission),
    pic_commission: normalizeNumber(
      rates?.pic ?? rates?.image ?? payload?.pic_commission,
    ),
    video_commission: normalizeNumber(rates?.video ?? payload?.video_commission),
    feedback_commission: normalizeNumber(
      rates?.feedback ?? payload?.feedback_commission,
    ),
  };

  Object.keys(commissions).forEach((key) => {
    if (commissions[key] === undefined) {
      delete commissions[key];
    }
  });

  return commissions;
}

function getTaskCommissions(payload: any) {
  return getSavedCommissions(payload);
}

const normalizeSendMsg = (payload: any): 0 | 1 | 2 => {
  const num = Number(payload?.is_send_msg);
  if (num === 1 || num === 2) return num as 1 | 2;
  return 0;
};

const normalizeKeywordTemplateListForSubmit = (list: any) => {
  if (!Array.isArray(list))
    return [] as Array<{ keyword: string; type: "keyword" | "keyword_url" }>;
  return list
    .map((item: any) => ({
      keyword: typeof item?.keyword === "string" ? item.keyword : "",
      type:
        Number(item?.type) === 2 ||
        item?.type === "keyword_url" ||
        item?.type === "url"
          ? "keyword_url"
          : "keyword",
    }))
    .filter((item) => item.keyword.trim().length > 0);
};

const normalizeOrdersDatePlansForSubmit = (plans: any) => {
  if (!plans || typeof plans !== "object" || Array.isArray(plans)) return {};
  const typeKeys = ["free_review", "feedback", "words", "video", "image"] as const;
  type KeywordPlanPayload = {
    keyword: string;
    num: number;
    type: "keyword" | "keyword_url";
  };
  const normalized: Record<string, any> = {};
  Object.entries(plans).forEach(([dateKey, datePlan]) => {
    if (!datePlan || typeof datePlan !== "object" || Array.isArray(datePlan))
      return;
    const datePayload: Record<string, any> = {};
    typeKeys.forEach((type) => {
      const typePlan = (datePlan as Record<string, any>)[type];
      if (!typePlan || typeof typePlan !== "object" || Array.isArray(typePlan))
        return;
      const rawKeywordPlans = Array.isArray(typePlan.keyword_plans)
        ? typePlan.keyword_plans
        : [];
      const keywordPlans: KeywordPlanPayload[] = rawKeywordPlans
        .map((item: any) => {
          const keyword = typeof item?.keyword === "string" ? item.keyword : "";
          // 详情接口中 num 才是关键词行单量，order_num 可能是 0
          const rawOrderNum = item?.num ?? item?.order_num;
          const orderNum =
            rawOrderNum === 0 || rawOrderNum ? Number(rawOrderNum) : 0;
          const rawType = item?.type;
          return {
            keyword,
            num: Number.isNaN(orderNum) || orderNum < 0 ? 0 : orderNum,
            type:
              Number(rawType) === 2 ||
              rawType === "keyword_url" ||
              rawType === "url"
                ? "keyword_url"
                : "keyword",
          };
        })
        .filter(
          (item: KeywordPlanPayload) =>
            item.keyword.trim().length > 0 || item.num > 0,
        );
      if (!keywordPlans.length) return;
      const total = keywordPlans.reduce(
        (sum: number, item: KeywordPlanPayload) =>
          sum + (Number(item.num) || 0),
        0,
      );
      datePayload[type] = {
        order_num: total,
        keyword_plans: keywordPlans,
      };
    });
    if (Object.keys(datePayload).length > 0) {
      normalized[dateKey] = datePayload;
    }
  });
  return normalized;
};

const getKeywordListData = (payload: any) => {
  return payload?.keywords_list ?? [];
};

const getOrdersDatePlansData = (payload: any) => {
  return payload?.orders_date_plans ?? {};
};

const mapViewDataToTask = (payload: any) => {
  const keywordList = normalizeKeywordTemplateListForSubmit(
    getKeywordListData(payload),
  );
  const ordersDatePlans = normalizeOrdersDatePlansForSubmit(
    getOrdersDatePlansData(payload),
  );
  const taskCommissions = getTaskCommissions(payload);
  const dailyOrdersMap: Record<string, number> = {};
  Object.entries(ordersDatePlans).forEach(([dateKey, datePlan]) => {
    if (!datePlan || typeof datePlan !== "object" || Array.isArray(datePlan))
      return;
    let total = 0;
    (["free_review", "feedback", "words", "video", "image"] as const).forEach(
      (type) => {
        const typePlan = (datePlan as Record<string, any>)[type];
        const num = Number(typePlan?.order_num);
        if (!Number.isNaN(num) && num > 0) total += num;
      },
    );
    if (total > 0) {
      dailyOrdersMap[dateKey] = total;
    }
  });

  return {
    country_id: payload?.country_id,
    asin: payload?.product_asin || "",
    product_name: payload?.product_name || "",
    imgurl_big:
      payload?.full_img_url || payload?.imgurl_big || payload?.imgurl || "",
    imgurl: payload?.imgurl || "",
    shop: normalizeShopName(payload?.shop_name),
    brand: payload?.brand || "",
    category: payload?.category ?? null,
    star_level: normalizeNumber(payload?.star_level),
    score: normalizeNumber(payload?.score),
    product_price: payload?.product_price,
    level: payload?.level,
    remark_type: payload?.remark_type,
    is_erveryday_num:
      payload?.daily_num_fixed !== undefined &&
      payload?.daily_num_fixed !== null
        ? Number(payload.daily_num_fixed)
        : undefined,
    everyday_number:
      payload?.daily_num_fixed !== undefined &&
      payload?.daily_num_fixed !== null
        ? Number(payload.daily_num_fixed)
        : undefined,
    daily_orders_map: dailyOrdersMap,
    variants_type:
      payload?.variants_type !== undefined && payload?.variants_type !== null
        ? Number(payload.variants_type)
        : undefined,
    variants:
      Array.isArray(payload?.variants) && payload.variants.length > 0
        ? payload.variants
        : [""],
    entry_status: normalizeEntryStatus(payload?.entry_status),
    is_send_msg: normalizeSendMsg(payload),
    rate: payload?.rate,
    extra_customer_num: payload?.extra_customer_num,
    extra_customer_commission: payload?.extra_customer_commission,
    additional_service_commission: payload?.additional_service_commission,
    orders_number: payload?.orders_number,
    amount: payload?.amount,
    words_num: payload?.words_num || 0,
    ranking_num: payload?.ranking_num || 0,
    feedback_num: payload?.feedback_num || 0,
    pic_num: payload?.pic_num || 0,
    video_num: payload?.video_num || 0,
    ...taskCommissions,
    demand: payload?.demand || "",
    business_remarks: payload?.business_remark || "",
    daily_feedback: payload?.daily_feedback || 0,
    seller: payload?.seller || "",
    keyword_list: keywordList,
    orders_date_plans: ordersDatePlans,
    comments: normalizeComments(payload?.comments),
  };
};

const savedTasks = Array.isArray((basicFormData.value as any)?.asins)
  ? (basicFormData.value as any).asins
  : [];
initTasksFromAsins(savedTasks);
console.log("tasksData.value", tasksData.value);

watch(
  viewData,
  (data) => {
    if (!data) return;
    const payload = data as any;

    const uploadBill = payload.upload_bill ?? basicFormData.value.upload_bill;
    const firstPayloadTask = Array.isArray(payload.asins) ? payload.asins[0] : undefined;

    basicFormData.value = {
      ...basicFormData.value,
      customer_name:
        payload?.customer_name ??
        payload?.admin?.realname ??
        basicFormData.value.customer_name,
      customer_id:
        payload?.customer_id ??
        payload?.admin_id ??
        payload?.admin?.id ??
        basicFormData.value.customer_id,
      payment_mode: payload?.payment_mode ?? basicFormData.value.payment_mode,
      buying_price: payload.buying_price ?? basicFormData.value.buying_price,
      selling_price: payload.selling_price ?? basicFormData.value.selling_price,
      receivable_rmb: payload?.receivable ?? basicFormData.value.receivable_rmb,
      actually_amount:
        payload.actually_amount ?? basicFormData.value.actually_amount,
      receivable_usd:
        payload.receivable_usd ?? basicFormData.value.receivable_usd,
      receivable_rmb_mixed:
        payload.receivable_rmb_mixed ??
        basicFormData.value.receivable_rmb_mixed,
      actually_amount_usd:
        payload.actually_amount_usd ?? basicFormData.value.actually_amount_usd,
      actually_amount_mixed:
        payload.actually_amount_mixed ??
        basicFormData.value.actually_amount_mixed,
      remittance_channel:
        payload?.remittance_channel ?? basicFormData.value.remittance_channel,
      account_status: normalizeEntryStatus(
        payload?.account_status ??
        payload?.entry_status ??
        firstPayloadTask?.entry_status ??
        basicFormData.value.account_status,
      ),
      upload_bill: uploadBill,
      business_remarks:
        payload.business_remark ?? basicFormData.value.business_remarks,
    };
    if (uploadBill) {
      lastUploadBill.value = uploadBill;
    }

    const asins = Array.isArray(payload.asins) ? payload.asins : [];
    const mappedTasks =
      asins.length > 0
        ? asins.map((item: any) => mapViewDataToTask(item))
        : [mapViewDataToTask(payload)];
    initTasksFromAsins(mappedTasks);

    // 详情回显后按当前任务数据重新核算应收，避免使用接口历史值导致口径不一致
    if (basicFormData.value.payment_mode === 1) {
      calculateReceivableRMB();
    } else {
      calculateReceivableMixed();
    }
  },
  { immediate: true },
);
// 添加任务
const addTask = () => {
  const newKey = `task-${++taskTabIndex}`;
  // 计算任务数量（不包括基础信息）
  const taskCount = taskPanes.value.filter((pane) =>
    pane.key.startsWith("task-"),
  ).length;
  taskPanes.value.push({
    key: newKey,
    title: `任务${taskCount + 1}`,
    closable: true,
  });
  initTaskData(newKey);
  activeKey.value = newKey;
  // 新开的任务页要停在最顶部的基本信息，不要沿用上一个任务的滚动位置
  // （《9.1 创建任务页面修改》7；李运侠 2026-09-03 复报「还是停在排期设置」）
  scrollTaskPanelToTop();
};

/**
 * 把任务面板滚回顶部。
 *
 * 原实现滚的是 `.create-task-form` 和 `window`，但前者 CSS 是 `overflow: hidden`、
 * 后者整页也不滚，两句都是空操作——所以「有数据时新增任务仍停在排期设置」。
 * 真正的滚动容器是 a-tabs 的 content-holder（`overflow-y: auto`），且 antd 切换 tab
 * 复用同一个 DOM 节点，`scrollTop` 会原样留在上一个任务滚到的位置。
 *
 * 类名前缀被项目改成了 `my-ant`，这里按后缀匹配，避免以后改前缀又失效。
 */
function scrollTaskPanelToTop() {
  const reset = () => {
    const panel = document.querySelector<HTMLElement>('.task-panel');
    if (!panel) return;
    /*
     * 不写死某一个选择器：任务面板里可能不止一层可滚动容器
     * （tabs 的 content-holder 是主的，但 768px 以下媒体查询会把它改成
     * `overflow: visible`、滚动落到外层）。这里把面板内**所有**真正在滚动的
     * 容器一起归零，避免换了断点或改了样式就失效。
     */
    const candidates = [panel, ...Array.from(panel.querySelectorAll<HTMLElement>('*'))];
    candidates.forEach((el) => {
      if (el.scrollTop === 0) return;
      if (el.scrollHeight <= el.clientHeight) return;
      const overflowY = window.getComputedStyle(el).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') el.scrollTop = 0;
    });
  };

  /*
   * 重置要跨过 antd 的切页动画（约 0.3s）：动画期间面板高度还在变，
   * 只在 nextTick 归零，动画结束后浏览器可能又把位置还原回去。
   */
  nextTick(() => {
    reset();
    requestAnimationFrame(reset);
    setTimeout(reset, 120);
    setTimeout(reset, 350);
  });
}

// 删除任务
const removeTask = (targetKey: string) => {
  // 确保至少保留一个任务
  if (taskPanes.value.length <= 1) {
    message.warning("至少需要保留一个任务");
    return;
  }

  const targetIndex = taskPanes.value.findIndex(
    (pane) => pane.key === targetKey,
  );
  if (targetIndex === -1) return;

  taskPanes.value.splice(targetIndex, 1);
  if (activeKey.value === targetKey) {
    activeKey.value =
      taskPanes.value[targetIndex - 1]?.key || taskPanes.value[0].key;
  }

  // 删除对应的任务数据
  delete tasksData.value[targetKey];

  // 重新编号任务标题（只对任务标签页编号，忽略基础信息）
  let taskIndex = 1;
  taskPanes.value.forEach((pane) => {
    if (pane.key.startsWith("task-")) {
      pane.title = `任务${taskIndex}`;
      // 第一个任务不可关闭
      if (taskIndex === 1) {
        pane.closable = false;
      }
      taskIndex++;
    }
  });
};

// 处理基础信息更新（用于将来的扩展）
// const handleBasicInfoUpdate = (data: any) => {
//   basicFormData.value = { ...basicFormData.value, ...data };
//
//   // 自动核算应收款项的逻辑可以在这里实现
//   // 例如：根据任务数据计算应收款项
// };

// 处理任务数据更新
const handleTaskDataUpdate = (taskKey: string, data: any) => {
  if (!tasksData.value[taskKey]) {
    initTaskData(taskKey);
  }
  tasksData.value[taskKey] = { ...tasksData.value[taskKey], ...data };
};

// 从 comments[type].keywords 汇总该类型单量（兜底：*_num 未同步时使用）
function sumOrdersFromComments(
  task: any,
  type: "free_review" | "feedback" | "words" | "video" | "image",
) {
  const keywords = task?.comments?.[type]?.keywords;
  if (!Array.isArray(keywords)) return 0;
  return keywords.reduce((sum: number, item: any) => {
    const num = typeof item?.num === "number" ? item.num : Number(item?.num);
    return Number.isFinite(num) && num > 0 ? sum + num : sum;
  }, 0);
}

function sumOrdersFromPlans(
  task: any,
  type: "free_review" | "feedback" | "words" | "video" | "image",
) {
  const plans = task?.orders_date_plans;
  if (!plans || typeof plans !== "object" || Array.isArray(plans)) return 0;

  return Object.values(plans as Record<string, any>).reduce(
    (sum: number, dayPlan: any) => {
      if (!dayPlan || typeof dayPlan !== "object" || Array.isArray(dayPlan))
        return sum;

      const typeNumKey =
        type === "free_review" ? "ranking_num" : type === "image" ? "pic_num" : `${type}_num`;
      const dayTypeNum = Number(dayPlan?.[typeNumKey]);
      if (!Number.isNaN(dayTypeNum) && dayTypeNum > 0) {
        return sum + dayTypeNum;
      }

      const typePlan = dayPlan?.[type];
      const orderNum = Number(typePlan?.order_num);
      if (!Number.isNaN(orderNum) && orderNum > 0) {
        return sum + orderNum;
      }

      return sum;
    },
    0,
  );
}

function getTypeOrders(
  task: any,
  type: "free_review" | "feedback" | "words" | "video" | "image",
) {
  const typeNumKey =
    type === "free_review" ? "ranking_num" : type === "image" ? "pic_num" : `${type}_num`;
  const directNum = Number(task?.[typeNumKey]);
  if (!Number.isNaN(directNum) && directNum > 0) return directNum;

  const commentNum = sumOrdersFromComments(task, type);
  if (commentNum > 0) return commentNum;

  return sumOrdersFromPlans(task, type);
}

// 计算单个任务的测评类型佣金×单量（优先 *_num，其次 comments 兜底）
function calculateTaskCommissionByOrders(task: any): number {
  let totalCommission = 0;

  // 免评佣金
  const rankingOrders = getTypeOrders(task, "free_review");
  const rankingCommission = task.ranking_commission || 0;
  totalCommission += rankingOrders * rankingCommission;

  // 评论佣金
  const wordsOrders = getTypeOrders(task, "words");
  const wordsCommission = task.words_commission || 0;
  totalCommission += wordsOrders * wordsCommission;

  // 图片佣金
  const picOrders = getTypeOrders(task, "image");
  const picCommission = task.pic_commission || 0;
  totalCommission += picOrders * picCommission;

  // 视频佣金
  const videoOrders = getTypeOrders(task, "video");
  const videoCommission = task.video_commission || 0;
  totalCommission += videoOrders * videoCommission;

  // feedback佣金
  const feedbackOrders = getTypeOrders(task, "feedback");
  const feedbackCommission = task.feedback_commission || 0;
  totalCommission += feedbackOrders * feedbackCommission;

  return totalCommission;
}

function calculateTaskTotalAmountRMB(task: any): number {
  const price = normalizeNumberOrZero(task?.product_price);
  const totalOrders = normalizeNumberOrZero(task?.orders_number);
  const exchangeRate = normalizeNumberOrZero(task?.rate);
  const productAmount = price * totalOrders * exchangeRate;
  const commissionAmount = calculateTaskCommissionByOrders(task);
  const extraServiceCommission = normalizeNumberOrZero(
    task?.additional_service_commission,
  );
  const extraBuyerCommissionAmount = normalizeNumberOrZero(
    task?.extra_customer_commission,
  );
  const extraBuyerCommissionOrders = normalizeNumberOrZero(task?.extra_customer_num);
  const extraBuyerCommissionRMB =
    extraBuyerCommissionAmount * extraBuyerCommissionOrders * exchangeRate;

  const calculatedAmount = (
    productAmount +
    commissionAmount +
    extraServiceCommission +
    extraBuyerCommissionRMB
  );

  if (calculatedAmount > 0) {
    return calculatedAmount;
  }

  const taskAmount = Number(task?.amount);
  if (Number.isFinite(taskAmount) && taskAmount > 0) {
    return taskAmount;
  }

  return 0;
}

// 计算纯人民币模式下的应收款项
// 应收款项 = (商品售价×单量×接单汇率) + (佣金×单量) + 额外服务佣金 + (额外买手佣金×单量×接单汇率转化成人民币)
function calculateReceivableRMB() {
  let total = 0;

  Object.values(tasksData.value).forEach((task: any) => {
    total += calculateTaskTotalAmountRMB(task);
  });

  basicFormData.value.receivable_rmb =
    total > 0 ? Number(total.toFixed(2)) : undefined;
}

// 计算混合模式下的应收款项（美金和人民币）
function calculateReceivableMixed() {
  let totalUSD = 0;
  let totalRMB = 0;

  // 获取现汇买入价（从表单数据中获取）
  const buyPrice = basicFormData.value.buying_price || 0;

  Object.values(tasksData.value).forEach((task: any) => {
    const price = normalizeNumberOrZero(task?.product_price); // 商品售价
    const totalOrders = normalizeNumberOrZero(task?.orders_number); // 单量
    const exchangeRate = normalizeNumberOrZero(task?.rate); // 接单汇率
    const productAmount = price * totalOrders * exchangeRate;
    const totalAmount = calculateTaskTotalAmountRMB(task);

    if (props.createTaskOffset) {
      const extraBuyerCommission = normalizeNumberOrZero(task?.extra_customer_commission);
      const extraBuyerOrders = normalizeNumberOrZero(task?.extra_customer_num);
      totalUSD += price * totalOrders + extraBuyerCommission * extraBuyerOrders;
    } else if (buyPrice > 0) {
      totalUSD += productAmount / buyPrice;
    }

    // CNY 部分直接复用任务侧统一金额口径，避免和右侧账单汇总出现差异
    totalRMB += Math.max(totalAmount - productAmount, 0);
  });

  basicFormData.value.receivable_usd =
    totalUSD > 0 ? Number(totalUSD.toFixed(2)) : undefined;
  basicFormData.value.receivable_rmb_mixed =
    totalRMB > 0 ? Number(totalRMB.toFixed(2)) : undefined;
}

// 计算纯人民币模式下的应收款项（自动核算）
watch(
  () => basicFormData.value.payment_mode,
  (newMode) => {
    if (newMode === 1) {
      // 纯人民币模式：根据所有任务的金额自动核算应收款项
      calculateReceivableRMB();
    } else {
      // 混合模式：计算美金和人民币的应收款项
      calculateReceivableMixed();
    }
  },
);

// 监听任务数据变化，自动核算应收款项
watch(
  tasksData,
  () => {
    if (basicFormData.value.payment_mode === 1) {
      calculateReceivableRMB();
    } else {
      calculateReceivableMixed();
    }
  },
  { deep: true },
);

// 监听现汇买入价格和现汇卖出价变化，自动重新计算应收款项（混合模式）
watch(
  [
    () => basicFormData.value.buying_price,
    () => basicFormData.value.selling_price,
  ],
  () => {
    if (!props.createTaskOffset && basicFormData.value.payment_mode === 2) {
      calculateReceivableMixed();
    }
  },
);

const emit = defineEmits<{
  success: [value: any];
}>();

const reviewTypeMap: Record<string, string> = {
  free_review: "free_review",
  feedback: "feedback",
  words: "words",
  video: "video",
  image: "image",
};

const reviewTypeLabelMap: Record<string, string> = {
  free_review: "free_review",
  feedback: "feedback",
  words: "words",
  video: "video",
  image: "image",
};

const scheduleTypeMap: Record<string, string> = {
  free_review: "keyword",
  feedback: "keyword",
  words: "keyword",
  video: "keyword",
  image: "keyword",
};

function normalizeNumberOrZero(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function isAmountLessThan(actual: unknown, receivable: unknown): boolean {
  const actualAmount = Number(normalizeNumberOrZero(actual).toFixed(2));
  const receivableAmount = Number(normalizeNumberOrZero(receivable).toFixed(2));
  return receivableAmount > 0 && actualAmount < receivableAmount;
}

function isAmountGreaterThan(actual: unknown, receivable: unknown): boolean {
  const actualAmount = Number(normalizeNumberOrZero(actual).toFixed(2));
  const receivableAmount = Number(normalizeNumberOrZero(receivable).toFixed(2));
  return receivableAmount > 0 && actualAmount > receivableAmount;
}

function isCompletedAccountWithInsufficientActualAmount(): boolean {
  if (normalizeNumberOrZero(basicFormData.value.account_status) !== 1) {
    return false;
  }

  if (basicFormData.value.payment_mode === 1) {
    return isAmountLessThan(
      basicFormData.value.actually_amount,
      basicFormData.value.receivable_rmb,
    );
  }

  return (
    isAmountLessThan(
      basicFormData.value.actually_amount_usd,
      basicFormData.value.receivable_usd,
    ) ||
    isAmountLessThan(
      basicFormData.value.actually_amount_mixed,
      basicFormData.value.receivable_rmb_mixed,
    )
  );
}

function isNonSurplusAccountWithExcessActualAmount(): boolean {
  if (normalizeNumberOrZero(basicFormData.value.account_status) === 3) {
    return false;
  }

  if (basicFormData.value.payment_mode === 1) {
    return isAmountGreaterThan(
      basicFormData.value.actually_amount,
      basicFormData.value.receivable_rmb,
    );
  }

  return (
    isAmountGreaterThan(
      basicFormData.value.actually_amount_usd,
      basicFormData.value.receivable_usd,
    ) ||
    isAmountGreaterThan(
      basicFormData.value.actually_amount_mixed,
      basicFormData.value.receivable_rmb_mixed,
    )
  );
}

/**
 * 实付大于应付时的提示文案（李运侠 2026-09-03：只提示不拦截）。
 *
 * 原来这是 `account_status` 的 validator，会直接拦住提交。业务上超额入账是
 * 允许的，所以改成 select 下方的一行文字，提交流程完全不受影响。
 */
const accountStatusExcessHint = computed(() =>
  isNonSurplusAccountWithExcessActualAmount()
    ? "实付金额大于应付金额，建议将入账状态调整为基础入账富余"
    : "",
);

/** 组账单待收/富余金额 UI 原型（不进提交） */
const accountEntryAmountForm = ref({
  amount_cny: undefined as number | undefined,
  amount_usd: undefined as number | undefined,
});
const accountDiffManual = ref(false);

/**
 * 客户账款总差价 mock（负=欠、正=余）。
 * 验证：搜选「原型客户」有；「原型私聊客户」无。
 */
const CUSTOMER_DIFF_BALANCE_MOCK: Record<string, { cny: number; usd: number }> = {
  "1001": { cny: -180, usd: -28.5 },
};

const showAccountDiffUi = computed(
  () =>
    normalizeNumberOrZero(basicFormData.value.account_status) === 2 ||
    normalizeNumberOrZero(basicFormData.value.account_status) === 3,
);

const accountEntryAmountLabelCny = computed(() =>
  normalizeNumberOrZero(basicFormData.value.account_status) === 3
    ? "富余金额（元）"
    : "待收金额（元）",
);

const accountEntryAmountLabelUsd = computed(() =>
  normalizeNumberOrZero(basicFormData.value.account_status) === 3
    ? "富余金额（美元）"
    : "待收金额（美元）",
);

const customerDiffBalanceHint = computed(() => {
  const customerId = basicFormData.value.customer_id;
  if (customerId === undefined || customerId === null || customerId === "") return null;
  const balance = CUSTOMER_DIFF_BALANCE_MOCK[String(customerId)];
  if (!balance) return null;
  const cnyText = `${balance.cny >= 0 ? "+" : "-"}¥${Math.abs(balance.cny).toFixed(2)}`;
  const usdPart =
    Math.abs(balance.usd) > 0.0005
      ? ` / ${balance.usd >= 0 ? "+" : "-"}$${Math.abs(balance.usd).toFixed(2)}`
      : "";
  // 以人民币总差价正负定色：负=欠款红，正=余款绿
  const toneClass =
    balance.cny < 0
      ? "customer-diff-debt"
      : balance.cny > 0
        ? "customer-diff-surplus"
        : "";
  return { total: `${cnyText}${usdPart}`, toneClass };
});

function roundMoney2(value: number): number {
  return Number(value.toFixed(2));
}

function calcSignedDiff(actual: number | undefined, receivable: number | undefined): number {
  return roundMoney2(normalizeNumberOrZero(actual) - normalizeNumberOrZero(receivable));
}

const receivedVsReceivableDiff = computed(() => {
  if (basicFormData.value.payment_mode === 1) {
    return {
      cny: calcSignedDiff(basicFormData.value.actually_amount, basicFormData.value.receivable_rmb),
      usd: 0,
    };
  }
  return {
    cny: calcSignedDiff(
      basicFormData.value.actually_amount_mixed,
      basicFormData.value.receivable_rmb_mixed,
    ),
    usd: calcSignedDiff(
      basicFormData.value.actually_amount_usd,
      basicFormData.value.receivable_usd,
    ),
  };
});

function defaultDiffAbsCny(): number {
  return roundMoney2(Math.abs(receivedVsReceivableDiff.value.cny));
}

function defaultDiffAbsUsd(): number {
  if (basicFormData.value.payment_mode !== 2) return 0;
  return roundMoney2(Math.abs(receivedVsReceivableDiff.value.usd));
}

function applyAccountDiffDefaults(): void {
  if (!showAccountDiffUi.value) {
    accountEntryAmountForm.value = {
      amount_cny: undefined,
      amount_usd: undefined,
    };
    return;
  }
  if (accountDiffManual.value) return;
  accountEntryAmountForm.value = {
    amount_cny: defaultDiffAbsCny(),
    amount_usd:
      basicFormData.value.payment_mode === 2 ? defaultDiffAbsUsd() : undefined,
  };
}

function markAccountDiffManual(): void {
  accountDiffManual.value = true;
}

function resetAccountDiffUi(): void {
  accountDiffManual.value = false;
  accountEntryAmountForm.value = {
    amount_cny: undefined,
    amount_usd: undefined,
  };
}

watch(
  () => [
    basicFormData.value.account_status,
    basicFormData.value.payment_mode,
    basicFormData.value.actually_amount,
    basicFormData.value.receivable_rmb,
    basicFormData.value.actually_amount_mixed,
    basicFormData.value.receivable_rmb_mixed,
    basicFormData.value.actually_amount_usd,
    basicFormData.value.receivable_usd,
  ],
  () => {
    applyAccountDiffDefaults();
  },
);

function validateAccountStatus(): void {
  basicFormRef.value?.validateFields(["account_status"]).catch(() => undefined);
}

function handleActualAmountChange(): void {
  validateAccountStatus();
}

function handleAccountStatusChange(): void {
  accountDiffManual.value = false;
  applyAccountDiffDefaults();
  validateAccountStatus();
}

function confirmInsufficientActualAmount(): Promise<boolean> {
  return new Promise((resolve) => {
    Modal.confirm({
      title: "确认提交",
      content: "实付金额小于应付金额，请确定基础入账是否已完成",
      okText: "继续提交",
      cancelText: "返回修改",
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    });
  });
}

function mapPaymentMode(value: number): "pure_cny" | "mixed" {
  return value === 2 ? "mixed" : "pure_cny";
}

function mapCertificate(value: unknown): 1 | 2 | 3 {
  const num = Number(value);
  if (num === 1) return 2;
  if (num === 2) return 3;
  return 1;
}

function mapTaskContact(value: unknown): 0 | 1 | 2 | 3 {
  if (value === "all_shop") return 1;
  if (value === "org_level") return 2;
  if (value === "specified_shop") return 3;

  const num = Number(value);
  if (num === 1 || num === 2 || num === 3) return num;
  return 0;
}

/**
 * 变体情况下发值。
 *
 * 接口文档（`POST /admin/receive/create` → `tasks[].variant_mode`）的枚举是
 * **三档**：`0:(无)默认 / 1:变体随意 / 2:指定(多)变体`，与表单单选一一对应。
 *
 * 原实现写的是 `Number(value) === 2 ? 2 : 1`，把 0 和 undefined 一起折叠成 1，
 * 于是**默认值就是 0、绝大多数没人动过这个单选的任务，全都上报成「变体随意」**。
 * 这里按三档如实映射，取不到值时回落 0（与表单默认值一致）。
 */
function mapVariantMode(value: unknown): 0 | 1 | 2 {
  const mode = Number(value);
  return mode === 1 || mode === 2 ? mode : 0;
}

function buildReviewTypes(task: any): string[] {
  const reviewTypes = Array.isArray(task?.remark_type) ? task.remark_type : [];
  return reviewTypes
    .map((item: unknown) => reviewTypeMap[String(item)] || "")
    .filter((item: string) => item.length > 0);
}

function buildCommissionRates(task: any) {
  const reviewTypes = buildReviewTypes(task);
  const commissionRates: Record<string, number> = {};

  if (reviewTypes.includes("free_review")) {
    commissionRates.free_review = normalizeNumberOrZero(task?.ranking_commission);
  }
  if (reviewTypes.includes("words")) {
    commissionRates.words = normalizeNumberOrZero(task?.words_commission);
  }
  if (reviewTypes.includes("image")) {
    commissionRates.image = normalizeNumberOrZero(task?.pic_commission);
  }
  if (reviewTypes.includes("video")) {
    commissionRates.video = normalizeNumberOrZero(task?.video_commission);
  }
  if (reviewTypes.includes("feedback")) {
    commissionRates.feedback = normalizeNumberOrZero(task?.feedback_commission);
  }

  return Object.keys(commissionRates).length > 0 ? commissionRates : undefined;
}

function buildSchedules(ordersDatePlans: Record<string, any>): CreateReceiveTaskSchedule[] {
  return Object.entries(ordersDatePlans || {})
    .map(([scheduleDate, datePlan]) => {
      if (!datePlan || typeof datePlan !== "object" || Array.isArray(datePlan)) {
        return null;
      }

      const typeCounts: CreateReceiveTaskTypeCount[] = Object.entries(datePlan)
        .flatMap(([reviewType, reviewPlan]) => {
          if (!reviewPlan || typeof reviewPlan !== "object" || Array.isArray(reviewPlan)) {
            return [];
          }

          const keywordPlans = Array.isArray((reviewPlan as any).keyword_plans)
            ? (reviewPlan as any).keyword_plans
            : [];

          return keywordPlans
            .map((item: any) => ({
              keyword: typeof item?.keyword === "string" ? item.keyword : "",
              review: reviewTypeLabelMap[reviewType] || reviewType,
              schedule_num: normalizeNumberOrZero(item?.num),
              type:
                Number(item?.type) === 2 ||
                item?.type === "keyword_url" ||
                item?.type === "url"
                  ? "keyword_url"
                  : scheduleTypeMap[reviewType] || "keyword",
            }))
            .filter(
              (item: CreateReceiveTaskTypeCount) =>
                item.keyword.trim().length > 0 || item.schedule_num > 0,
            );
        });

      const totalQuantity = typeCounts.reduce(
        (sum, item) => sum + normalizeNumberOrZero(item.schedule_num),
        0,
      );

      if (!totalQuantity) return null;

      return {
        schedule_date: scheduleDate,
        total_quantity: totalQuantity,
        type_counts: typeCounts,
      };
    })
    .filter((item): item is CreateReceiveTaskSchedule => !!item);
}

function buildReceiveTaskPayload(
  task: any,
  latest: { orders_date_plans?: any; keyword_list?: any },
): CreateReceiveTaskItem {
  const finalOrdersDatePlans =
    latest.orders_date_plans && Object.keys(latest.orders_date_plans).length > 0
      ? latest.orders_date_plans
      : task.orders_date_plans || {};

  const schedules = buildSchedules(finalOrdersDatePlans);
  const reviewTypes = buildReviewTypes(task);
  const relatedShopName = Array.isArray(task?.related_shops)
    ? task.related_shops.find((item: unknown) => typeof item === "string" && item.trim().length > 0)
    : undefined;
  const variantValues = Array.isArray(task?.variants)
    ? task.variants
        .filter((item: unknown): item is string => typeof item === "string")
        .map((item: string) => item.trim())
        .filter(Boolean)
    : [];

  return {
    asin: task.asin || "",
    assign_shop:
      mapTaskContact(task?.task_relation) === 3 && relatedShopName
        ? {
            shop_id: 0,
            shop_name: relatedShopName,
          }
        : undefined,
    brand_name: task.brand || "",
    buyer_commission_quantity: normalizeNumberOrZero(task.extra_customer_num),
    buyer_commission_usd: normalizeNumberOrZero(task.extra_customer_commission),
    category: task.category ?? null,
    certificate: mapCertificate(task.is_send_msg),
    commission_rates: buildCommissionRates(task),
    country_id: normalizeNumberOrZero(task.country_id) || undefined,
    daily_feedback: Boolean(Number(task.daily_feedback)),
    exchange_rate: normalizeNumberOrZero(task.rate),
    more_variant:
      Number(task.variants_type) === 2 && variantValues.length > 0
        ? {
            color: variantValues[0] || "",
            size: variantValues.slice(1).join(" / "),
            variants: variantValues,
          }
        : undefined,
    product_images: task.imgurl_big || task.imgurl || "",
    product_price: normalizeNumberOrZero(task.product_price),
    rating_count: normalizeNumberOrZero(task.score),
    review_level: normalizeNumberOrZero(task.level),
    review_type: reviewTypes,
    schedules,
    service_commission_cny: normalizeNumberOrZero(task.additional_service_commission),
    star_rating: normalizeNumberOrZero(task.star_level),
    store_name: task.shop || "",
    task_contact: mapTaskContact(task.task_relation),
    task_remark: task.demand || "",
    total_order_quantity: normalizeNumberOrZero(task.orders_number),
    variant_mode: mapVariantMode(task.variants_type),
  };
}

function resolveCountryCutoffHour(countryName: unknown): number | null {
  const country = String(countryName || "").trim().toLowerCase();
  if (country.includes("德国") || country.includes("germany")) return 6;
  if (country.includes("英国") || country.includes("united kingdom") || country === "uk") return 7;
  if (
    country.includes("美国") ||
    country.includes("加拿大") ||
    country.includes("united states") ||
    country.includes("canada") ||
    country === "us"
  ) return 15;
  return null;
}

function formatRemainingUntil(deadline: dayjs.Dayjs) {
  const remainingMinutes = deadline.diff(dayjs(), "minute");
  if (remainingMinutes <= 0)
    return { text: "已截止", expired: true };
  const days = Math.floor(remainingMinutes / 1440);
  const hours = Math.floor((remainingMinutes % 1440) / 60);
  const minutes = remainingMinutes % 60;
  const text = [
    days ? `${days}天` : "",
    hours ? `${hours}小时` : "",
    `${minutes}分`,
  ].filter(Boolean).join("");
  return { text, expired: false };
}

function buildTaskConfirmRows(tasks: CreateReceiveTaskItem[]) {
  return taskPanes.value.map((pane, index) => {
    const task: any = tasksData.value[pane.key] || {};
    const payload = tasks[index];
    const schedules = Array.isArray(payload?.schedules) ? payload.schedules : [];
    const firstSchedule = schedules
      .map(item => item.schedule_date)
      .filter(Boolean)
      .sort()[0];
    const cutoffHour = resolveCountryCutoffHour(task.country_name);
    if (!firstSchedule || cutoffHour === null) {
      return {
        key: pane.key,
        asin: String(task.asin || ""),
        quantity: normalizeNumberOrZero(payload?.total_order_quantity),
        firstWindow: "—",
        remaining: "无法计算",
        expired: false,
      };
    }

    const deadline = dayjs(firstSchedule).hour(cutoffHour).minute(0).second(0);
    const start = deadline.subtract(1, "day");
    const end = deadline.subtract(1, "second");
    const remaining = formatRemainingUntil(deadline);
    return {
      key: pane.key,
      asin: String(task.asin || ""),
      quantity: normalizeNumberOrZero(payload?.total_order_quantity),
      firstWindow: `${start.format("M.D日 HH:mm")} - ${end.format("M.D日 HH:mm")}`,
      remaining: remaining.text,
      expired: remaining.expired,
    };
  });
}

async function submitConfirmedTask() {
  if (!pendingSubmitData.value || submitLoading.value)
    return;
  submitLoading.value = true;
  try {
    const response: ApiResponse = await createReceiveTask(pendingSubmitData.value, {
      basic: basicFormData.value,
      tasks: tasksData.value,
      panes: taskPanes.value,
      offset: offsetRecordPayload.value,
    });
    if (response.code !== 200) {
      message.error(response.msg || response.message || "提交失败");
      return;
    }
    taskConfirmOpen.value = false;
    pendingSubmitData.value = null;
    message.success("提交成功");
    emit("success", response.data);
  } catch (error) {
    console.error("提交失败:", error);
    message.error("提交失败，请稍后重试");
  } finally {
    submitLoading.value = false;
  }
}

function createTaskOffsetFields() {
  const record = offsetRecordPayload.value?.record;
  if (!props.createTaskOffset) {
    return {
      offset_type: normalizeNumberOrZero(record?.offset_type),
      offset_details: Array.isArray(record?.offset_details) ? record.offset_details : [],
      offset_task_basics: Array.isArray(record?.offset_task_basics) ? record.offset_task_basics : [],
    };
  }
  if (!record) return {};
  return {
    offset_type: record.offset_type,
    offset_task_basics: record.offset_task_basics,
    ...(record.surplus_type?.length && { surplus_type: record.surplus_type }),
    ...(record.offset_details?.length && { offset_details: record.offset_details }),
  };
}

// 提交表单
const handleSubmit = async () => {
  console.log(
    "点击下一步时查询数据",
    basicFormData.value.upload_bill,
    lastUploadBill.value,
  );
  // if (!basicFormData.value.upload_bill && lastUploadBill.value) {
  //   basicFormData.value.upload_bill = lastUploadBill.value;
  // }
  if (isView.value) {
    return;
  }
  try {
    // 验证基础信息表单
    await basicFormRef.value?.validate();
    const batchCollection = basicFormData.value.payment_mode === 1
      ? buildBatchCollectionPayload(batchCollectionRows.value)
      : [];
    if (basicFormData.value.payment_mode === 1 && !batchCollection.length) {
      message.warning("请至少填写一行实收款项和收款账号");
      return;
    }
    syncBatchCollectionTotal();

    // 验证所有任务表单
    if (Object.keys(taskFormRefs).length > 0) {
      for (const pane of taskPanes.value) {
        const formRef = taskFormRefs[pane.key];
        if (formRef && formRef.validate) {
          await formRef.validate();
        }
      }
    }

    // 检查是否有任务数据
    const taskKeys = Object.keys(tasksData.value);
    if (taskKeys.length === 0) {
      message.warning("请至少添加一个任务信息");
      return;
    }

    if (isCompletedAccountWithInsufficientActualAmount()) {
      const confirmed = await confirmInsufficientActualAmount();
      if (!confirmed) {
        return;
      }
    }

    console.log(
      "basicFormData.value.upload_bill",
      basicFormData.value.upload_bill,
    );

    // 构建提交数据
    const latestTaskPayloadByKey: Record<
      string,
      { orders_date_plans: any; keyword_list: any }
    > = {};
    taskPanes.value.forEach((pane, index) => {
      const formRef = taskFormRefs[pane.key];
      if (!formRef || !pane?.key) return;
      const latestOrdersPlans =
        typeof formRef.getOrdersDatePlansPayload === "function"
          ? formRef.getOrdersDatePlansPayload()
          : undefined;
      const latestKeywordList =
        typeof formRef.getKeywordTemplateList === "function"
          ? formRef.getKeywordTemplateList()
          : undefined;
      latestTaskPayloadByKey[pane.key] = {
        orders_date_plans: latestOrdersPlans,
        keyword_list: latestKeywordList,
      };
    });

    const tasks = taskPanes.value.map((pane) => {
      const task: any = tasksData.value[pane.key] || {};
      const latest = latestTaskPayloadByKey[pane.key] || {};
      return buildReceiveTaskPayload(task, latest);
    });

    const submitData: CreateReceiveTaskRequest = {
      account_status: normalizeNumberOrZero(basicFormData.value.account_status) || 1,
      actual_cny_amount:
        basicFormData.value.payment_mode === 2
          ? normalizeNumberOrZero(basicFormData.value.actually_amount_mixed)
          : normalizeNumberOrZero(basicFormData.value.actually_amount),
      actual_usd_amount:
        basicFormData.value.payment_mode === 2
          ? normalizeNumberOrZero(basicFormData.value.actually_amount_usd)
          : 0,
      batch_collection: batchCollection,
      business_remark: basicFormData.value.business_remarks || "",
      cash_buy_price: normalizeNumberOrZero(basicFormData.value.buying_price),
      cash_sell_price: normalizeNumberOrZero(basicFormData.value.selling_price),
      employee_id: normalizeNumberOrZero(basicFormData.value.customer_id),
      group_chat_name: String(basicFormData.value.group_chat_name || ""),
      ...createTaskOffsetFields(),
      payment_mode: mapPaymentMode(basicFormData.value.payment_mode),
      tasks,
      total_task: tasks.length,
      transfer_channel: normalizeNumberOrZero(basicFormData.value.remittance_channel),
      water_bill_path:
        formatUploadBillValue(basicFormData.value.upload_bill) ||
        formatUploadBillValue(lastUploadBill.value),
    };
    // localStorage.setItem('submitData', JSON.stringify(submitData));
    console.log("submitData", submitData);

    pendingSubmitData.value = submitData;
    taskConfirmRows.value = buildTaskConfirmRows(tasks);
    taskConfirmSummaryText.value = buildTaskConfirmSummary(
      taskPanes.value.map((pane, index) => {
        const task: any = tasksData.value[pane.key] || {};
        const payload = tasks[index];
        return {
          asin: String(payload?.asin || task.asin || ""),
          countryName: String(task.country_name || ""),
          schedules: Array.isArray(payload?.schedules) ? payload.schedules : [],
          totalQuantity: normalizeNumberOrZero(payload?.total_order_quantity),
        };
      })
    );
    taskConfirmOpen.value = true;
  } catch (error: any) {
    if (error && typeof error === "object" && "errorFields" in error) {
      // 表单验证失败
      message.warning("请检查表单填写是否正确");
      return;
    }
    console.error("提交失败:", error);
    message.error(error?.message || "提交失败，请稍后重试");
  } finally {
    submitLoading.value = false;
  }
};

// 重置表单
const handleReset = () => {
  if (isView.value) return;
  formResetVersion.value += 1;
  basicFormRef.value?.resetFields();
  // 重置基础信息数据
  basicFormData.value = {
    customer_name: undefined,
    customer_id: undefined,
    group_chat_name: undefined,
    payment_mode: 1,
    buying_price: undefined,
    selling_price: undefined,
    receivable_rmb: undefined,
    actually_amount: undefined,
    receivable_usd: undefined,
    receivable_rmb_mixed: undefined,
    actually_amount_usd: undefined,
    actually_amount_mixed: undefined,
    remittance_channel: undefined,
    account_status: 1,
    business_remarks: "",
    upload_bill: "",
  };
  groupChatOptions.value = [];
  lastUploadBill.value = "";
  offsetRecordPayload.value = null;
  offsetModalOpen.value = false;
  resetAccountDiffUi();
  batchCollectionRows.value = [
    { actual_cny_amount: undefined, transfer_channel: undefined },
  ];
  // 重置任务数据
  tasksData.value = {};
  // 重置任务标签页
  taskTabIndex = 0;
  taskPanes.value = [
    {
      key: `task-${++taskTabIndex}`,
      title: "任务1",
      closable: false,
    },
  ];
  initTaskData(taskPanes.value[0].key);
  activeKey.value = taskPanes.value[0].key;
};
</script>

<style scoped >
@charset "UTF-8";
/* 提示不是报错：用 warning 橙而不是 error 红，避免看着像被拦住了 */
.account-status-hint {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.5;
  color: #d97706;
}

.account-diff-hint {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.5;
  color: #6b7280;
}

.customer-diff-balance {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: #6b7280;
}

.customer-diff-debt {
  color: #dc2626;
  font-weight: 600;
}

.customer-diff-surplus {
  color: #059669;
  font-weight: 600;
}

.create-task-form {
  padding: 0;
  min-height: 100%;
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-header {
  padding: 0 0 16px 0;
}
.page-header .header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.page-header .page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: var(--ant-color-text, rgba(0, 0, 0, 0.85));
  display: flex;
  align-items: center;
  gap: 8px;
  transition: color 0.3s;
}
.page-header .page-title .title-icon {
  font-size: 24px;
}
.page-header .refresh-btn {
  color: var(--ant-color-text-secondary, rgba(0, 0, 0, 0.65));
  transition: color 0.3s;
}
.page-header .refresh-btn:hover {
  color: #1890ff;
}

.form-card {
  flex: 1;
  min-height: 0;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: background-color 0.3s, box-shadow 0.3s;
  overflow: hidden;
}
.form-card :deep(.ant-card-body) {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  padding: 0px;
}

.page-layout {
  display: grid;
  grid-template-columns: minmax(420px, 480px) minmax(0, 1fr);
  gap: 24px;
  align-items: stretch;
  flex: 1;
  min-height: 0;
  box-sizing: border-box;
  padding-top: 24px;
  overflow: hidden;
}

.basic-panel {
  display: flex;
  min-height: 0;
}

.basic-section-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.task-panel {
  display: flex;
  min-width: 0;
  min-height: 0;
}

.task-section-card {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.section-card {
  border: 1px solid var(--ant-color-border, #f0f0f0);
  border-radius: 12px;
  background: var(--ant-color-bg-container, #fff);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--ant-color-border, #f0f0f0);
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--ant-color-text, rgba(0, 0, 0, 0.85));
}

.task-section-header {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--ant-color-bg-container, #fff);
}

.task-tabs {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  padding: 0 20px 20px;
  overflow: hidden;
}
.task-tabs :deep(.ant-tabs-nav) {
  margin: 0;
  padding-top: 12px;
}
.task-tabs :deep(.ant-tabs-content-holder) {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-top: 16px;
  padding-right: 0px;
  scrollbar-gutter: stable;
}
.task-tabs :deep(.ant-tabs-content) {
  min-width: 0;
  height: 100%;
  overflow-x: hidden;
}

.task-tab-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.task-tab-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--ant-color-text-tertiary, rgba(0, 0, 0, 0.45));
  cursor: pointer;
  transition: color 0.2s;
}
.task-tab-close:hover {
  color: var(--ant-color-error, #ff4d4f);
}

.basic-info-form {
  flex: 1;
  padding: 24px 20px 72px;
  overflow-y: auto;
  min-height: 0;
  scrollbar-gutter: stable;
}
.basic-info-form :deep(.ant-form-item-label) {
  text-align: right;
}
.basic-info-form :deep(.ant-form-item-label > label) {
  justify-content: flex-end;
}
.basic-info-form .form-item {
  margin-bottom: 24px;
}
.basic-info-form .form-item :deep(.ant-form-item-label) {
  font-weight: 500;
  color: var(--ant-color-text, rgba(0, 0, 0, 0.85));
  transition: color 0.3s;
}
.basic-info-form .form-tip {
  margin-left: 8px;
  color: var(--ant-color-text-tertiary, rgba(0, 0, 0, 0.45));
  font-size: 14px;
  transition: color 0.3s;
}
.basic-info-form .full-width {
  width: 100%;
}
.basic-info-form .actual-amount-control {
  display: flex;
  align-items: center;
  gap: 8px;
}
.basic-info-form .actual-amount-input {
  flex: 1;
  min-width: 0;
}
.basic-info-form .batch-collection-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.basic-info-form .batch-collection-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.basic-info-form .batch-collection-amount,
.basic-info-form .batch-collection-account {
  flex: 1;
  min-width: 0;
}
.basic-info-form .upload-preview {
  margin-top: 12px;
}

.evaluation-form .form-item {
  margin-bottom: 24px;
}
.evaluation-form .form-item :deep(.ant-form-item-label) {
  font-weight: 500;
  color: var(--ant-color-text, rgba(0, 0, 0, 0.85));
  transition: color 0.3s;
}
.evaluation-form .remark-daily-orders-form-item :deep(.ant-form-item-label) {
  pointer-events: none;
  cursor: default;
}
.evaluation-form .commission-form-item :deep(.ant-form-item-label) {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}
.evaluation-form .form-tip {
  margin-top: 8px;
  color: var(--ant-color-text-tertiary, rgba(0, 0, 0, 0.45));
  font-size: 14px;
  transition: color 0.3s;
}

.product-image-wrapper {
  width: 100%;
}
.product-image-wrapper .image-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: var(--ant-color-bg-container);
  border-radius: 6px;
  border: 1px dashed var(--ant-color-border, #d9d9d9);
  transition: background-color 0.3s, border-color 0.3s;
}
.product-image-wrapper .image-loading .loading-text {
  margin-top: 16px;
  color: var(--ant-color-text-secondary, rgba(0, 0, 0, 0.65));
  font-size: 14px;
  transition: color 0.3s;
}
.product-image-wrapper .product-image-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}
.product-image-wrapper .product-image-container .product-image {
  max-width: 300px;
  max-height: 300px;
  border-radius: 6px;
  border: 1px solid var(--ant-color-border, #e8e8e8);
  transition: border-color 0.3s;
}
.product-image-wrapper .product-image-container .product-image :deep(.ant-image-img) {
  object-fit: contain;
}
.product-image-wrapper .product-image-container .refresh-image-btn {
  padding: 0;
}
.product-image-wrapper .image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: var(--ant-color-bg-container);
  border-radius: 6px;
  border: 1px dashed var(--ant-color-border, #d9d9d9);
  transition: background-color 0.3s, border-color 0.3s;
}
.product-image-wrapper .image-placeholder .placeholder-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}
.product-image-wrapper .image-placeholder .placeholder-text {
  color: var(--ant-color-text-tertiary, rgba(0, 0, 0, 0.45));
  font-size: 14px;
  transition: color 0.3s;
}

.full-width {
  width: 100%;
}

.dynamic-field-container {
  width: 100%;
}
.dynamic-field-container .dynamic-field-box {
  padding: 20px;
  background: var(--ant-color-bg-container);
  border: 1px solid var(--ant-color-border, #e8e8e8);
  border-radius: 8px;
  transition: all 0.3s;
}
.dynamic-field-container .dynamic-field-box:hover {
  border-color: var(--ant-color-border, #d9d9d9);
  box-shadow: var(--ant-box-shadow-secondary, 0 2px 8px rgba(0, 0, 0, 0.06));
}
.dynamic-field-container .item-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.multi-input-item {
  width: 100%;
  margin-bottom: 8px;
  background: var(--ant-color-bg-container);
  border-radius: 6px;
  transition: all 0.3s;
}
.multi-input-item:last-of-type {
  margin-bottom: 0;
}
.multi-input-item .input-item {
  flex: 1;
  min-width: 200px;
}
.multi-input-item .remove-btn {
  flex-shrink: 0;
}
.multi-input-item .remove-btn-placeholder {
  flex-shrink: 0;
  width: 60px;
  height: 32px;
}

.add-btn {
  margin-top: 12px;
  display: flex;
  align-items: center;
}

.keyword-item {
  width: 100%;
  margin-bottom: 8px;
  background: var(--ant-color-bg-container);
  border-radius: 6px;
  transition: all 0.3s;
}
.keyword-item .keyword-input {
  flex: 1;
  min-width: 200px;
}
.keyword-item .separator {
  color: var(--ant-color-text-tertiary, rgba(0, 0, 0, 0.45));
  font-weight: 500;
  flex-shrink: 0;
  transition: color 0.3s;
}
.keyword-item .number-input {
  width: 120px;
  flex-shrink: 0;
}
.keyword-item .unit {
  color: var(--ant-color-text-secondary, rgba(0, 0, 0, 0.65));
  font-size: 14px;
  min-width: 24px;
  flex-shrink: 0;
  transition: color 0.3s;
}
.keyword-item .image-upload-wrapper {
  cursor: pointer;
  flex-shrink: 0;
}
.keyword-item .image-upload-wrapper .keyword-image {
  width: 32px;
  height: 32px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid var(--ant-color-border, #d9d9d9);
  transition: all 0.3s;
}
.keyword-item .image-upload-wrapper .keyword-image:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
}
.keyword-item .remove-btn {
  flex-shrink: 0;
}
.keyword-item .remove-btn-placeholder {
  flex-shrink: 0;
  width: 60px;
  height: 32px;
}
.keyword-item .add-btn {
  width: 100%;
  margin-top: 12px;
  display: flex;
  align-items: center;
}

.authority-link-item {
  width: 100%;
  margin-bottom: 8px;
  background: var(--ant-color-bg-container);
  border-radius: 6px;
  transition: all 0.3s;
}
.authority-link-item .link-input {
  flex: 1;
  min-width: 200px;
}
.authority-link-item .separator {
  color: var(--ant-color-text-tertiary, rgba(0, 0, 0, 0.45));
  font-weight: 500;
  flex-shrink: 0;
  transition: color 0.3s;
}
.authority-link-item .number-input {
  width: 120px;
  flex-shrink: 0;
}
.authority-link-item .unit {
  color: var(--ant-color-text-secondary, rgba(0, 0, 0, 0.65));
  font-size: 14px;
  min-width: 24px;
  flex-shrink: 0;
  transition: color 0.3s;
}
.authority-link-item .remove-btn {
  flex-shrink: 0;
}
.authority-link-item .remove-btn-placeholder {
  flex-shrink: 0;
  width: 60px;
  height: 32px;
}
.authority-link-item .add-btn {
  width: 100%;
  margin-top: 12px;
  display: flex;
  align-items: center;
}

.review-options {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: var(--ant-color-bg-container);
  border-radius: 6px;
  transition: background-color 0.3s;
}
.review-options .review-option-item {
  display: flex;
  align-items: center;
  gap: 12px;
}
.review-options .review-option-item .review-number-input {
  width: 120px;
}
.review-options .review-option-item .unit {
  color: var(--ant-color-text-secondary, rgba(0, 0, 0, 0.65));
  font-size: 14px;
  transition: color 0.3s;
}

.commission-group {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  padding: 16px;
  background: var(--ant-color-bg-container);
  border-radius: 6px;
  transition: background-color 0.3s;
}
.commission-group .commission-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  background: var(--ant-color-bg-container);
}
.commission-group .commission-item .commission-label {
  font-weight: 500;
  color: var(--ant-color-text, rgba(0, 0, 0, 0.85));
  min-width: 40px;
  transition: color 0.3s;
}
.commission-group .commission-item .commission-input {
  width: 120px;
}

.calendar-panel-content {
  width: 900px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 200px);
  overflow-y: auto;
  overflow-x: hidden;
}
.calendar-panel-content .calendar-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  transition: border-color 0.3s;
}
.calendar-panel-content .calendar-header .guide-text {
  font-size: 13px;
  color: var(--ant-color-text-secondary, rgba(0, 0, 0, 0.65));
  line-height: 1.6;
  transition: color 0.3s;
}
.calendar-panel-content .calendar-header .guide-text strong {
  color: var(--ant-color-text, rgba(0, 0, 0, 0.85));
}
.calendar-panel-content .calendar-header .guide-text .note-text {
  color: var(--ant-color-text-tertiary, rgba(0, 0, 0, 0.45));
}
.calendar-panel-content .calendar-content {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}
.calendar-panel-content .calendar-content .calendar-month {
  flex: 1;
}
.calendar-panel-content .calendar-content .calendar-month .month-header {
  margin-bottom: 12px;
  text-align: center;
}
.calendar-panel-content .calendar-content .calendar-month .month-header .month-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--ant-color-text, rgba(0, 0, 0, 0.85));
  transition: color 0.3s;
}
.calendar-panel-content .calendar-content .calendar-month .calendar-grid .weekday-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 8px;
}
.calendar-panel-content .calendar-content .calendar-month .calendar-grid .weekday-header .weekday {
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  color: var(--ant-color-text-secondary, rgba(0, 0, 0, 0.65));
  padding: 4px 0;
  transition: color 0.3s;
}
.calendar-panel-content .calendar-content .calendar-month .calendar-grid .calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}
.calendar-panel-content .calendar-content .calendar-month .calendar-grid .calendar-days .calendar-day {
  min-height: 70px;
  padding: 4px 2px;
  border: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  background: var(--ant-color-bg-container, #fff);
  transition: all 0.2s;
}
.calendar-panel-content .calendar-content .calendar-month .calendar-grid .calendar-days .calendar-day:hover:not(.is-holiday) {
  border-color: #1890ff;
  background: var(--ant-color-primary-bg, #f0f8ff);
}
.calendar-panel-content .calendar-content .calendar-month .calendar-grid .calendar-days .calendar-day.is-selected {
  background: var(--ant-color-primary-bg, #e6f7ff);
  border-color: #1890ff;
}
.calendar-panel-content .calendar-content .calendar-month .calendar-grid .calendar-days .calendar-day.is-holiday {
  background: var(--ant-color-fill-tertiary, #f5f5f5);
  border-color: var(--ant-color-border, #d9d9d9);
  cursor: not-allowed;
}
.calendar-panel-content .calendar-content .calendar-month .calendar-grid .calendar-days .calendar-day.is-holiday .day-number {
  color: var(--ant-color-text-disabled, rgba(0, 0, 0, 0.25));
}
.calendar-panel-content .calendar-content .calendar-month .calendar-grid .calendar-days .calendar-day.is-holiday .holiday-text {
  font-size: 11px;
  color: var(--ant-color-text-disabled, rgba(0, 0, 0, 0.25));
}
.calendar-panel-content .calendar-content .calendar-month .calendar-grid .calendar-days .calendar-day.is-other-month {
  opacity: 0.4;
}
.calendar-panel-content .calendar-content .calendar-month .calendar-grid .calendar-days .calendar-day.unified-mode {
  cursor: pointer;
}
.calendar-panel-content .calendar-content .calendar-month .calendar-grid .calendar-days .calendar-day.unified-mode:hover {
  background: #fff7e6;
  border-color: #ffc53d;
}
.calendar-panel-content .calendar-content .calendar-month .calendar-grid .calendar-days .calendar-day .day-number {
  font-size: 13px;
  font-weight: 500;
  color: var(--ant-color-text, rgba(0, 0, 0, 0.85));
  margin-bottom: 4px;
  transition: color 0.3s;
}
.calendar-panel-content .calendar-content .calendar-month .calendar-grid .calendar-days .calendar-day .day-input {
  width: 100%;
  max-width: 60px;
}
.calendar-panel-content .calendar-content .calendar-month .calendar-grid .calendar-days .calendar-day .day-input :deep(.ant-input-number-input) {
  text-align: center;
  font-size: 14px;
}
.calendar-panel-content .calendar-footer {
  padding-top: 16px;
  transition: border-color 0.3s;
}
.calendar-panel-content .calendar-footer .unified-setting {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.calendar-panel-content .calendar-footer .unified-setting .unified-input {
  width: 120px;
}
.calendar-panel-content .calendar-footer .unified-setting .unit-text {
  color: var(--ant-color-text-secondary, rgba(0, 0, 0, 0.65));
  font-size: 14px;
  transition: color 0.3s;
}
.calendar-panel-content .calendar-footer .unified-setting .unified-tip {
  color: #1890ff;
  font-size: 14px;
  margin-left: 8px;
}
.calendar-panel-content .calendar-footer .date-range-selector {
  display: flex;
  align-items: center;
  gap: 12px;
}
.calendar-panel-content .calendar-footer .date-range-selector .range-picker {
  flex: 1;
}

.form-footer {
  display: flex;
  /* 重置靠左、提交靠右，中间拉开距离，避免误点（《9.1 创建任务页面修改》6） */
  justify-content: space-between;
  flex-shrink: 0;
  padding-top: 16px;
  transition: border-color 0.3s;
}
.form-footer .submit-btn {
  font-size: 15px;
  font-weight: 500;
}
.form-footer .reset-btn {
  font-size: 15px;
}

.task-confirm-summary {
  margin-bottom: 12px;
  color: #667085;
}

.task-confirm-table {
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.task-confirm-row {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr 2fr 1fr;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  border-bottom: 1px solid #f0f0f0;
}

.task-confirm-row:last-child {
  border-bottom: 0;
}

.task-confirm-head {
  color: #667085;
  font-weight: 600;
  background: #f8fafc;
}

.task-confirm-asin {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.task-confirm-expired {
  color: #ff4d4f;
}

@media (max-width: 768px) {
  .page-layout {
    grid-template-columns: 1fr;
    overflow: visible;
  }
  .basic-panel {
    position: static;
  }
  .basic-section-card {
    flex: none;
    max-height: none;
  }
  .basic-info-form {
    overflow-y: visible;
  }
  .task-section-card {
    flex: none;
    max-height: none;
  }
  .task-tabs {
    overflow: visible;
  }
  .task-tabs :deep(.ant-tabs-content-holder) {
    overflow-y: visible;
    padding-bottom: 0;
  }
  .section-header,
  .task-item-header {
    flex-wrap: wrap;
  }
  .dynamic-field-container .dynamic-field-box {
    padding: 16px;
  }
  .dynamic-field-container .item-content {
    flex-direction: column;
    align-items: stretch;
  }
  .dynamic-field-container .item-content .keyword-input,
  .dynamic-field-container .item-content .link-input,
  .dynamic-field-container .item-content .input-item {
    min-width: 100%;
    width: 100%;
  }
  .dynamic-field-container .item-content .number-input {
    width: 100%;
  }
  .keyword-item .item-content,
  .authority-link-item .item-content,
  .multi-input-item .item-content {
    flex-direction: column;
    align-items: stretch;
  }
  .commission-group {
    flex-direction: column;
    gap: 16px;
  }
  .commission-group .commission-item {
    width: 100%;
  }
  .review-options .review-option-item {
    flex-wrap: wrap;
  }
  .calendar-panel-content {
    width: calc(100vw - 32px) !important;
    max-height: calc(100vh - 80px);
  }
  .calendar-panel-content .calendar-content {
    flex-direction: column;
    gap: 16px;
  }
  .calendar-panel-content .calendar-month .calendar-grid .calendar-days .calendar-day {
    min-height: 60px;
    padding: 2px;
  }
  .calendar-panel-content .calendar-month .calendar-grid .calendar-days .calendar-day .day-input {
    max-width: 50px;
  }
  .calendar-panel-content .calendar-footer .unified-setting {
    flex-wrap: wrap;
  }
  .calendar-panel-content .calendar-footer .date-range-selector {
    flex-direction: column;
    align-items: stretch;
  }
  .calendar-panel-content .calendar-footer .date-range-selector .range-picker {
    width: 100%;
  }
}
</style>
