/*
  # Add binding fields to ip_resources

  1. Changes to ip_resources
    - `chat_account` (text) - 买手IP 绑定的聊单号（微信号等）
    - `staff_name` (text) - 买手IP 绑定的业务员姓名
    - `paypal_account` (text) - 服务器IP 绑定的贝宝账号（邮箱）
    - `do_not_renew` (boolean) - 标记此 IP 不再续费

  These fields support the split-tab view: buyer IPs show chat_account + staff_name,
  server IPs show paypal_account. do_not_renew lets operators flag dead IPs.
*/

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ip_resources' AND column_name = 'chat_account') THEN
    ALTER TABLE ip_resources ADD COLUMN chat_account text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ip_resources' AND column_name = 'staff_name') THEN
    ALTER TABLE ip_resources ADD COLUMN staff_name text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ip_resources' AND column_name = 'paypal_account') THEN
    ALTER TABLE ip_resources ADD COLUMN paypal_account text DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ip_resources' AND column_name = 'do_not_renew') THEN
    ALTER TABLE ip_resources ADD COLUMN do_not_renew boolean DEFAULT false;
  END IF;
END $$;
