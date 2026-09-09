-- ==============================================================================
-- SRIYAM STORE - HUMAN-READABLE SEQUENTIAL ORDER IDS (SRI001, SRI002, ...)
-- ==============================================================================

-- 1. Create a dedicated sequence for order numbers
CREATE SEQUENCE IF NOT EXISTS public.order_number_seq START WITH 1 INCREMENT BY 1;

-- 2. Create generator function that returns 'SRI' + zero-padded number (min 3 digits)
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT AS $$
DECLARE
  next_val BIGINT;
BEGIN
  next_val := nextval('public.order_number_seq');
  RETURN 'SRI' || LPAD(next_val::TEXT, GREATEST(3, LENGTH(next_val::TEXT)), '0');
END;
$$ LANGUAGE plpgsql;

-- 3. Add column 'order_number' to orders table with unique constraint and default
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS order_number TEXT UNIQUE DEFAULT public.generate_order_number();

-- 4. Trigger to guarantee order_number is generated atomically if omitted on insert
CREATE OR REPLACE FUNCTION public.set_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := public.generate_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_order_number ON public.orders;
CREATE TRIGGER trigger_set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_order_number();

-- 5. Backfill any existing orders without order_number in created_at chronological order
DO $$
DECLARE
  r RECORD;
  seq_num BIGINT := 1;
BEGIN
  FOR r IN SELECT id FROM public.orders WHERE order_number IS NULL ORDER BY created_at ASC LOOP
    UPDATE public.orders
    SET order_number = 'SRI' || LPAD(seq_num::TEXT, GREATEST(3, LENGTH(seq_num::TEXT)), '0')
    WHERE id = r.id;
    seq_num := seq_num + 1;
  END LOOP;
  IF seq_num > 1 THEN
    PERFORM setval('public.order_number_seq', seq_num);
  END IF;
END;
$$;

-- 6. Ensure unique index for fast lookups
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_idx ON public.orders(order_number);
