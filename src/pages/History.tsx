import { useWorkoutStore } from '../hooks/useWorkoutStore';
import { formatDate } from '../lib/utils';
import { Dumbbell, Trash2, CalendarDays } from 'lucide-react';

export default function History() {
  const { sessions, deleteSession } = useWorkoutStore();

  if (sessions.length === 0) {
    return (
      <div className="pt-16 flex flex-col items-center justify-center text-center px-4">
        <div className="bg-[#1a1a1a] p-6 rounded-full mb-4">
          <CalendarDays size={48} className="text-gray-600" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">No History Yet</h2>
        <p className="text-gray-400">Your logged workouts will appear here. Go crush a session!</p>
      </div>
    );
  }

  return (
    <div className="pt-6 pb-24 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">History</h1>
        <p className="text-gray-400 text-sm">Review your past performance.</p>
      </div>

      <div className="space-y-4">
        {sessions.map((session) => (
          <div key={session.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-[#2a2a2a] flex justify-between items-center bg-[#151515]">
              <div>
                <h3 className="font-semibold text-white">{formatDate(session.date)}</h3>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {session.muscleGroups.map(mg => (
                    <span key={mg} className="bg-blue-900/30 text-[#3B82F6] text-[10px] px-2 py-1 rounded uppercase font-bold tracking-wider">
                      {mg}
                    </span>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => {
                  if (window.confirm('Delete this session?')) deleteSession(session.id);
                }}
                className="text-gray-500 hover:text-red-500 transition-colors p-2"
              >
                <Trash2 size={18} />
              </button>
            </div>

            {/* Exercises */}
            <div className="p-4 space-y-4">
              {session.exercises.map((ex, i) => (
                <div key={i}>
                  <div className="flex items-center gap-2 mb-2">
                    <Dumbbell size={14} className="text-[#3B82F6]" />
                    <span className="font-medium text-gray-200">{ex.name}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pl-6">
                    {ex.sets.map((set, setIdx) => (
                      <div key={setIdx} className="text-sm flex justify-between text-gray-400 bg-[#0f0f0f] px-3 py-1.5 rounded-md">
                        <span>Set {setIdx + 1}</span>
                        <span className="font-medium text-gray-300">
                          {set.weight}kg × {set.reps}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
