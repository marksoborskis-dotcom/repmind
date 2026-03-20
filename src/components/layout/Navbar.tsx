import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Dumbbell, History, TrendingUp, Sparkles, UserCircle, Settings } from 'lucide-react';

const links = [
  { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Home' },
  { to: '/log',       icon: <Dumbbell size={20} />,        label: 'Log' },
  { to: '/ai',        icon: <Sparkles size={20} />,        label: 'AI' },
  { to: '/progress',  icon: <TrendingUp size={20} />,      label: 'Progress' },
  { to: '/profile',   icon: <UserCircle size={20} />,      label: 'Profile' },
  { to: '/settings',  icon: <Settings size={20} />,        label: 'Settings' },
];

export default function Navbar() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-[#2a2a2a] flex justify-around py-2 z-50">
      {links.map(({ to, icon, label }) => (
        <NavLink key={to} to={to}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 text-[10px] transition-colors ${
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
