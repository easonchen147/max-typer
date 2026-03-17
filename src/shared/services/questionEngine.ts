import { LETTER_ORDER } from '@/shared/constants/keyboard'
import type {
  KeyboardSnapshot,
  LetterStats,
  PracticeDifficulty,
  WordEntry,
} from '@/shared/types/domain'

interface QueueOptions {
  snapshot: KeyboardSnapshot
  length: number
  weakRatio?: number
  random?: () => number
}

interface WordWaveOptions {
  snapshot: KeyboardSnapshot
  words: WordEntry[]
  difficulty: PracticeDifficulty
  size: number
  random?: () => number
}

interface FocusedQueueOptions {
  letters: string[]
  length: number
  random?: () => number
}

const difficultyRank: Record<PracticeDifficulty, number> = {
  starter: 0,
  standard: 1,
  challenge: 2,
}

const byWeakness = (left: LetterStats, right: LetterStats) =>
  left.level - right.level ||
  left.accuracy - right.accuracy ||
  right.averageReactionMs - left.averageReactionMs ||
  right.attempts - left.attempts ||
  left.letter.localeCompare(right.letter)

const getTrackedLetters = (snapshot: KeyboardSnapshot) =>
  Object.values(snapshot).filter((entry) => entry.attempts > 0).sort(byWeakness)

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

const rotate = <T>(items: readonly T[], random: () => number) => {
  if (items.length <= 1) {
    return [...items]
  }

  const offset = Math.floor(random() * items.length) % items.length
  return [...items.slice(offset), ...items.slice(0, offset)]
}

const buildRoundSequence = (letters: readonly string[], length: number, random: () => number) => {
  if (letters.length === 0) {
    return []
  }

  const queue: string[] = []

  while (queue.length < length) {
    const round = shuffle(letters, random)
    const previous = queue[queue.length - 1]

    if (previous && round.length > 1 && round[0] === previous) {
      const swapIndex = round.findIndex((letter) => letter !== previous)

      if (swapIndex > 0) {
        const first = round[0]
        round[0] = round[swapIndex]
        round[swapIndex] = first
      }
    }

    queue.push(...round)
  }

  return queue.slice(0, length)
}

const buildPrioritizedRoundSequence = ({
  priorityLetters,
  fallbackLetters,
  length,
  random,
}: {
  priorityLetters: string[]
  fallbackLetters: string[]
  length: number
  random: () => number
}) => {
  const priority = [...new Set(priorityLetters)]
  const prioritySet = new Set(priority)
  const fallback = [...new Set(fallbackLetters.filter((letter) => !prioritySet.has(letter)))]

  if (priority.length === 0 && fallback.length === 0) {
    return []
  }

  const queue: string[] = []

  while (queue.length < length) {
    const round = [...shuffle(priority, random), ...shuffle(fallback, random)]
    const previous = queue[queue.length - 1]

    if (previous && round.length > 1 && round[0] === previous) {
      const swapIndex = round.findIndex((letter) => letter !== previous)

      if (swapIndex > 0) {
        const first = round[0]
        round[0] = round[swapIndex]
        round[swapIndex] = first
      }
    }

    queue.push(...round)
  }

  return queue.slice(0, length)
}

const buildBiasedPrioritySequence = ({
  priorityLetters,
  fallbackLetters,
  length,
  random,
}: {
  priorityLetters: string[]
  fallbackLetters: string[]
  length: number
  random: () => number
}) => {
  const priority = [...new Set(priorityLetters)]
  const prioritySet = new Set(priority)
  const fallback = [...new Set(fallbackLetters.filter((letter) => !prioritySet.has(letter)))]

  if (priority.length === 0) {
    return buildRoundSequence(fallback, length, random)
  }

  const priorityCycle = buildRoundSequence(priority, length, random)
  const fallbackCycle = buildRoundSequence(fallback, length, random)
  const queue: string[] = []
  let priorityIndex = 0
  let fallbackIndex = 0
  const fallbackEvery = priority.length <= 3 ? 3 : priority.length <= 5 ? 4 : 5

  while (queue.length < length) {
    queue.push(priorityCycle[priorityIndex % priorityCycle.length])
    priorityIndex += 1

    if (
      fallback.length > 0 &&
      queue.length < length &&
      priorityIndex % fallbackEvery === 0
    ) {
      const nextFallback = fallbackCycle[fallbackIndex % fallbackCycle.length]

      if (queue[queue.length - 1] !== nextFallback) {
        queue.push(nextFallback)
        fallbackIndex += 1
      }
    }
  }

  return queue.slice(0, length)
}

export const selectRecommendedLetters = (snapshot: KeyboardSnapshot, count = 5) => {
  const tracked = getTrackedLetters(snapshot)

  if (tracked.length === 0) {
    return LETTER_ORDER.slice(0, count)
  }

  return tracked.slice(0, count).map((entry) => entry.letter)
}

