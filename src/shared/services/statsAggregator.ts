import { LETTER_ORDER } from '@/shared/constants/keyboard'
import type { KeyboardSnapshot, KeyStrokeRecord, LetterStats } from '@/shared/types/domain'

interface LevelCandidate {
  accuracy: number
  averageReactionMs: number
  attempts: number
}

const createEmptyLetterStats = (letter: string): LetterStats => ({
  letter,
  attempts: 0,
  correct: 0,
  accuracy: 0,
  averageReactionMs: 0,
  bestStreak: 0,
  level: 0,
})

export const calculateLetterLevel = ({
  accuracy,
  averageReactionMs,
  attempts,
}: LevelCandidate): number => {
  if (attempts === 0) {
    return 0
  }

  if (accuracy >= 0.98 && averageReactionMs <= 240 && attempts >= 8) {
    return 5
  }

  if (accuracy >= 0.95 && averageReactionMs <= 300 && attempts >= 8) {
    return 4
  }

  if (accuracy >= 0.88 && averageReactionMs <= 360 && attempts >= 6) {
    return 3
  }

  if (accuracy >= 0.75 && averageReactionMs <= 460 && attempts >= 4) {
    return 2
  }

  if (accuracy >= 0.55) {
    return 1
  }

  return 0
}

export const buildKeyboardSnapshot = (
  partial: Partial<KeyboardSnapshot> = {},
): KeyboardSnapshot =>
  Object.fromEntries(
    LETTER_ORDER.map((letter) => [letter, partial[letter] ?? createEmptyLetterStats(letter)]),
  ) as KeyboardSnapshot

export const aggregateLetterStats = (strokes: KeyStrokeRecord[]): KeyboardSnapshot => {
  const totals = new Map<
    string,
    {
      attempts: number
      correct: number
      reactionTotal: number
      bestStreak: number
      currentStreak: number
    }
  >()

  for (const stroke of strokes) {
    const key = stroke.letter.toLowerCase()
    const entry =
      totals.get(key) ?? {
        attempts: 0,
        correct: 0,
        reactionTotal: 0,
        bestStreak: 0,
        currentStreak: 0,
      }

    entry.attempts += 1
    entry.reactionTotal += stroke.reactionMs

    if (stroke.correct) {
      entry.correct += 1
      entry.currentStreak += 1
      entry.bestStreak = Math.max(entry.bestStreak, entry.currentStreak)
    } else {
      entry.currentStreak = 0
    }

    totals.set(key, entry)
  }

  const partial = Object.fromEntries(
    [...totals.entries()].map(([letter, entry]) => {
      const accuracy = entry.correct / entry.attempts
      const averageReactionMs = entry.reactionTotal / entry.attempts

      return [
        letter,
        {
          letter,
          attempts: entry.attempts,
          correct: entry.correct,
          accuracy,
          averageReactionMs,
          bestStreak: entry.bestStreak,
          level: calculateLetterLevel({
            accuracy,
            averageReactionMs,
            attempts: entry.attempts,
          }),
        } satisfies LetterStats,
      ]
    }),
  ) as Partial<KeyboardSnapshot>

  return buildKeyboardSnapshot(partial)
}
