<template>
  <a-form ref="formRef" :name="`create-task-${props.taskKey}`" :model="taskData" :rules="formRules" :label-col="{ flex: 'none' }" :wrapper-col="{ span: 20 }"
    class="evaluation-form" :disabled="isReadOnly">
    <div class="task-form-sections">
      <section class="task-form-section">
        <div class="task-form-section-title">基本信息</div>
        <!-- 基础资料区：商品基础字段、站点/汇率、凭证需求、产品图片 -->
        <BasicInfoPanel
          :taskData="taskData"
          :countryOptions="countryOptions"
          :productImageLoading="productImageLoading"
          :isReadOnly="isReadOnly"
          :formatExchangeRate="formatExchangeRate"
          :parseExchangeRate="parseExchangeRate"
          :handleAsinBlur="handleAsinBlur"
          :handleAsinQuery="handleAsinQuery"
          :refreshProductImage="refreshProductImage"
          :handleExchangeRateChange="handleExchangeRateChange"
          :handleCountryChange="handleCountryChange"
        />
      </section>
      <section class="task-form-section">
        <div class="task-form-section-title">测评设置</div>
        <!-- 评测规则区：等级、类型、多类型开关、任务总单量 -->
        <ReviewSettingsPanel
          :taskData="taskData"
          :selectedReviewTypes="selectedReviewTypes"
          :setSelectedReviewTypes="setSelectedReviewTypes"
          :handleLevelChange="handleLevelChange"
        />
      </section>
      <section class="task-form-section">
        <div class="task-form-section-title">收费设置</div>
        <!-- 金额配置区：各类型佣金、额外买手佣金、额外服务佣金 -->
        <CommissionSettingsPanel
          :taskData="taskData"
          :selectedReviewTypes="selectedReviewTypes"
          :formatExchangeRate="formatExchangeRate"
          :parseExchangeRate="parseExchangeRate"
          :handleExchangeRateChange="handleExchangeRateChange"
        />
      </section>
      <section class="task-form-section">
        <div class="task-form-section-title">任务设置</div>
        <!-- 关联规则区：变体约束、任务排重范围、指定关联店铺 -->
        <RelationSettingsPanel
          :taskData="taskData"
          :isReadOnly="isReadOnly"
          :addVariant="addVariant"
          :removeVariant="removeVariant"
          :handleVariantTypeChange="handleVariantTypeChange"
          :addRelatedShop="addRelatedShop"
          :removeRelatedShop="removeRelatedShop"
          :handleTaskRelationChange="handleTaskRelationChange"
        />
      </section>
      <section class="task-form-section">
        <div class="task-form-section-title">其他信息</div>
        <!-- 轻量补充区：任务备注等非核心字段 -->
        <OtherInfoPanel
          :taskData="taskData"
          :remarkOptions="remarkOptions"
          :handleRemarkSearch="handleRemarkSearch"
        />
      </section>
      <!-- 当前任务总金额：按要求移到「排期设置」之前（李运侠 改，2026-08-30） -->
      <section class="task-form-section">
        <TaskTotalSummaryPanel
          :paymentMode="props.paymentMode"
          :cashBuyRate="currentCashBuyRate"
          :selectedReviewTypes="selectedReviewTypes"
          :currentProductPrice="currentProductPrice"
          :currentRate="currentRate"
          :currentOrders="currentOrders"
          :commissionSubtotal="commissionSubtotal"
          :rankingCommissionSubtotal="rankingCommissionSubtotal"
          :commissionBreakdown="commissionBreakdown"
          :wordsCommissionSubtotal="wordsCommissionSubtotal"
          :picCommissionSubtotal="picCommissionSubtotal"
          :videoCommissionSubtotal="videoCommissionSubtotal"
          :feedbackCommissionSubtotal="feedbackCommissionSubtotal"
          :productReturnSubtotal="productReturnSubtotal"
          :extraCustomerUsdAmount="extraCustomerUsdAmount"
          :extraCustomerQuantity="extraCustomerQuantity"
          :extraCustomerCommission="extraCustomerCommission"
          :additionalServiceCommission="additionalServiceCommission"
          :totalAmountRmb="totalAmountRmb"
          :getTypeLabel="getTypeLabel"
        />
      </section>
      <section class="task-form-section">
        <div class="task-form-section-title">排期设置</div>
        <!--
          排期核心区：
          1. 左侧展示关键词模板和日历
          2. 右侧编辑选中日期的类型/关键词/单量
          3. 顶部展示排期进度和金额汇总
          这里传参较多，按“排期状态 / 金额汇总 / 日历交互 / 类型编辑动作”四类拆给子组件。
        -->
        <!-- 排期状态：当前选择、已排总量、进度统计 -->
        <!-- 金额汇总：顶部账单拆解和合计展示 -->
        <!-- 日历交互：当前月份值、头部渲染、日期选择与展示 -->
        <!-- 类型编辑动作：类型切换、关键词模板映射、行增删、保存排期 -->
        <ScheduleSettingsPanel
          :taskData="taskData"
          :isReadOnly="isReadOnly"
          :scheduleEnabled="canEditSchedule"
          :selectedReviewTypes="selectedReviewTypes"
          :selectedScheduleDateKeys="selectedScheduleDateKeys"
          :selectedDateTypes="selectedDateTypes"
          :selectedScheduleDayTotal="selectedScheduleDayTotal"
          :totalScheduleOrders="totalScheduleOrders"
          :scheduledOrderCount="scheduledOrderCount"
          :remainingScheduleOrders="remainingScheduleOrders"
          :scheduleProgressPercent="scheduleProgressPercent"
          :currentProductPrice="currentProductPrice"
          :currentRate="currentRate"
          :currentOrders="currentOrders"
          :commissionSubtotal="commissionSubtotal"
          :rankingCommissionSubtotal="rankingCommissionSubtotal"
          :commissionBreakdown="commissionBreakdown"
          :wordsCommissionSubtotal="wordsCommissionSubtotal"
          :picCommissionSubtotal="picCommissionSubtotal"
          :videoCommissionSubtotal="videoCommissionSubtotal"
          :feedbackCommissionSubtotal="feedbackCommissionSubtotal"
          :productReturnSubtotal="productReturnSubtotal"
          :extraCustomerUsdAmount="extraCustomerUsdAmount"
          :extraCustomerQuantity="extraCustomerQuantity"
          :extraCustomerCommission="extraCustomerCommission"
          :additionalServiceCommission="additionalServiceCommission"
          :totalAmountRmb="totalAmountRmb"
          :scheduledDateCount="scheduledDateCount"
          :scheduledDateList="scheduledDateList"
          :calendarValue="calendarValue"
          :setCalendarValue="setCalendarValue"
          :renderCalendarHeader="renderCalendarHeader"
          :handleCalendarSelect="handleCalendarSelect"
          :handleCalendarRangeSelect="handleCalendarRangeSelect"
          :getDateOrdersDisplay="getDateOrdersDisplay"
          :isDateSelectedByDayjs="isDateSelectedByDayjs"
          :isSavedScheduleDateByDayjs="isSavedScheduleDateByDayjs"
          :removeSelectedScheduleDate="removeSelectedScheduleDate"
          :isDateTypeSelected="isDateTypeSelectedByString"
          :toggleDateType="toggleDateTypeByString"
          :getTypeLabel="getTypeLabelByString"
          :getTypeTotal="getTypeTotalByString"
          :getTypeKeywordRows="getTypeKeywordRowsByString"
          :getTypeKeywordSelectValue="getTypeKeywordSelectValue"
          :getKeywordTemplateOptionsForType="getKeywordTemplateOptionsForTypeByString"
          :updateTypeKeyword="updateTypeKeywordByString"
          :updateTypeKeywordNum="updateTypeKeywordNumByString"
          :addTypeKeywordRow="addTypeKeywordRowByString"
          :removeTypeKeywordRow="removeTypeKeywordRowByString"
          :handleSaveSchedule="handleSaveSchedule"
          :addKeywordItem="addKeywordItem"
          :validateKeywordDuplicate="validateKeywordDuplicate"
          :removeKeywordItem="removeKeywordItem"
          :removeScheduledDate="removeScheduledDate"
        />
      </section>
    </div>
  </a-form>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, nextTick, h, resolveComponent } from 'vue';
import { message } from 'ant-design-vue';
import type { FormInstance } from 'ant-design-vue';
import dayjs, { type Dayjs } from 'dayjs';
import { getCommonAsinProduct, getCommonOptions } from './dataSource';
// 分区组件仅负责对应折叠面板的 UI，状态与数据同步统一由当前容器组件维护。
import BasicInfoPanel from './task-info-form/sections/BasicInfoPanel.vue';
import CommissionSettingsPanel from './task-info-form/sections/CommissionSettingsPanel.vue';
import OtherInfoPanel from './task-info-form/sections/OtherInfoPanel.vue';
import RelationSettingsPanel from './task-info-form/sections/RelationSettingsPanel.vue';
import ReviewSettingsPanel from './task-info-form/sections/ReviewSettingsPanel.vue';
import ScheduleSettingsPanel from './task-info-form/sections/ScheduleSettingsPanel.vue';
import TaskTotalSummaryPanel from './task-info-form/sections/TaskTotalSummaryPanel.vue';
import { getShiftScheduleRangeDateKeys } from './task-info-form/scheduleShiftRange';
import {
  createEmptyComments,
  getTypeLabel,
  getTypeSummaryLabel,
  keywordTypes,
  normalizeComments,
  normalizeEntryStatus,
  normalizeKeywordItem,
  normalizeKeywordList,
  normalizeKeywordPlanType,
  normalizeKeywordTemplateItem,
  normalizeSendMsg,
  parseRemarkTypes,
  type KeywordItem,
  type KeywordPlanType,
  type KeywordTemplateItem,
  type KeywordType,
  type OrderDatePlanFixed,
  type OrderDatePlanItem,
  type ScheduleDateDetail,
} from './task-info-form/shared';

const commissionFieldKeys = [
  'ranking_commission',
  'words_commission',
  'pic_commission',
  'video_commission',
  'feedback_commission',
] as const;

const hasCommissionValues = (data: any) =>
  commissionFieldKeys.some((key) => data?.[key] !== undefined && data?.[key] !== null && data?.[key] !== '');

// Props
interface Props {
  taskKey: string;
  initialData?: any;
  paymentMode?: 1 | 2;
  readonly?: boolean;
}

// props 是父页面传进来的任务上下文，包含任务标识、回填数据、只读状态。
const props = withDefaults(defineProps<Props>(), {
  initialData: () => ({}),
  paymentMode: 1,
  readonly: false,
});

// emit 是当前任务表单往父页面同步最新数据的出口。
const emit = defineEmits<{
  'update:data': [data: any];
}>();

// isReadOnly 是当前任务表单是否允许编辑的统一开关。
const isReadOnly = computed(() => props.readonly);

type TaskRelation = 0 | 1 | 2 | 3;

const normalizeTaskRelation = (value: unknown): TaskRelation => {
  if (value === 'all_shop') return 1;
  if (value === 'org_level') return 2;
  if (value === 'specified_shop') return 3;

  const num = Number(value);
  if (num === 1 || num === 2 || num === 3) return num;
  return 0;
};

// countryOptions 是“站点任务”下拉框的数据源。
type CountryOption = {
  id: number | string;
  country: string;
  country_code?: string;
  currency_symbol?: string;
  /** 实时汇率，非「接单汇率」，禁止用它回填表单 */
  exchange_rate?: string | number;
  /** 建议接单汇率，「接单汇率」字段的唯一取值来源 */
  suggest_exchange_rate?: string | number;
  [key: string]: any;
};

const countryOptions = ref<CountryOption[]>([]);
const US_COMMISSION_DEFAULTS = {
  ranking_commission: 28,
  words_commission: 68,
  pic_commission: 78,
  video_commission: 168,
  feedback_commission: 50,
};
const OTHER_SITE_COMMISSION_DEFAULTS = {
  ranking_commission: 28,
  words_commission: 80,
  pic_commission: 90,
  video_commission: 180,
  feedback_commission: 50,
};
const getDefaultCountryId = (options: CountryOption[]): number | string | undefined => {
  const usOption = options.find((item) => {
    const name = String(item?.country ?? '').toLowerCase();
    const code = String(item?.country_code ?? '').toLowerCase();
    return name.includes('美国') || name.includes('united states') || code === 'us';
  });
  return usOption?.id ?? options[0]?.id;
};

const getCountryCommissionDefaults = (countryId?: number | string) => {
  const target = countryOptions.value.find((item) => String(item.id) === String(countryId));
  const name = String(target?.country ?? '').trim().toLowerCase();
  const code = String(target?.country_code ?? '').trim().toLowerCase();

  if (name.includes('美国') || name.includes('united states') || code === 'us')
    return {
      ...US_COMMISSION_DEFAULTS,
      words_commission: Number(taskData.value.level) === 3 ? 100 : Number(taskData.value.level) === 2 ? 80 : 68,
      pic_commission: Number(taskData.value.level) === 3 ? 110 : Number(taskData.value.level) === 2 ? 90 : 78,
      video_commission: Number(taskData.value.level) === 3 ? 200 : Number(taskData.value.level) === 2 ? 180 : 168,
    };
  if (
    name.includes('德国')
    || name.includes('germany')
    || name.includes('英国')
    || name.includes('united kingdom')
    || name.includes('加拿大')
    || name.includes('canada')
    || ['de', 'gb', 'uk', 'ca'].includes(code)
  )
    return OTHER_SITE_COMMISSION_DEFAULTS;
  return undefined;
};

