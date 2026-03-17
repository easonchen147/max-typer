import { describe, expect, it } from 'vitest'

import type { KeyboardSnapshot, WordEntry } from '@/shared/types/domain'
import {
  advanceWordInput,
  buildInvaderWave,
  createInvaderState,
  getInvaderCadence,
} from '@/features/space-invaders/spaceInvadersModel'

const snapshot = Object.fromEntries(
  'abcdefghijklmnopqrstuvwxyz'.split('').map((letter) => [
    letter,
    {
      letter,
      attempts: 12,
      correct: ['r', 'o', 'c', 'k'].includes(letter) ? 5 : 11,
      accuracy: ['r', 'o', 'c', 'k'].includes(letter) ? 0.42 : 0.92,
      averageReactionMs: ['r', 'o', 'c', 'k'].includes(letter) ? 560 : 250,
      bestStreak: ['r', 'o', 'c', 'k'].includes(letter) ? 2 : 8,
      level: ['r', 'o', 'c', 'k'].includes(letter) ? 1 : 4,
    },
  ]),
) as KeyboardSnapshot

const WORDS: WordEntry[] = [
  { value: 'sun', difficulty: 'starter', tags: ['easy'] },
  { value: 'rock', difficulty: 'starter', tags: ['weak'] },
  { value: 'orbit', difficulty: 'standard', tags: ['space'] },
  { value: 'rocket', difficulty: 'challenge', tags: ['space'] },
]

describe('spaceInvadersModel', () => {
  it('prefers words containing weak letters for the next wave', () => {
    const wave = buildInvaderWave({
      difficulty: 'starter',
      random: () => 0.18,
      size: 3,
      snapshot,
      words: WORDS,
    })

    expect(wave).toHaveLength(3)
    expect(wave[0].value).toBe('rock')
  })

  it('ramps concurrent pressure linearly through the wave instead of dropping every word at once', () => {
    const early = getInvaderCadence({
      difficulty: 'starter',
      launchedShips: 0,
      totalShips: 4,
    })
    const mid = getInvaderCadence({
      difficulty: 'starter',
      launchedShips: 2,
      totalShips: 4,
    })
    const late = getInvaderCadence({
      difficulty: 'starter',
      launchedShips: 4,
      totalShips: 4,
    })

    expect(early.activeLimit).toBe(1)
    expect(mid.activeLimit).toBeGreaterThanOrEqual(early.activeLimit)
    expect(late.activeLimit).toBeGreaterThanOrEqual(mid.activeLimit)
    expect(mid.spawnIntervalMs).toBeLessThan(early.spawnIntervalMs)
    expect(late.spawnIntervalMs).toBeLessThan(mid.spawnIntervalMs)
    expect(mid.speed).toBeGreaterThan(early.speed)
    expect(late.speed).toBeGreaterThan(mid.speed)
  })

  it('makes higher difficulties launch more words with less time between spawns', () => {
    const starter = getInvaderCadence({
      difficulty: 'starter',
      launchedShips: 4,
      totalShips: 4,
    })
    const challenge = getInvaderCadence({
      difficulty: 'challenge',
      launchedShips: 6,
      totalShips: 6,
    })

    expect(challenge.activeLimit).toBeGreaterThan(starter.activeLimit)
    expect(challenge.spawnIntervalMs).toBeLessThan(starter.spawnIntervalMs)
    expect(challenge.speed).toBeGreaterThan(starter.speed)
  })

  it('tracks typed progress and destroys the ship when the word completes', () => {
    let state = createInvaderState([{ id: 'ship-1', value: 'rock', progress: 0, isBoss: false }])

    state = advanceWordInput(state, 'r')
    state = advanceWordInput(state, 'o')
    state = advanceWordInput(state, 'c')
    state = advanceWordInput(state, 'k')

    expect(state.destroyedIds).toEqual(['ship-1'])
    expect(state.score).toBeGreaterThan(0)
  })
})
