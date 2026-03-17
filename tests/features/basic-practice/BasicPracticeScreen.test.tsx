import { fireEvent, render, screen } from '@testing-library/react'
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { BasicPracticeScreen } from '@/features/basic-practice/BasicPracticeScreen'
import { PROMPT_WAIT_TIMEOUT_MS } from '@/shared/constants/session'

describe('BasicPracticeScreen', () => {
  it('advances on correct input and completes the session', () => {
    const onRecord = vi.fn()
    const onComplete = vi.fn()

    render(
      <BasicPracticeScreen
        difficulty="starter"
        onComplete={onComplete}
        onRecord={onRecord}
        targets={['a', 'b']}
      />,
    )

    expect(screen.getByText('a')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'a', code: 'KeyA' })
    fireEvent.keyDown(window, { key: 'b', code: 'KeyB' })

    expect(onRecord).toHaveBeenCalledTimes(2)
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        attempts: 2,
        correct: 2,
        accuracy: 1,
      }),
    )
  })

  it('keeps the target highlighted and marks the wrong physical punctuation key', () => {
    const onRecord = vi.fn()

    render(
      <BasicPracticeScreen
        difficulty="starter"
        onComplete={vi.fn()}
        onRecord={onRecord}
        targets={['m']}
      />,
    )

    fireEvent.keyDown(window, { key: ';', code: 'Semicolon' })

    expect(screen.getByTestId('keyboard-key-m')).toHaveAttribute('data-state', 'target')
    expect(screen.getByTestId('keyboard-key-;')).toHaveAttribute('data-state', 'wrong')
    expect(onRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        expected: 'm',
        input: ';',
        correct: false,
      }),
    )
  })

  it('reports live session progress as attempts accumulate', () => {
    const onProgress = vi.fn()

    render(
      <BasicPracticeScreen
        difficulty="starter"
        onComplete={vi.fn()}
        onProgress={onProgress}
        onRecord={vi.fn()}
        targets={['m', 'n']}
      />,
    )

    expect(onProgress).toHaveBeenLastCalledWith({
      accuracy: 0,
      keystrokes: 0,
      score: 0,
    })

    fireEvent.keyDown(window, { key: 'x', code: 'KeyX' })

    expect(onProgress).toHaveBeenLastCalledWith({
      accuracy: 0,
      keystrokes: 1,
      score: 0,
    })

    fireEvent.keyDown(window, { key: 'm', code: 'KeyM' })

    expect(onProgress).toHaveBeenLastCalledWith({
      accuracy: 0.5,
      keystrokes: 2,
      score: 10,
    })
  })

  it('completes with current stats when the timer expires', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-16T00:00:00.000Z'))

    const onComplete = vi.fn()

    render(
      <BasicPracticeScreen
        difficulty="starter"
        durationSeconds={1}
        onComplete={onComplete}
        onRecord={vi.fn()}
        targets={['m']}
      />,
    )

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(onComplete).toHaveBeenCalledWith({
      attempts: 0,
      correct: 0,
      accuracy: 0,
    })

    vi.useRealTimers()
  })

  it('records a timeout miss and advances to the next prompt', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-16T00:00:00.000Z'))

    const onRecord = vi.fn()

    render(
      <BasicPracticeScreen
        difficulty="starter"
        durationSeconds={20}
        onComplete={vi.fn()}
        onRecord={onRecord}
        targets={['a', 'b']}
      />,
    )

    act(() => {
      vi.advanceTimersByTime(PROMPT_WAIT_TIMEOUT_MS + 25)
    })

    expect(onRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        expected: 'a',
        input: '',
        correct: false,
      }),
    )
    expect(screen.getByLabelText('b')).toBeInTheDocument()
    expect(screen.getByTestId('keyboard-key-b')).toHaveAttribute('data-state', 'target')

    vi.useRealTimers()
  })

  it('keeps timed sessions running until the countdown ends even after the queue is cleared', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-16T00:00:00.000Z'))

    const onComplete = vi.fn()

    render(
      <BasicPracticeScreen
        difficulty="starter"
        durationSeconds={1}
        onComplete={onComplete}
        onRecord={vi.fn()}
        targets={['a']}
      />,
    )

    fireEvent.keyDown(window, { key: 'a', code: 'KeyA' })

    expect(onComplete).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(onComplete).toHaveBeenCalledWith({
      attempts: 1,
      correct: 1,
      accuracy: 1,
    })

    vi.useRealTimers()
  })

  it('shows the finger coach for the current target key', () => {
    render(
      <BasicPracticeScreen
        difficulty="starter"
        onComplete={vi.fn()}
        onRecord={vi.fn()}
        targets={['f']}
      />,
    )

    expect(screen.getByText(/建议手指/)).toBeInTheDocument()
    expect(screen.getByText(/左手食指/)).toBeInTheDocument()
  })
})