/**
 * 当前这套佣金是按哪个国家、美国站测评等级算出来的。
 *
 * 佣金先按国家区分，美国站再按测评等级区分；国家或美国站等级变化时都必须重算，
 * 不管这次变更是用户点下拉、还是父组件回填 props 带进来的（李运侠 2026-10-13 改）。
 *
 * 之前只在下拉 @change 那一刻写值，而 taskData 有一条
 * 「deep watch → emit('update:data') → 父组件 → props → 回填」的回流链路，
 * 回填时又用 `!hasCommissionValues(newData)` 做开关——已有值就不覆盖，
 * 于是新国家的佣金在回流中被旧值顶掉，表现为「换了站点佣金没变」
 * （李运侠 2026-09-01 反馈）。
 */
const commissionSyncedCountryId = ref('');
const commissionSyncedLevel = ref<number>();

const syncCommissionsFromCountry = (countryId?: number | string, overwriteExisting = true) => {
  const defaults = getCountryCommissionDefaults(countryId);
  if (!defaults) return;

  Object.entries(defaults).forEach(([key, value]) => {
    if (overwriteExisting || taskData.value[key] === undefined || taskData.value[key] === null || taskData.value[key] === '')
      taskData.value[key] = value;
  });
  if (
    commissionSyncedLevel.value !== undefined
    && commissionSyncedLevel.value !== Number(taskData.value.level)
    && defaults !== OTHER_SITE_COMMISSION_DEFAULTS
  ) {
    taskData.value.words_commission = defaults.words_commission;
    taskData.value.pic_commission = defaults.pic_commission;
    taskData.value.video_commission = defaults.video_commission;
  }
  commissionSyncedCountryId.value = String(countryId ?? '');
  commissionSyncedLevel.value = Number(taskData.value.level);
};

/** 生效国家与佣金当前所属国家不一致 —— 此时必须覆盖，不能沿用旧值 */
const isCommissionCountryStale = (countryId?: number | string) => {
  const next = String(countryId ?? '');
  return !!next && !!commissionSyncedCountryId.value && next !== commissionSyncedCountryId.value;
};

/**
 * 「接单汇率」取 GET /admin/common/options?types=country 的 `suggest_exchange_rate`（建议接单汇率）。
 * 该接口另有 `exchange_rate`（实时汇率），语义不同，**禁止**用它回退。
 */
const getCountryExchangeRate = (countryId?: number | string) => {
  const target = countryOptions.value.find((item) => item.id === countryId);
  const rate = Number(target?.suggest_exchange_rate);
  return Number.isFinite(rate) && rate > 0 ? rate : undefined;
};

/**
 * 接单汇率是否被用户手动改过：当前值已填且与该国家的建议接单汇率不一致即视为手改。
 * 用值比对而非额外的「已编辑」标志，避免 a-input-number 程序化赋值也触发 change 造成误判。
 */
const isRateManuallyEdited = (countryId?: number | string) => {
  const current = taskData.value.rate;
  if (current === undefined || current === null || current === ('' as any)) return false;
  const suggested = getCountryExchangeRate(countryId);
  if (suggested === undefined) return true;
  return Number(current) !== Number(suggested);
};

/**
 * 回填接单汇率。
 * `force` 为真表示用户主动切换了「站点任务」，此时按新国家的建议汇率覆盖；
 * 否则（props 同步等被动触发）不得覆盖用户手改的值——接单汇率允许自定义修改。
 */
const syncRateFromCountry = (countryId?: number | string, force = false) => {
  if (!force && isRateManuallyEdited(countryId)) return;
  const rate = getCountryExchangeRate(countryId);
  if (rate !== undefined) {
    taskData.value.rate = rate;
  }
};

const getCountryOptions = async (): Promise<void> => {
  const response = await getCommonOptions({ types: 'country' });
  if (response.code === 200) {
    countryOptions.value = Array.isArray(response?.data?.country)
      ? (response.data.country as CountryOption[])
      : [];
    if (taskData.value.country_id === undefined && countryOptions.value.length > 0) {
      taskData.value.country_id = getDefaultCountryId(countryOptions.value);
    }
    taskData.value.country_name =
      countryOptions.value.find(item => String(item.id) === String(taskData.value.country_id))?.country || '';
    syncRateFromCountry(taskData.value.country_id);
    syncCommissionsFromCountry(taskData.value.country_id, !hasCommissionValues(props.initialData));
  }
};
getCountryOptions();

// formRef 是当前任务表单实例，父页面会通过它触发校验和重置。
const formRef = ref<FormInstance>();

// taskData 是整个任务页签的核心表单数据，所有子组件都围绕它进行读写。
const taskData = ref({
  country_id: undefined as number | undefined, // 国家ID (站点任务)
  country_name: '', // 仅供提交确认弹窗计算各站点截单时间（禅道 #174）
  asin: '', // sku
  product_name: undefined as string | undefined, // 产品名称
  imgurl_big: '', // 产品图片
  imgurl: '', // 小图
  shop: '', // 店铺名称
  brand: '', // 品牌
  category: null as string | null, // 产品类型/类目
  star_level: undefined as number | undefined, // 星级
  score: undefined as number | undefined, // 评分数量
  product_price: undefined as number | undefined, // 产品售价
  level: 1 as 1 | 2 | 3, // 测评等级 1-普通测评 2-高等测评 3-极高等测评
  remark_type: [] as KeywordType[], // 测评类型，提交 addEvaluation 接口时直接传数组
  is_erveryday_num: 1 as 0 | 1, // 周期安排 0-固定单量 1-日历模式
  everyday_number: undefined as number | undefined, // 周期安排每日单量
  order_date_plans: [] as Dayjs[],
  daily_orders_map: {} as Record<string, number>,
  variants_type: 0 as 0 | 1 | 2, // 变体情况 0-无（默认） 1-变体随意 2-指定(多)变体
  variants: [''] as string[], // 多变体列表
  task_relation: 0 as TaskRelation, // 任务关联 0-无特殊关联 1-全店排重 2-组织级排重 3-指定店铺排重
  related_shops: [''] as string[], // 关联店铺列表
  comments: createEmptyComments(), // 留评选项（关键词+周期安排）
  review_options: {
    free_review: false,
    feedback: false,
    words: false,
    video: false,
    image: false,
  }, // 仅用于前端展示的留评选项开关
  entry_status: 1 as 1 | 2 | 3, // 入账状态 1-基础入账完成 2-基础入账未完成 3-基础入账富余
  rate: undefined as number | undefined, // 汇率（接单汇率）
  commission: {
    free: 28,
    text: 68,
    image: 78,
    video: 168,
    feedback: 50,
  },
  extra_customer_commission: undefined as number | undefined, // 额外买手佣金
  extra_customer_num: undefined as number | undefined, // 额外买手买单数量
  additional_service_commission: undefined as number | undefined, // 额外服务佣金
  orders_number: undefined as number | undefined, // 订单总数
  amount: undefined as number | undefined, // 当前任务测评总金额

  // 测评类型 数据模型设计不对 需后端重新设计
  words_num: 0 as number, // 评论数
  ranking_num: 0 as number, // 免评评论数
  feedback_num: 0 as number, // feedback评论数
  pic_num: 0 as number, // 图片评论数
  video_num: 0 as number, // 视频评论数

  words_commission: 68 as number, // 评论佣金
  ranking_commission: 28 as number, // 免评佣金
  feedback_commission: 50 as number, // feedback佣金
  pic_commission: 78 as number, // 图片佣金
  video_commission: 168 as number, // 视频评论佣金
  demand: '', // 任务备注
  business_remarks: '', // 商务备注
  daily_feedback: 0,
  seller: '',
  order_account: 'maizi',
  ...props.initialData,
  keyword_list: normalizeKeywordList(props.initialData).length > 0 ? normalizeKeywordList(props.initialData) : [{ keyword: '', type: 1 }],
  is_send_msg: normalizeSendMsg(props.initialData), // 凭证需求 0无 1单号图片 2金额图片
});

// syncingFromProps 是回填保护开关，避免父子 watch 相互触发导致死循环。
const syncingFromProps = ref(false);
// selectedScheduleDateKeys 是排期面板当前选中的日期列表。
const selectedScheduleDateKeys = ref<string[]>([]);
// scheduleDetails 是排期编辑态的核心数据，按“日期 -> 类型 -> 关键词行”保存明细。
const scheduleDetails = ref<Record<string, ScheduleDateDetail>>({});
// draftDailyOrdersMap 是排期编辑中的临时单量，用于实时刷新日历格子展示。
const draftDailyOrdersMap = ref<Record<string, number>>({});
const setReviewOptionsByTypes = (types: KeywordType[]) => {
  const selectedSet = new Set(types);
  keywordTypes.forEach((type) => {
    taskData.value.review_options[type] = selectedSet.has(type);
  });
};

const syncReviewOptionsFromRemarkType = (remarkType: unknown) => {
  setReviewOptionsByTypes(parseRemarkTypes(remarkType));
};

// selectedReviewTypes 是评测类型的业务态，和 review_options 开关互相映射。
const selectedReviewTypes = computed<KeywordType[]>({
  get: () => keywordTypes.filter((type) => taskData.value.review_options[type]),
  set: (values) => {
    setReviewOptionsByTypes(values as KeywordType[]);
  },
});

// setSelectedReviewTypes 是评测设置子组件回写类型选择时的统一入口。
const setSelectedReviewTypes = (values: string[]) => {
  selectedReviewTypes.value = values as KeywordType[];
};

const syncReviewOptionsFromComments = () => {
  const comments = taskData.value.comments;
  keywordTypes.forEach((type) => {
    if (comments[type]?.keywords?.length) {
      taskData.value.review_options[type] = true;
    }
  });
};

const syncReviewOptionsFromScheduleDetails = () => {
  keywordTypes.forEach((type) => {
    const hasTypeSchedule = Object.values(scheduleDetails.value).some((detail) => !!detail?.[type]);
    if (hasTypeSchedule) {
      taskData.value.review_options[type] = true;
    }
  });
};

// 从后端回填 orders_date_plans 到前端编辑态：
// 1) scheduleDetails：右侧按日期/类型/关键词编辑
// 2) daily_orders_map：日历格子展示当天总单量
const hydrateScheduleFromOrdersDatePlans = (ordersDatePlans: any): boolean => {
  if (!ordersDatePlans || typeof ordersDatePlans !== 'object' || Array.isArray(ordersDatePlans)) {
    return false;
  }
  const nextDetails: Record<string, ScheduleDateDetail> = {};
  const nextDailyMap: Record<string, number> = {};

  Object.entries(ordersDatePlans).forEach(([dateKey, datePlan]) => {
    if (typeof dateKey !== 'string' || !datePlan || typeof datePlan !== 'object' || Array.isArray(datePlan)) {
      return;
    }
    const dateDetail: ScheduleDateDetail = {};
    let dateTotal = 0;
    keywordTypes.forEach((type) => {
      const typePlan = (datePlan as Record<string, any>)[type];
      if (!typePlan || typeof typePlan !== 'object' || Array.isArray(typePlan)) return;
      const rawOrderNum = typePlan.order_num;
      const orderNumValue = rawOrderNum === 0 || rawOrderNum ? Number(rawOrderNum) : undefined;
      const typeOrderNum =
        typeof orderNumValue === 'number' && !Number.isNaN(orderNumValue) && orderNumValue > 0
          ? orderNumValue
          : undefined;
      const rawKeywordPlans = Array.isArray(typePlan.keyword_plans) ? typePlan.keyword_plans : [];
      // 每条 keyword_plan 对应一行：keyword + order_num + type
      const rows: KeywordItem[] = rawKeywordPlans
        .map((keywordPlan: any) =>
          normalizeKeywordItem({
            keyword: keywordPlan?.keyword,
            // 此接口结构中 num 是关键词行单量，order_num 可能恒为 0
            num: keywordPlan?.num ?? keywordPlan?.order_num,
            type: keywordPlan?.type,
          })
        )
        .filter((row: KeywordItem) => {
          const rowNum = Number(row.num);
          return row.keyword.trim().length > 0 || (!Number.isNaN(rowNum) && rowNum > 0);
        });

      if (!rows.length && typeOrderNum !== undefined) {
        // 兼容只有 type 总单量、但没有明细行的历史数据
        rows.push({ keyword: '', num: typeOrderNum, type: 1 });
      }
      if (!rows.length) return;

      dateDetail[type] = { keywords: rows };
      const rowTotal = rows.reduce((sum: number, row: KeywordItem) => {
        const value = Number(row.num);
        if (Number.isNaN(value) || value <= 0) return sum;
        return sum + value;
      }, 0);
      dateTotal += typeOrderNum ?? rowTotal;
    });

    // 日期总单量优先使用后端返回的各类型汇总字段
    // ranking_num + words_num + pic_num + video_num + feedback_num
    const summaryTotal = (
      ['ranking_num', 'words_num', 'pic_num', 'video_num', 'feedback_num'] as const
    ).reduce((sum, key) => {
      const raw = (datePlan as Record<string, any>)[key];
      const num = Number(raw);
      if (Number.isNaN(num) || num <= 0) return sum;
      return sum + num;
    }, 0);

    if (Object.keys(dateDetail).length > 0) {
      nextDetails[dateKey] = dateDetail;
    }
    if (summaryTotal > 0) {
      nextDailyMap[dateKey] = summaryTotal;
    } else if (dateTotal > 0) {
      nextDailyMap[dateKey] = dateTotal;
    }
  });

  if (!Object.keys(nextDetails).length && !Object.keys(nextDailyMap).length) {
    return false;
  }

  scheduleDetails.value = nextDetails;
  taskData.value.daily_orders_map = nextDailyMap;
  // 详情默认不展开右侧编辑面板
  selectedScheduleDateKeys.value = [];
  draftDailyOrdersMap.value = {};
  return true;
};

