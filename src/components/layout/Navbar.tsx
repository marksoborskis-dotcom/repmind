import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LayoutDashboard, Dumbbell, History, TrendingUp, Sparkles, Settings } from 'lucide-react';

const links = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/log',       icon: Dumbbell,        label: 'Log' },
  { to: '/ai',        icon: Sparkles,        label: 'AI' },
  { to: '/history',   icon: History,         label: 'History' },
  { to: '/progress',  icon: TrendingUp,      label: 'Progress' },
  { to: '/settings',  icon: Settings,        label: 'Settings' },
];

export default function Navbar() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 glass-nav flex justify-around py-2.5 z-50">
      {links.map(({ to, icon: Icon, label }) => {
        const isActive = location.pathname === to;
        return (
          <NavLink
            key={to}
            to={to}
            className="relative flex flex-col items-center gap-1 text-[10px] w-14"
          >
            <div className="relative">
              {isActive && (
                <motion.div
                  layoutId="nav-glow"
                  className="absolute -inset-2 rounded-xl bg-cyan-500/15 blur-md"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <motion.div
                animate={{
                  color: isActive ? '#06B6D4' : '#6B7280',
                  scale: isActive ? 1.1 : 1,
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="relative z-10"
              >
                <Icon size={20} />
              </motion.div>
            </div>
            <span className={`transition-colors duration-200 ${
              isActive ? 'text-cyan-400 font-semibold' : 'text-gray-500'
            }`}>
              {label}
            </span>
            {isActive && (
              <motion.div
                layoutId="nav-dot"
                className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-cyan-400"
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              />
            )}
          </NavLink>
        );
      })}
    </nav>
  );
}
