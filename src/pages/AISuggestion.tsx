import { useState } from 'react';
import { useWorkoutStore } from '../hooks/useWorkoutStore';
import {
  BrainCircuit, CalendarDays, ChevronDown, ChevronUp,
  Save, CheckCircle2, ChevronRight, AlertTriangle
} from 'lucide-react';
import ExerciseModal from '../components/ExerciseModal';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MUSCLES = ['chest', 'back', 'legs', 'shoulders', 'biceps', 'triceps', 'abs', 'rest'];

interface AIExercise {
  name: string;
  sets: number;
  reps: number;
  weight: number | null;
  primaryMuscle: string;
}

interface DayPlan {
  day: string;
  muscleGroups: string[];
  exercises: AIExercise[];
  notes: string;
}

interface WeeklyPlan {
  days: DayPlan[];
  weekSummary: string;
  motivationalLine: string;
}

interface QuickSuggestion {
  muscleGroup: string;
  reason: string;
  exercises: AIExercise[];
  progressionNotes: string[];
  motivationalLine: string;
}

type Mode = 'menu' | 'quick' | 'weekly';

const PLAN_KEY = 'repmind_weekly_plan';

function normalizePlan(plan: WeeklyPlan): WeeklyPlan {
  return {
    ...plan,
    days: (plan.days ?? []).map(day => ({
      ...day,
      exercises: Array.isArray(day.exercises) ? day.exercises : [],
      muscleGroups: Array.isArray(day.muscleGroups) ? day.muscleGroups : [],
    })),
  };
}

function loadSavedPlan(): WeeklyPlan | null {
  try {
    const raw = localStorage.getItem(PLAN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeeklyPlan;
    if (!parsed?.days || !Array.isArray(parsed.days) || parsed.days.length === 0) {
      localStorage.removeItem(PLAN_KEY);
      return null;
    }
    return normalizePlan(parsed);
  } catch {
    localStorage.removeItem(PLAN_KEY);
    return null;
  }
}

function savePlan(plan: WeeklyPlan) {
  try { localStorage.setItem(PLAN_KEY, JSON.stringify(plan)); } catch { /* ignore */ }
}

function clearPlan() {
  try { localStorage.removeItem(PLAN_KEY); } catch { /* ignore */ }
}

function extractJSON(text: string): unknown {
  try { return JSON.parse(text.trim()); } catch { /* keep going */ }
  const stripped = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(stripped); } catch { /* keep going */ }
  const objStart = stripped.indexOf('{');
  const objEnd = stripped.lastIndexOf('}');
  if (objStart !== -1 && objEnd > objStart) {
    try { return JSON.parse(stripped.slice(objStart, objEnd + 1)); } catch { /* keep going */ }
  }
  throw new Error('AI returned an unreadable response. Please try again.');
}

