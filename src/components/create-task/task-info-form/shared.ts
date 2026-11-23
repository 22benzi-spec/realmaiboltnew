export const keywordTypes = ['free_review', 'feedback', 'words', 'video', 'image'] as const;

export type KeywordType = typeof keywordTypes[number];
export type KeywordPlanType = 1 | 2;
export type KeywordTemplateItem = { keyword: string; type: KeywordPlanType };
export type KeywordItem = { keyword: string; num: number | undefined; type: KeywordPlanType };
export type ScheduleTypeDetail = { keywords: KeywordItem[] };
export type ScheduleDateDetail = Partial<Record<KeywordType, ScheduleTypeDetail>>;
export type OrderDatePlanItem = { date: string; order_num: number | undefined };
export type OrderDatePlanFixed = { everday_orders_num: number | undefined };
export type CommentGroup = {
  keywords: KeywordItem[];
  order_date_plans: OrderDatePlanItem[] | OrderDatePlanFixed;
};
export type CommentGroups = Record<KeywordType, CommentGroup>;

export const createEmptyComments = (): CommentGroups => ({
  free_review: { keywords: [], order_date_plans: [] },
  feedback: { keywords: [], order_date_plans: [] },
  words: { keywords: [], order_date_plans: [] },
  video: { keywords: [], order_date_plans: [] },
  image: { keywords: [], order_date_plans: [] },
});

export const normalizeSendMsg = (data: any): 0 | 1 | 2 => {
  const num = Number(data?.is_send_msg);
  if (num === 1 || num === 2) return num as 1 | 2;
  return 0;
};

export const normalizeEntryStatus = (value: any): 1 | 2 | 3 => {
  const num = Number(value);
  if (num === 1 || num === 2 || num === 3) {
    return num as 1 | 2 | 3;
  }
  return 1;
};

export const parseRemarkTypes = (value: unknown): KeywordType[] => {
  const rawValues = Array.isArray(value)
    ? value.flatMap((item) => (typeof item === 'string' ? item.split(',') : [item]))
    : typeof value === 'string'
      ? value.split(',')
      : value === undefined || value === null || value === ''
        ? []
        : [value];

  const selectedTypes = new Set<KeywordType>();
  rawValues.forEach((item) => {
    const normalized = String(item ?? '').trim();
    if ((keywordTypes as readonly string[]).includes(normalized)) {
      selectedTypes.add(normalized as KeywordType);
    }
  });

  return keywordTypes.filter((type) => selectedTypes.has(type));
};

export const normalizeKeywordPlanType = (rawType: unknown): KeywordPlanType => {
  return Number(rawType) === 2 || rawType === 'keyword_url' || rawType === 'url' ? 2 : 1;
};

export const normalizeKeywordTemplateItem = (item: any): KeywordTemplateItem => {
  if (item && typeof item === 'object') {
    const rawKeyword = item.keyword;
    return {
      keyword: typeof rawKeyword === 'string' ? rawKeyword : '',
      type: normalizeKeywordPlanType(item.type),
    };
  }
  return { keyword: '', type: 1 };
};

export const normalizeKeywordItem = (item: any): KeywordItem => {
  const rawKeyword = item?.keyword;
  const keyword = typeof rawKeyword === 'string' ? rawKeyword : '';
  const rawNum = item?.num ?? item?.order_num;
  const num = rawNum === 0 || rawNum ? Number(rawNum) : undefined;
  return {
    keyword,
    num: typeof num === 'number' && !Number.isNaN(num) ? num : undefined,
    type: normalizeKeywordPlanType(item?.type),
  };
};

export const normalizeKeywordList = (data: any): KeywordTemplateItem[] => {
  if (Array.isArray(data?.keyword_list)) {
    return data.keyword_list.map((item: any) => normalizeKeywordTemplateItem(item));
  }
  return [];
};

export const normalizeOrderPlanItem = (item: any): OrderDatePlanItem => {
  const date = typeof item?.date === 'string' ? item.date : '';
  const rawNum = item?.order_num;
  const orderNum = rawNum === 0 || rawNum ? Number(rawNum) : undefined;
  return {
    date,
    order_num: typeof orderNum === 'number' && !Number.isNaN(orderNum) ? orderNum : undefined,
  };
};

export const normalizeComments = (comments: any): CommentGroups => {
  const empty = createEmptyComments();
  if (!comments) return empty;

  const normalized = createEmptyComments();
  keywordTypes.forEach((type) => {
    const value = comments?.[type];
    if (value && typeof value === 'object') {
      const rawKeywords = Array.isArray(value.keywords) ? value.keywords : [];
      const rawPlans = value.order_date_plans;
      normalized[type].keywords = rawKeywords.map(normalizeKeywordItem);
      if (Array.isArray(rawPlans)) {
        normalized[type].order_date_plans = rawPlans.map(normalizeOrderPlanItem);
      } else if (rawPlans && typeof rawPlans === 'object') {
        normalized[type].order_date_plans = {
          everday_orders_num: typeof rawPlans.everday_orders_num === 'number'
            ? rawPlans.everday_orders_num
            : undefined,
        };
      }
    }
  });

  return normalized;
};

export const getTypeLabel = (type: KeywordType): string => {
  if (type === 'free_review') return '免评';
  if (type === 'feedback') return 'feedback';
  if (type === 'words') return '文字';
  if (type === 'video') return '视频';
  return '图片';
};

export const getTypeSummaryLabel = (type: KeywordType): string => {
  if (type === 'free_review') return '免评';
  if (type === 'feedback') return 'Feedback';
  if (type === 'words') return '文字评';
  if (type === 'video') return '视频评';
  return '图片评';
};
