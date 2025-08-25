-- Add missing total column to orders table
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS total decimal(10,2);

-- Add missing billing fields that the frontend expects
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS billing_email text,
ADD COLUMN IF NOT EXISTS billing_address text,
ADD COLUMN IF NOT EXISTS payment_provider text;

-- Update the status column to use order_status type if it doesn't already
DO $$ BEGIN
  -- Check if status column is already order_status type
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' 
    AND column_name = 'status' 
    AND data_type = 'USER-DEFINED'
    AND udt_name = 'order_status'
  ) THEN
    -- Already correct type, do nothing
    NULL;
  ELSE
    -- First drop the default constraint
    ALTER TABLE public.orders ALTER COLUMN status DROP DEFAULT;
    
    -- Convert payment_status values to order_status values
    ALTER TABLE public.orders ALTER COLUMN status TYPE order_status USING 
      CASE 
        WHEN status::text = 'pending' THEN 'pending'::order_status
        WHEN status::text = 'completed' THEN 'completed'::order_status
        WHEN status::text = 'failed' THEN 'cancelled'::order_status
        WHEN status::text = 'refunded' THEN 'refunded'::order_status
        WHEN status::text = 'cancelled' THEN 'cancelled'::order_status
        ELSE 'pending'::order_status
      END;
      
    -- Set new default value
    ALTER TABLE public.orders ALTER COLUMN status SET DEFAULT 'pending'::order_status;
  END IF;
END $$;

-- Create index for better performance on order lookups
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);
