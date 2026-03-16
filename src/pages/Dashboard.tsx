import { Link, useNavigate } from 'react-router-dom';
import { useWorkoutStore } from '../hooks/useWorkoutStore';
import { Sparkles, Dumbbell, Calendar, Flame } from 'lucide-react';
import { formatDate } from '../lib/utils';

export default function Dashboard() {
  const { sessions, streak } = useWorkoutStore();
  const navigate = useNavigate();

  // Get today's date formatted
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  });

  // Derived stats
  const lastSession = sessions[0];
  const totalThisMonth = sessions.filter(s => {
    const sessionMonth = new Date(s.date).getMonth();
    const currentMonth = new Date().getMonth();
    return sessionMonth === currentMonth;
  }).length;

  return (
    <div className="pt-6 pb-20 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-400 mt-1">{today}</p>
      </div>

      {/* AI Button CTA */}
      <button 
        onClick={() => navigate('/ai')}
        className="w-full bg-gradient-to-r from-[#3B82F6] to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-xl p-4 flex items-center justify-between shadow-lg shadow-blue-900/20 transition-all"
      >
        <div className="flex items-center gap-3">
          <Sparkles className="text-blue-100" />
          <span className="font-semibold text-lg">What should I train today?</span>
        </div>
        <span className="text-blue-200">→</span>
      </button>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <Flame size={24} className="text-orange-500 mb-2" />
          <span className="text-2xl font-bold text-white">{streak}</span>
          <span className="text-xs text-gray-400">Day Streak</span>
        </div>
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 flex flex-col items-center justify-center text-center">
          <Calendar size={24} className="text-green-500 mb-2" />
          <span className="text-2xl font-bold text-white">{totalThisMonth}</span>
          <span className="text-xs text-gray-400">Sessions this month</span>
        </div>
      </div>

      {/* Last Session Card */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Dumbbell size={18} className="text-[#3B82F6]" />
          Last Session
        </h2>
        
        {lastSession ? (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-sm text-gray-400">{formatDate(lastSession.date)}</p>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {lastSession.muscleGroups.map(mg => (
                    <span key={mg} className="bg-blue-900/30 text-[#3B82F6] text-xs px-2 py-1 rounded-md uppercase font-semibold">
                      {mg}
                    </span>
                  ))}
                </div>
              </div>
              <span className="text-xs font-medium text-gray-500 bg-[#2a2a2a] px-2 py-1 rounded-md">
                {lastSession.exercises.length} exercises
              </span>
            </div>
            
            <div className="space-y-2">
              {lastSession.exercises.slice(0, 3).map((ex, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-gray-300">{ex.name}</span>
                  <span className="text-gray-500">{ex.sets.length} sets</span>
                </div>
              ))}
              {lastSession.exercises.length > 3 && (
                <p className="text-xs text-gray-500 italic mt-2">
                  + {lastSession.exercises.length - 3} more
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center">
            <p className="text-gray-400 mb-4">No workouts logged yet.</p>
            <Link to="/log" className="text-[#3B82F6] font-medium hover:underline">
              Log your first workout
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
