import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'

import { BasicPracticeScreen } from '@/features/basic-practice/BasicPracticeScreen'
import { HeatmapScreen } from '@/features/heatmap/HeatmapScreen'
import { LandingScreen } from '@/features/landing/LandingScreen'
import { MainMenu } from '@/features/menu/MainMenu'
import { OnboardingModal } from '@/features/onboarding/OnboardingModal'
import { PRACTICE_COPY } from '@/shared/constants/content'
import { DIFFICULTY_LABELS } from '@/shared/constants/progression'
import { getSessionDurationSeconds } from '@/shared/constants/session'
import {
  buildPracticeTargets,
  getWordBankEntries,
} from '@/shared/services/practiceContent'
import {
  buildDailyFocusLetters,
  buildProgressSnapshot,
} from '@/shared/services/progressService'
import { buildFocusedDrillQueue } from '@/shared/services/questionEngine'
import { useAppStore } from '@/shared/stores/appStore'
import { useTrainerStore } from '@/shared/stores/trainerStore'
import type {
  AppView,
  PracticeDifficulty,
  PracticeMode,
  SessionProgressSummary,
} from '@/shared/types/domain'
import { downloadTextFile } from '@/shared/utils/download'

const LazyFruitNinjaGame = lazy(() =>
  import('@/features/fruit-ninja/FruitNinjaGame').then((module) => ({
    default: module.FruitNinjaGame,
  })),
)

const LazySpaceInvadersGame = lazy(() =>
  import('@/features/space-invaders/SpaceInvadersGame').then((module) => ({
    default: module.SpaceInvadersGame,
  })),
)

const PRACTICE_VIEWS: readonly PracticeMode[] = [
  'basic-practice',
  'fruit-ninja',
  'space-invaders',
] as const

const MODE_LABELS: Record<PracticeMode, string> = {
  'basic-practice': '基础练习',
  'fruit-ninja': '水果忍者',
  'space-invaders': '太空侵略者',
}

const EMPTY_SESSION_PROGRESS: SessionProgressSummary = {
  accuracy: 0,
  keystrokes: 0,
  score: 0,
}

const buildExportFilename = () => `max-typer-export-${new Date().toISOString().slice(0, 10)}.json`

const isPracticeView = (view: AppView): view is PracticeMode =>
  PRACTICE_VIEWS.includes(view as PracticeMode)

const getRecommendedMode = ({
  difficulty,
  masteredCount,
  totalSessions,
}: {
  difficulty: PracticeDifficulty
  masteredCount: number
  totalSessions: number
}): PracticeMode => {
  if (totalSessions < 2 || masteredCount < 8) {
    return 'basic-practice'
  }

  if (difficulty === 'challenge' || masteredCount >= 18) {
    return 'space-invaders'
  }

  return difficulty === 'standard' || masteredCount >= 8 ? 'fruit-ninja' : 'basic-practice'
}

