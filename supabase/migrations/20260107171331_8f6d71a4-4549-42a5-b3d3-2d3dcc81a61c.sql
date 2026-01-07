-- Update VAT calculation trigger function to normalize business_type and support 0% VAT for foreign suppliers
CREATE OR REPLACE FUNCTION public.calculate_vat_on_invoice()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  bt text;
BEGIN
  -- Normalize business_type variants before VAT logic
  bt := NEW.business_type;
  IF bt IS NOT NULL THEN
    IF bt = 'ספק חול' OR bt = 'ספק חו"ל' OR bt = 'ספק חו״ל' THEN
      bt := 'ספק חו"ל';
    ELSIF bt = 'חברה בע"מ' OR bt = 'חברה בע״מ' THEN
      bt := 'חברה בע"מ';
    END IF;
  END IF;
  NEW.business_type := bt;

  -- Only calculate if total_amount is provided
  IF NEW.total_amount IS NULL OR NEW.total_amount <= 0 THEN
    NEW.amount_before_vat := NULL;
    NEW.vat_amount := NULL;
    RETURN NEW;
  END IF;

  -- Foreign supplier: VAT is 0%, before_vat equals total
  IF bt = 'ספק חו"ל' THEN
    NEW.amount_before_vat := ROUND((NEW.total_amount)::numeric, 2);
    NEW.vat_amount := 0;
    RETURN NEW;
  END IF;

  -- Default: calculate VAT at 18% from total
  NEW.amount_before_vat := ROUND((NEW.total_amount / 1.18)::numeric, 2);
  NEW.vat_amount := ROUND((NEW.total_amount - NEW.amount_before_vat)::numeric, 2);
  RETURN NEW;
END;
$$;

-- Recreate triggers so UPDATE recalculates when total_amount, business_type, or document_type changes
DROP TRIGGER IF EXISTS calculate_vat_on_insert ON public.invoices;
DROP TRIGGER IF EXISTS calculate_vat_on_update ON public.invoices;

CREATE TRIGGER calculate_vat_on_insert
BEFORE INSERT ON public.invoices
FOR EACH ROW
EXECUTE FUNCTION public.calculate_vat_on_invoice();

CREATE TRIGGER calculate_vat_on_update
BEFORE UPDATE ON public.invoices
FOR EACH ROW
WHEN (
  OLD.total_amount IS DISTINCT FROM NEW.total_amount
  OR OLD.business_type IS DISTINCT FROM NEW.business_type
  OR OLD.document_type IS DISTINCT FROM NEW.document_type
)
EXECUTE FUNCTION public.calculate_vat_on_invoice();

-- Backfill existing rows so stored VAT reflects new logic (especially foreign supplier => 0)
UPDATE public.invoices
SET
  business_type = CASE
    WHEN business_type IN ('ספק חול','ספק חו"ל','ספק חו״ל') THEN 'ספק חו"ל'
    WHEN business_type IN ('חברה בע"מ','חברה בע״מ') THEN 'חברה בע"מ'
    ELSE business_type
  END,
  amount_before_vat = CASE
    WHEN total_amount IS NULL OR total_amount <= 0 THEN NULL
    WHEN business_type IN ('ספק חול','ספק חו"ל','ספק חו״ל') THEN ROUND((total_amount)::numeric, 2)
    ELSE ROUND((total_amount / 1.18)::numeric, 2)
  END,
  vat_amount = CASE
    WHEN total_amount IS NULL OR total_amount <= 0 THEN NULL
    WHEN business_type IN ('ספק חול','ספק חו"ל','ספק חו״l','ספק חו״ל') THEN 0
    ELSE ROUND((total_amount - ROUND((total_amount / 1.18)::numeric, 2))::numeric, 2)
  END
WHERE total_amount IS NOT NULL;