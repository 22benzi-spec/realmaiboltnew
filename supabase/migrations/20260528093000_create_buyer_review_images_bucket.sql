/*
  # 创建买手评论图片存储桶

  用于保存买手留评轨迹里的评论图片。
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('buyer-review-images', 'buyer-review-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "anon can upload buyer review images"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'buyer-review-images');

CREATE POLICY "anon can read buyer review images"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'buyer-review-images');

CREATE POLICY "anon can update buyer review images"
  ON storage.objects FOR UPDATE TO anon
  USING (bucket_id = 'buyer-review-images')
  WITH CHECK (bucket_id = 'buyer-review-images');
