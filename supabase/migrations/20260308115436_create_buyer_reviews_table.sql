/*
  # 创建买手留评记录表 buyer_reviews

  用于追踪买手在Amazon的每一条评论，形成完整的留评轨迹。

  ## 1. 新增表: buyer_reviews
  
  核心字段:
  - `id` (uuid, 主键)
  - `buyer_id` (uuid, 关联买手, FK -> erp_buyers.id)
  - `asin` (text, 评论的产品ASIN)
  - `store_name` (text, 店铺名称)
  - `product_name` (text, 产品名称)
  - `review_type` (text, 评论类型: 文字评/图片评/视频评/直评/VP评/Feedback)
  - `star_rating` (integer, 星级 1-5)
  - `review_status` (text, 评论状态: 存活/掉评/删评)
  - `review_date` (date, 留评日期)
  - `review_url` (text, 评论链接)
  - `screenshot_url` (text, 评论截图URL)
  - `is_company_order` (boolean, 是否为公司内部订单产品)
  - `sub_order_id` (uuid, 关联子订单，公司内部订单时填充)
  - `sub_order_number` (text, 子订单号冗余)
  - `notes` (text, 备注)
  - `created_by` (text, 创建人/操作业务员)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ## 2. 安全
  - 启用 RLS
  - anon 角色完整读写权限

  ## 3. 索引
  - buyer_id 用于按买手查询
  - asin 用于按ASIN搜索
  - review_status 用于按状态筛选
  - is_company_order 用于区分公司/个人评论
*/

CREATE TABLE IF NOT EXISTS buyer_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL REFERENCES erp_buyers(id) ON DELETE CASCADE,
  asin text NOT NULL DEFAULT '',
  store_name text DEFAULT '',
  product_name text DEFAULT '',
  review_type text NOT NULL DEFAULT '文字评',
  star_rating integer DEFAULT 5,
  review_status text NOT NULL DEFAULT '存活',
  review_date date DEFAULT CURRENT_DATE,
  review_url text DEFAULT '',
  screenshot_url text DEFAULT '',
  is_company_order boolean DEFAULT false,
  sub_order_id uuid,
  sub_order_number text DEFAULT '',
  notes text DEFAULT '',
  created_by text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE buyer_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can select buyer_reviews"
  ON buyer_reviews FOR SELECT TO anon USING (true);

CREATE POLICY "anon can insert buyer_reviews"
  ON buyer_reviews FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon can update buyer_reviews"
  ON buyer_reviews FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon can delete buyer_reviews"
  ON buyer_reviews FOR DELETE TO anon USING (true);

CREATE INDEX IF NOT EXISTS idx_br_buyer ON buyer_reviews (buyer_id);
CREATE INDEX IF NOT EXISTS idx_br_asin ON buyer_reviews (asin);
CREATE INDEX IF NOT EXISTS idx_br_status ON buyer_reviews (review_status);
CREATE INDEX IF NOT EXISTS idx_br_company ON buyer_reviews (is_company_order);
