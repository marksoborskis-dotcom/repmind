import { motion } from 'framer-motion';
import { useWorkoutStore } from '../hooks/useWorkoutStore';
import { formatDate } from '../lib/utils';
import { Dumbbell, Trash2, CalendarDays } from 'lucide-react';
import PageWrapper, { StaggerContainer, StaggerItem } from '../components/layout/PageWrapper';

export default function History() {
  const { sessions, deleteSession } = useWorkoutStore();

  if (sessions.length === 0) {
    return (
      <PageWrapper>
        <div className="pt-20 flex flex-col items-center justify-center text-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="glass p-6 rounded-full mb-5"
          >
            <CalendarDays size={48} className="text-gray-600" />
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <h2 className="text-xl font-bold text-white mb-2">No History Yet</h2>
            <p className="text-gray-500 text-sm">Your logged workouts will appear here.</p>
          </motion.div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="pt-4 pb-24 space-y-6">
        <div>
          <h1 className="text-4xl font-extrabold text-white mb-1">History</h1>
          <p className="text-gray-500 text-sm">Review your past performance.</p>
        </div>

        <StaggerContainer className="space-y-4">
          {sessions.map((session) => (
            <StaggerItem key={session.id}>
              <div className="glass rounded-2xl overflow-hidden">
                <div className="p-4 border-b border-white/[0.04] flex justify-between items-center bg-white/[0.02]">
                  <div>
                    <h3 className="font-semibold text-white text-sm">{formatDate(session.date)}</h3>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {session.muscleGroups.map(mg => (
                        <span key={mg} className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] px-2 py-1 rounded-lg uppercase font-bold tracking-wider">
                          {mg}
                        </span>
                      ))}
                    </div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      if (window.confirm('Delete this session?')) deleteSession(session.id);
                    }}
                    className="text-gray-600 hover:text-red-400 transition-colors p-2"
                  >
                    <Trash2 size={18} />
                  </motion.button>
                </div>

                <div className="p-4 space-y-4">
                  {session.exercises.map((ex, i) => (
                    <div key={i}>
                      <div className="flex items-center gap-2 mb-2">
                        <Dumbbell size={13} className="text-cyan-500" />
                        <span className="font-medium text-gray-200 text-sm">{ex.name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pl-5">
                        {ex.sets.map((set, setIdx) => (
                          <div key={setIdx} className="text-sm flex justify-between text-gray-400 bg-white/[0.03] border border-white/[0.04] px-3 py-1.5 rounded-xl">
                            <span className="text-gray-600">Set {setIdx + 1}</span>
                            <span className="font-medium text-gray-300">{set.weight}kg × {set.reps}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>
      </div>
    </PageWrapper>
  );
}
