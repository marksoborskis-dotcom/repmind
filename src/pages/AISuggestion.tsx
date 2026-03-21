import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useWorkoutStore } from '../hooks/useWorkoutStore';
import { loadProfile } from './Profile';
import {
  BrainCircuit, CalendarDays, ChevronDown, ChevronUp,
  Save, CheckCircle2, ChevronRight, AlertTriangle,
  RefreshCw, Plus, Trash2, Clock, Zap, BookMarked,
  ClipboardCheck
} from 'lucide-react';
import ExerciseModal from '../components/ExerciseModal';
import type { Session, MuscleGroup } from '../types/workout';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MUSCLES = ['chest', 'back', 'legs', 'shoulders', 'biceps', 'triceps', 'abs', 'rest'];
const DURATION_PRESETS = ['30 min', '45 min', '60 min', '90 min', 'Custom'];
const INTENSITIES = [
  { value: 'low',    label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high',   label: 'High' },
] as const;

const MUSCLE_GROUP_MAP: Record<string, MuscleGroup> = {
  chest: 'chest', back: 'back', legs: 'legs', shoulders: 'shoulders',
  biceps: 'arms', triceps: 'arms', arms: 'arms', abs: 'core', core: 'core',
};

function toMuscleGroups(muscles: string[]): MuscleGroup[] {
  const groups = muscles.map(m => MUSCLE_GROUP_MAP[m.toLowerCase()]).filter((g): g is MuscleGroup => !!g);
  return [...new Set(groups)];
}

interface AIExercise { name: string; sets: number; reps: number; weight: number | null; primaryMuscle: string; }
interface DayPlan { day: string; muscleGroups: string[]; exercises: AIExercise[]; notes: string; }
interface WeeklyPlan { days: DayPlan[]; weekSummary: string; motivationalLine: string; }
interface SavedPlan { id: string; name: string; plan: WeeklyPlan; createdAt: string; }
interface QuickSuggestion { muscleGroup: string; reason: string; exercises: AIExercise[]; progressionNotes: string[]; motivationalLine: string; }

type Mode = 'menu' | 'quick' | 'weekly-config' | 'weekly-result';
type Intensity = 'low' | 'medium' | 'high';

const ACTIVE_PLAN_KEY = 'repmind_weekly_plan';
const SAVED_PLANS_KEY = 'repmind_saved_plans';

function generateId(): string { return `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`; }
function todayISO(): string { return new Date().toISOString().split('T')[0]; }

function normalizePlan(plan: WeeklyPlan): WeeklyPlan {
  return { ...plan, days: (plan.days ?? []).map(day => ({ ...day, exercises: Array.isArray(day.exercises) ? day.exercises : [], muscleGroups: Array.isArray(day.muscleGroups) ? day.muscleGroups : [] })) };
}

function loadActivePlan(): WeeklyPlan | null {
  try { const raw = localStorage.getItem(ACTIVE_PLAN_KEY); if (!raw) return null; const parsed = JSON.parse(raw) as WeeklyPlan; if (!parsed?.days || !Array.isArray(parsed.days) || parsed.days.length === 0) { localStorage.removeItem(ACTIVE_PLAN_KEY); return null; } return normalizePlan(parsed); } catch { localStorage.removeItem(ACTIVE_PLAN_KEY); return null; }
}
function saveActivePlan(plan: WeeklyPlan) { try { localStorage.setItem(ACTIVE_PLAN_KEY, JSON.stringify(plan)); } catch {} }
function loadSavedPlans(): SavedPlan[] { try { const raw = localStorage.getItem(SAVED_PLANS_KEY); if (!raw) return []; return JSON.parse(raw) as SavedPlan[]; } catch { return []; } }
function persistSavedPlans(plans: SavedPlan[]) { try { localStorage.setItem(SAVED_PLANS_KEY, JSON.stringify(plans)); } catch {} }

function extractJSON(text: string): unknown {
  try { return JSON.parse(text.trim()); } catch {}
  const stripped = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(stripped); } catch {}
  const s = stripped.indexOf('{'); const e = stripped.lastIndexOf('}');
  if (s !== -1 && e > s) { try { return JSON.parse(stripped.slice(s, e + 1)); } catch {} }
  throw new Error('AI returned an unreadable response. Please try again.');
}

async function askClaude(prompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Missing VITE_ANTHROPIC_API_KEY — add it to your .env and restart.');
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 4096, messages: [{ role: 'user', content: prompt }] }),
  });
  if (!response.ok) { const err = await response.text(); throw new Error(`API error ${response.status}: ${err}`); }
  const data = await response.json(); return data.content?.[0]?.text ?? '';
}