export const buildStarterRoundQueue = ({
  snapshot,
  length,
  random = Math.random,
}: QueueOptions) => {
  const tracked = getTrackedLetters(snapshot)

  if (tracked.length === 0) {
    return buildRoundSequence(LETTER_ORDER, length, random)
  }

  const weakLetters = tracked
    .filter((entry) => entry.level <= 2)
    .slice(0, Math.min(6, length))
    .map((entry) => entry.letter)
  const weakSet = new Set(weakLetters)
  const supportLetters = LETTER_ORDER.filter((letter) => !weakSet.has(letter))

  return buildPrioritizedRoundSequence({
    priorityLetters: weakLetters,
    fallbackLetters: supportLetters,
    length,
    random,
  })
}

export const buildLetterDrillQueue = ({
  snapshot,
  length,
  weakRatio = 0.7,
  random = Math.random,
}: QueueOptions) => {
  const tracked = getTrackedLetters(snapshot)

  if (tracked.length === 0) {
    return buildRoundSequence(LETTER_ORDER, length, random)
  }

  const weakLetters = tracked.filter((entry) => entry.level <= 2).map((entry) => entry.letter)
  const strongLetters = tracked.filter((entry) => entry.level > 2).map((entry) => entry.letter)
  const knownLetters = new Set([...weakLetters, ...strongLetters])
  const supportLetters = LETTER_ORDER.filter((letter) => !knownLetters.has(letter))
  const weakSlots = Math.min(length, Math.max(1, Math.round(length * weakRatio)))
  const strongSlots = Math.max(0, length - weakSlots)
  const weakSequence = buildBiasedPrioritySequence({
    priorityLetters: weakLetters,
    fallbackLetters: [...strongLetters, ...supportLetters],
    length: weakSlots,
    random,
  })
  const strongSequence = buildPrioritizedRoundSequence({
    priorityLetters: strongLetters,
    fallbackLetters: supportLetters.length > 0 ? supportLetters : weakLetters,
    length: strongSlots,
    random,
  })

  const queue: string[] = []
  let weakIndex = 0
  let strongIndex = 0
  let usedWeak = 0
  let usedStrong = 0

  while (queue.length < length) {
    const shouldUseStrong =
      usedStrong < strongSlots && usedWeak > 0 && usedWeak % 2 === 0

    if (shouldUseStrong) {
      queue.push(strongSequence[strongIndex % strongSequence.length])
      strongIndex += 1
      usedStrong += 1
      continue
    }

    if (usedWeak < weakSlots) {
      queue.push(weakSequence[weakIndex % weakSequence.length])
      weakIndex += 1
      usedWeak += 1
      continue
    }

    queue.push(strongSequence[strongIndex % strongSequence.length])
    strongIndex += 1
    usedStrong += 1
  }

  return queue
}

export const buildFocusedDrillQueue = ({
  letters,
  length,
  random = Math.random,
}: FocusedQueueOptions) => {
  const normalized = [...new Set(
    letters
      .map((letter) => letter.trim().toLowerCase())
      .filter((letter) => /^[a-z]$/.test(letter)),
  )]

  if (normalized.length === 0) {
    return buildRoundSequence(LETTER_ORDER, length, random)
  }

  if (normalized.length === 1) {
    return Array.from({ length }, () => normalized[0])
  }

  const [primary, ...secondary] = rotate(normalized, random)
  const queue: string[] = []
  let secondaryIndex = 0

  while (queue.length < length) {
    queue.push(primary)

    if (queue.length < length && secondary.length > 0) {
      queue.push(secondary[secondaryIndex % secondary.length])
      secondaryIndex += 1
    }
  }

  return queue.slice(0, length)
}

const scoreWord = (snapshot: KeyboardSnapshot, word: WordEntry) =>
  word.value
    .toLowerCase()
    .split('')
    .reduce((score, letter) => {
      const stats = snapshot[letter]

      if (!stats) {
        return score
      }

      return score + Math.max(0, 6 - stats.level) + (1 - stats.accuracy)
    }, 0)

export const selectWordWave = ({
  snapshot,
  words,
  difficulty,
  size,
  random = Math.random,
}: WordWaveOptions) => {
  const filtered = words.filter(
    (word) => difficultyRank[word.difficulty] <= difficultyRank[difficulty],
  )

  const ranked = rotate(
    [...filtered].sort((left, right) => {
      const diff = scoreWord(snapshot, right) - scoreWord(snapshot, left)
      return diff || left.value.localeCompare(right.value)
    }),
    random,
  )

  if (ranked.length === 0) {
    return []
  }

  return Array.from({ length: size }, (_, index) => ranked[index % ranked.length])
}
