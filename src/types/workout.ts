export type MuscleGroup = 'chest' | 'back' | 'legs' | 'shoulders' | 'arms' | 'core';

export interface RepSet {
  reps: number;
  weight: number | null;
}

export interface Exercise {
  name: string;
  sets: RepSet[];
  isBodyweight?: boolean;
  notes?: string;
}

export interface Session {
  id: string;
  date: string;
  muscleGroups: MuscleGroup[];
  exercises: Exercise[];
  notes?: string;
  durationMinutes?: number;
}

export interface AISuggestion {
  muscleGroup: MuscleGroup;
  reason: string;
  exercises: { name: string; sets: number; reps: number; weight: number | null; }[];
  progressionNotes: string[];
  motivationalLine: string;
}
