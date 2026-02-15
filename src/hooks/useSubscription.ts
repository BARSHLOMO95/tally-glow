import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface SubscriptionPlan {
  id: string;
  polar_product_id: string;
  name: string;
  description: string | null;
  price_monthly: number | null;
  price_yearly: number | null;
  document_limit: number;
  features: string[];
  is_active: boolean;
}

interface Subscription {
  id: string;
  customer_id: string;
  plan_id: string | null;
  polar_subscription_id: string | null;
  status: 'free' | 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

interface DocumentUsage {
  document_count: number;
  month_year: string;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [usage, setUsage] = useState<DocumentUsage | null>(null);
  const [loading, setLoading] = useState(true);

  const getCurrentMonthYear = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setPlan(null);
      setUsage(null);
      setLoading(false);
      return;
    }

    try {
      // Get customer and subscription
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (customer) {
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('customer_id', customer.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (sub) {
          setSubscription(sub as Subscription);

          // Get plan details if subscription has a plan
          if (sub.plan_id) {
            const { data: planData } = await supabase
              .from('subscription_plans')
              .select('*')
              .eq('id', sub.plan_id)
              .single();

            if (planData) {
              setPlan({
                ...planData,
                features: planData.features as string[],
              } as SubscriptionPlan);
            }
          } else {
            // Get free plan
            const { data: freePlan } = await supabase
              .from('subscription_plans')
              .select('*')
              .eq('polar_product_id', 'free')
              .single();

            if (freePlan) {
              setPlan({
                ...freePlan,
                features: freePlan.features as string[],
              } as SubscriptionPlan);
            }
          }
        }
      } else {
        // No customer yet - use free plan defaults
        const { data: freePlan } = await supabase
          .from('subscription_plans')
          .select('*')
          .eq('polar_product_id', 'free')
          .single();

        if (freePlan) {
          setPlan({
            ...freePlan,
            features: freePlan.features as string[],
          } as SubscriptionPlan);
        }
        setSubscription({
          id: '',
          customer_id: '',
          plan_id: null,
          polar_subscription_id: null,
          status: 'free',
          current_period_start: null,
          current_period_end: null,
          cancel_at_period_end: false,
        });
      }

      // Get current month usage
      const monthYear = getCurrentMonthYear();
      const { data: usageData } = await supabase
        .from('document_usage')
        .select('document_count, month_year')
        .eq('user_id', user.id)
        .eq('month_year', monthYear)
        .single();

      setUsage(usageData || { document_count: 0, month_year: monthYear });

    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const incrementUsage = async (): Promise<boolean> => {
    if (!user) return false;

    const monthYear = getCurrentMonthYear();
    const documentLimit = plan?.document_limit || 10;
    const currentCount = usage?.document_count || 0;

    // Check if limit is reached (applies to all users including active subscribers)
    if (currentCount >= documentLimit) {
      return false;
    }

    // Upsert usage
    const { error } = await supabase
      .from('document_usage')
      .upsert({
        user_id: user.id,
        month_year: monthYear,
        document_count: currentCount + 1,
      }, {
        onConflict: 'user_id,month_year',
      });

    if (error) {
      console.error('Error incrementing usage:', error);
      return false;
    }

    setUsage({ document_count: currentCount + 1, month_year: monthYear });
    return true;
  };

  const canUploadDocument = (): boolean => {
    const limit = plan?.document_limit || 10;
    return (usage?.document_count || 0) < limit;
  };

  const getRemainingDocuments = (): number => {
    const limit = plan?.document_limit || 10;
    return Math.max(0, limit - (usage?.document_count || 0));
  };

  const createCheckout = async (productId: string): Promise<string | null> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return null;

      const response = await supabase.functions.invoke('create-checkout', {
        body: { product_id: productId },
      });

      if (response.error) {
        console.error('Checkout error:', response.error);
        return null;
      }

      return response.data.checkout_url;
    } catch (error) {
      console.error('Error creating checkout:', error);
      return null;
    }
  };

  return {
    subscription,
    plan,
    usage,
    loading,
    canUploadDocument,
    getRemainingDocuments,
    incrementUsage,
    createCheckout,
    refetch: fetchSubscription,
  };
}
