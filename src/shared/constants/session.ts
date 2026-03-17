import type { SessionDurationPreset } from '@/shared/types/domain'

export const PROMPT_WAIT_TIMEOUT_MS = 7_000

export const SESSION_DURATION_OPTIONS = [
  { id: '3-min', label: '3 分钟', seconds: 180 },
  { id: '5-min', label: '5 分钟', seconds: 300 },
  { id: '10-min', label: '10 分钟', seconds: 600 },
  { id: 'unlimited', label: '不限时', seconds: null },
] as const satisfies ReadonlyArray<{
  id: SessionDurationPreset
  label: string
  seconds: number | null
}>

export const SESSION_DURATION_SECONDS: Record<SessionDurationPreset, number | null> = {
  '3-min': 180,
  '5-min': 300,
  '10-min': 600,
  unlimited: null,
}

export const SESSION_DURATION_LABELS: Record<SessionDurationPreset, string> = {
  '3-min': '3 分钟',
  '5-min': '5 分钟',
  '10-min': '10 分钟',
  unlimited: '不限时',
}

export const getSessionDurationSeconds = (preset: SessionDurationPreset) =>
  SESSION_DURATION_SECONDS[preset]

export const formatSessionClock = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60

  return `${minutes}:${String(seconds).padStart(2, '0')}`
}
