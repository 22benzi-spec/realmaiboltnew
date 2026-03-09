/*
  # 为 servers 表新增 server_ip 字段

  将服务器的 IP 地址从关联 ip_resources 表的外键方式，改为直接在 servers 表中存储，
  方便在行政资源管理页面直接展示和管理。

  ## 变更说明
  - servers 表新增 server_ip（text）字段，直接存储 IP 地址字符串
  - 保留原有 ip_id 外键字段不变（不删除，避免数据丢失）
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'servers' AND column_name = 'server_ip'
  ) THEN
    ALTER TABLE servers ADD COLUMN server_ip text DEFAULT '';
  END IF;
END $$;
