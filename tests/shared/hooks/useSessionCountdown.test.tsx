import { renderHook } from '@testing-library/react'
import { act } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { useSessionCountdown } from '@/shared/hooks/useSessionCountdown'

describe('useSessionCountdown', () => {
  it('counts down and expires exactly once for timed sessions', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-16T00:00:00.000Z'))

    const onExpire = vi.fn()
    const { result } = renderHook(() =>
      useSessionCountdown({
        durationSeconds: 3,
        onExpire,
      }),
    )

    expect(result.current.timerLabel).toBe('0:03')

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    expect(result.current.timerLabel).toBe('0:02')

    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(result.current.timerLabel).toBe('0:00')
    expect(onExpire).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })

  it('stays untimed when duration is unlimited', () => {
    const onExpire = vi.fn()
    const { result } = renderHook(() =>
      useSessionCountdown({
        durationSeconds: null,
        onExpire,
      }),
    )

    expect(result.current.timed).toBe(false)
    expect(result.current.timerLabel).toBe('不限时')
    expect(onExpire).not.toHaveBeenCalled()
  })
})
