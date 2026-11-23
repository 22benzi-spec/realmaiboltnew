<template>
  <div class="calendar-panel-content">
      <div class="schedule-overview">
        <div class="schedule-overview-stats">
          <div class="schedule-overview-item">
            <div class="schedule-overview-label">任务总订单量</div>
            <div class="schedule-overview-value">{{ totalScheduleOrders }}</div>
          </div>
          <div class="schedule-overview-item">
            <div class="schedule-overview-label">已排订单数</div>
            <div class="schedule-overview-value">{{ scheduledOrderCount }}</div>
          </div>
          <div class="schedule-overview-item">
            <div class="schedule-overview-label">剩余未排数</div>
            <div class="schedule-overview-value">{{ remainingScheduleOrders }}</div>
          </div>
        </div>
        <div class="schedule-overview-progress">
          <a-progress :percent="scheduleProgressPercent" />
        </div>
      </div>

      <!-- 「当前任务总金额」卡片已移出到 TaskInfoForm 的「排期设置」区块之前（李运侠 改，2026-08-30） -->

      <div class="calendar-layout">
        <div class="calendar-left">
          <div class="calendar-header">
            <div>
              <div class="panel-header-title">关键词模板</div>
              <div class="keyword-template-scroll">
                <div v-for="(item, itemIndex) in taskData.keyword_list" :key="itemIndex" class="keyword-template-row">
                  <span class="required-asterisk keyword-template-asterisk">*</span>
                  <div class="keyword-template-type">
                    <a-radio-group v-model:value="item.type" button-style="solid" size="small">
                      <a-radio-button :value="1">关键词</a-radio-button>
                      <a-radio-button :value="2">链接</a-radio-button>
                    </a-radio-group>
                  </div>
                  <div class="keyword-template-input">
                    <!-- 失焦校验重复，重复则清空并提示（《9.1 创建任务页面修改》8） -->
                    <a-input v-model:value="item.keyword" placeholder="请输入关键词/链接" size="middle"
                      style="flex: 1; min-width: 200px;"
                      @blur="validateKeywordDuplicate(itemIndex as number)" />
                  </div>
                  <div class="keyword-template-action">
                    <a-button v-if="(itemIndex as number) === 0" type="primary" @click="addKeywordItem" :disabled="isReadOnly"
                      size="middle">
                      <template #icon>
                        <PlusOutlined />
                      </template>
                    </a-button>
                    <a-button v-else type="text" danger @click="removeKeywordItem(itemIndex as number)" :disabled="isReadOnly"
                      size="middle">
                      <template #icon>
                        <MinusOutlined />
                      </template>
                    </a-button>
                  </div>
                </div>
              </div>
            </div>
            <div class="guide-text">
              <strong>下单指导：</strong>日历下方仅展示当天总单数；点击日期后在右侧按类型与关键词配置单量。
            </div>
            <div v-if="!scheduleEnabled" class="guide-text" style="color: #ff4d4f;">
              请先填写任务总单量后再进行排期。
            </div>
          </div>

          <div
            :style="{ pointerEvents: scheduleEnabled ? 'auto' : 'none', opacity: scheduleEnabled ? 1 : 0.55 }"
            @mousedown.capture="onCalendarMouseDown"
          >
            <!--
              早于今天的日期不可选（李运侠 2026-09-06）：
              disabled-date 负责拦点击，单元格上的 is-past 负责置灰。
              @select 仍再判一次，防止 antd 版本差异下禁用态漏拦。
            -->
            <a-calendar :value="calendarValue" :fullscreen="false" :header-render="renderCalendarHeader"
              :disabled-date="isPastScheduleDate"
              @update:value="setCalendarValue"
              @select="onCalendarSelect">
              <template #dateFullCellRender="{ current }">
                <div class="calendar-cell" :class="{
                  'is-other-month': current.month() !== calendarValue.month(),
                  'is-selected': isDateSelectedByDayjs(current),
                  'is-past': isPastScheduleDate(current),
                  'is-scheduled-locked': isSavedScheduleDateByDayjs(current)
                }">
                  <div class="day-number">{{ current.date() }}</div>
                  <div class="day-orders">{{ getDateOrdersDisplay(current) }}</div>
                </div>
              </template>
            </a-calendar>
          </div>
        </div>

        <div class="calendar-right">
          <div v-if="!scheduleEnabled" class="schedule-detail-placeholder">请先填写任务总单量</div>
          <div v-else-if="selectedScheduleDateKeys.length" class="schedule-detail-panel">
            <div class="schedule-detail-header">
              <div class="selected-date-list">
                <span>已选日期：</span>
                <span v-for="dateKey in selectedScheduleDateKeys" :key="dateKey" class="selected-date-item">
                  <span>{{ dateKey }}</span>
                  <a-button type="text" danger size="small" class="selected-date-remove"
                    @click="removeSelectedScheduleDate(dateKey)">×</a-button>
                </span>
              </div>
              <div class="schedule-detail-header-right">
                <span>合计单量：{{ selectedScheduleDayTotal }}</span>
              </div>
            </div>

            <div class="schedule-type-selector">
              <div class="selector-label">选择下单类型（点击添加/移除）</div>
              <div class="selector-actions">
                <a-button v-for="type in selectedReviewTypes" :key="type" size="small"
                  :type="isDateTypeSelected(type) ? 'primary' : 'default'" @click="toggleDateType(type)"
                  :disabled="isReadOnly || !scheduleEnabled">
                  <!-- 选中态已由按钮主色体现，不再重复写「（添加）/（移除）」，上方说明已够（《9.1》4） -->
                  {{ getTypeLabel(type) }}
                </a-button>
              </div>
            </div>

            <div v-for="type in selectedDateTypes" :key="type" class="type-detail-block">
              <div class="type-detail-title">
                <span>{{ getTypeLabel(type) }}</span>
                <span>总单量：{{ getTypeTotal(type) }}</span>
              </div>
              <div v-for="(item, idx) in getTypeKeywordRows(type)" :key="`${type}-${idx}`" class="type-keyword-row">
                <a-select :value="getTypeKeywordSelectValue(item)" :options="getKeywordTemplateOptionsForType(type, idx)"
                  placeholder="请选择关键词模板" size="small" show-search allow-clear :filter-option="true"
                  @update:value="(val: string | undefined) => updateTypeKeyword(type, idx, val)" />
                <a-input-number :value="item.num" :min="0" :precision="0" placeholder="单量" size="small"
                  @change="(val: number | null) => updateTypeKeywordNum(type, idx, val)" />
                <a-button v-if="idx === 0" type="text" size="small" @click="addTypeKeywordRow(type)" :disabled="isReadOnly || !scheduleEnabled">
                  <template #icon><PlusOutlined /></template>
                </a-button>
                <a-button v-else type="text" danger size="small" @click="removeTypeKeywordRow(type, idx)"
                  :disabled="isReadOnly || !scheduleEnabled">
                  <template #icon><MinusOutlined /></template>
                </a-button>
              </div>
            </div>

            <div class="calendar-footer">
              <div class="unified-setting">
                <a-button type="primary" @click="handleSaveSchedule" size="middle" :disabled="isReadOnly || !scheduleEnabled">保存排期</a-button>
              </div>
            </div>
          </div>
          <div v-else class="schedule-detail-placeholder">请先在左侧日历选择日期</div>
        </div>
      </div>

      <div class="scheduled-summary">已排期（{{ scheduledDateCount }}天）</div>
      <div class="scheduled-list">
        <div v-for="item in scheduledDateList" :key="item.date" class="scheduled-day">
          <a-button type="text" danger size="small" class="scheduled-day-remove" @click="removeScheduledDate(item.date)">
            ×
          </a-button>
          <span class="scheduled-day-date">{{ item.date }}</span>
          <span class="scheduled-day-total">{{ item.num }}单</span>
          <div class="scheduled-type-list">
            <span v-for="typeItem in item.typeDetails" :key="`${item.date}-${typeItem.type}`" class="scheduled-type-item">
              {{ typeItem.label }}*{{ typeItem.num }}<span v-if="typeItem.keywordHint">（{{ typeItem.keywordHint }}）</span>
            </span>
          </div>
        </div>
      </div>
    </div>
