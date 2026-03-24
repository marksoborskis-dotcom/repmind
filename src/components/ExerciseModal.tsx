import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Dumbbell, AlertTriangle, Lightbulb, ChevronRight, ChevronLeft, ExternalLink, Play } from 'lucide-react';

interface ExerciseInfo {
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  steps: string[];
  commonMistakes: string[];
  tips: string[];
}

interface FreeDBExercise {
  id: string;
  name: string;
  images: string[];
  primaryMuscles: string[];
  secondaryMuscles: string[];
  equipment: string;
  level: string;
  instructions: string[];
  category: string;
}

interface Props {
  exerciseName: string;
  onClose: () => void;
}

const infoCache = new Map<string, { info: ExerciseInfo; images: string[] }>();

// Cache the entire exercise database so we only fetch it once
let exerciseDB: FreeDBExercise[] | null = null;
let dbLoading = false;
let dbWaiters: ((db: FreeDBExercise[]) => void)[] = [];

const IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

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

// Load the exercise database (cached after first load)
async function loadExerciseDB(): Promise<FreeDBExercise[]> {
  if (exerciseDB) return exerciseDB;

  if (dbLoading) {
    return new Promise(resolve => { dbWaiters.push(resolve); });
  }

  dbLoading = true;
  try {
    const res = await fetch(
      'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json'
    );
    if (!res.ok) throw new Error('Failed to fetch exercise DB');
    exerciseDB = await res.json();
    dbWaiters.forEach(w => w(exerciseDB!));
    dbWaiters = [];
    return exerciseDB!;
  } catch {
    dbLoading = false;
    return [];
  }
}

// Fuzzy match an exercise name against the database
function findExercise(db: FreeDBExercise[], searchName: string): FreeDBExercise | null {
  const search = searchName.toLowerCase().trim();

  // 1. Exact match
  const exact = db.find(e => e.name.toLowerCase() === search);
  if (exact) return exact;

  // 2. One name contains the other
  const contains = db.find(e => {
    const eName = e.name.toLowerCase();
    return eName.includes(search) || search.includes(eName);
  });
  if (contains) return contains;

  // 3. Word overlap scoring — find the best match
  const searchWords = search.replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(w => w.length > 2);
  if (searchWords.length === 0) return null;

  let bestMatch: FreeDBExercise | null = null;
  let bestScore = 0;

  for (const exercise of db) {
    const exWords = exercise.name.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(/\s+/).filter(w => w.length > 2);
    const matchingWords = searchWords.filter(sw =>
      exWords.some(ew => ew.includes(sw) || sw.includes(ew))
    );

    // Score = matching words / total unique words between both names
    const score = matchingWords.length / Math.max(searchWords.length, exWords.length);

    if (score > bestScore && score >= 0.4) {
      bestScore = score;
      bestMatch = exercise;
    }
  }

  return bestMatch;
}

// Build image URLs from a matched exercise
function getImageUrls(exercise: FreeDBExercise): string[] {
  if (!exercise.images || exercise.images.length === 0) return [];
  return exercise.images.map(imgPath => `${IMG_BASE}/${imgPath}`);
}

