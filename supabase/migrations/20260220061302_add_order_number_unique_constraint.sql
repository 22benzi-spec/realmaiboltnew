/*
  # 订单编号唯一约束

  确保 erp_orders 表的 order_number 字段具有唯一约束，
  防止并发创建时产生重复订单编号。
*/

ALTER TABLE erp_orders
  ADD CONSTRAINT erp_orders_order_number_unique UNIQUE (order_number);
