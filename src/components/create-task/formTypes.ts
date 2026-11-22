export interface CreateReceiveTaskAssignShop {
  shop_id: number;
  shop_name: string;
  [key: string]: any;
}

export interface CreateReceiveTaskCommissionRates {
  free_review?: number;
  words?: number;
  [key: string]: any;
}

export interface CreateReceiveTaskMoreVariant {
  color: string;
  size: string;
  [key: string]: any;
}

export interface CreateReceiveTaskTypeCount {
  keyword: string;
  review: string;
  schedule_num: number;
  type: string;
  [key: string]: any;
}

export interface CreateReceiveTaskSchedule {
  schedule_date: string;
  total_quantity: number;
  type_counts: CreateReceiveTaskTypeCount[];
  [key: string]: any;
}

export interface CreateReceiveTaskOffsetDetail {
  surplus_type?: 1 | 2 | 3;
  country_id: number;
  quantity: number;
  review_type: string;
  [key: string]: any;
}

export interface CreateReceiveTaskOffsetBasic {
  amount?: number;
  task_basic_id?: number;
  [key: string]: any;
}

export interface CreateReceiveTaskBatchCollection {
  actual_cny_amount: number;
  transfer_channel: number;
}

export interface CreateReceiveTaskItem {
  asin?: string;
  assign_shop?: CreateReceiveTaskAssignShop;
  brand_name?: string;
  buyer_commission_quantity?: number;
  buyer_commission_usd?: number;
  category?: string;
  certificate?: number;
  commission_rates?: CreateReceiveTaskCommissionRates;
  country_id?: number;
  daily_feedback?: boolean;
  exchange_rate?: number;
  more_variant?: CreateReceiveTaskMoreVariant;
  product_images?: string;
  product_price?: number;
  rating_count?: number;
  review_level?: number;
  review_type?: string[];
  schedules?: CreateReceiveTaskSchedule[];
  service_commission_cny?: number;
  star_rating?: number;
  store_name?: string;
  task_contact?: number;
  task_remark?: string;
  total_order_quantity?: number;
  variant_mode?: number;
  [key: string]: any;
}

export interface CreateReceiveTaskRequest {
  account_status: number;
  actual_cny_amount: number;
  actual_usd_amount: number;
  /** 纯人民币模式的分批收款明细（禅道 #176） */
  batch_collection: CreateReceiveTaskBatchCollection[];
  business_remark: string;
  cash_buy_price: number;
  cash_sell_price: number;
  employee_id: number;
  offset_type?: number;
  surplus_type?: number[];
  offset_details?: CreateReceiveTaskOffsetDetail[];
  offset_task_basics?: CreateReceiveTaskOffsetBasic[];
  payment_mode: string;
  tasks: CreateReceiveTaskItem[];
  total_task: number;
  transfer_channel: number;
  water_bill_path: string;
  [key: string]: any;
}

export interface ApiResponse<T = any> { code: number; data?: T; msg?: string; message?: string }
export type EvaluationRecord = Record<string, any>;
