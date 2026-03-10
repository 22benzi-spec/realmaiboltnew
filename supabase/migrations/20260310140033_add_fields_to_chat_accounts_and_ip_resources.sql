/*
  # Add new fields to chat_accounts and ip_resources

  1. chat_accounts table - new columns:
     - `ip_address` (text): IP address associated with this chat account
     - `registration_account` (text): The registration account used to create this chat account
     - `friend_count` (integer): Number of friends/contacts in this account
     - `account_link` (text): Profile or account link/URL
     - `two_fa_code` (text): Two-factor authentication secret/backup code

  2. ip_resources table - new columns for 聊单号IP type:
     - `port` (text): Port number for proxy/IP connection
     - `account` (text): Login account for the IP resource
     - `password` (text): Password for the IP resource
     - `browser` (text): Browser environment ID, typically AdsPower ID

  No data is dropped. All new columns are nullable with no defaults to avoid masking missing data.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_accounts' AND column_name = 'ip_address') THEN
    ALTER TABLE chat_accounts ADD COLUMN ip_address text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_accounts' AND column_name = 'registration_account') THEN
    ALTER TABLE chat_accounts ADD COLUMN registration_account text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_accounts' AND column_name = 'friend_count') THEN
    ALTER TABLE chat_accounts ADD COLUMN friend_count integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_accounts' AND column_name = 'account_link') THEN
    ALTER TABLE chat_accounts ADD COLUMN account_link text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_accounts' AND column_name = 'two_fa_code') THEN
    ALTER TABLE chat_accounts ADD COLUMN two_fa_code text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ip_resources' AND column_name = 'port') THEN
    ALTER TABLE ip_resources ADD COLUMN port text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ip_resources' AND column_name = 'account') THEN
    ALTER TABLE ip_resources ADD COLUMN account text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ip_resources' AND column_name = 'password') THEN
    ALTER TABLE ip_resources ADD COLUMN password text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ip_resources' AND column_name = 'browser') THEN
    ALTER TABLE ip_resources ADD COLUMN browser text;
  END IF;
END $$;
