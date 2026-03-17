import { WORD_BANK_OPTIONS } from '@/shared/constants/wordBanks'
import { DIFFICULTY_LABELS, PRACTICE_DIFFICULTIES } from '@/shared/constants/progression'
import { SESSION_DURATION_OPTIONS } from '@/shared/constants/session'
import type {
  AppView,
  DifficultyProgress,
  PracticeDifficulty,
  PracticeMode,
  SessionDurationPreset,
  WordBankId,
} from '@/shared/types/domain'

interface MainMenuProps {
  soundEnabled: boolean
  colorblindMode: boolean
  achievements: number
  progressLabel: string
  masteredCount: number
  totalSessions: number
  focusLetters: string[]
  todayFocusLabel: string
  dailyGoalLabel: string
  difficultyProgress: DifficultyProgress[]
  recommendedMode: PracticeMode
  recommendedLabel: string
  unlockedDifficulties: PracticeDifficulty[]
  unlockedModes?: AppView[]
  onSelectMode: (mode: PracticeMode) => void
  onStartRecommended: () => void
  onOpenDataCenter: () => void
  onToggleSound: () => void
  onToggleColorblind: () => void
  onOpenTutorial: () => void
  selectedDifficulty?: PracticeDifficulty
  onSelectDifficulty?: (difficulty: PracticeDifficulty) => void
  selectedDurationPreset?: SessionDurationPreset
  onSelectDurationPreset?: (preset: SessionDurationPreset) => void
  selectedWordBankId?: WordBankId
  onSelectWordBank?: (wordBankId: WordBankId) => void
}

const modeCards: Array<{
  id: PracticeMode
  eyebrow: string
  title: string
  description: string
  highlights: string[]
}> = [
  {
    id: 'basic-practice',
    eyebrow: '热身与校准',
    title: '基础练习',
    description: '先把目标键位、节奏和准确率校准到稳定状态，再把薄弱点送进后面的游戏模式。',
    highlights: ['单键到短词', '适合起步', '专项纠错'],
  },
  {
    id: 'fruit-ninja',
    eyebrow: '反应与连击',
    title: '水果忍者',
    description: '把弱项字母放进更快的节奏里，用即时反馈训练反应速度、命中率和稳定连击。',
    highlights: ['高频字母', '速度反馈', '节奏冲刺'],
  },
  {
    id: 'space-invaders',
    eyebrow: '输出与耐力',
    title: '太空侵略者',
    description: '用单词与短语持续输出，巩固更长输入链路里的准确率、耐力和专注度。',
    highlights: ['单词输出', '连续输入', '耐力巩固'],
  },
] as const

const modeTitles: Record<PracticeMode, string> = {
  'basic-practice': '基础练习',
  'fruit-ninja': '水果忍者',
  'space-invaders': '太空侵略者',
}

