import { useState, useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion, useScroll, useSpring, useInView } from 'framer-motion';
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
  Check,
  ArrowLeft,
  Sparkles,
  Clock,
  Users,
  Loader2,
  Star,
  Mail,
  Menu,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import SystemMockup from '@/components/landing/SystemMockup';
import FloatingCards from '@/components/landing/FloatingCards';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import LogoCloud from '@/components/landing/LogoCloud';
import LiveMetrics from '@/components/landing/LiveMetrics';
import BeforeAfter from '@/components/landing/BeforeAfter';

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

// Clean, minimal animated counter
const AnimatedCounter = ({ value }: { value: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  
  return (
    <span ref={ref} className="tabular-nums">
      {isInView ? (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {value}
        </motion.span>
      ) : '0'}
    </span>
  );
};

const Landing = () => {
  const { user, loading } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  const heroRef = useRef(null);
  const heroInView = useInView(heroRef, { once: true });

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
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
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
      description: 'העלו חשבוניות דרך לינק ייחודי, מייל או ישירות מהמערכת',
      delay: 0
    },
    {
      icon: Zap,
      title: 'עיבוד AI מתקדם',
      description: 'זיהוי אוטומטי של כל נתוני החשבונית תוך שניות',
      delay: 0.1
    },
    {
      icon: Mail,
      title: 'סנכרון Gmail',
      description: 'קליטה אוטומטית של חשבוניות ישירות מתיבת המייל',
      delay: 0.2
    },
    {
      icon: BarChart3,
      title: 'דוחות וניתוחים',
      description: 'תובנות עסקיות ודוחות מפורטים בזמן אמת',
      delay: 0.3
    },
    {
      icon: Shield,
      title: 'אבטחה מקסימלית',
      description: 'הצפנה מתקדמת והגנה על כל הנתונים שלכם',
      delay: 0.4
    },
    {
      icon: Clock,
      title: 'חיסכון בזמן',
      description: 'חסכו שעות של עבודה ידנית בניהול חשבוניות',
      delay: 0.5
    }
  ];

  const stats = [
    { value: '50K+', label: 'חשבוניות', icon: FileText },
    { value: '2.5K+', label: 'עסקים', icon: Users },
    { value: '99.9%', label: 'דיוק', icon: Sparkles },
    { value: '4.9', label: 'דירוג', icon: Star }
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden" dir="rtl">
      {/* Minimal progress bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-0.5 bg-primary z-[100] origin-right"
        style={{ scaleX }}
      />

      {/* Clean Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">InvoiceAI</span>
          </Link>
          
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm">התחברות</Button>
            </Link>
            <Link to="/auth">
              <Button size="sm">התחל עכשיו</Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden p-2 -mr-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:hidden border-t border-border/40 bg-background"
          >
            <div className="p-4 space-y-2">
              <Link to="/auth" className="block" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start">התחברות</Button>
              </Link>
              <Link to="/auth" className="block" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full">התחל עכשיו</Button>
              </Link>
            </div>
          </motion.div>
        )}
      </header>

      {/* Hero Section - Clean & Modern */}
      <section ref={heroRef} className="relative pt-20 md:pt-24 px-4">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] translate-x-1/3 -translate-y-1/2" />
        </div>
        
        <div className="container mx-auto relative z-10 pt-8 md:pt-16">
          <motion.div
            className="text-center max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.1 }}
            >
              <Badge variant="secondary" className="mb-4 md:mb-6">
                <Sparkles className="w-3 h-3 ml-1" />
                מבוסס AI מתקדם
              </Badge>
            </motion.div>
            
            <motion.h1 
              className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 md:mb-6 tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 }}
            >
              ניהול חשבוניות{' '}
              <span className="text-primary">חכם ואוטומטי</span>
            </motion.h1>
            
            <motion.p 
              className="text-muted-foreground text-base md:text-lg lg:text-xl max-w-2xl mx-auto mb-6 md:mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.3 }}
            >
              העלו חשבוניות וקבלו עיבוד אוטומטי עם בינה מלאכותית. 
              חסכו זמן, הפחיתו טעויות, וקבלו שליטה מלאה.
            </motion.p>

            <motion.div 
              className="flex flex-col sm:flex-row items-center justify-center gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.4 }}
            >
              <Link to="/auth" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto px-8">
                  התחל בחינם
                  <ArrowLeft className="w-4 h-4 mr-2" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="w-full sm:w-auto px-8">
                צפה בהדגמה
              </Button>
            </motion.div>

            {/* Stats - inline on mobile */}
            <motion.div 
              className="flex flex-wrap justify-center gap-6 md:gap-10 mt-8 md:mt-12 text-center"
              initial={{ opacity: 0 }}
              animate={heroInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.5 }}
            >
              {stats.map((stat, i) => (
                <div key={i} className="flex items-center gap-2">
                  <stat.icon className="w-4 h-4 text-primary" />
                  <span className="font-bold"><AnimatedCounter value={stat.value} /></span>
                  <span className="text-muted-foreground text-sm">{stat.label}</span>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* System Mockup with floating cards */}
          <div className="mt-10 md:mt-16 relative">
            <FloatingCards />
            <SystemMockup />
          </div>
        </div>
      </section>

      {/* Logo Cloud */}
      <LogoCloud />

      {/* Live Metrics */}
      <LiveMetrics />

      {/* Features Section */}
      <section className="py-16 md:py-24 px-4">
        <div className="container mx-auto">
          <motion.div 
            className="text-center mb-10 md:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3">
              כל מה שצריך במקום אחד
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              פתרון מקיף לניהול חשבוניות בצורה חכמה ויעילה
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: feature.delay }}
              >
                <Card className="h-full border-border/50 hover:border-primary/30 transition-colors">
                  <CardHeader className="pb-2">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                      <feature.icon className="w-5 h-5 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 md:py-24 px-4 bg-muted/30">
        <div className="container mx-auto">
          <motion.div 
            className="text-center mb-10 md:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3">
              איך זה עובד?
            </h2>
            <p className="text-muted-foreground">שלושה צעדים פשוטים</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-4xl mx-auto">
            {[
              { step: '1', title: 'העלאה', desc: 'העלו חשבונית - תמונה, PDF או מייל', icon: Upload },
              { step: '2', title: 'עיבוד', desc: 'ה-AI מזהה את כל הנתונים אוטומטית', icon: Zap },
              { step: '3', title: 'ניהול', desc: 'צפו בדוחות וקבלו תובנות עסקיות', icon: BarChart3 }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Before & After */}
      <BeforeAfter />

      {/* Testimonials */}
      <TestimonialsSection />

      {/* Pricing Section */}
      <section className="py-16 md:py-24 px-4" id="pricing">
        <div className="container mx-auto">
          <motion.div 
            className="text-center mb-10 md:mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3">
              תוכניות ומחירים
            </h2>
            <p className="text-muted-foreground mb-6">בחרו את התוכנית המתאימה לכם</p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center gap-1 p-1 bg-muted rounded-lg">
              <button
                onClick={() => setBillingInterval('monthly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  billingInterval === 'monthly' 
                    ? 'bg-background shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                חודשי
              </button>
              <button
                onClick={() => setBillingInterval('yearly')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${
                  billingInterval === 'yearly' 
                    ? 'bg-background shadow-sm' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                שנתי
                <Badge variant="secondary" className="text-xs">-20%</Badge>
              </button>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
            {/* Free Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Card className="h-full">
                <CardHeader className="text-center pb-2">
                  <CardTitle>חינם</CardTitle>
                  <CardDescription>להתחלה</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">$0</span>
                    <span className="text-muted-foreground">/חודש</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {['עד 10 מסמכים בחודש', 'עיבוד AI בסיסי', 'לינק העלאה אחד'].map((feature, i) => (
                      <li key={i} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link to="/auth" className="block">
                    <Button variant="outline" className="w-full">התחל בחינם</Button>
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
                <Card className={`h-full relative ${index === 0 ? 'border-primary shadow-lg' : ''}`}>
                  {index === 0 && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary">הכי פופולרי</Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-2 pt-6">
                    <CardTitle>{plan.name}</CardTitle>
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
                      <li className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="font-medium">עד {plan.document_limit} מסמכים בחודש</span>
                      </li>
                      {plan.features?.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Link to="/auth" className="block">
                      <Button className={`w-full ${index === 0 ? '' : 'variant-outline'}`}>
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
      <section className="py-16 md:py-24 px-4">
        <div className="container mx-auto">
          <motion.div 
            className="bg-primary text-primary-foreground rounded-2xl md:rounded-3xl p-8 md:p-12 lg:p-16 text-center"
            initial={{ opacity: 0, scale: 0.98 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
              מוכנים להתחיל?
            </h2>
            <p className="text-primary-foreground/80 max-w-xl mx-auto mb-6 md:mb-8">
              הצטרפו לאלפי עסקים שכבר משתמשים במערכת לניהול חשבוניות חכם
            </p>
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="px-8">
                התחל עכשיו בחינם
                <ArrowLeft className="w-4 h-4 mr-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold">InvoiceAI</span>
          </div>
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} InvoiceAI. כל הזכויות שמורות.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
