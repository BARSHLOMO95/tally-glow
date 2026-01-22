import { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Upload, 
  Zap, 
  Shield, 
  BarChart3, 
  MessageCircle,
  Check,
  ArrowLeft,
  Sparkles,
  Clock,
  Users,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Plan {
  id: string;
  name: string;
  description: string | null;
  document_limit: number;
  price_monthly: number | null;
  price_yearly: number | null;
  features: string[] | null;
  polar_product_id: string;
}

const Landing = () => {
  const { user, loading } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');

  useEffect(() => {
    const fetchPlans = async () => {
      const { data } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('document_limit', { ascending: true });
      
      if (data) {
        setPlans(data.map(plan => ({
          ...plan,
          features: Array.isArray(plan.features) ? plan.features as string[] : []
        })));
      }
    };
    fetchPlans();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const features = [
    {
      icon: Upload,
      title: 'העלאה חכמה',
      description: 'העלו חשבוניות דרך לינק ייחודי או ישירות מהמערכת',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      icon: Zap,
      title: 'עיבוד אוטומטי',
      description: 'זיהוי חכם של נתוני החשבונית באמצעות AI',
      color: 'from-yellow-500 to-orange-500'
    },
    {
      icon: MessageCircle,
      title: 'התראות וואטסאפ',
      description: 'קבלו עדכונים ישירות לוואטסאפ על כל חשבונית חדשה',
      color: 'from-green-500 to-emerald-500'
    },
    {
      icon: BarChart3,
      title: 'דוחות מתקדמים',
      description: 'צפו בסטטיסטיקות ודוחות מפורטים בזמן אמת',
      color: 'from-purple-500 to-pink-500'
    },
    {
      icon: Shield,
      title: 'אבטחה מקסימלית',
      description: 'הנתונים שלכם מוגנים בהצפנה מתקדמת',
      color: 'from-red-500 to-rose-500'
    },
    {
      icon: Clock,
      title: 'חיסכון בזמן',
      description: 'חסכו שעות עבודה בניהול חשבוניות',
      color: 'from-indigo-500 to-violet-500'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5" dir="rtl">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">InvoiceAI</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost">התחברות</Button>
            </Link>
            <Link to="/auth">
              <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70">
                התחל עכשיו
                <ArrowLeft className="w-4 h-4 mr-2" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge className="mb-6 bg-primary/10 text-primary border-primary/20 px-4 py-2">
              <Sparkles className="w-4 h-4 ml-2" />
              מערכת ניהול חשבוניות חכמה
            </Badge>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight">
              נהלו את החשבוניות
              <br />
              <span className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                בקלות ויעילות
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
              העלו חשבוניות, קבלו עיבוד אוטומטי עם AI, והתראות לוואטסאפ. 
              הכל במקום אחד, בקלות ובמהירות.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth">
                <Button size="lg" className="text-lg px-8 py-6 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-500 shadow-lg shadow-primary/25">
                  התחל בחינם
                  <ArrowLeft className="w-5 h-5 mr-2" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="text-lg px-8 py-6">
                צפה בהדגמה
              </Button>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div 
            className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {[
              { value: '10,000+', label: 'חשבוניות עובדו' },
              { value: '500+', label: 'לקוחות פעילים' },
              { value: '99.9%', label: 'דיוק עיבוד' },
              { value: '24/7', label: 'תמיכה זמינה' }
            ].map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-transparent to-muted/30">
        <div className="container mx-auto">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              כל מה שצריך לניהול חשבוניות
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              פתרון מקיף ומתקדם לניהול כל החשבוניות שלכם במקום אחד
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50 bg-card/50 backdrop-blur">
                  <CardHeader>
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                      <feature.icon className="w-6 h-6 text-white" />
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4" id="pricing">
        <div className="container mx-auto">
          <motion.div 
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              תוכניות ומחירים
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto mb-8">
              בחרו את התוכנית המתאימה לעסק שלכם
            </p>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4 mb-8">
              <button
                onClick={() => setBillingInterval('monthly')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  billingInterval === 'monthly' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                חודשי
              </button>
              <button
                onClick={() => setBillingInterval('yearly')}
                className={`px-4 py-2 rounded-lg transition-all ${
                  billingInterval === 'yearly' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                שנתי
                <Badge className="mr-2 bg-green-500/20 text-green-600 border-green-500/30">
                  חסכון 20%
                </Badge>
              </button>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Free Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Card className="h-full border-border/50 bg-card/50 backdrop-blur">
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-2xl">חינם</CardTitle>
                  <CardDescription>להתחלה</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">$0</span>
                    <span className="text-muted-foreground">/לחודש</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {['עד 10 מסמכים בחודש', 'עיבוד AI בסיסי', 'לינק העלאה אחד', 'תמיכה במייל'].map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-green-500" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/auth" className="block">
                    <Button className="w-full" variant="outline">
                      התחל בחינם
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>

            {plans.filter(p => p.price_monthly && p.price_monthly > 0).slice(0, 2).map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (index + 1) * 0.1 }}
              >
                <Card className={`h-full relative ${index === 0 ? 'border-primary shadow-lg shadow-primary/20' : 'border-border/50'} bg-card/50 backdrop-blur`}>
                  {index === 0 && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-primary to-purple-600 text-white border-0">
                        הכי פופולרי
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-2">
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">
                        ${billingInterval === 'monthly' ? plan.price_monthly : plan.price_yearly}
                      </span>
                      <span className="text-muted-foreground">
                        /{billingInterval === 'monthly' ? 'חודש' : 'שנה'}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-3">
                      <li className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-green-500" />
                        <span>עד {plan.document_limit} מסמכים בחודש</span>
                      </li>
                      {plan.features?.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Check className="w-5 h-5 text-green-500" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Link to="/auth" className="block">
                      <Button className={`w-full ${index === 0 ? 'bg-gradient-to-r from-primary to-purple-600' : ''}`}>
                        בחר תוכנית
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <motion.div 
            className="bg-gradient-to-r from-primary via-purple-600 to-pink-600 rounded-3xl p-8 md:p-16 text-center text-white relative overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIgMS44LTQgNC00czQgMS44IDQgNC0xLjggNC00IDQtNC0xLjgtNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-5xl font-bold mb-6">
                מוכנים להתחיל?
              </h2>
              <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto mb-8">
                הצטרפו לאלפי עסקים שכבר משתמשים במערכת שלנו לניהול חשבוניות חכם ויעיל
              </p>
              <Link to="/auth">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 text-lg px-8 py-6">
                  התחל עכשיו בחינם
                  <ArrowLeft className="w-5 h-5 mr-2" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border bg-muted/30">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/70 rounded-xl flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">InvoiceAI</span>
            </div>
            <p className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} InvoiceAI. כל הזכויות שמורות.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
