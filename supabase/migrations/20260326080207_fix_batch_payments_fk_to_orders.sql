/*
  # Fix batch_payments foreign key to reference erp_orders

  1. Modified Tables
    - `batch_payments` - Change `batch_id` FK from `order_batches` to `erp_orders`
      so payments can be recorded directly against orders

  2. Important Notes
    - Drops old FK constraint and creates new one
    - No data loss, just FK target change
*/

ALTER TABLE batch_payments DROP CONSTRAINT IF EXISTS batch_payments_batch_id_fkey;

ALTER TABLE batch_payments 
  ADD CONSTRAINT batch_payments_order_id_fkey 
  FOREIGN KEY (batch_id) REFERENCES erp_orders(id) ON DELETE CASCADE;
