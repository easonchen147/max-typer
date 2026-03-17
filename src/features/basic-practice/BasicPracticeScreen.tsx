import { useEffect, useMemo, useRef, useState } from 'react'

import { playFeedbackTone } from '@/phaser/audio/feedbackSynth'
import { VirtualKeyboard } from '@/shared/components/VirtualKeyboard'
import { PROMPT_WAIT_TIMEOUT_MS } from '@/shared/constants/session'
import { useKeyboard } from '@/shared/hooks/useKeyboard'
import { useSessionCountdown } from '@/shared/hooks/useSessionCountdown'
import { getFingerGuide } from '@/shared/services/fingerGuide'
import type { PracticeDifficulty, SessionProgressSummary } from '@/shared/types/domain'

interface PracticeRecordPayload {
  expected: string
  input: string
  correct: boolean
  reactionMs: number
}

interface PracticeSummary {
  attempts: number
  correct: number
  accuracy: number
}

interface BasicPracticeScreenProps {
  difficulty: PracticeDifficulty
  targets: string[]
  onRecord: (payload: PracticeRecordPayload) => void
  onComplete: (summary: PracticeSummary) => void
  onProgress?: (summary: SessionProgressSummary) => void
  title?: string
  subtitle?: string
  soundEnabled?: boolean
  durationSeconds?: number | null
}

const normalizeKey = (value: string) => {
  if (value === ' ') {
    return 'space'
  }

  return value.toLowerCase()
}

const buildSummary = (attempts: number, correct: number): PracticeSummary => ({
  attempts,
  correct,
  accuracy: correct / Math.max(1, attempts),
})

const buildProgressSummary = (attempts: number, correct: number): SessionProgressSummary => ({
  accuracy: correct / Math.max(1, attempts),
  keystrokes: attempts,
  score: correct * 10,
})

const getNextPromptPosition = ({
  characterIndex,
  targetIndex,
  targets,
  timedSession,
}: {
  characterIndex: number
  targetIndex: number
  targets: string[]
  timedSession: boolean
}) => {
  const currentTarget = targets[targetIndex] ?? ''
  const reachedTargetEnd = characterIndex >= Math.max(0, currentTarget.length - 1)
  const reachedSessionEnd = targetIndex >= Math.max(0, targets.length - 1)

  if (reachedTargetEnd && reachedSessionEnd) {
    if (timedSession && targets.length > 0) {
      return {
        targetIndex: 0,
        characterIndex: 0,
        shouldFinish: false,
      }
    }

    return {
      targetIndex,
      characterIndex,
      shouldFinish: true,
    }
  }

  if (reachedTargetEnd) {
    return {
      targetIndex: targetIndex + 1,
      characterIndex: 0,
      shouldFinish: false,
    }
  }

  return {
    targetIndex,
    characterIndex: characterIndex + 1,
    shouldFinish: false,
  }
}

