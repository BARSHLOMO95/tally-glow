-- Add phone_number column to user_settings for WhatsApp delivery
ALTER TABLE public.user_settings 
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Add comment for clarity
COMMENT ON COLUMN public.user_settings.phone_number IS 'User phone number in E.164 format for WhatsApp notifications';