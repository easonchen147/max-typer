import {
  ACHIEVEMENTS,
  DAILY_GOAL_TARGET,
  DIFFICULTY_LABELS,
  DIFFICULTY_UNLOCK_RULES,
  MASTERED_LEVEL,
} from '@/shared/constants/progression'
import { LETTER_ORDER } from '@/shared/constants/keyboard'
import { selectRecommendedLetters } from '@/shared/services/questionEngine'
import type {
  Achievement,
  DailyGoalProgress,
  DifficultyProgress,
  KeyboardSnapshot,
  ProgressContext,
  ProgressSnapshot,
  PracticeDifficulty,
  PracticeSessionRecord,
  UnlockTarget,
  UserProfile,
} from '@/shared/types/domain'

const DAY_IN_MS = 86_400_000
const TOTAL_TRACKABLE_KEYS = LETTER_ORDER.length

const getStartOfDay = (timestamp: number) => {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

const getLettersAtLevel = (snapshot: KeyboardSnapshot, minimumLevel: number) =>
  Object.values(snapshot).filter((entry) => entry.level >= minimumLevel).length

const getRatioForLevel = (snapshot: KeyboardSnapshot, minimumLevel: number) =>
  getLettersAtLevel(snapshot, minimumLevel) / Math.max(1, TOTAL_TRACKABLE_KEYS)

const getRequiredCount = (requiredRatio: number) =>
  Math.ceil(requiredRatio * TOTAL_TRACKABLE_KEYS)

const rotate = <T>(items: readonly T[], offset: number) => {
  if (items.length <= 1) {
    return [...items]
  }

  const normalizedOffset = ((offset % items.length) + items.length) % items.length
  return [...items.slice(normalizedOffset), ...items.slice(0, normalizedOffset)]
}

const getCompletedSessions = (sessions: PracticeSessionRecord[]) =>
  sessions.filter((session) => session.completed)

const getDifficultyProgress = (
  snapshot: KeyboardSnapshot,
  persisted: PracticeDifficulty[] = [],
): DifficultyProgress[] => {
  const persistedSet = new Set(persisted)

  return DIFFICULTY_UNLOCK_RULES.map((rule) => {
    const currentCount = getLettersAtLevel(snapshot, rule.minimumLevel)
    const currentRatio = getRatioForLevel(snapshot, rule.minimumLevel)
    const requiredCount = getRequiredCount(rule.requiredRatio)
    const unlocked = persistedSet.has(rule.id) || currentRatio >= rule.requiredRatio

    return {
      id: rule.id,
      title: DIFFICULTY_LABELS[rule.id],
      unlocked,
      currentRatio,
      requiredRatio: rule.requiredRatio,
      minimumLevel: rule.minimumLevel,
      currentCount,
      requiredCount,
    }
  })
}

const buildDailyGoal = (
  sessions: PracticeSessionRecord[],
  now: number,
): DailyGoalProgress => {
  const today = getStartOfDay(now)
  const completedSessionsToday = sessions.filter(
    (session) => getStartOfDay(session.endedAt ?? session.startedAt) === today,
  ).length

  return {
    completedSessions: completedSessionsToday,
    targetSessions: DAILY_GOAL_TARGET,
    progressRatio: Math.min(1, completedSessionsToday / DAILY_GOAL_TARGET),
    remainingSessions: Math.max(0, DAILY_GOAL_TARGET - completedSessionsToday),
  }
}

export const getUnlockedDifficulties = (snapshot: KeyboardSnapshot): PracticeDifficulty[] =>
  getDifficultyProgress(snapshot)
    .filter((entry) => entry.unlocked)
    .map((entry) => entry.id)

export const buildAchievementFeed = ({
  snapshot,
  profile,
  sessions,
}: ProgressContext): Achievement[] => {
  const completedSessions = getCompletedSessions(sessions)

  return ACHIEVEMENTS.map((definition) => ({
    id: definition.id,
    title: definition.title,
    description: definition.description,
    unlocked: definition.predicate({ snapshot, profile, sessions: completedSessions }),
  })).filter((achievement) => achievement.unlocked)
}

const getNextUnlock = (difficultyProgress: DifficultyProgress[]): UnlockTarget | null => {
  const nextEntry = difficultyProgress.find((entry) => !entry.unlocked)

  if (!nextEntry) {
    return null
  }

  return {
    id: nextEntry.id,
    title: nextEntry.title,
    requiredRatio: nextEntry.requiredRatio,
    currentRatio: nextEntry.currentRatio,
    unlocked: nextEntry.unlocked,
  }
}

export const buildDailyFocusLetters = (
  snapshot: KeyboardSnapshot,
  {
    count = 5,
    date = new Date(),
  }: {
    count?: number
    date?: Date
  } = {},
) => {
  const weakPool = selectRecommendedLetters(snapshot, Math.max(count, 8))
  const prioritizedPool = weakPool.slice(0, count)
  const fallbackPool = LETTER_ORDER.filter((letter) => !prioritizedPool.includes(letter))
  const pool = [...prioritizedPool, ...fallbackPool].slice(0, count)

  if (pool.length === 0) {
    return []
  }

  const daySeed = Math.floor(getStartOfDay(date.getTime()) / DAY_IN_MS)
  return rotate(pool, daySeed).slice(0, count)
}

export const buildProgressSnapshot = ({
  snapshot,
  profile,
  sessions,
  now = Date.now(),
}: {
  snapshot: KeyboardSnapshot
  profile: UserProfile
  sessions: PracticeSessionRecord[]
  now?: number
}): ProgressSnapshot => {
  const completedSessions = getCompletedSessions(sessions)
  const difficultyProgress = getDifficultyProgress(snapshot, profile.unlockedDifficulties)
  const unlockedDifficulties = difficultyProgress
    .filter((entry) => entry.unlocked)
    .map((entry) => entry.id)
  const achievementFeed = buildAchievementFeed({ snapshot, profile, sessions: completedSessions })

  return {
    masteredCount: Object.values(snapshot).filter((entry) => entry.level >= MASTERED_LEVEL).length,
    unlockedDifficulties,
    nextUnlock: getNextUnlock(difficultyProgress),
    difficultyProgress,
    dailyGoal: buildDailyGoal(completedSessions, now),
    achievementFeed,
    totalSessions: completedSessions.length,
  }
}
