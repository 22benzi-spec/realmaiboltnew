/*
  # Add region field and IP replacement logs

  1. Changes to ip_resources
    - `region` (text) - IP 所属地区，如 美国/日本/英国 等

  2. New Table: ip_replacement_logs
    - 记录每次 IP 替换的详情
    - `id` (uuid)
    - `old_ip_id` (uuid) - 被替换的旧 IP（引用 ip_resources.id）
    - `new_ip_id` (uuid) - 替换后的新 IP（引用 ip_resources.id）
    - `old_ip_address` (text) - 旧 IP 地址快照（防止旧 IP 被删后找不到）
    - `new_ip_address` (text) - 新 IP 地址快照
    - `replaced_at` (timestamptz) - 替换时间
    - `reason` (text) - 替换原因
    - `operated_by` (text) - 操作人
    - `notes` (text) - 备注
    - `created_at` (timestamptz)

  3. Security
    - Enable RLS on ip_replacement_logs
    - Grant anon access consistent with other tables in this project
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ip_resources' AND column_name = 'region'
  ) THEN
    ALTER TABLE ip_resources ADD COLUMN region text DEFAULT '';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS ip_replacement_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  old_ip_id uuid REFERENCES ip_resources(id) ON DELETE SET NULL,
  new_ip_id uuid REFERENCES ip_resources(id) ON DELETE SET NULL,
  old_ip_address text NOT NULL DEFAULT '',
  new_ip_address text NOT NULL DEFAULT '',
  ip_type text NOT NULL DEFAULT '',
  replaced_at date NOT NULL DEFAULT CURRENT_DATE,
  reason text DEFAULT '',
  operated_by text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE ip_replacement_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can select ip_replacement_logs"
  ON ip_replacement_logs FOR SELECT TO anon USING (true);

CREATE POLICY "anon can insert ip_replacement_logs"
  ON ip_replacement_logs FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon can update ip_replacement_logs"
  ON ip_replacement_logs FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon can delete ip_replacement_logs"
  ON ip_replacement_logs FOR DELETE TO anon USING (true);
