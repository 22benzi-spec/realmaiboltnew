/*
  # 统一售后状态文案为“无新单号”

  1. 数据修正
    - 将 `after_sale_issues.issue_status` 中历史的 `需补单` 全量改为 `无新单号`

  2. 说明
    - `issue_status` 为 text 字段，本迁移只更新历史数据，不涉及表结构变更
*/

UPDATE after_sale_issues
SET issue_status = '无新单号'
WHERE issue_status = '需补单';
