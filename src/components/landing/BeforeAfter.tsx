import { motion } from 'framer-motion';
import { X, Check, ArrowLeft } from 'lucide-react';

const BeforeAfter = () => {
  return (
    <section className="py-16 md:py-24 px-4 bg-muted/20">
      <div className="container mx-auto">
        <motion.div
          className="text-center mb-10 md:mb-14"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3">
            לפני ואחרי
          </h2>
          <p className="text-muted-foreground">ההבדל ברור</p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto items-stretch">
          {/* Before */}
          <motion.div
            className="bg-card border border-border/50 rounded-2xl p-6 md:p-8 relative overflow-hidden"
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-destructive/60" />
            <h3 className="text-lg font-bold mb-5 text-destructive">בלי InvoiceAI</h3>
            <ul className="space-y-4">
              {[
                'הזנה ידנית של כל חשבונית',
                'שעות של עבודה שבועית',
                'טעויות הקלדה תכופות',
                'אין מעקב מסודר',
                'דוחות ידניים באקסל',
              ].map((item, i) => (
                <motion.li
                  key={i}
                  className="flex items-start gap-3 text-sm text-muted-foreground"
                  initial={{ opacity: 0, x: 10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 }}
                >
                  <div className="w-5 h-5 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <X className="w-3 h-3 text-destructive" />
                  </div>
                  <span>{item}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* After */}
          <motion.div
            className="bg-card border border-primary/30 rounded-2xl p-6 md:p-8 relative overflow-hidden shadow-lg"
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-primary" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
            <h3 className="text-lg font-bold mb-5 text-primary">עם InvoiceAI</h3>
            <ul className="space-y-4">
              {[
                'סריקה וזיהוי אוטומטי',
                'עיבוד תוך 3 שניות',
                'דיוק של 99.9%',
                'מעקב ודוחות בזמן אמת',
                'סנכרון Gmail אוטומטי',
              ].map((item, i) => (
                <motion.li
                  key={i}
                  className="flex items-start gap-3 text-sm"
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08 + 0.2 }}
                >
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                  <span>{item}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>

        {/* CTA under comparison */}
        <motion.div
          className="text-center mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
        >
          <a href="/auth" className="inline-flex items-center gap-2 text-primary hover:underline text-sm font-medium">
            עברו לניהול חכם עכשיו
            <ArrowLeft className="w-4 h-4" />
          </a>
        </motion.div>
      </div>
    </section>
  );
};

export default BeforeAfter;
