import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkoutStore } from '../hooks/useWorkoutStore';
import { generateId, todayISO } from '../lib/utils';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import type { Session, Exercise, MuscleGroup } from '../types/workout';

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
    setExercises([...exercises, { 
      name: '', 
      sets: [{ reps: 0, weight: 0 }] 
    }]);
  };

  const removeExercise = (exIndex: number) => {
    setExercises(exercises.filter((_, i) => i !== exIndex));
  };

  const updateExerciseName = (exIndex: number, name: string) => {
    const newEx = [...exercises];
    newEx[exIndex].name = name;
    setExercises(newEx);
  };

  const addSet = (exIndex: number) => {
    const newEx = [...exercises];
    // Copy the last set's values to save time typing
    const lastSet = newEx[exIndex].sets[newEx[exIndex].sets.length - 1] || { reps: 0, weight: 0 };
    newEx[exIndex].sets.push({ ...lastSet });
    setExercises(newEx);
  };

  const removeSet = (exIndex: number, setIndex: number) => {
    const newEx = [...exercises];
    newEx[exIndex].sets = newEx[exIndex].sets.filter((_, i) => i !== setIndex);
    setExercises(newEx);
  };

  const updateSet = (exIndex: number, setIndex: number, field: 'reps' | 'weight', value: number) => {
    const newEx = [...exercises];
    newEx[exIndex].sets[setIndex][field] = value;
    setExercises(newEx);
  };

  const handleFinish = () => {
    if (exercises.length === 0 || selectedMuscles.length === 0) {
      alert("Please select at least one muscle group and add an exercise.");
      return;
    }

    // Filter out empty sets
    const cleanExercises = exercises.map(ex => ({
      ...ex,
      sets: ex.sets.filter(s => s.reps > 0)
    })).filter(ex => ex.name.trim() !== '' && ex.sets.length > 0);

    if (cleanExercises.length === 0) {
      alert("Please add valid exercises and sets.");
      return;
    }

    const newSession: Session = {
      id: generateId(),
      date: todayISO(),
      muscleGroups: selectedMuscles,
      exercises: cleanExercises
    };

    addSession(newSession);
    navigate('/history');
  };

  return (
    <div className="pt-6 pb-24 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Log Workout</h1>
        <p className="text-gray-400 text-sm">What are we hitting today?</p>
      </div>

      {/* Muscle Groups */}
      <div>
        <label className="text-sm font-medium text-gray-300 mb-3 block">Target Muscles</label>
        <div className="flex flex-wrap gap-2">
          {ALL_MUSCLES.map(m => (
            <button
              key={m}
              onClick={() => toggleMuscle(m)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedMuscles.includes(m) 
                  ? 'bg-[#3B82F6] text-white' 
                  : 'bg-[#1a1a1a] text-gray-400 border border-[#2a2a2a] hover:border-gray-500'
              }`}
            >
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Exercises List */}
      <div className="space-y-6">
        {exercises.map((ex, exIndex) => (
          <div key={exIndex} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4">
            <div className="flex justify-between items-center mb-4">
              <input 
                type="text" 
                placeholder="Exercise name (e.g. Bench Press)" 
                value={ex.name}
                onChange={e => updateExerciseName(exIndex, e.target.value)}
                className="bg-transparent text-lg font-bold text-white outline-none w-full placeholder-gray-600"
              />
              <button onClick={() => removeExercise(exIndex)} className="text-red-500 hover:text-red-400 p-2">
                <Trash2 size={18} />
              </button>
            </div>

            {/* Set Headers */}
            {ex.sets.length > 0 && (
              <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-gray-500 mb-2 px-2">
                <div className="col-span-2 text-center">SET</div>
                <div className="col-span-4 text-center">KG</div>
                <div className="col-span-4 text-center">REPS</div>
                <div className="col-span-2"></div>
              </div>
            )}

            {/* Sets Rows */}
            <div className="space-y-2 mb-4">
              {ex.sets.map((set, setIndex) => (
                <div key={setIndex} className="grid grid-cols-12 gap-2 items-center bg-[#0f0f0f] rounded-lg p-2">
                  <div className="col-span-2 text-center font-bold text-gray-500">
                    {setIndex + 1}
                  </div>
                  <div className="col-span-4">
                    <input 
                      type="number" 
                      value={set.weight || ''} 
                      onChange={e => updateSet(exIndex, setIndex, 'weight', Number(e.target.value))}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md py-1.5 text-center text-white outline-none focus:border-[#3B82F6]"
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-4">
                    <input 
                      type="number" 
                      value={set.reps || ''} 
                      onChange={e => updateSet(exIndex, setIndex, 'reps', Number(e.target.value))}
                      className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-md py-1.5 text-center text-white outline-none focus:border-[#3B82F6]"
                      placeholder="0"
                    />
                  </div>
                  <div className="col-span-2 flex justify-center">
                    <button onClick={() => removeSet(exIndex, setIndex)} className="text-gray-600 hover:text-red-400">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => addSet(exIndex)}
              className="w-full py-2 flex items-center justify-center gap-2 text-sm font-medium text-[#3B82F6] bg-blue-900/20 rounded-lg hover:bg-blue-900/40 transition-colors"
            >
              <Plus size={16} /> Add Set
            </button>
          </div>
        ))}
      </div>

      {/* Add Exercise Button */}
      <button 
        onClick={addExercise}
        className="w-full py-4 border-2 border-dashed border-[#2a2a2a] text-gray-400 hover:text-white hover:border-gray-500 rounded-xl flex items-center justify-center gap-2 font-medium transition-colors"
      >
        <Plus size={20} /> Add Exercise
      </button>

      {/* Finish Button */}
      <button 
        onClick={handleFinish}
        className="w-full py-4 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20 transition-colors"
      >
        <CheckCircle2 size={22} /> Finish Session
      </button>
    </div>
  );
}
