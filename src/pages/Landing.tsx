import { useState, useEffect, useRef } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { motion, useScroll, useSpring, useInView, useTransform, useMotionValue, animate } from 'framer-motion';
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
  X,
  Heart,
  Github,
  Twitter,
  Linkedin,
  ChevronDown,
  MousePointer2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import SystemMockup from '@/components/landing/SystemMockup';
import FloatingCards from '@/components/landing/FloatingCards';
import TestimonialsSection from '@/components/landing/TestimonialsSection';
import LogoCloud from '@/components/landing/LogoCloud';
import LiveMetrics from '@/components/landing/LiveMetrics';
import BeforeAfter from '@/components/landing/BeforeAfter';
import WaveDivider from '@/components/landing/WaveDivider';
import FloatingParticles from '@/components/landing/FloatingParticles';
import TrustBadges from '@/components/landing/TrustBadges';

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

// Smooth animated counter that counts up
const AnimatedCounter = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const motionValue = useMotionValue(0);
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (isInView) {
      const controls = animate(motionValue, value, {
        duration: 2,
        ease: 'easeOut',
        onUpdate: (v) => setDisplayValue(Math.round(v)),
      });
      return controls.stop;
    }
  }, [isInView, value, motionValue]);

  return (
    <span ref={ref} className="tabular-nums">
      {isInView ? (
        <motion.span
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {displayValue.toLocaleString()}{suffix}
        </motion.span>
      ) : '0'}
    </span>
  );
};

