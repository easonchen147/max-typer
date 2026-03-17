import Dexie from 'dexie'

import { MaxTyperDatabase } from '@/shared/db/database'
import { getUnlockedDifficulties } from '@/shared/services/progressService'
import type {
  KeyStrokeRecord,
  KeyboardSnapshot,
  PracticeDifficulty,
  PracticeMode,
  PracticeSessionRecord,
  UserProfile,
} from '@/shared/types/domain'
import { aggregateLetterStats, buildKeyboardSnapshot } from '@/shared/services/statsAggregator'
import { createId } from '@/shared/utils/id'
import { logger } from '@/shared/utils/logger'

interface DataServiceOptions {
  databaseName?: string
}

type KeyStrokeInput = Omit<KeyStrokeRecord, 'id' | 'timestamp'> &
  Partial<Pick<KeyStrokeRecord, 'id' | 'timestamp'>>

type SessionUpdate = Partial<
  Pick<
    PracticeSessionRecord,
    'endedAt' | 'durationMs' | 'score' | 'accuracy' | 'keystrokes' | 'completed'
  >
>

interface ExportedData {
  profile: UserProfile
  sessions: PracticeSessionRecord[]
  keyStrokes: KeyStrokeRecord[]
}

const DAY_IN_MS = 86_400_000
const DIFFICULTY_ORDER: readonly PracticeDifficulty[] = ['starter', 'standard', 'challenge']

const clone = <T>(value: T): T =>
  typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value))

