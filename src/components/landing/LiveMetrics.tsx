import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Zap, TrendingUp } from 'lucide-react';

const LiveMetrics = () => {
  const [count, setCount] = useState(52847);

  useEffect(() => {
    const timer = setInterval(() => {
      setCount(prev => prev + Math.floor(Math.random() * 3) + 1);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <motion.section
      className="py-12 md:py-16 px-4"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
    >
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
          {/* Live counter */}
          <motion.div
            className="relative bg-card border border-border/50 rounded-2xl p-6 text-center overflow-hidden group hover:border-primary/30 transition-colors"
            whileHover={{ y: -4 }}
          >
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-primary" />
              </div>
              <motion.p
                className="text-3xl md:text-4xl font-bold tabular-nums"
                key={count}
              >
                {count.toLocaleString()}
              </motion.p>
              <p className="text-sm text-muted-foreground mt-1">חשבוניות עובדו</p>
              <div className="flex items-center justify-center gap-1 mt-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                </span>
                <span className="text-xs text-primary font-medium">בזמן אמת</span>
              </div>
            </div>
          </motion.div>

          {/* Speed metric */}
          <motion.div
            className="relative bg-card border border-border/50 rounded-2xl p-6 text-center overflow-hidden group hover:border-primary/30 transition-colors"
            whileHover={{ y: -4 }}
          >
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <p className="text-3xl md:text-4xl font-bold">3<span className="text-lg text-muted-foreground">שנ׳</span></p>
              <p className="text-sm text-muted-foreground mt-1">זמן עיבוד ממוצע</p>
              {/* Mini bar chart */}
              <div className="flex items-end justify-center gap-1 mt-3 h-6">
                {[40, 65, 85, 55, 90, 70, 95].map((h, i) => (
                  <motion.div
                    key={i}
                    className="w-2 bg-primary/20 rounded-full"
                    initial={{ height: 0 }}
                    whileInView={{ height: `${h}%` }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.1 * i, duration: 0.4 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>

          {/* Accuracy */}
          <motion.div
            className="relative bg-card border border-border/50 rounded-2xl p-6 text-center overflow-hidden group hover:border-primary/30 transition-colors"
            whileHover={{ y: -4 }}
          >
            <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <div className="w-12 h-12 mx-auto mb-3 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <p className="text-3xl md:text-4xl font-bold">99.9<span className="text-lg text-muted-foreground">%</span></p>
              <p className="text-sm text-muted-foreground mt-1">דיוק עיבוד</p>
              {/* Circular progress */}
              <div className="flex justify-center mt-3">
                <svg className="w-8 h-8" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="3"
                  />
                  <motion.path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={{ strokeDasharray: '0, 100' }}
                    whileInView={{ strokeDasharray: '99.9, 100' }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5, delay: 0.3 }}
                  />
                </svg>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
};

export default LiveMetrics;
