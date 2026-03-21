import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, RotateCcw, AlertTriangle, ChevronRight, CheckCircle2 } from 'lucide-react';
import { PROFILE_KEY } from './Profile';

const PLAN_KEY = 'repmind_weekly_plan';
const PLANS_KEY = 'repmind_saved_plans';
const SESSIONS_KEY = 'repmind_sessions';

export default function Settings() {
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  function flash(key: string) {
    setDone(key);
    setConfirm(null);
    setTimeout(() => setDone(null), 2000);
  }

  function resetProfile() {
    localStorage.removeItem(PROFILE_KEY);
    flash('profile');
    setTimeout(() => navigate('/setup'), 800);
  }

  function resetPlans() {
    localStorage.removeItem(PLAN_KEY);
    localStorage.removeItem(PLANS_KEY);
    flash('plans');
  }

  function resetWorkouts() {
    localStorage.removeItem(SESSIONS_KEY);
    flash('workouts');
  }

  function resetAll() {
    localStorage.clear();
    flash('all');
    setTimeout(() => navigate('/setup'), 800);
  }

  const actions = [
    {
      key: 'profile',
      label: 'Reset Profile',
      desc: 'Clears your height, weight, age and goals. You will be taken back to setup.',
      icon: <RotateCcw size={18} className="text-yellow-400" />,
      color: 'border-yellow-900/30 bg-yellow-900/10',
      btnColor: 'bg-yellow-500 hover:bg-yellow-400',
      fn: resetProfile,
    },
    {
      key: 'plans',
      label: 'Clear All Workout Plans',
      desc: 'Removes all saved weekly plans. Your workout history is kept.',
      icon: <Trash2 size={18} className="text-orange-400" />,
      color: 'border-orange-900/30 bg-orange-900/10',
      btnColor: 'bg-orange-500 hover:bg-orange-400',
      fn: resetPlans,
    },
    {
      key: 'workouts',
      label: 'Clear Workout History',
      desc: 'Deletes all logged workout sessions. Plans and profile are kept.',
      icon: <Trash2 size={18} className="text-orange-400" />,
      color: 'border-orange-900/30 bg-orange-900/10',
      btnColor: 'bg-orange-500 hover:bg-orange-400',
      fn: resetWorkouts,
    },
    {
      key: 'all',
      label: 'Reset Everything',
      desc: 'Wipes all data including profile, plans, and history. Cannot be undone.',
      icon: <AlertTriangle size={18} className="text-red-400" />,
      color: 'border-red-900/30 bg-red-900/10',
      btnColor: 'bg-red-500 hover:bg-red-400',
      fn: resetAll,
    },
  ];

  return (
    <div className="pt-10 pb-24 px-6 max-w-lg mx-auto min-h-screen text-white font-sans">
      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-2">Settings</h1>
        <p className="text-gray-500 text-lg">Manage your data.</p>
      </div>

      <div className="space-y-4">
        {actions.map(action => (
          <div key={action.key} className={`rounded-2xl border p-5 ${action.color}`}>
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
                <button
                  onClick={action.fn}
                  className={`flex-1 py-2 rounded-xl text-white text-sm font-bold transition ${action.btnColor}`}
                >
                  Confirm
                </button>
                <button
                  onClick={() => setConfirm(null)}
                  className="flex-1 py-2 rounded-xl bg-[#2a2a2a] text-gray-300 text-sm font-bold hover:bg-[#333] transition"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirm(action.key)}
                className="flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-white transition"
              >
                {action.label} <ChevronRight size={14} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
