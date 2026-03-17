import { create } from 'zustand'

import { buildKeyboardSnapshot } from '@/shared/services/statsAggregator'
import { createDefaultProfile, dataService } from '@/shared/services/dataService'
import type {
  KeyStrokeRecord,
  KeyboardSnapshot,
  PracticeDifficulty,
  PracticeMode,
  PracticeSessionRecord,
  UserProfile,
} from '@/shared/types/domain'

interface StrokeInput {
  letter: string
  expected: string
  input: string
  correct: boolean
  reactionMs: number
  mode: PracticeMode
  difficulty: PracticeDifficulty
  contextWord?: string
}

interface TrainerState {
  hydrated: boolean
  loading: boolean
  profile: UserProfile
  snapshot: KeyboardSnapshot
  sessions: PracticeSessionRecord[]
  activeSessionId: string | null
  exportPayload: string | null
  hydrate: () => Promise<void>
  startSession: (mode: PracticeMode, difficulty: PracticeDifficulty) => Promise<void>
  recordStroke: (input: StrokeInput) => Promise<KeyStrokeRecord | undefined>
  completeSession: (update: Parameters<typeof dataService.finishSession>[1]) => Promise<void>
  updateSettings: (patch: Partial<UserProfile['settings']>) => Promise<void>
  markOnboardingComplete: () => Promise<void>
  exportData: () => Promise<string>
  resetData: () => Promise<void>
}

const initialProfile = createDefaultProfile()

export const useTrainerStore = create<TrainerState>((set, get) => ({
  hydrated: false,
  loading: false,
  profile: initialProfile,
  snapshot: buildKeyboardSnapshot(),
  sessions: [],
  activeSessionId: null,
  exportPayload: null,
  hydrate: async () => {
    set({ loading: true })
    const [profile, sessions, snapshot] = await Promise.all([
      dataService.getProfile(),
      dataService.listSessions(),
      dataService.getKeyboardSnapshot(),
    ])

    set({
      hydrated: true,
      loading: false,
      profile,
      sessions,
      snapshot,
    })
  },
  startSession: async (mode, difficulty) => {
    const session = await dataService.startSession(mode, difficulty)
    set((state) => ({
      activeSessionId: session.id,
      sessions: [session, ...state.sessions.filter((entry) => entry.id !== session.id)],
    }))
  },
  recordStroke: async (input) => {
    const sessionId = get().activeSessionId

    if (!sessionId) {
      return undefined
    }

    const stroke = await dataService.recordKeyStroke({
      ...input,
      sessionId,
    })

    const [profile, snapshot] = await Promise.all([
      dataService.getProfile(),
      dataService.getKeyboardSnapshot(),
    ])

    set({
      profile,
      snapshot,
    })

    return stroke
  },
  completeSession: async (update) => {
    const sessionId = get().activeSessionId

    if (!sessionId) {
      return
    }

    await dataService.finishSession(sessionId, update)
    const [profile, sessions, snapshot] = await Promise.all([
      dataService.getProfile(),
      dataService.listSessions(),
      dataService.getKeyboardSnapshot(),
    ])

    set({
      profile,
      sessions,
      snapshot,
      activeSessionId: null,
    })
  },
  updateSettings: async (patch) => {
    const profile = await dataService.updateProfile({
      settings: {
        ...get().profile.settings,
        ...patch,
      },
    })
    set({ profile })
  },
  markOnboardingComplete: async () => {
    const profile = await dataService.updateProfile({
      onboardingComplete: true,
    })
    set({ profile })
  },
  exportData: async () => {
    const payload = JSON.stringify(await dataService.exportData(), null, 2)
    set({ exportPayload: payload })
    return payload
  },
  resetData: async () => {
    await dataService.reset()
    await get().hydrate()
  },
}))
