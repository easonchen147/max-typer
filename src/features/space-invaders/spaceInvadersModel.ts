import type { KeyboardSnapshot, PracticeDifficulty, WordEntry } from '@/shared/types/domain'
import { selectWordWave } from '@/shared/services/questionEngine'
import { createId } from '@/shared/utils/id'

export interface InvaderShip {
  id: string
  value: string
  progress: number
  isBoss: boolean
}

export interface InvaderState {
  ships: InvaderShip[]
  focusId: string | null
  score: number
  destroyedIds: string[]
}

interface InvaderPacingProfile {
  waveSize: number
  initialConcurrent: number
  maxConcurrent: number
  initialSpawnIntervalMs: number
  minSpawnIntervalMs: number
  initialSpeed: number
  maxSpeed: number
}

export interface InvaderCadence {
  waveSize: number
  activeLimit: number
  spawnIntervalMs: number
  speed: number
  progress: number
}

const pacingByDifficulty: Record<PracticeDifficulty, InvaderPacingProfile> = {
  starter: {
    waveSize: 4,
    initialConcurrent: 1,
    maxConcurrent: 2,
    initialSpawnIntervalMs: 2400,
    minSpawnIntervalMs: 1700,
    initialSpeed: 24,
    maxSpeed: 30,
  },
  standard: {
    waveSize: 5,
    initialConcurrent: 1,
    maxConcurrent: 3,
    initialSpawnIntervalMs: 2000,
    minSpawnIntervalMs: 1200,
    initialSpeed: 30,
    maxSpeed: 42,
  },
  challenge: {
    waveSize: 6,
    initialConcurrent: 2,
    maxConcurrent: 4,
    initialSpawnIntervalMs: 1500,
    minSpawnIntervalMs: 850,
    initialSpeed: 36,
    maxSpeed: 54,
  },
}

const clampProgress = (value: number) => Math.min(1, Math.max(0, value))

const lerp = (start: number, end: number, progress: number) =>
  start + (end - start) * clampProgress(progress)

export const createInvaderState = (ships: InvaderShip[]): InvaderState => ({
  ships,
  focusId: null,
  score: 0,
  destroyedIds: [],
})

export const getInvaderPacingProfile = (difficulty: PracticeDifficulty) =>
  pacingByDifficulty[difficulty]

export const getInvaderCadence = ({
  difficulty,
  launchedShips,
  totalShips,
}: {
  difficulty: PracticeDifficulty
  launchedShips: number
  totalShips?: number
}): InvaderCadence => {
  const profile = getInvaderPacingProfile(difficulty)
  const resolvedTotalShips = Math.max(profile.waveSize, totalShips ?? profile.waveSize, 1)
  const progress =
    resolvedTotalShips <= 1 ? 1 : clampProgress(launchedShips / (resolvedTotalShips - 1))

  return {
    waveSize: resolvedTotalShips,
    progress,
    activeLimit: Math.min(
      profile.maxConcurrent,
      Math.max(
        profile.initialConcurrent,
        Math.round(lerp(profile.initialConcurrent, profile.maxConcurrent, progress)),
      ),
    ),
    spawnIntervalMs: Math.round(
      lerp(profile.initialSpawnIntervalMs, profile.minSpawnIntervalMs, progress),
    ),
    speed: lerp(profile.initialSpeed, profile.maxSpeed, progress),
  }
}

export const buildInvaderWave = ({
  snapshot,
  words,
  difficulty,
  size,
  random = Math.random,
}: {
  snapshot: KeyboardSnapshot
  words: WordEntry[]
  difficulty: PracticeDifficulty
  size: number
  random?: () => number
}): InvaderShip[] =>
  selectWordWave({
    snapshot,
    words,
    difficulty,
    size,
    random,
  }).map((entry, index) => ({
    id: createId(`ship-${index}`),
    value: entry.value,
    progress: 0,
    isBoss: false,
  }))

const chooseTargetShip = (state: InvaderState, key: string) => {
  if (state.focusId) {
    return state.ships.find((ship) => ship.id === state.focusId) ?? null
  }

  return state.ships.find((ship) => ship.value[0]?.toLowerCase() === key) ?? null
}

export const advanceWordInput = (state: InvaderState, key: string): InvaderState => {
  const normalized = key.toLowerCase()
  const targetShip = chooseTargetShip(state, normalized)

  if (!targetShip) {
    return {
      ...state,
      focusId: null,
    }
  }

  const expected = targetShip.value[targetShip.progress]?.toLowerCase()

  if (expected !== normalized) {
    return {
      ...state,
      focusId: null,
      ships: state.ships.map((ship) =>
        ship.id === targetShip.id ? { ...ship, progress: 0 } : ship,
      ),
    }
  }

  const nextProgress = targetShip.progress + 1
  const completed = nextProgress >= targetShip.value.length

  if (completed) {
    return {
      ships: state.ships.filter((ship) => ship.id !== targetShip.id),
      focusId: null,
      score: state.score + (targetShip.isBoss ? 90 : 35),
      destroyedIds: [...state.destroyedIds, targetShip.id],
    }
  }

  return {
    ...state,
    focusId: targetShip.id,
    ships: state.ships.map((ship) =>
      ship.id === targetShip.id ? { ...ship, progress: nextProgress } : ship,
    ),
  }
}
