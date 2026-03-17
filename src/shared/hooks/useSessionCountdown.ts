import { useEffect, useMemo, useRef, useState } from 'react'

import { formatSessionClock } from '@/shared/constants/session'

interface UseSessionCountdownOptions {
  durationSeconds: number | null
  enabled?: boolean
  onExpire: () => void
}

export const useSessionCountdown = ({
  durationSeconds,
  enabled = true,
  onExpire,
}: UseSessionCountdownOptions) => {
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(durationSeconds)
  const onExpireRef = useRef(onExpire)
  const expiredRef = useRef(false)

  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    if (!enabled || durationSeconds === null) {
      return
    }

    expiredRef.current = false
    const deadline = Date.now() + durationSeconds * 1000

    const tick = () => {
      const nextRemaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setRemainingSeconds(nextRemaining)

      if (nextRemaining === 0 && !expiredRef.current) {
        expiredRef.current = true
        onExpireRef.current()
      }
    }

    tick()

    const timerId = window.setInterval(tick, 250)

    return () => {
      window.clearInterval(timerId)
    }
  }, [durationSeconds, enabled])

  const timerLabel = useMemo(() => {
    if (durationSeconds === null) {
      return '不限时'
    }

    return formatSessionClock(remainingSeconds ?? durationSeconds)
  }, [durationSeconds, remainingSeconds])

  return {
    remainingSeconds,
    timerLabel,
    timed: durationSeconds !== null,
  }
}
