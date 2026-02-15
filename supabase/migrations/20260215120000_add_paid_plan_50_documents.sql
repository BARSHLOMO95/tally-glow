-- Add paid subscription plan with 50 documents/month limit
INSERT INTO public.subscription_plans (polar_product_id, name, description, document_limit, price_monthly, price_yearly, features)
VALUES
  ('pro', 'מקצועי', 'תוכנית מקצועית עם 50 מסמכים בחודש', 50, 29, 279, '["50 מסמכים בחודש", "שמירה בענן", "דוחות מתקדמים", "סנכרון Gmail", "תמיכה מועדפת"]'::jsonb)
ON CONFLICT (polar_product_id) DO UPDATE SET document_limit = 50;