// 处理回填数据（初始化和后续变更）
watch(
  () => props.initialData,
  (newData) => {
    if (newData && Object.keys(newData).length > 0) {
      syncingFromProps.value = true;
      taskData.value = { ...taskData.value, ...newData };
      taskData.value.is_send_msg = normalizeSendMsg(newData);
      taskData.value.entry_status = normalizeEntryStatus((newData as any)?.entry_status ?? taskData.value.entry_status);
      taskData.value.task_relation = normalizeTaskRelation(taskData.value.task_relation);
      taskData.value.comments = normalizeComments((taskData.value as any).comments);
      // 新结构回填入口：把 orders_date_plans 解析进编辑态
      hydrateScheduleFromOrdersDatePlans((newData as any)?.orders_date_plans);
      taskData.value.keyword_list =
        normalizeKeywordList(newData).length > 0 ? normalizeKeywordList(newData) : [{ keyword: '', type: 1 }];
      syncCommissionsFromCountry(
        taskData.value.country_id,
        isCommissionCountryStale(taskData.value.country_id) || !hasCommissionValues(newData),
      );
      const hasDailyOrdersMap =
        taskData.value.daily_orders_map &&
        Object.values(taskData.value.daily_orders_map).some(
          (value) => value !== undefined && value !== null && Number(value) > 0
        );
      const hasDailyNumFixed =
        newData && Object.prototype.hasOwnProperty.call(newData, 'is_erveryday_num');
      if (!hasDailyNumFixed) {
        if (hasDailyOrdersMap) {
          taskData.value.is_erveryday_num = 1;
        } else if (
          taskData.value.everyday_number !== undefined &&
          taskData.value.everyday_number !== null &&
          Number(taskData.value.everyday_number) > 0
        ) {
          taskData.value.is_erveryday_num = 0;
        }
      }
      if (Array.isArray(taskData.value.order_date_plans)) {
        taskData.value.order_date_plans = taskData.value.order_date_plans
          .map((item: unknown) => dayjs(item as dayjs.ConfigType))
          .filter((item: Dayjs) => item.isValid())
          .slice(0, 2);
      } else {
        taskData.value.order_date_plans = [];
      }
      const hasReviewOptions =
        newData && Object.prototype.hasOwnProperty.call(newData, 'review_options');
      if (!hasReviewOptions) {
        syncReviewOptionsFromRemarkType((newData as any)?.remark_type);
        syncReviewOptionsFromComments();
        syncReviewOptionsFromScheduleDetails();
      }
      taskData.value.remark_type = selectedReviewTypes.value;
      if (taskData.value.country_id !== undefined && taskData.value.country_id !== null) {
        syncRateFromCountry(taskData.value.country_id);
      }
      nextTick(() => {
        syncingFromProps.value = false;
      });
    }
  },
  { deep: true, immediate: true }
);

/**
 * 用户主动切换站点任务（李运侠 2026-09-01）：按新国家覆盖接单汇率与佣金。
 *
 * 不能只依赖下面那个 watch：父组件回填 `initialData` 时会把 `syncingFromProps`
 * 置为 true，若回填与国家变更落在同一轮 flush，watch 会被守卫挡掉，
 * 表现就是「换了国家佣金没变」。这里由 select 的 @change 直接调用，不受守卫影响。
 */
const handleCountryChange = (value: number | string) => {
  if (value === undefined || value === null) return;
  taskData.value.country_name = countryOptions.value.find(item => String(item.id) === String(value))?.country || '';
  syncRateFromCountry(value, true);
  syncCommissionsFromCountry(value);
};

watch(
  () => taskData.value.country_id,
  (countryId) => {
    if (countryId === undefined || countryId === null || syncingFromProps.value) return;
    taskData.value.country_name =
      countryOptions.value.find(item => String(item.id) === String(countryId))?.country || '';
    // 主动换国家：按新国家的建议接单汇率覆盖，忽略此前的手改值
    syncRateFromCountry(countryId, true);
    syncCommissionsFromCountry(countryId);
  }
);

// productImageLoading 是产品图片加载中的状态。
const productImageLoading = ref<boolean>(false);
// remarkOptions 是“任务备注”自动完成的候选项。
const remarkOptions = ref<Array<{ value: string; label: string }>>([]);

// unifiedSettingEnabled 是排期统一设置的预留开关，目前主要用于后续扩展。
const unifiedSettingEnabled = ref<boolean>(false);
// calendarValue 是排期日历当前显示的月份值。
const calendarValue = ref<Dayjs>(dayjs());
// setCalendarValue 是给排期子组件回写日历月份的受控更新方法。
const setCalendarValue = (value: Dayjs) => {
  calendarValue.value = value;
};
// rangeStart / rangeEnd 是固定区间排期模式下记录的起止日期。
const rangeStart = ref<Dayjs | null>(null);
const rangeEnd = ref<Dayjs | null>(null);

// 当前日期
const today = computed(() => dayjs());
const currentMonth = computed(() => today.value.month());
const currentYear = computed(() => today.value.year());
const nextYear = computed(() => currentMonth.value === 11 ? currentYear.value + 1 : currentYear.value);

const getDateKeyByDayjs = (date: Dayjs): string => {
  return date.format('YYYY-MM-DD');
};

/**
 * 日历格子里的单量：**排了才显示**，没排期返回空串（《9.1 创建任务页面修改》3）。
 * 原来整月每一格都写着「0 单」，噪声大，反而看不出哪几天真的排了。
 */
const getDateOrdersDisplay = (date: Dayjs): string => {
  const dateKey = getDateKeyByDayjs(date);
  const draftNum = draftDailyOrdersMap.value[dateKey];
  const num = draftNum !== undefined ? Number(draftNum) || 0 : (Number(taskData.value.daily_orders_map?.[dateKey]) || 0);
  return num > 0 ? `${num} 单` : '';
};

const selectedScheduleDateKey = computed<string>(() => selectedScheduleDateKeys.value[0] || '');

const selectedDateTypes = computed<KeywordType[]>(() => {
  if (!selectedScheduleDateKeys.value.length) return [];
  const detail = scheduleDetails.value[selectedScheduleDateKey.value] || {};
  return keywordTypes.filter((type) => !!detail[type]);
});

const selectedScheduleDayTotal = computed(() => {
  if (!selectedScheduleDateKeys.value.length) return 0;
  return selectedScheduleDateKeys.value.reduce((sum, dateKey) => {
    const draftNum = draftDailyOrdersMap.value[dateKey];
    const currentNum = draftNum !== undefined ? Number(draftNum) || 0 : (Number(taskData.value.daily_orders_map?.[dateKey]) || 0);
    return sum + currentNum;
  }, 0);
});

const scheduledDateList = computed(() => {
  return Object.entries(taskData.value.daily_orders_map || {})
    .map(([date, num]) => {
      const detail = scheduleDetails.value[date] || {};
      const typeDetails = keywordTypes
        .map((type) => {
          const rows = detail[type]?.keywords || [];
          const typeNum = rows.reduce((sum, row) => {
            const value = Number(row.num);
            if (Number.isNaN(value) || value <= 0) return sum;
            return sum + value;
          }, 0);
          if (typeNum <= 0) return null;
          const keywords = Array.from(
            new Set(
              rows
                .map((row) => (typeof row.keyword === 'string' ? row.keyword.trim() : ''))
                .filter((keyword) => keyword.length > 0)
            )
          );
          const keywordHint = keywords.slice(0, 2).join(' / ');
          return {
            type,
            label: getTypeSummaryLabel(type),
            num: typeNum,
            keywordHint,
          };
        })
        .filter((item): item is { type: KeywordType; label: string; num: number; keywordHint: string } => !!item);
      const totalNum = Number(num) || 0;
      if (typeDetails.length === 0 && totalNum > 0) {
        typeDetails.push({
          type: 'words',
          label: '未分类',
          num: totalNum,
          keywordHint: '',
        });
      }
      return { date, num: totalNum, typeDetails };
    })
    .filter((item) => item.num > 0)
    .sort((a, b) => a.date.localeCompare(b.date));
});

const scheduledDateCount = computed(() => scheduledDateList.value.length);
const totalScheduleOrders = computed(() => Number(taskData.value.orders_number) || 0);
const canEditSchedule = computed(() => totalScheduleOrders.value > 0);
const scheduledOrderCount = computed(() => {
  const values = Object.values(taskData.value.daily_orders_map || {}) as Array<number | undefined>;
  return values.reduce((sum: number, value) => {
    const num = Number(value);
    if (Number.isNaN(num) || num <= 0) return sum;
    return sum + num;
  }, 0);
});
const remainingScheduleOrders = computed(() => {
  const remaining = totalScheduleOrders.value - scheduledOrderCount.value;
  return remaining > 0 ? remaining : 0;
});
const scheduleProgressPercent = computed(() => {
  if (totalScheduleOrders.value <= 0) return 0;
  const percent = (scheduledOrderCount.value / totalScheduleOrders.value) * 100;
  return Number(Math.min(100, Math.max(0, percent)).toFixed(2));
});

const buildDefaultKeywordRows = (): KeywordItem[] => {
  return [{ keyword: '', num: undefined, type: 1 }];
};

type KeywordTemplateOption = { label: string; value: string; planType: KeywordPlanType; disabled?: boolean };

const keywordOptionValueDivider = '::type::';

const buildKeywordOptionValue = (keyword: string, planType: KeywordPlanType): string => {
  return `${keyword}${keywordOptionValueDivider}${planType}`;
};

const parseKeywordOptionValue = (value: string | undefined) => {
  if (!value) return { keyword: '', planType: 1 as KeywordPlanType };
  const splitIndex = value.lastIndexOf(keywordOptionValueDivider);
  if (splitIndex === -1) {
    return { keyword: value, planType: 1 as KeywordPlanType };
  }
  const keyword = value.slice(0, splitIndex);
  const typeRaw = value.slice(splitIndex + keywordOptionValueDivider.length);
  return { keyword, planType: normalizeKeywordPlanType(typeRaw) };
};

const getTypeKeywordSelectValue = (item: KeywordItem): string | undefined => {
  const keyword = typeof item.keyword === 'string' ? item.keyword.trim() : '';
  if (!keyword) return undefined;
  return buildKeywordOptionValue(keyword, normalizeKeywordPlanType(item.type));
};

const keywordTemplateOptions = computed<KeywordTemplateOption[]>(() => {
  const uniqueKeywordMap = new Map<string, KeywordTemplateOption>();
  (taskData.value.keyword_list || []).forEach((rawItem: any) => {
    const item = normalizeKeywordTemplateItem(rawItem);
    const keyword = item.keyword.trim();
    if (!keyword) return;
    const key = buildKeywordOptionValue(keyword, item.type);
    if (!uniqueKeywordMap.has(key)) {
      uniqueKeywordMap.set(key, {
        /*
         * label 只放关键词本身（李运侠 2026-09-03《9.1》3）。
         * 原来拼了「（关键词）」/「（链接）」后缀，下拉选项和选中回显都会带上，
         * 用户明确要求去掉。类型信息仍在 value 里（buildKeywordOptionValue 编码了
         * planType），去重与选中判断不受影响，**不要**为了显示类型再把后缀加回来。
         */
        label: keyword,
        value: key,
        planType: item.type,
      });
    }
  });
  return Array.from(uniqueKeywordMap.values());
});

const getKeywordTemplateOptionsForType = (type: KeywordType, index: number) => {
  const rows = getTypeKeywordRows(type);
  const currentValue = getTypeKeywordSelectValue(rows[index] || { keyword: '', num: undefined, type: 1 });
  const selectedSet = new Set(
    rows
      .map((row, rowIndex) => (rowIndex === index ? '' : (getTypeKeywordSelectValue(row) || '')))
      .filter((optionValue) => optionValue.length > 0)
  );
  return keywordTemplateOptions.value.map((option) => ({
    ...option,
    disabled: selectedSet.has(option.value) && option.value !== currentValue,
  }));
};

const ensureDateDetail = (dateKey: string): ScheduleDateDetail => {
  if (!scheduleDetails.value[dateKey]) {
    scheduleDetails.value[dateKey] = {};
  }
  return scheduleDetails.value[dateKey];
};

