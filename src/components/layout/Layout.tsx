import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white flex flex-col">
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 pb-24 pt-6">
        <Outlet />
      </main>
      <Navbar />
    </div>
  );
}
