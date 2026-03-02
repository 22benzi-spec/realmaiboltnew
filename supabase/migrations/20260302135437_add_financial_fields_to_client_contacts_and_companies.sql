/*
  # 添加资金字段到对接人和客户公司

  ## 变更说明
  1. client_contacts 表新增字段
     - `prepaid_amount_cny`: 预存金额（人民币），客户预先存入的资金
     - `debt_amount_cny`: 欠款金额（人民币），客户当前欠款
     - `credit_limit_cny`: 信用额度（人民币），允许欠款上限

  2. client_companies 表新增字段
     - `prepaid_amount_cny`: 公司总预存金额（人民币）
     - `debt_amount_cny`: 公司总欠款金额（人民币）
     - `credit_limit_cny`: 公司信用额度（人民币）

  ## 说明
  - 资金字段均默认为 0
  - 支持对接人维度和公司维度两个层级分别管理
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_contacts' AND column_name = 'prepaid_amount_cny'
  ) THEN
    ALTER TABLE client_contacts ADD COLUMN prepaid_amount_cny numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_contacts' AND column_name = 'debt_amount_cny'
  ) THEN
    ALTER TABLE client_contacts ADD COLUMN debt_amount_cny numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_contacts' AND column_name = 'credit_limit_cny'
  ) THEN
    ALTER TABLE client_contacts ADD COLUMN credit_limit_cny numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_companies' AND column_name = 'prepaid_amount_cny'
  ) THEN
    ALTER TABLE client_companies ADD COLUMN prepaid_amount_cny numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_companies' AND column_name = 'debt_amount_cny'
  ) THEN
    ALTER TABLE client_companies ADD COLUMN debt_amount_cny numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_companies' AND column_name = 'credit_limit_cny'
  ) THEN
    ALTER TABLE client_companies ADD COLUMN credit_limit_cny numeric DEFAULT 0;
  END IF;
END $$;
