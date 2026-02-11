import { motion } from 'framer-motion';
import { Shield, Lock, Award, CheckCircle2 } from 'lucide-react';

const badges = [
  {
    icon: Shield,
    title: 'SSL מאובטח',
    description: 'הצפנת 256-bit',
    color: 'from-blue-500/20 to-cyan-500/20',
  },
  {
    icon: Lock,
    title: 'GDPR',
    description: 'עמידה בתקני פרטיות',
    color: 'from-green-500/20 to-emerald-500/20',
  },
  {
    icon: Award,
    title: 'ISO 27001',
    description: 'תקן אבטחת מידע',
    color: 'from-purple-500/20 to-violet-500/20',
  },
  {
    icon: CheckCircle2,
    title: 'SOC 2',
    description: 'ביקורת אבטחה',
    color: 'from-orange-500/20 to-amber-500/20',
  },
];

const TrustBadges = () => {
  return (
    <section className="py-12 md:py-16 px-4">
      <div className="container mx-auto">
        <motion.p
          className="text-center text-sm text-muted-foreground mb-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          אבטחה ותקנים
        </motion.p>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-3 sm:gap-4 md:gap-6 max-w-3xl mx-auto">
          {badges.map((badge, index) => (
            <motion.div
              key={index}
              className="flex items-center gap-2 sm:gap-3 bg-card border border-border/50 rounded-xl px-3 py-2.5 sm:px-4 sm:py-3 hover:border-primary/30 transition-all group"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ y: -4, scale: 1.02 }}
            >
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br ${badge.color} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                <badge.icon className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">{badge.title}</p>
                <p className="text-xs text-muted-foreground">{badge.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustBadges;
