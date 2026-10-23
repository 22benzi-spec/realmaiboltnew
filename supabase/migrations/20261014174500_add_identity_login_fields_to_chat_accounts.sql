/*
  # Add identity and login fields to chat_accounts

  聊单号管理新增：名字、生日、登入密码、验证邮箱密码、证件地址。
  已有列不改名，只增加可空列，避免影响旧数据。
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_accounts' AND column_name = 'person_name') THEN
    ALTER TABLE chat_accounts ADD COLUMN person_name text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_accounts' AND column_name = 'birthday') THEN
    ALTER TABLE chat_accounts ADD COLUMN birthday date;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_accounts' AND column_name = 'login_password') THEN
    ALTER TABLE chat_accounts ADD COLUMN login_password text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_accounts' AND column_name = 'email_password') THEN
    ALTER TABLE chat_accounts ADD COLUMN email_password text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_accounts' AND column_name = 'id_document_address') THEN
    ALTER TABLE chat_accounts ADD COLUMN id_document_address text DEFAULT '';
  END IF;
END $$;
