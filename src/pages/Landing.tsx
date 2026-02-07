import { useState, useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useSpring, useInView } from 'framer-motion';
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
  Loader2,
  ChevronDown,
  Star,
  Mail
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

// Floating particles component
const FloatingParticles = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-gradient-to-r from-primary/30 to-purple-500/30"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, Math.random() * 20 - 10, 0],
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 5 + Math.random() * 5,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        />
      ))}
    </div>
  );
};

// Aurora background component
const AuroraBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-primary/20 via-purple-500/10 to-transparent rounded-full blur-3xl animate-aurora" />
      <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-pink-500/20 via-primary/10 to-transparent rounded-full blur-3xl animate-aurora" style={{ animationDelay: '-7s' }} />
      <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-gradient-to-r from-cyan-500/10 via-primary/10 to-purple-500/10 rounded-full blur-3xl animate-aurora" style={{ animationDelay: '-3s' }} />
    </div>
  );
};

// 3D Card component
const Card3D = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    setRotateX((y - centerY) / 20);
    setRotateY((centerX - x) / 20);
  };

  const handleMouseLeave = () => {
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transformStyle: 'preserve-3d',
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {children}
    </motion.div>
  );
};

// Animated counter
const AnimatedCounter = ({ value, suffix = '' }: { value: string; suffix?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const numericValue = parseInt(value.replace(/[^0-9]/g, '')) || 0;
  
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
      {suffix}
    </span>
  );
};

