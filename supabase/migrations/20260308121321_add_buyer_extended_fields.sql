/*
  # 为买手表添加扩展字段

  ## 变更说明

  ### 1. 新增基本录入字段
  - `source_channel` (text) - 来源渠道：老客推荐/前端引流/中介介绍/渠道未知
  - `referrer_name` (text) - 介绍人（来源渠道为"中介介绍"时填写）
  - `contact_platform` (text) - 对接平台（如 Amazon/Facebook/WhatsApp 等）
  - `is_prime_member` (boolean) - 是否Prime会员，默认 false

  ### 2. 新增后期补充字段（扩展信息）
  - `cooperation_level` (text) - 配合程度：高/中/低/待评估
  - `region` (text) - 所属地区
  - `backup_contacts` (jsonb) - 备用联系方式数组，格式：[{"type":"邮箱","value":"xxx@xx.com"}, ...]
    支持类型：邮箱/小号拉群/小号加好友/WS/VIP群组/INS

  ### 3. 已有字段说明
  - `facebook_link` 已存在，添加到前端表单中（原表单只有 facebook_name）
  - `backup_contact` 原字段保留（旧文本字段），新 backup_contacts 为结构化版本
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='erp_buyers' AND column_name='source_channel') THEN
    ALTER TABLE erp_buyers ADD COLUMN source_channel text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='erp_buyers' AND column_name='referrer_name') THEN
    ALTER TABLE erp_buyers ADD COLUMN referrer_name text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='erp_buyers' AND column_name='contact_platform') THEN
    ALTER TABLE erp_buyers ADD COLUMN contact_platform text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='erp_buyers' AND column_name='is_prime_member') THEN
    ALTER TABLE erp_buyers ADD COLUMN is_prime_member boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='erp_buyers' AND column_name='cooperation_level') THEN
    ALTER TABLE erp_buyers ADD COLUMN cooperation_level text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='erp_buyers' AND column_name='region') THEN
    ALTER TABLE erp_buyers ADD COLUMN region text DEFAULT '';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='erp_buyers' AND column_name='backup_contacts') THEN
    ALTER TABLE erp_buyers ADD COLUMN backup_contacts jsonb DEFAULT '[]'::jsonb;
  END IF;
END $$;
