import { motion } from 'framer-motion';

const logos = [
  'TechFlow', 'DataPro', 'CloudMax', 'FinanceHub', 'SmartBiz', 'DigitalOne',
];

const LogoCloud = () => {
  return (
    <section className="py-10 md:py-16 px-4 border-y border-border/30">
      <div className="container mx-auto">
        <motion.p
          className="text-center text-sm text-muted-foreground mb-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          נבחרנו על ידי חברות מובילות
        </motion.p>
        <div className="relative overflow-hidden">
          <motion.div
            className="flex gap-12 md:gap-16 items-center"
            animate={{ x: ['0%', '-50%'] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          >
            {[...logos, ...logos].map((name, i) => (
              <div
                key={i}
                className="flex-shrink-0 text-muted-foreground/40 font-bold text-xl md:text-2xl tracking-wider select-none"
              >
                {name}
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default LogoCloud;