function buildProfileContext(): string {
  const p = loadProfile(); if (!p) return '';
  const bmi = (p.weight / ((p.height / 100) ** 2)).toFixed(1);
  const goalLabel = p.goal === 'lose_fat' ? 'lose fat' : p.goal === 'build_muscle' ? 'build muscle' : 'maintain fitness';
  return `User profile: Age ${p.age}, Height ${p.height}cm, Weight ${p.weight}kg, BMI ${bmi}, Goal: ${goalLabel}, Level: ${p.level}. Tailor weights, reps, and exercise complexity accordingly.`;
}

function aiExercisesToSession(exercises: AIExercise[], muscleNames: string[]): Session {
  return { id: generateId(), date: todayISO(), muscleGroups: toMuscleGroups(muscleNames), exercises: exercises.map(ex => ({ name: ex.name, sets: Array.from({ length: ex.sets }, () => ({ reps: ex.reps, weight: ex.weight ?? 0 })) })) };
}

export default function AISuggestion() {
  const { sessions, addSession } = useWorkoutStore();
  const [mode, setMode] = useState<Mode>('menu');
  const [quickSuggestion, setQuickSuggestion] = useState<QuickSuggestion | null>(null);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(() => loadActivePlan());
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>(() => loadSavedPlans());
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('Building Program...');
  const [error, setError] = useState<string | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [loggedDays, setLoggedDays] = useState<Set<string>>(new Set());
  const [quickLogged, setQuickLogged] = useState(false);
  const [durationPreset, setDurationPreset] = useState('60 min');
  const [customDuration, setCustomDuration] = useState('');
  const [intensity, setIntensity] = useState<Intensity>('medium');
  const effectiveDuration = durationPreset === 'Custom' ? (customDuration ? `${customDuration} min` : '60 min') : durationPreset;
  const [swapping, setSwapping] = useState<{ day: string; exIndex: number } | null>(null);
  const [swapOptions, setSwapOptions] = useState<AIExercise[]>([]);
  const [swapLoading, setSwapLoading] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [planName, setPlanName] = useState('');
  const [showSavedPlans, setShowSavedPlans] = useState(false);
  const [addingToQuick, setAddingToQuick] = useState(false);
  const [editingWeight, setEditingWeight] = useState<string | null>(null); // "quick-0", "Monday-2", etc.

  function updateQuickWeight(index: number, newWeight: number | null) {
    setQuickSuggestion(prev => prev ? {
      ...prev,
      exercises: prev.exercises.map((ex, i) => i === index ? { ...ex, weight: newWeight } : ex)
    } : prev);
    setQuickLogged(false);
  }

  function updateWeeklyWeight(day: string, exIndex: number, newWeight: number | null) {
    if (!weeklyPlan) return;
    const updated = {
      ...weeklyPlan,
      days: weeklyPlan.days.map(d => {
        if (d.day !== day) return d;
        return { ...d, exercises: d.exercises.map((ex, i) => i === exIndex ? { ...ex, weight: newWeight } : ex) };
      }),
    };
    saveActivePlan(updated);
    setWeeklyPlan(updated);
    setLoggedDays(prev => { const n = new Set(prev); n.delete(day); return n; });
  }

  const [schedule, setSchedule] = useState<Record<string, string[]>>({
    Monday: ['chest', 'triceps'], Tuesday: ['rest'], Wednesday: ['back', 'biceps'],
    Thursday: ['rest'], Friday: ['legs'], Saturday: ['shoulders', 'abs'], Sunday: ['rest'],
  });

  function toggleMuscle(day: string, muscle: string) {
    setSchedule(prev => { const current = prev[day] ?? []; if (muscle === 'rest') return { ...prev, [day]: ['rest'] }; const withoutRest = current.filter(m => m !== 'rest'); const updated = withoutRest.includes(muscle) ? withoutRest.filter(m => m !== muscle) : [...withoutRest, muscle]; return { ...prev, [day]: updated.length === 0 ? ['rest'] : updated }; });
  }

  function getRecentExercises(): string[] {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 14);
    return [...new Set(sessions.filter(s => new Date(s.date) >= cutoff).flatMap(s => s.exercises.map(e => e.name.toLowerCase())))];
  }

  function logQuickWorkout() { if (!quickSuggestion) return; const muscleNames = quickSuggestion.muscleGroup.split(/[&,]/).map(s => s.trim().toLowerCase()); addSession(aiExercisesToSession(quickSuggestion.exercises, muscleNames)); setQuickLogged(true); }
  function logDayWorkout(day: DayPlan) { addSession(aiExercisesToSession(day.exercises, day.muscleGroups)); setLoggedDays(prev => new Set([...prev, day.day])); }

  async function generateQuickSuggestion() {
    setLoading(true); setLoadingMsg('Building your session...'); setError(null); setQuickSuggestion(null); setQuickLogged(false);
    try {
      const recent = getRecentExercises();
      const prompt = `You are a fitness coach. Suggest ONE workout session for today.\n${buildProfileContext()}\nDuration: ${effectiveDuration}, Intensity: ${intensity}.\nAvoid recently done exercises: ${JSON.stringify(recent)}.\nSplit "Arms" into Biceps and Triceps. Adjust exercise count to fit ${effectiveDuration}.\nRespond with ONLY a raw JSON object, no markdown:\n{\n  "muscleGroup": "Chest & Triceps",\n  "reason": "You haven't trained chest in 3 days.",\n  "exercises": [\n    { "name": "Bench Press", "sets": 4, "reps": 8, "weight": 80, "primaryMuscle": "chest" }\n  ],\n  "progressionNotes": ["Increase weight by 2.5kg next session"],\n  "motivationalLine": "Let's go!"\n}`;
      const raw = await askClaude(prompt); const parsed = extractJSON(raw) as QuickSuggestion;
      if (!Array.isArray(parsed?.exercises)) throw new Error('Invalid response shape from AI.');
      setQuickSuggestion(parsed);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Unknown error'); setMode('menu'); } finally { setLoading(false); }
  }

  async function addExerciseToQuick() {
    if (!quickSuggestion) return; setAddingToQuick(true);
    try {
      const existing = quickSuggestion.exercises.map(e => e.name);
      const prompt = `You are a fitness coach. Suggest ONE additional exercise for a ${quickSuggestion.muscleGroup} workout.\n${buildProfileContext()}\nAvoid these already in the session: ${JSON.stringify(existing)}.\nRespond with ONLY a raw JSON object, no markdown:\n{ "name": "Cable Fly", "sets": 3, "reps": 12, "weight": 20, "primaryMuscle": "chest" }`;
      const raw = await askClaude(prompt); const parsed = extractJSON(raw) as AIExercise;
      if (!parsed?.name) throw new Error('Invalid exercise from AI.');
      setQuickSuggestion(prev => prev ? { ...prev, exercises: [...prev.exercises, parsed] } : prev); setQuickLogged(false);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Unknown error'); } finally { setAddingToQuick(false); }
  }

  function removeExerciseFromQuick(index: number) { setQuickSuggestion(prev => prev ? { ...prev, exercises: prev.exercises.filter((_, i) => i !== index) } : prev); setQuickLogged(false); }

  async function generateWeeklyPlan() {
    setLoading(true); setLoadingMsg('Building your week...'); setError(null); setLoggedDays(new Set());
    try {
      const recent = getRecentExercises();
      const scheduleLines = Object.entries(schedule).map(([day, muscles]) => `${day}: ${muscles.join(', ')}`).join('\n');
      const prompt = `You are a fitness coach. Create a 7-day workout plan.\n${buildProfileContext()}\nSession duration: ${effectiveDuration}, Intensity: ${intensity}.\nSchedule:\n${scheduleLines}\nAvoid: ${JSON.stringify(recent)}.\nAdjust exercises per day to fit ${effectiveDuration} at ${intensity} intensity.\nRest days get exercises: [].\nRespond with ONLY a raw JSON object, no markdown:\n{\n  "days": [\n    {\n      "day": "Monday",\n      "muscleGroups": ["chest", "triceps"],\n      "exercises": [\n        { "name": "Bench Press", "sets": 4, "reps": 8, "weight": 80, "primaryMuscle": "chest" }\n      ],\n      "notes": "Focus on form"\n    }\n  ],\n  "weekSummary": "A balanced split.",\n  "motivationalLine": "Great week ahead!"\n}\nInclude all 7 days Monday to Sunday.`;
      const raw = await askClaude(prompt); const parsed = extractJSON(raw) as WeeklyPlan;
      if (!Array.isArray(parsed?.days) || parsed.days.length === 0) throw new Error('Invalid response from AI — missing days array.');
      const normalized = normalizePlan(parsed); saveActivePlan(normalized); setWeeklyPlan(normalized); setMode('weekly-result');
      setExpandedDay(normalized.days.find(d => d.exercises.length > 0)?.day ?? null);
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Unknown error'); } finally { setLoading(false); }
  }

  async function startSwap(day: string, exIndex: number, ex: AIExercise) {
    setSwapping({ day, exIndex }); setSwapLoading(true); setSwapOptions([]);
    try {
      const prompt = `You are a fitness coach. Suggest 3 alternatives to replace "${ex.name}" targeting ${ex.primaryMuscle}.\n${buildProfileContext()}\nRespond with ONLY a raw JSON array, no markdown:\n[\n  { "name": "Incline Bench Press", "sets": 4, "reps": 8, "weight": 70, "primaryMuscle": "${ex.primaryMuscle}" },\n  { "name": "Cable Fly", "sets": 3, "reps": 12, "weight": 20, "primaryMuscle": "${ex.primaryMuscle}" },\n  { "name": "Push Up", "sets": 3, "reps": 15, "weight": null, "primaryMuscle": "${ex.primaryMuscle}" }\n]`;
      const raw = await askClaude(prompt); const stripped = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const aStart = stripped.indexOf('['); const aEnd = stripped.lastIndexOf(']');
      const parsed = JSON.parse(stripped.slice(aStart, aEnd + 1)) as AIExercise[]; setSwapOptions(parsed);
    } catch { setSwapping(null); setSwapOptions([]); } finally { setSwapLoading(false); }
  }

  function applySwap(newEx: AIExercise) {
    if (!swapping || !weeklyPlan) return;
    const updated = { ...weeklyPlan, days: weeklyPlan.days.map(d => { if (d.day !== swapping.day) return d; const exs = [...d.exercises]; exs[swapping.exIndex] = newEx; return { ...d, exercises: exs }; }) };
    saveActivePlan(updated); setWeeklyPlan(updated); setSwapping(null); setSwapOptions([]);
    setLoggedDays(prev => { const n = new Set(prev); n.delete(swapping.day); return n; });
  }

  async function addExerciseToDay(day: string, muscles: string[]) {
    if (!weeklyPlan) return; setLoadingMsg('Finding an exercise...'); setLoading(true);
    try {
      const existing = weeklyPlan.days.find(d => d.day === day)?.exercises.map(e => e.name) ?? [];
      const prompt = `You are a fitness coach. Suggest ONE additional exercise for ${day}.\nTarget muscles: ${muscles.join(', ')}.\n${buildProfileContext()}\nAvoid: ${JSON.stringify(existing)}.\nRespond with ONLY a raw JSON object, no markdown:\n{ "name": "Cable Fly", "sets": 3, "reps": 12, "weight": 20, "primaryMuscle": "chest" }`;
      const raw = await askClaude(prompt); const parsed = extractJSON(raw) as AIExercise;
      if (!parsed?.name) throw new Error('Invalid exercise from AI.');
      const updated = { ...weeklyPlan, days: weeklyPlan.days.map(d => { if (d.day !== day) return d; return { ...d, exercises: [...d.exercises, parsed] }; }) };
      saveActivePlan(updated); setWeeklyPlan(updated); setLoggedDays(prev => { const n = new Set(prev); n.delete(day); return n; });
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Unknown error'); } finally { setLoading(false); }
  }

  function removeExerciseFromDay(day: string, exIndex: number) {
    if (!weeklyPlan) return;
    const updated = { ...weeklyPlan, days: weeklyPlan.days.map(d => { if (d.day !== day) return d; return { ...d, exercises: d.exercises.filter((_, i) => i !== exIndex) }; }) };
    saveActivePlan(updated); setWeeklyPlan(updated); setLoggedDays(prev => { const n = new Set(prev); n.delete(day); return n; });
  }

  function saveNamedPlan() {
    if (!weeklyPlan || !planName.trim()) return;
    const newPlan: SavedPlan = { id: Date.now().toString(), name: planName.trim(), plan: weeklyPlan, createdAt: new Date().toLocaleDateString() };
    const updated = [...savedPlans, newPlan]; setSavedPlans(updated); persistSavedPlans(updated); setPlanName(''); setShowSaveModal(false);
  }

  function loadNamedPlan(sp: SavedPlan) {
    const normalized = normalizePlan(sp.plan); saveActivePlan(normalized); setWeeklyPlan(normalized); setMode('weekly-result'); setShowSavedPlans(false); setLoggedDays(new Set());
    setExpandedDay(normalized.days.find(d => d.exercises.length > 0)?.day ?? null);
  }

  function deleteNamedPlan(id: string) { const updated = savedPlans.filter(p => p.id !== id); setSavedPlans(updated); persistSavedPlans(updated); }
  function reset() { setMode('menu'); setQuickSuggestion(null); setError(null); setSwapping(null); setSwapOptions([]); }

  const profile = loadProfile();

  return (
    <div className="pt-4 pb-24 max-w-lg mx-auto min-h-screen text-white font-sans relative z-10">
      <div className="mb-5">
        <h1 className="text-4xl font-extrabold mb-1">
          AI <span className="text-gradient">Coach</span>
        </h1>
        <p className="text-gray-500 text-sm">Personalized training for your goals.</p>
      </div>

      {/* Profile pills */}
      {profile && (
        <div className="mb-5 flex flex-wrap gap-2">
          <span className="glass text-gray-400 text-xs px-3 py-1.5 rounded-full">{profile.weight}kg · {profile.height}cm</span>
          <span className="glass text-gray-400 text-xs px-3 py-1.5 rounded-full capitalize">{profile.level}</span>
          <span className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs px-3 py-1.5 rounded-full">
            {profile.goal === 'lose_fat' ? 'Lose Fat' : profile.goal === 'build_muscle' ? 'Build Muscle' : 'Maintain'}
          </span>
        </div>
      )}

      {error && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="mb-5 p-4 glass bg-red-500/[0.06] border-red-500/15 rounded-2xl text-red-400 text-sm flex items-center gap-3">
          <AlertTriangle size={18} /> {error}
        </motion.div>
      )}

      {/* Duration & Intensity */}
      {!loading && mode !== 'weekly-result' && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6 space-y-4">
          <div>
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.15em] mb-2 flex items-center gap-2">
              <Clock size={12} className="text-cyan-400" /> Duration
            </p>
            <div className="flex gap-2 flex-wrap">
              {DURATION_PRESETS.map(d => (
                <button key={d} onClick={() => setDurationPreset(d)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    durationPreset === d
                      ? 'bg-cyan-500/15 border border-cyan-500/25 text-cyan-400 glow-cyan'
                      : 'glass text-gray-500 hover:border-white/15'
                  }`}
                >{d}</button>
              ))}
            </div>
            {durationPreset === 'Custom' && (
              <div className="mt-3 flex items-center gap-3">
                <input type="number" value={customDuration} onChange={e => setCustomDuration(e.target.value)}
                  placeholder="e.g. 75" min={10} max={240}
                  className="w-28 glass rounded-xl px-3 py-2 text-white text-sm outline-none focus:border-cyan-500/40 transition bg-transparent" />
                <span className="text-gray-500 text-sm">minutes</span>
              </div>
            )}
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.15em] mb-2 flex items-center gap-2">
              <Zap size={12} className="text-purple-400" /> Intensity
            </p>
            <div className="flex gap-2">
              {INTENSITIES.map(i => (
                <button key={i.value} onClick={() => setIntensity(i.value)}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    intensity === i.value
                      ? 'bg-purple-500/15 border border-purple-500/25 text-purple-400 glow-purple'
                      : 'glass text-gray-500 hover:border-white/15'
                  }`}
                >{i.label}</button>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Loading */}
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-24">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="mb-4 relative">
              <div className="absolute inset-0 rounded-full bg-cyan-500/20 blur-xl" />
              <BrainCircuit size={44} className="text-cyan-400 relative z-10" />
            </motion.div>
            <p className="text-gray-500 font-bold text-xs uppercase tracking-[0.2em]">{loadingMsg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Menu */}
      {mode === 'menu' && !loading && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <motion.button whileTap={{ scale: 0.98 }} onClick={() => { setMode('quick'); generateQuickSuggestion(); }}
            className="w-full glass glass-hover rounded-2xl p-5 text-left flex items-center justify-between group">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <BrainCircuit size={20} className="text-cyan-400" />
                <h2 className="font-bold text-lg">Quick Suggestion</h2>
              </div>
              <p className="text-gray-500 text-sm">{effectiveDuration} · {intensity} intensity</p>
            </div>
            <ChevronRight size={20} className="text-gray-600 group-hover:text-cyan-400 transition" />
          </motion.button>

          <motion.button whileTap={{ scale: 0.98 }} onClick={() => setMode('weekly-config')}
            className="w-full glass glass-hover rounded-2xl p-5 text-left flex items-center justify-between group">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <CalendarDays size={20} className="text-purple-400" />
                <h2 className="font-bold text-lg">Weekly Planner</h2>
              </div>
              <p className="text-gray-500 text-sm">{effectiveDuration} · {intensity} intensity</p>
            </div>
            <ChevronRight size={20} className="text-gray-600 group-hover:text-purple-400 transition" />
          </motion.button>

          {savedPlans.length > 0 && (
            <motion.button whileTap={{ scale: 0.98 }} onClick={() => setShowSavedPlans(true)}
              className="w-full flex items-center justify-between glass bg-cyan-500/[0.04] border-cyan-500/15 p-4 rounded-2xl">
              <span className="text-sm font-bold text-cyan-400 flex items-center gap-2 uppercase tracking-widest">
                <BookMarked size={16} /> Saved Plans ({savedPlans.length})
              </span>
              <ChevronRight size={16} className="text-cyan-500" />
            </motion.button>
          )}

          {weeklyPlan && (
            <motion.button whileTap={{ scale: 0.98 }} onClick={() => setMode('weekly-result')}
              className="w-full flex items-center justify-between glass glass-hover p-4 rounded-2xl">
              <span className="text-sm font-bold text-gray-300 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-400" /> Active Plan
              </span>
              <ChevronRight size={16} className="text-gray-500" />
            </motion.button>
          )}
        </motion.div>
      )}

      {/* Quick result */}
      {mode === 'quick' && quickSuggestion && !loading && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="glass rounded-2xl p-5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl" />
            <span className="text-cyan-400 text-[10px] font-bold uppercase tracking-[0.15em]">Target: {quickSuggestion.muscleGroup}</span>
            <p className="text-gray-400 text-sm mt-3 leading-snug">"{quickSuggestion.reason}"</p>
            <div className="flex gap-2 mt-3">
              <span className="bg-white/5 border border-white/8 text-gray-400 text-xs px-2 py-1 rounded-full">{effectiveDuration}</span>
              <span className="bg-white/5 border border-white/8 text-gray-400 text-xs px-2 py-1 rounded-full capitalize">{intensity}</span>
            </div>
          </div>

          <div className="space-y-2.5">
            {quickSuggestion.exercises.map((ex, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="glass rounded-2xl p-4 flex justify-between items-center group">
                <button onClick={() => setSelectedExercise(ex.name)} className="text-left flex-1">
                  <span className="text-base font-bold text-white group-hover:text-cyan-400 transition block">{ex.name}</span>
                  <span className="text-xs text-gray-500 mt-1 uppercase tracking-tighter font-bold">{ex.sets} sets × {ex.reps} reps</span>
                </button>
                <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                  {editingWeight === `quick-${i}` ? (
                    <input
                      type="number"
                      inputMode="decimal"
                      autoFocus
                      defaultValue={ex.weight ?? ''}
                      placeholder="Bwt"
                      className="w-16 bg-white/[0.06] border border-cyan-500/30 rounded-lg py-1 px-2 text-center text-cyan-400 text-sm font-bold outline-none"
                      onBlur={(e) => {
                        const val = e.target.value.trim();
                        updateQuickWeight(i, val ? Number(val) : null);
                        setEditingWeight(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      }}
                    />
                  ) : (
                    <button onClick={() => setEditingWeight(`quick-${i}`)}
                      className="text-cyan-400 font-bold hover:bg-white/5 px-2 py-1 rounded-lg transition"
                      title="Tap to edit weight"
                    >{ex.weight ? `${ex.weight}kg` : 'Bwt'}</button>
                  )}
                  <button onClick={() => removeExerciseFromQuick(i)} className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/15 text-gray-500 hover:text-red-400 transition">
                    <Trash2 size={13} />
                  </button>
                </div>
              </motion.div>
            ))}

            <button onClick={addExerciseToQuick} disabled={addingToQuick}
              className="w-full py-3 border border-dashed border-white/10 rounded-2xl text-gray-500 hover:text-white hover:border-white/20 text-sm font-bold flex items-center justify-center gap-2 transition disabled:opacity-50">
              {addingToQuick ? <><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><RefreshCw size={14} /></motion.div> Adding...</> : <><Plus size={14} /> Add Exercise</>}
            </button>
          </div>

          {quickLogged ? (
            <div className="w-full py-4 glass bg-green-500/[0.06] border-green-500/20 rounded-2xl flex items-center justify-center gap-2 text-green-400 font-bold text-sm glow-green">
              <CheckCircle2 size={18} /> Logged to History!
            </div>
          ) : (
            <motion.button whileTap={{ scale: 0.98 }} onClick={logQuickWorkout} className="w-full relative group">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 blur-xl opacity-60 group-hover:opacity-100 transition-opacity" />
              <div className="relative py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-2xl font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/15">
                <ClipboardCheck size={18} /> Log This Workout
              </div>
            </motion.button>
          )}

          <button onClick={reset} className="w-full py-3 text-gray-600 hover:text-white transition font-bold text-sm">← Back to Coach</button>
        </motion.div>
      )}

      {/* Weekly config */}
      {mode === 'weekly-config' && !loading && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
          <div>
            <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-[0.15em] mb-5 flex items-center gap-2">
              <div className="w-1 h-1 rounded-full bg-purple-400" /> Assign Daily Muscles
            </h3>
            <div className="space-y-5">
              {DAYS.map(day => (
                <div key={day}>
                  <p className="text-[10px] font-black text-gray-600 uppercase mb-2.5 ml-1 tracking-wider">{day}</p>
                  <div className="flex flex-wrap gap-2">
                    {MUSCLES.map(m => (
                      <button key={m} onClick={() => toggleMuscle(day, m)}
                        className={`px-3.5 py-2 rounded-xl text-xs transition-all ${
                          schedule[day]?.includes(m)
                            ? 'bg-purple-500/15 border border-purple-500/25 text-purple-400 font-bold'
                            : 'glass text-gray-500 hover:border-white/15'
                        }`}
                      >{m.charAt(0).toUpperCase() + m.slice(1)}</button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <motion.button whileTap={{ scale: 0.98 }} onClick={generateWeeklyPlan} className="w-full relative group">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 blur-xl opacity-60 group-hover:opacity-100 transition-opacity" />
            <div className="relative py-5 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-cyan-500/15">Generate Plan</div>
          </motion.button>
          <button onClick={reset} className="w-full py-3 text-gray-600 hover:text-white transition font-bold text-sm">← Back to Coach</button>
        </motion.div>
      )}

      {/* Weekly result */}
      {mode === 'weekly-result' && weeklyPlan && !loading && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-extrabold uppercase tracking-tight">Your <span className="text-gradient">Week</span></h2>
            <div className="flex gap-2">
              <button onClick={() => setShowSaveModal(true)} className="text-xs font-bold text-cyan-400 flex items-center gap-1 glass px-3 py-1.5 rounded-xl hover:bg-white/10 transition">
                <Save size={12} /> Save
              </button>
              <button onClick={() => { setWeeklyPlan(null); setMode('weekly-config'); localStorage.removeItem(ACTIVE_PLAN_KEY); }}
                className="text-xs font-bold text-gray-500 glass px-3 py-1.5 rounded-xl hover:text-white transition">Rebuild</button>
            </div>
          </div>

          <div className="space-y-2.5">
            {(weeklyPlan.days ?? []).map((day) => {
              const exercises = Array.isArray(day.exercises) ? day.exercises : [];
              const muscleGroups = Array.isArray(day.muscleGroups) ? day.muscleGroups : [];
              const isRest = exercises.length === 0;
              const isExpanded = expandedDay === day.day;
              const isLogged = loggedDays.has(day.day);
              return (
                <div key={day.day} className={`rounded-2xl transition-all ${isRest ? 'glass opacity-35' : 'glass'}`}>
                  <button disabled={isRest} onClick={() => setExpandedDay(isExpanded ? null : day.day)}
                    className="w-full p-4 flex items-center justify-between text-left">
                    <div>
                      <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest block mb-1">{day.day}</span>
                      <div className="flex gap-2 flex-wrap items-center">
                        {isRest ? <span className="text-sm text-gray-700 font-bold">Rest Day</span>
                          : muscleGroups.map(m => <span key={m} className="text-xs font-bold text-cyan-400 uppercase tracking-tighter">{m}</span>)}
                        {isLogged && <span className="text-[10px] font-bold text-green-400 flex items-center gap-1"><CheckCircle2 size={11} /> Logged</span>}
                      </div>
                    </div>
                    {!isRest && (isExpanded ? <ChevronUp size={18} className="text-gray-600" /> : <ChevronDown size={18} className="text-gray-600" />)}
                  </button>

                  <AnimatePresence>
                    {isExpanded && !isRest && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                        className="overflow-hidden">
                        <div className="px-4 pb-4 pt-1 space-y-2 border-t border-white/[0.04]">
                          {exercises.map((ex, i) => (
                            <div key={i} className="bg-white/[0.03] border border-white/[0.05] p-3 rounded-xl">
                              {swapping?.day === day.day && swapping?.exIndex === i ? (
                                <div className="space-y-2">
                                  <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">
                                    {swapLoading ? 'Finding alternatives...' : 'Pick a replacement:'}
                                  </p>
                                  {swapLoading && <div className="flex items-center gap-2 text-gray-500 text-sm"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}><RefreshCw size={14} /></motion.div> Loading...</div>}
                                  {swapOptions.map((opt, oi) => (
                                    <button key={oi} onClick={() => applySwap(opt)}
                                      className="w-full text-left p-3 glass glass-hover rounded-xl transition">
                                      <span className="text-sm font-bold text-white block">{opt.name}</span>
                                      <span className="text-xs text-gray-500">{opt.sets} × {opt.reps} · {opt.weight ? `${opt.weight}kg` : 'Bwt'}</span>
                                    </button>
                                  ))}
                                  <button onClick={() => { setSwapping(null); setSwapOptions([]); }} className="text-xs text-gray-600 hover:text-white transition">Cancel</button>
                                </div>
                              ) : (
                                <div className="flex justify-between items-center">
                                  <button onClick={() => setSelectedExercise(ex.name)} className="text-left flex-1">
                                    <span className="text-sm font-bold text-white hover:text-cyan-400 transition block">{ex.name}</span>
                                    <span className="text-[10px] font-bold text-gray-600 uppercase mt-0.5 block">{ex.sets} × {ex.reps} • {ex.primaryMuscle}</span>
                                  </button>
                                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                    {editingWeight === `${day.day}-${i}` ? (
                                      <input
                                        type="number"
                                        inputMode="decimal"
                                        autoFocus
                                        defaultValue={ex.weight ?? ''}
                                        placeholder="Bwt"
                                        className="w-16 bg-white/[0.06] border border-cyan-500/30 rounded-lg py-1 px-2 text-center text-cyan-400 text-sm font-bold outline-none"
                                        onBlur={(e) => {
                                          const val = e.target.value.trim();
                                          updateWeeklyWeight(day.day, i, val ? Number(val) : null);
                                          setEditingWeight(null);
                                        }}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                        }}
                                      />
                                    ) : (
                                      <button onClick={() => setEditingWeight(`${day.day}-${i}`)}
                                        className="text-sm font-bold text-cyan-400 hover:bg-white/5 px-2 py-1 rounded-lg transition"
                                        title="Tap to edit weight"
                                      >{ex.weight ? `${ex.weight}kg` : 'Bwt'}</button>
                                    )}
                                    <button onClick={() => startSwap(day.day, i, ex)} title="Swap"
                                      className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-500 hover:text-white transition"><RefreshCw size={13} /></button>
                                    <button onClick={() => removeExerciseFromDay(day.day, i)} title="Remove"
                                      className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/15 text-gray-500 hover:text-red-400 transition"><Trash2 size={13} /></button>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}

                          <button onClick={() => addExerciseToDay(day.day, muscleGroups)}
                            className="w-full mt-1 py-2.5 border border-dashed border-white/10 rounded-xl text-gray-600 hover:text-white hover:border-white/20 text-xs font-bold flex items-center justify-center gap-2 transition">
                            <Plus size={14} /> Add Exercise
                          </button>

                          {isLogged ? (
                            <div className="w-full py-3 glass bg-green-500/[0.06] border-green-500/20 rounded-xl flex items-center justify-center gap-2 text-green-400 font-bold text-xs mt-1 glow-green">
                              <CheckCircle2 size={14} /> Logged to History!
                            </div>
                          ) : (
                            <button onClick={() => logDayWorkout(day)}
                              className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 mt-1 shadow-lg shadow-cyan-500/10">
                              <ClipboardCheck size={15} /> Log {day.day}'s Workout
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <button onClick={reset} className="w-full py-4 text-gray-500 hover:text-white transition font-bold text-sm uppercase tracking-widest">← Back to Menu</button>
        </motion.div>
      )}

      {/* Save modal */}
      <AnimatePresence>
        {showSaveModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => setShowSaveModal(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-[#0F0F18] border-t border-white/[0.08] rounded-t-3xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-white mb-4">Name This Plan</h3>
              <input type="text" value={planName} onChange={e => setPlanName(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveNamedPlan()}
                placeholder="e.g. Push Pull Legs, Summer Cut..."
                className="w-full glass rounded-xl px-4 py-3 text-white outline-none focus:border-cyan-500/40 transition mb-4 bg-transparent" autoFocus />
              <div className="flex gap-3">
                <button onClick={saveNamedPlan} disabled={!planName.trim()}
                  className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-purple-500 disabled:opacity-40 text-white rounded-xl font-bold transition">Save</button>
                <button onClick={() => setShowSaveModal(false)}
                  className="flex-1 py-3 glass text-gray-300 rounded-xl font-bold hover:bg-white/10 transition">Cancel</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved plans modal */}
      <AnimatePresence>
        {showSavedPlans && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => setShowSavedPlans(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="bg-[#0F0F18] border-t border-white/[0.08] rounded-t-3xl w-full max-w-lg p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-white mb-4">Saved Plans</h3>
              <div className="space-y-3">
                {savedPlans.map(sp => (
                  <div key={sp.id} className="glass rounded-xl p-4 flex items-center justify-between">
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedExercise && <ExerciseModal exerciseName={selectedExercise} onClose={() => setSelectedExercise(null)} />}
    </div>
  );
}