const Landing = () => {
  const { user, loading } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
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
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          <Loader2 className="w-10 h-10 text-primary" />
        </motion.div>
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
      color: 'from-blue-500 to-cyan-400',
      delay: 0
    },
    {
      icon: Zap,
      title: 'עיבוד AI מתקדם',
      description: 'זיהוי אוטומטי של כל נתוני החשבונית תוך שניות',
      color: 'from-amber-400 to-orange-500',
      delay: 0.1
    },
    {
      icon: Mail,
      title: 'סנכרון Gmail',
      description: 'קליטה אוטומטית של חשבוניות ישירות מתיבת המייל',
      color: 'from-red-500 to-pink-500',
      delay: 0.2
    },
    {
      icon: BarChart3,
      title: 'דוחות וניתוחים',
      description: 'תובנות עסקיות ודוחות מפורטים בזמן אמת',
      color: 'from-violet-500 to-purple-600',
      delay: 0.3
    },
    {
      icon: Shield,
      title: 'אבטחה מקסימלית',
      description: 'הצפנה מתקדמת והגנה על כל הנתונים שלכם',
      color: 'from-emerald-400 to-green-600',
      delay: 0.4
    },
    {
      icon: Clock,
      title: 'חיסכון בזמן',
      description: 'חסכו שעות של עבודה ידנית בניהול חשבוניות',
      color: 'from-sky-400 to-blue-600',
      delay: 0.5
    }
  ];

  const stats = [
    { value: '50,000+', label: 'חשבוניות עובדו', icon: FileText },
    { value: '2,500+', label: 'עסקים פעילים', icon: Users },
    { value: '99.9%', label: 'דיוק AI', icon: Sparkles },
    { value: '4.9', label: 'דירוג לקוחות', icon: Star }
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden" dir="rtl">
      {/* Progress bar */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500 z-[100] origin-right"
        style={{ scaleX }}
      />

      {/* Header */}
      <motion.header 
        className="fixed top-0 left-0 right-0 z-50 glass"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-3"
            whileHover={{ scale: 1.05 }}
          >
            <div className="relative">
              <div className="w-11 h-11 bg-gradient-to-br from-primary via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center animate-pulse-glow">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-500 rounded-2xl blur opacity-30 animate-pulse" />
            </div>
            <span className="text-xl font-bold gradient-text">InvoiceAI</span>
          </motion.div>
          
          <div className="flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" className="hidden sm:flex">התחברות</Button>
            </Link>
            <Link to="/auth">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button className="relative overflow-hidden bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-500 shadow-lg shadow-primary/25 group">
                  <span className="relative z-10 flex items-center">
                    התחל עכשיו
                    <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Button>
              </motion.div>
            </Link>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-32 pb-20 px-4 min-h-screen flex items-center">
        <AuroraBackground />
        <FloatingParticles />
        <div className="absolute inset-0 grid-pattern" />
        
        <div className="container mx-auto text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={heroInView ? { scale: 1, opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <Badge className="mb-8 bg-gradient-to-r from-primary/20 to-purple-500/20 text-primary border-primary/30 px-6 py-3 text-sm backdrop-blur-sm">
                <Sparkles className="w-4 h-4 ml-2 animate-pulse" />
                מערכת ניהול חשבוניות מבוססת AI
              </Badge>
            </motion.div>
            
            <motion.h1 
              className="text-5xl md:text-7xl lg:text-8xl font-black mb-8 leading-tight"
              initial={{ opacity: 0, y: 30 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.3 }}
            >
              <span className="block mb-2">ניהול חשבוניות</span>
              <span className="relative">
                <span className="gradient-text animate-text-glow">
                  בעידן החדש
                </span>
                <motion.span 
                  className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500 rounded-full"
                  initial={{ scaleX: 0 }}
                  animate={heroInView ? { scaleX: 1 } : {}}
                  transition={{ duration: 0.8, delay: 0.8 }}
                />
              </span>
            </motion.h1>
            
            <motion.p 
              className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.5 }}
            >
              העלו חשבוניות, קבלו עיבוד אוטומטי עם 
              <span className="text-primary font-semibold"> בינה מלאכותית מתקדמת</span>, 
              סנכרון מ-Gmail, והתראות בזמן אמת.
            </motion.p>

            <motion.div 
              className="flex flex-col sm:flex-row items-center justify-center gap-5"
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.8, delay: 0.7 }}
            >
              <Link to="/auth">
                <motion.div 
                  whileHover={{ scale: 1.05, y: -2 }} 
                  whileTap={{ scale: 0.95 }}
                >
                  <Button size="lg" className="text-lg px-10 py-7 bg-gradient-to-r from-primary via-purple-600 to-pink-500 hover:opacity-90 shadow-2xl shadow-primary/30 rounded-2xl group relative overflow-hidden">
                    <span className="relative z-10 flex items-center font-semibold">
                      התחל בחינם
                      <ArrowLeft className="w-5 h-5 mr-3 group-hover:-translate-x-2 transition-transform" />
                    </span>
                    <div className="absolute inset-0 animate-shimmer" />
                  </Button>
                </motion.div>
              </Link>
              <motion.div 
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.95 }}
              >
                <Button size="lg" variant="outline" className="text-lg px-10 py-7 rounded-2xl border-2 backdrop-blur-sm hover:bg-primary/5">
                  <span className="flex items-center">
                    צפה בהדגמה
                    <motion.span
                      className="mr-2"
                      animate={{ x: [0, 5, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    >
                      ▶
                    </motion.span>
                  </span>
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Stats */}
          <motion.div 
            className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8"
            initial={{ opacity: 0, y: 40 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.8, delay: 0.9 }}
          >
            {stats.map((stat, index) => (
              <Card3D key={index} className="group">
                <div className="glass-dark rounded-2xl p-6 text-center hover-lift">
                  <stat.icon className="w-8 h-8 mx-auto mb-3 text-primary opacity-80" />
                  <div className="text-3xl md:text-4xl font-black gradient-text mb-1">
                    <AnimatedCounter value={stat.value} />
                  </div>
                  <div className="text-muted-foreground text-sm">{stat.label}</div>
                </div>
              </Card3D>
            ))}
          </motion.div>

          {/* Scroll indicator */}
          <motion.div 
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ChevronDown className="w-8 h-8 text-muted-foreground/50" />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-32 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent" />
        
        <div className="container mx-auto relative z-10">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="mb-6 bg-primary/10 text-primary border-primary/20">יכולות המערכת</Badge>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6">
              כל מה שצריך
              <span className="gradient-text block mt-2">במקום אחד</span>
            </h2>
            <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
              פתרון מקיף ומתקדם לניהול כל החשבוניות שלכם בצורה חכמה ויעילה
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: feature.delay, duration: 0.6 }}
              >
                <Card3D className="h-full">
                  <Card className="h-full border-0 bg-gradient-to-br from-card/80 to-card/40 backdrop-blur-xl hover-lift overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <CardHeader className="relative">
                      <motion.div 
                        className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 shadow-lg`}
                        whileHover={{ scale: 1.1, rotate: 5 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                      >
                        <feature.icon className="w-8 h-8 text-white" />
                      </motion.div>
                      <CardTitle className="text-2xl font-bold">{feature.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-base leading-relaxed">
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </Card3D>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-32 px-4 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto relative z-10">
          <motion.div 
            className="text-center mb-20"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="mb-6 bg-primary/10 text-primary border-primary/20">איך זה עובד</Badge>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6">
              שלושה צעדים
              <span className="gradient-text block mt-2">וזהו!</span>
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { step: '01', title: 'העלאה', desc: 'העלו חשבונית בכל דרך - תמונה, PDF, מייל או לינק ייחודי', icon: Upload },
              { step: '02', title: 'עיבוד אוטומטי', desc: 'ה-AI מזהה ומעבד את כל הנתונים תוך שניות', icon: Zap },
              { step: '03', title: 'ניהול מלא', desc: 'צפו בדוחות, נהלו ספקים וקבלו תובנות עסקיות', icon: BarChart3 }
            ].map((item, index) => (
              <motion.div
                key={index}
                className="relative"
                initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2, duration: 0.6 }}
              >
                <div className="glass-dark rounded-3xl p-8 text-center relative overflow-hidden group hover-lift">
                  <div className="absolute -top-4 -right-4 text-8xl font-black text-primary/5 group-hover:text-primary/10 transition-colors">
                    {item.step}
                  </div>
                  <motion.div 
                    className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center"
                    whileHover={{ scale: 1.1, rotate: -5 }}
                  >
                    <item.icon className="w-10 h-10 text-white" />
                  </motion.div>
                  <h3 className="text-2xl font-bold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
                {index < 2 && (
                  <div className="hidden md:block absolute top-1/2 -left-4 w-8 h-0.5 bg-gradient-to-r from-primary to-purple-500" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-32 px-4 relative" id="pricing">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        
        <div className="container mx-auto relative z-10">
          <motion.div 
            className="text-center mb-16"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge className="mb-6 bg-primary/10 text-primary border-primary/20">תוכניות ומחירים</Badge>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6">
              בחרו את התוכנית
              <span className="gradient-text block mt-2">המושלמת לכם</span>
            </h2>

            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-2 mt-10">
              <motion.div 
                className="glass-dark rounded-full p-1.5 flex items-center"
                layout
              >
                <button
                  onClick={() => setBillingInterval('monthly')}
                  className={`px-6 py-3 rounded-full font-medium transition-all ${
                    billingInterval === 'monthly' 
                      ? 'bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  חודשי
                </button>
                <button
                  onClick={() => setBillingInterval('yearly')}
                  className={`px-6 py-3 rounded-full font-medium transition-all flex items-center gap-2 ${
                    billingInterval === 'yearly' 
                      ? 'bg-gradient-to-r from-primary to-purple-600 text-white shadow-lg' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  שנתי
                  <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-xs">
                    -20%
                  </Badge>
                </button>
              </motion.div>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Plan */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <Card3D className="h-full">
                <Card className="h-full border-0 glass-dark overflow-hidden">
                  <CardHeader className="text-center pb-4">
                    <CardTitle className="text-2xl font-bold">חינם</CardTitle>
                    <CardDescription>להתחלה ולהתנסות</CardDescription>
                    <div className="mt-6">
                      <span className="text-5xl font-black gradient-text">$0</span>
                      <span className="text-muted-foreground">/לחודש</span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <ul className="space-y-4">
                      {['עד 10 מסמכים בחודש', 'עיבוד AI בסיסי', 'לינק העלאה אחד', 'תמיכה במייל'].map((feature, i) => (
                        <li key={i} className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                            <Check className="w-4 h-4 text-green-500" />
                          </div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    <Link to="/auth" className="block">
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button className="w-full py-6 rounded-xl" variant="outline">
                          התחל בחינם
                        </Button>
                      </motion.div>
                    </Link>
                  </CardContent>
                </Card>
              </Card3D>
            </motion.div>

            {plans.filter(p => p.price_monthly && p.price_monthly > 0).slice(0, 2).map((plan, index) => (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (index + 1) * 0.15 }}
              >
                <Card3D className="h-full">
                  <Card className={`h-full relative overflow-hidden border-0 ${
                    index === 0 
                      ? 'bg-gradient-to-br from-primary/20 via-purple-500/10 to-pink-500/10 ring-2 ring-primary/50' 
                      : 'glass-dark'
                  }`}>
                    {index === 0 && (
                      <>
                        <div className="absolute -top-px left-0 right-0 h-1 bg-gradient-to-r from-primary via-purple-500 to-pink-500" />
                        <motion.div 
                          className="absolute -top-10 left-1/2 -translate-x-1/2"
                          initial={{ y: -20, opacity: 0 }}
                          whileInView={{ y: 0, opacity: 1 }}
                          viewport={{ once: true }}
                        >
                          <Badge className="bg-gradient-to-r from-primary to-purple-600 text-white border-0 px-4 py-1.5 shadow-lg">
                            <Sparkles className="w-3 h-3 ml-1" />
                            הכי פופולרי
                          </Badge>
                        </motion.div>
                      </>
                    )}
                    <CardHeader className="text-center pb-4 pt-8">
                      <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                      <CardDescription>{plan.description}</CardDescription>
                      <div className="mt-6">
                        <span className="text-5xl font-black gradient-text">
                          ${billingInterval === 'monthly' ? plan.price_monthly : plan.price_yearly}
                        </span>
                        <span className="text-muted-foreground">
                          /{billingInterval === 'monthly' ? 'חודש' : 'שנה'}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <ul className="space-y-4">
                        <li className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                            <Check className="w-4 h-4 text-green-500" />
                          </div>
                          <span className="font-medium">עד {plan.document_limit} מסמכים בחודש</span>
                        </li>
                        {plan.features?.map((feature, i) => (
                          <li key={i} className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                              <Check className="w-4 h-4 text-green-500" />
                            </div>
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      <Link to="/auth" className="block">
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button className={`w-full py-6 rounded-xl ${
                            index === 0 
                              ? 'bg-gradient-to-r from-primary to-purple-600 hover:opacity-90 shadow-lg shadow-primary/25' 
                              : ''
                          }`}>
                            בחר תוכנית
                          </Button>
                        </motion.div>
                      </Link>
                    </CardContent>
                  </Card>
                </Card3D>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-4">
        <div className="container mx-auto">
          <motion.div 
            className="relative rounded-[3rem] overflow-hidden"
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-600 to-pink-600 animate-gradient-shift" />
            <div className="absolute inset-0">
              <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.2),transparent_50%)]" />
              <div className="absolute bottom-0 right-0 w-full h-full bg-[radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.15),transparent_50%)]" />
            </div>
            
            <div className="relative z-10 p-12 md:p-20 text-center text-white">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <h2 className="text-4xl md:text-6xl font-black mb-8">
                  מוכנים להתחיל?
                </h2>
                <p className="text-xl md:text-2xl opacity-90 max-w-3xl mx-auto mb-12 leading-relaxed">
                  הצטרפו לאלפי עסקים שכבר משתמשים במערכת שלנו לניהול חשבוניות חכם ויעיל
                </p>
                <Link to="/auth">
                  <motion.div 
                    whileHover={{ scale: 1.05, y: -3 }} 
                    whileTap={{ scale: 0.95 }}
                    className="inline-block"
                  >
                    <Button size="lg" className="bg-white text-primary hover:bg-white/90 text-lg px-12 py-8 rounded-2xl font-bold shadow-2xl group">
                      <span className="flex items-center">
                        התחל עכשיו בחינם
                        <ArrowLeft className="w-6 h-6 mr-3 group-hover:-translate-x-2 transition-transform" />
                      </span>
                    </Button>
                  </motion.div>
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 px-4 border-t border-border/50 relative">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent" />
        <div className="container mx-auto relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <motion.div 
              className="flex items-center gap-3"
              whileHover={{ scale: 1.05 }}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-primary via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold gradient-text">InvoiceAI</span>
            </motion.div>
            <p className="text-muted-foreground">
              © {new Date().getFullYear()} InvoiceAI. כל הזכויות שמורות.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
