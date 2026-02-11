import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    name: 'דני כהן',
    role: 'מנהל כספים, TechFlow',
    text: 'המערכת חסכה לנו עשרות שעות בחודש. העיבוד האוטומטי מדויק ברמה מדהימה ושינה לנו את כל תהליך העבודה.',
    rating: 5,
    initials: 'דכ',
  },
  {
    name: 'מיכל לוי',
    role: 'רואת חשבון, ML Accounting',
    text: 'הדבר הכי טוב שקרה לניהול החשבוניות שלי. הכל אוטומטי ומסודר. אני ממליצה לכל רואה חשבון.',
    rating: 5,
    initials: 'מל',
  },
  {
    name: 'יוסי אברהם',
    role: 'בעלים, אברהם מסחר',
    text: 'מאז שהתחלנו להשתמש במערכת, אנחנו חוסכים 80% מהזמן על הנהלת חשבונות. ההשקעה הכי טובה השנה.',
    rating: 5,
    initials: 'יא',
  },
];

const TestimonialCard = ({ testimonial, index }: { testimonial: typeof testimonials[0]; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay: index * 0.15, type: 'spring', stiffness: 100 }}
    whileHover={{ y: -4 }}
    className="h-full"
  >
    <div className="glass-card rounded-2xl p-5 sm:p-6 shadow-lg h-full flex flex-col justify-between relative overflow-hidden group hover:border-primary/30 transition-colors">
      {/* Decorative gradient blob */}
      <div className="absolute -top-20 -left-20 w-40 h-40 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative">
        <div className="flex items-center gap-3 mb-4">
          <Quote className="w-7 h-7 text-primary/20" />
          <div className="flex gap-0.5">
            {Array.from({ length: testimonial.rating }).map((_, i) => (
              <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            ))}
          </div>
        </div>
        <p className="text-sm md:text-base leading-relaxed">
          "{testimonial.text}"
        </p>
      </div>
      <div className="flex items-center gap-3 mt-5 relative">
        <div className="gradient-ring">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">{testimonial.initials}</span>
          </div>
        </div>
        <div>
          <p className="font-semibold text-sm">{testimonial.name}</p>
          <p className="text-xs text-muted-foreground">{testimonial.role}</p>
        </div>
      </div>
    </div>
  </motion.div>
);

const TestimonialsSection = () => {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActive(prev => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="py-12 md:py-24 px-4">
      <div className="container mx-auto">
        <motion.div
          className="text-center mb-8 md:mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3">
            מה הלקוחות אומרים
          </h2>
          <p className="text-muted-foreground">אלפי עסקים כבר סומכים עלינו</p>
        </motion.div>

        {/* Desktop: Grid of all 3 */}
        <div className="hidden md:grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={index} testimonial={testimonial} index={index} />
          ))}
        </div>

        {/* Mobile: Carousel */}
        <div className="md:hidden max-w-lg mx-auto">
          <div className="relative h-[260px] sm:h-[240px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -40 }}
                transition={{ duration: 0.35 }}
                className="absolute inset-0"
              >
                <div className="glass-card rounded-2xl p-5 shadow-lg h-full flex flex-col justify-between relative overflow-hidden">
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-3">
                      <Quote className="w-6 h-6 text-primary/20" />
                      <div className="flex gap-0.5">
                        {Array.from({ length: testimonials[active].rating }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed">
                      "{testimonials[active].text}"
                    </p>
                  </div>
                  <div className="flex items-center gap-3 mt-4 relative">
                    <div className="gradient-ring">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
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
          <div className="flex justify-center gap-2 mt-4">
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
