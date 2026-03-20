import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  } catch {
    return null;
  }
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

// BMI-based goal suggestion
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

interface Props {
  isSetup?: boolean;
}

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

    if (isSetup) {
      navigate('/dashboard');
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="pt-10 pb-24 px-6 max-w-lg mx-auto font-sans">

        {/* Header */}
        <div className="mb-10">
          {isSetup ? (
            <>
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-blue-500/20 p-3 rounded-2xl">
                  <Dumbbell size={28} className="text-blue-500" />
                </div>
                <h1 className="text-4xl font-bold">Welcome!</h1>
              </div>
              <p className="text-gray-500 text-lg">
                Let's set up your profile so AI can personalize your workouts.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-4xl font-bold mb-2">Profile</h1>
              <p className="text-gray-500 text-lg">Your stats power the AI suggestions.</p>
            </>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-900/30 rounded-2xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-5">

          {/* Height */}
          <div className="bg-[#111] border border-[#222] rounded-2xl p-5">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
              <Ruler size={14} /> Height (cm)
            </label>
            <input
              type="number"
              value={height}
              onChange={e => setHeight(e.target.value)}
              placeholder="e.g. 178"
              className="w-full bg-transparent text-3xl font-bold text-white outline-none placeholder-gray-700"
            />
          </div>

          {/* Weight */}
          <div className="bg-[#111] border border-[#222] rounded-2xl p-5">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
              <Weight size={14} /> Weight (kg)
            </label>
            <input
              type="number"
              value={weight}
              onChange={e => setWeight(e.target.value)}
              placeholder="e.g. 75"
              className="w-full bg-transparent text-3xl font-bold text-white outline-none placeholder-gray-700"
            />
          </div>

          {/* Age */}
          <div className="bg-[#111] border border-[#222] rounded-2xl p-5">
            <label className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
              <User size={14} /> Age
            </label>
            <input
              type="number"
              value={age}
              onChange={e => setAge(e.target.value)}
              placeholder="e.g. 23"
              className="w-full bg-transparent text-3xl font-bold text-white outline-none placeholder-gray-700"
            />
          </div>

          {/* AI Goal Suggestion */}
          {suggestedGoal && (
            <div className="bg-blue-900/10 border border-blue-900/30 rounded-2xl p-4 flex items-start gap-3">
              <Sparkles size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-1">
                  AI Suggestion
                </p>
                <p className="text-gray-300 text-sm">
                  {GOAL_SUGGESTION_REASON[suggestedGoal]}
                </p>
                {goal !== suggestedGoal && (
                  <button
                    onClick={() => setGoal(suggestedGoal)}
                    className="mt-2 text-blue-400 text-xs font-bold underline underline-offset-2"
                  >
                    Apply suggestion →
                  </button>
                )}
                {goal === suggestedGoal && (
                  <p className="mt-2 text-green-400 text-xs font-bold flex items-center gap-1">
                    <CheckCircle2 size={12} /> Applied
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Goal */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Target size={14} /> Fitness Goal
            </p>
            <div className="space-y-2">
              {GOALS.map(g => (
                <button
                  key={g.value}
                  onClick={() => setGoal(g.value)}
                  className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    goal === g.value
                      ? 'bg-blue-900/20 border-blue-500/50 text-white'
                      : 'bg-[#111] border-[#222] text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <div>
                    <p className="font-bold text-sm flex items-center gap-2">
                      {g.label}
                      {suggestedGoal === g.value && (
                        <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full font-bold">
                          Suggested
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{g.desc}</p>
                  </div>
                  {goal === g.value && <ChevronRight size={16} className="text-blue-500 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Level */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Dumbbell size={14} /> Fitness Level
            </p>
            <div className="space-y-2">
              {LEVELS.map(l => (
                <button
                  key={l.value}
                  onClick={() => setLevel(l.value)}
                  className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    level === l.value
                      ? 'bg-blue-900/20 border-blue-500/50 text-white'
                      : 'bg-[#111] border-[#222] text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <div>
                    <p className="font-bold text-sm">{l.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{l.desc}</p>
                  </div>
                  {level === l.value && <ChevronRight size={16} className="text-blue-500 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            className="w-full py-5 bg-[#3B82F6] hover:bg-blue-500 text-white rounded-2xl font-bold text-lg transition flex items-center justify-center gap-2 shadow-xl shadow-blue-900/10"
          >
            {saved ? (
              <><CheckCircle2 size={20} /> Saved!</>
            ) : isSetup ? (
              <>Let's Go <ChevronRight size={20} /></>
            ) : (
              <>Save Profile</>
            )}
          </button>

        </div>
      </div>
    </div>
  );
}
