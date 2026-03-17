import { PRACTICE_COPY } from '@/shared/constants/content'
import {
  getWordBankEntries as getBankEntries,
  getWordBankPhrases as getBankPhrases,
} from '@/shared/constants/wordBanks'
import { buildStarterRoundQueue, selectWordWave } from '@/shared/services/questionEngine'
import type {
  KeyboardSnapshot,
  PracticeDifficulty,
  WordBankId,
  WordEntry,
} from '@/shared/types/domain'

const shuffle = <T>(items: readonly T[], random: () => number) => {
  const result = [...items]

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1))
    const current = result[index]

    result[index] = result[swapIndex]
    result[swapIndex] = current
  }

  return result
}

const buildPhraseWave = ({
  phrases,
  size,
  random,
}: {
  phrases: string[]
  size: number
  random: () => number
}) => {
  if (phrases.length === 0) {
    return []
  }

  const queue: string[] = []

  while (queue.length < size) {
    queue.push(...shuffle(phrases, random))
  }

  return queue.slice(0, size)
}

export const getWordBankEntries = (wordBankId: WordBankId): WordEntry[] =>
  getBankEntries(wordBankId)

export const getWordBankPhrases = (wordBankId: WordBankId): string[] =>
  getBankPhrases(wordBankId)

export const buildPracticeTargets = ({
  difficulty,
  snapshot,
  wordBankId,
  random = Math.random,
}: {
  difficulty: PracticeDifficulty
  snapshot: KeyboardSnapshot
  wordBankId: WordBankId
  random?: () => number
}) => {
  if (difficulty === 'starter') {
    return buildStarterRoundQueue({
      snapshot,
      length: PRACTICE_COPY.starter.length,
      random,
    })
  }

  if (difficulty === 'standard') {
    return selectWordWave({
      snapshot,
      words: getBankEntries(wordBankId),
      difficulty: 'standard',
      size: PRACTICE_COPY.standard.length,
      random,
    }).map((entry) => entry.value)
  }

  return buildPhraseWave({
    phrases: getBankPhrases(wordBankId),
    size: PRACTICE_COPY.challenge.length,
    random,
  })
}
