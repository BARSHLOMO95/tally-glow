import { motion } from 'framer-motion';
import { TrendingUp, Users, Zap, Check } from 'lucide-react';

const FloatingCards = () => {
  return (
    <div className="absolute inset-0 pointer-events-none hidden lg:block">
      {/* Revenue card - top left */}
      <motion.div
        className="absolute top-8 left-0 bg-card/90 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-xl"
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1, duration: 0.6 }}
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">חיסכון חודשי</p>
              <p className="text-lg font-bold">₪12,400</p>
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1">
            <div className="h-1 flex-1 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                initial={{ width: '0%' }}
                animate={{ width: '78%' }}
                transition={{ delay: 1.5, duration: 1 }}
              />
            </div>
            <span className="text-xs text-primary font-medium">78%</span>
          </div>
        </motion.div>
      </motion.div>

      {/* Users card - top right */}
      <motion.div
        className="absolute top-16 right-0 bg-card/90 backdrop-blur-xl border border-border/50 rounded-2xl p-4 shadow-xl"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.3, duration: 0.6 }}
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">משתמשים פעילים</p>
              <p className="text-lg font-bold">2,547</p>
            </div>
          </div>
          <div className="mt-2 flex -space-x-2 space-x-reverse">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="w-6 h-6 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center">
                <span className="text-[8px] font-bold text-primary">{['א', 'ב', 'ג', 'ד'][i]}</span>
              </div>
            ))}
            <div className="w-6 h-6 rounded-full bg-primary border-2 border-card flex items-center justify-center">
              <span className="text-[8px] font-bold text-primary-foreground">+99</span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Speed notification - bottom left */}
      <motion.div
        className="absolute bottom-24 left-4 bg-card/90 backdrop-blur-xl border border-border/50 rounded-xl px-4 py-3 shadow-xl"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.8, duration: 0.5 }}
      >
        <motion.div
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <p className="text-xs font-medium">עיבוד ב-3 שניות</p>
              <p className="text-[10px] text-muted-foreground">מהיר פי 10 מידני</p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Success toast - bottom right */}
      <motion.div
        className="absolute bottom-32 right-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.2, duration: 0.5 }}
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="bg-primary text-primary-foreground rounded-xl px-4 py-3 shadow-xl flex items-center gap-2"
        >
          <div className="w-6 h-6 rounded-full bg-primary-foreground/20 flex items-center justify-center">
            <Check className="w-3.5 h-3.5" />
          </div>
          <p className="text-xs font-medium">3 חשבוניות עובדו בהצלחה</p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default FloatingCards;
