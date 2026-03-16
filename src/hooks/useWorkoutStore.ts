import { useState, useEffect, useCallback } from 'react';
import type { Session, MuscleGroup } from '../types/workout';

const STORAGE_KEY = 'repmind_sessions';

export function useWorkoutStore() {
  const [sessions, setSessions] = useState<Session[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  const addSession = useCallback((session: Session) => {
    setSessions(prev => [session, ...prev]);
  }, []);

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
  }, []);

  const getSessionById = useCallback(
    (id: string) => sessions.find(s => s.id === id), [sessions]
  );

  const getSessionsByMuscleGroup = useCallback(
    (group: MuscleGroup) => sessions.filter(s => s.muscleGroups.includes(group)), [sessions]
  );

  const getExerciseHistory = useCallback((name: string) =>
    sessions
      .filter(s => s.exercises.some(e => e.name.toLowerCase() === name.toLowerCase()))
      .map(s => {
        const ex = s.exercises.find(e => e.name.toLowerCase() === name.toLowerCase())!;
        return { date: s.date, maxWeight: Math.max(...ex.sets.map(set => set.weight ?? 0)) };
      }).reverse(),
    [sessions]
  );

  const streak = (() => {
    if (!sessions.length) return 0;
    const dates = [...new Set(sessions.map(s => s.date))].sort().reverse();
    let count = 0;
    let cursor = new Date().toISOString().split('T')[0];
    for (const date of dates) {
      if (date === cursor) {
        count++;
        const d = new Date(cursor);
        d.setDate(d.getDate() - 1);
        cursor = d.toISOString().split('T')[0];
      } else break;
    }
    return count;
  })();

  return { sessions, addSession, deleteSession, getSessionById, getSessionsByMuscleGroup, getExerciseHistory, streak };
}
