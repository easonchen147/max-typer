import { describe, expect, it } from 'vitest'

import type { KeyStrokeRecord } from '@/shared/types/domain'
import {
  aggregateLetterStats,
  buildKeyboardSnapshot,
  calculateLetterLevel,
} from '@/shared/services/statsAggregator'

const createStroke = (overrides: Partial<KeyStrokeRecord>): KeyStrokeRecord => ({
  id: `stroke-${Math.random().toString(36).slice(2)}`,
  sessionId: 'session-1',
  letter: 'a',
  expected: 'a',
  input: 'a',
  correct: true,
  reactionMs: 320,
  timestamp: 1_710_000_000_000,
  mode: 'basic-practice',
  difficulty: 'starter',
  ...overrides,
})

describe('statsAggregator', () => {
  it('aggregates letter accuracy, streak, and reaction metrics', () => {
    const strokes = [
      createStroke({ letter: 'a', correct: true, reactionMs: 300 }),
      createStroke({ letter: 'a', correct: true, reactionMs: 290 }),
      createStroke({ letter: 'a', correct: false, reactionMs: 580 }),
      createStroke({ letter: 'b', correct: true, reactionMs: 240 }),
    ]

    const stats = aggregateLetterStats(strokes)

    expect(stats.a.attempts).toBe(3)
    expect(stats.a.correct).toBe(2)
    expect(stats.a.accuracy).toBeCloseTo(2 / 3, 5)
    expect(stats.a.averageReactionMs).toBeCloseTo(390, 0)
    expect(stats.a.bestStreak).toBe(2)
    expect(stats.b.averageReactionMs).toBe(240)
  })

  it('builds a 26-letter keyboard snapshot and uses level mapping', () => {
    const snapshot = buildKeyboardSnapshot({
      a: {
        letter: 'a',
        attempts: 8,
        correct: 8,
        accuracy: 1,
        averageReactionMs: 210,
        bestStreak: 8,
        level: calculateLetterLevel({ accuracy: 1, averageReactionMs: 210, attempts: 8 }),
      },
    })

    expect(Object.keys(snapshot)).toHaveLength(26)
    expect(snapshot.a.level).toBe(5)
    expect(snapshot.z.level).toBe(0)
    expect(snapshot.z.attempts).toBe(0)
  })
})
