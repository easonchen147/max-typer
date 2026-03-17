import Phaser from 'phaser'
import { useEffect, useRef, useState } from 'react'

import { FruitNinjaScene } from '@/features/fruit-ninja/FruitNinjaScene'
import {
  buildFruitSpawnSequence,
  createFruitState,
  resolveFruitInput,
  type FruitState,
} from '@/features/fruit-ninja/fruitNinjaModel'
import { playFeedbackTone } from '@/phaser/audio/feedbackSynth'
import { useKeyboard } from '@/shared/hooks/useKeyboard'
import { useSessionCountdown } from '@/shared/hooks/useSessionCountdown'
import type {
  KeyboardSnapshot,
  PracticeDifficulty,
  SessionProgressSummary,
} from '@/shared/types/domain'

interface FruitNinjaGameProps {
  difficulty: PracticeDifficulty
  snapshot: KeyboardSnapshot
  onRecord: (payload: { expected: string; input: string; correct: boolean; reactionMs: number }) => void
  onComplete: (summary: {
    attempts: number
    correct: number
    accuracy: number
    score: number
    bestCombo: number
    penalties: number
  }) => void
  onProgress?: (summary: SessionProgressSummary) => void
  soundEnabled?: boolean
  durationSeconds?: number | null
}

const sequenceLengthByDifficulty: Record<PracticeDifficulty, number> = {
  starter: 16,
  standard: 20,
  challenge: 24,
}

const buildProgressSummary = (state: FruitState): SessionProgressSummary => {
  const keystrokes = state.hits + state.misses + state.penalties

  return {
    accuracy: state.hits / Math.max(1, keystrokes),
    keystrokes,
    score: state.score,
  }
}

export const FruitNinjaGame = ({
  difficulty,
  durationSeconds = null,
  onProgress,
  snapshot,
  onComplete,
  onRecord,
  soundEnabled = true,
}: FruitNinjaGameProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const sceneRef = useRef<FruitNinjaScene | null>(null)
  const completionSentRef = useRef(false)
  const onRecordRef = useRef(onRecord)
  const onCompleteRef = useRef(onComplete)
  const onProgressRef = useRef(onProgress)
  const [state, setState] = useState<FruitState>(() => createFruitState())
  const [finished, setFinished] = useState(false)
  const timedSession = durationSeconds !== null
  const [sequence] = useState(() =>
    buildFruitSpawnSequence({
      snapshot,
      difficulty,
      length: sequenceLengthByDifficulty[difficulty],
    }),
  )

  useEffect(() => {
    onRecordRef.current = onRecord
    onCompleteRef.current = onComplete
    onProgressRef.current = onProgress
  }, [onComplete, onProgress, onRecord])

  useEffect(() => {
    onProgressRef.current?.(buildProgressSummary(state))
  }, [state])

  const { timerLabel } = useSessionCountdown({
    durationSeconds,
    enabled: !finished,
    onExpire: () => {
      sceneRef.current?.finishEarly()
      setFinished(true)
    },
  })

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    const scene = new FruitNinjaScene({
      difficulty,
      sequence,
      timedSession,
      onEvent: (event) => {
        setState((previous) =>
          resolveFruitInput(previous, {
            kind: event.kind,
            letter: event.expected,
          }),
        )
        playFeedbackTone(event.kind === 'fruit' ? 'success' : 'error', soundEnabled)
        onRecordRef.current({
          expected: event.expected,
          input: event.input,
          correct: event.kind === 'fruit',
          reactionMs: event.reactionMs,
        })
      },
      onComplete: () => {
        if (timedSession) {
          return
        }

        setFinished(true)
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
  }, [difficulty, sequence, soundEnabled, timedSession])

  useKeyboard({
    enabled: !finished,
    onKey: (key) => {
      sceneRef.current?.handleKey(key)
    },
  })

  useEffect(() => {
    if (!finished || completionSentRef.current) {
      return
    }

    const attempts = state.hits + state.misses + state.penalties
    completionSentRef.current = true
    onCompleteRef.current({
      attempts,
      correct: state.hits,
      accuracy: state.hits / Math.max(1, attempts),
      score: state.score,
      bestCombo: state.bestCombo,
      penalties: state.penalties,
    })
  }, [finished, state])

  return (
    <section className="arcade-game">
      <header className="screen-header">
        <div>
          <p className="eyebrow">水果忍者 · {difficulty}</p>
          <h2>击中目标字母，躲开炸弹，把弱项训练塞进高节奏反馈里。</h2>
          <p>越弱的字母越容易出现，连击越高，分数增长越快。</p>
        </div>
        <div className="practice-screen__stats">
          <span>得分 {state.score}</span>
          <span>连击 {state.combo}</span>
          <span>炸弹 {state.penalties}</span>
          <span>剩余 {timerLabel}</span>
        </div>
      </header>

      <div className="arcade-canvas" ref={containerRef} />

      {finished && (
        <article className="detail-card">
          <p className="eyebrow">结算完成</p>
          <h3>最佳连击 {state.bestCombo}</h3>
          <p>
            得分 {state.score} · 命中 {state.hits} · 漏掉 {state.misses}
          </p>
        </article>
      )}
    </section>
  )
}
