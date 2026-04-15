/*
  # after_sale_issues 本金状态与处理状态梳理

  - 新增 `principal_status`: 待确定 | 正常 | 损失
  - 新增 `principal_reason`: 被骗 | 差价
  - 兼容旧数据状态：
    - 已替换订单 -> 已替换单号
    - 已退款给客户 -> 无需处理
  - 将旧本金字段回填到新的本金状态字段
*/
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'after_sale_issues' AND column_name = 'principal_status'
  ) THEN
    ALTER TABLE after_sale_issues ADD COLUMN principal_status text DEFAULT '待确定';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'after_sale_issues' AND column_name = 'principal_reason'
  ) THEN
    ALTER TABLE after_sale_issues ADD COLUMN principal_reason text DEFAULT '';
  END IF;
END $$;

UPDATE after_sale_issues
SET issue_status = '已替换单号'
WHERE issue_status = '已替换订单';

UPDATE after_sale_issues
SET issue_status = '无需处理'
WHERE issue_status = '已退款给客户';

UPDATE after_sale_issues
SET principal_status = '损失',
    principal_reason = CASE
      WHEN COALESCE(principal_reason, '') <> '' THEN principal_reason
      WHEN principal_stolen IS TRUE THEN '被骗'
      ELSE '差价'
    END
WHERE (principal_stolen IS TRUE OR COALESCE(principal_amount, 0) > 0)
  AND COALESCE(principal_status, '待确定') = '待确定';

UPDATE after_sale_issues
SET principal_status = '待确定'
WHERE principal_status IS NULL OR principal_status = '';
