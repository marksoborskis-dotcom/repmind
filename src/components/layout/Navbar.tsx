import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Dumbbell, History, TrendingUp, Sparkles } from 'lucide-react';

const links = [
  { to: '/dashboard', icon: <LayoutDashboard size={22} />, label: 'Home' },
  { to: '/log',       icon: <Dumbbell size={22} />,        label: 'Log' },
  { to: '/history',   icon: <History size={22} />,         label: 'History' },
  { to: '/progress',  icon: <TrendingUp size={22} />,      label: 'Progress' },
  { to: '/ai',        icon: <Sparkles size={22} />,        label: 'AI' },
];

export default function Navbar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-[#2a2a2a] flex justify-around py-3 z-50">
      {links.map(({ to, icon, label }) => (
        <NavLink key={to} to={to}
          className={({ isActive }: { isActive: boolean }) =>
            `flex flex-col items-center gap-1 text-xs transition-colors ${
              isActive ? 'text-[#3B82F6]' : 'text-gray-500 hover:text-gray-300'
            }`
          }
        >
          {icon}
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