const getStartOfDay = (timestamp: number) => {
  const date = new Date(timestamp)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

const calculatePracticeStreaks = (
  sessions: PracticeSessionRecord[],
  now = Date.now(),
) => {
  const completedDays = [...new Set(
    sessions
      .filter((session) => session.completed)
      .map((session) => getStartOfDay(session.endedAt ?? session.startedAt)),
  )].sort((left, right) => right - left)

  if (completedDays.length === 0) {
    return {
      currentStreakDays: 0,
      longestStreakDays: 0,
    }
  }

  let longest = 1
  let currentRun = 1

  for (let index = 1; index < completedDays.length; index += 1) {
    if (completedDays[index - 1] - completedDays[index] === DAY_IN_MS) {
      currentRun += 1
      longest = Math.max(longest, currentRun)
      continue
    }

    currentRun = 1
  }

  const today = getStartOfDay(now)

  if (today - completedDays[0] > DAY_IN_MS) {
    return {
      currentStreakDays: 0,
      longestStreakDays: longest,
    }
  }

  let currentStreakDays = 1

  for (let index = 1; index < completedDays.length; index += 1) {
    if (completedDays[index - 1] - completedDays[index] !== DAY_IN_MS) {
      break
    }

    currentStreakDays += 1
  }

  return {
    currentStreakDays,
    longestStreakDays: longest,
  }
}

const getCompletedSessionIds = (sessions: PracticeSessionRecord[]) =>
  new Set(sessions.filter((session) => session.completed).map((session) => session.id))

const getCompletedKeyStrokes = (
  sessions: PracticeSessionRecord[],
  keyStrokes: KeyStrokeRecord[],
) => {
  const completedSessionIds = getCompletedSessionIds(sessions)
  return keyStrokes.filter((stroke) => completedSessionIds.has(stroke.sessionId))
}

const buildSnapshotFromCompletedKeyStrokes = (
  sessions: PracticeSessionRecord[],
  keyStrokes: KeyStrokeRecord[],
) => {
  const completedKeyStrokes = getCompletedKeyStrokes(sessions, keyStrokes)

  return completedKeyStrokes.length === 0
    ? buildKeyboardSnapshot()
    : aggregateLetterStats(completedKeyStrokes)
}

const buildCompletedProfile = ({
  profile,
  sessions,
  snapshot,
  completedKeyStrokes,
  durationMs,
}: {
  profile: UserProfile
  sessions: PracticeSessionRecord[]
  snapshot: KeyboardSnapshot
  completedKeyStrokes: number
  durationMs: number
}): UserProfile => {
  const streaks = calculatePracticeStreaks(sessions)
  const unlockedDifficulties = new Set<PracticeDifficulty>([
    ...profile.unlockedDifficulties,
    ...getUnlockedDifficulties(snapshot),
  ])

  return {
    ...profile,
    totalPracticeMs: profile.totalPracticeMs + durationMs,
    currentStreakDays: streaks.currentStreakDays,
    longestStreakDays: Math.max(profile.longestStreakDays, streaks.longestStreakDays),
    totalKeystrokes: completedKeyStrokes,
    unlockedDifficulties: DIFFICULTY_ORDER.filter((difficulty) => unlockedDifficulties.has(difficulty)),
    updatedAt: Date.now(),
  }
}

export const createDefaultProfile = (): UserProfile => ({
  id: 1,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  totalPracticeMs: 0,
  longestStreakDays: 0,
  currentStreakDays: 0,
  totalKeystrokes: 0,
  onboardingComplete: false,
  settings: {
    soundEnabled: true,
    colorblindMode: false,
    tutorialEnabled: true,
  },
  unlockedDifficulties: ['starter'],
  earnedAchievementIds: [],
})

class DataService {
  private readonly databaseName: string
  private readonly db: MaxTyperDatabase
  private mode: 'dexie' | 'memory' = 'dexie'
  private memoryProfile = createDefaultProfile()
  private memorySessions: PracticeSessionRecord[] = []
  private memoryKeyStrokes: KeyStrokeRecord[] = []

  public constructor({ databaseName = 'max-typer' }: DataServiceOptions = {}) {
    this.databaseName = databaseName
    this.db = new MaxTyperDatabase(databaseName)
  }

  private async withStorage<T>(
    operation: (db: MaxTyperDatabase) => Promise<T>,
    fallback: () => Promise<T>,
  ) {
    if (this.mode === 'memory') {
      return fallback()
    }

    try {
      return await operation(this.db)
    } catch (error) {
      this.mode = 'memory'
      logger.warn('DataService', 'IndexedDB 不可用，降级为内存存储', error)
      return fallback()
    }
  }

  private async ensureProfile() {
    return this.withStorage(
      async (db) => {
        const existing = await db.profiles.get(1)

        if (existing) {
          return existing
        }

        const profile = createDefaultProfile()
        await db.profiles.put(profile)
        return profile
      },
      async () => clone(this.memoryProfile),
    )
  }

  public async getProfile() {
    return this.ensureProfile()
  }

  public async updateProfile(patch: Partial<UserProfile>) {
    return this.withStorage(
      async (db) => {
        const existing = await this.ensureProfile()
        const nextProfile = {
          ...existing,
          ...patch,
          settings: {
            ...existing.settings,
            ...patch.settings,
          },
          updatedAt: Date.now(),
        }

        await db.profiles.put(nextProfile)
        return nextProfile
      },
      async () => {
        this.memoryProfile = {
          ...this.memoryProfile,
          ...patch,
          settings: {
            ...this.memoryProfile.settings,
            ...patch.settings,
          },
          updatedAt: Date.now(),
        }

        return clone(this.memoryProfile)
      },
    )
  }

  public async listSessions() {
    return this.withStorage(
      async (db) => db.sessions.orderBy('startedAt').reverse().toArray(),
      async () => clone([...this.memorySessions].sort((left, right) => right.startedAt - left.startedAt)),
    )
  }

  public async listKeyStrokes() {
    return this.withStorage(
      async (db) => db.keyStrokes.orderBy('timestamp').toArray(),
      async () => clone([...this.memoryKeyStrokes].sort((left, right) => left.timestamp - right.timestamp)),
    )
  }

  public async startSession(mode: PracticeMode, difficulty: PracticeDifficulty) {
    const session: PracticeSessionRecord = {
      id: createId('session'),
      mode,
      difficulty,
      startedAt: Date.now(),
      endedAt: null,
      durationMs: 0,
      score: 0,
      accuracy: 0,
      keystrokes: 0,
      completed: false,
    }

    return this.withStorage(
      async (db) => {
        await db.sessions.put(session)
        return session
      },
      async () => {
        this.memorySessions.unshift(session)
        return clone(session)
      },
    )
  }

  public async finishSession(sessionId: string, update: SessionUpdate) {
    return this.withStorage(
      async (db) => {
        const existing = await db.sessions.get(sessionId)

        if (!existing) {
          return undefined
        }

        const nextSession = {
          ...existing,
          ...update,
        }

        await db.sessions.put(nextSession)

        if (update.completed) {
          const profile = await this.ensureProfile()
          const [sessions, keyStrokes] = await Promise.all([
            db.sessions.orderBy('startedAt').reverse().toArray(),
            db.keyStrokes.orderBy('timestamp').toArray(),
          ])
          const completedKeyStrokes = getCompletedKeyStrokes(sessions, keyStrokes)
          const snapshot = buildSnapshotFromCompletedKeyStrokes(sessions, keyStrokes)
          const nextProfile = buildCompletedProfile({
            profile,
            sessions,
            snapshot,
            completedKeyStrokes: completedKeyStrokes.length,
            durationMs: update.durationMs ?? 0,
          })

          await db.profiles.put(nextProfile)
        }

        return nextSession
      },
      async () => {
        const index = this.memorySessions.findIndex((session) => session.id === sessionId)

        if (index === -1) {
          return undefined
        }

        this.memorySessions[index] = {
          ...this.memorySessions[index],
          ...update,
        }

        if (update.completed) {
          const completedKeyStrokes = getCompletedKeyStrokes(this.memorySessions, this.memoryKeyStrokes)
          const snapshot = buildSnapshotFromCompletedKeyStrokes(
            this.memorySessions,
            this.memoryKeyStrokes,
          )

          this.memoryProfile = buildCompletedProfile({
            profile: this.memoryProfile,
            sessions: this.memorySessions,
            snapshot,
            completedKeyStrokes: completedKeyStrokes.length,
            durationMs: update.durationMs ?? 0,
          })
        }

        return clone(this.memorySessions[index])
      },
    )
  }

  public async recordKeyStroke(input: KeyStrokeInput) {
    const keyStroke: KeyStrokeRecord = {
      ...input,
      id: input.id ?? createId('stroke'),
      timestamp: input.timestamp ?? Date.now(),
    }

    return this.withStorage(
      async (db) => {
        await db.keyStrokes.put(keyStroke)
        return keyStroke
      },
      async () => {
        this.memoryKeyStrokes.push(keyStroke)
        return clone(keyStroke)
      },
    )
  }

  public async getKeyboardSnapshot(): Promise<KeyboardSnapshot> {
    const [sessions, strokes] = await Promise.all([this.listSessions(), this.listKeyStrokes()])
    return buildSnapshotFromCompletedKeyStrokes(sessions, strokes)
  }

  public async exportData(): Promise<ExportedData> {
    const [profile, sessions, keyStrokes] = await Promise.all([
      this.getProfile(),
      this.listSessions(),
      this.listKeyStrokes(),
    ])

    return {
      profile,
      sessions,
      keyStrokes,
    }
  }

  public async reset() {
    return this.withStorage(
      async (db) => {
        await db.transaction('rw', db.profiles, db.sessions, db.keyStrokes, async () => {
          await db.keyStrokes.clear()
          await db.sessions.clear()
          await db.profiles.clear()
          await db.profiles.put(createDefaultProfile())
        })
      },
      async () => {
        this.memoryProfile = createDefaultProfile()
        this.memorySessions = []
        this.memoryKeyStrokes = []
      },
    )
  }

  public async destroy() {
    this.db.close()
    await Dexie.delete(this.databaseName)
  }
}

export const createDataService = (options?: DataServiceOptions) => new DataService(options)
export const dataService = createDataService()
