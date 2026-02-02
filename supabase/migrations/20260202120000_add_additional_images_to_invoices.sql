-- Add support for multiple images per invoice (for multi-page PDFs)
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS additional_images jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN invoices.additional_images IS 'Array of additional image URLs for multi-page documents. Each page from PDF will be stored separately for better readability.';
