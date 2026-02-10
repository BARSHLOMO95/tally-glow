import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'דני כהן',
    role: 'מנהל כספים, TechFlow',
    text: 'המערכת חסכה לנו עשרות שעות בחודש. העיבוד האוטומטי מדויק ברמה מדהימה.',
    rating: 5,
    initials: 'דכ',
  },
  {
    name: 'מיכל לוי',
    role: 'רואת חשבון, ML Accounting',
    text: 'הדבר הכי טוב שקרה לניהול החשבוניות שלי. הכל אוטומטי ומסודר.',
    rating: 5,
    initials: 'מל',
  },
  {
    name: 'יוסי אברהם',
    role: 'בעלים, אברהם מסחר',
    text: 'מאז שהתחלנו להשתמש במערכת, אנחנו חוסכים 80% מהזמן על הנהלת חשבונות.',
    rating: 5,
    initials: 'יא',
  },
];

const TestimonialsSection = () => {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive(prev => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="py-16 md:py-24 px-4">
      <div className="container mx-auto">
        <motion.div
          className="text-center mb-10 md:mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3">
            מה הלקוחות אומרים
          </h2>
          <p className="text-muted-foreground">אלפי עסקים כבר סומכים עלינו</p>
        </motion.div>

        <div className="max-w-3xl mx-auto">
          {/* Cards row */}
          <div className="relative h-[260px] md:h-[240px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.96 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0"
              >
                <div className="glass-card rounded-2xl p-6 md:p-8 shadow-xl h-full flex flex-col justify-between relative overflow-hidden">
                  {/* Decorative gradient blob */}
                  <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
                  <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />

                  <div className="relative">
                    <div className="flex items-center gap-3 mb-4">
                      <Quote className="w-8 h-8 text-primary/30" />
                      <div className="flex gap-0.5">
                        {Array.from({ length: testimonials[active].rating }).map((_, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                          >
                            <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                    <p className="text-base md:text-lg leading-relaxed">
                      "{testimonials[active].text}"
                    </p>
                  </div>
                  <div className="flex items-center gap-3 mt-4 relative">
                    {/* Avatar with gradient ring */}
                    <div className="gradient-ring">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">{testimonials[active].initials}</span>
                      </div>
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{testimonials[active].name}</p>
                      <p className="text-xs text-muted-foreground">{testimonials[active].role}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Dots */}
          <div className="flex justify-center gap-2 mt-6">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  active === i ? 'bg-primary w-6' : 'bg-muted-foreground/20 w-2 hover:bg-muted-foreground/40'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
