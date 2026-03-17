import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { MainMenu } from '@/features/menu/MainMenu'
import { OnboardingModal } from '@/features/onboarding/OnboardingModal'
import type { ComponentProps } from 'react'

const createMainMenuProps = (
  overrides: Partial<ComponentProps<typeof MainMenu>> = {},
): ComponentProps<typeof MainMenu> => ({
  achievements: 3,
  colorblindMode: false,
  dailyGoalLabel: '今日小目标 1 / 3',
  difficultyProgress: [
    {
      id: 'starter',
      title: '启程',
      unlocked: true,
      currentRatio: 1,
      requiredRatio: 0,
      minimumLevel: 0,
      currentCount: 26,
      requiredCount: 0,
    },
    {
      id: 'standard',
      title: '巡航',
      unlocked: false,
      currentRatio: 0.35,
      requiredRatio: 0.5,
      minimumLevel: 2,
      currentCount: 9,
      requiredCount: 13,
    },
    {
      id: 'challenge',
      title: '王牌',
      unlocked: false,
      currentRatio: 0.1,
      requiredRatio: 0.8,
      minimumLevel: 4,
      currentCount: 3,
      requiredCount: 21,
    },
  ],
  focusLetters: ['a', 's', 'd'],
  masteredCount: 12,
  onOpenDataCenter: vi.fn(),
  onOpenTutorial: vi.fn(),
  onSelectDifficulty: vi.fn(),
  onSelectDurationPreset: vi.fn(),
  onSelectWordBank: vi.fn(),
  onSelectMode: vi.fn(),
  onStartRecommended: vi.fn(),
  onToggleColorblind: vi.fn(),
  onToggleSound: vi.fn(),
  progressLabel: '22 / 26 keys mastered',
  recommendedLabel: '先完成一轮推荐训练，再去个人数据页查看薄弱键位。',
  recommendedMode: 'fruit-ninja',
  selectedDifficulty: 'starter',
  selectedDurationPreset: '5-min',
  selectedWordBankId: 'elementary',
  soundEnabled: true,
  todayFocusLabel: '今日优先键位会根据弱项和日期动态更新',
  totalSessions: 8,
  unlockedDifficulties: ['starter'],
  unlockedModes: ['basic-practice', 'heatmap', 'fruit-ninja', 'space-invaders'],
  ...overrides,
})

describe('MainMenu', () => {
  it('renders only the three training modes and keeps personal data out of the mode grid', () => {
    render(<MainMenu {...createMainMenuProps()} />)

    expect(screen.getAllByTestId(/mode-card-/)).toHaveLength(3)
    expect(screen.queryByTestId('mode-card-heatmap')).not.toBeInTheDocument()
  })

  it('navigates to a selected module and exposes progress state', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <MainMenu
        {...createMainMenuProps({
          onSelectMode: onSelect,
          progressLabel: '22 / 26 mastered',
        })}
      />,
    )

    await user.click(screen.getByTestId('mode-card-fruit-ninja'))

    expect(screen.getByText('22 / 26 mastered')).toBeInTheDocument()
    expect(onSelect).toHaveBeenCalledWith('fruit-ninja')
  })

  it('exposes the recommended flow entry points', async () => {
    const user = userEvent.setup()
    const onStartRecommended = vi.fn()
    const onOpenDataCenter = vi.fn()

    render(
      <MainMenu
        {...createMainMenuProps({
          onOpenDataCenter,
          onStartRecommended,
        })}
      />,
    )

    await user.click(screen.getByTestId('start-recommended'))
    await user.click(screen.getByTestId('open-data-center'))

    expect(onStartRecommended).toHaveBeenCalledTimes(1)
    expect(onOpenDataCenter).toHaveBeenCalledTimes(1)
  })

  it('allows selecting a session duration preset', async () => {
    const user = userEvent.setup()
    const onSelectDurationPreset = vi.fn()

    render(
      <MainMenu
        {...createMainMenuProps({
          onSelectDurationPreset,
          progressLabel: 'training ready',
          selectedDurationPreset: '5-min',
          unlockedModes: ['basic-practice', 'heatmap'],
        })}
      />,
    )

    await user.click(screen.getByTestId('duration-preset-10-min'))

    expect(onSelectDurationPreset).toHaveBeenCalledWith('10-min')
  })

  it('allows selecting a vocabulary bank for word-based modes', async () => {
    const user = userEvent.setup()
    const onSelectWordBank = vi.fn()

    render(
      <MainMenu
        {...createMainMenuProps({
          onSelectWordBank,
          selectedWordBankId: 'elementary',
        })}
      />,
    )

    await user.click(screen.getByTestId('word-bank-cet4'))

    expect(onSelectWordBank).toHaveBeenCalledWith('cet4')
  })

  it('keeps locked difficulties disabled until mastery unlocks them', async () => {
    const user = userEvent.setup()
    const onSelectDifficulty = vi.fn()

    render(
      <MainMenu
        {...createMainMenuProps({
          achievements: 1,
          onSelectDifficulty,
          progressLabel: 'continue training',
          selectedDifficulty: 'starter',
          unlockedModes: ['basic-practice', 'heatmap'],
        })}
      />,
    )

    const standardButton = screen.getByTestId('difficulty-standard')
    const challengeButton = screen.getByTestId('difficulty-challenge')

    expect(standardButton).toBeDisabled()
    expect(challengeButton).toBeDisabled()
    expect(screen.getByText(/9 \/ 13/)).toBeInTheDocument()

    await user.click(challengeButton)

    expect(onSelectDifficulty).not.toHaveBeenCalled()
  })

  it('supports skipping and retriggering onboarding', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    const { rerender } = render(<OnboardingModal open={true} onClose={onClose} />)

    await user.click(screen.getByTestId('onboarding-skip'))
    expect(onClose).toHaveBeenCalled()

    rerender(<OnboardingModal open={true} onClose={onClose} />)

    expect(screen.getByTestId('onboarding-title')).toBeInTheDocument()
  })
})