export const AppShell = () => {
  const currentView = useAppStore((state) => state.currentView)
  const navigate = useAppStore((state) => state.navigate)
  const selectedDifficulty = useAppStore((state) => state.selectedDifficulty)
  const selectedDurationPreset = useAppStore((state) => state.selectedDurationPreset)
  const selectedWordBankId = useAppStore((state) => state.selectedWordBankId)
  const setDifficulty = useAppStore((state) => state.setDifficulty)
  const setDurationPreset = useAppStore((state) => state.setDurationPreset)
  const setWordBank = useAppStore((state) => state.setWordBank)
  const tutorialOpen = useAppStore((state) => state.tutorialOpen)
  const showTutorial = useAppStore((state) => state.showTutorial)
  const hideTutorial = useAppStore((state) => state.hideTutorial)

  const {
    activeSessionId,
    hydrated,
    hydrate,
    loading,
    profile,
    snapshot,
    sessions,
    startSession,
    recordStroke,
    completeSession,
    updateSettings,
    markOnboardingComplete,
    exportData,
    resetData,
  } = useTrainerStore((state) => state)

  const [exportNotice, setExportNotice] = useState<string>()
  const [sessionTargets, setSessionTargets] = useState<string[]>([])
  const [activeSessionStartedAt, setActiveSessionStartedAt] = useState<number | null>(null)
  const [focusDateKey, setFocusDateKey] = useState(() => new Date().toDateString())
  const activeSessionProgressRef = useRef<SessionProgressSummary>(EMPTY_SESSION_PROGRESS)
  const sessionCompletingRef = useRef(false)

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const nextDateKey = new Date().toDateString()
      setFocusDateKey((current) => (current === nextDateKey ? current : nextDateKey))
    }, 60_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  const progress = useMemo(
    () =>
      buildProgressSnapshot({
        profile,
        sessions,
        snapshot,
      }),
    [profile, sessions, snapshot],
  )

  const resolvedDifficulty = useMemo(() => {
    if (progress.unlockedDifficulties.includes(selectedDifficulty)) {
      return selectedDifficulty
    }

    return progress.unlockedDifficulties.at(-1) ?? 'starter'
  }, [progress.unlockedDifficulties, selectedDifficulty])

  useEffect(() => {
    if (selectedDifficulty !== resolvedDifficulty) {
      setDifficulty(resolvedDifficulty)
    }
  }, [resolvedDifficulty, selectedDifficulty, setDifficulty])

  const sessionDurationSeconds = getSessionDurationSeconds(selectedDurationPreset)
  const selectedWordEntries = useMemo(
    () => getWordBankEntries(selectedWordBankId),
    [selectedWordBankId],
  )
  const recommendations = useMemo(
    () => buildDailyFocusLetters(snapshot, { count: 5, date: new Date(focusDateKey) }),
    [focusDateKey, snapshot],
  )
  const focusLetters = recommendations.slice(0, 3)
  const completedSessions = useMemo(
    () => sessions.filter((session) => session.completed),
    [sessions],
  )
  const trendPoints = completedSessions
    .slice(0, 6)
    .reverse()
    .map((session) => session.accuracy || 0.25)
  const recommendedMode = getRecommendedMode({
    difficulty: resolvedDifficulty,
    masteredCount: progress.masteredCount,
    totalSessions: progress.totalSessions,
  })

  const nextDifficultyProgress = progress.nextUnlock
    ? progress.difficultyProgress.find((entry) => entry.id === progress.nextUnlock?.id) ?? null
    : null

  const recommendationLabel = progress.nextUnlock
    ? `目前已稳定 ${progress.masteredCount} / 26 个键位，继续训练可以推进 ${DIFFICULTY_LABELS[progress.nextUnlock.id]} 难度解锁。`
    : `目前已稳定 ${progress.masteredCount} / 26 个键位，三档难度都已经开放，可以自由切换。`

  const recommendedLabel = `当前更适合用 ${MODE_LABELS[recommendedMode]} 完成今天的主训练，再把结果带回数据页做诊断。`

  const nextUnlockLabel = nextDifficultyProgress
    ? `解锁 ${nextDifficultyProgress.title}：${nextDifficultyProgress.currentCount} / ${Math.max(
        1,
        nextDifficultyProgress.requiredCount,
      )} 键达到 L${nextDifficultyProgress.minimumLevel}`
    : '三档难度已全部解锁'

  const dailyGoalLabel =
    progress.dailyGoal.remainingSessions === 0
      ? `今日小目标已完成 ${progress.dailyGoal.completedSessions} / ${progress.dailyGoal.targetSessions}`
      : `今日小目标 ${progress.dailyGoal.completedSessions} / ${progress.dailyGoal.targetSessions}`

  const todayFocusLabel = `今日优先键位由最近弱项和日期动态生成，每天会刷新一次。`

  useEffect(() => {
    if (!hydrated || currentView === 'landing') {
      return
    }

    if (!profile.onboardingComplete && profile.settings.tutorialEnabled && !tutorialOpen) {
      showTutorial()
    }
  }, [
    currentView,
    hydrated,
    profile.onboardingComplete,
    profile.settings.tutorialEnabled,
    showTutorial,
    tutorialOpen,
  ])

  const practiceTargets =
    sessionTargets.length > 0
      ? sessionTargets
      : buildPracticeTargets({
          difficulty: resolvedDifficulty,
          snapshot,
          wordBankId: selectedWordBankId,
        })

  const beginSession = async (view: PracticeMode, difficulty: PracticeDifficulty) => {
    setActiveSessionStartedAt(Date.now())
    activeSessionProgressRef.current = EMPTY_SESSION_PROGRESS
    sessionCompletingRef.current = false
    await startSession(view, difficulty)
    navigate(view)
  }

  const getSessionDurationMs = () => {
    if (!activeSessionStartedAt) {
      return 1_000
    }

    return Math.max(1_000, Date.now() - activeSessionStartedAt)
  }

  const finalizeSession = async (
    update: Omit<Parameters<typeof completeSession>[0], 'durationMs' | 'endedAt'>,
  ) => {
    sessionCompletingRef.current = true
    activeSessionProgressRef.current = {
      accuracy: update.accuracy ?? 0,
      keystrokes: update.keystrokes ?? 0,
      score: update.score ?? 0,
    }

    try {
      await completeSession({
        ...update,
        durationMs: getSessionDurationMs(),
        endedAt: Date.now(),
      })
    } finally {
      activeSessionProgressRef.current = EMPTY_SESSION_PROGRESS
      sessionCompletingRef.current = false
      setActiveSessionStartedAt(null)
      setSessionTargets([])
    }
  }

  const exitToView = async (targetView: 'menu' | 'heatmap') => {
    if (activeSessionId && isPracticeView(currentView) && !sessionCompletingRef.current) {
      const sessionProgress = activeSessionProgressRef.current

      await completeSession({
        accuracy: sessionProgress.accuracy,
        completed: false,
        durationMs: getSessionDurationMs(),
        endedAt: Date.now(),
        keystrokes: sessionProgress.keystrokes,
        score: sessionProgress.score,
      })
    }

    setSessionTargets([])
    setActiveSessionStartedAt(null)
    activeSessionProgressRef.current = EMPTY_SESSION_PROGRESS
    navigate(targetView)
  }

  const openMode = async (view: PracticeMode) => {
    setExportNotice(undefined)

    if (view === 'basic-practice') {
      setSessionTargets(
        buildPracticeTargets({
          difficulty: resolvedDifficulty,
          snapshot,
          wordBankId: selectedWordBankId,
        }),
      )
      await beginSession('basic-practice', resolvedDifficulty)
      return
    }

    setSessionTargets([])
    await beginSession(view, resolvedDifficulty)
  }

  const openFocusedPractice = async (letter: string) => {
    setExportNotice(undefined)

    const focusTargets = [letter, ...recommendations.filter((entry) => entry !== letter).slice(0, 2)]

    setDifficulty('starter')
    setSessionTargets(
      buildFocusedDrillQueue({
        letters: focusTargets,
        length: PRACTICE_COPY.starter.length,
      }),
    )
    await beginSession('basic-practice', 'starter')
  }

  const handleExport = async () => {
    const payload = await exportData()
    const filename = buildExportFilename()
    const downloaded = downloadTextFile({
      filename,
      content: payload,
      type: 'application/json;charset=utf-8',
    })

    setExportNotice(
      downloaded
        ? `导出完成，文件已下载：${filename}`
        : `导出内容已生成，共 ${payload.length} 个字符。`,
    )
  }

  const closeTutorial = async () => {
    await markOnboardingComplete()
    hideTutorial()
  }

  const enterMainApp = () => {
    navigate('menu')
  }

  const handlePrimaryNavigation = (targetView: 'menu' | 'heatmap') => {
    if (currentView === targetView) {
      return
    }

    if (isPracticeView(currentView)) {
      void exitToView(targetView)
      return
    }

    navigate(targetView)
  }

  const renderCurrentView = () => {
    if (currentView === 'menu') {
      return (
        <MainMenu
          achievements={progress.achievementFeed.length}
          colorblindMode={profile.settings.colorblindMode}
          dailyGoalLabel={dailyGoalLabel}
          difficultyProgress={progress.difficultyProgress}
          focusLetters={focusLetters}
          masteredCount={progress.masteredCount}
          onOpenDataCenter={() => navigate('heatmap')}
          onOpenTutorial={showTutorial}
          onSelectDifficulty={setDifficulty}
          onSelectDurationPreset={setDurationPreset}
          onSelectMode={(view) => void openMode(view)}
          onSelectWordBank={setWordBank}
          onStartRecommended={() => void openMode(recommendedMode)}
          onToggleColorblind={() =>
            void updateSettings({ colorblindMode: !profile.settings.colorblindMode })
          }
          onToggleSound={() => void updateSettings({ soundEnabled: !profile.settings.soundEnabled })}
          progressLabel={recommendationLabel}
          recommendedLabel={recommendedLabel}
          recommendedMode={recommendedMode}
          selectedDifficulty={resolvedDifficulty}
          selectedDurationPreset={selectedDurationPreset}
          selectedWordBankId={selectedWordBankId}
          soundEnabled={profile.settings.soundEnabled}
          todayFocusLabel={todayFocusLabel}
          totalSessions={progress.totalSessions}
          unlockedDifficulties={progress.unlockedDifficulties}
        />
      )
    }

    if (currentView === 'basic-practice') {
      return (
        <BasicPracticeScreen
          difficulty={resolvedDifficulty}
          durationSeconds={sessionDurationSeconds}
          onComplete={(summary) =>
            void finalizeSession({
              accuracy: summary.accuracy,
              completed: true,
              keystrokes: summary.attempts,
              score: Math.round(summary.correct * 10),
            })
          }
          onProgress={(summary) => {
            activeSessionProgressRef.current = summary
          }}
          onRecord={(payload) =>
            void recordStroke({
              ...payload,
              difficulty: resolvedDifficulty,
              mode: 'basic-practice',
              letter: payload.expected,
            })
          }
          soundEnabled={profile.settings.soundEnabled}
          subtitle={PRACTICE_COPY[resolvedDifficulty].subtitle}
          targets={practiceTargets}
          title={PRACTICE_COPY[resolvedDifficulty].title}
        />
      )
    }

    if (currentView === 'heatmap') {
      return (
        <HeatmapScreen
          achievements={progress.achievementFeed.map((achievement) => achievement.title)}
          colorblindMode={profile.settings.colorblindMode}
          dailyGoalLabel={dailyGoalLabel}
          difficultyProgress={progress.difficultyProgress}
          masteredCount={progress.masteredCount}
          nextUnlockLabel={nextUnlockLabel}
          onExport={() => void handleExport()}
          onPracticeKey={(letter) => void openFocusedPractice(letter)}
          onReset={() =>
            void resetData().then(() => setExportNotice('记录已清空，并完成重新初始化。'))
          }
          progressLabel={exportNotice ?? '先看整体进度，再点开单个字母做专项修正。'}
          recommendations={recommendations}
          snapshot={snapshot}
          todayFocusLabel={todayFocusLabel}
          totalSessions={progress.totalSessions}
          trendPoints={trendPoints.length > 0 ? trendPoints : [0.25, 0.4, 0.55, 0.65]}
        />
      )
    }

    if (currentView === 'fruit-ninja') {
      return (
        <Suspense
          fallback={
            <section className="placeholder-screen">
              <p>正在载入水果忍者模式…</p>
            </section>
          }
        >
          <LazyFruitNinjaGame
            difficulty={resolvedDifficulty}
            durationSeconds={sessionDurationSeconds}
            onComplete={(summary) =>
              void finalizeSession({
                accuracy: summary.accuracy,
                completed: true,
                keystrokes: summary.attempts,
                score: summary.score,
              })
            }
            onProgress={(summary) => {
              activeSessionProgressRef.current = summary
            }}
            onRecord={(payload) =>
              void recordStroke({
                ...payload,
                difficulty: resolvedDifficulty,
                mode: 'fruit-ninja',
                letter: payload.expected,
              })
            }
            snapshot={snapshot}
            soundEnabled={profile.settings.soundEnabled}
          />
        </Suspense>
      )
    }

    return (
      <Suspense
        fallback={
          <section className="placeholder-screen">
            <p>正在载入太空侵略者模式…</p>
          </section>
        }
      >
        <LazySpaceInvadersGame
          difficulty={resolvedDifficulty}
          durationSeconds={sessionDurationSeconds}
          onComplete={(summary) =>
            void finalizeSession({
              accuracy: summary.accuracy,
              completed: true,
              keystrokes: summary.attempts,
              score: summary.score,
            })
          }
          onProgress={(summary) => {
            activeSessionProgressRef.current = summary
          }}
          onRecord={(payload) =>
            void recordStroke({
              ...payload,
              difficulty: resolvedDifficulty,
              mode: 'space-invaders',
              letter: payload.expected,
            })
          }
          snapshot={snapshot}
          soundEnabled={profile.settings.soundEnabled}
          words={selectedWordEntries}
        />
      </Suspense>
    )
  }

  if (currentView === 'landing') {
    return (
      <main className="app-shell app-shell--landing">
        <LandingScreen onEnter={enterMainApp} />
        <OnboardingModal
          onClose={() => void closeTutorial()}
          open={tutorialOpen && profile.settings.tutorialEnabled}
        />
      </main>
    )
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="app-header__brand">
          <p className="eyebrow">Max Typer</p>
          <h1>让训练、反馈和数据始终停留在同一条升级路径上。</h1>
        </div>

        <nav aria-label="主导航" className="primary-nav">
          <button
            className="primary-nav__button"
            data-active={currentView !== 'heatmap'}
            data-testid="primary-nav-training"
            onClick={() => handlePrimaryNavigation('menu')}
            type="button"
          >
            训练模式
          </button>
          <button
            className="primary-nav__button"
            data-active={currentView === 'heatmap'}
            data-testid="primary-nav-data"
            onClick={() => handlePrimaryNavigation('heatmap')}
            type="button"
          >
            个人数据
          </button>
        </nav>

        <div className="status-pill">
          {loading ? '同步中…' : `已完成 ${progress.totalSessions} 场训练`}
        </div>
      </header>

      {renderCurrentView()}

      {isPracticeView(currentView) && (
        <button
          className="toolbar-toggle toolbar-toggle--ghost app-shell__back"
          onClick={() => void exitToView('menu')}
          type="button"
        >
          返回训练模式
        </button>
      )}

      <OnboardingModal
        onClose={() => void closeTutorial()}
        open={tutorialOpen && profile.settings.tutorialEnabled}
      />
    </main>
  )
}
