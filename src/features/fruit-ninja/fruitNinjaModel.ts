import type { KeyboardSnapshot, PracticeDifficulty } from '@/shared/types/domain'
import { buildLetterDrillQueue } from '@/shared/services/questionEngine'
import { createId } from '@/shared/utils/id'

export interface FruitSpawn {
  id: string
  type: 'fruit' | 'bomb'
  letter: string
}

export interface FruitState {
  score: number
  combo: number
  bestCombo: number
  hits: number
  misses: number
  penalties: number
}

export const createFruitState = (): FruitState => ({
  score: 0,
  combo: 0,
  bestCombo: 0,
  hits: 0,
  misses: 0,
  penalties: 0,
})

const bombIntervalByDifficulty: Record<PracticeDifficulty, number> = {
  starter: 5,
  standard: 4,
  challenge: 3,
}

export const buildFruitSpawnSequence = ({
  snapshot,
  difficulty,
  length,
  random = Math.random,
}: {
  snapshot: KeyboardSnapshot
  difficulty: PracticeDifficulty
  length: number
  random?: () => number
}): FruitSpawn[] => {
  const letters = buildLetterDrillQueue({
    snapshot,
    length,
    weakRatio: difficulty === 'starter' ? 0.72 : difficulty === 'standard' ? 0.68 : 0.64,
    random,
  })

  const bombInterval = bombIntervalByDifficulty[difficulty]
  const bombOffset = Math.floor(random() * bombInterval)

  return letters.map((letter, index) => ({
    id: createId('fruit'),
    type:
      index > 0 && (index + bombOffset) % bombInterval === bombInterval - 1 ? 'bomb' : 'fruit',
    letter,
  }))
}

export const resolveFruitInput = (
  state: FruitState,
  input: { kind: 'fruit' | 'bomb' | 'miss'; letter: string },
): FruitState => {
  if (input.kind === 'miss') {
    return {
      ...state,
      combo: 0,
      misses: state.misses + 1,
    }
  }

  if (input.kind === 'bomb') {
    return {
      ...state,
      combo: 0,
      penalties: state.penalties + 1,
      score: Math.max(0, state.score - 15),
    }
  }

  const combo = state.combo + 1
  const points = 12 + combo * 6

  return {
    ...state,
    combo,
    bestCombo: Math.max(state.bestCombo, combo),
    hits: state.hits + 1,
    score: state.score + points,
  }
}
