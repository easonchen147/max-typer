import { render, screen, waitFor } from '@testing-library/react'
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { buildKeyboardSnapshot } from '@/shared/services/statsAggregator'

let latestSceneCallbacks:
  | {
      onStroke: (event: {
        expected: string
        input: string
        correct: boolean
        reactionMs: number
        score: number
      }) => void
      onStatusChange: (status: {
        title: string
        detail: string
        tone: 'pace' | 'warning' | 'boss'
      }) => void
      onComplete: (payload: { destroyed: number; score: number; bossDefeated: boolean }) => void
    }
  | undefined

vi.mock('phaser', () => ({
  default: {
    AUTO: 'AUTO',
    Game: class {
      public destroy() {}
    },
  },
}))

vi.mock('@/phaser/audio/feedbackSynth', () => ({
  playFeedbackTone: vi.fn(),
}))

vi.mock('@/features/space-invaders/SpaceInvadersScene', () => ({
  SpaceInvadersScene: class {
    public constructor(callbacks: typeof latestSceneCallbacks) {
      latestSceneCallbacks = callbacks
    }

    public handleKey() {}

    public finishEarly() {}
  },
}))

describe('SpaceInvadersGame', () => {
  const words = [
    { value: 'cat', difficulty: 'starter' as const, tags: ['elementary'] },
    { value: 'pencil', difficulty: 'standard' as const, tags: ['elementary'] },
    { value: 'playground', difficulty: 'challenge' as const, tags: ['elementary'] },
  ]

  it('reports live session progress from the current wave state', async () => {
    const onProgress = vi.fn()

    const { SpaceInvadersGame } = await import('@/features/space-invaders/SpaceInvadersGame')

    render(
      <SpaceInvadersGame
        difficulty="starter"
        onComplete={vi.fn()}
        onProgress={onProgress}
        onRecord={vi.fn()}
        snapshot={buildKeyboardSnapshot()}
        words={words}
      />,
    )

    expect(onProgress).toHaveBeenLastCalledWith({
      accuracy: 0,
      keystrokes: 0,
      score: 0,
    })

    act(() => {
      latestSceneCallbacks?.onStroke({
        expected: 'c',
        input: 'c',
        correct: true,
        reactionMs: 90,
        score: 35,
      })
    })

    await waitFor(() => {
      expect(onProgress).toHaveBeenLastCalledWith({
        accuracy: 1,
        keystrokes: 1,
        score: 35,
      })
    })
  })

  it('renders encounter pacing hints from the scene status callback', async () => {
    const { SpaceInvadersGame } = await import('@/features/space-invaders/SpaceInvadersGame')

    render(
      <SpaceInvadersGame
        difficulty="starter"
        onComplete={vi.fn()}
        onRecord={vi.fn()}
        snapshot={buildKeyboardSnapshot()}
        words={words}
      />,
    )

    act(() => {
      latestSceneCallbacks?.onStatusChange({
        title: 'Boss 前过渡波',
        detail: '清掉当前敌机后，Boss 就会登场。',
        tone: 'warning',
      })
    })

    expect(screen.getByText('Boss 前过渡波')).toBeInTheDocument()
    expect(screen.getByText('清掉当前敌机后，Boss 就会登场。')).toBeInTheDocument()
  })

  it('does not finish a timed session when the scene reports early completion', async () => {
    const onComplete = vi.fn()

    const { SpaceInvadersGame } = await import('@/features/space-invaders/SpaceInvadersGame')

    render(
      <SpaceInvadersGame
        difficulty="starter"
        durationSeconds={30}
        onComplete={onComplete}
        onRecord={vi.fn()}
        snapshot={buildKeyboardSnapshot()}
        words={words}
      />,
    )

    act(() => {
      latestSceneCallbacks?.onComplete({
        destroyed: 2,
        score: 70,
        bossDefeated: false,
      })
    })

    await waitFor(() => {
      expect(onComplete).not.toHaveBeenCalled()
    })
  })

  it('finishes unlimited sessions when the scene completes naturally', async () => {
    const onComplete = vi.fn()

    const { SpaceInvadersGame } = await import('@/features/space-invaders/SpaceInvadersGame')

    render(
      <SpaceInvadersGame
        difficulty="starter"
        onComplete={onComplete}
        onRecord={vi.fn()}
        snapshot={buildKeyboardSnapshot()}
        words={words}
      />,
    )

    act(() => {
      latestSceneCallbacks?.onStroke({
        expected: 'c',
        input: 'c',
        correct: true,
        reactionMs: 90,
        score: 35,
      })
      latestSceneCallbacks?.onComplete({
        destroyed: 1,
        score: 35,
        bossDefeated: false,
      })
    })

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          attempts: 1,
          correct: 1,
          accuracy: 1,
          score: 35,
        }),
      )
    })
  })
})
