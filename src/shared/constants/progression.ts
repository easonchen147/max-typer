import type { AchievementDefinition, PracticeDifficulty } from '@/shared/types/domain'

export const PRACTICE_DIFFICULTIES: readonly PracticeDifficulty[] = [
  'starter',
  'standard',
  'challenge',
] as const

export const DIFFICULTY_LABELS: Record<PracticeDifficulty, string> = {
  starter: '启程',
  standard: '巡航',
  challenge: '王牌',
}

export const DIFFICULTY_UNLOCK_RULES = [
  { id: 'starter', title: '启程', requiredRatio: 0, minimumLevel: 0 },
  { id: 'standard', title: '巡航', requiredRatio: 0.5, minimumLevel: 2 },
  { id: 'challenge', title: '王牌', requiredRatio: 0.8, minimumLevel: 4 },
] as const

export const MASTERED_LEVEL = 4
export const GOLD_LEVEL = 5
export const DAILY_GOAL_TARGET = 3

export const ACHIEVEMENTS: readonly AchievementDefinition[] = [
  {
    id: 'streak-5',
    title: '连续发动机',
    description: '连续练习 5 天',
    predicate: ({ profile }) => profile.currentStreakDays >= 5,
  },
  {
    id: 'arcade-explorer',
    title: '街机探索家',
    description: '体验水果忍者和太空侵略者两种街机模式',
    predicate: ({ sessions }) => {
      const modes = new Set(sessions.map((session) => session.mode))
      return modes.has('fruit-ninja') && modes.has('space-invaders')
    },
  },
  {
    id: 'golden-fingers',
    title: '金手指',
    description: '至少 10 个字母达到金色熟练度',
    predicate: ({ snapshot }) =>
      Object.values(snapshot).filter((entry) => entry.level >= GOLD_LEVEL).length >= 10,
  },
  {
    id: 'keystroke-1000',
    title: '千击训练营',
    description: '累计录入 1000 次按键',
    predicate: ({ profile }) => profile.totalKeystrokes >= 1000,
  },
] as const
