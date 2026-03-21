import { motion } from 'framer-motion';
import type { ReactNode } from 'react';

const variants = {
  initial: { opacity: 0, y: 24, filter: 'blur(4px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)' },
  exit:    { opacity: 0, y: -12, filter: 'blur(2px)' },
};

interface Props {
  children: ReactNode;
  className?: string;
}

export default function PageWrapper({ children, className = '' }: Props) {
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerContainer({ children, className = '' }: Props) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className = '' }: Props) {
  return (
    <motion.div
      variants={{
        hidden:  { opacity: 0, y: 16, filter: 'blur(4px)' },
        visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Pressable({ children, className = '', onClick }: Props & { onClick?: () => void }) {
  return (
    <motion.div
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: 1.01 }}
      transition={{ duration: 0.15 }}
      className={className}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}

export function GlassCard({ children, className = '', glow }: Props & { glow?: 'cyan' | 'purple' | 'green' }) {
  const glowClass = glow === 'cyan' ? 'glow-cyan' : glow === 'purple' ? 'glow-purple' : glow === 'green' ? 'glow-green' : '';
  return (
    <motion.div
      whileHover={{ borderColor: 'rgba(255,255,255,0.15)' }}
      className={`glass ${glowClass} ${className}`}
    >
      {children}
    </motion.div>
  );
}
