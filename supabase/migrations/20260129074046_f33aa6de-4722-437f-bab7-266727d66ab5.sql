-- Add storage_error column for diagnostic information
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS storage_error text;