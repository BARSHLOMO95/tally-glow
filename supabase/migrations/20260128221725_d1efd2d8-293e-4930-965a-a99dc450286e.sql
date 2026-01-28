-- Drop the existing constraint and recreate with all needed options (Hebrew and English)
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_entry_method_check;

ALTER TABLE public.invoices ADD CONSTRAINT invoices_entry_method_check 
CHECK (entry_method IS NULL OR entry_method IN ('manual', 'upload_link', 'whatsapp', 'excel_import', 'gmail_sync', 'ידני', 'דיגיטלי'));