</template>

<script setup lang="ts">
import { MinusOutlined, PlusOutlined } from '@ant-design/icons-vue';
import dayjs, { type Dayjs } from 'dayjs';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import type { KeywordType } from '../shared';

const props = defineProps<{
  taskData: any;
  isReadOnly: boolean;
  scheduleEnabled: boolean;
  selectedReviewTypes: KeywordType[];
  selectedScheduleDateKeys: string[];
  selectedDateTypes: KeywordType[];
  selectedScheduleDayTotal: number;
  totalScheduleOrders: number;
  scheduledOrderCount: number;
  remainingScheduleOrders: number;
  scheduleProgressPercent: number;
  currentProductPrice: number;
  currentRate: number;
  currentOrders: number;
  commissionSubtotal: number;
  rankingCommissionSubtotal: number;
  wordsCommissionSubtotal: number;
  picCommissionSubtotal: number;
  videoCommissionSubtotal: number;
  feedbackCommissionSubtotal: number;
  productReturnSubtotal: number;
  extraCustomerUsdAmount: number;
  extraCustomerQuantity: number;
  extraCustomerCommission: number;
  additionalServiceCommission: number;
  totalAmountRmb: number;
  scheduledDateCount: number;
  scheduledDateList: any[];
  calendarValue: Dayjs;
  setCalendarValue: (value: Dayjs) => void;
  renderCalendarHeader: (payload: { value: Dayjs; onChange?: (val: Dayjs) => void }) => any;
  handleCalendarSelect: (date: Dayjs) => void;
  handleCalendarRangeSelect: (startDate: Dayjs, endDate: Dayjs) => void;
  getDateOrdersDisplay: (date: Dayjs) => string;
  isDateSelectedByDayjs: (date: Dayjs) => boolean;
  isSavedScheduleDateByDayjs: (date: Dayjs) => boolean;
  removeSelectedScheduleDate: (dateKey: string) => void;
  isDateTypeSelected: (type: KeywordType) => boolean;
  toggleDateType: (type: KeywordType) => void;
  getTypeLabel: (type: KeywordType) => string;
  getTypeTotal: (type: KeywordType) => number;
  getTypeKeywordRows: (type: KeywordType) => any[];
  getTypeKeywordSelectValue: (item: any) => string | undefined;
  getKeywordTemplateOptionsForType: (type: KeywordType, index: number) => any[];
  updateTypeKeyword: (type: KeywordType, index: number, value: string | undefined) => void;
  updateTypeKeywordNum: (type: KeywordType, index: number, value: number | null) => void;
  addTypeKeywordRow: (type: KeywordType) => void;
  removeTypeKeywordRow: (type: KeywordType, index: number) => void;
  handleSaveSchedule: () => void;
  addKeywordItem: () => void;
  validateKeywordDuplicate: (index: number) => void;
  removeKeywordItem: (index: number) => void;
  removeScheduledDate: (dateKey: string) => void;
}>();

