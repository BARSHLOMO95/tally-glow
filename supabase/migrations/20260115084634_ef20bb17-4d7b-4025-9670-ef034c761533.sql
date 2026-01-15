-- Add new value to invoice_status enum
ALTER TYPE public.invoice_status ADD VALUE IF NOT EXISTS 'ממתין לבדיקה ידנית';