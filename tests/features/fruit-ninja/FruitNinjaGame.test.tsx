import { render, waitFor } from '@testing-library/react'
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { buildKeyboardSnapshot } from '@/shared/services/statsAggregator'

let latestSceneConfig:
  | {
      onEvent: (event: {
        kind: 'fruit' | 'bomb' | 'miss'
        expected: string
        input: string
        reactionMs: number
      }) => void
      onComplete: () => void
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

vi.mock('@/features/fruit-ninja/FruitNinjaScene', () => ({
  FruitNinjaScene: class {
    public constructor(config: typeof latestSceneConfig) {
      latestSceneConfig = config
    }

    public handleKey() {}

    public finishEarly() {}
  },
}))

describe('FruitNinjaGame', () => {
  it('reports live session progress from the current arcade state', async () => {
    const onProgress = vi.fn()

    const { FruitNinjaGame } = await import('@/features/fruit-ninja/FruitNinjaGame')

    render(
      <FruitNinjaGame
        difficulty="starter"
        onComplete={vi.fn()}
        onProgress={onProgress}
        onRecord={vi.fn()}
        snapshot={buildKeyboardSnapshot()}
      />,
    )

    expect(onProgress).toHaveBeenLastCalledWith({
      accuracy: 0,
      keystrokes: 0,
      score: 0,
    })

    act(() => {
      latestSceneConfig?.onEvent({
        kind: 'fruit',
        expected: 'j',
        input: 'j',
        reactionMs: 120,
      })
    })

    await waitFor(() => {
      expect(onProgress).toHaveBeenLastCalledWith({
        accuracy: 1,
        keystrokes: 1,
        score: 18,
      })
    })
  })

  it('does not finish a timed session when the scene reports natural completion early', async () => {
    const onComplete = vi.fn()

    const { FruitNinjaGame } = await import('@/features/fruit-ninja/FruitNinjaGame')

    render(
      <FruitNinjaGame
        difficulty="starter"
        durationSeconds={30}
        onComplete={onComplete}
        onRecord={vi.fn()}
        snapshot={buildKeyboardSnapshot()}
      />,
    )

    act(() => {
      latestSceneConfig?.onComplete()
    })

    await waitFor(() => {
      expect(onComplete).not.toHaveBeenCalled()
    })
  })

  it('finishes unlimited sessions when the scene completes naturally', async () => {
    const onComplete = vi.fn()

    const { FruitNinjaGame } = await import('@/features/fruit-ninja/FruitNinjaGame')

    render(
      <FruitNinjaGame
        difficulty="starter"
        onComplete={onComplete}
        onRecord={vi.fn()}
        snapshot={buildKeyboardSnapshot()}
      />,
    )

    act(() => {
      latestSceneConfig?.onEvent({
        kind: 'fruit',
        expected: 'j',
        input: 'j',
        reactionMs: 120,
      })
      latestSceneConfig?.onComplete()
    })

    await waitFor(() => {
      expect(onComplete).toHaveBeenCalledWith(
        expect.objectContaining({
          attempts: 1,
          correct: 1,
          accuracy: 1,
        }),
      )
    })
  })
})
