/*
  # Refactor chat_accounts table

  ## Summary
  根据业务需求对聊单号管理进行字段扩充：

  1. 新增字段
    - `email` (text) - 绑定邮箱
    - `phone_type` (text) - 手机号类型：'个人' | 'Pingme'
    - `pingme_number` (text) - Pingme 虚拟号码
    - `account_role` (text) - 账号用途：'主号' | '次用号' | '备用号'
    - `physical_device` (text) - 实体机登录信息（设备标识/序列号）
    - `cloud_phone` (text) - 云手机登录信息（云手机标识）

  2. 移除冗余字段（保留原数据，用 soft 方式处理）
    - owner_type / platform 列在视图层不再展示

  3. Notes
    - 一个聊单号支持多端登录：AdsPower + 实体机 + 云手机
    - phone_number 继续保留（个人/朋友的中国号）
    - pingme_number 用于记录购买的 Pingme 号
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_accounts' AND column_name = 'email') THEN
    ALTER TABLE chat_accounts ADD COLUMN email text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_accounts' AND column_name = 'phone_type') THEN
    ALTER TABLE chat_accounts ADD COLUMN phone_type text DEFAULT '个人';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_accounts' AND column_name = 'pingme_number') THEN
    ALTER TABLE chat_accounts ADD COLUMN pingme_number text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_accounts' AND column_name = 'account_role') THEN
    ALTER TABLE chat_accounts ADD COLUMN account_role text DEFAULT '主号';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_accounts' AND column_name = 'physical_device') THEN
    ALTER TABLE chat_accounts ADD COLUMN physical_device text DEFAULT '';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_accounts' AND column_name = 'cloud_phone') THEN
    ALTER TABLE chat_accounts ADD COLUMN cloud_phone text DEFAULT '';
  END IF;
END $$;
