-- Create a security definer function to check if user is admin
-- This prevents infinite recursion in user_roles policies
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'admin'
  )
$$;

-- Drop the problematic policy causing infinite recursion
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Recreate admin policy using the security definer function
CREATE POLICY "Admins can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (public.is_admin(auth.uid()));

-- Fix similar issues on other tables
DROP POLICY IF EXISTS "Admins can view all customers" ON public.customers;
CREATE POLICY "Admins can view all customers" 
ON public.customers 
FOR SELECT 
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can view all usage" ON public.document_usage;
CREATE POLICY "Admins can view all usage" 
ON public.document_usage 
FOR SELECT 
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage plans" ON public.subscription_plans;
CREATE POLICY "Admins can manage plans" 
ON public.subscription_plans 
FOR ALL 
USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON public.subscriptions;
CREATE POLICY "Admins can manage all subscriptions" 
ON public.subscriptions 
FOR ALL 
USING (public.is_admin(auth.uid()));