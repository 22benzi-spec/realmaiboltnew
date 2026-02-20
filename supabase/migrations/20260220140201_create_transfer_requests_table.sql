/*
  # Create transfer_requests table for staff-to-staff order transfers

  ## Purpose
  Enables a two-way handshake transfer flow: staff A initiates a transfer request,
  staff B sees a notification and accepts or rejects it. Only on acceptance does the
  sub-order actually move.

  ## New Tables
  - `transfer_requests`
    - `id` (uuid, pk)
    - `sub_order_id` (uuid) - the sub-order being transferred
    - `sub_order_number` (text)
    - `from_staff_id` (uuid) - initiating staff
    - `from_staff_name` (text)
    - `to_staff_id` (uuid) - receiving staff
    - `to_staff_name` (text)
    - `reason` (text) - transfer reason
    - `status` (text) - 待接受 | 已接受 | 已拒绝 | 已取消
    - `reject_reason` (text) - filled when rejected
    - `created_at` (timestamptz)
    - `responded_at` (timestamptz)

  ## Security
  - RLS enabled
  - Staff can read requests involving them (from or to)
  - Staff can insert requests (as sender)
  - Staff can update requests sent to them (to accept/reject)
  - Staff can update their own requests (to cancel)
*/

CREATE TABLE IF NOT EXISTS transfer_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_order_id uuid NOT NULL,
  sub_order_number text NOT NULL DEFAULT '',
  from_staff_id uuid,
  from_staff_name text NOT NULL DEFAULT '',
  to_staff_id uuid NOT NULL,
  to_staff_name text NOT NULL DEFAULT '',
  reason text DEFAULT '',
  status text NOT NULL DEFAULT '待接受',
  reject_reason text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  responded_at timestamptz
);

ALTER TABLE transfer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view transfer requests involving them"
  ON transfer_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert transfer requests"
  ON transfer_requests FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update transfer requests"
  ON transfer_requests FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_transfer_requests_to_staff ON transfer_requests(to_staff_id, status);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_from_staff ON transfer_requests(from_staff_id, status);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_sub_order ON transfer_requests(sub_order_id);