export const MainMenu = ({
  achievements,
  colorblindMode,
  dailyGoalLabel,
  difficultyProgress,
  focusLetters,
  masteredCount,
  onOpenDataCenter,
  onOpenTutorial,
  onSelectDifficulty,
  onSelectDurationPreset,
  onSelectMode,
  onSelectWordBank,
  onStartRecommended,
  onToggleColorblind,
  onToggleSound,
  progressLabel,
  recommendedLabel,
  recommendedMode,
  selectedDifficulty = 'starter',
  selectedDurationPreset = '5-min',
  selectedWordBankId = 'elementary',
  soundEnabled,
  todayFocusLabel,
  totalSessions,
  unlockedDifficulties,
}: MainMenuProps) => {
  const selectedWordBank =
    WORD_BANK_OPTIONS.find((option) => option.id === selectedWordBankId) ?? WORD_BANK_OPTIONS[0]
  const difficultyProgressMap = new Map(
    difficultyProgress.map((entry) => [entry.id, entry]),
  )

  return (
    <section className="main-menu">
      <header className="screen-header">
        <div>
          <p className="eyebrow">训练模式</p>
          <h2>先决定今天的训练路线，再进入最合适的节奏模式。</h2>
          <p>{progressLabel}</p>
        </div>

        <div className="main-menu__summary">
          <span>已熟练 {masteredCount} / 26 键</span>
          <span>已完成 {totalSessions} 场训练</span>
          <span>{colorblindMode ? '色盲友好已开启' : '标准配色模式'}</span>
        </div>
      </header>

      <section className="menu-hero">
        <article className="menu-hero__story">
          <p className="eyebrow">今日训练方案</p>
          <h3>推荐先进入 {modeTitles[recommendedMode]}，把当前设置转成一轮完整训练。</h3>
          <p>
            {recommendedLabel}
            {focusLetters.length > 0
              ? ` 当前优先关注：${focusLetters.map((letter) => letter.toUpperCase()).join(' / ')}。`
              : ''}
          </p>

          <div className="menu-hero__chips">
            <span>难度：{DIFFICULTY_LABELS[selectedDifficulty]}</span>
            <span>
              时长：
              {SESSION_DURATION_OPTIONS.find((option) => option.id === selectedDurationPreset)?.label ?? '5 分钟'}
            </span>
            <span>词库：{selectedWordBank.label}</span>
            <span>成就：{achievements}</span>
          </div>

          <div className="landing-screen__actions">
            <button
              className="cta-button"
              data-testid="start-recommended"
              onClick={onStartRecommended}
              type="button"
            >
              开始推荐训练
            </button>
            <button
              className="toolbar-toggle toolbar-toggle--ghost"
              data-testid="open-data-center"
              onClick={onOpenDataCenter}
              type="button"
            >
              查看个人数据
            </button>
          </div>
        </article>

        <aside className="menu-hero__plan">
          <p className="eyebrow">学习助手</p>
          <h3>{dailyGoalLabel}</h3>
          <p>{todayFocusLabel}</p>
          <ol className="menu-hero__steps">
            <li>先用当前难度和时长完成一轮训练，建立今天的节奏基线。</li>
            <li>训练后回到个人数据页，快速定位最慢、最不稳的键位。</li>
            <li>再从数据页直接开启专项练习，把薄弱点带回主循环。</li>
          </ol>
        </aside>
      </section>

      <section className="control-panel">
        <div className="control-panel__group">
          <p className="eyebrow">训练难度</p>
          <div className="difficulty-switcher">
            {PRACTICE_DIFFICULTIES.map((difficulty) => {
              const progress = difficultyProgressMap.get(difficulty)
              const unlocked = unlockedDifficulties.includes(difficulty)

              return (
                <button
                  className="difficulty-switcher__button difficulty-switcher__button--stacked"
                  data-active={selectedDifficulty === difficulty}
                  data-locked={!unlocked}
                  data-testid={`difficulty-${difficulty}`}
                  disabled={!unlocked}
                  key={difficulty}
                  onClick={() => onSelectDifficulty?.(difficulty)}
                  type="button"
                >
                  <span className="difficulty-switcher__title">{DIFFICULTY_LABELS[difficulty]}</span>
                  <small className="difficulty-switcher__meta">
                    {unlocked
                      ? '已解锁'
                      : `${progress?.currentCount ?? 0} / ${Math.max(1, progress?.requiredCount ?? 1)}`}
                  </small>
                </button>
              )
            })}
          </div>
        </div>

        <div className="control-panel__group">
          <p className="eyebrow">训练时长</p>
          <div className="duration-switcher">
            {SESSION_DURATION_OPTIONS.map((option) => (
              <button
                className="duration-switcher__button"
                data-active={selectedDurationPreset === option.id}
                data-testid={`duration-preset-${option.id}`}
                key={option.id}
                onClick={() => onSelectDurationPreset?.(option.id)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="control-panel__group">
          <p className="eyebrow">词库选择</p>
          <div className="duration-switcher">
            {WORD_BANK_OPTIONS.map((option) => (
              <button
                className="duration-switcher__button"
                data-active={selectedWordBankId === option.id}
                data-testid={`word-bank-${option.id}`}
                key={option.id}
                onClick={() => onSelectWordBank?.(option.id)}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="control-panel__hint">
            {selectedWordBank.description} 单词类模式和短语练习都会跟随这个选择。
          </p>
        </div>
      </section>

      <div className="card-grid">
        {modeCards.map((card) => {
          const recommended = recommendedMode === card.id

          return (
            <button
              className="mode-card"
              data-highlighted={recommended}
              data-mode={card.id}
              data-testid={`mode-card-${card.id}`}
              key={card.id}
              onClick={() => onSelectMode(card.id)}
              type="button"
            >
              <div className="mode-card__header">
                <p className="mode-card__tag">{card.eyebrow}</p>
                {recommended ? <span className="mode-card__badge">推荐</span> : null}
              </div>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
              <div className="mode-card__chips">
                {card.highlights.map((highlight) => (
                  <span key={highlight}>{highlight}</span>
                ))}
              </div>
            </button>
          )
        })}
      </div>

      <footer className="menu-toolbar">
        <button className="toolbar-toggle" onClick={onToggleSound} type="button">
          音效：{soundEnabled ? '开启' : '关闭'}
        </button>
        <button className="toolbar-toggle" onClick={onToggleColorblind} type="button">
          色盲友好：{colorblindMode ? '开启' : '关闭'}
        </button>
        <button className="toolbar-toggle toolbar-toggle--ghost" onClick={onOpenTutorial} type="button">
          重新查看引导
        </button>
      </footer>
    </section>
  )
}