const cloneKeywordRows = (rows: KeywordItem[] = []): KeywordItem[] => {
  return rows.map((row) => ({ keyword: row.keyword, num: row.num, type: normalizeKeywordPlanType(row.type) }));
};

const cloneScheduleDateDetail = (detail: ScheduleDateDetail): ScheduleDateDetail => {
  const cloned: ScheduleDateDetail = {};
  keywordTypes.forEach((type) => {
    const source = detail[type];
    if (source) {
      cloned[type] = { keywords: cloneKeywordRows(source.keywords) };
    }
  });
  return cloned;
};

const syncTypeFromPrimaryToSelected = (type: KeywordType) => {
  if (selectedScheduleDateKeys.value.length <= 1) return;
  const primaryKey = selectedScheduleDateKey.value;
  if (!primaryKey) return;
  const primaryDetail = ensureDateDetail(primaryKey);
  const sourceType = primaryDetail[type];
  selectedScheduleDateKeys.value.forEach((dateKey) => {
    if (dateKey === primaryKey) return;
    const detail = ensureDateDetail(dateKey);
    if (sourceType) {
      detail[type] = { keywords: cloneKeywordRows(sourceType.keywords) };
    } else if (detail[type]) {
      delete detail[type];
    }
    recalcDateTotal(dateKey);
  });
};

const recalcDateTotal = (dateKey: string) => {
  const detail = scheduleDetails.value[dateKey];
  if (!detail) {
    delete draftDailyOrdersMap.value[dateKey];
    return;
  }
  let total = 0;
  keywordTypes.forEach((type) => {
    const rows = detail[type]?.keywords || [];
    rows.forEach((row) => {
      const num = Number(row.num);
      if (!Number.isNaN(num) && num > 0) total += num;
    });
  });
  if (total > 0) {
    draftDailyOrdersMap.value[dateKey] = total;
  } else {
    delete draftDailyOrdersMap.value[dateKey];
  }
};

const clearRemovedReviewTypeSchedules = (removedTypes: KeywordType[]) => {
  if (!removedTypes.length) return;

  removedTypes.forEach((type) => {
    taskData.value.comments[type] = { keywords: [], order_date_plans: [] };
    if (activeScheduleType.value === type) {
      activeScheduleType.value = null;
    }
  });

  Object.keys(scheduleDetails.value).forEach((dateKey) => {
    const detail = scheduleDetails.value[dateKey];
    removedTypes.forEach((type) => {
      if (detail?.[type]) {
        delete detail[type];
      }
    });

    const hasRemainingType = keywordTypes.some((type) => !!detail?.[type]);
    if (!hasRemainingType) {
      delete draftDailyOrdersMap.value[dateKey];
      delete taskData.value.daily_orders_map[dateKey];
      delete scheduleDetails.value[dateKey];
      selectedScheduleDateKeys.value = selectedScheduleDateKeys.value.filter((key) => key !== dateKey);
      return;
    }

    recalcDateTotal(dateKey);
    const nextNum = Number(draftDailyOrdersMap.value[dateKey]) || 0;
    if (nextNum > 0) {
      taskData.value.daily_orders_map[dateKey] = nextNum;
    } else {
      delete draftDailyOrdersMap.value[dateKey];
      delete taskData.value.daily_orders_map[dateKey];
      delete scheduleDetails.value[dateKey];
      selectedScheduleDateKeys.value = selectedScheduleDateKeys.value.filter((key) => key !== dateKey);
    }
  });
};

const handleSaveSchedule = () => {
  if (isReadOnly.value) return;
  if (!taskData.value.orders_number || Number(taskData.value.orders_number) <= 0) {
    message.warning('请先填写任务总单量后再保存排期');
    return;
  }
  if (!selectedScheduleDateKeys.value.length) {
    message.warning('请先选择日期');
    return;
  }
  const savingDateKeys = [...selectedScheduleDateKeys.value];
  let hasSaved = false;
  const nextDailyOrdersMap = { ...(taskData.value.daily_orders_map || {}) };
  savingDateKeys.forEach((dateKey) => {
    const detail = scheduleDetails.value[dateKey];
    if (!detail || Object.keys(detail).length === 0) return;
    recalcDateTotal(dateKey);
    const nextNum = Number(draftDailyOrdersMap.value[dateKey]) || 0;
    if (nextNum > 0) {
      nextDailyOrdersMap[dateKey] = nextNum;
      hasSaved = true;
    } else {
      delete nextDailyOrdersMap[dateKey];
      hasSaved = true;
    }
  });
  if (!hasSaved) {
    message.warning('请先填写排期内容');
    return;
  }
  const scheduledValues = Object.values(nextDailyOrdersMap) as Array<number | undefined>;
  const nextTotalScheduled = scheduledValues.reduce((sum: number, value) => {
    const num = Number(value);
    if (Number.isNaN(num) || num <= 0) return sum;
    return sum + num;
  }, 0);
  const maxTotalOrders = Number(taskData.value.orders_number) || 0;
  if (maxTotalOrders > 0 && nextTotalScheduled > maxTotalOrders) {
    message.warning(`已排订单数不能超过任务总订单量（最多 ${maxTotalOrders} 单）`);
    return;
  }
  taskData.value.daily_orders_map = nextDailyOrdersMap;
  syncOrderDatePlansToComments();
  savingDateKeys.forEach((dateKey) => {
    delete draftDailyOrdersMap.value[dateKey];
  });
  emitTaskDataUpdate();
  selectedScheduleDateKeys.value = [];
  message.success('排期已保存');
};

const isDateTypeSelected = (type: KeywordType): boolean => {
  if (!selectedScheduleDateKeys.value.length) return false;
  const detail = scheduleDetails.value[selectedScheduleDateKey.value] || {};
  return !!detail[type];
};

const toggleDateType = (type: KeywordType) => {
  if (isReadOnly.value || !selectedScheduleDateKeys.value.length) return;
  const dateKey = selectedScheduleDateKey.value;
  const detail = ensureDateDetail(dateKey);
  if (detail[type]) {
    delete detail[type];
  } else {
    detail[type] = { keywords: buildDefaultKeywordRows() };
  }
  recalcDateTotal(dateKey);
  syncTypeFromPrimaryToSelected(type);
};

const getTypeKeywordRows = (type: KeywordType): KeywordItem[] => {
  if (!selectedScheduleDateKeys.value.length) return [];
  const dateKey = selectedScheduleDateKey.value;
  const detail = ensureDateDetail(dateKey);
  if (!detail[type]) {
    detail[type] = { keywords: buildDefaultKeywordRows() };
    syncTypeFromPrimaryToSelected(type);
  }
  return detail[type]?.keywords || [];
};

const getTypeTotal = (type: KeywordType): number => {
  const rows = getTypeKeywordRows(type);
  return rows.reduce((sum, row) => {
    const num = Number(row.num);
    if (Number.isNaN(num) || num <= 0) return sum;
    return sum + num;
  }, 0);
};

// 这一组 *ByString 方法是给排期子组件做参数适配的，子组件按 string 调用，这里统一转回业务枚举。
const isDateTypeSelectedByString = (type: string) => isDateTypeSelected(type as KeywordType);
const toggleDateTypeByString = (type: string) => toggleDateType(type as KeywordType);
const getTypeLabelByString = (type: string) => getTypeLabel(type as KeywordType);
const getTypeTotalByString = (type: string) => getTypeTotal(type as KeywordType);
const getTypeKeywordRowsByString = (type: string) => getTypeKeywordRows(type as KeywordType);
const getKeywordTemplateOptionsForTypeByString = (type: string, index: number) =>
  getKeywordTemplateOptionsForType(type as KeywordType, index);
const updateTypeKeywordByString = (type: string, index: number, value: string | undefined) =>
  updateTypeKeyword(type as KeywordType, index, value);
const updateTypeKeywordNumByString = (type: string, index: number, value: number | null) =>
  updateTypeKeywordNum(type as KeywordType, index, value);
const addTypeKeywordRowByString = (type: string) => addTypeKeywordRow(type as KeywordType);
const removeTypeKeywordRowByString = (type: string, index: number) =>
  removeTypeKeywordRow(type as KeywordType, index);

const updateTypeKeyword = (type: KeywordType, index: number, value: string | undefined) => {
  if (!selectedScheduleDateKeys.value.length) return;
  const rows = getTypeKeywordRows(type);
  if (!rows[index]) return;
  const parsed = parseKeywordOptionValue(value);
  rows[index].keyword = parsed.keyword || '';
  rows[index].type = parsed.planType;
  syncTypeFromPrimaryToSelected(type);
};

const updateTypeKeywordNum = (type: KeywordType, index: number, value: number | null) => {
  if (!selectedScheduleDateKeys.value.length) return;
  const rows = getTypeKeywordRows(type);
  if (!rows[index]) return;
  rows[index].num = value === null ? undefined : Number(value);
  recalcDateTotal(selectedScheduleDateKey.value);
  syncTypeFromPrimaryToSelected(type);
};

const addTypeKeywordRow = (type: KeywordType) => {
  if (isReadOnly.value || !selectedScheduleDateKeys.value.length) return;
  const rows = getTypeKeywordRows(type);
  rows.push({ keyword: '', num: undefined, type: 1 });
  syncTypeFromPrimaryToSelected(type);
};

const removeTypeKeywordRow = (type: KeywordType, index: number) => {
  if (isReadOnly.value || !selectedScheduleDateKeys.value.length) return;
  const rows = getTypeKeywordRows(type);
  rows.splice(index, 1);
  if (rows.length === 0) {
    rows.push({ keyword: '', num: undefined, type: 1 });
  }
  recalcDateTotal(selectedScheduleDateKey.value);
  syncTypeFromPrimaryToSelected(type);
};


const normalizeRangeDates = (range: Dayjs[] | undefined) => {
  if (!Array.isArray(range) || range.length === 0) return null;
  const start = dayjs(range[0]).startOf('day');
  const end = dayjs(range[range.length > 1 ? 1 : 0]).startOf('day');
  if (!start.isValid() || !end.isValid()) return null;
  if (end.isBefore(start, 'day')) {
    return { start: end, end: start };
  }
  return { start, end };
};

// 判断是否为节假日
const holidays = ref<Set<string>>(new Set());

// 初始化法定节假日
const initFixedHolidays = (year: number) => {
  const fixedHolidays: string[] = [];

  // 元旦：01月01日 - 01月03日（3天）
  for (let day = 1; day <= 3; day++) {
    fixedHolidays.push(`${year}-01-${String(day).padStart(2, '0')}`);
  }

  // 春节：02月15日 - 02月23日（9天）
  for (let day = 15; day <= 23; day++) {
    fixedHolidays.push(`${year}-02-${String(day).padStart(2, '0')}`);
  }

  // 清明节：04月04日 - 04月06日（3天）
  for (let day = 4; day <= 6; day++) {
    fixedHolidays.push(`${year}-04-${String(day).padStart(2, '0')}`);
  }

  // 劳动节：05月01日 - 05月05日（5天）
  for (let day = 1; day <= 5; day++) {
    fixedHolidays.push(`${year}-05-${String(day).padStart(2, '0')}`);
  }

  // 端午节：06月19日 - 06月21日（3天）
  for (let day = 19; day <= 21; day++) {
    fixedHolidays.push(`${year}-06-${String(day).padStart(2, '0')}`);
  }

  // 中秋节：09月25日 - 09月27日（3天）
  for (let day = 25; day <= 27; day++) {
    fixedHolidays.push(`${year}-09-${String(day).padStart(2, '0')}`);
  }

  // 国庆节：10月01日 - 10月07日（7天）
  for (let day = 1; day <= 7; day++) {
    fixedHolidays.push(`${year}-10-${String(day).padStart(2, '0')}`);
  }

  fixedHolidays.forEach(date => {
    holidays.value.add(date);
  });
};

const isHolidayByDayjs = (_date: Dayjs): boolean => false;

const getFixedRangeDates = () => normalizeRangeDates(taskData.value.order_date_plans);

const fixedRangeDayCount = computed(() => {
  const range = getFixedRangeDates();
  if (!range) return 0;
  let count = 0;
  let current = range.start;
  while (current.isBefore(range.end, 'day') || current.isSame(range.end, 'day')) {
    count += 1;
    current = current.add(1, 'day');
  }
  return count;
});

const isDateSelectedByDayjs = (date: Dayjs): boolean => {
  if (taskData.value.is_erveryday_num === 0) {
    return isRangeStart(date) || isRangeEnd(date);
  }
  const dateKey = getDateKeyByDayjs(date);
  if (selectedScheduleDateKeys.value.includes(dateKey)) {
    return true;
  }
  const value = taskData.value.daily_orders_map[dateKey];
  return value !== undefined && value !== null && value > 0;
};

const isSavedScheduleDate = (dateKey: string): boolean => {
  const value = Number(taskData.value.daily_orders_map?.[dateKey]);
  return !Number.isNaN(value) && value > 0;
};

const isSavedScheduleDateByDayjs = (date: Dayjs): boolean => {
  return isSavedScheduleDate(getDateKeyByDayjs(date));
};

