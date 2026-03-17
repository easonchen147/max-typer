import { describe, expect, it } from 'vitest'

import type { KeyboardSnapshot, WordBankId } from '@/shared/types/domain'
import { buildPracticeTargets, getWordBankEntries, getWordBankPhrases } from '@/shared/services/practiceContent'

const createSnapshot = (): KeyboardSnapshot =>
  Object.fromEntries(
    'abcdefghijklmnopqrstuvwxyz'.split('').map((letter) => [
      letter,
      {
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

describe('practiceContent', () => {
  it('builds standard practice targets from the selected word bank', () => {
    const bankId: WordBankId = 'cet4'
    const bankWords = new Set(getWordBankEntries(bankId).map((entry) => entry.value))

    const targets = buildPracticeTargets({
      difficulty: 'standard',
      snapshot: createSnapshot(),
      wordBankId: bankId,
      random: () => 0,
    })

    expect(targets).toHaveLength(8)
    expect(targets.every((target) => bankWords.has(target))).toBe(true)
  })

  it('builds challenge phrase targets from the selected bank phrase pack', () => {
    const elementaryPhrases = new Set(getWordBankPhrases('elementary'))
    const cet6Phrases = new Set(getWordBankPhrases('cet6'))

    const elementaryTargets = buildPracticeTargets({
      difficulty: 'challenge',
      snapshot: createSnapshot(),
      wordBankId: 'elementary',
      random: () => 0,
    })

    const cet6Targets = buildPracticeTargets({
      difficulty: 'challenge',
      snapshot: createSnapshot(),
      wordBankId: 'cet6',
      random: () => 0,
    })

    expect(elementaryTargets.every((target) => elementaryPhrases.has(target))).toBe(true)
    expect(cet6Targets.every((target) => cet6Phrases.has(target))).toBe(true)
    expect(elementaryTargets[0]).not.toBe(cet6Targets[0])
  })
})
