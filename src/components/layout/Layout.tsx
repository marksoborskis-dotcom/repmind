import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Navbar from './Navbar';

export default function Layout() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white flex flex-col relative overflow-hidden grain">
      {/* Animated gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="orb orb-cyan w-[500px] h-[500px] -top-48 -left-24 opacity-20" />
        <div className="orb orb-purple w-[600px] h-[600px] top-1/3 -right-48 opacity-15" />
        <div className="orb orb-green w-[400px] h-[400px] -bottom-32 left-1/3 opacity-10" />
      </div>

      {/* Main content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-5 pb-28 pt-6 relative z-10">
        <AnimatePresence mode="wait" initial={false}>
          <Outlet key={location.pathname} />
        </AnimatePresence>
      </main>

      <Navbar />
    </div>
  );
}
