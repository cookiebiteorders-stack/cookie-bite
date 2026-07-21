-- Migration 0072: Remove delivery scheduling (single-step checkout refactoring)
-- 
-- This migration removes the delivery scheduling functionality that was part of the
-- multi-step checkout flow. The new checkout flow uses Paymob hosted checkout
-- which collects delivery information directly from the customer.

-- Drop delivery scheduling columns from orders table
alter table public.orders
  drop column if exists scheduled_delivery_date,
  drop column if exists scheduled_delivery_time,
  drop column if exists delivery_slot_id,
  drop column if exists delivery_slot,
  drop column if exists recipient_name,
  drop column if exists recipient_phone,
  drop column if exists recipient_address,
  drop column if exists hide_price,
  drop column if exists anonymous_sender,
  drop column if exists sender_name,
  drop column if exists gift_message,
  drop column if exists is_gift;

-- Drop delivery scheduling tables
drop table if exists public.slot_bookings cascade;
drop table if exists public.delivery_time_slots cascade;

-- Drop indexes related to delivery scheduling
drop index if exists public.idx_orders_scheduled_delivery_date;
drop index if exists public.idx_slot_bookings_slot_date;

-- Add comment to orders table about the simplified checkout
comment on table public.orders is
  'Orders table - simplified for single-step Paymob checkout. Delivery info collected by Paymob hosted page.';
