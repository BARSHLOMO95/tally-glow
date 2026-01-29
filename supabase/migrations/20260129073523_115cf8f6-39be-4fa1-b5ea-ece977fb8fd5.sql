-- Add new columns for file storage tracking
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS file_name text,
ADD COLUMN IF NOT EXISTS mime_type text,
ADD COLUMN IF NOT EXISTS file_source text,
ADD COLUMN IF NOT EXISTS storage_status text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS original_url text;

-- Add comment for clarity
COMMENT ON COLUMN public.invoices.file_name IS 'Original filename of the uploaded document';
COMMENT ON COLUMN public.invoices.mime_type IS 'MIME type of the uploaded file (e.g., application/pdf, image/jpeg)';
COMMENT ON COLUMN public.invoices.file_source IS 'Source of the file: gmail, manual_upload, public_link';
COMMENT ON COLUMN public.invoices.storage_status IS 'Status of storage upload: success, failed, pending';
COMMENT ON COLUMN public.invoices.original_url IS 'Original external URL (for failed uploads or reference)';