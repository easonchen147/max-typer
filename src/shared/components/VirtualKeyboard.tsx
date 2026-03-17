import type { CSSProperties } from 'react'

import { KEYBOARD_ROWS } from '@/shared/constants/keyboard'

interface VirtualKeyboardProps {
  activeKey?: string
  pressedKey?: string
  wrongKey?: string
  selectedKey?: string
  onSelectKey?: (key: string) => void
  interactiveKeys?: readonly string[]
  toneByKey?: Partial<Record<string, string>>
  secondaryLabelByKey?: Partial<Record<string, string | number>>
  testIdPrefix?: string
  variant?: 'training' | 'stats' | 'hero'
}

const KEYBOARD_GRID_COLUMNS = 36

export const VirtualKeyboard = ({
  activeKey,
  pressedKey,
  wrongKey,
  selectedKey,
  onSelectKey,
  interactiveKeys,
  toneByKey,
  secondaryLabelByKey,
  testIdPrefix = 'keyboard-key',
  variant = 'training',
}: VirtualKeyboardProps) => {
  const interactiveSet = interactiveKeys ? new Set(interactiveKeys) : null
  const statsMode =
    Boolean(interactiveKeys) || Boolean(selectedKey) || Boolean(toneByKey) || Boolean(secondaryLabelByKey)

  return (
    <div className={`virtual-keyboard virtual-keyboard--${variant}`}>
      {KEYBOARD_ROWS.map((row) => (
        <div className="virtual-keyboard__row" key={row.map((key) => key.id).join('-')}>
          {row.map((key) => {
            const isInteractive = interactiveSet ? interactiveSet.has(key.id) : Boolean(onSelectKey)
            const secondaryLabel = secondaryLabelByKey?.[key.id]
            const tone = toneByKey?.[key.id]

            const state =
              wrongKey === key.id
                ? 'wrong'
                : pressedKey === key.id
                  ? 'pressed'
                  : activeKey === key.id
                    ? 'target'
                    : selectedKey === key.id
                      ? 'selected'
                      : statsMode && !key.trackable
                        ? 'inactive'
                        : 'idle'

            const style = {
              gridColumn: `span ${Math.min(KEYBOARD_GRID_COLUMNS, key.span)}`,
              ...(tone ? { '--key-accent': tone } : {}),
            } as CSSProperties

            return (
              <button
                className="virtual-keyboard__key"
                data-state={state}
                data-testid={`${testIdPrefix}-${key.id}`}
                data-trackable={key.trackable}
                disabled={statsMode && !key.trackable}
                key={key.id}
                onClick={() => {
                  if (isInteractive) {
                    onSelectKey?.(key.id)
                  }
                }}
                style={style}
                type="button"
              >
                <span className="virtual-keyboard__label">{key.label}</span>
                {secondaryLabel !== undefined && (
                  <small className="virtual-keyboard__meta">{secondaryLabel}</small>
                )}
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}
