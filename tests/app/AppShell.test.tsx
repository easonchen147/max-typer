import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildKeyboardSnapshot } from '@/shared/services/statsAggregator'
import { createDefaultProfile } from '@/shared/services/dataService'
import type {
  AppView,
  PracticeDifficulty,
  PracticeSessionRecord,
  SessionDurationPreset,
  WordBankId,
} from '@/shared/types/domain'

const mockNavigate = vi.fn()
const mockCompleteSession = vi.fn().mockResolvedValue(undefined)
const mockStartSession = vi.fn().mockResolvedValue(undefined)
let latestHeatmapProps:
  | {
      trendPoints: number[]
    }
  | undefined

const createSession = (
  overrides: Partial<PracticeSessionRecord> = {},
): PracticeSessionRecord => ({
  id: 'session-1',
  mode: 'basic-practice',
  difficulty: 'starter',
  startedAt: 1_710_000_000_000,
  endedAt: 1_710_000_300_000,
  durationMs: 300_000,
  score: 24,
  accuracy: 0.92,
  keystrokes: 40,
  completed: true,
  ...overrides,
})

const createMockAppState = () => {
  const state = {
    currentView: 'basic-practice' as AppView,
    selectedDifficulty: 'starter' as PracticeDifficulty,
    selectedDurationPreset: '5-min' as SessionDurationPreset,
    selectedWordBankId: 'elementary' as WordBankId,
    tutorialOpen: false,
    navigate: mockNavigate,
    setDifficulty: vi.fn((difficulty: PracticeDifficulty) => {
      state.selectedDifficulty = difficulty
    }),
    setDurationPreset: vi.fn((preset: SessionDurationPreset) => {
      state.selectedDurationPreset = preset
    }),
    setWordBank: vi.fn((wordBankId: WordBankId) => {
      state.selectedWordBankId = wordBankId
    }),
    showTutorial: vi.fn(() => {
      state.tutorialOpen = true
    }),
    hideTutorial: vi.fn(() => {
      state.tutorialOpen = false
    }),
  }

  return state
}

const createMockTrainerState = () => ({
  activeSessionId: 'session-1',
  hydrated: true,
  hydrate: vi.fn().mockResolvedValue(undefined),
  loading: false,
  profile: createDefaultProfile(),
  snapshot: buildKeyboardSnapshot(),
  sessions: [] as PracticeSessionRecord[],
  startSession: mockStartSession,
  recordStroke: vi.fn().mockResolvedValue(undefined),
  completeSession: mockCompleteSession,
  updateSettings: vi.fn().mockResolvedValue(undefined),
  markOnboardingComplete: vi.fn().mockResolvedValue(undefined),
  exportData: vi.fn().mockResolvedValue('{}'),
  resetData: vi.fn().mockResolvedValue(undefined),
})

let mockAppState = createMockAppState()
let mockTrainerState = createMockTrainerState()

vi.mock('@/shared/stores/appStore', () => ({
  useAppStore: (selector: (state: typeof mockAppState) => unknown) => selector(mockAppState),
}))

vi.mock('@/shared/stores/trainerStore', () => ({
  useTrainerStore: (selector: (state: typeof mockTrainerState) => unknown) =>
    selector(mockTrainerState),
}))

vi.mock('@/features/basic-practice/BasicPracticeScreen', () => ({
  BasicPracticeScreen: (props: {
    onProgress?: (summary: { accuracy: number; keystrokes: number; score: number }) => void
  }) => (
    <section>
      <button
        onClick={() =>
          props.onProgress?.({
            accuracy: 0.75,
            keystrokes: 4,
            score: 30,
          })
        }
        type="button"
      >
        emit-progress
      </button>
    </section>
  ),
}))

vi.mock('@/features/menu/MainMenu', () => ({
  MainMenu: (props: {
    onOpenTutorial: () => void
    onSelectMode: (view: 'basic-practice') => void
  }) => (
    <section>
      <button onClick={props.onOpenTutorial} type="button">
        reopen-tutorial
      </button>
      <button onClick={() => props.onSelectMode('basic-practice')} type="button">
        start-basic
      </button>
    </section>
  ),
}))

vi.mock('@/features/heatmap/HeatmapScreen', () => ({
  HeatmapScreen: (props: { trendPoints: number[] }) => {
    latestHeatmapProps = props
    return null
  },
}))

vi.mock('@/features/onboarding/OnboardingModal', () => ({
  OnboardingModal: ({ open }: { open: boolean }) =>
    open ? <div role="dialog">tutorial-open</div> : null,
}))

describe('AppShell', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockCompleteSession.mockReset()
    mockCompleteSession.mockResolvedValue(undefined)
    mockStartSession.mockReset()
    mockStartSession.mockResolvedValue(undefined)
    mockAppState = createMockAppState()
    mockTrainerState = createMockTrainerState()
    latestHeatmapProps = undefined
  })

  it('renders the default landing screen and enters the app on Enter', async () => {
    const user = userEvent.setup()
    const { AppShell } = await import('@/app/AppShell')

    mockAppState.currentView = 'landing' as AppView

    render(<AppShell />)

    expect(screen.getByTestId('landing-enter-button')).toBeInTheDocument()

    await user.keyboard('{Enter}')

    expect(mockNavigate).toHaveBeenCalledWith('menu')
  })

  it('persists the latest partial session summary when returning to menu mid-run', async () => {
    const user = userEvent.setup()
    const { AppShell } = await import('@/app/AppShell')

    render(<AppShell />)

    await user.click(screen.getByRole('button', { name: 'emit-progress' }))
    await user.click(screen.getByRole('button', { name: /返回训练模式/ }))

    await waitFor(() => {
      expect(mockCompleteSession).toHaveBeenCalledWith(
        expect.objectContaining({
          accuracy: 0.75,
          completed: false,
          keystrokes: 4,
          score: 30,
        }),
      )
    })

    expect(mockNavigate).toHaveBeenCalledWith('menu')
  })

  it('renders the tutorial when it is manually reopened after onboarding is complete', async () => {
    const { AppShell } = await import('@/app/AppShell')

    mockAppState.currentView = 'menu'
    mockAppState.tutorialOpen = true
    mockTrainerState.profile = {
      ...mockTrainerState.profile,
      onboardingComplete: true,
    }

    render(<AppShell />)

    expect(screen.getByRole('dialog')).toHaveTextContent('tutorial-open')
  })

  it('falls back to starter when the currently selected difficulty is still locked', async () => {
    const user = userEvent.setup()
    const { AppShell } = await import('@/app/AppShell')

    mockAppState.currentView = 'menu'
    mockAppState.selectedDifficulty = 'challenge'
    mockTrainerState.profile = {
      ...mockTrainerState.profile,
      unlockedDifficulties: ['starter'],
    }

    render(<AppShell />)

    await user.click(screen.getByRole('button', { name: 'start-basic' }))

    await waitFor(() => {
      expect(mockStartSession).toHaveBeenCalledWith('basic-practice', 'starter')
    })
  })

  it('builds heatmap trends from completed sessions only', async () => {
    const { AppShell } = await import('@/app/AppShell')

    mockAppState.currentView = 'heatmap'
    mockTrainerState.sessions = [
      createSession({ id: 'session-1', accuracy: 0.9, startedAt: 3 }),
      createSession({ id: 'session-2', accuracy: 0.2, completed: false, startedAt: 2 }),
      createSession({ id: 'session-3', accuracy: 0.4, startedAt: 1 }),
    ]

    render(<AppShell />)

    expect(latestHeatmapProps?.trendPoints).toEqual([0.4, 0.9])
  })
})
