/*
  # 子订单支持关键词/链接区分

  ## 变更说明
  1. sub_orders 表新增两列：
     - `search_link` (text): 当子订单使用操作链接而非关键词搜索时存储链接
     - `keyword_type` (text): 标记该子订单的搜索方式，'keyword'=关键词，'link'=链接，默认 'keyword'
  
  2. order_schedules 表新增一列：
     - `kw_entries` (jsonb): 存储每天的关键词/链接条目数组，格式 [{mode:'keyword'|'link', value:'...'}]
       用于在生成子订单时准确区分每条记录是关键词还是链接

  ## 安全
  - 不破坏现有数据，所有新列均有安全默认值
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sub_orders' AND column_name = 'search_link'
  ) THEN
    ALTER TABLE sub_orders ADD COLUMN search_link text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sub_orders' AND column_name = 'keyword_type'
  ) THEN
    ALTER TABLE sub_orders ADD COLUMN keyword_type text DEFAULT 'keyword';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_schedules' AND column_name = 'kw_entries'
  ) THEN
    ALTER TABLE order_schedules ADD COLUMN kw_entries jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
