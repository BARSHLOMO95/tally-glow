import { motion } from 'framer-motion';

const particles = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  size: Math.random() * 4 + 2,
  x: Math.random() * 100,
  y: Math.random() * 100,
  duration: Math.random() * 15 + 10,
  delay: Math.random() * 5,
}));

const FloatingParticles = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden hidden sm:block">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-primary/10"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
          }}
          animate={{
            y: [0, -80, -160, -80, 0],
            x: [0, 30, -20, 40, 0],
            opacity: [0.1, 0.4, 0.2, 0.5, 0.1],
            scale: [1, 1.3, 0.8, 1.2, 1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
      {/* Larger glowing orbs */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={`orb-${i}`}
          className="absolute rounded-full"
          style={{
            width: 120 + i * 40,
            height: 120 + i * 40,
            background: `radial-gradient(circle, hsla(var(--primary), 0.04) 0%, transparent 70%)`,
            left: `${20 + i * 30}%`,
            top: `${30 + i * 20}%`,
          }}
          animate={{
            x: [0, 40 * (i % 2 === 0 ? 1 : -1), 0],
            y: [0, -30 * (i % 2 === 0 ? -1 : 1), 0],
          }}
          transition={{
            duration: 20 + i * 5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

export default FloatingParticles;
