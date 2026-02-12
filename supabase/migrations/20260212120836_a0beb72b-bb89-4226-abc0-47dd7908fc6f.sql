
-- Add soft delete column
ALTER TABLE public.invoices ADD COLUMN deleted_at timestamp with time zone DEFAULT NULL;

-- Create index for filtering
CREATE INDEX idx_invoices_deleted_at ON public.invoices (deleted_at);

-- Drop existing RLS policies and recreate with soft delete filter
DROP POLICY IF EXISTS "Users can view their own invoices" ON public.invoices;
CREATE POLICY "Users can view their own invoices" 
ON public.invoices 
FOR SELECT 
USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Add policy for viewing trash
CREATE POLICY "Users can view their own deleted invoices" 
ON public.invoices 
FOR SELECT 
USING (auth.uid() = user_id AND deleted_at IS NOT NULL);