// Feature card with mouse-tracking glow
const FeatureCard = ({ feature, index, isNew }: { feature: { icon: any; title: string; description: string; delay: number }; index: number; isNew?: boolean }) => {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    cardRef.current.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    cardRef.current.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: feature.delay, type: 'spring', stiffness: 100 }}
      whileHover={{ y: -8 }}
    >
      <Card
        ref={cardRef}
        onMouseMove={handleMouseMove}
        className="h-full border-border/50 hover:border-primary/30 hover:shadow-xl transition-all duration-300 group relative overflow-hidden feature-card-glow"
      >
        {/* Hover gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* New badge */}
        {isNew && (
          <div className="absolute top-3 left-3 z-10">
            <motion.div
              initial={{ scale: 0, rotate: -12 }}
              whileInView={{ scale: 1, rotate: 0 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 300, delay: feature.delay + 0.3 }}
            >
              <Badge className="bg-gradient-to-r from-primary to-purple-500 text-white text-[10px] px-2 py-0.5 animate-badge-pulse">
                <Sparkles className="w-2.5 h-2.5 ml-1" />
                חדש!
              </Badge>
            </motion.div>
          </div>
        )}

        <CardHeader className="pb-2 relative">
          <motion.div
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center mb-3 group-hover:from-primary/20 group-hover:to-primary/30 transition-all duration-300"
            whileHover={{ rotate: 10, scale: 1.15 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <feature.icon className="w-6 h-6 text-primary group-hover:scale-110 transition-transform duration-300" />
          </motion.div>
          <CardTitle className="text-lg">{feature.title}</CardTitle>
        </CardHeader>
        <CardContent className="relative">
          <CardDescription className="text-sm leading-relaxed">
            {feature.description}
          </CardDescription>
        </CardContent>

        {/* Bottom gradient line on hover */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent"
          initial={{ scaleX: 0 }}
          whileHover={{ scaleX: 1 }}
          transition={{ duration: 0.4 }}
        />
      </Card>
    </motion.div>
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

  // Parallax transforms for hero background orbs
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -100]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 1.1]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);

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
      description: 'העלו חשבוניות דרך לינק ייחודי, מייל או ישירות מהמערכת. תמיכה בכל פורמט.',
      delay: 0
    },
    {
      icon: Zap,
      title: 'עיבוד AI מתקדם',
      description: 'זיהוי אוטומטי של כל נתוני החשבונית תוך שניות בדיוק של 99.9%.',
      delay: 0.1
    },
    {
      icon: Mail,
      title: 'סנכרון Gmail',
      description: 'קליטה אוטומטית של חשבוניות ישירות מתיבת המייל ללא מאמץ.',
      delay: 0.2
    },
    {
      icon: BarChart3,
      title: 'דוחות וניתוחים',
      description: 'תובנות עסקיות ודוחות מפורטים בזמן אמת לקבלת החלטות חכמות.',
      delay: 0.3
    },
    {
      icon: Shield,
      title: 'אבטחה מקסימלית',
      description: 'הצפנה מתקדמת והגנה על כל הנתונים שלכם ברמה הגבוהה ביותר.',
      delay: 0.4
    },
    {
      icon: Clock,
      title: 'חיסכון בזמן',
      description: 'חסכו שעות של עבודה ידנית בניהול חשבוניות וניהול ספקים.',
      delay: 0.5
    }
  ];

  const stats = [
    { value: 50000, suffix: '+', label: 'חשבוניות', icon: FileText },
    { value: 2500, suffix: '+', label: 'עסקים', icon: Users },
    { value: 99, suffix: '.9%', label: 'דיוק', icon: Sparkles },
    { value: 4, suffix: '.9', label: 'דירוג', icon: Star }
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden" dir="rtl">
      {/* Floating particles background */}
      <FloatingParticles />

      {/* Minimal progress bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary via-purple-500 to-primary z-[100] origin-right"
        style={{ scaleX }}
      />

      {/* Grid pattern background - hidden on mobile for performance */}
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-50 hidden sm:block" />

      {/* Clean Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <motion.div
              className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center"
              whileHover={{ rotate: 10, scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <FileText className="w-4 h-4 text-primary-foreground" />
            </motion.div>
            <span className="text-lg font-bold">InvoiceAI</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/auth">
              <Button variant="ghost" size="sm">התחברות</Button>
            </Link>
            <Link to="/auth">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="sm" className="relative overflow-hidden group">
                  <span className="relative z-10">התחל עכשיו</span>
                  <motion.div
                    className="absolute inset-0 bg-primary-foreground/10"
                    initial={{ x: '-100%' }}
                    whileHover={{ x: '100%' }}
                    transition={{ duration: 0.5 }}
                  />
                </Button>
              </motion.div>
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
      <section ref={heroRef} className="relative pt-16 md:pt-24 px-4">
        {/* Animated background gradient orbs with parallax */}
        <motion.div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ y: heroY, opacity: heroOpacity }}>
          <motion.div
            className="absolute top-0 right-0 w-[300px] h-[300px] sm:w-[600px] sm:h-[600px] bg-primary/5 rounded-full blur-[80px] sm:blur-[120px] translate-x-1/3 -translate-y-1/2"
            style={{ scale: heroScale }}
            animate={{
              x: [0, 30, -20, 0],
              y: [0, -40, 20, 0],
            }}
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute bottom-0 left-0 w-[250px] h-[250px] sm:w-[500px] sm:h-[500px] bg-primary/3 rounded-full blur-[60px] sm:blur-[100px] -translate-x-1/3 translate-y-1/2"
            animate={{
              x: [0, -30, 20, 0],
              y: [0, 30, -20, 0],
            }}
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="absolute top-1/2 left-1/2 w-[150px] h-[150px] sm:w-[300px] sm:h-[300px] bg-primary/3 rounded-full blur-[40px] sm:blur-[80px] -translate-x-1/2 -translate-y-1/2"
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>

        <div className="container mx-auto relative z-10 pt-2 md:pt-16">
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
              <Badge variant="secondary" className="mb-2 md:mb-6 animate-shimmer">
                <Sparkles className="w-3 h-3 ml-1" />
                מבוסס AI מתקדם
              </Badge>
            </motion.div>

            <motion.h1
              className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-bold mb-2 md:mb-6 tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={heroInView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 0.2 }}
            >
              ניהול חשבוניות{' '}
              <span className="relative inline-block">
                <span className="gradient-text">חכם ואוטומטי</span>
                <motion.span
                  className="absolute -bottom-1 right-0 left-0 h-[3px] bg-gradient-to-r from-primary via-purple-500 to-primary rounded-full"
                  initial={{ scaleX: 0 }}
                  animate={heroInView ? { scaleX: 1 } : {}}
                  transition={{ delay: 0.8, duration: 0.6 }}
                  style={{ originX: 1 }}
                />
              </span>
            </motion.h1>

            <motion.p
              className="text-muted-foreground text-sm md:text-lg lg:text-xl max-w-2xl mx-auto mb-3 md:mb-8"
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
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button size="lg" className="w-full sm:w-auto px-6 sm:px-8 shadow-lg shadow-primary/25">
                    התחל בחינם
                    <ArrowLeft className="w-4 h-4 mr-2" />
                  </Button>
                </motion.div>
              </Link>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto px-6 sm:px-8">
                  צפה בהדגמה
                </Button>
              </motion.div>
            </motion.div>

            {/* Stats - grid on mobile, inline on desktop */}
            <motion.div
              className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-2 sm:gap-4 md:gap-10 mt-4 md:mt-12 text-center"
              initial={{ opacity: 0 }}
              animate={heroInView ? { opacity: 1 } : {}}
              transition={{ delay: 0.5 }}
            >
              {stats.map((stat, i) => (
                <motion.div
                  key={i}
                  className="flex items-center justify-center gap-1.5 sm:gap-2 bg-card/50 backdrop-blur-sm border border-border/30 rounded-full px-2.5 py-1.5 sm:px-4 sm:py-2"
                  whileHover={{ scale: 1.1, borderColor: 'hsl(var(--primary) / 0.3)' }}
                  transition={{ type: 'spring', stiffness: 400 }}
                >
                  <stat.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary flex-shrink-0" />
                  <span className="font-bold text-xs sm:text-sm">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} />
                  </span>
                  <span className="text-muted-foreground text-[11px] sm:text-sm">{stat.label}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* System Mockup with animated gradient border */}
          <div className="mt-6 md:mt-16 relative">
            <FloatingCards />
            <div className="animated-gradient-border rounded-xl md:rounded-2xl">
              <SystemMockup />
            </div>
          </div>

          {/* Scroll hint */}
          <motion.div
            className="flex justify-center mt-4 md:mt-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
          >
            <motion.div
              className="flex flex-col items-center gap-1 text-muted-foreground/50"
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <MousePointer2 className="w-4 h-4" />
              <ChevronDown className="w-4 h-4" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Logo Cloud */}
      <LogoCloud />

      {/* Wave divider */}
      <WaveDivider color="hsl(var(--muted) / 0.3)" />

      {/* Live Metrics */}
      <LiveMetrics />

      {/* Gradient line divider */}
      <div className="container mx-auto px-4">
        <div className="gradient-line" />
      </div>

      {/* Features Section */}
      <section className="py-12 md:py-24 px-4 relative">
        <div className="container mx-auto">
          <motion.div
            className="text-center mb-10 md:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
            >
              <Badge variant="outline" className="mb-4">
                <Zap className="w-3 h-3 ml-1 text-primary" />
                יכולות מתקדמות
              </Badge>
            </motion.div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3">
              כל מה שצריך <span className="gradient-text">במקום אחד</span>
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              פתרון מקיף לניהול חשבוניות בצורה חכמה ויעילה
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {features.map((feature, index) => (
              <FeatureCard
                key={index}
                feature={feature}
                index={index}
                isNew={index === 1 || index === 2}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Wave divider */}
      <WaveDivider color="hsl(var(--muted) / 0.3)" />

      {/* How it works */}
      <section className="py-12 md:py-24 px-4 bg-muted/30 relative">
        <div className="container mx-auto">
          <motion.div
            className="text-center mb-8 md:mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3">
              איך זה עובד?
            </h2>
            <p className="text-muted-foreground">שלושה צעדים פשוטים</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 md:gap-8 max-w-4xl mx-auto relative">
            {/* Connecting line between steps - desktop only */}
            <div className="absolute top-6 right-[16.6%] left-[16.6%] hidden md:block">
              <motion.div
                className="h-[2px] bg-gradient-to-l from-primary/40 via-primary to-primary/40 w-full"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.3 }}
                style={{ originX: 1 }}
              />
            </div>
            {[
              { step: '1', title: 'העלאה', desc: 'העלו חשבונית - תמונה, PDF או מייל', icon: Upload },
              { step: '2', title: 'עיבוד', desc: 'ה-AI מזהה את כל הנתונים אוטומטית', icon: Zap },
              { step: '3', title: 'ניהול', desc: 'צפו בדוחות וקבלו תובנות עסקיות', icon: BarChart3 }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.2, type: 'spring', stiffness: 100 }}
                className="text-center relative"
              >
                <motion.div
                  className="w-12 h-12 mx-auto mb-4 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center text-lg font-bold relative z-10 shadow-lg shadow-primary/25"
                  whileHover={{ scale: 1.2, rotate: 10 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <item.icon className="w-5 h-5" />
                </motion.div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <WaveDivider flip color="hsl(var(--muted) / 0.3)" />

      {/* Before & After */}
      <BeforeAfter />

      {/* Testimonials */}
      <TestimonialsSection />

      {/* Trust Badges */}
      <TrustBadges />

      {/* Gradient line divider */}
      <div className="container mx-auto px-4">
        <div className="gradient-line" />
      </div>

      {/* Pricing Section */}
      <section className="py-16 md:py-24 px-4" id="pricing">
        <div className="container mx-auto">
          <motion.div
            className="text-center mb-10 md:mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Badge variant="outline" className="mb-4">
              <Star className="w-3 h-3 ml-1 text-primary" />
              מחירים שקופים
            </Badge>
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
                <Badge variant="secondary" className="text-xs bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-600">-20%</Badge>
              </button>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-5xl mx-auto">
            {/* Free Plan */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow duration-300">
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
                whileHover={{ y: -4 }}
              >
                <Card className={`h-full relative transition-shadow duration-300 ${index === 0 ? 'border-primary shadow-lg shadow-primary/10 hover:shadow-xl hover:shadow-primary/20' : 'hover:shadow-lg'}`}>
                  {index === 0 && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-gradient-to-r from-primary to-purple-500 animate-badge-pulse">הכי פופולרי</Badge>
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
            className="bg-gradient-to-br from-primary via-primary to-purple-600 text-primary-foreground rounded-2xl md:rounded-3xl p-6 sm:p-8 md:p-12 lg:p-16 text-center relative overflow-hidden"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 80 }}
          >
            {/* Animated background elements */}
            <motion.div
              className="absolute top-0 right-0 w-64 h-64 bg-primary-foreground/10 rounded-full blur-3xl"
              animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute bottom-0 left-0 w-48 h-48 bg-primary-foreground/10 rounded-full blur-3xl"
              animate={{ x: [0, -20, 0], y: [0, 20, 0] }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
            />

            {/* Floating sparkles */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1.5 h-1.5 bg-primary-foreground/30 rounded-full"
                style={{
                  top: `${15 + Math.random() * 70}%`,
                  left: `${5 + Math.random() * 90}%`,
                }}
                animate={{
                  y: [0, -25, 0],
                  opacity: [0.1, 0.8, 0.1],
                  scale: [1, 1.8, 1],
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}

            <div className="relative z-10">
              <motion.h2
                className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
              >
                מוכנים להתחיל?
              </motion.h2>
              <motion.p
                className="text-primary-foreground/80 max-w-xl mx-auto mb-6 md:mb-8"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                הצטרפו לאלפי עסקים שכבר משתמשים במערכת לניהול חשבוניות חכם
              </motion.p>
              <Link to="/auth">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-block"
                >
                  <Button size="lg" variant="secondary" className="px-8 shadow-lg">
                    התחל עכשיו בחינם
                    <ArrowLeft className="w-4 h-4 mr-2" />
                  </Button>
                </motion.div>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Enhanced Footer */}
      <footer className="py-12 md:py-16 px-4 border-t bg-muted/20">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-12 mb-8">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-bold text-lg">InvoiceAI</span>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                פלטפורמת AI מתקדמת לניהול חשבוניות אוטומטי. חסכו זמן, הפחיתו טעויות, והשיגו שליטה מלאה בנתונים הפיננסיים שלכם.
              </p>
              <div className="flex gap-3">
                {[
                  { icon: Twitter, label: 'Twitter' },
                  { icon: Linkedin, label: 'LinkedIn' },
                  { icon: Github, label: 'GitHub' },
                ].map((social, i) => (
                  <motion.a
                    key={i}
                    href="#"
                    className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                    whileHover={{ y: -2 }}
                    aria-label={social.label}
                  >
                    <social.icon className="w-4 h-4" />
                  </motion.a>
                ))}
              </div>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-semibold mb-4 text-sm">מוצר</h4>
              <ul className="space-y-2.5">
                {['תכונות', 'מחירים', 'אינטגרציות', 'עדכונים'].map((link, i) => (
                  <li key={i}>
                    <a href="#" className="text-muted-foreground text-sm hover:text-primary transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-sm">חברה</h4>
              <ul className="space-y-2.5">
                {['אודות', 'בלוג', 'קריירה', 'צור קשר'].map((link, i) => (
                  <li key={i}>
                    <a href="#" className="text-muted-foreground text-sm hover:text-primary transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-sm">תמיכה</h4>
              <ul className="space-y-2.5">
                {['מרכז עזרה', 'תיעוד API', 'תנאי שימוש', 'פרטיות'].map((link, i) => (
                  <li key={i}>
                    <a href="#" className="text-muted-foreground text-sm hover:text-primary transition-colors">{link}</a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="gradient-line mb-6" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} InvoiceAI. כל הזכויות שמורות.
            </p>
            <p className="text-muted-foreground text-xs flex items-center gap-1">
              נבנה עם <Heart className="w-3 h-3 text-red-500 fill-red-500" /> בישראל
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
