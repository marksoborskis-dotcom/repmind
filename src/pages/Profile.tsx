import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User, Ruler, Weight, Target, Dumbbell,
  ChevronRight, CheckCircle2, Sparkles
} from 'lucide-react';

export interface UserProfile {
  height: number;
  weight: number;
  age: number;
  goal: 'lose_fat' | 'build_muscle' | 'maintain';
  level: 'beginner' | 'intermediate' | 'advanced';
}

export const PROFILE_KEY = 'repmind_profile';

export function loadProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserProfile;
  } catch { return null; }
}

export function saveProfile(profile: UserProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

const GOALS = [
  { value: 'lose_fat',     label: 'Lose Fat',     desc: 'Burn calories, reduce body fat' },
  { value: 'build_muscle', label: 'Build Muscle', desc: 'Gain strength and size' },
  { value: 'maintain',     label: 'Maintain',     desc: 'Stay fit and healthy' },
] as const;

const LEVELS = [
  { value: 'beginner',     label: 'Beginner',     desc: 'Less than 1 year training' },
  { value: 'intermediate', label: 'Intermediate', desc: '1–3 years training' },
  { value: 'advanced',     label: 'Advanced',     desc: '3+ years training' },
] as const;

function suggestGoal(height: number, weight: number): UserProfile['goal'] | null {
  if (!height || !weight || height < 50 || weight < 20) return null;
  const bmi = weight / ((height / 100) ** 2);
  if (bmi > 27) return 'lose_fat';
  if (bmi < 20) return 'build_muscle';
  return 'maintain';
}

const GOAL_SUGGESTION_REASON: Record<string, string> = {
  lose_fat:     'Based on your BMI, losing fat may be your best path to better health.',
  build_muscle: 'Based on your BMI, building muscle could help you reach a healthier body composition.',
  maintain:     'Your BMI looks great! Maintaining your fitness is a solid goal.',
};

interface Props { isSetup?: boolean; }

export default function Profile({ isSetup = false }: Props) {
  const navigate = useNavigate();
  const existing = loadProfile();

  const [height, setHeight] = useState(existing?.height?.toString() ?? '');
  const [weight, setWeight] = useState(existing?.weight?.toString() ?? '');
  const [age, setAge]       = useState(existing?.age?.toString() ?? '');
  const [goal, setGoal]     = useState<UserProfile['goal']>(existing?.goal ?? 'build_muscle');
  const [level, setLevel]   = useState<UserProfile['level']>(existing?.level ?? 'beginner');
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const h = parseFloat(height);
  const w = parseFloat(weight);
  const suggestedGoal = suggestGoal(h, w);

  function handleSave() {
    const a = parseInt(age);
    if (!h || h < 50 || h > 300) return setError('Enter a valid height (50–300 cm)');
    if (!w || w < 20 || w > 500) return setError('Enter a valid weight (20–500 kg)');
    if (!a || a < 10 || a > 100) return setError('Enter a valid age (10–100)');
    setError(null);
    saveProfile({ height: h, weight: w, age: a, goal, level });
    if (isSetup) { navigate('/dashboard'); }
    else { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white relative overflow-hidden grain">
      {/* Background orbs */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="orb orb-cyan w-[400px] h-[400px] -top-32 -right-24 opacity-15" />
        <div className="orb orb-purple w-[500px] h-[500px] bottom-0 -left-32 opacity-10" />
      </div>

      <div className="pt-10 pb-24 px-6 max-w-lg mx-auto font-sans relative z-10">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          {isSetup ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-cyan-500/10 border border-cyan-500/20 p-3 rounded-2xl">
                  <Dumbbell size={28} className="text-cyan-400" />
                </div>
                <h1 className="text-4xl font-extrabold">
                  <span className="text-gradient">Welcome!</span>
                </h1>
              </div>
              <p className="text-gray-500 text-lg">Let's set up your profile so AI can personalize your workouts.</p>
            </>
          ) : (
            <>
              <h1 className="text-4xl font-extrabold mb-2">Profile</h1>
              <p className="text-gray-500 text-lg">Your stats power the AI suggestions.</p>
            </>
          )}
        </motion.div>

        {error && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mb-6 p-4 glass bg-red-500/[0.06] border-red-500/20 rounded-2xl text-red-400 text-sm">
            {error}
          </motion.div>
        )}

        <div className="space-y-5">
          {/* Height */}
          <div className="glass rounded-2xl p-5">
            <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-3">
              <Ruler size={14} className="text-cyan-400" /> Height (cm)
            </label>
            <input type="number" value={height} onChange={e => setHeight(e.target.value)} placeholder="e.g. 178"
              className="w-full bg-transparent text-3xl font-extrabold text-white outline-none placeholder-gray-700" />
          </div>

          {/* Weight */}
          <div className="glass rounded-2xl p-5">
            <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-3">
              <Weight size={14} className="text-cyan-400" /> Weight (kg)
            </label>
            <input type="number" value={weight} onChange={e => setWeight(e.target.value)} placeholder="e.g. 75"
              className="w-full bg-transparent text-3xl font-extrabold text-white outline-none placeholder-gray-700" />
          </div>

          {/* Age */}
          <div className="glass rounded-2xl p-5">
            <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-3">
              <User size={14} className="text-cyan-400" /> Age
            </label>
            <input type="number" value={age} onChange={e => setAge(e.target.value)} placeholder="e.g. 23"
              className="w-full bg-transparent text-3xl font-extrabold text-white outline-none placeholder-gray-700" />
          </div>

          {/* AI Goal Suggestion */}
          {suggestedGoal && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="glass bg-cyan-500/[0.04] border-cyan-500/15 rounded-2xl p-4 flex items-start gap-3">
              <Sparkles size={16} className="text-cyan-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-cyan-400 text-[10px] font-bold uppercase tracking-[0.15em] mb-1">AI Suggestion</p>
                <p className="text-gray-300 text-sm">{GOAL_SUGGESTION_REASON[suggestedGoal]}</p>
                {goal !== suggestedGoal && (
                  <button onClick={() => setGoal(suggestedGoal)} className="mt-2 text-cyan-400 text-xs font-bold underline underline-offset-2">
                    Apply suggestion →
                  </button>
                )}
                {goal === suggestedGoal && (
                  <p className="mt-2 text-green-400 text-xs font-bold flex items-center gap-1"><CheckCircle2 size={12} /> Applied</p>
                )}
              </div>
            </motion.div>
          )}

          {/* Goal */}
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
              <Target size={14} className="text-cyan-400" /> Fitness Goal
            </p>
            <div className="space-y-2">
              {GOALS.map(g => (
                <motion.button key={g.value} whileTap={{ scale: 0.98 }} onClick={() => setGoal(g.value)}
                  className={`w-full p-4 rounded-2xl text-left transition-all flex items-center justify-between ${
                    goal === g.value
                      ? 'glass bg-cyan-500/[0.06] border-cyan-500/25 text-white glow-cyan'
                      : 'glass text-gray-400 hover:border-white/15'
                  }`}
                >
                  <div>
                    <p className="font-bold text-sm flex items-center gap-2">
                      {g.label}
                      {suggestedGoal === g.value && (
                        <span className="text-[10px] bg-cyan-500/15 text-cyan-400 px-2 py-0.5 rounded-full font-bold">Suggested</span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{g.desc}</p>
                  </div>
                  {goal === g.value && <ChevronRight size={16} className="text-cyan-400 flex-shrink-0" />}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Level */}
          <div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em] mb-3 flex items-center gap-2">
              <Dumbbell size={14} className="text-cyan-400" /> Fitness Level
            </p>
            <div className="space-y-2">
              {LEVELS.map(l => (
                <motion.button key={l.value} whileTap={{ scale: 0.98 }} onClick={() => setLevel(l.value)}
                  className={`w-full p-4 rounded-2xl text-left transition-all flex items-center justify-between ${
                    level === l.value
                      ? 'glass bg-cyan-500/[0.06] border-cyan-500/25 text-white glow-cyan'
                      : 'glass text-gray-400 hover:border-white/15'
                  }`}
                >
                  <div>
                    <p className="font-bold text-sm">{l.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{l.desc}</p>
                  </div>
                  {level === l.value && <ChevronRight size={16} className="text-cyan-400 flex-shrink-0" />}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Save */}
          <motion.button whileTap={{ scale: 0.98 }} onClick={handleSave} className="w-full relative group">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-purple-500/20 blur-xl opacity-60 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative py-5 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-500/15">
              {saved ? ( <><CheckCircle2 size={20} /> Saved!</> )
               : isSetup ? ( <>Let's Go <ChevronRight size={20} /></> )
               : ( <>Save Profile</> )}
            </div>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
