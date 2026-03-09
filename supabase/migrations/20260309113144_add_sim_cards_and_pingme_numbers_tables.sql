/*
  # 新增 SIM卡手机号 和 Pingme号码 两张表

  ## 新增表说明

  ### sim_cards（SIM卡手机号管理）
  - id: 主键
  - phone_number: 手机号码
  - carrier: 运营商（移动/联通/电信/其他）
  - region: 所属地区（省份/城市）
  - chat_account: 绑定的聊单号（微信号）
  - staff_name: 绑定的业务员
  - device_info: 设备信息（手机型号等）
  - status: 状态（使用中/待激活/已停用）
  - monthly_fee: 月租费用（元）
  - renew_cycle: 续费周期
  - last_renewed_at: 上次续费日期
  - next_renew_at: 下次到期日期
  - supplier: 供应商
  - do_not_renew: 是否标记不续费
  - notes: 备注
  - created_at / updated_at

  ### pingme_numbers（Pingme虚拟号码管理）
  - id: 主键
  - phone_number: Pingme号码
  - region: 号码归属地区（国家/地区）
  - chat_account: 绑定的聊单号
  - staff_name: 绑定的业务员
  - monthly_fee: 月租费用（预充值，不含收码费）
  - receive_fee_rate: 收码费率说明（文本描述，因为不固定）
  - status: 状态（使用中/已停用/已替换）
  - supplier: 供应商/平台
  - do_not_renew: 是否标记不续费
  - notes: 备注
  - created_at / updated_at

  ## 安全设置
  - 两张表均启用 RLS
  - 仅匿名用户可读写（与其他运营表保持一致）
*/

CREATE TABLE IF NOT EXISTS sim_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  carrier text DEFAULT '',
  region text DEFAULT '',
  chat_account text DEFAULT '',
  staff_name text DEFAULT '',
  device_info text DEFAULT '',
  status text DEFAULT '使用中',
  monthly_fee numeric(10,2) DEFAULT 0,
  renew_cycle text DEFAULT '月付',
  last_renewed_at date,
  next_renew_at date,
  supplier text DEFAULT '',
  do_not_renew boolean DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE sim_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can select sim_cards"
  ON sim_cards FOR SELECT TO anon USING (true);

CREATE POLICY "anon can insert sim_cards"
  ON sim_cards FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon can update sim_cards"
  ON sim_cards FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon can delete sim_cards"
  ON sim_cards FOR DELETE TO anon USING (true);


CREATE TABLE IF NOT EXISTS pingme_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number text NOT NULL,
  region text DEFAULT '',
  chat_account text DEFAULT '',
  staff_name text DEFAULT '',
  monthly_fee numeric(10,2) DEFAULT 0,
  receive_fee_rate text DEFAULT '',
  status text DEFAULT '使用中',
  supplier text DEFAULT 'Pingme',
  do_not_renew boolean DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE pingme_numbers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon can select pingme_numbers"
  ON pingme_numbers FOR SELECT TO anon USING (true);

CREATE POLICY "anon can insert pingme_numbers"
  ON pingme_numbers FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon can update pingme_numbers"
  ON pingme_numbers FOR UPDATE TO anon USING (true) WITH CHECK (true);

CREATE POLICY "anon can delete pingme_numbers"
  ON pingme_numbers FOR DELETE TO anon USING (true);
