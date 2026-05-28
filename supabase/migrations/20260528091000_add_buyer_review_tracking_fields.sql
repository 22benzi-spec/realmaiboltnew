/*
  # 扩展买手留评记录字段

  增加评论类目和检测时间字段，用于买手详情页的留评轨迹表格展示。
*/

ALTER TABLE buyer_reviews
  ADD COLUMN IF NOT EXISTS review_category text DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS alive_days integer;
