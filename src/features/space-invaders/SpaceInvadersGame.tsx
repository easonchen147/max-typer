import Phaser from 'phaser'
import { useEffect, useRef, useState } from 'react'

import { SpaceInvadersScene } from '@/features/space-invaders/SpaceInvadersScene'
import { playFeedbackTone } from '@/phaser/audio/feedbackSynth'
import { useKeyboard } from '@/shared/hooks/useKeyboard'
import { useSessionCountdown } from '@/shared/hooks/useSessionCountdown'
import type {
  KeyboardSnapshot,
  PracticeDifficulty,
  SessionProgressSummary,
  WordEntry,
} from '@/shared/types/domain'

interface SpaceInvadersGameProps {
  difficulty: PracticeDifficulty
  snapshot: KeyboardSnapshot
  words: WordEntry[]
  onRecord: (payload: { expected: string; input: string; correct: boolean; reactionMs: number }) => void
  onComplete: (summary: {
    attempts: number
    correct: number
    accuracy: number
    score: number
    destroyed: number
    bossDefeated: boolean
  }) => void
  onProgress?: (summary: SessionProgressSummary) => void
  soundEnabled?: boolean
  durationSeconds?: number | null
}

interface EncounterHudState {
  title: string
  detail: string
  tone: 'pace' | 'warning' | 'boss'
}

const DEFAULT_STATUS: EncounterHudState = {
  title: '节奏提示',
  detail: '敌机会按节奏逐步压进，先稳住当前单词。',
  tone: 'pace',
}

export const SpaceInvadersGame = ({
  difficulty,
  durationSeconds = null,
  onProgress,
  snapshot,
  words,
  onComplete,
  onRecord,
  soundEnabled = true,
}: SpaceInvadersGameProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const sceneRef = useRef<SpaceInvadersScene | null>(null)
  const completionSentRef = useRef(false)
  const onRecordRef = useRef(onRecord)
  const onCompleteRef = useRef(onComplete)
  const onProgressRef = useRef(onProgress)
  const [attempts, setAttempts] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [score, setScore] = useState(0)
  const [destroyed, setDestroyed] = useState(0)
  const [bossDefeated, setBossDefeated] = useState(false)
  const [resultReady, setResultReady] = useState(false)
  const [encounterStatus, setEncounterStatus] = useState<EncounterHudState>(DEFAULT_STATUS)
  const [sessionSnapshot] = useState(() => snapshot)
  const timedSession = durationSeconds !== null

  useEffect(() => {
    onRecordRef.current = onRecord
    onCompleteRef.current = onComplete
    onProgressRef.current = onProgress
  }, [onComplete, onProgress, onRecord])

  useEffect(() => {
    onProgressRef.current?.({
      accuracy: correct / Math.max(1, attempts),
      keystrokes: attempts,
      score,
    })
  }, [attempts, correct, score])

  const { timerLabel } = useSessionCountdown({
    durationSeconds,
    enabled: !resultReady,
    onExpire: () => {
      if (sceneRef.current) {
        sceneRef.current.finishEarly()
        return
      }

      setResultReady(true)
    },
  })

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    completionSentRef.current = false

    const scene = new SpaceInvadersScene({
      difficulty,
      snapshot: sessionSnapshot,
      timedSession,
      words,
      onStroke: (event) => {
        setAttempts((value) => value + 1)
        setCorrect((value) => value + (event.correct ? 1 : 0))
        setScore(event.score)
        playFeedbackTone(event.correct ? 'success' : 'error', soundEnabled)
        onRecordRef.current({
          expected: event.expected,
          input: event.input,
          correct: event.correct,
          reactionMs: event.reactionMs,
        })
      },
      onStatusChange: (status) => {
        setEncounterStatus(status)
      },
      onComplete: (payload) => {
        if (timedSession && payload.reason !== 'timeout') {
          return
        }

        setDestroyed(payload.destroyed)
        setScore(payload.score)
        setBossDefeated(payload.bossDefeated)
        setResultReady(true)
      },
    })

    sceneRef.current = scene

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: 960,
      height: 520,
      audio: {
        noAudio: true,
      },
      scene: [scene],
      transparent: true,
    })

    return () => {
      sceneRef.current = null
      game.destroy(true)
    }
  }, [difficulty, sessionSnapshot, soundEnabled, timedSession, words])

  useKeyboard({
    enabled: !resultReady,
    onKey: (key) => {
      sceneRef.current?.handleKey(key)
    },
  })

  useEffect(() => {
    if (!resultReady || completionSentRef.current) {
      return
    }

    completionSentRef.current = true
    onCompleteRef.current({
      attempts,
      correct,
      accuracy: correct / Math.max(1, attempts),
      score,
      destroyed,
      bossDefeated,
    })
  }, [attempts, bossDefeated, correct, destroyed, resultReady, score])

  return (
    <section className="arcade-game">
      <header className="screen-header">
        <div>
          <p className="eyebrow">太空侵略者 · {difficulty}</p>
          <h2>锁定单词并持续输入，让清空舰队变成一条稳定的输出节奏。</h2>
          <p>敌机会按节奏逐步进场，Boss 登场前也会先给过渡提示。</p>
        </div>
        <div className="practice-screen__stats">
          <span>得分 {score}</span>
          <span>摧毁 {destroyed}</span>
          <span>准确 {(correct / Math.max(1, attempts) * 100).toFixed(0)}%</span>
          <span>剩余 {timerLabel}</span>
        </div>
      </header>

      <article className="space-hud" data-tone={encounterStatus.tone}>
        <strong>{encounterStatus.title}</strong>
        <span>{encounterStatus.detail}</span>
      </article>

      <div className="arcade-canvas" ref={containerRef} />

      {resultReady && (
        <article className="detail-card">
          <p className="eyebrow">{bossDefeated ? 'Boss 已击落' : '训练结束'}</p>
          <h3>{bossDefeated ? '舰队清空' : '时间或防线已经结算'}</h3>
          <p>
            总得分 {score} · 摧毁 {destroyed} · 命中 {correct}
          </p>
        </article>
      )}
    </section>
  )
}
