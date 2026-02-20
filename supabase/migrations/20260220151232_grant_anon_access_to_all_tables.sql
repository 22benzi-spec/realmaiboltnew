
/*
  # 为所有业务表添加 anon 角色访问权限

  系统未启用登录认证，前端使用 anon key 访问，
  需要为所有业务表添加 anon 角色的 RLS 策略，解决前端查询返回空数据的问题。
*/

DO $$ BEGIN

  -- business_managers
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='business_managers' AND policyname='anon_select_business_managers') THEN
    CREATE POLICY "anon_select_business_managers" ON business_managers FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='business_managers' AND policyname='anon_insert_business_managers') THEN
    CREATE POLICY "anon_insert_business_managers" ON business_managers FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='business_managers' AND policyname='anon_update_business_managers') THEN
    CREATE POLICY "anon_update_business_managers" ON business_managers FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='business_managers' AND policyname='anon_delete_business_managers') THEN
    CREATE POLICY "anon_delete_business_managers" ON business_managers FOR DELETE TO anon USING (true);
  END IF;

  -- business_wechat_accounts
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='business_wechat_accounts' AND policyname='anon_all_bwa') THEN
    CREATE POLICY "anon_all_bwa" ON business_wechat_accounts FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;

  -- wechat_clients
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='wechat_clients' AND policyname='anon_all_wechat_clients') THEN
    CREATE POLICY "anon_all_wechat_clients" ON wechat_clients FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;

  -- buyers
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='buyers' AND policyname='anon_select_buyers') THEN
    CREATE POLICY "anon_select_buyers" ON buyers FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='buyers' AND policyname='anon_insert_buyers') THEN
    CREATE POLICY "anon_insert_buyers" ON buyers FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='buyers' AND policyname='anon_update_buyers') THEN
    CREATE POLICY "anon_update_buyers" ON buyers FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='buyers' AND policyname='anon_delete_buyers') THEN
    CREATE POLICY "anon_delete_buyers" ON buyers FOR DELETE TO anon USING (true);
  END IF;

  -- erp_buyers
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='erp_buyers' AND policyname='anon_all_erp_buyers') THEN
    CREATE POLICY "anon_all_erp_buyers" ON erp_buyers FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;

  -- orders
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='anon_select_orders') THEN
    CREATE POLICY "anon_select_orders" ON orders FOR SELECT TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='anon_insert_orders') THEN
    CREATE POLICY "anon_insert_orders" ON orders FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='anon_update_orders') THEN
    CREATE POLICY "anon_update_orders" ON orders FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='orders' AND policyname='anon_delete_orders') THEN
    CREATE POLICY "anon_delete_orders" ON orders FOR DELETE TO anon USING (true);
  END IF;

  -- erp_orders
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='erp_orders' AND policyname='anon_all_erp_orders') THEN
    CREATE POLICY "anon_all_erp_orders" ON erp_orders FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;

  -- sub_orders
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='sub_orders' AND policyname='anon_all_sub_orders') THEN
    CREATE POLICY "anon_all_sub_orders" ON sub_orders FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;

  -- order_keywords
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='order_keywords' AND policyname='anon_all_order_keywords') THEN
    CREATE POLICY "anon_all_order_keywords" ON order_keywords FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;

  -- order_schedules
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='order_schedules' AND policyname='anon_all_order_schedules') THEN
    CREATE POLICY "anon_all_order_schedules" ON order_schedules FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;

  -- stores
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='stores' AND policyname='anon_all_stores') THEN
    CREATE POLICY "anon_all_stores" ON stores FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;

  -- client_companies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='client_companies' AND policyname='anon_all_client_companies') THEN
    CREATE POLICY "anon_all_client_companies" ON client_companies FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;

  -- client_contacts
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='client_contacts' AND policyname='anon_all_client_contacts') THEN
    CREATE POLICY "anon_all_client_contacts" ON client_contacts FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;

  -- gift_card_batches
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gift_card_batches' AND policyname='anon_all_gift_card_batches') THEN
    CREATE POLICY "anon_all_gift_card_batches" ON gift_card_batches FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;

  -- gift_cards
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='gift_cards' AND policyname='anon_all_gift_cards') THEN
    CREATE POLICY "anon_all_gift_cards" ON gift_cards FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;

  -- grab_hall_logs
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='grab_hall_logs' AND policyname='anon_all_grab_hall_logs') THEN
    CREATE POLICY "anon_all_grab_hall_logs" ON grab_hall_logs FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;

  -- paypal_accounts
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='paypal_accounts' AND policyname='anon_all_paypal_accounts') THEN
    CREATE POLICY "anon_all_paypal_accounts" ON paypal_accounts FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;

  -- paypal_refunds
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='paypal_refunds' AND policyname='anon_all_paypal_refunds') THEN
    CREATE POLICY "anon_all_paypal_refunds" ON paypal_refunds FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;

  -- refund_requests
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='refund_requests' AND policyname='anon_all_refund_requests') THEN
    CREATE POLICY "anon_all_refund_requests" ON refund_requests FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;

  -- transactions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='transactions' AND policyname='anon_all_transactions') THEN
    CREATE POLICY "anon_all_transactions" ON transactions FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;

  -- transfer_requests
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='transfer_requests' AND policyname='anon_all_transfer_requests') THEN
    CREATE POLICY "anon_all_transfer_requests" ON transfer_requests FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;

  -- usd_fund_batches
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='usd_fund_batches' AND policyname='anon_all_usd_fund_batches') THEN
    CREATE POLICY "anon_all_usd_fund_batches" ON usd_fund_batches FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;

  -- id_daily_counters
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='id_daily_counters' AND policyname='anon_all_id_daily_counters') THEN
    CREATE POLICY "anon_all_id_daily_counters" ON id_daily_counters FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;

  -- user_profiles
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='user_profiles' AND policyname='anon_all_user_profiles') THEN
    CREATE POLICY "anon_all_user_profiles" ON user_profiles FOR ALL TO anon USING (true) WITH CHECK (true);
  END IF;

END $$;