export const BasicPracticeScreen = ({
  difficulty,
  durationSeconds = null,
  onComplete,
  onProgress,
  onRecord,
  soundEnabled = true,
  targets,
  title = '基础练习',
  subtitle = '跟着发光键位走，把稳定节奏和击键准确度练出来。',
}: BasicPracticeScreenProps) => {
  const [targetIndex, setTargetIndex] = useState(0)
  const [characterIndex, setCharacterIndex] = useState(0)
  const [attempts, setAttempts] = useState(0)
  const [correct, setCorrect] = useState(0)
  const [feedback, setFeedback] = useState<'idle' | 'success' | 'error' | 'done'>('idle')
  const [pressedKey, setPressedKey] = useState<string>()
  const [wrongKey, setWrongKey] = useState<string>()
  const [promptNonce, setPromptNonce] = useState(0)
  const startTimeRef = useRef(0)
  const feedbackResetTimerRef = useRef<number | undefined>(undefined)
  const attemptsRef = useRef(0)
  const correctRef = useRef(0)
  const targetIndexRef = useRef(0)
  const characterIndexRef = useRef(0)
  const completedRef = useRef(false)
  const onRecordRef = useRef(onRecord)
  const onCompleteRef = useRef(onComplete)
  const onProgressRef = useRef(onProgress)
  const timedSession = durationSeconds !== null

  const currentTarget = targets[targetIndex] ?? ''
  const expectedKey = normalizeKey(currentTarget[characterIndex] ?? '')
  const completed = feedback === 'done'
  const fingerGuide = useMemo(() => (expectedKey ? getFingerGuide(expectedKey) : null), [expectedKey])

  useEffect(() => {
    onRecordRef.current = onRecord
    onCompleteRef.current = onComplete
    onProgressRef.current = onProgress
  }, [onComplete, onProgress, onRecord])

  useEffect(() => {
    attemptsRef.current = attempts
    correctRef.current = correct
  }, [attempts, correct])

  useEffect(() => {
    targetIndexRef.current = targetIndex
    characterIndexRef.current = characterIndex
  }, [characterIndex, targetIndex])

  useEffect(() => {
    onProgressRef.current?.(buildProgressSummary(attempts, correct))
  }, [attempts, correct])

  useEffect(() => {
    startTimeRef.current = performance.now()
  }, [promptNonce])

  useEffect(
    () => () => {
      if (feedbackResetTimerRef.current) {
        window.clearTimeout(feedbackResetTimerRef.current)
      }
    },
    [],
  )

  const finishSession = (summary: PracticeSummary) => {
    if (completedRef.current) {
      return
    }

    if (feedbackResetTimerRef.current) {
      window.clearTimeout(feedbackResetTimerRef.current)
      feedbackResetTimerRef.current = undefined
    }

    completedRef.current = true
    setFeedback('done')
    onCompleteRef.current(summary)
  }

  const schedulePromptFeedbackReset = () => {
    if (feedbackResetTimerRef.current) {
      window.clearTimeout(feedbackResetTimerRef.current)
    }

    feedbackResetTimerRef.current = window.setTimeout(() => {
      setFeedback((value) => (value === 'done' ? value : 'idle'))
      setPressedKey(undefined)
      setWrongKey(undefined)
      feedbackResetTimerRef.current = undefined
    }, 140)
  }

  const advancePrompt = ({
    nextAttempts,
    nextCorrect,
  }: {
    nextAttempts: number
    nextCorrect: number
  }) => {
    const nextPrompt = getNextPromptPosition({
      characterIndex: characterIndexRef.current,
      targetIndex: targetIndexRef.current,
      targets,
      timedSession,
    })

    if (nextPrompt.shouldFinish) {
      finishSession(buildSummary(nextAttempts, nextCorrect))
      return
    }

    targetIndexRef.current = nextPrompt.targetIndex
    characterIndexRef.current = nextPrompt.characterIndex
    setTargetIndex(nextPrompt.targetIndex)
    setCharacterIndex(nextPrompt.characterIndex)
    setPromptNonce((value) => value + 1)
    schedulePromptFeedbackReset()
  }

  const { timerLabel } = useSessionCountdown({
    durationSeconds,
    enabled: !completed,
    onExpire: () => {
      finishSession(buildSummary(attemptsRef.current, correctRef.current))
    },
  })

  useEffect(() => {
    if (completed || !expectedKey) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      if (completedRef.current) {
        return
      }

      const timeoutTarget = targets[targetIndexRef.current] ?? ''
      const timeoutExpected = normalizeKey(timeoutTarget[characterIndexRef.current] ?? '')

      if (!timeoutExpected) {
        return
      }

      const nextAttempts = attemptsRef.current + 1
      attemptsRef.current = nextAttempts
      setAttempts(nextAttempts)
      setFeedback('error')
      setPressedKey(undefined)
      setWrongKey(undefined)
      onRecordRef.current({
        expected: timeoutExpected,
        input: '',
        correct: false,
        reactionMs: Math.max(50, Math.round(performance.now() - startTimeRef.current)),
      })
      const nextPrompt = getNextPromptPosition({
        characterIndex: characterIndexRef.current,
        targetIndex: targetIndexRef.current,
        targets,
        timedSession,
      })

      if (nextPrompt.shouldFinish) {
        finishSession(buildSummary(nextAttempts, correctRef.current))
        return
      }

      targetIndexRef.current = nextPrompt.targetIndex
      characterIndexRef.current = nextPrompt.characterIndex
      setTargetIndex(nextPrompt.targetIndex)
      setCharacterIndex(nextPrompt.characterIndex)
      setPromptNonce((value) => value + 1)
      schedulePromptFeedbackReset()
    }, PROMPT_WAIT_TIMEOUT_MS)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [completed, expectedKey, promptNonce, targets, timedSession])

  const decoratedTarget = useMemo(
    () =>
      currentTarget.split('').map((character, index) => ({
        character,
        active: index === characterIndex,
        complete: index < characterIndex,
      })),
    [characterIndex, currentTarget],
  )

  useKeyboard({
    enabled: !completed && Boolean(expectedKey),
    onKey: (key) => {
      const reactionMs = Math.max(50, Math.round(performance.now() - startTimeRef.current))
      const normalizedInput = normalizeKey(key)
      const isCorrect = normalizedInput === expectedKey
      const nextAttempts = attemptsRef.current + 1

      attemptsRef.current = nextAttempts
      setAttempts(nextAttempts)
      onRecordRef.current({
        expected: expectedKey,
        input: normalizedInput,
        correct: isCorrect,
        reactionMs,
      })

      if (!isCorrect) {
        setFeedback('error')
        setPressedKey(undefined)
        setWrongKey(normalizedInput)
        playFeedbackTone('error', soundEnabled)
        return
      }

      const nextCorrect = correctRef.current + 1
      correctRef.current = nextCorrect
      setCorrect(nextCorrect)
      setFeedback('success')
      setPressedKey(normalizedInput)
      setWrongKey(undefined)
      playFeedbackTone('success', soundEnabled)
      advancePrompt({ nextAttempts, nextCorrect })
    },
  })

  return (
    <section className="practice-screen">
      <header className="screen-header">
        <div>
          <p className="eyebrow">基础练习 · {difficulty}</p>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
        <div className="practice-screen__stats">
          <span>命中 {correct}</span>
          <span>尝试 {attempts}</span>
          <span>剩余 {timerLabel}</span>
        </div>
      </header>

      <article className="practice-screen__prompt">
        {completed ? (
          <>
            <p className="eyebrow">训练完成</p>
            <h3>这一轮已经全部结算。</h3>
            <p>准确率 {(correct / Math.max(1, attempts) * 100).toFixed(0)}%</p>
          </>
        ) : (
          <>
            <p className="eyebrow">当前目标</p>
            <h3 aria-label={currentTarget}>
              {decoratedTarget.map((token, index) => (
                <span
                  className="practice-screen__character"
                  data-active={token.active}
                  data-complete={token.complete}
                  key={`${token.character}-${index}`}
                >
                  {token.character}
                </span>
              ))}
            </h3>
            <p className="practice-screen__hint">
              {feedback === 'error'
                ? '再试一次，目标键位还在发光。'
                : '跟着提示按下对应字母，保持手指节奏稳定。'}
            </p>
            {fingerGuide ? (
              <div className="practice-screen__coach" data-testid="finger-coach">
                <strong>
                  建议手指：{fingerGuide.hand}
                  {fingerGuide.finger}
                </strong>
                <span>回位键：{fingerGuide.anchorKey}</span>
                <span>{fingerGuide.hint}</span>
              </div>
            ) : null}
          </>
        )}
      </article>

      <VirtualKeyboard
        activeKey={expectedKey}
        pressedKey={pressedKey}
        wrongKey={wrongKey}
      />
    </section>
  )
}