/**
 * 早于今天的日期一律不可排期（李运侠 2026-09-06）。
 *
 * 按「天」比较，今天本身可选——需求原文是「小于当前日期的值标灰不让点击」，
 * 举例「今天 9.4，之前的日期变灰」，所以 9.4 当天仍然可点。
 */
function isPastScheduleDate(current: Dayjs) {
  return current.isBefore(dayjs(), 'day');
}

const shiftRangeAnchor = ref<Dayjs | null>(null);
const calendarMouseUsesShift = ref(false);

function onCalendarMouseDown(event: MouseEvent) {
  calendarMouseUsesShift.value = event.shiftKey;
  if (!event.shiftKey) shiftRangeAnchor.value = null;
}

function clearShiftRangeAnchor(event: KeyboardEvent) {
  if (event.key !== 'Shift') return;
  shiftRangeAnchor.value = null;
  calendarMouseUsesShift.value = false;
}

function clearShiftRangeAnchorOnBlur() {
  shiftRangeAnchor.value = null;
  calendarMouseUsesShift.value = false;
}

/** disabled-date 已经拦了一层，这里再判一次，避免不同 antd 版本对自定义单元格放行 */
function onCalendarSelect(date: Dayjs) {
  if (isPastScheduleDate(date)) return;
  const usesShift = calendarMouseUsesShift.value;
  calendarMouseUsesShift.value = false;
  if (!usesShift) {
    shiftRangeAnchor.value = null;
    props.handleCalendarSelect(date);
    return;
  }

  const anchor = shiftRangeAnchor.value;
  if (!anchor || !anchor.isSame(date, 'month')) {
    const wasSelected = props.isDateSelectedByDayjs(date);
    props.handleCalendarSelect(date);
    shiftRangeAnchor.value = wasSelected ? null : date.startOf('day');
    return;
  }

  props.handleCalendarRangeSelect(anchor, date.startOf('day'));
}

onMounted(() => {
  window.addEventListener('keyup', clearShiftRangeAnchor);
  window.addEventListener('blur', clearShiftRangeAnchorOnBlur);
});

onBeforeUnmount(() => {
  window.removeEventListener('keyup', clearShiftRangeAnchor);
  window.removeEventListener('blur', clearShiftRangeAnchorOnBlur);
});
</script>
