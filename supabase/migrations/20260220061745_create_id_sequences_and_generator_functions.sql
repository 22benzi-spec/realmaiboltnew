/*
  # 创建编号序列和自动生成函数

  ## 业务背景
  - 每天约 20 客户，日均主订单数十条，每日子订单 500-1000 条
  - 买手总量约 12000（12 业务员 × 1000 买手）
  - 业务员 + 商务共约 14 人

  ## 编号格式设计
  - 主订单：ORD-YYYYMMDD-XXXX（日期 + 4位每日序号，如 ORD-20260220-0023）
  - 子订单：SUB-YYYYMMDD-XXXXXX（日期 + 6位每日序号，如 SUB-20260220-000387）
  - 买手：  BYR-XXXXX（5位全局序号，如 BYR-00042）
  - 业务员：STF-XXX（3位全局序号，如 STF-007）

  ## 新增内容
  1. `id_daily_counters` - 每日计数器表（主订单 & 子订单）
  2. `seq_buyer_global` - 买手全局序列
  3. `seq_staff_global` - 业务员全局序列
  4. 四个编号生成函数
  5. 自动触发器：erp_orders / sub_orders / erp_buyers / staff
  6. erp_buyers.buyer_number 字段
  7. staff.staff_number 字段

  ## 安全
  - id_daily_counters 仅允许已认证用户读取
  - 写入只通过数据库函数（SECURITY DEFINER）进行
*/

-- 每日计数器表
CREATE TABLE IF NOT EXISTS id_daily_counters (
  counter_key   text   NOT NULL,
  counter_date  date   NOT NULL,
  last_value    integer NOT NULL DEFAULT 0,
  PRIMARY KEY (counter_key, counter_date)
);

ALTER TABLE id_daily_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read daily counters"
  ON id_daily_counters FOR SELECT
  TO authenticated
  USING (true);

-- 买手全局序列
CREATE SEQUENCE IF NOT EXISTS seq_buyer_global START 1 INCREMENT 1;

-- 业务员全局序列
CREATE SEQUENCE IF NOT EXISTS seq_staff_global START 1 INCREMENT 1;

-- 生成主订单编号：ORD-YYYYMMDD-XXXX
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_date_str  text    := to_char(CURRENT_DATE, 'YYYYMMDD');
  v_next      integer;
BEGIN
  INSERT INTO id_daily_counters (counter_key, counter_date, last_value)
  VALUES ('ORDER', CURRENT_DATE, 1)
  ON CONFLICT (counter_key, counter_date)
  DO UPDATE SET last_value = id_daily_counters.last_value + 1
  RETURNING last_value INTO v_next;

  RETURN 'ORD-' || v_date_str || '-' || lpad(v_next::text, 4, '0');
END;
$$;

-- 生成子订单编号：SUB-YYYYMMDD-XXXXXX
CREATE OR REPLACE FUNCTION generate_sub_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_date_str  text    := to_char(CURRENT_DATE, 'YYYYMMDD');
  v_next      integer;
BEGIN
  INSERT INTO id_daily_counters (counter_key, counter_date, last_value)
  VALUES ('SUB_ORDER', CURRENT_DATE, 1)
  ON CONFLICT (counter_key, counter_date)
  DO UPDATE SET last_value = id_daily_counters.last_value + 1
  RETURNING last_value INTO v_next;

  RETURN 'SUB-' || v_date_str || '-' || lpad(v_next::text, 6, '0');
END;
$$;

-- 生成买手编号：BYR-XXXXX
CREATE OR REPLACE FUNCTION generate_buyer_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next integer;
BEGIN
  SELECT nextval('seq_buyer_global') INTO v_next;
  RETURN 'BYR-' || lpad(v_next::text, 5, '0');
END;
$$;

-- 生成业务员编号：STF-XXX
CREATE OR REPLACE FUNCTION generate_staff_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next integer;
BEGIN
  SELECT nextval('seq_staff_global') INTO v_next;
  RETURN 'STF-' || lpad(v_next::text, 3, '0');
END;
$$;

-- 触发器函数：自动设置主订单编号
CREATE OR REPLACE FUNCTION trg_set_order_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := generate_order_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_order_number ON erp_orders;
CREATE TRIGGER set_order_number
  BEFORE INSERT ON erp_orders
  FOR EACH ROW EXECUTE FUNCTION trg_set_order_number();

-- 触发器函数：自动设置子订单编号
CREATE OR REPLACE FUNCTION trg_set_sub_order_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.sub_order_number IS NULL OR NEW.sub_order_number = '' THEN
    NEW.sub_order_number := generate_sub_order_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_sub_order_number ON sub_orders;
CREATE TRIGGER set_sub_order_number
  BEFORE INSERT ON sub_orders
  FOR EACH ROW EXECUTE FUNCTION trg_set_sub_order_number();

-- erp_buyers 添加 buyer_number 字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'erp_buyers' AND column_name = 'buyer_number'
  ) THEN
    ALTER TABLE erp_buyers ADD COLUMN buyer_number text UNIQUE;
  END IF;
END $$;

-- 触发器函数：自动设置买手编号
CREATE OR REPLACE FUNCTION trg_set_buyer_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.buyer_number IS NULL OR NEW.buyer_number = '' THEN
    NEW.buyer_number := generate_buyer_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_buyer_number ON erp_buyers;
CREATE TRIGGER set_buyer_number
  BEFORE INSERT ON erp_buyers
  FOR EACH ROW EXECUTE FUNCTION trg_set_buyer_number();

-- staff 添加 staff_number 字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'staff' AND column_name = 'staff_number'
  ) THEN
    ALTER TABLE staff ADD COLUMN staff_number text UNIQUE;
  END IF;
END $$;

-- 触发器函数：自动设置业务员编号
CREATE OR REPLACE FUNCTION trg_set_staff_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.staff_number IS NULL OR NEW.staff_number = '' THEN
    NEW.staff_number := generate_staff_number();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_staff_number ON staff;
CREATE TRIGGER set_staff_number
  BEFORE INSERT ON staff
  FOR EACH ROW EXECUTE FUNCTION trg_set_staff_number();
