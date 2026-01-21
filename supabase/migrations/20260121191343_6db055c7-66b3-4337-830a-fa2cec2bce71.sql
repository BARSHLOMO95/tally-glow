-- Create table for user upload links with password protection
CREATE TABLE public.upload_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  link_code TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.upload_links ENABLE ROW LEVEL SECURITY;

-- Users can view their own upload links
CREATE POLICY "Users can view their own upload links" 
ON public.upload_links 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can create their own upload links
CREATE POLICY "Users can create their own upload links" 
ON public.upload_links 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own upload links
CREATE POLICY "Users can update their own upload links" 
ON public.upload_links 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own upload links
CREATE POLICY "Users can delete their own upload links" 
ON public.upload_links 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_upload_links_updated_at
BEFORE UPDATE ON public.upload_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index on link_code for fast lookups
CREATE INDEX idx_upload_links_link_code ON public.upload_links(link_code);

-- Create storage bucket for invoice uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('invoices', 'invoices', true);

-- Storage policies for invoice uploads
-- Anyone can upload to invoices bucket (for public upload links)
CREATE POLICY "Anyone can upload invoices"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'invoices');

-- Anyone can view invoices (images need to be accessible)
CREATE POLICY "Anyone can view invoices"
ON storage.objects
FOR SELECT
USING (bucket_id = 'invoices');

-- Users can delete their own invoices
CREATE POLICY "Users can manage their invoices"
ON storage.objects
FOR DELETE
USING (bucket_id = 'invoices' AND auth.uid()::text = (storage.foldername(name))[1]);