async function askClaude(prompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Missing VITE_ANTHROPIC_API_KEY — add it to your .env and restart.');
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error ${response.status}: ${err}`);
  }
  const data = await response.json();
  return data.content?.[0]?.text ?? '';
}

export default function AISuggestion() {
  const { sessions } = useWorkoutStore();
  const [mode, setMode] = useState<Mode>('menu');
  const [quickSuggestion, setQuickSuggestion] = useState<QuickSuggestion | null>(null);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(() => loadSavedPlan());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  const [schedule, setSchedule] = useState<Record<string, string[]>>({
    Monday: ['chest', 'triceps'],
    Tuesday: ['rest'],
    Wednesday: ['back', 'biceps'],
    Thursday: ['rest'],
    Friday: ['legs'],
    Saturday: ['shoulders', 'abs'],
    Sunday: ['rest'],
  });

  function toggleMuscle(day: string, muscle: string) {
    setSchedule(prev => {
      const current = prev[day] ?? [];
      if (muscle === 'rest') return { ...prev, [day]: ['rest'] };
      const withoutRest = current.filter(m => m !== 'rest');
      const updated = withoutRest.includes(muscle)
        ? withoutRest.filter(m => m !== muscle)
        : [...withoutRest, muscle];
      return { ...prev, [day]: updated.length === 0 ? ['rest'] : updated };
    });
  }

  function getRecentExercises(): string[] {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    return [...new Set(
      sessions
        .filter(s => new Date(s.date) >= cutoff)
        .flatMap(s => s.exercises.map(e => e.name.toLowerCase()))
    )];
  }

  async function generateQuickSuggestion() {
    setLoading(true);
    setError(null);
    setQuickSuggestion(null);
    try {
      const recent = getRecentExercises();
      const prompt = `You are a fitness coach. Suggest ONE workout session for today.
Avoid these recently done exercises: ${JSON.stringify(recent)}.
Split "Arms" into separate Biceps and Triceps entries.
You MUST respond with ONLY a raw JSON object. No markdown, no explanation, no code fences, nothing else.
Use exactly this shape:
{
  "muscleGroup": "Chest & Triceps",
  "reason": "You haven't trained chest in 3 days.",
  "exercises": [
    { "name": "Bench Press", "sets": 4, "reps": 8, "weight": 80, "primaryMuscle": "chest" }
  ],
  "progressionNotes": ["Increase weight by 2.5kg next session"],
  "motivationalLine": "Let's go!"
}`;
      const raw = await askClaude(prompt);
      const parsed = extractJSON(raw) as QuickSuggestion;
      if (!Array.isArray(parsed?.exercises)) throw new Error('Invalid response shape from AI.');
      setQuickSuggestion(parsed);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setMode('menu');
    } finally {
      setLoading(false);
    }
  }

  async function generateWeeklyPlan() {
    setLoading(true);
    setError(null);
    try {
      const recent = getRecentExercises();
      const scheduleLines = Object.entries(schedule)
        .map(([day, muscles]) => `${day}: ${muscles.join(', ')}`)
        .join('\n');
      const prompt = `You are a fitness coach. Create a 7-day workout plan.
Weekly schedule:
${scheduleLines}

Avoid these recently done exercises: ${JSON.stringify(recent)}.
For rest days set exercises to an empty array [].
You MUST respond with ONLY a raw JSON object. No markdown, no explanation, no code fences, nothing else.
Use exactly this shape:
{
  "days": [
    {
      "day": "Monday",
      "muscleGroups": ["chest", "triceps"],
      "exercises": [
        { "name": "Bench Press", "sets": 4, "reps": 8, "weight": 80, "primaryMuscle": "chest" }
      ],
      "notes": "Focus on form"
    }
  ],
  "weekSummary": "A balanced push/pull/legs split.",
  "motivationalLine": "Great week ahead!"
}
Include all 7 days in order (Monday to Sunday).`;
      const raw = await askClaude(prompt);
      const parsed = extractJSON(raw) as WeeklyPlan;
      if (!Array.isArray(parsed?.days) || parsed.days.length === 0) {
        throw new Error('Invalid response shape from AI — missing days array.');
      }
      const normalized = normalizePlan(parsed);
      savePlan(normalized);
      setWeeklyPlan(normalized);
      setExpandedDay(normalized.days.find(d => d.exercises.length > 0)?.day ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setMode('menu');
    setQuickSuggestion(null);
    setError(null);
  }

  function handleRebuild() {
    clearPlan();
    setWeeklyPlan(null);
    setExpandedDay(null);
  }

  return (
    <div className="pt-10 pb-24 px-6 max-w-lg mx-auto min-h-screen text-white font-sans">
      <div className="mb-10">
        <h1 className="text-4xl font-bold mb-2">AI Coach</h1>
        <p className="text-gray-500 text-lg">Personalized training for your goals.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-900/30 rounded-2xl text-red-400 text-sm flex items-center gap-3">
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {/* ── MENU ── */}
      {mode === 'menu' && !loading && (
        <div className="space-y-4">
          <button
            onClick={() => { setMode('quick'); generateQuickSuggestion(); }}
            className="w-full bg-[#111] border border-[#222] hover:border-gray-700 rounded-2xl p-6 text-left transition-all flex items-center justify-between group"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BrainCircuit size={20} className="text-blue-500" />
                <h2 className="font-bold text-lg">Quick Suggestion</h2>
              </div>
              <p className="text-gray-500 text-sm">One session based on your history.</p>
            </div>
            <ChevronRight size={20} className="text-gray-600 group-hover:text-white transition" />
          </button>

          <button
            onClick={() => setMode('weekly')}
            className="w-full bg-[#111] border border-[#222] hover:border-gray-700 rounded-2xl p-6 text-left transition-all flex items-center justify-between group"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CalendarDays size={20} className="text-blue-500" />
                <h2 className="font-bold text-lg">Weekly Planner</h2>
              </div>
              <p className="text-gray-500 text-sm">Design your full 7-day routine.</p>
            </div>
            <ChevronRight size={20} className="text-gray-600 group-hover:text-white transition" />
          </button>

          {weeklyPlan && (
            <button
              onClick={() => setMode('weekly')}
              className="w-full flex items-center justify-between bg-blue-900/10 border border-blue-900/20 p-5 rounded-2xl"
            >
              <span className="text-sm font-bold text-blue-400 flex items-center gap-2 uppercase tracking-widest">
                <Save size={16} /> Saved Weekly Plan
              </span>
              <CheckCircle2 size={18} className="text-blue-500" />
            </button>
          )}
        </div>
      )}

      {/* ── LOADING ── */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="animate-spin text-blue-500 mb-4">
            <BrainCircuit size={44} />
          </div>
          <p className="text-gray-500 font-bold text-xs uppercase tracking-[0.2em] animate-pulse">
            Building Program...
          </p>
        </div>
      )}

      {/* ── QUICK RESULT ── */}
      {mode === 'quick' && quickSuggestion && !loading && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="bg-[#111] rounded-2xl p-6 border border-[#222]">
            <span className="text-blue-500 text-xs font-bold uppercase tracking-widest">
              Target: {quickSuggestion.muscleGroup}
            </span>
            <p className="text-gray-400 text-sm mt-3 leading-snug">
              "{quickSuggestion.reason}"
            </p>
          </div>
          <div className="space-y-3">
            {quickSuggestion.exercises.map((ex, i) => (
              <button
                key={i}
                onClick={() => setSelectedExercise(ex.name)}
                className="w-full bg-[#111] p-5 rounded-2xl flex justify-between items-center border border-[#222] hover:border-gray-600 transition"
              >
                <div className="text-left">
                  <span className="text-base font-bold text-white block">{ex.name}</span>
                  <span className="text-xs text-gray-500 mt-1 uppercase tracking-tighter font-bold">
                    {ex.sets} sets × {ex.reps} reps
                  </span>
                </div>
                <span className="text-blue-500 font-bold text-lg">
                  {ex.weight ? `${ex.weight}kg` : 'Bwt'}
                </span>
              </button>
            ))}
          </div>
          <button onClick={reset} className="w-full py-4 text-gray-600 hover:text-white transition font-bold text-sm">
            ← Back to Coach
          </button>
        </div>
      )}

      {/* ── WEEKLY SCHEDULE BUILDER ── */}
      {mode === 'weekly' && !loading && !weeklyPlan && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div>
            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-6">
              Assign Daily Muscles
            </h3>
            <div className="space-y-6">
              {DAYS.map(day => (
                <div key={day}>
                  <p className="text-[10px] font-black text-gray-700 uppercase mb-3 ml-1 tracking-tighter">{day}</p>
                  <div className="flex flex-wrap gap-2">
                    {MUSCLES.map(m => (
                      <button
                        key={m}
                        onClick={() => toggleMuscle(day, m)}
                        className={`px-4 py-2 rounded-full text-xs transition-all border ${
                          schedule[day]?.includes(m)
                            ? 'bg-zinc-800 border-gray-600 text-white font-bold'
                            : 'bg-[#111] border-[#222] text-gray-500 hover:border-gray-700'
                        }`}
                      >
                        {m.charAt(0).toUpperCase() + m.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={generateWeeklyPlan}
            className="w-full py-5 bg-[#3B82F6] hover:bg-blue-500 text-white rounded-2xl font-bold text-lg transition flex items-center justify-center gap-2 shadow-xl shadow-blue-900/10"
          >
            Generate Plan
          </button>
          <button onClick={reset} className="w-full py-3 text-gray-600 hover:text-white transition font-bold text-sm">
            ← Back to Coach
          </button>
        </div>
      )}

      {/* ── WEEKLY PLAN DISPLAY ── */}
      {mode === 'weekly' && weeklyPlan && !loading && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center px-1 mb-2">
            <h2 className="text-2xl font-bold uppercase tracking-tight">Your Week</h2>
            <button onClick={handleRebuild} className="text-xs font-bold text-blue-500 border-b border-blue-500/20">
              REBUILD
            </button>
          </div>
          <div className="space-y-3">
            {(weeklyPlan.days ?? []).map((day) => {
              const exercises = Array.isArray(day.exercises) ? day.exercises : [];
              const muscleGroups = Array.isArray(day.muscleGroups) ? day.muscleGroups : [];
              const isRest = exercises.length === 0;
              const isExpanded = expandedDay === day.day;
              return (
                <div key={day.day} className={`rounded-2xl border transition-all ${isRest ? 'bg-black border-[#111] opacity-50' : 'bg-[#111] border-[#222]'}`}>
                  <button
                    disabled={isRest}
                    onClick={() => setExpandedDay(isExpanded ? null : day.day)}
                    className="w-full p-5 flex items-center justify-between text-left"
                  >
                    <div>
                      <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-1">{day.day}</span>
                      <div className="flex gap-2 flex-wrap">
                        {isRest
                          ? <span className="text-sm text-gray-800 font-bold">Rest Day</span>
                          : muscleGroups.map(m => (
                              <span key={m} className="text-xs font-bold text-blue-500 uppercase tracking-tighter">{m}</span>
                            ))
                        }
                      </div>
                    </div>
                    {!isRest && (isExpanded ? <ChevronUp size={18} className="text-gray-600" /> : <ChevronDown size={18} className="text-gray-600" />)}
                  </button>
                  {isExpanded && !isRest && (
                    <div className="px-5 pb-5 pt-2 space-y-3 border-t border-[#222]/50">
                      {exercises.map((ex, i) => (
                        <div key={i} className="group flex justify-between items-center bg-black/30 p-4 rounded-xl border border-[#222] hover:border-gray-600 transition">
                          <button onClick={() => setSelectedExercise(ex.name)} className="text-left">
                            <span className="text-sm font-bold text-white group-hover:text-blue-400 transition block">{ex.name}</span>
                            <span className="text-[10px] font-bold text-gray-600 uppercase mt-0.5 block">{ex.sets} × {ex.reps} • {ex.primaryMuscle}</span>
                          </button>
                          <span className="text-sm font-bold text-blue-500">{ex.weight ? `${ex.weight}kg` : 'Bwt'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <button onClick={reset} className="w-full py-4 text-gray-500 hover:text-white transition font-bold text-sm uppercase tracking-widest">
            ← Back to Menu
          </button>
        </div>
      )}

      {selectedExercise && (
        <ExerciseModal exerciseName={selectedExercise} onClose={() => setSelectedExercise(null)} />
      )}
    </div>
  );
}