export default function ExerciseModal({ exerciseName, onClose }: Props) {
  const [info, setInfo] = useState<ExerciseInfo | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [currentImage, setCurrentImage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [brokenImages, setBrokenImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    if (infoCache.has(exerciseName)) {
      const cached = infoCache.get(exerciseName)!;
      setInfo(cached.info);
      setImages(cached.images);
      setLoading(false);
      return;
    }

    const fetchAll = async () => {
      setLoading(true);
      setBrokenImages(new Set());
      setCurrentImage(0);

      // 1. Load exercise database and find matching exercise
      const db = await loadExerciseDB();
      const match = findExercise(db, exerciseName);
      const fetchedImages = match ? getImageUrls(match) : [];

      // 2. If we have a match from the DB, use its data + ask Claude only for tips/mistakes
      let fetchedInfo: ExerciseInfo | null = null;

      if (match) {
        fetchedInfo = {
          primaryMuscles: match.primaryMuscles || [],
          secondaryMuscles: match.secondaryMuscles || [],
          equipment: match.equipment || 'bodyweight',
          difficulty: (match.level as ExerciseInfo['difficulty']) || 'intermediate',
          steps: match.instructions || [],
          commonMistakes: [],
          tips: [],
        };

        // Ask Claude only for mistakes and tips (saves API credits)
        try {
          const raw = await askClaude(
            `For the exercise "${exerciseName}", give common mistakes and pro tips.
Respond with ONLY a raw JSON object, no markdown:
{
  "commonMistakes": ["Flaring elbows too wide", "Arching back excessively"],
  "tips": ["Keep shoulder blades retracted", "Control the negative"]
}`
          );
          const extra = extractJSON(raw) as { commonMistakes?: string[]; tips?: string[] };
          if (extra.commonMistakes) fetchedInfo.commonMistakes = extra.commonMistakes;
          if (extra.tips) fetchedInfo.tips = extra.tips;
        } catch { /* we still have enough data */ }
      } else {
        // No DB match — ask Claude for everything
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
      }

      if (fetchedInfo) {
        infoCache.set(exerciseName, { info: fetchedInfo, images: fetchedImages });
        setInfo(fetchedInfo);
      }
      setImages(fetchedImages);
      setLoading(false);
    };

    fetchAll();
  }, [exerciseName]);

  const youtubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(exerciseName + ' exercise form tutorial')}`;
  const musclewikiUrl = 'https://musclewiki.com/directory';
  const validImages = images.filter(src => !brokenImages.has(src));

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
                {/* Exercise Images */}
                {validImages.length > 0 ? (
                  <div className="rounded-xl overflow-hidden glass relative group">
                    <img
                      src={validImages[currentImage % validImages.length]}
                      alt={`${exerciseName} - position ${(currentImage % validImages.length) + 1}`}
                      className="w-full object-contain max-h-64 bg-white/[0.02] p-2"
                      onError={(e) => {
                        setBrokenImages(prev => new Set([...prev, (e.target as HTMLImageElement).src]));
                      }}
                    />
                    {/* Arrow buttons */}
                    {validImages.length > 1 && (
                      <>
                        <button
                          onClick={() => setCurrentImage(prev => (prev - 1 + validImages.length) % validImages.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm hover:bg-black/70 text-white p-1.5 rounded-full transition-all opacity-0 group-hover:opacity-100"
                        >
                          <ChevronLeft size={20} />
                        </button>
                        <button
                          onClick={() => setCurrentImage(prev => (prev + 1) % validImages.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-sm hover:bg-black/70 text-white p-1.5 rounded-full transition-all opacity-0 group-hover:opacity-100"
                        >
                          <ChevronRight size={20} />
                        </button>
                      </>
                    )}
                    {/* Dots + counter */}
                    {validImages.length > 1 && (
                      <div className="flex items-center justify-center gap-3 py-2.5 bg-white/[0.02]">
                        {validImages.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setCurrentImage(i)}
                            className={`w-2 h-2 rounded-full transition-all ${
                              i === (currentImage % validImages.length)
                                ? 'bg-cyan-400 scale-125'
                                : 'bg-white/20 hover:bg-white/40'
                            }`}
                          />
                        ))}
                        <span className="text-[10px] text-gray-500 ml-1">
                          {(currentImage % validImages.length) + 1}/{validImages.length}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="rounded-xl glass h-36 flex flex-col items-center justify-center gap-2">
                    <Dumbbell size={40} className="text-cyan-500 opacity-20" />
                    <p className="text-gray-600 text-xs">No image available</p>
                  </div>
                )}

                {info && (
                  <>
                    {/* Tags */}
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

                    {/* Steps */}
                    {info.steps.length > 0 && (
                      <div>
                        <h3 className="font-bold mb-3 flex items-center gap-2 text-sm uppercase tracking-wider text-gray-400">
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
                    )}

                    {/* Common Mistakes */}
                    {info.commonMistakes.length > 0 && (
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
                    )}

                    {/* Pro Tips */}
                    {info.tips.length > 0 && (
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
                    )}

                    {/* Links */}
                    <div className="space-y-2">
                      <a href={youtubeSearchUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-3 w-full p-3.5 glass rounded-xl hover:border-red-500/30 transition-all group">
                        <div className="bg-red-500/15 border border-red-500/20 p-2 rounded-lg group-hover:bg-red-500/25 transition">
                          <Play size={16} className="text-red-400 ml-0.5" fill="currentColor" />
                        </div>
                        <div>
                          <p className="text-white text-sm font-bold">Watch Video Tutorial</p>
                          <p className="text-gray-500 text-xs">Form guide on YouTube</p>
                        </div>
                        <ExternalLink size={14} className="text-gray-600 ml-auto" />
                      </a>
                      <a href={musclewikiUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3 glass text-gray-400 rounded-xl hover:text-white hover:border-cyan-500/30 transition-all text-sm font-medium">
                        <ExternalLink size={14} /> Browse exercises on MuscleWiki
                      </a>
                    </div>
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
