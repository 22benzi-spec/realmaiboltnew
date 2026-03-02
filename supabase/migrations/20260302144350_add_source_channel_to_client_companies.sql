/*
  # Add source channel fields to client_companies

  1. Changes
    - `source_channel` (text): 来源渠道类型，枚举值：老客介绍 / 展会 / 渠道推荐 / 其他
    - `source_referrer` (text): 老客介绍时，填写介绍人名称
    - `source_exhibition` (text): 展会来源时，填写展会名称
    - `source_channel_name` (text): 渠道推荐时，填写渠道名称
    - `contact_name` (text): 对接员工姓名
    - `contact_wechat` (text): 对接员工微信号

  These fields are used on the initial client registration form.
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_companies' AND column_name = 'source_channel'
  ) THEN
    ALTER TABLE client_companies ADD COLUMN source_channel text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_companies' AND column_name = 'source_referrer'
  ) THEN
    ALTER TABLE client_companies ADD COLUMN source_referrer text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_companies' AND column_name = 'source_exhibition'
  ) THEN
    ALTER TABLE client_companies ADD COLUMN source_exhibition text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_companies' AND column_name = 'source_channel_name'
  ) THEN
    ALTER TABLE client_companies ADD COLUMN source_channel_name text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_companies' AND column_name = 'contact_name'
  ) THEN
    ALTER TABLE client_companies ADD COLUMN contact_name text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'client_companies' AND column_name = 'contact_wechat'
  ) THEN
    ALTER TABLE client_companies ADD COLUMN contact_wechat text DEFAULT '';
  END IF;
END $$;
