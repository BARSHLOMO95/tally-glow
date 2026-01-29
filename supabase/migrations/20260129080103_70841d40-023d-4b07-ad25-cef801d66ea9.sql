-- Add preview_image_url column for PDF preview images
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS preview_image_url text;

-- Add comment for documentation
COMMENT ON COLUMN public.invoices.preview_image_url IS 'Preview image URL for PDF files - generated from first page';