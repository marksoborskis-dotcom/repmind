import { useState } from 'react';
import { useWorkoutStore } from '../hooks/useWorkoutStore';
import { loadProfile } from './Profile';
import {
  BrainCircuit, CalendarDays, ChevronDown, ChevronUp,
  Save, CheckCircle2, ChevronRight, AlertTriangle,
  RefreshCw, Plus, Trash2, Clock, Zap, BookMarked
} from 'lucide-react';
import ExerciseModal from '../components/ExerciseModal';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MUSCLES = ['chest', 'back', 'legs', 'shoulders', 'biceps', 'triceps', 'abs', 'rest'];
const DURATION_PRESETS = ['30 min', '45 min', '60 min', '90 min', 'Custom'];
const INTENSITIES = [
  { value: 'low',    label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High' },
] as const;

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

interface SavedPlan {
  id: string;
  name: string;
  plan: WeeklyPlan;
  createdAt: string;
}

interface QuickSuggestion {
  muscleGroup: string;
  reason: string;
  exercises: AIExercise[];
  progressionNotes: string[];
  motivationalLine: string;
}

type Mode = 'menu' | 'quick' | 'weekly-config' | 'weekly-result';
type Intensity = 'low' | 'medium' | 'high';

const ACTIVE_PLAN_KEY = 'repmind_weekly_plan';
const SAVED_PLANS_KEY = 'repmind_saved_plans';

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

function loadActivePlan(): WeeklyPlan | null {
  try {
    const raw = localStorage.getItem(ACTIVE_PLAN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeeklyPlan;
    if (!parsed?.days || !Array.isArray(parsed.days) || parsed.days.length === 0) {
      localStorage.removeItem(ACTIVE_PLAN_KEY);
      return null;
    }
    return normalizePlan(parsed);
  } catch {
    localStorage.removeItem(ACTIVE_PLAN_KEY);
    return null;
  }
}

function saveActivePlan(plan: WeeklyPlan) {
  try { localStorage.setItem(ACTIVE_PLAN_KEY, JSON.stringify(plan)); } catch { /* ignore */ }
}

function loadSavedPlans(): SavedPlan[] {
  try {
    const raw = localStorage.getItem(SAVED_PLANS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedPlan[];
  } catch { return []; }
}

function persistSavedPlans(plans: SavedPlan[]) {
  try { localStorage.setItem(SAVED_PLANS_KEY, JSON.stringify(plans)); } catch { /* ignore */ }
}

function extractJSON(text: string): unknown {
  try { return JSON.parse(text.trim()); } catch { /* keep going */ }
  const stripped = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(stripped); } catch { /* keep going */ }
  const s = stripped.indexOf('{');
  const e = stripped.lastIndexOf('}');
  if (s !== -1 && e > s) {
    try { return JSON.parse(stripped.slice(s, e + 1)); } catch { /* keep going */ }
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

function buildProfileContext(): string {
  const p = loadProfile();
  if (!p) return '';
  const bmi = (p.weight / ((p.height / 100) ** 2)).toFixed(1);
  const goalLabel = p.goal === 'lose_fat' ? 'lose fat' : p.goal === 'build_muscle' ? 'build muscle' : 'maintain fitness';
  return `User profile: Age ${p.age}, Height ${p.height}cm, Weight ${p.weight}kg, BMI ${bmi}, Goal: ${goalLabel}, Level: ${p.level}. Tailor weights, reps, and exercise complexity accordingly.`;
}

export default function AISuggestion() {
  const { sessions } = useWorkoutStore();
  const [mode, setMode] = useState<Mode>('menu');
  const [quickSuggestion, setQuickSuggestion] = useState<QuickSuggestion | null>(null);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(() => loadActivePlan());
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>(() => loadSavedPlans());
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Building Program...');
  const [error, setError] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

  // Duration state
  const [durationPreset, setDurationPreset] = useState('60 min');
  const [customDuration, setCustomDuration] = useState('');
  const [intensity, setIntensity] = useState<Intensity>('medium');

  // Computed effective duration string
  const effectiveDuration = durationPreset === 'Custom'
    ? (customDuration ? `${customDuration} min` : '60 min')
    : durationPreset;

  // Swap exercise
  const [swapping, setSwapping] = useState<{ day: string; exIndex: number } | null>(null);
  const [swapOptions, setSwapOptions] = useState<AIExercise[]>([]);
  const [swapLoading, setSwapLoading] = useState(false);

  // Save plan modal
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [planName, setPlanName] = useState('');
  const [showSavedPlans, setShowSavedPlans] = useState(false);

  // Adding extra exercise to quick suggestion
  const [addingToQuick, setAddingToQuick] = useState(false);

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

  // ── QUICK SUGGESTION ──
  async function generateQuickSuggestion() {
    setLoading(true);
    setLoadingMsg('Building your session...');
    setError(null);
    setQuickSuggestion(null);
    try {
      const recent = getRecentExercises();
      const prompt = `You are a fitness coach. Suggest ONE workout session for today.
${buildProfileContext()}
Duration: ${effectiveDuration}, Intensity: ${intensity}.
Avoid recently done exercises: ${JSON.stringify(recent)}.
Split "Arms" into Biceps and Triceps. Adjust exercise count to fit ${effectiveDuration}.
Respond with ONLY a raw JSON object, no markdown, no explanation:
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

  // ── ADD EXERCISE TO QUICK SUGGESTION ──
  async function addExerciseToQuick() {
    if (!quickSuggestion) return;
    setAddingToQuick(true);
    try {
      const existing = quickSuggestion.exercises.map(e => e.name);
      const prompt = `You are a fitness coach. Suggest ONE additional exercise for a ${quickSuggestion.muscleGroup} workout.
${buildProfileContext()}
Avoid these already in the session: ${JSON.stringify(existing)}.
Respond with ONLY a raw JSON object, no markdown:
{ "name": "Cable Fly", "sets": 3, "reps": 12, "weight": 20, "primaryMuscle": "chest" }`;
      const raw = await askClaude(prompt);
      const parsed = extractJSON(raw) as AIExercise;
      if (!parsed?.name) throw new Error('Invalid exercise from AI.');
      setQuickSuggestion(prev => prev ? {
        ...prev,
        exercises: [...prev.exercises, parsed],
      } : prev);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setAddingToQuick(false);
    }
  }

  // ── REMOVE EXERCISE FROM QUICK SUGGESTION ──
  function removeExerciseFromQuick(index: number) {
    setQuickSuggestion(prev => prev ? {
      ...prev,
      exercises: prev.exercises.filter((_, i) => i !== index),
    } : prev);
  }

  // ── WEEKLY PLAN ──
  async function generateWeeklyPlan() {
    setLoading(true);
    setLoadingMsg('Building your week...');
    setError(null);
    try {
      const recent = getRecentExercises();
      const scheduleLines = Object.entries(schedule)
        .map(([day, muscles]) => `${day}: ${muscles.join(', ')}`)
        .join('\n');
      const prompt = `You are a fitness coach. Create a 7-day workout plan.
${buildProfileContext()}
Session duration: ${effectiveDuration}, Intensity: ${intensity}.
Schedule:\n${scheduleLines}
Avoid: ${JSON.stringify(recent)}.
Adjust exercises per day to fit ${effectiveDuration} at ${intensity} intensity.
Rest days get exercises: [].
Respond with ONLY a raw JSON object, no markdown, no explanation:
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
  "weekSummary": "A balanced split.",
  "motivationalLine": "Great week ahead!"
}
Include all 7 days Monday to Sunday.`;
      const raw = await askClaude(prompt);
      const parsed = extractJSON(raw) as WeeklyPlan;
      if (!Array.isArray(parsed?.days) || parsed.days.length === 0) {
        throw new Error('Invalid response from AI — missing days array.');
      }
      const normalized = normalizePlan(parsed);
      saveActivePlan(normalized);
      setWeeklyPlan(normalized);
      setMode('weekly-result');
      setExpandedDay(normalized.days.find(d => d.exercises.length > 0)?.day ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  // ── SWAP EXERCISE ──
  async function startSwap(day: string, exIndex: number, ex: AIExercise) {
    setSwapping({ day, exIndex });
    setSwapLoading(true);
    setSwapOptions([]);
    try {
      const prompt = `You are a fitness coach. Suggest 3 alternative exercises to replace "${ex.name}" (targets: ${ex.primaryMuscle}).
${buildProfileContext()}
All alternatives must target the same muscle: ${ex.primaryMuscle}.
Respond with ONLY a raw JSON array, no markdown:
[
  { "name": "Incline Bench Press", "sets": 4, "reps": 8, "weight": 70, "primaryMuscle": "${ex.primaryMuscle}" },
  { "name": "Cable Fly", "sets": 3, "reps": 12, "weight": 20, "primaryMuscle": "${ex.primaryMuscle}" },
  { "name": "Push Up", "sets": 3, "reps": 15, "weight": null, "primaryMuscle": "${ex.primaryMuscle}" }
]`;
      const raw = await askClaude(prompt);
      const stripped = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const aStart = stripped.indexOf('[');
      const aEnd = stripped.lastIndexOf(']');
      const parsed = JSON.parse(stripped.slice(aStart, aEnd + 1)) as AIExercise[];
      setSwapOptions(parsed);
    } catch {
      setSwapping(null);
      setSwapOptions([]);
    } finally {
      setSwapLoading(false);
    }
  }

  function applySwap(newEx: AIExercise) {
    if (!swapping || !weeklyPlan) return;
    const updated = {
      ...weeklyPlan,
      days: weeklyPlan.days.map(d => {
        if (d.day !== swapping.day) return d;
        const exs = [...d.exercises];
        exs[swapping.exIndex] = newEx;
        return { ...d, exercises: exs };
      }),
    };
    saveActivePlan(updated);
    setWeeklyPlan(updated);
    setSwapping(null);
    setSwapOptions([]);
  }

  // ── ADD EXERCISE TO WEEKLY DAY ──
  async function addExerciseToDay(day: string, muscles: string[]) {
    if (!weeklyPlan) return;
    setLoadingMsg('Finding an exercise...');
    setLoading(true);
    try {
      const existing = weeklyPlan.days.find(d => d.day === day)?.exercises.map(e => e.name) ?? [];
      const prompt = `You are a fitness coach. Suggest ONE additional exercise for ${day}.
Target muscles: ${muscles.join(', ')}.
${buildProfileContext()}
Avoid these already in the plan: ${JSON.stringify(existing)}.
Respond with ONLY a raw JSON object, no markdown:
{ "name": "Cable Fly", "sets": 3, "reps": 12, "weight": 20, "primaryMuscle": "chest" }`;
      const raw = await askClaude(prompt);
      const parsed = extractJSON(raw) as AIExercise;
      if (!parsed?.name) throw new Error('Invalid exercise from AI.');
      const updated = {
        ...weeklyPlan,
        days: weeklyPlan.days.map(d => {
          if (d.day !== day) return d;
          return { ...d, exercises: [...d.exercises, parsed] };
        }),
      };
      saveActivePlan(updated);
      setWeeklyPlan(updated);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function removeExerciseFromDay(day: string, exIndex: number) {
    if (!weeklyPlan) return;
    const updated = {
      ...weeklyPlan,
      days: weeklyPlan.days.map(d => {
        if (d.day !== day) return d;
        return { ...d, exercises: d.exercises.filter((_, i) => i !== exIndex) };
      }),
    };
    saveActivePlan(updated);
    setWeeklyPlan(updated);
  }

  // ── SAVE NAMED PLAN ──
  function saveNamedPlan() {
    if (!weeklyPlan || !planName.trim()) return;
    const newPlan: SavedPlan = {
      id: Date.now().toString(),
      name: planName.trim(),
      plan: weeklyPlan,
      createdAt: new Date().toLocaleDateString(),
    };
    const updated = [...savedPlans, newPlan];
    setSavedPlans(updated);
    persistSavedPlans(updated);
    setPlanName('');
    setShowSaveModal(false);
  }

  function loadNamedPlan(sp: SavedPlan) {
    const normalized = normalizePlan(sp.plan);
    saveActivePlan(normalized);
    setWeeklyPlan(normalized);
    setMode('weekly-result');
    setShowSavedPlans(false);
    setExpandedDay(normalized.days.find(d => d.exercises.length > 0)?.day ?? null);
  }

  function deleteNamedPlan(id: string) {
    const updated = savedPlans.filter(p => p.id !== id);
    setSavedPlans(updated);
    persistSavedPlans(updated);
  }

  function reset() {
    setMode('menu');
    setQuickSuggestion(null);
    setError(null);
    setSwapping(null);
    setSwapOptions([]);
  }

  const profile = loadProfile();

  // ── DURATION / INTENSITY UI ──
  const DurationIntensityControls = () => (
    <div className="mb-6 space-y-4">
      <div>
        <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2 flex items-center gap-2">
          <Clock size={12} /> Duration
        </p>
        <div className="flex gap-2 flex-wrap">
          {DURATION_PRESETS.map(d => (
            <button key={d} onClick={() => setDurationPreset(d)}
              className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                durationPreset === d
                  ? 'bg-zinc-800 border-gray-500 text-white'
                  : 'bg-[#111] border-[#222] text-gray-500 hover:border-gray-600'
              }`}
            >{d}</button>
          ))}
        </div>
        {durationPreset === 'Custom' && (
          <div className="mt-3 flex items-center gap-3">
            <input
              type="number"
              value={customDuration}
              onChange={e => setCustomDuration(e.target.value)}
              placeholder="e.g. 75"
              min={10}
              max={240}
              className="w-28 bg-[#1a1a1a] border border-[#333] rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-blue-500 transition"
            />
            <span className="text-gray-500 text-sm">minutes</span>
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-2 flex items-center gap-2">
          <Zap size={12} /> Intensity
        </p>
        <div className="flex gap-2">
          {INTENSITIES.map(i => (
            <button key={i.value} onClick={() => setIntensity(i.value)}
              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${
                intensity === i.value
                  ? 'bg-zinc-800 border-gray-500 text-white'
                  : 'bg-[#111] border-[#222] text-gray-500 hover:border-gray-600'
              }`}
            >{i.label}</button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="pt-10 pb-24 px-6 max-w-lg mx-auto min-h-screen text-white font-sans">
      <div className="mb-6">
        <h1 className="text-4xl font-bold mb-2">AI Coach</h1>
        <p className="text-gray-500 text-lg">Personalized training for your goals.</p>
      </div>

      {profile && (
        <div className="mb-6 flex flex-wrap gap-2">
          <span className="bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 text-xs px-3 py-1.5 rounded-full">
            {profile.weight}kg · {profile.height}cm
          </span>
          <span className="bg-[#1a1a1a] border border-[#2a2a2a] text-gray-400 text-xs px-3 py-1.5 rounded-full capitalize">
            {profile.level}
          </span>
          <span className="bg-blue-900/20 border border-blue-900/30 text-blue-400 text-xs px-3 py-1.5 rounded-full">
            {profile.goal === 'lose_fat' ? 'Lose Fat' : profile.goal === 'build_muscle' ? 'Build Muscle' : 'Maintain'}
          </span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-900/20 border border-red-900/30 rounded-2xl text-red-400 text-sm flex items-center gap-3">
          <AlertTriangle size={18} /> {error}
        </div>
      )}

      {/* Duration & Intensity shown everywhere except weekly result and loading */}
      {!loading && mode !== 'weekly-result' && <DurationIntensityControls />}

      {/* Loading */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="animate-spin text-blue-500 mb-4"><BrainCircuit size={44} /></div>
          <p className="text-gray-500 font-bold text-xs uppercase tracking-[0.2em] animate-pulse">{loadingMsg}</p>
        </div>
      )}

      {/* ── MENU ── */}
      {mode === 'menu' && !loading && (
        <div className="space-y-4">
          <button onClick={() => { setMode('quick'); generateQuickSuggestion(); }}
            className="w-full bg-[#111] border border-[#222] hover:border-gray-700 rounded-2xl p-6 text-left transition-all flex items-center justify-between group"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BrainCircuit size={20} className="text-blue-500" />
                <h2 className="font-bold text-lg">Quick Suggestion</h2>
              </div>
              <p className="text-gray-500 text-sm">{effectiveDuration} · {intensity} intensity</p>
            </div>
            <ChevronRight size={20} className="text-gray-600 group-hover:text-white transition" />
          </button>

          <button onClick={() => setMode('weekly-config')}
            className="w-full bg-[#111] border border-[#222] hover:border-gray-700 rounded-2xl p-6 text-left transition-all flex items-center justify-between group"
          >
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CalendarDays size={20} className="text-blue-500" />
                <h2 className="font-bold text-lg">Weekly Planner</h2>
              </div>
              <p className="text-gray-500 text-sm">{effectiveDuration} · {intensity} intensity</p>
            </div>
            <ChevronRight size={20} className="text-gray-600 group-hover:text-white transition" />
          </button>

          {savedPlans.length > 0 && (
            <button onClick={() => setShowSavedPlans(true)}
              className="w-full flex items-center justify-between bg-blue-900/10 border border-blue-900/20 p-5 rounded-2xl"
            >
              <span className="text-sm font-bold text-blue-400 flex items-center gap-2 uppercase tracking-widest">
                <BookMarked size={16} /> Saved Plans ({savedPlans.length})
              </span>
              <ChevronRight size={16} className="text-blue-500" />
            </button>
          )}

          {weeklyPlan && (
            <button onClick={() => setMode('weekly-result')}
              className="w-full flex items-center justify-between bg-[#111] border border-[#222] p-5 rounded-2xl hover:border-gray-600 transition"
            >
              <span className="text-sm font-bold text-gray-300 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-500" /> Active Plan
              </span>
              <ChevronRight size={16} className="text-gray-500" />
            </button>
          )}
        </div>
      )}

      {/* ── QUICK RESULT ── */}
      {mode === 'quick' && quickSuggestion && !loading && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <div className="bg-[#111] rounded-2xl p-6 border border-[#222]">
            <span className="text-blue-500 text-xs font-bold uppercase tracking-widest">
              Target: {quickSuggestion.muscleGroup}
            </span>
            <p className="text-gray-400 text-sm mt-3 leading-snug">"{quickSuggestion.reason}"</p>
            <div className="flex gap-2 mt-3">
              <span className="bg-[#2a2a2a] text-gray-400 text-xs px-2 py-1 rounded-full">{effectiveDuration}</span>
              <span className="bg-[#2a2a2a] text-gray-400 text-xs px-2 py-1 rounded-full capitalize">{intensity}</span>
            </div>
          </div>

          <div className="space-y-3">
            {quickSuggestion.exercises.map((ex, i) => (
              <div key={i} className="bg-[#111] p-5 rounded-2xl border border-[#222] flex justify-between items-center group">
                <button onClick={() => setSelectedExercise(ex.name)} className="text-left flex-1">
                  <span className="text-base font-bold text-white hover:text-blue-400 transition block">{ex.name}</span>
                  <span className="text-xs text-gray-500 mt-1 uppercase tracking-tighter font-bold">{ex.sets} sets × {ex.reps} reps</span>
                </button>
                <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                  <span className="text-blue-500 font-bold">{ex.weight ? `${ex.weight}kg` : 'Bwt'}</span>
                  <button
                    onClick={() => removeExerciseFromQuick(i)}
                    className="p-1.5 rounded-lg bg-[#222] hover:bg-red-900/40 text-gray-400 hover:text-red-400 transition"
                    title="Remove"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}

            {/* Add exercise to quick suggestion */}
            <button
              onClick={addExerciseToQuick}
              disabled={addingToQuick}
              className="w-full py-3 border border-dashed border-[#333] rounded-2xl text-gray-500 hover:text-white hover:border-gray-500 text-sm font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {addingToQuick
                ? <><div className="animate-spin"><RefreshCw size={14} /></div> Adding...</>
                : <><Plus size={14} /> Add Exercise</>
              }
            </button>
          </div>

          <button onClick={reset} className="w-full py-4 text-gray-600 hover:text-white transition font-bold text-sm">
            ← Back to Coach
          </button>
        </div>
      )}

      {/* ── WEEKLY CONFIG ── */}
      {mode === 'weekly-config' && !loading && (
        <div className="space-y-8 animate-in fade-in duration-300">
          <div>
            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-widest mb-6">Assign Daily Muscles</h3>
            <div className="space-y-6">
              {DAYS.map(day => (
                <div key={day}>
                  <p className="text-[10px] font-black text-gray-700 uppercase mb-3 ml-1 tracking-tighter">{day}</p>
                  <div className="flex flex-wrap gap-2">
                    {MUSCLES.map(m => (
                      <button key={m} onClick={() => toggleMuscle(day, m)}
                        className={`px-4 py-2 rounded-full text-xs transition-all border ${
                          schedule[day]?.includes(m)
                            ? 'bg-zinc-800 border-gray-600 text-white font-bold'
                            : 'bg-[#111] border-[#222] text-gray-500 hover:border-gray-700'
                        }`}
                      >{m.charAt(0).toUpperCase() + m.slice(1)}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <button onClick={generateWeeklyPlan}
            className="w-full py-5 bg-[#3B82F6] hover:bg-blue-500 text-white rounded-2xl font-bold text-lg transition shadow-xl shadow-blue-900/10"
          >Generate Plan</button>
          <button onClick={reset} className="w-full py-3 text-gray-600 hover:text-white transition font-bold text-sm">← Back to Coach</button>
        </div>
      )}

      {/* ── WEEKLY RESULT ── */}
      {mode === 'weekly-result' && weeklyPlan && !loading && (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold uppercase tracking-tight">Your Week</h2>
            <div className="flex gap-2">
              <button onClick={() => setShowSaveModal(true)}
                className="text-xs font-bold text-blue-400 flex items-center gap-1 border border-blue-900/30 px-3 py-1.5 rounded-xl hover:bg-blue-900/20 transition"
              ><Save size={12} /> Save</button>
              <button onClick={() => { setWeeklyPlan(null); setMode('weekly-config'); localStorage.removeItem(ACTIVE_PLAN_KEY); }}
                className="text-xs font-bold text-gray-500 border border-[#222] px-3 py-1.5 rounded-xl hover:text-white transition"
              >Rebuild</button>
            </div>
          </div>

          <div className="space-y-3">
            {(weeklyPlan.days ?? []).map((day) => {
              const exercises = Array.isArray(day.exercises) ? day.exercises : [];
              const muscleGroups = Array.isArray(day.muscleGroups) ? day.muscleGroups : [];
              const isRest = exercises.length === 0;
              const isExpanded = expandedDay === day.day;
              return (
                <div key={day.day} className={`rounded-2xl border transition-all ${isRest ? 'bg-black border-[#111] opacity-40' : 'bg-[#111] border-[#222]'}`}>
                  <button disabled={isRest} onClick={() => setExpandedDay(isExpanded ? null : day.day)}
                    className="w-full p-5 flex items-center justify-between text-left"
                  >
                    <div>
                      <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-1">{day.day}</span>
                      <div className="flex gap-2 flex-wrap">
                        {isRest
                          ? <span className="text-sm text-gray-800 font-bold">Rest Day</span>
                          : muscleGroups.map(m => <span key={m} className="text-xs font-bold text-blue-500 uppercase tracking-tighter">{m}</span>)
                        }
                      </div>
                    </div>
                    {!isRest && (isExpanded ? <ChevronUp size={18} className="text-gray-600" /> : <ChevronDown size={18} className="text-gray-600" />)}
                  </button>

                  {isExpanded && !isRest && (
                    <div className="px-5 pb-5 pt-2 space-y-2 border-t border-[#222]/50">
                      {exercises.map((ex, i) => (
                        <div key={i} className="bg-black/30 p-3 rounded-xl border border-[#222]">
                          {swapping?.day === day.day && swapping?.exIndex === i ? (
                            <div className="space-y-2">
                              <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">
                                {swapLoading ? 'Finding alternatives...' : 'Pick a replacement:'}
                              </p>
                              {swapLoading && (
                                <div className="flex items-center gap-2 text-gray-500 text-sm">
                                  <div className="animate-spin"><RefreshCw size={14} /></div> Loading...
                                </div>
                              )}
                              {swapOptions.map((opt, oi) => (
                                <button key={oi} onClick={() => applySwap(opt)}
                                  className="w-full text-left p-3 bg-[#1a1a1a] border border-[#333] hover:border-blue-500/50 rounded-xl transition"
                                >
                                  <span className="text-sm font-bold text-white block">{opt.name}</span>
                                  <span className="text-xs text-gray-500">{opt.sets} × {opt.reps} · {opt.weight ? `${opt.weight}kg` : 'Bwt'}</span>
                                </button>
                              ))}
                              <button onClick={() => { setSwapping(null); setSwapOptions([]); }}
                                className="text-xs text-gray-600 hover:text-white transition"
                              >Cancel</button>
                            </div>
                          ) : (
                            <div className="flex justify-between items-center">
                              <button onClick={() => setSelectedExercise(ex.name)} className="text-left flex-1">
                                <span className="text-sm font-bold text-white hover:text-blue-400 transition block">{ex.name}</span>
                                <span className="text-[10px] font-bold text-gray-600 uppercase mt-0.5 block">{ex.sets} × {ex.reps} • {ex.primaryMuscle}</span>
                              </button>
                              <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                <span className="text-sm font-bold text-blue-500">{ex.weight ? `${ex.weight}kg` : 'Bwt'}</span>
                                <button onClick={() => startSwap(day.day, i, ex)} title="Swap"
                                  className="p-1.5 rounded-lg bg-[#222] hover:bg-[#333] text-gray-400 hover:text-white transition"
                                ><RefreshCw size={13} /></button>
                                <button onClick={() => removeExerciseFromDay(day.day, i)} title="Remove"
                                  className="p-1.5 rounded-lg bg-[#222] hover:bg-red-900/40 text-gray-400 hover:text-red-400 transition"
                                ><Trash2 size={13} /></button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      <button onClick={() => addExerciseToDay(day.day, muscleGroups)}
                        className="w-full mt-1 py-2.5 border border-dashed border-[#333] rounded-xl text-gray-600 hover:text-white hover:border-gray-500 text-xs font-bold flex items-center justify-center gap-2 transition"
                      ><Plus size={14} /> Add Exercise</button>
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

      {/* Save plan modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => setShowSaveModal(false)}>
          <div className="bg-[#111] rounded-t-3xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Name This Plan</h3>
            <input
              type="text"
              value={planName}
              onChange={e => setPlanName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveNamedPlan()}
              placeholder="e.g. Push Pull Legs, Summer Cut..."
              className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white outline-none focus:border-blue-500 transition mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={saveNamedPlan} disabled={!planName.trim()}
                className="flex-1 py-3 bg-[#3B82F6] hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl font-bold transition"
              >Save</button>
              <button onClick={() => setShowSaveModal(false)}
                className="flex-1 py-3 bg-[#2a2a2a] text-gray-300 rounded-xl font-bold hover:bg-[#333] transition"
              >Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Saved plans modal */}
      {showSavedPlans && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => setShowSavedPlans(false)}>
          <div className="bg-[#111] rounded-t-3xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-white mb-4">Saved Plans</h3>
            <div className="space-y-3">
              {savedPlans.map(sp => (
                <div key={sp.id} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 flex items-center justify-between">
                  <button onClick={() => loadNamedPlan(sp)} className="text-left flex-1">
                    <p className="font-bold text-white text-sm">{sp.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Saved {sp.createdAt}</p>
                  </button>
                  <button onClick={() => deleteNamedPlan(sp.id)} className="p-2 text-gray-500 hover:text-red-400 transition ml-2">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => setShowSavedPlans(false)} className="w-full mt-4 py-3 text-gray-500 font-bold text-sm">Close</button>
          </div>
        </div>
      )}

      {selectedExercise && (
        <ExerciseModal exerciseName={selectedExercise} onClose={() => setSelectedExercise(null)} />
      )}
    </div>
  );
}
