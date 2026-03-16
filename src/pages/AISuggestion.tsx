import { useState } from 'react';
import { useWorkoutStore } from '../hooks/useWorkoutStore';
import Groq from 'groq-sdk';
import { Sparkles, BrainCircuit, Dumbbell, Activity, Target } from 'lucide-react';

interface AIExercise {
  name: string;
  sets: number;
  reps: number;
  weight: number | null;
}

interface AISuggestionData {
  muscleGroup: string;
  reason: string;
  exercises: AIExercise[];
  progressionNotes: string[];
  motivationalLine: string;
}

export default function AISuggestion() {
  const { sessions } = useWorkoutStore();
  const [suggestion, setSuggestion] = useState<AISuggestionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateWorkout = async () => {
    setLoading(true);
    setError(null);

    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!apiKey) throw new Error("Missing API key. Add VITE_GROQ_API_KEY to .env.local and restart npm run dev.");

      const groq = new Groq({ apiKey, dangerouslyAllowBrowser: true });

      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const recentSessions = sessions.filter(s => new Date(s.date) >= twoWeeksAgo);

      const prompt = `You are an expert personal fitness coach AI.
Here is this user's workout history for the past 2 weeks:
${JSON.stringify(recentSessions)}

Based on this history, suggest their next workout. Consider which muscles were trained recently (avoid overtraining). If no history, give a beginner full-body workout.

Return ONLY a raw JSON object with NO markdown, NO backticks, NO extra text:
{
  "muscleGroup": "chest",
  "reason": "why this group",
  "exercises": [{ "name": "string", "sets": 3, "reps": 10, "weight": 80 }],
  "progressionNotes": ["note 1", "note 2"],
  "motivationalLine": "motivational quote"
}`;

      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1000,
      });

      const text = response.choices[0]?.message?.content || '';
      const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      setSuggestion(JSON.parse(clean));

    } catch (err: any) {
      setError(err.message || "Failed to generate workout.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-6 pb-24 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <Sparkles className="text-[#3B82F6]" /> AI Coach
        </h1>
        <p className="text-gray-400 text-sm">Let the AI analyze your history and build your next session.</p>
      </div>

      {!suggestion && !loading && (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-8 text-center mt-8">
          <div className="bg-blue-900/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <BrainCircuit size={40} className="text-[#3B82F6]" />
          </div>
          <h2 className="text-xl font-bold text-white mb-3">Ready for your next workout?</h2>
          <p className="text-gray-400 mb-8 text-sm">
            I'll review your recent logs and make sure you hit the right muscle groups with progressive overload.
          </p>
          <button
            onClick={generateWorkout}
            className="w-full py-4 bg-[#3B82F6] hover:bg-blue-600 text-white rounded-xl font-bold text-lg transition-colors"
          >
            Generate Workout Plan
          </button>
          {error && (
            <div className="mt-4 p-4 bg-red-900/20 border border-red-900/50 rounded-lg text-red-400 text-sm text-left">
              <strong>Error:</strong> {error}
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="animate-spin text-[#3B82F6] mb-4">
            <BrainCircuit size={48} />
          </div>
          <p className="text-gray-400 font-medium animate-pulse">Analyzing your history...</p>
        </div>
      )}

      {suggestion && !loading && (
        <div className="space-y-6">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute -right-6 -top-6 text-[#3B82F6] opacity-10">
              <Dumbbell size={120} />
            </div>
            <span className="bg-[#3B82F6] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Recommended: {suggestion.muscleGroup}
            </span>
            <h2 className="text-xl font-bold text-white mt-4 mb-2">Why this workout?</h2>
            <p className="text-gray-300 text-sm leading-relaxed">{suggestion.reason}</p>
          </div>

          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Activity size={20} className="text-[#3B82F6]" /> The Routine
            </h3>
            <div className="space-y-3">
              {suggestion.exercises.map((ex, i) => (
                <div key={i} className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-white">{ex.name}</h4>
                    <p className="text-sm text-gray-400 mt-1">{ex.sets} sets × {ex.reps} reps</p>
                  </div>
                  <div className="bg-[#2a2a2a] px-4 py-2 rounded-lg text-center min-w-[70px]">
                    <span className="block text-xs text-gray-500 uppercase font-bold">Target</span>
                    <span className="font-bold text-[#3B82F6]">{ex.weight ? `${ex.weight}kg` : 'Bwt'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl p-5">
            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
              <Target size={18} className="text-orange-500" /> Progression Goals
            </h3>
            <ul className="space-y-2">
              {suggestion.progressionNotes.map((note, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-300">
                  <span className="text-[#3B82F6]">•</span> {note}
                </li>
              ))}
            </ul>
          </div>

          <div className="text-center italic text-gray-400 py-4">
            "{suggestion.motivationalLine}"
          </div>

          <button
            onClick={() => setSuggestion(null)}
            className="w-full py-3 border border-[#2a2a2a] text-gray-400 rounded-xl hover:text-white hover:bg-[#1a1a1a] transition-colors"
          >
            Generate Another Option
          </button>
        </div>
      )}
    </div>
  );
}