const syncFixedRangeFromOrderPlans = () => {
  const plans = taskData.value.order_date_plans;
  if (!Array.isArray(plans) || plans.length === 0) {
    rangeStart.value = null;
    rangeEnd.value = null;
    return;
  }
  const start = dayjs(plans[0]).startOf('day');
  if (!start.isValid()) {
    rangeStart.value = null;
    rangeEnd.value = null;
    return;
  }
  rangeStart.value = start;
  if (plans.length >= 2) {
    const end = dayjs(plans[1]).startOf('day');
    rangeEnd.value = end.isValid() ? end : null;
  } else {
    rangeEnd.value = null;
  }
};

const isRangeStart = (date: Dayjs): boolean => {
  return !!rangeStart.value && date.isSame(rangeStart.value, 'day');
};

const isRangeEnd = (date: Dayjs): boolean => {
  return !!rangeEnd.value && date.isSame(rangeEnd.value, 'day');
};

const addSelectedScheduleDate = (dateKey: string) => {
  if (selectedScheduleDateKeys.value.includes(dateKey) || isSavedScheduleDate(dateKey)) return;
  if (selectedScheduleDateKeys.value.length === 0) {
    ensureDateDetail(dateKey);
  } else {
    const primaryKey = selectedScheduleDateKeys.value[0];
    const primaryDetail = ensureDateDetail(primaryKey);
    scheduleDetails.value[dateKey] = cloneScheduleDateDetail(primaryDetail);
    recalcDateTotal(dateKey);
  }
  selectedScheduleDateKeys.value.push(dateKey);
};

const handleCalendarSelect = (date: Dayjs) => {
  if (isReadOnly.value) return;
  if (!taskData.value.orders_number || Number(taskData.value.orders_number) <= 0) {
    message.warning('请先填写任务总单量后再选择排期日期');
    return;
  }
  const dateKey = getDateKeyByDayjs(date.startOf('day'));
  if (isSavedScheduleDate(dateKey)) {
    message.warning('该日期已排期，请先点击下方X删除后再重新选择');
    return;
  }
  const existingIndex = selectedScheduleDateKeys.value.indexOf(dateKey);
  if (existingIndex > -1) {
    // 已选择日期再次点击不执行反选，避免误删编辑中的排期
    return;
  }
  addSelectedScheduleDate(dateKey);
};

const handleCalendarRangeSelect = (startDate: Dayjs, endDate: Dayjs) => {
  if (isReadOnly.value || !canEditSchedule.value) return;
  const savedDateKeys = Object.entries(taskData.value.daily_orders_map || {})
    .filter(([, value]) => Number(value) > 0)
    .map(([dateKey]) => dateKey);
  const blockedDateKeys = new Set([
    ...savedDateKeys,
    ...selectedScheduleDateKeys.value,
  ]);
  const dateKeys = getShiftScheduleRangeDateKeys(
    getDateKeyByDayjs(startDate),
    getDateKeyByDayjs(endDate),
    blockedDateKeys,
    dayjs().format('YYYY-MM-DD'),
  );
  dateKeys.forEach(addSelectedScheduleDate);
};

const removeScheduledDate = (dateKey: string) => {
  if (isReadOnly.value) return;
  delete taskData.value.daily_orders_map[dateKey];
  delete draftDailyOrdersMap.value[dateKey];
  delete scheduleDetails.value[dateKey];
  selectedScheduleDateKeys.value = selectedScheduleDateKeys.value.filter((item) => item !== dateKey);
};

const removeSelectedScheduleDate = (dateKey: string) => {
  if (isReadOnly.value) return;
  delete draftDailyOrdersMap.value[dateKey];
  delete scheduleDetails.value[dateKey];
  selectedScheduleDateKeys.value = selectedScheduleDateKeys.value.filter((item) => item !== dateKey);
};

const renderCalendarHeader = ({ value, onChange }: { value: Dayjs; onChange?: (val: Dayjs) => void }) => {
  const year = value.year();
  const month = value.month();
  const yearOptions = Array.from({ length: 11 }, (_, i) => {
    const y = year - 5 + i;
    return { value: y, label: `${y}年` };
  });
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i,
    label: `${i + 1}月`,
  }));
  const SelectComp = resolveComponent('a-select') as any;

  return h(
    'div',
    { class: 'calendar-header-custom' },
    [
      h(SelectComp, {
        value: year,
        size: 'small',
        options: yearOptions,
        disabled: isReadOnly.value,
        style: { width: '96px', marginRight: '8px' },
        onChange: (nextYear: number) => {
          onChange?.(value.year(nextYear));
        },
      }),
      h(SelectComp, {
        value: month,
        size: 'small',
        options: monthOptions,
        disabled: isReadOnly.value,
        style: { width: '80px' },
        onChange: (nextMonth: number) => {
          onChange?.(value.month(nextMonth));
        },
      }),
    ]
  );
};

watch(unifiedSettingEnabled, (enabled) => {
  if (!enabled && taskData.value.is_erveryday_num === 1) {
    rangeStart.value = null;
    rangeEnd.value = null;
  }
});

watch(
  selectedReviewTypes,
  (types, previousTypes = []) => {
    taskData.value.remark_type = types;
    const removedTypes = previousTypes.filter((type) => !types.includes(type));
    clearRemovedReviewTypeSchedules(removedTypes);
  },
  { deep: true }
);

watch(
  canEditSchedule,
  (enabled) => {
    if (enabled) return;
    selectedScheduleDateKeys.value = [];
    draftDailyOrdersMap.value = {};
  }
);

// 日历模式：手动逐日输入也要同步到 comments
watch(
  () => taskData.value.daily_orders_map,
  () => {
    if (taskData.value.is_erveryday_num !== 1) return;
    syncOrderDatePlansToComments();
  },
  { deep: true }
);

watch(
  () => taskData.value.order_date_plans,
  () => {
    if (taskData.value.is_erveryday_num !== 0) return;
    syncFixedRangeFromOrderPlans();
    syncOrderDatePlansToComments();
  },
  { deep: true }
);

watch(
  () => taskData.value.everyday_number,
  () => {
    if (taskData.value.is_erveryday_num !== 0) return;
    syncOrderDatePlansToComments();
  }
);

// 表单验证规则
const formRules = {
  asin: [{ required: true, whitespace: true, message: '请输入ASIN', trigger: 'blur' }],
  brand: [{ required: true, whitespace: true, message: '请输入品牌名称', trigger: 'blur' }],
  shop: [{ required: true, whitespace: true, message: '请输入店铺名称', trigger: 'blur' }],
  category: [{ required: true, message: '请选择类目', trigger: 'change' }],
  star_level: [{ required: true, message: '请输入星级', trigger: 'blur' }],
  score: [{ required: true, message: '请输入评论数量', trigger: 'blur' }],
  country_id: [{ required: true, message: '请选择站点任务', trigger: 'change' }],
  product_price: [{ required: true, message: '请输入产品售价', trigger: 'blur' }],
};

// ASIN 失焦 / 查询：按接口文档回填品牌、分类、图片、星级、评论数量
const handleAsinBlur = async () => {
  const asin = taskData.value.asin?.trim();
  if (!asin) {
    taskData.value.imgurl_big = '';
    return;
  }

  await fetchAsinProduct(asin);
};

const handleAsinQuery = async () => {
  const asin = taskData.value.asin?.trim();
  if (!asin) {
    message.warning('请先输入 ASIN');
    return;
  }

  await fetchAsinProduct(asin);
};

const resolveAsinQueryCountry = (): string => {
  const target = countryOptions.value.find((item) => item.id === taskData.value.country_id);
  return String(target?.country ?? '').trim();
};

/**
 * GET /admin/common/asin_product
 * query: asin, country（后端实测必填；文档标可选）
 * data: brand / category / images / star_rating / review_count
 */
const fetchAsinProduct = async (asin: string) => {
  if (!asin || productImageLoading.value) return;

  const country = resolveAsinQueryCountry();
  if (!country) {
    message.warning('请先选择站点任务');
    return;
  }

  productImageLoading.value = true;
  try {
    const response = await getCommonAsinProduct(asin, country);
    if (response.code !== 200) {
      throw new Error(response.msg || response.message || '获取亚马逊商品信息失败');
    }

    const source = (response.data || {}) as {
      brand?: string;
      category?: string;
      images?: string;
      star_rating?: number;
      review_count?: number;
    };

    if (source.brand !== undefined && source.brand !== null) {
      taskData.value.brand = String(source.brand);
    }
    if (source.category !== undefined && source.category !== null && source.category !== '') {
      taskData.value.category = String(source.category);
    }
    if (source.star_rating !== undefined && source.star_rating !== null) {
      taskData.value.star_level = Number(source.star_rating);
    }
    if (source.review_count !== undefined && source.review_count !== null) {
      taskData.value.score = Number(source.review_count);
    }
    if (source.images) {
      taskData.value.imgurl_big = source.images;
      taskData.value.imgurl = source.images;
    }
  } catch (error: any) {
    console.error('获取亚马逊商品信息失败:', error);
    message.warning(error?.message || '未获取到亚马逊商品信息');
  } finally {
    /*
     * 加载标识要持续到数据真正填进表单（《9.1 创建任务页面修改》11）。
     *
     * 字段是同步写进 taskData 的，但 taskData 有一条
     * 「deep watch → emit('update:data') → 父组件 → props → 回填」的回流链路，
     * 回填完成前界面上看不到值。之前在 finally 里立刻关掉 loading，
     * 用户看到转圈几秒就停、字段还是空的，以为查询失败，过一会值才冒出来。
     * 这里多等一个 tick，让回流走完再关。
     */
    await nextTick();
    productImageLoading.value = false;
  }
};

// 重新加载产品图片
const refreshProductImage = () => {
  if (taskData.value.asin) {
    fetchAsinProduct(taskData.value.asin);
  }
};


// 关键词/链接相关操作（关联到留评选项）

/**
 * 新增前拦重复（《9.1 创建任务页面修改》8）。
 * 同一条关键词/链接重复排期没有意义，且会让后续按关键词配单量时对不上。
 * 空行不算重复——用户可能先加行再填。
 */
const addKeywordItem = () => {
  const list = taskData.value.keyword_list || [];
  const seen = new Set(
    list.map((item: any) => String(item?.keyword || '').trim()).filter(Boolean),
  );
  const duplicated = list.some((item: any) => {
    const text = String(item?.keyword || '').trim();
    return text && seen.has(text) && list.filter(
      (row: any) => String(row?.keyword || '').trim() === text,
    ).length > 1;
  });
  if (duplicated) {
    message.warning('该关键词/链接已添加');
    return;
  }
  list.push({ keyword: '', type: 1 });
};

/** 关键词失焦时校验重复，重复则清空并提示（《9.1》8） */
const validateKeywordDuplicate = (index: number) => {
  const list = taskData.value.keyword_list || [];
  const current = String(list[index]?.keyword || '').trim();
  if (!current) return;
  const firstIndex = list.findIndex(
    (item: any) => String(item?.keyword || '').trim() === current,
  );
  if (firstIndex !== -1 && firstIndex !== index) {
    message.warning('该关键词/链接已添加');
    list[index].keyword = '';
  }
};

const removeKeywordItem = (index: number) => {
  taskData.value.keyword_list.splice(index, 1);
};

const activeScheduleType = ref<KeywordType | null>(null);

// 变体相关操作
const addVariant = () => {
  taskData.value.variants.push('');
};

const removeVariant = (index: number) => {
  taskData.value.variants.splice(index, 1);
};

/*
 * 处理变体类型变化。
 *
 * 只有「指定(多)变体」（2）才有变体输入框（见 RelationSettingsPanel 的
 * `v-if="taskData.variants_type === 2"`），所以该保留 `variants` 的是 2、
 * 该清空的是 0 和 1。
 *
 * 原条件写的是 `!== 1`，正好反了：选「变体随意」会把变体留着，选「指定(多)变体」
 * 反而当场清空。后果是 `more_variant` 因为没有内容而不下发，但 `variant_mode: 2`
 * 照传，后端收到「指定多变体」却拿不到变体内容。
 */
const handleVariantTypeChange = () => {
  if (taskData.value.variants_type !== 2) {
    taskData.value.variants = [''];
  }
};

// 关联店铺相关操作
const addRelatedShop = () => {
  taskData.value.related_shops.push('');
};

const removeRelatedShop = (index: number) => {
  taskData.value.related_shops.splice(index, 1);
};

// 处理任务关联变化
const handleTaskRelationChange = () => {
  taskData.value.task_relation = normalizeTaskRelation(taskData.value.task_relation);
  if (taskData.value.task_relation !== 3) {
    taskData.value.related_shops = [''];
  }
};

const buildOrderDatePlans = (): OrderDatePlanItem[] | OrderDatePlanFixed => {
  if (taskData.value.is_erveryday_num === 0) {
    const num = typeof taskData.value.everyday_number === 'number'
      ? taskData.value.everyday_number
      : undefined;
    const range = getFixedRangeDates();
    if (range) {
      const plans: OrderDatePlanItem[] = [];
      let current = range.start;
      while (current.isBefore(range.end, 'day') || current.isSame(range.end, 'day')) {
        if (!isHolidayByDayjs(current)) {
          plans.push({ date: getDateKeyByDayjs(current), order_num: num });
        }
        current = current.add(1, 'day');
      }
      return plans;
    }
    return { everday_orders_num: num };
  }

  const plans: OrderDatePlanItem[] = [];
  Object.entries(taskData.value.daily_orders_map || {}).forEach(([date, value]) => {
    if (value === undefined || value === null) return;
    const num = Number(value);
    if (Number.isNaN(num)) return;
    plans.push({ date, order_num: num });
  });
  return plans;
};

