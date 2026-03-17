import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { VirtualKeyboard } from '@/shared/components/VirtualKeyboard'

describe('VirtualKeyboard', () => {
  it('renders the complete main keyboard area including function and punctuation keys', () => {
    render(<VirtualKeyboard />)

    expect(screen.getByTestId('keyboard-key-esc')).toBeInTheDocument()
    expect(screen.getByTestId('keyboard-key-f12')).toBeInTheDocument()
    expect(screen.getByTestId('keyboard-key-1')).toBeInTheDocument()
    expect(screen.getByTestId('keyboard-key-backspace')).toBeInTheDocument()
    expect(screen.getByTestId('keyboard-key-tab')).toBeInTheDocument()
    expect(screen.getByTestId('keyboard-key-;')).toBeInTheDocument()
    expect(screen.getByTestId('keyboard-key-enter')).toBeInTheDocument()
    expect(screen.getByTestId('keyboard-key-shift-right')).toBeInTheDocument()
    expect(screen.getByTestId('keyboard-key-space')).toBeInTheDocument()
  })

  it('renders target, correct, and wrong key states on the shared keyboard shell', () => {
    render(<VirtualKeyboard activeKey="x" pressedKey="x" wrongKey="a" />)

    expect(screen.getByTestId('keyboard-key-x')).toHaveAttribute('data-state', 'pressed')
    expect(screen.getByTestId('keyboard-key-a')).toHaveAttribute('data-state', 'wrong')
    expect(screen.getByTestId('keyboard-key-enter')).toHaveAttribute('data-state', 'idle')
  })
})
