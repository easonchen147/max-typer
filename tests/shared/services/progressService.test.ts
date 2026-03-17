import { describe, expect, it } from 'vitest'

import type { KeyboardSnapshot, PracticeSessionRecord, UserProfile } from '@/shared/types/domain'
import {
  buildAchievementFeed,
  buildDailyFocusLetters,
  buildProgressSnapshot,
  getUnlockedDifficulties,
} from '@/shared/services/progressService'

const createSnapshot = (levelMap: Record<string, number>): KeyboardSnapshot =>
  Object.fromEntries(
    'abcdefghijklmnopqrstuvwxyz'.split('').map((letter) => [
      letter,
      {
        letter,
        attempts: 10,
        correct: 8,
        accuracy: 0.8,
        averageReactionMs: 320,
        bestStreak: 4,
        level: levelMap[letter] ?? 0,
      },
    ]),
  ) as KeyboardSnapshot

const createSession = (overrides: Partial<PracticeSessionRecord>): PracticeSessionRecord => ({
  id: 'session-1',
  mode: 'basic-practice',
  difficulty: 'starter',
  startedAt: 1_710_000_000_000,
  endedAt: 1_710_000_300_000,
  durationMs: 300_000,
  score: 24,
  accuracy: 0.92,
  keystrokes: 40,
  completed: true,
  ...overrides,
})

const profile: UserProfile = {
  id: 1,
  createdAt: 1_710_000_000_000,
  updatedAt: 1_710_000_000_000,
  totalPracticeMs: 0,
  longestStreakDays: 0,
  currentStreakDays: 0,
  totalKeystrokes: 0,
  onboardingComplete: false,
  settings: {
    soundEnabled: true,
    colorblindMode: false,
    tutorialEnabled: true,
  },
  unlockedDifficulties: ['starter'],
  earnedAchievementIds: [],
}

describe('progressService', () => {
  it('unlocks difficulties from keyboard mastery thresholds', () => {
    const snapshot = createSnapshot({
      ...Object.fromEntries('abcdefghijklm'.split('').map((letter) => [letter, 2])),
      ...Object.fromEntries('nopqrstuvwxyz'.split('').map((letter) => [letter, 1])),
    })

    expect(getUnlockedDifficulties(snapshot)).toEqual(['starter', 'standard'])
  })

  it('builds a progress snapshot with overall mastery, difficulty progress, and next unlock target', () => {
    const snapshot = createSnapshot({
      ...Object.fromEntries('abcdefghijklmn'.split('').map((letter) => [letter, 2])),
      ...Object.fromEntries('opqrstuvwxyz'.split('').map((letter) => [letter, 1])),
      x: 2,
      z: 1,
    })

    const progress = buildProgressSnapshot({
      snapshot,
      profile,
      sessions: [createSession({}), createSession({ id: 'session-2', mode: 'fruit-ninja' })],
      now: 1_710_000_300_000,
    })

    expect(progress.masteredCount).toBe(0)
    expect(progress.unlockedDifficulties).toContain('standard')
    expect(progress.nextUnlock).not.toBeNull()
    expect(progress.nextUnlock?.id).toBe('challenge')
    expect(progress.difficultyProgress.find((entry) => entry.id === 'standard')).toEqual(
      expect.objectContaining({
        unlocked: true,
      }),
    )
    expect(progress.dailyGoal).toEqual(
      expect.objectContaining({
        completedSessions: 2,
        targetSessions: 3,
      }),
    )
  })

  it('keeps previously unlocked difficulties available after later performance drops', () => {
    const progress = buildProgressSnapshot({
      snapshot: createSnapshot({ a: 1, b: 1, c: 1 }),
      profile: {
        ...profile,
        unlockedDifficulties: ['starter', 'standard'],
      },
      sessions: [createSession({})],
    })

    expect(progress.unlockedDifficulties).toContain('standard')
  })

  it('rotates daily focus letters by date while staying inside the weak-letter pool', () => {
    const snapshot = createSnapshot({
      ...Object.fromEntries('abcdefghijklmnopqrstuvwxyz'.split('').map((letter) => [letter, 4])),
      q: 0,
      z: 1,
      x: 1,
      j: 1,
      p: 2,
    })

    const monday = buildDailyFocusLetters(snapshot, {
      count: 5,
      date: new Date('2026-03-16T08:00:00.000Z'),
    })
    const tuesday = buildDailyFocusLetters(snapshot, {
      count: 5,
      date: new Date('2026-03-17T08:00:00.000Z'),
    })

    expect(monday).toHaveLength(5)
    expect(tuesday).toHaveLength(5)
    expect(new Set(monday)).toEqual(new Set(tuesday))
    expect(monday.join('')).not.toBe(tuesday.join(''))
    expect(monday).toEqual(expect.arrayContaining(['q', 'z', 'x']))
  })

  it('generates achievements for streaks, arcade play, and mastery', () => {
    const snapshot = createSnapshot({
      ...Object.fromEntries('abcdefghij'.split('').map((letter) => [letter, 5])),
    })

    const achievements = buildAchievementFeed({
      snapshot,
      profile: {
        ...profile,
        currentStreakDays: 6,
        totalKeystrokes: 1200,
      },
      sessions: [
        createSession({}),
        createSession({ id: 'session-2', mode: 'fruit-ninja' }),
        createSession({ id: 'session-3', mode: 'space-invaders' }),
      ],
    })

    expect(achievements.map((achievement) => achievement.id)).toEqual(
      expect.arrayContaining(['streak-5', 'arcade-explorer', 'golden-fingers']),
    )
  })

  it('ignores incomplete sessions for total session counts and arcade achievements', () => {
    const snapshot = createSnapshot({
      ...Object.fromEntries('abcdefghij'.split('').map((letter) => [letter, 5])),
    })
    const sessions = [
      createSession({}),
      createSession({ id: 'session-2', mode: 'fruit-ninja', completed: false }),
      createSession({ id: 'session-3', mode: 'space-invaders' }),
    ]

    const progress = buildProgressSnapshot({
      snapshot,
      profile: {
        ...profile,
        currentStreakDays: 2,
        totalKeystrokes: 80,
      },
      sessions,
    })
    const achievements = buildAchievementFeed({
      snapshot,
      profile: {
        ...profile,
        currentStreakDays: 2,
        totalKeystrokes: 80,
      },
      sessions,
    })

    expect(progress.totalSessions).toBe(2)
    expect(achievements.map((achievement) => achievement.id)).not.toContain('arcade-explorer')
  })
})
