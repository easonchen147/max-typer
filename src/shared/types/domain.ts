export type AppView =
  | 'landing'
  | 'menu'
  | 'basic-practice'
  | 'heatmap'
  | 'fruit-ninja'
  | 'space-invaders'

export type PracticeMode = Exclude<AppView, 'landing' | 'menu' | 'heatmap'>
export type PracticeDifficulty = 'starter' | 'standard' | 'challenge'
export type SessionDurationPreset = '3-min' | '5-min' | '10-min' | 'unlimited'
export type WordBankId = 'elementary' | 'middle-school' | 'high-school' | 'cet4' | 'cet6'

export interface UserSettings {
  soundEnabled: boolean
  colorblindMode: boolean
  tutorialEnabled: boolean
}

export interface UserProfile {
  id: number
  createdAt: number
  updatedAt: number
  totalPracticeMs: number
  longestStreakDays: number
  currentStreakDays: number
  totalKeystrokes: number
  onboardingComplete: boolean
  settings: UserSettings
  unlockedDifficulties: PracticeDifficulty[]
  earnedAchievementIds: string[]
}

export interface PracticeSessionRecord {
  id: string
  mode: PracticeMode
  difficulty: PracticeDifficulty
  startedAt: number
  endedAt: number | null
  durationMs: number
  score: number
  accuracy: number
  keystrokes: number
  completed: boolean
}

export interface SessionProgressSummary {
  accuracy: number
  keystrokes: number
  score: number
}

export interface KeyStrokeRecord {
  id: string
  sessionId: string
  letter: string
  expected: string
  input: string
  correct: boolean
  reactionMs: number
  timestamp: number
  mode: PracticeMode
  difficulty: PracticeDifficulty
  contextWord?: string
}

export interface LetterStats {
  letter: string
  attempts: number
  correct: number
  accuracy: number
  averageReactionMs: number
  bestStreak: number
  level: number
}

export type KeyboardSnapshot = Record<string, LetterStats>

export interface WordEntry {
  value: string
  difficulty: PracticeDifficulty
  tags: string[]
}

export interface UnlockTarget {
  id: PracticeDifficulty
  title: string
  requiredRatio: number
  currentRatio: number
  unlocked: boolean
}

export interface DifficultyProgress {
  id: PracticeDifficulty
  title: string
  unlocked: boolean
  currentRatio: number
  requiredRatio: number
  minimumLevel: number
  currentCount: number
  requiredCount: number
}

export interface DailyGoalProgress {
  completedSessions: number
  targetSessions: number
  progressRatio: number
  remainingSessions: number
}

export interface Achievement {
  id: string
  title: string
  description: string
  unlocked: boolean
}

export interface ProgressSnapshot {
  masteredCount: number
  unlockedDifficulties: PracticeDifficulty[]
  nextUnlock: UnlockTarget | null
  difficultyProgress: DifficultyProgress[]
  dailyGoal: DailyGoalProgress
  achievementFeed: Achievement[]
  totalSessions: number
}

export interface ProgressContext {
  snapshot: KeyboardSnapshot
  profile: UserProfile
  sessions: PracticeSessionRecord[]
}

export interface AchievementDefinition {
  id: string
  title: string
  description: string
  predicate: (context: ProgressContext) => boolean
}
