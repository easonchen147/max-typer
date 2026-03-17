import { describe, expect, it } from 'vitest'

import type { KeyboardSnapshot } from '@/shared/types/domain'
import {
  buildFruitSpawnSequence,
  createFruitState,
  resolveFruitInput,
} from '@/features/fruit-ninja/fruitNinjaModel'

const snapshot = Object.fromEntries(
  'abcdefghijklmnopqrstuvwxyz'.split('').map((letter) => [
    letter,
    {
      letter,
      attempts: 12,
      correct: letter === 'a' || letter === 's' ? 5 : 11,
      accuracy: letter === 'a' || letter === 's' ? 0.42 : 0.92,
      averageReactionMs: letter === 'a' || letter === 's' ? 560 : 250,
      bestStreak: letter === 'a' || letter === 's' ? 2 : 8,
      level: letter === 'a' || letter === 's' ? 1 : 4,
    },
  ]),
) as KeyboardSnapshot

describe('fruitNinjaModel', () => {
  it('biases fruit letters toward weak keys and injects occasional bombs', () => {
    const sequence = buildFruitSpawnSequence({
      difficulty: 'starter',
      length: 8,
      random: () => 0.12,
      snapshot,
    })

    expect(sequence).toHaveLength(8)
    expect(sequence.filter((item) => item.type === 'fruit' && ['a', 's'].includes(item.letter)).length).toBeGreaterThanOrEqual(4)
    expect(new Set(sequence.map((item) => item.letter)).size).toBeGreaterThanOrEqual(4)
    expect(sequence.some((item) => item.type === 'bomb')).toBe(true)
  })

  it('awards combo score for fruit hits and resets on bomb input', () => {
    let state = createFruitState()

    state = resolveFruitInput(state, { kind: 'fruit', letter: 'a' })
    state = resolveFruitInput(state, { kind: 'fruit', letter: 's' })

    expect(state.score).toBeGreaterThan(20)
    expect(state.combo).toBe(2)

    state = resolveFruitInput(state, { kind: 'bomb', letter: 'd' })

    expect(state.combo).toBe(0)
    expect(state.penalties).toBe(1)
  })
})
