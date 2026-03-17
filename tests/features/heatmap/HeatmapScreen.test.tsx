import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { HeatmapScreen } from '@/features/heatmap/HeatmapScreen'
import type { KeyboardSnapshot } from '@/shared/types/domain'
import type { ComponentProps } from 'react'

const snapshot = Object.fromEntries(
  'abcdefghijklmnopqrstuvwxyz'.split('').map((letter) => [
    letter,
    {
      letter,
      attempts: letter === 'a' ? 15 : 4,
      correct: letter === 'a' ? 12 : 3,
      accuracy: letter === 'a' ? 0.8 : 0.75,
      averageReactionMs: letter === 'a' ? 340 : 410,
      bestStreak: letter === 'a' ? 5 : 2,
      level: letter === 'a' ? 3 : 1,
    },
  ]),
) as KeyboardSnapshot

const createHeatmapProps = (
  overrides: Partial<ComponentProps<typeof HeatmapScreen>> = {},
): ComponentProps<typeof HeatmapScreen> => ({
  achievements: ['arcade-explorer'],
  colorblindMode: false,
  dailyGoalLabel: '今日小目标 2 / 3',
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
      currentRatio: 0.38,
      requiredRatio: 0.5,
      minimumLevel: 2,
      currentCount: 10,
      requiredCount: 13,
    },
    {
      id: 'challenge',
      title: '王牌',
      unlocked: false,
      currentRatio: 0.12,
      requiredRatio: 0.8,
      minimumLevel: 4,
      currentCount: 3,
      requiredCount: 21,
    },
  ],
  masteredCount: 11,
  nextUnlockLabel: 'unlock standard 6 / 80%',
  onExport: vi.fn(),
  onPracticeKey: vi.fn(),
  onReset: vi.fn(),
  progressLabel: 'data ready',
  recommendations: ['a', 's', 'd'],
  snapshot,
  todayFocusLabel: '今日优先键位由最近弱项和日期动态生成',
  totalSessions: 7,
  trendPoints: [0.4, 0.6, 0.75, 0.8],
  ...overrides,
})

describe('HeatmapScreen', () => {
  it('shows the full keyboard shell but keeps non-letter keys non-interactive', () => {
    render(<HeatmapScreen {...createHeatmapProps()} />)

    expect(screen.getByTestId('heatmap-key-a')).toBeInTheDocument()
    expect(screen.getByTestId('heatmap-key-enter')).toBeDisabled()
  })

  it('exports and resets data from the action bar', async () => {
    const user = userEvent.setup()
    const onExport = vi.fn()
    const onReset = vi.fn()

    render(
      <HeatmapScreen
        {...createHeatmapProps({
          colorblindMode: true,
          onExport,
          onReset,
          progressLabel: 'colorblind mode enabled',
        })}
      />,
    )

    await user.click(screen.getByTestId('export-data'))
    await user.click(screen.getByTestId('reset-data'))

    expect(onExport).toHaveBeenCalled()
    expect(onReset).toHaveBeenCalled()
  })

  it('starts focused practice from the selected key and recommendations', async () => {
    const user = userEvent.setup()
    const onPracticeKey = vi.fn()

    render(
      <HeatmapScreen
        {...createHeatmapProps({
          onPracticeKey,
          progressLabel: 'tap to drill',
        })}
      />,
    )

    await user.click(screen.getByTestId('practice-selected-a'))
    await user.click(screen.getByTestId('practice-recommendation-s'))

    expect(onPracticeKey).toHaveBeenNthCalledWith(1, 'a')
    expect(onPracticeKey).toHaveBeenNthCalledWith(2, 's')
  })

  it('shows unlock progress, trend visualization, and finger coach details', () => {
    render(<HeatmapScreen {...createHeatmapProps()} />)

    expect(screen.getByText(/10 \/ 13/)).toBeInTheDocument()
    expect(screen.getByText(/今日优先键位由最近弱项和日期动态生成/)).toBeInTheDocument()
    expect(screen.getByTestId('trend-chart')).toBeInTheDocument()
    expect(screen.getByText(/建议手指/)).toBeInTheDocument()
  })
})
