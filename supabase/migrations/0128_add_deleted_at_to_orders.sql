-- Add soft delete columns to orders table for archiving functionality
-- This allows orders to be "deleted" (archived) without actually removing them from the database

-- Add deleted_at column (timestamp when order was archived/deleted)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

-- Add deleted_by column (user_id of who deleted the order)
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS deleted_by uuid REFERENCES public.users(id) ON DELETE SET NULL;

-- Create index on deleted_at for efficient filtering of archived orders
CREATE INDEX IF NOT EXISTS orders_deleted_at_idx ON public.orders (deleted_at);

-- Add comment to document the soft delete pattern
COMMENT ON COLUMN public.orders.deleted_at IS 'Timestamp when order was archived (soft deleted). NULL means the order is active.';
COMMENT ON COLUMN public.orders.deleted_by IS 'User ID of the admin who archived the order.';
