import { useEffect } from 'react'

import { MAIN_KEYBOARD_KEY_IDS, normalizeKeyboardEvent } from '@/shared/constants/keyboard'

interface KeyboardOptions {
  enabled?: boolean
  onKey: (key: string) => void
}

export const useKeyboard = ({ enabled = true, onKey }: KeyboardOptions) => {
  useEffect(() => {
    if (!enabled) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const normalized = normalizeKeyboardEvent(event)

      if (!normalized) {
        return
      }

      if (!MAIN_KEYBOARD_KEY_IDS.has(normalized)) {
        return
      }

      onKey(normalized)
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, onKey])
}
