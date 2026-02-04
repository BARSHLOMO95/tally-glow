-- Allow multiple Gmail accounts per user (up to 3)

-- Step 1: Drop the UNIQUE constraint on user_id
ALTER TABLE public.gmail_connections
DROP CONSTRAINT IF EXISTS gmail_connections_user_id_key;

-- Step 2: Add account_label field to identify each account
ALTER TABLE public.gmail_connections
ADD COLUMN IF NOT EXISTS account_label TEXT;

-- Step 3: Update existing records to have a default label
UPDATE public.gmail_connections
SET account_label = 'תיבת מייל ראשית'
WHERE account_label IS NULL;

-- Step 4: Make account_label NOT NULL after setting defaults
ALTER TABLE public.gmail_connections
ALTER COLUMN account_label SET NOT NULL;

-- Step 5: Add UNIQUE constraint on (user_id, email) to prevent duplicate accounts
ALTER TABLE public.gmail_connections
ADD CONSTRAINT gmail_connections_user_email_unique UNIQUE (user_id, email);

-- Step 6: Create a function to check max 3 accounts per user
CREATE OR REPLACE FUNCTION public.check_max_gmail_accounts()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM public.gmail_connections
    WHERE user_id = NEW.user_id
  ) >= 3 THEN
    RAISE EXCEPTION 'ניתן לחבר עד 3 חשבונות Gmail בלבד';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create trigger to enforce the 3-account limit
DROP TRIGGER IF EXISTS enforce_max_gmail_accounts ON public.gmail_connections;
CREATE TRIGGER enforce_max_gmail_accounts
BEFORE INSERT ON public.gmail_connections
FOR EACH ROW
EXECUTE FUNCTION public.check_max_gmail_accounts();

-- Step 8: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_gmail_connections_user_id ON public.gmail_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_gmail_connections_is_active ON public.gmail_connections(user_id, is_active);
