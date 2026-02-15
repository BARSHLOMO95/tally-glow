import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, Check, Sparkles, Zap, Crown, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface Plan {
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

const Pricing = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { subscription, plan: currentPlan, usage, loading: subLoading, createCheckout } = useSubscription();
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [autoCheckoutAttempted, setAutoCheckoutAttempted] = useState(false);

  useEffect(() => {
    const checkoutStatus = searchParams.get('checkout');
    if (checkoutStatus === 'success') {
      toast.success('תשלום בוצע בהצלחה! המנוי שלך פעיל');
    } else if (checkoutStatus === 'canceled') {
      toast.info('התשלום בוטל');
    }
  }, [searchParams]);

  useEffect(() => {
    const fetchPlans = async () => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('document_limit', { ascending: true });

      if (error) {
        console.error('Error fetching plans:', error);
      } else {
        setPlans(data?.map(p => ({
          ...p,
          features: p.features as string[],
        })) || []);
      }
      setLoading(false);
    };

    fetchPlans();
  }, []);

  const handleUpgrade = async (plan: Plan) => {
    // If still loading auth, wait
    if (authLoading) {
      toast.info('טוען...');
      return;
    }
    
    if (!user) {
      // Preserve intended checkout after login
      const redirect = encodeURIComponent(`/pricing?checkoutPlan=${plan.id}`);
      navigate(`/auth?redirect=${redirect}`);
      return;
    }

    if (plan.polar_product_id === 'free') {
      toast.info('אתה כבר בתוכנית החינמית');
      return;
    }

    setCheckoutLoading(plan.id);
    
    const checkoutUrl = await createCheckout(plan.polar_product_id);
    
    if (checkoutUrl) {
      window.location.href = checkoutUrl;
    } else {
      toast.error('שגיאה ביצירת תהליך התשלום');
      setCheckoutLoading(null);
    }
  };

  // If user was sent to auth first, auto-start checkout when returning to pricing
  useEffect(() => {
    const checkoutPlanId = searchParams.get('checkoutPlan');
    if (!checkoutPlanId) return;
    if (autoCheckoutAttempted) return;
    if (authLoading || loading || subLoading) return;
    if (!user) return;

    const planToCheckout = plans.find(p => p.id === checkoutPlanId);
    if (!planToCheckout) return;

    setAutoCheckoutAttempted(true);
    void handleUpgrade(planToCheckout);
  }, [searchParams, autoCheckoutAttempted, authLoading, loading, subLoading, user, plans]);

  const getPlanIcon = (index: number) => {
    const icons = [Zap, Sparkles, Crown];
    const Icon = icons[index] || Sparkles;
    return <Icon className="h-6 w-6" />;
  };

  const getPlanColor = (index: number) => {
    const colors = ['text-blue-500', 'text-purple-500', 'text-amber-500'];
    return colors[index] || 'text-primary';
  };

  const isCurrentPlan = (plan: Plan) => {
    if (!currentPlan) return plan.polar_product_id === 'free';
    return currentPlan.id === plan.id;
  };

  if (authLoading || loading || subLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Crown className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">תוכניות ומחירים</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">בחר את התוכנית המתאימה לך</h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            התחל בחינם עם 10 מסמכים בחודש, או שדרג לתוכנית מקצועית עם 50 מסמכים בחודש
          </p>
        </div>

        {/* Current Usage */}
        {user && (
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">השימוש שלך החודש</p>
                    <p className="text-sm text-muted-foreground">
                      {usage?.document_count || 0} מתוך {currentPlan?.document_limit === -1 ? '∞' : currentPlan?.document_limit || 10} מסמכים
                    </p>
                  </div>
                </div>
                <Badge variant={subscription?.status === 'active' ? 'default' : 'secondary'}>
                  {subscription?.status === 'active' ? 'מנוי פעיל' : 'תוכנית חינמית'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Billing Toggle */}
        <div className="flex justify-center mb-8">
          <Tabs value={billingInterval} onValueChange={(v) => setBillingInterval(v as 'monthly' | 'yearly')}>
            <TabsList className="grid w-64 grid-cols-2">
              <TabsTrigger value="monthly">חודשי</TabsTrigger>
              <TabsTrigger value="yearly" className="relative">
                שנתי
                <Badge variant="secondary" className="absolute -top-2 -left-2 text-xs px-1.5 py-0.5 bg-green-500 text-white border-0">
                  -20%
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, index) => {
            const isCurrent = isCurrentPlan(plan);
            const isPopular = index === 1;
            const price = billingInterval === 'monthly' 
              ? plan.price_monthly 
              : plan.price_yearly;
            
            return (
              <Card 
                key={plan.id} 
                className={`relative transition-all duration-300 hover:shadow-lg ${
                  isPopular ? 'border-primary shadow-md scale-[1.02]' : ''
                } ${isCurrent ? 'ring-2 ring-primary' : ''}`}
              >
                {isPopular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary">
                    הכי פופולרי
                  </Badge>
                )}
                
                {isCurrent && (
                  <Badge variant="outline" className="absolute -top-3 right-4 bg-background">
                    התוכנית שלך
                  </Badge>
                )}

                <CardHeader className="text-center pb-2">
                  <div className={`mx-auto mb-2 ${getPlanColor(index)}`}>
                    {getPlanIcon(index)}
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="text-center">
                <div className="mb-6">
                    <span className="text-4xl font-bold">
                      {price === 0 ? 'חינם' : `$${price}`}
                    </span>
                    {price !== 0 && (
                      <span className="text-muted-foreground">
                        /{billingInterval === 'monthly' ? 'חודש' : 'שנה'}
                      </span>
                    )}
                  </div>

                  <ul className="space-y-3 text-right mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="h-5 w-5 text-green-500 shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                    <li className="flex items-center gap-2">
                      <Check className="h-5 w-5 text-green-500 shrink-0" />
                      <span className="text-sm font-medium">
                        {plan.document_limit === -1 
                          ? 'מסמכים ללא הגבלה' 
                          : `${plan.document_limit} מסמכים בחודש`}
                      </span>
                    </li>
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button 
                    className="w-full" 
                    variant={isPopular ? 'default' : 'outline'}
                    disabled={isCurrent || checkoutLoading === plan.id}
                    onClick={() => handleUpgrade(plan)}
                  >
                    {checkoutLoading === plan.id ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    ) : null}
                    {isCurrent ? 'התוכנית הנוכחית' : plan.price_monthly === 0 ? 'התחל בחינם' : 'שדרג עכשיו'}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-16 text-center">
          <h3 className="text-2xl font-bold mb-8">שאלות נפוצות</h3>
          <div className="grid md:grid-cols-2 gap-6 text-right max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">איך עובד מעקב המסמכים?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  כל חשבונית או מסמך שאתה מעלה נספר במכסה החודשית שלך. 
                  המכסה מתאפסת בתחילת כל חודש.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">האם אפשר לבטל בכל עת?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  כן! אפשר לבטל את המנוי בכל עת. המנוי ימשיך עד סוף תקופת החיוב הנוכחית.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">מה קורה אם אגיע למגבלה?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  תקבל התראה כשתתקרב למגבלה. אפשר לשדרג בכל עת כדי להמשיך להעלות מסמכים.
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">האם יש תמיכה טכנית?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  בהחלט! כל המשתמשים מקבלים תמיכה. מנויים בתשלום מקבלים תמיכה מועדפת.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Pricing;
