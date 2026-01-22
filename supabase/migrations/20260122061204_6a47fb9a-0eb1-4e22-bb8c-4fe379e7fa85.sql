-- Table to store Gmail OAuth tokens per user
CREATE TABLE public.gmail_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_history_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.gmail_connections ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own gmail connection"
ON public.gmail_connections FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own gmail connection"
ON public.gmail_connections FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own gmail connection"
ON public.gmail_connections FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gmail connection"
ON public.gmail_connections FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_gmail_connections_updated_at
BEFORE UPDATE ON public.gmail_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();