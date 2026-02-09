import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'דני כהן',
    role: 'מנהל כספים, TechFlow',
    text: 'המערכת חסכה לנו עשרות שעות בחודש. העיבוד האוטומטי מדויק ברמה מדהימה.',
    rating: 5,
  },
  {
    name: 'מיכל לוי',
    role: 'רואת חשבון, ML Accounting',
    text: 'הדבר הכי טוב שקרה לניהול החשבוניות שלי. הכל אוטומטי ומסודר.',
    rating: 5,
  },
  {
    name: 'יוסי אברהם',
    role: 'בעלים, אברהם מסחר',
    text: 'מאז שהתחלנו להשתמש במערכת, אנחנו חוסכים 80% מהזמן על הנהלת חשבונות.',
    rating: 5,
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
          <div className="relative h-[220px] md:h-[200px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 30, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.96 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0"
              >
                <div className="bg-card border border-border/50 rounded-2xl p-6 md:p-8 shadow-lg h-full flex flex-col justify-between">
                  <div>
                    <Quote className="w-8 h-8 text-primary/20 mb-3" />
                    <p className="text-base md:text-lg leading-relaxed">
                      {testimonials[active].text}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <div>
                      <p className="font-semibold text-sm">{testimonials[active].name}</p>
                      <p className="text-xs text-muted-foreground">{testimonials[active].role}</p>
                    </div>
                    <div className="flex gap-0.5">
                      {Array.from({ length: testimonials[active].rating }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                      ))}
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
