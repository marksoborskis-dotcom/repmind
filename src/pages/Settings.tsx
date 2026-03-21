import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Trash2, RotateCcw, AlertTriangle, ChevronRight, CheckCircle2, UserCircle } from 'lucide-react';
import { PROFILE_KEY, loadProfile } from './Profile';
import PageWrapper from '../components/layout/PageWrapper';

const PLAN_KEY = 'repmind_weekly_plan';
const PLANS_KEY = 'repmind_saved_plans';
const SESSIONS_KEY = 'repmind_sessions';

export default function Settings() {
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const profile = loadProfile();

  function flash(key: string) {
    setDone(key); setConfirm(null);
    setTimeout(() => setDone(null), 2000);
  }

  function resetProfile() { localStorage.removeItem(PROFILE_KEY); flash('profile'); setTimeout(() => navigate('/setup'), 800); }
  function resetPlans() { localStorage.removeItem(PLAN_KEY); localStorage.removeItem(PLANS_KEY); flash('plans'); }
  function resetWorkouts() { localStorage.removeItem(SESSIONS_KEY); flash('workouts'); }
  function resetAll() { localStorage.clear(); flash('all'); setTimeout(() => navigate('/setup'), 800); }

  const actions = [
    { key: 'profile', label: 'Reset Profile', desc: 'Clears your height, weight, age and goals.', icon: <RotateCcw size={18} className="text-yellow-400" />, color: 'bg-yellow-500/[0.04] border-yellow-500/15', btnClass: 'from-yellow-500 to-orange-500', fn: resetProfile },
    { key: 'plans', label: 'Clear All Plans', desc: 'Removes all saved weekly plans.', icon: <Trash2 size={18} className="text-orange-400" />, color: 'bg-orange-500/[0.04] border-orange-500/15', btnClass: 'from-orange-500 to-red-500', fn: resetPlans },
    { key: 'workouts', label: 'Clear Workout History', desc: 'Deletes all logged sessions.', icon: <Trash2 size={18} className="text-orange-400" />, color: 'bg-orange-500/[0.04] border-orange-500/15', btnClass: 'from-orange-500 to-red-500', fn: resetWorkouts },
    { key: 'all', label: 'Reset Everything', desc: 'Wipes all data. Cannot be undone.', icon: <AlertTriangle size={18} className="text-red-400" />, color: 'bg-red-500/[0.06] border-red-500/15', btnClass: 'from-red-500 to-red-700', fn: resetAll },
  ];

  return (
    <PageWrapper>
      <div className="pt-4 pb-24 space-y-8">
        <div>
          <h1 className="text-4xl font-extrabold text-white mb-1">Settings</h1>
          <p className="text-gray-500 text-sm">Manage your data.</p>
        </div>

        {/* Profile section */}
        <div>
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-cyan-400" /> Account
          </p>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/profile')}
            className="w-full glass glass-hover rounded-2xl p-5 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="bg-cyan-500/10 border border-cyan-500/20 p-2.5 rounded-xl">
                <UserCircle size={22} className="text-cyan-400" />
              </div>
              <div className="text-left">
                <p className="font-bold text-white text-sm">Edit Profile</p>
                {profile ? (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {profile.height}cm · {profile.weight}kg · {profile.age}y · <span className="capitalize">{profile.level}</span>
                  </p>
                ) : (
                  <p className="text-xs text-gray-500 mt-0.5">No profile set</p>
                )}
              </div>
            </div>
            <ChevronRight size={18} className="text-gray-600" />
          </motion.button>
        </div>

        {/* Danger zone */}
        <div>
          <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-red-400" /> Danger Zone
          </p>
          <div className="space-y-4">
            {actions.map(action => (
              <div key={action.key} className={`glass ${action.color} rounded-2xl p-5`}>
                <div className="flex items-start gap-3 mb-3">
                  {action.icon}
                  <div>
                    <p className="font-bold text-white text-sm">{action.label}</p>
                    <p className="text-gray-500 text-xs mt-1">{action.desc}</p>
                  </div>
                </div>

                {done === action.key ? (
                  <div className="flex items-center gap-2 text-green-400 text-sm font-bold">
                    <CheckCircle2 size={16} /> Done
                  </div>
                ) : confirm === action.key ? (
                  <div className="flex gap-3">
                    <button onClick={action.fn}
                      className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold bg-gradient-to-r ${action.btnClass} transition`}
                    >Confirm</button>
                    <button onClick={() => setConfirm(null)}
                      className="flex-1 py-2.5 rounded-xl glass text-gray-300 text-sm font-bold hover:bg-white/10 transition"
                    >Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setConfirm(action.key)}
                    className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition"
                  >
                    {action.label} <ChevronRight size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
