import { useMemo, useState } from 'react'

import { VirtualKeyboard } from '@/shared/components/VirtualKeyboard'
import { LETTER_ORDER } from '@/shared/constants/keyboard'
import { getFingerGuide } from '@/shared/services/fingerGuide'
import type { DifficultyProgress, KeyboardSnapshot } from '@/shared/types/domain'

interface HeatmapScreenProps {
  snapshot: KeyboardSnapshot
  recommendations: string[]
  trendPoints: number[]
  progressLabel: string
  achievements: string[]
  colorblindMode: boolean
  masteredCount: number
  totalSessions: number
  nextUnlockLabel: string
  difficultyProgress: DifficultyProgress[]
  dailyGoalLabel: string
  todayFocusLabel: string
  onExport: () => void
  onReset: () => void
  onPracticeKey: (letter: string) => void
}

const getKeyColor = (level: number, colorblindMode: boolean) => {
  const palette = colorblindMode
    ? ['#d6dde8', '#93b7d8', '#3d7fb0', '#ffd166', '#f28f3b', '#18324a']
    : ['#dce7f5', '#b7d8ff', '#6bb7d6', '#4fd2ad', '#ffb25b', '#f46d43']

  return palette[level] ?? palette[0]
}

const getLetterStatus = (level: number) => {
  if (level >= 4) {
    return '强项区'
  }

  if (level >= 2) {
    return '稳定推进'
  }

  return '待加强'
}

