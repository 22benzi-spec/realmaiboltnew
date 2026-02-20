
/*
  # 客户联系人关联商务经理和微信号

  ## 修改说明

  ### client_contacts 新增字段
  - `business_manager_id`: 对接的商务经理ID（关联 business_managers）
  - `business_manager_name`: 商务经理姓名（冗余，方便展示）
  - `wechat_account_id`: 对接使用的商务微信号ID（关联 business_wechat_accounts）
  - `wechat_account_id_str`: 微信号（冗余，方便展示）
  - `wechat_nickname`: 微信昵称（冗余，方便展示）
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='client_contacts' AND column_name='business_manager_id') THEN
    ALTER TABLE client_contacts ADD COLUMN business_manager_id uuid REFERENCES business_managers(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='client_contacts' AND column_name='business_manager_name') THEN
    ALTER TABLE client_contacts ADD COLUMN business_manager_name text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='client_contacts' AND column_name='wechat_account_id') THEN
    ALTER TABLE client_contacts ADD COLUMN wechat_account_id uuid REFERENCES business_wechat_accounts(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='client_contacts' AND column_name='wechat_account_id_str') THEN
    ALTER TABLE client_contacts ADD COLUMN wechat_account_id_str text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='client_contacts' AND column_name='wechat_nickname') THEN
    ALTER TABLE client_contacts ADD COLUMN wechat_nickname text DEFAULT '';
  END IF;
END $$;
