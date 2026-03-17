import { describe, expect, it } from 'vitest'

import type { KeyboardSnapshot, PracticeDifficulty, WordEntry } from '@/shared/types/domain'
import {
  buildFocusedDrillQueue,
  buildLetterDrillQueue,
  buildStarterRoundQueue,
  selectRecommendedLetters,
  selectWordWave,
} from '@/shared/services/questionEngine'

const createSnapshot = (entries: Partial<KeyboardSnapshot>): KeyboardSnapshot =>
  Object.fromEntries(
    'abcdefghijklmnopqrstuvwxyz'.split('').map((letter) => [
      letter,
      entries[letter] ?? {
        letter,
        attempts: 0,
        correct: 0,
        accuracy: 0,
        averageReactionMs: 0,
        bestStreak: 0,
        level: 0,
      },
    ]),
  ) as KeyboardSnapshot

const WORDS: WordEntry[] = [
  { value: 'cat', difficulty: 'starter', tags: ['animal'] },
  { value: 'jazz', difficulty: 'starter', tags: ['music'] },
  { value: 'vivid', difficulty: 'standard', tags: ['shape'] },
  { value: 'rocket', difficulty: 'challenge', tags: ['space'] },
]

describe('questionEngine', () => {
  it('builds a shuffled starter round without repeating letters before the round resets', () => {
    const queue = buildStarterRoundQueue({
      snapshot: createSnapshot({}),
      length: 10,
      random: () => 0,
    })

    expect(queue).toHaveLength(10)
    expect(new Set(queue).size).toBe(10)
    expect(queue.every((letter) => /^[a-z]$/.test(letter))).toBe(true)
  })

  it('prioritizes weak letters while interleaving mastered content', () => {
    const snapshot = createSnapshot({
      a: { letter: 'a', attempts: 12, correct: 6, accuracy: 0.5, averageReactionMs: 520, bestStreak: 2, level: 1 },
      b: { letter: 'b', attempts: 10, correct: 6, accuracy: 0.6, averageReactionMs: 480, bestStreak: 3, level: 2 },
      c: { letter: 'c', attempts: 15, correct: 15, accuracy: 1, averageReactionMs: 230, bestStreak: 15, level: 5 },
      d: { letter: 'd', attempts: 10, correct: 9, accuracy: 0.9, averageReactionMs: 260, bestStreak: 5, level: 4 },
    })

    const queue = buildLetterDrillQueue({
      snapshot,
      length: 10,
      weakRatio: 0.7,
      random: () => 0.1,
    })

    const weakCount = queue.filter((letter) => ['a', 'b'].includes(letter)).length

    expect(queue).toHaveLength(10)
    expect(weakCount).toBeGreaterThanOrEqual(4)
    expect(new Set(queue).size).toBeGreaterThanOrEqual(4)
    expect(queue.some((letter) => ['c', 'd'].includes(letter))).toBe(true)
  })

  it('surfaces weak letters early in starter rounds without collapsing into only a tiny loop', () => {
    const snapshot = createSnapshot({
      a: { letter: 'a', attempts: 12, correct: 5, accuracy: 0.42, averageReactionMs: 560, bestStreak: 2, level: 1 },
      b: { letter: 'b', attempts: 12, correct: 6, accuracy: 0.5, averageReactionMs: 540, bestStreak: 2, level: 1 },
      c: { letter: 'c', attempts: 12, correct: 6, accuracy: 0.5, averageReactionMs: 520, bestStreak: 3, level: 2 },
    })

    const queue = buildStarterRoundQueue({
      snapshot,
      length: 10,
      random: () => 0.15,
    })

    expect(queue).toHaveLength(10)
    expect(new Set(queue).size).toBe(10)
    expect(queue.slice(0, 4)).toEqual(expect.arrayContaining(['a', 'b', 'c']))
  })

  it('keeps arcade weak-letter queues varied even when only a few weak keys exist', () => {
    const snapshot = createSnapshot({
      a: { letter: 'a', attempts: 12, correct: 5, accuracy: 0.42, averageReactionMs: 560, bestStreak: 2, level: 1 },
      b: { letter: 'b', attempts: 12, correct: 6, accuracy: 0.5, averageReactionMs: 540, bestStreak: 2, level: 1 },
      c: { letter: 'c', attempts: 12, correct: 6, accuracy: 0.5, averageReactionMs: 520, bestStreak: 3, level: 2 },
      y: { letter: 'y', attempts: 12, correct: 11, accuracy: 0.92, averageReactionMs: 260, bestStreak: 5, level: 4 },
      z: { letter: 'z', attempts: 12, correct: 11, accuracy: 0.92, averageReactionMs: 250, bestStreak: 5, level: 4 },
    })

    const queue = buildLetterDrillQueue({
      snapshot,
      length: 10,
      weakRatio: 0.7,
      random: () => 0.12,
    })

    expect(queue).toHaveLength(10)
    expect(new Set(queue).size).toBeGreaterThanOrEqual(5)
    expect(queue.slice(0, 4).filter((letter) => ['a', 'b', 'c'].includes(letter)).length).toBeGreaterThanOrEqual(2)
  })

  it('recommends the weakest letters in stable order', () => {
    const snapshot = createSnapshot({
      q: { letter: 'q', attempts: 9, correct: 3, accuracy: 0.33, averageReactionMs: 640, bestStreak: 1, level: 0 },
      z: { letter: 'z', attempts: 12, correct: 6, accuracy: 0.5, averageReactionMs: 520, bestStreak: 2, level: 1 },
      x: { letter: 'x', attempts: 12, correct: 7, accuracy: 0.58, averageReactionMs: 500, bestStreak: 3, level: 2 },
      c: { letter: 'c', attempts: 12, correct: 11, accuracy: 0.92, averageReactionMs: 260, bestStreak: 5, level: 4 },
    })

    expect(selectRecommendedLetters(snapshot, 3)).toEqual(['q', 'z', 'x'])
  })

  it('selects word waves that match difficulty and weak letters', () => {
    const snapshot = createSnapshot({
      a: { letter: 'a', attempts: 12, correct: 6, accuracy: 0.5, averageReactionMs: 520, bestStreak: 2, level: 1 },
      j: { letter: 'j', attempts: 9, correct: 4, accuracy: 0.44, averageReactionMs: 580, bestStreak: 2, level: 1 },
      z: { letter: 'z', attempts: 8, correct: 4, accuracy: 0.5, averageReactionMs: 570, bestStreak: 2, level: 1 },
    })

    const wave = selectWordWave({
      snapshot,
      words: WORDS,
      difficulty: 'starter' satisfies PracticeDifficulty,
      size: 3,
      random: () => 0.2,
    })

    expect(wave).toHaveLength(3)
    expect(wave[0].value).toBe('jazz')
    expect(wave.some((entry) => entry.value === 'cat')).toBe(true)
    expect(wave.every((entry) => entry.difficulty === 'starter')).toBe(true)
  })

  it('includes standard words when the requested difficulty is standard', () => {
    const wave = selectWordWave({
      snapshot: createSnapshot({}),
      words: WORDS,
      difficulty: 'standard',
      size: 4,
      random: () => 0,
    })

    expect(wave.some((entry) => entry.difficulty === 'standard')).toBe(true)
    expect(wave.every((entry) => entry.difficulty !== 'challenge')).toBe(true)
  })

  it('builds a focused drill queue around the requested letters', () => {
    const queue = buildFocusedDrillQueue({
      letters: ['j', 'k', 'j'],
      length: 6,
      random: () => 0,
    })

    expect(queue).toEqual(['j', 'k', 'j', 'k', 'j', 'k'])
  })
})