const buildTrendGeometry = (points: number[]) => {
  const width = 320
  const height = 148
  const normalizedPoints = points.length > 0 ? points : [0.25, 0.4, 0.55, 0.65]

  if (normalizedPoints.length === 1) {
    const y = height - normalizedPoints[0] * height
    return {
      width,
      height,
      linePath: `M 0 ${y} L ${width} ${y}`,
      areaPath: `M 0 ${height} L 0 ${y} L ${width} ${y} L ${width} ${height} Z`,
      nodes: [{ id: 'trend-0', x: width / 2, y, value: normalizedPoints[0] }],
    }
  }

  const nodes = normalizedPoints.map((value, index) => ({
    id: `trend-${index}`,
    x: (width / Math.max(1, normalizedPoints.length - 1)) * index,
    y: height - value * height,
    value,
  }))

  const linePath = nodes
    .map((node, index) => `${index === 0 ? 'M' : 'L'} ${node.x} ${node.y}`)
    .join(' ')
  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`

  return {
    width,
    height,
    linePath,
    areaPath,
    nodes,
  }
}

export const HeatmapScreen = ({
  achievements,
  colorblindMode,
  dailyGoalLabel,
  difficultyProgress,
  masteredCount,
  nextUnlockLabel,
  onExport,
  onPracticeKey,
  onReset,
  progressLabel,
  recommendations,
  snapshot,
  todayFocusLabel,
  totalSessions,
  trendPoints,
}: HeatmapScreenProps) => {
  const [selectedKey, setSelectedKey] = useState('a')
  const selectedStats = snapshot[selectedKey]
  const selectedStatus = getLetterStatus(selectedStats.level)
  const fingerGuide = getFingerGuide(selectedKey)
  const weaknessHeadline =
    recommendations.length > 0
      ? recommendations
          .slice(0, 3)
          .map((letter) => letter.toUpperCase())
          .join(' / ')
      : '先完成一轮训练，系统会生成待加强键位'

  const trendChart = useMemo(() => buildTrendGeometry(trendPoints), [trendPoints])

  const toneByKey = useMemo(
    () =>
      Object.fromEntries(
        LETTER_ORDER.map((letter) => [
          letter,
          getKeyColor(snapshot[letter]?.level ?? 0, colorblindMode),
        ]),
      ),
    [colorblindMode, snapshot],
  )

  const secondaryLabelByKey = useMemo(
    () =>
      Object.fromEntries(
        LETTER_ORDER.map((letter) => [letter, `L${snapshot[letter]?.level ?? 0}`]),
      ),
    [snapshot],
  )

  return (
    <section className="heatmap-screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">个人数据</p>
          <h2>把诊断、目标和专项训练放在同一张学习地图上。</h2>
          <p>{progressLabel}</p>
        </div>

        <div className="heatmap-screen__actions">
          <button className="toolbar-toggle" data-testid="export-data" onClick={onExport} type="button">
            导出数据
          </button>
          <button
            className="toolbar-toggle toolbar-toggle--ghost"
            data-testid="reset-data"
            onClick={onReset}
            type="button"
          >
            重置记录
          </button>
        </div>
      </header>

      <section className="heatmap-overview" data-testid="heatmap-overview">
        <article className="detail-card">
          <p className="eyebrow">总体进度</p>
          <h3>{masteredCount} / 26 已熟练</h3>
          <p>累计完成 {totalSessions} 场训练，系统会继续围绕薄弱键位安排练习。</p>
        </article>

        <article className="detail-card">
          <p className="eyebrow">难度解锁</p>
          <h3>{nextUnlockLabel}</h3>
          <div className="unlock-progress-list">
            {difficultyProgress.map((entry) => (
              <div className="unlock-progress" data-unlocked={entry.unlocked} key={entry.id}>
                <div className="unlock-progress__header">
                  <strong>{entry.title}</strong>
                  <span>
                    {entry.currentCount} / {Math.max(1, entry.requiredCount)}
                  </span>
                </div>
                <div className="unlock-progress__track">
                  <span
                    className="unlock-progress__fill"
                    style={{
                      width: `${Math.min(
                        100,
                        entry.requiredRatio === 0
                          ? 100
                          : (entry.currentRatio / entry.requiredRatio) * 100,
                      )}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="detail-card">
          <p className="eyebrow">今日计划</p>
          <h3>{dailyGoalLabel}</h3>
          <p>{todayFocusLabel}</p>
          <div className="focus-drill-list">
            {recommendations.slice(0, 5).map((letter) => (
              <button
                className="focus-drill-list__button"
                key={`overview-${letter}`}
                onClick={() => onPracticeKey(letter)}
                type="button"
              >
                练习 {letter.toUpperCase()}
              </button>
            ))}
          </div>
        </article>
      </section>

      <div className="heatmap-screen__layout">
        <article className="heatmap-board" data-testid="heatmap-keyboard-section">
          <div className="heatmap-board__header">
            <div>
              <p className="eyebrow">键盘地图</p>
              <p className="heatmap-board__hint">点击任意字母查看状态，颜色越深代表越稳定。</p>
            </div>
            <div className="heatmap-legend">
              <span>冷启动</span>
              <span>待加强</span>
              <span>稳定</span>
              <span>熟练</span>
            </div>
          </div>

          <VirtualKeyboard
            interactiveKeys={LETTER_ORDER}
            onSelectKey={setSelectedKey}
            secondaryLabelByKey={secondaryLabelByKey}
            selectedKey={selectedKey}
            testIdPrefix="heatmap-key"
            toneByKey={toneByKey}
            variant="stats"
          />
        </article>

        <div className="heatmap-insights-grid" data-testid="heatmap-insights-grid">
          <section
            className="detail-card detail-card--emphasis"
            data-testid="heatmap-card-weakness"
          >
            <p className="eyebrow">待加强</p>
            <h3>{weaknessHeadline}</h3>
            <p>
              当前查看 {selectedKey.toUpperCase()}：命中率 {Math.round(selectedStats.accuracy * 100)}
              %，平均反应 {Math.round(selectedStats.averageReactionMs)}ms。
            </p>

            <div className="detail-card__stat-grid">
              <div>
                <span>当前状态</span>
                <strong>
                  L{selectedStats.level} · {selectedStatus}
                </strong>
              </div>
              <div>
                <span>最佳连击</span>
                <strong>{selectedStats.bestStreak}</strong>
              </div>
              <div>
                <span>累计尝试</span>
                <strong>{selectedStats.attempts}</strong>
              </div>
              <div>
                <span>累计命中</span>
                <strong>{selectedStats.correct}</strong>
              </div>
            </div>

            {fingerGuide ? (
              <div className="finger-coach-card">
                <p className="eyebrow">建议手指</p>
                <strong>
                  {fingerGuide.hand}
                  {fingerGuide.finger}
                </strong>
                <span>回位键：{fingerGuide.anchorKey}</span>
                <span>{fingerGuide.hint}</span>
              </div>
            ) : null}

            <button
              className="toolbar-toggle"
              data-testid={`practice-selected-${selectedKey}`}
              onClick={() => onPracticeKey(selectedKey)}
              type="button"
            >
              立即专项练习
            </button>
          </section>

          <section className="detail-card" data-testid="heatmap-card-recommendations">
            <p className="eyebrow">推荐加强</p>
            <p>把最慢、最不稳的键位按顺序拉回训练主循环。</p>
            <div className="focus-drill-list">
              {recommendations.map((letter) => (
                <button
                  className="focus-drill-list__button"
                  data-testid={`practice-recommendation-${letter}`}
                  key={letter}
                  onClick={() => onPracticeKey(letter)}
                  type="button"
                >
                  练习 {letter.toUpperCase()}
                </button>
              ))}
            </div>
          </section>

          <section className="detail-card" data-testid="heatmap-card-trend">
            <p className="eyebrow">最近趋势</p>
            <div className="trend-chart" data-testid="trend-chart">
              <svg
                aria-label="最近训练趋势图"
                className="trend-chart__svg"
                viewBox={`0 0 ${trendChart.width} ${trendChart.height}`}
              >
                <defs>
                  <linearGradient id="trend-fill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgba(41,95,166,0.32)" />
                    <stop offset="100%" stopColor="rgba(41,95,166,0.02)" />
                  </linearGradient>
                </defs>
                <path className="trend-chart__area" d={trendChart.areaPath} fill="url(#trend-fill)" />
                <path className="trend-chart__line" d={trendChart.linePath} fill="none" />
                {trendChart.nodes.map((node) => (
                  <g key={node.id}>
                    <circle className="trend-chart__node" cx={node.x} cy={node.y} r="5" />
                  </g>
                ))}
              </svg>
              <div className="trend-chart__labels">
                {trendChart.nodes.map((node, index) => (
                  <span key={node.id}>
                    第 {index + 1} 次 · {Math.round(node.value * 100)}%
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="detail-card" data-testid="heatmap-card-achievements">
            <p className="eyebrow">已获成就</p>
            {achievements.length > 0 ? (
              <ul className="achievement-list">
                {achievements.map((achievement) => (
                  <li key={achievement}>{achievement}</li>
                ))}
              </ul>
            ) : (
              <p>完成更多训练后，这里会开始记录你的阶段里程碑。</p>
            )}
          </section>
        </div>
      </div>
    </section>
  )
}
