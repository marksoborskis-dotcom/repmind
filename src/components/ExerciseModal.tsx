import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Dumbbell, AlertTriangle, Lightbulb, ChevronRight, ExternalLink } from 'lucide-react';

interface ExerciseInfo {
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  steps: string[];
  commonMistakes: string[];
  tips: string[];
}

interface Props {
  exerciseName: string;
  onClose: () => void;
}

const cache = new Map<string, { info: ExerciseInfo; imageUrl: string | null }>();

const DIFFICULTY_COLOR: Record<string, string> = {
  beginner: 'text-green-400 bg-green-500/10 border border-green-500/20',
  intermediate: 'text-yellow-400 bg-yellow-500/10 border border-yellow-500/20',
  advanced: 'text-red-400 bg-red-500/10 border border-red-500/20',
};

function extractJSON(text: string): unknown {
  try { return JSON.parse(text.trim()); } catch { /* keep going */ }
  const stripped = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(stripped); } catch { /* keep going */ }
  const objStart = stripped.indexOf('{');
  const objEnd = stripped.lastIndexOf('}');
  if (objStart !== -1 && objEnd > objStart) {
    try { return JSON.parse(stripped.slice(objStart, objEnd + 1)); } catch { /* keep going */ }
  }
  throw new Error('Could not parse AI response');
}

async function askClaude(prompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('Missing VITE_ANTHROPIC_API_KEY');
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
      max_tokens: 1024,
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

export default function ExerciseModal({ exerciseName, onClose }: Props) {
  const [info, setInfo] = useState<ExerciseInfo | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    if (cache.has(exerciseName)) {
      const cached = cache.get(exerciseName)!;
      setInfo(cached.info);
      setImageUrl(cached.imageUrl);
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      setLoading(true);
      let fetchedImage: string | null = null;
      let fetchedInfo: ExerciseInfo | null = null;

      try {
        const res = await fetch(
          `https://wger.de/api/v2/exercise/search/?term=${encodeURIComponent(exerciseName)}&language=english&format=json`
        );
        const data = await res.json();
        const hit = data.suggestions?.[0]?.data;
        if (hit?.image) fetchedImage = hit.image;
      } catch (err) { console.error('Image fetch failed', err); }

      try {
        const raw = await askClaude(
          `Give detailed info for the exercise: "${exerciseName}".
You MUST respond with ONLY a raw JSON object. No markdown, no explanation, no code fences.
Use exactly this shape:
{
  "primaryMuscles": ["chest"],
  "secondaryMuscles": ["triceps"],
  "equipment": "barbell",
  "difficulty": "intermediate",
  "steps": ["Lie flat on bench", "Grip bar slightly wider than shoulders"],
  "commonMistakes": ["Flaring elbows too wide"],
  "tips": ["Keep shoulder blades retracted"]
}`
        );
        fetchedInfo = extractJSON(raw) as ExerciseInfo;
      } catch (err) { console.error('Claude fetch failed', err); }

      if (fetchedInfo) {
        cache.set(exerciseName, { info: fetchedInfo, imageUrl: fetchedImage });
        setInfo(fetchedInfo);
      }
      setImageUrl(fetchedImage);
      setLoading(false);
    };

    fetchAll();
  }, [exerciseName]);

  const musclewikiUrl = `https://musclewiki.com/exercises/?muscles=${info?.primaryMuscles?.[0]?.toLowerCase().replace(' ', '-') ?? ''}`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="bg-[#0F0F18] border-t border-white/[0.08] rounded-t-3xl w-full max-w-lg max-h-[88vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-white/10 rounded-full" />
          </div>

          <div className="p-6 space-y-5">
            <div className="flex justify-between items-start">
              <h2 className="text-xl font-bold text-white pr-4 leading-tight">{exerciseName}</h2>
              <button
                onClick={onClose}
                className="bg-white/5 border border-white/8 p-2 rounded-full hover:bg-white/10 flex-shrink-0 transition-colors"
              >
                <X size={16} className="text-gray-400" />
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="text-cyan-500">
                  <Dumbbell size={36} />
                </motion.div>
                <p className="text-gray-500 text-sm">Loading exercise info...</p>
              </div>
            ) : (
              <>
                {imageUrl ? (
                  <div className="rounded-xl overflow-hidden glass">
                    <img src={imageUrl} alt={exerciseName} className="w-full object-contain max-h-56" onError={() => setImageUrl(null)} />
                  </div>
                ) : (
                  <div className="rounded-xl glass h-36 flex flex-col items-center justify-center gap-2">
                    <Dumbbell size={40} className="text-cyan-500 opacity-20" />
                    <p className="text-gray-600 text-xs">No image available</p>
                  </div>
                )}

                {info && (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <span className={`text-xs px-3 py-1 rounded-full font-semibold capitalize ${DIFFICULTY_COLOR[info.difficulty] ?? 'text-gray-400 bg-white/5'}`}>
                        {info.difficulty}
                      </span>
                      <span className="bg-white/5 border border-white/8 text-gray-300 text-xs px-3 py-1 rounded-full capitalize">
                        {info.equipment}
                      </span>
                      {info.primaryMuscles.map(m => (
                        <span key={m} className="bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs px-3 py-1 rounded-full capitalize">
                          {m}
                        </span>
                      ))}
                    </div>

                    <div>
                      <h3 className="font-bold text-white mb-3 flex items-center gap-2 text-sm uppercase tracking-wider text-gray-400">
                        <ChevronRight size={18} className="text-cyan-400" /> How to Perform
                      </h3>
                      <ul className="space-y-3">
                        {info.steps.map((step, i) => (
                          <li key={i} className="flex gap-3 text-gray-300 text-sm">
                            <span className="bg-gradient-to-br from-cyan-500 to-purple-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                              {i + 1}
                            </span>
                            <p>{step.replace(/^(Step\s*)?\d+[:.]\s*/i, '')}</p>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="glass bg-red-500/[0.04] border-red-500/15 rounded-xl p-4">
                      <h3 className="font-bold text-white mb-2 flex items-center gap-2 text-sm">
                        <AlertTriangle size={16} className="text-red-400" /> Common Mistakes
                      </h3>
                      <ul className="space-y-2">
                        {info.commonMistakes.map((m, i) => (
                          <li key={i} className="flex gap-2 text-gray-300 text-sm">
                            <span className="text-red-400 flex-shrink-0">•</span> {m}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="glass bg-green-500/[0.04] border-green-500/15 rounded-xl p-4">
                      <h3 className="font-bold text-white mb-2 flex items-center gap-2 text-sm">
                        <Lightbulb size={16} className="text-green-400" /> Pro Tips
                      </h3>
                      <ul className="space-y-2">
                        {info.tips.map((t, i) => (
                          <li key={i} className="flex gap-2 text-gray-300 text-sm italic">
                            <span className="text-green-400 flex-shrink-0">•</span> {t}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <a
                      href={musclewikiUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-3 glass text-gray-400 rounded-xl hover:text-white hover:border-cyan-500/30 transition-all text-sm font-medium"
                    >
                      <ExternalLink size={14} /> View more on MuscleWiki
                    </a>
                  </>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