const getKeywordTotalByType = (type: KeywordType): number => {
  return taskData.value.comments[type].keywords.reduce((total: number, item: KeywordItem) => {
    if (typeof item.num !== 'number' || item.num <= 0) return total;
    return total + item.num;
  }, 0);
};

const getMaxAllowedOrders = (type: KeywordType): number | undefined => {
  const total = getKeywordTotalByType(type);
  return total > 0 ? total : undefined;
};

const overLimitWarned = ref(false);

const capDailyOrdersMap = (maxAllowed: number) => {
  const entries = Object.entries(taskData.value.daily_orders_map || {})
    .map(([date, value]) => ({ date, value: Number(value) }))
    .filter((item) => !Number.isNaN(item.value) && item.value > 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  let remaining = maxAllowed;
  const nextMap: Record<string, number> = {};
  entries.forEach(({ date, value }) => {
    if (remaining <= 0) return;
    const useNum = Math.min(value, remaining);
    if (useNum > 0) {
      nextMap[date] = useNum;
      remaining -= useNum;
    }
  });

  taskData.value.daily_orders_map = nextMap;
};

const capFixedRangeByMaxAllowed = (maxAllowed: number) => {
  const range = getFixedRangeDates();
  const perDay = typeof taskData.value.everyday_number === 'number'
    ? taskData.value.everyday_number
    : undefined;
  if (!range || !perDay || perDay <= 0) return;
  const maxDays = Math.floor(maxAllowed / perDay);
  if (maxDays <= 0) {
    taskData.value.order_date_plans = [];
    rangeStart.value = null;
    rangeEnd.value = null;
    return;
  }
  let counted = 0;
  let current = range.start;
  let lastValid = range.start;
  while (current.isBefore(range.end, 'day') || current.isSame(range.end, 'day')) {
    if (!isHolidayByDayjs(current)) {
      counted += 1;
      if (counted === maxDays) {
        lastValid = current;
        break;
      }
      lastValid = current;
    }
    current = current.add(1, 'day');
  }
  taskData.value.order_date_plans = [range.start, lastValid];
  rangeStart.value = range.start;
  rangeEnd.value = lastValid;
};

const cloneOrderDatePlans = (plans: OrderDatePlanItem[] | OrderDatePlanFixed) => {
  if (Array.isArray(plans)) {
    return plans.map((item) => ({ ...item }));
  }
  return { ...plans };
};

const syncOrderDatePlansToComments = () => {
  if (!activeScheduleType.value) return;
  const currentType = activeScheduleType.value;
  if (taskData.value.is_erveryday_num === 1) {
    const maxAllowed = getMaxAllowedOrders(currentType);
    if (typeof maxAllowed === 'number') {
      const totalPlanned = (Object.values(taskData.value.daily_orders_map || {}) as Array<number | undefined>)
        .reduce((sum: number, value) => {
          const num = Number(value);
          if (Number.isNaN(num) || num <= 0) return sum;
          return sum + num;
        }, 0);
      if (totalPlanned > maxAllowed) {
        if (!overLimitWarned.value) {
          message.warning(`周期安排总单量不能超过 ${maxAllowed} 单`);
          overLimitWarned.value = true;
        }
        capDailyOrdersMap(maxAllowed);
      } else {
        overLimitWarned.value = false;
      }
    }
  }
  if (taskData.value.is_erveryday_num === 0) {
    const maxAllowed = getMaxAllowedOrders(currentType);
    const perDay = typeof taskData.value.everyday_number === 'number'
      ? taskData.value.everyday_number
      : undefined;
    if (typeof maxAllowed === 'number' && perDay && perDay > 0) {
      const totalPlanned = fixedRangeDayCount.value * perDay;
      if (totalPlanned > maxAllowed) {
        if (!overLimitWarned.value) {
          message.warning(`周期安排总单量不能超过 ${maxAllowed} 单`);
          overLimitWarned.value = true;
        }
        capFixedRangeByMaxAllowed(maxAllowed);
      } else {
        overLimitWarned.value = false;
      }
    }
  }
  const orderDatePlans = buildOrderDatePlans();
  taskData.value.comments[currentType].order_date_plans = cloneOrderDatePlans(orderDatePlans);
};

// 处理接单汇率变化
const handleExchangeRateChange = () => {
  // 接单汇率变化时的处理逻辑（如需要可在此添加）
};

const handleLevelChange = () => {
  const defaults = getCountryCommissionDefaults(taskData.value.country_id);
  syncCommissionsFromCountry(
    taskData.value.country_id,
    !!defaults && defaults !== OTHER_SITE_COMMISSION_DEFAULTS,
  );
};

const currentProductPrice = computed(() => Number(taskData.value.product_price) || 0);
const currentRate = computed(() => Number(taskData.value.rate) || 0);
const currentOrders = computed(() => Number(taskData.value.orders_number) || 0);
const currentCashBuyRate = computed(() =>
  countryOptions.value.find(item => String(item.id) === String(taskData.value.country_id))?.exchange_rate
);

const scheduledTypeOrderTotals = computed<Record<KeywordType, number>>(() => {
  const totals: Record<KeywordType, number> = {
    free_review: 0,
    feedback: 0,
    words: 0,
    video: 0,
    image: 0,
  };
  Object.keys(taskData.value.daily_orders_map || {}).forEach((dateKey) => {
    const detail = scheduleDetails.value[dateKey];
    if (!detail) return;
    keywordTypes.forEach((type) => {
      const rows = detail[type]?.keywords || [];
      rows.forEach((row) => {
        const num = Number(row.num);
        if (!Number.isNaN(num) && num > 0) {
          totals[type] += num;
        }
      });
    });
  });
  return totals;
});

const serviceCommissionSubtotal = computed(() => {
  return (
    scheduledTypeOrderTotals.value.free_review * (Number(taskData.value.ranking_commission) || 0) +
    scheduledTypeOrderTotals.value.feedback * (Number(taskData.value.feedback_commission) || 0) +
    scheduledTypeOrderTotals.value.words * (Number(taskData.value.words_commission) || 0) +
    scheduledTypeOrderTotals.value.video * (Number(taskData.value.video_commission) || 0) +
    scheduledTypeOrderTotals.value.image * (Number(taskData.value.pic_commission) || 0)
  );
});
/** 佣金明细：各类型的单价与单量，供汇总卡片展开成「68(文字评)×2」 */
const commissionBreakdown = computed(() => ([
  { type: 'free_review' as const, unit: Number(taskData.value.ranking_commission) || 0, quantity: scheduledTypeOrderTotals.value.free_review },
  { type: 'feedback' as const, unit: Number(taskData.value.feedback_commission) || 0, quantity: scheduledTypeOrderTotals.value.feedback },
  { type: 'words' as const, unit: Number(taskData.value.words_commission) || 0, quantity: scheduledTypeOrderTotals.value.words },
  { type: 'video' as const, unit: Number(taskData.value.video_commission) || 0, quantity: scheduledTypeOrderTotals.value.video },
  { type: 'image' as const, unit: Number(taskData.value.pic_commission) || 0, quantity: scheduledTypeOrderTotals.value.image },
]));

const rankingCommissionSubtotal = computed(
  () => scheduledTypeOrderTotals.value.free_review * (Number(taskData.value.ranking_commission) || 0)
);
const wordsCommissionSubtotal = computed(
  () => scheduledTypeOrderTotals.value.words * (Number(taskData.value.words_commission) || 0)
);
const picCommissionSubtotal = computed(
  () => scheduledTypeOrderTotals.value.image * (Number(taskData.value.pic_commission) || 0)
);
const videoCommissionSubtotal = computed(
  () => scheduledTypeOrderTotals.value.video * (Number(taskData.value.video_commission) || 0)
);
const feedbackCommissionSubtotal = computed(
  () => scheduledTypeOrderTotals.value.feedback * (Number(taskData.value.feedback_commission) || 0)
);

const productReturnSubtotal = computed(
  () => currentProductPrice.value * currentRate.value * currentOrders.value
);
const commissionSubtotal = computed(() => serviceCommissionSubtotal.value);
const extraCustomerUsdAmount = computed(() => Number(taskData.value.extra_customer_commission) || 0);
const extraCustomerQuantity = computed(() => {
  const quantity = Number(taskData.value.extra_customer_num);
  return quantity > 0 ? quantity : 0;
});
const extraCustomerCommission = computed(
  () => extraCustomerUsdAmount.value * currentRate.value * extraCustomerQuantity.value
);
const additionalServiceCommission = computed(
  () => Number(taskData.value.additional_service_commission) || 0
);
const totalAmountRmb = computed(
  () =>
    productReturnSubtotal.value +
    commissionSubtotal.value +
    extraCustomerCommission.value +
    additionalServiceCommission.value
);

// 格式化汇率
/**
 * 接单汇率展示：最多两位小数，且**去掉末尾多余的 0**
 * （《9.1 创建任务页面修改》9：5.10 显示 5.1，5.00 显示 5）。
 */
const formatExchangeRate = (value: number | string | undefined) => {
  if (!value && value !== 0) return '';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '';
  return String(Number(num.toFixed(2)));
};

const parseExchangeRate = (value: string) => {
  const num = parseFloat(value);
  if (isNaN(num)) return undefined;
  const str = num.toFixed(3);
  return parseFloat(str.slice(0, -1));
};


// 备注搜索
const handleRemarkSearch = (value: string) => {
  remarkOptions.value = [
    { value: '备注1', label: '备注1' },
    { value: '备注2', label: '备注2' },
    { value: '备注3', label: '备注3' },
  ].filter((item) => item.value.includes(value));
};


// 监听留评选项开关
keywordTypes.forEach((type) => {
  watch(
    () => taskData.value.review_options[type],
    (checked) => {
      if (checked) {
        if (!taskData.value.comments[type].keywords.length) {
          taskData.value.comments[type].keywords.push({ keyword: '', num: undefined });
        }
      } else {
        clearRemovedReviewTypeSchedules([type]);
      }
    }
  );
});

watch(
  totalAmountRmb,
  (value) => {
    const normalized = value > 0 ? Number(value.toFixed(2)) : undefined;
    if (taskData.value.amount !== normalized) {
      taskData.value.amount = normalized;
    }
  },
  { immediate: true }
);

const getKeywordTemplateList = (): KeywordTemplateItem[] => {
  // 提交时保持模板结构（keyword + type）原样上送
  return (taskData.value.keyword_list || []).map((rawItem: any) => normalizeKeywordTemplateItem(rawItem));
};

const buildOrdersDatePlansPayload = () => {
  // 提交组装入口：把前端编辑态 scheduleDetails 还原成后端 orders_date_plans 结构
  const payload: Record<string, any> = {};
  Object.entries(scheduleDetails.value || {}).forEach(([dateKey, detail]) => {
    const datePayload: Record<string, any> = {};
    keywordTypes.forEach((type) => {
      const rows = detail?.[type]?.keywords || [];
      if (!rows.length) return;
      const keywordPlans = rows
        .map((row) => {
          const keyword = (row.keyword || '').trim();
          const rawOrderNum = row.num;
          const value = rawOrderNum === 0 || rawOrderNum ? Number(rawOrderNum) : 0;
          const orderNum = Number.isNaN(value) || value < 0 ? 0 : value;
          return {
            keyword,
            num: orderNum,
            type: normalizeKeywordPlanType(row.type),
          };
        })
        .filter((plan) => plan.keyword.length > 0 || plan.num > 0);
      if (!keywordPlans.length) return;
      // 每个类型需要汇总当天总单量（关键词明细 num 汇总）
      const total = keywordPlans.reduce((sum, item) => sum + (Number(item.num) || 0), 0);
      datePayload[type] = {
        order_num: total,
        keyword_plans: keywordPlans,
      };
    });
    if (Object.keys(datePayload).length > 0) {
      payload[dateKey] = datePayload;
    }
  });
  return payload;
};

const emitTaskDataUpdate = () => {
  if (syncingFromProps.value) return;
  const keywordTemplateList = getKeywordTemplateList();
  const ordersDatePlans = buildOrdersDatePlansPayload();
  const latestAmount =
    totalAmountRmb.value > 0 ? Number(totalAmountRmb.value.toFixed(2)) : undefined;

  emit('update:data', {
    ...taskData.value,
    country_name: countryOptions.value.find(item => String(item.id) === String(taskData.value.country_id))?.country || '',
    amount: latestAmount,
    keyword_list: keywordTemplateList,
    orders_date_plans: ordersDatePlans,
  });
};

// 监听数据变化，向父组件传递
watch(
  taskData,
  () => {
    emitTaskDataUpdate();
  },
  { deep: true }
);

// 组件挂载时初始化
onMounted(() => {
  initFixedHolidays(currentYear.value);
  if (nextYear.value !== currentYear.value) {
    initFixedHolidays(nextYear.value);
  }
  syncCommissionsFromCountry(taskData.value.country_id, !hasCommissionValues(props.initialData));
  // 凭证需求已改为 is_send_msg，无需初始化
});

// defineExpose 是给父页面调用的公开能力，比如校验、重置、取排期 payload。
defineExpose({
  formRef,
  taskData,
  getOrdersDatePlansPayload: () => buildOrdersDatePlansPayload(),
  getKeywordTemplateList: () => getKeywordTemplateList(),
  validate: () => formRef.value?.validate(),
  resetFields: () => formRef.value?.resetFields(),
});
</script>

<style >
@charset "UTF-8";
.create-task-form .evaluation-form {
  min-width: 0;
  overflow-x: hidden;
  /*
   * 表单 label 一律左对齐（李运侠 2026-09-03，对应《9.1 创建任务页面修改》2「字段整体起始点对齐」）。
   *
   * antd 水平表单默认 label **右对齐**：右边缘齐、左边缘就随字数浮动。
   * 于是同一列里「额外买手佣金：」(7字) 比「测评等级：」(5字) 左出约两个字宽，
   * 一条竖线拉下来完全对不上——这正是用户截图里的现象。
   * **调 label-col 的 span 解决不了**：那调的是右边缘位置，不同字数的左边缘照样错开。
   * 改成左对齐后，所有 label 都从各自 a-col 的内容左边界起排；各 panel 统一是
   * `a-row :gutter="24"`（a-col 左内边距 12px），所以首列 label 会落在同一条竖线上。
   *
   * 「收费设置」里的接单汇率等是 `.commission-inline-item` 芯片（1px 边框 + 10px 内距，
   * 文字起点 11px），与表单 label 的 12px 相差 1px，观感上同样在这条线上。
   */
  /* 本 <style> 块没有 scoped，这里**不能用 `:deep()`**：非 scoped 块不会编译它，
     会原样输出成无效选择器、整条规则被丢弃。直接写普通后代选择器。 */
}
.create-task-form .evaluation-form .ant-form-item-label {
  text-align: left;
}
.create-task-form .evaluation-form .ant-form-item-label > label {
  justify-content: flex-start;
}
.create-task-form .evaluation-form .form-title {
  position: relative;
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  padding-left: 11px;
  font-size: 16px;
  font-weight: 600;
  color: var(--ant-color-text, rgba(0, 0, 0, 0.85));
}
.create-task-form .evaluation-form .form-title::before {
  position: absolute;
  top: 50%;
  left: 0;
  width: 3px;
  height: 18px;
  background-color: #1677ff;
  border-radius: 2px;
  content: "";
  transform: translateY(-50%);
}
.create-task-form .evaluation-form .form-item {
  margin-bottom: 24px;
}
.create-task-form .evaluation-form .form-item .ant-form-item-label {
  font-weight: 500;
  color: var(--ant-color-text, rgba(0, 0, 0, 0.85));
  transition: color 0.3s;
}
.create-task-form .evaluation-form .remark-daily-orders-form-item .ant-form-item-label {
  pointer-events: none;
  cursor: default;
}
.create-task-form .evaluation-form .commission-form-item .ant-form-item-label {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}
.create-task-form .product-image-wrapper {
  width: 100%;
}
.create-task-form .product-image-wrapper .image-loading {
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
.create-task-form .product-image-wrapper .image-loading .loading-text {
  margin-top: 16px;
  color: var(--ant-color-text-secondary, rgba(0, 0, 0, 0.65));
  font-size: 14px;
  transition: color 0.3s;
}
.create-task-form .product-image-wrapper .product-image-container {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 12px;
}
.create-task-form .product-image-wrapper .product-image-container .product-image {
  max-width: 300px;
  max-height: 300px;
  border-radius: 6px;
  border: 1px solid var(--ant-color-border, #e8e8e8);
  transition: border-color 0.3s;
}
.create-task-form .product-image-wrapper .product-image-container .product-image .ant-image-img {
  object-fit: contain;
}
.create-task-form .product-image-wrapper .product-image-container .refresh-image-btn {
  padding: 0;
}
.create-task-form .product-image-wrapper .image-placeholder {
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
.create-task-form .product-image-wrapper .image-placeholder .placeholder-icon {
  font-size: 48px;
  margin-bottom: 12px;
  opacity: 0.5;
}
.create-task-form .product-image-wrapper .image-placeholder .placeholder-text {
  color: var(--ant-color-text-tertiary, rgba(0, 0, 0, 0.45));
  font-size: 14px;
  transition: color 0.3s;
}
.create-task-form .full-width {
  width: 100%;
}
.create-task-form .dynamic-field-container {
  width: 100%;
}
.create-task-form .dynamic-field-container .dynamic-field-box {
  padding: 20px;
  background: var(--ant-color-bg-container);
  border: 1px solid var(--ant-color-border, #e8e8e8);
  border-radius: 8px;
  transition: all 0.3s;
}
.create-task-form .dynamic-field-container .dynamic-field-box:hover {
  border-color: var(--ant-color-border, #d9d9d9);
  box-shadow: var(--ant-box-shadow-secondary, 0 2px 8px rgba(0, 0, 0, 0.06));
}
.create-task-form .dynamic-field-container .item-content {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.create-task-form .multi-input-item {
  width: 100%;
  margin-bottom: 8px;
  background: var(--ant-color-bg-container);
  border-radius: 6px;
  transition: all 0.3s;
}
.create-task-form .multi-input-item:last-of-type {
  margin-bottom: 0;
}
.create-task-form .multi-input-item .input-item {
  flex: 1;
  min-width: 200px;
}
.create-task-form .multi-input-item .remove-btn {
  flex-shrink: 0;
}
.create-task-form .multi-input-item .remove-btn-placeholder {
  flex-shrink: 0;
  width: 60px;
  height: 32px;
}
.create-task-form .add-btn {
  margin-top: 12px;
  display: flex;
  align-items: center;
}
.create-task-form .keyword-item {
  width: 100%;
  margin-bottom: 8px;
  background: var(--ant-color-bg-container);
  border-radius: 6px;
  transition: all 0.3s;
}
.create-task-form .keyword-item .keyword-input {
  flex: 1;
  min-width: 200px;
}
.create-task-form .keyword-item .separator {
  color: var(--ant-color-text-tertiary, rgba(0, 0, 0, 0.45));
  font-weight: 500;
  flex-shrink: 0;
  transition: color 0.3s;
}
.create-task-form .keyword-item .number-input {
  width: 120px;
  flex-shrink: 0;
}
.create-task-form .keyword-item .unit {
  color: var(--ant-color-text-secondary, rgba(0, 0, 0, 0.65));
  font-size: 14px;
  min-width: 24px;
  flex-shrink: 0;
  transition: color 0.3s;
}
.create-task-form .keyword-item .image-upload-wrapper {
  cursor: pointer;
  flex-shrink: 0;
}
.create-task-form .keyword-item .image-upload-wrapper .keyword-image {
  width: 32px;
  height: 32px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid var(--ant-color-border, #d9d9d9);
  transition: all 0.3s;
}
.create-task-form .keyword-item .image-upload-wrapper .keyword-image:hover {
  border-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
}
.create-task-form .keyword-item .remove-btn {
  flex-shrink: 0;
}
.create-task-form .keyword-item .remove-btn-placeholder {
  flex-shrink: 0;
  width: 60px;
  height: 32px;
}
.create-task-form .authority-link-item {
  width: 100%;
  margin-bottom: 8px;
  background: var(--ant-color-bg-container);
  border-radius: 6px;
  transition: all 0.3s;
}
.create-task-form .authority-link-item .link-input {
  flex: 1;
  min-width: 200px;
}
.create-task-form .authority-link-item .separator {
  color: var(--ant-color-text-tertiary, rgba(0, 0, 0, 0.45));
  font-weight: 500;
  flex-shrink: 0;
  transition: color 0.3s;
}
.create-task-form .authority-link-item .number-input {
  width: 120px;
  flex-shrink: 0;
}
.create-task-form .authority-link-item .unit {
  color: var(--ant-color-text-secondary, rgba(0, 0, 0, 0.65));
  font-size: 14px;
  min-width: 24px;
  flex-shrink: 0;
  transition: color 0.3s;
}
.create-task-form .authority-link-item .remove-btn {
  flex-shrink: 0;
}
.create-task-form .authority-link-item .remove-btn-placeholder {
  flex-shrink: 0;
  width: 60px;
  height: 32px;
}
.create-task-form .review-options {
  display: flex;
  flex-direction: column;
  gap: 20px;
  border-radius: 6px;
  transition: background-color 0.3s;
}
.create-task-form .review-options .review-option-wrapper {
  padding: 12px;
  border: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  border-radius: 6px;
  background: var(--ant-color-bg-container, #fff);
  transition: all 0.3s;
}
.create-task-form .review-options .review-option-wrapper:hover {
  border-color: var(--ant-color-border, #d9d9d9);
  box-shadow: var(--ant-box-shadow-secondary, 0 2px 8px rgba(0, 0, 0, 0.06));
}
.create-task-form .review-options .review-option-wrapper .review-option-header {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.create-task-form .review-options .review-option-wrapper .review-option-header .review-option-label {
  font-weight: 600;
  color: var(--ant-color-text, rgba(0, 0, 0, 0.85));
}
.create-task-form .review-options .review-option-wrapper .review-option-header .review-option-content {
  width: 100%;
  margin-top: 8px;
}
.create-task-form .review-options .review-option-wrapper .review-option-header .review-option-content .review-option-rows {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}
.create-task-form .review-options .review-option-wrapper .review-option-header .review-option-content .review-option-rows .review-option-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  background: var(--ant-color-bg-container, #fff);
  border: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  border-radius: 4px;
  transition: all 0.3s;
}
.create-task-form .review-options .review-option-wrapper .review-option-header .review-option-content .review-option-rows .review-option-row:hover {
  border-color: var(--ant-color-border, #d9d9d9);
}
.create-task-form .review-options .review-option-wrapper .review-option-header .review-option-content .review-option-rows .review-option-row .required-field {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 1;
}
.create-task-form .review-options .review-option-wrapper .review-option-header .review-option-content .review-option-rows .review-option-row .compact-field {
  flex: 0 0 auto;
}
.create-task-form .required-asterisk {
  color: #ff4d4f;
  font-size: 14px;
  line-height: 1;
}
.create-task-form .keyword-template-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  margin-bottom: 12px;
  border: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  border-radius: 4px;
  transition: all 0.3s;
}
.create-task-form .keyword-template-row .keyword-template-asterisk {
  flex: 0 0 16px;
  text-align: center;
}
.create-task-form .keyword-template-row .keyword-template-input {
  flex: 1;
  min-width: 0;
}
.create-task-form .keyword-template-row .keyword-template-type {
  flex: 0 0 auto;
}
.create-task-form .keyword-template-row .keyword-template-action {
  display: flex;
  justify-content: flex-end;
  flex: 0 0 48px;
}
.create-task-form .keyword-template-scroll {
  max-height: 220px;
  overflow-y: auto;
  margin: 8px 0 12px;
  padding-right: 4px;
}
.create-task-form .panel-header-title {
  font-weight: 600;
}
.create-task-form .panel-header-desc {
  margin-left: 8px;
  font-size: 14px;
  font-weight: 400;
}
.create-task-form .task-form-sections {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}
.create-task-form .task-form-section {
  min-width: 0;
  border-radius: 10px;
  background: var(--ant-color-bg-container, #fff);
}
.create-task-form .task-form-section-title {
  margin-bottom: 16px;
  font-size: 15px;
  font-weight: 600;
  color: var(--ant-color-text, rgba(0, 0, 0, 0.85));
}
.create-task-form .commission-inline-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.create-task-form .commission-inline-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  border-radius: 4px;
}
.create-task-form .commission-summary {
  margin-top: 12px;
  padding: 12px;
  border: 1px solid var(--ant-color-border-secondary, var(--ant-color-border, #d9d9d9));
  border-radius: 6px;
}
.create-task-form .commission-summary .commission-summary-title {
  margin-bottom: 6px;
  font-weight: 600;
}
.create-task-form .commission-summary .commission-summary-line {
  margin-bottom: 4px;
  font-size: 13px;
}
.create-task-form .commission-summary .amount-value {
  font-weight: 600;
  color: #1677ff;
}
.create-task-form .commission-summary .foreign-amount {
  font-weight: 600;
  color: #13c2c2;
}
.create-task-form .commission-summary .total-line {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed var(--ant-color-border-secondary, #f0f0f0);
}
.create-task-form .commission-summary .amount-total {
  font-weight: 700;
  color: #f5222d;
}
.create-task-form .commission-group {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  padding: 16px;
  border-radius: 6px;
  transition: background-color 0.3s;
}
.create-task-form .commission-group .commission-item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
}
.create-task-form .commission-group .commission-item .commission-label {
  font-weight: 500;
  min-width: 40px;
  transition: color 0.3s;
}
.create-task-form .commission-group .commission-item .commission-input {
  width: 120px;
}
.create-task-form .voucher-checkboxes {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.create-task-form .calendar-header-custom {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 8px;
}
.create-task-form .calendar-panel-content {
  width: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  /*
   * 三个统计块与进度条并排（李运侠 2026-09-06）。
   *
   * 原来是 `0.3fr 0.7fr`：统计区只分到 30% 宽，而三块各 min-width 110px 加两个 20px 间隙
   * 至少要 370px，装不下就换行，表现为「剩余未排数」被挤到第二行。
   * 改成 `max-content` 让统计区按自身内容取宽、绝不换行，进度条吃掉剩下的空间
   * （即需求里说的「把排期进度调缩短腾出空间」），并给它留 160px 下限。
   */
}
.create-task-form .calendar-panel-content .schedule-overview {
  display: grid;
  grid-template-columns: max-content minmax(160px, 1fr);
  gap: 16px;
  margin-bottom: 12px;
  padding: 10px 12px;
  border: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  border-radius: 6px;
}
.create-task-form .calendar-panel-content .schedule-overview-stats {
  display: flex;
  gap: 20px;
  /* 配合上面的 max-content 列宽：三块必须始终在同一行（李运侠 2026-09-06） */
  flex-wrap: nowrap;
}
.create-task-form .calendar-panel-content .schedule-overview-item {
  min-width: 110px;
}
.create-task-form .calendar-panel-content .schedule-overview-label {
  font-size: 14px;
  margin-bottom: 4px;
}
.create-task-form .calendar-panel-content .schedule-overview-value {
  font-size: 18px;
  font-weight: 600;
  line-height: 1;
}
.create-task-form .calendar-panel-content .schedule-overview-progress {
  display: flex;
  align-items: center;
}
.create-task-form .calendar-panel-content .calendar-layout {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  gap: 16px;
}
.create-task-form .calendar-panel-content .calendar-right {
  border-left: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  padding-left: 16px;
}
.create-task-form .calendar-panel-content .schedule-detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 13px;
  font-weight: 600;
}
.create-task-form .calendar-panel-content .schedule-detail-header-right {
  display: flex;
  align-items: center;
  gap: 6px;
}
.create-task-form .calendar-panel-content .selected-date-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
.create-task-form .calendar-panel-content .selected-date-item {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 0 2px 0 6px;
  border: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  border-radius: 4px;
  font-weight: 400;
}
.create-task-form .calendar-panel-content .selected-date-remove {
  min-width: 18px;
  height: 18px;
  line-height: 18px;
  padding: 0;
}
.create-task-form .calendar-panel-content .schedule-type-selector {
  margin-bottom: 12px;
}
.create-task-form .calendar-panel-content .schedule-type-selector .selector-label {
  margin-bottom: 8px;
  font-size: 14px;
}
.create-task-form .calendar-panel-content .schedule-type-selector .selector-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.create-task-form .calendar-panel-content .type-detail-block {
  padding: 10px;
  margin-bottom: 12px;
  border: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  border-radius: 6px;
}
.create-task-form .calendar-panel-content .type-detail-title {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  font-weight: 600;
  font-size: 13px;
}
.create-task-form .calendar-panel-content .type-keyword-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 96px 32px;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.create-task-form .calendar-panel-content .schedule-detail-placeholder {
  font-size: 13px;
  padding-top: 12px;
}
.create-task-form .calendar-panel-content .calendar-header {
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  transition: border-color 0.3s;
}
.create-task-form .calendar-panel-content .calendar-header .guide-text {
  font-size: 13px;
  line-height: 1.6;
  transition: color 0.3s;
}
.create-task-form .calendar-panel-content .calendar-header .range-tip {
  margin-top: 8px;
  font-size: 14px;
}
.create-task-form .calendar-panel-content .ant-picker-calendar {
  background: transparent;
}
.create-task-form .calendar-panel-content .ant-picker-panel {
  background: transparent;
}
.create-task-form .calendar-panel-content .ant-picker-calendar-date-content {
  height: auto;
}
.create-task-form .calendar-panel-content .calendar-cell {
  min-height: 32px;
  padding: 4px;
  border-radius: 4px;
  transition: background-color 0.2s, border-color 0.2s;
}
.create-task-form .calendar-panel-content .calendar-cell .day-number {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
}
.create-task-form .calendar-panel-content .calendar-cell .day-orders {
  font-size: 14px;
  color: var(--ant-color-primary, #1677ff);
  font-weight: 600;
}
.create-task-form .calendar-panel-content .calendar-cell .holiday-text {
  font-size: 11px;
}
.create-task-form .calendar-panel-content .calendar-cell.is-holiday {
  background: var(--ant-color-bg-container);
  cursor: not-allowed;
}
.create-task-form .calendar-panel-content .calendar-cell {
  /* 早于今天的日期置灰不可点（李运侠 2026-09-06）。
     禁选由 a-calendar 的 disabled-date 负责，这里只管观感；
     cursor 要写在 cell 上，antd 的禁用样式打在外层 .ant-picker-cell 上，
     自定义 dateFullCellRender 之后它管不到我们这层内容。 */
}
.create-task-form .calendar-panel-content .calendar-cell.is-past {
  cursor: not-allowed;
  opacity: 0.45;
}
.create-task-form .calendar-panel-content .calendar-cell.is-past .day-number,
.create-task-form .calendar-panel-content .calendar-cell.is-past .day-orders {
  color: var(--ant-color-text-disabled, rgba(0, 0, 0, 0.25));
}
.create-task-form .calendar-panel-content .calendar-cell.is-selected {
  box-shadow: inset 0 0 0 1px var(--ant-color-primary, #1890ff);
}
.create-task-form .calendar-panel-content .calendar-cell.unified-mode {
  cursor: pointer;
}
.create-task-form .calendar-panel-content .calendar-cell.is-range-start, .create-task-form .calendar-panel-content .calendar-cell.is-range-end {
  box-shadow: inset 0 0 0 1px var(--ant-color-primary, #1890ff);
}
.create-task-form .calendar-panel-content .ant-picker-calendar-date-value {
  display: none;
}
.create-task-form .calendar-panel-content .ant-picker-cell-selected .ant-picker-calendar-date,
.create-task-form .calendar-panel-content .ant-picker-cell-today .ant-picker-calendar-date {
  background: transparent;
  box-shadow: none;
}
.create-task-form .calendar-panel-content .calendar-content {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}
.create-task-form .calendar-panel-content .calendar-content .calendar-month {
  flex: 1;
}
.create-task-form .calendar-panel-content .calendar-content .calendar-month .month-header {
  margin-bottom: 12px;
  text-align: center;
}
.create-task-form .calendar-panel-content .calendar-content .calendar-month .month-header .month-title {
  font-size: 16px;
  font-weight: 600;
  transition: color 0.3s;
}
.create-task-form .calendar-panel-content .calendar-content .calendar-month .calendar-grid .weekday-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 8px;
}
.create-task-form .calendar-panel-content .calendar-content .calendar-month .calendar-grid .weekday-header .weekday {
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  color: var(--ant-color-text-secondary, rgba(0, 0, 0, 0.65));
  padding: 4px 0;
  transition: color 0.3s;
}
.create-task-form .calendar-panel-content .calendar-content .calendar-month .calendar-grid .calendar-days {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}
.create-task-form .calendar-panel-content .calendar-content .calendar-month .calendar-grid .calendar-days .calendar-day {
  min-height: 70px;
  padding: 4px 2px;
  border: 1px solid var(--ant-color-border-secondary, #f0f0f0);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  transition: all 0.2s;
}
.create-task-form .calendar-panel-content .calendar-content .calendar-month .calendar-grid .calendar-days .calendar-day:hover:not(.is-holiday) {
  border-color: #1890ff;
}
.create-task-form .calendar-panel-content .calendar-content .calendar-month .calendar-grid .calendar-days .calendar-day.is-selected {
  border-color: #1890ff;
}
.create-task-form .calendar-panel-content .calendar-content .calendar-month .calendar-grid .calendar-days .calendar-day.is-scheduled-locked {
  border-color: var(--ant-color-border, #d9d9d9);
  cursor: not-allowed;
}
.create-task-form .calendar-panel-content .calendar-content .calendar-month .calendar-grid .calendar-days .calendar-day.is-holiday {
  border-color: var(--ant-color-border, #d9d9d9);
  cursor: not-allowed;
}
.create-task-form .calendar-panel-content .calendar-content .calendar-month .calendar-grid .calendar-days .calendar-day.is-holiday .day-number {
  color: var(--ant-color-text-disabled, rgba(0, 0, 0, 0.25));
}
.create-task-form .calendar-panel-content .calendar-content .calendar-month .calendar-grid .calendar-days .calendar-day.is-holiday .holiday-text {
  font-size: 11px;
  color: var(--ant-color-text-disabled, rgba(0, 0, 0, 0.25));
}
.create-task-form .calendar-panel-content .calendar-content .calendar-month .calendar-grid .calendar-days .calendar-day.unified-mode {
  cursor: pointer;
}
.create-task-form .calendar-panel-content .calendar-content .calendar-month .calendar-grid .calendar-days .calendar-day.unified-mode:hover {
  border-color: #ffc53d;
}
.create-task-form .calendar-panel-content .calendar-content .calendar-month .calendar-grid .calendar-days .calendar-day .day-number {
  font-size: 13px;
  font-weight: 500;
  color: var(--ant-color-text, rgba(0, 0, 0, 0.85));
  margin-bottom: 4px;
  transition: color 0.3s;
}
.create-task-form .calendar-panel-content .calendar-content .calendar-month .calendar-grid .calendar-days .calendar-day .day-input {
  width: 100%;
  max-width: 60px;
}
.create-task-form .calendar-panel-content .calendar-content .calendar-month .calendar-grid .calendar-days .calendar-day .day-input .ant-input-number-input {
  text-align: center;
  font-size: 14px;
}
.create-task-form .calendar-panel-content .is-other-month {
  opacity: 0.4;
}
.create-task-form .calendar-panel-content .is-other-month .day-number {
  color: var(--ant-color-text-tertiary, rgba(0, 0, 0, 0.45));
}
.create-task-form .calendar-panel-content .calendar-footer {
  padding-top: 16px;
  transition: border-color 0.3s;
}
.create-task-form .calendar-panel-content .calendar-footer .unified-setting {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.create-task-form .calendar-panel-content .calendar-footer .unified-setting .unified-input {
  width: 120px;
}
.create-task-form .calendar-panel-content .calendar-footer .unified-setting .unit-text {
  color: var(--ant-color-text-secondary, rgba(0, 0, 0, 0.65));
  font-size: 14px;
  transition: color 0.3s;
}
.create-task-form .calendar-panel-content .calendar-footer .unified-setting .unified-tip {
  color: #1890ff;
  font-size: 14px;
  margin-left: 8px;
}
.create-task-form .calendar-panel-content .scheduled-summary {
  margin-bottom: 8px;
  font-weight: 600;
}
.create-task-form .calendar-panel-content .scheduled-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.create-task-form .calendar-panel-content .scheduled-day {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 12px;
  padding: 8px 24px 8px 10px;
  border: 1px solid var(--ant-color-primary-border, #91caff);
  border-radius: 6px;
  background: var(--ant-color-primary-bg, #e6f4ff);
  width: fit-content;
  max-width: 100%;
}
.create-task-form .calendar-panel-content .scheduled-day-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  min-width: 18px;
  height: 18px;
  line-height: 18px;
  padding: 0;
}
.create-task-form .calendar-panel-content .scheduled-day-date {
  font-size: 13px;
  font-weight: 600;
}
.create-task-form .calendar-panel-content .scheduled-day-total {
  flex: 0 0 auto;
  color: var(--ant-color-primary, #1677ff);
  font-weight: 600;
}
.create-task-form .calendar-panel-content .scheduled-type-list {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
  gap: 4px 12px;
}
.create-task-form .calendar-panel-content .scheduled-type-item {
  font-size: 14px;
}
@media (max-width: 768px) {
  .create-task-form .dynamic-field-container .dynamic-field-box {
    padding: 16px;
  }
  .create-task-form .dynamic-field-container .item-content {
    flex-direction: column;
    align-items: stretch;
  }
  .create-task-form .dynamic-field-container .item-content .keyword-input,
  .create-task-form .dynamic-field-container .item-content .link-input,
  .create-task-form .dynamic-field-container .item-content .input-item {
    min-width: 100%;
    width: 100%;
  }
  .create-task-form .dynamic-field-container .item-content .number-input {
    width: 100%;
  }
  .create-task-form .keyword-item .item-content,
  .create-task-form .authority-link-item .item-content,
  .create-task-form .multi-input-item .item-content {
    flex-direction: column;
    align-items: stretch;
  }
  .create-task-form .commission-group {
    flex-direction: column;
    gap: 16px;
  }
  .create-task-form .commission-group .commission-item {
    width: 100%;
  }
  .create-task-form .review-options .review-option-item {
    flex-wrap: wrap;
  }
  .create-task-form .calendar-panel-content {
    width: calc(100vw - 32px) !important;
    max-height: calc(100vh - 80px);
  }
  .create-task-form .calendar-panel-content .calendar-content {
    flex-direction: column;
    gap: 16px;
  }
  .create-task-form .calendar-panel-content .calendar-month .calendar-grid .calendar-days .calendar-day {
    min-height: 60px;
    padding: 2px;
  }
  .create-task-form .calendar-panel-content .calendar-month .calendar-grid .calendar-days .calendar-day .day-input {
    max-width: 50px;
  }
  .create-task-form .calendar-panel-content .calendar-footer .unified-setting {
    flex-wrap: wrap;
  }
}
</style>
