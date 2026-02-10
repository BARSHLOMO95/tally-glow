import { motion } from 'framer-motion';

interface WaveDividerProps {
  flip?: boolean;
  color?: string;
}

const WaveDivider = ({ flip = false, color = 'hsl(var(--background))' }: WaveDividerProps) => {
  return (
    <div className={`w-full overflow-hidden leading-[0] ${flip ? 'rotate-180' : ''}`}>
      <motion.svg
        viewBox="0 0 1440 100"
        preserveAspectRatio="none"
        className="w-full h-[50px] md:h-[80px]"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <motion.path
          d="M0,40 C360,100 720,0 1080,60 C1260,80 1380,40 1440,50 L1440,100 L0,100 Z"
          fill={color}
          initial={{ d: "M0,80 C360,80 720,80 1080,80 C1260,80 1380,80 1440,80 L1440,100 L0,100 Z" }}
          whileInView={{ d: "M0,40 C360,100 720,0 1080,60 C1260,80 1380,40 1440,50 L1440,100 L0,100 Z" }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
        <motion.path
          d="M0,60 C480,0 960,100 1440,40 L1440,100 L0,100 Z"
          fill={color}
          opacity={0.5}
          initial={{ d: "M0,85 C480,85 960,85 1440,85 L1440,100 L0,100 Z" }}
          whileInView={{ d: "M0,60 C480,0 960,100 1440,40 L1440,100 L0,100 Z" }}
          viewport={{ once: true }}
          transition={{ duration: 1.4, ease: 'easeOut', delay: 0.1 }}
        />
      </motion.svg>
    </div>
  );
};

export default WaveDivider;
