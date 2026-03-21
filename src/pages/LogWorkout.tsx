import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useWorkoutStore } from '../hooks/useWorkoutStore';
import { generateId, todayISO } from '../lib/utils';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import type { Session, Exercise, MuscleGroup } from '../types/workout';
import PageWrapper, { StaggerContainer, StaggerItem } from '../components/layout/PageWrapper';

const ALL_MUSCLES: MuscleGroup[] = ['chest', 'back', 'legs', 'shoulders', 'arms', 'core'];

export default function LogWorkout() {
  const { addSession } = useWorkoutStore();
  const navigate = useNavigate();

  const [selectedMuscles, setSelectedMuscles] = useState<MuscleGroup[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);

  const toggleMuscle = (m: MuscleGroup) => {
    setSelectedMuscles(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    );
  };

  const addExercise = () => {
    setExercises([...exercises, { name: '', sets: [{ reps: 0, weight: 0 }] }]);
  };

  const removeExercise = (i: number) => setExercises(exercises.filter((_, idx) => idx !== i));

  const updateExerciseName = (i: number, name: string) => {
    const n = [...exercises]; n[i].name = name; setExercises(n);
  };

  const addSet = (i: number) => {
    const n = [...exercises];
    const last = n[i].sets[n[i].sets.length - 1] || { reps: 0, weight: 0 };
    n[i].sets.push({ ...last });
    setExercises(n);
  };

  const removeSet = (ei: number, si: number) => {
    const n = [...exercises];
    n[ei].sets = n[ei].sets.filter((_, i) => i !== si);
    setExercises(n);
  };

  const updateSet = (ei: number, si: number, field: 'reps' | 'weight', value: number) => {
    const n = [...exercises];
    n[ei].sets[si][field] = value;
    setExercises(n);
  };

  const handleFinish = () => {
    if (exercises.length === 0 || selectedMuscles.length === 0) {
      alert('Please select at least one muscle group and add an exercise.');
      return;
    }
    const clean = exercises
      .map(ex => ({ ...ex, sets: ex.sets.filter(s => s.reps > 0) }))
      .filter(ex => ex.name.trim() !== '' && ex.sets.length > 0);
    if (clean.length === 0) {
      alert('Please add valid exercises and sets.');
      return;
    }
    addSession({ id: generateId(), date: todayISO(), muscleGroups: selectedMuscles, exercises: clean });
    navigate('/history');
  };

  return (
    <PageWrapper>
      <div className="pt-4 pb-24 space-y-8">
        <div>
          <h1 className="text-4xl font-extrabold text-white mb-1">Log Workout</h1>
          <p className="text-gray-500 text-sm">What are we hitting today?</p>
        </div>

        {/* Muscle Groups */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.08 }}
        >
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-3 block flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-cyan-400" />
            Target Muscles
          </label>
          <div className="flex flex-wrap gap-2">
            {ALL_MUSCLES.map(m => (
              <motion.button
                key={m}
                whileTap={{ scale: 0.95 }}
                onClick={() => toggleMuscle(m)}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  selectedMuscles.includes(m)
                    ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 font-semibold glow-cyan'
                    : 'glass text-gray-400 hover:border-white/15'
                }`}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Exercises */}
        <StaggerContainer className="space-y-5">
          {exercises.map((ex, ei) => (
            <StaggerItem key={ei}>
              <div className="glass rounded-2xl p-4">
                <div className="flex justify-between items-center mb-4">
                  <input
                    type="text"
                    placeholder="Exercise name (e.g. Bench Press)"
                    value={ex.name}
                    onChange={e => updateExerciseName(ei, e.target.value)}
                    className="bg-transparent text-base font-bold text-white outline-none w-full placeholder-gray-700"
                  />
                  <motion.button whileTap={{ scale: 0.9 }} onClick={() => removeExercise(ei)} className="text-red-500/50 hover:text-red-400 transition p-1 ml-2">
                    <Trash2 size={17} />
                  </motion.button>
                </div>

                {ex.sets.length > 0 && (
                  <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-gray-600 mb-2 px-2 uppercase tracking-widest">
                    <div className="col-span-2 text-center">Set</div>
                    <div className="col-span-4 text-center">KG</div>
                    <div className="col-span-4 text-center">Reps</div>
                    <div className="col-span-2" />
                  </div>
                )}

                <div className="space-y-2 mb-3">
                  {ex.sets.map((set, si) => (
                    <div key={si} className="grid grid-cols-12 gap-2 items-center bg-white/[0.03] rounded-xl p-2 border border-white/[0.04]">
                      <div className="col-span-2 text-center font-bold text-gray-600 text-sm">{si + 1}</div>
                      <div className="col-span-4">
                        <input
                          type="number"
                          value={set.weight || ''}
                          onChange={e => updateSet(ei, si, 'weight', Number(e.target.value))}
                          className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg py-1.5 text-center text-white text-sm outline-none focus:border-cyan-500/40 transition"
                          placeholder="0"
                        />
                      </div>
                      <div className="col-span-4">
                        <input
                          type="number"
                          value={set.reps || ''}
                          onChange={e => updateSet(ei, si, 'reps', Number(e.target.value))}
                          className="w-full bg-white/[0.04] border border-white/[0.06] rounded-lg py-1.5 text-center text-white text-sm outline-none focus:border-cyan-500/40 transition"
                          placeholder="0"
                        />
                      </div>
                      <div className="col-span-2 flex justify-center">
                        <motion.button whileTap={{ scale: 0.85 }} onClick={() => removeSet(ei, si)} className="text-gray-700 hover:text-red-400 transition">
                          <Trash2 size={14} />
                        </motion.button>
                      </div>
                    </div>
                  ))}
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={() => addSet(ei)}
                  className="w-full py-2 flex items-center justify-center gap-2 text-sm font-medium text-cyan-400 bg-cyan-500/8 border border-cyan-500/15 rounded-xl hover:bg-cyan-500/12 transition"
                >
                  <Plus size={15} /> Add Set
                </motion.button>
              </div>
            </StaggerItem>
          ))}
        </StaggerContainer>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={addExercise}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="w-full py-4 border border-dashed border-white/10 text-gray-500 hover:text-white hover:border-white/20 rounded-2xl flex items-center justify-center gap-2 font-medium transition-all text-sm"
        >
          <Plus size={18} /> Add Exercise
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleFinish}
          className="w-full relative group"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative py-4 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/15">
            <CheckCircle2 size={20} /> Finish Session
          </div>
        </motion.button>
      </div>
    </PageWrapper>
  );
}
