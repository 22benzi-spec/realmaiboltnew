/*
  # 为订单自动同步客户库添加唯一约束

  ## 背景
  支持"下单即入库"工作流：商务在下单时直接填写店铺/ASIN/品牌，
  系统自动将新数据 upsert 到客户库，无需提前手动录入。

  ## 变更内容

  1. client_stores 表
     - 添加唯一约束 (company_id, store_name)：确保同一公司下同名店铺不重复
     
  2. client_store_asins 表
     - 添加唯一约束 (store_id, asin)：同一店铺下同一 ASIN 只保留一条记录
       （品牌/产品名等信息可通过更新覆盖，而非重复新增）

  ## 注意
  - 使用 IF NOT EXISTS 避免重复执行报错
  - 唯一约束是 upsert(onConflict) 操作的前提条件
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'client_stores_company_store_unique'
  ) THEN
    ALTER TABLE client_stores
      ADD CONSTRAINT client_stores_company_store_unique
      UNIQUE (company_id, store_name);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'client_store_asins_store_asin_unique'
  ) THEN
    ALTER TABLE client_store_asins
      ADD CONSTRAINT client_store_asins_store_asin_unique
      UNIQUE (store_id, asin);
  END IF;
END $$;
