/*
  # Add review_link, fb_image_url fields and update status flow

  1. Modified Tables
    - `sub_orders`
      - `review_link` (text) - Link to the product review
      - `fb_image_url` (text) - Facebook image URL/screenshot
      - Updated status flow concept:
        - Normal flow: 待分配业务员 -> 待分配买手 -> 已下单 -> 未返款 -> 已返款 -> 已完成
        - Problem statuses: 已取消, 已退款, 无此订单, 本金多返, 不下单

  2. Important Notes
    - review_link stores the link to the actual review on Amazon
    - fb_image_url stores screenshot/image from Facebook conversation
    - Status values are managed at application level
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sub_orders' AND column_name = 'review_link'
  ) THEN
    ALTER TABLE sub_orders ADD COLUMN review_link text DEFAULT '';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'sub_orders' AND column_name = 'fb_image_url'
  ) THEN
    ALTER TABLE sub_orders ADD COLUMN fb_image_url text DEFAULT '';
  END IF;
END $$;