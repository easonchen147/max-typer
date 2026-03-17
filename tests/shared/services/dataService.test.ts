import { afterEach, describe, expect, it, vi } from 'vitest'

import { createDataService } from '@/shared/services/dataService'

describe('dataService', () => {
  const services: Array<ReturnType<typeof createDataService>> = []

  afterEach(async () => {
    await Promise.all(services.map((service) => service.destroy()))
    services.length = 0
    vi.useRealTimers()
  })

  it('creates a default profile, records sessions, and exports aggregate data', async () => {
    const service = createDataService({ databaseName: 'max-typer-test-a' })
    services.push(service)

    const profile = await service.getProfile()
    expect(profile.unlockedDifficulties).toEqual(['starter'])

    const session = await service.startSession('basic-practice', 'starter')

    await service.recordKeyStroke({
      sessionId: session.id,
      letter: 'a',
      expected: 'a',
      input: 'a',
      correct: true,
      reactionMs: 280,
      mode: 'basic-practice',
      difficulty: 'starter',
    })

    await service.finishSession(session.id, {
      endedAt: session.startedAt + 8_000,
      durationMs: 8_000,
      score: 12,
      accuracy: 1,
      keystrokes: 1,
      completed: true,
    })

    const snapshot = await service.getKeyboardSnapshot()
    const exported = await service.exportData()

    expect(snapshot.a.attempts).toBe(1)
    expect(exported.sessions).toHaveLength(1)
    expect(exported.keyStrokes).toHaveLength(1)
  })

  it('resets persistent data back to a clean profile', async () => {
    const service = createDataService({ databaseName: 'max-typer-test-b' })
    services.push(service)

    const session = await service.startSession('fruit-ninja', 'starter')

    await service.recordKeyStroke({
      sessionId: session.id,
      letter: 'j',
      expected: 'j',
      input: 'k',
      correct: false,
      reactionMs: 520,
      mode: 'fruit-ninja',
      difficulty: 'starter',
    })

    await service.reset()

    const snapshot = await service.getKeyboardSnapshot()
    const sessions = await service.listSessions()

    expect(snapshot.j.attempts).toBe(0)
    expect(sessions).toHaveLength(0)
    expect((await service.getProfile()).earnedAchievementIds).toEqual([])
  })

  it('updates streak progress and persists unlocked difficulties after a completed session', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-03-16T09:00:00.000Z').valueOf())

    const service = createDataService({ databaseName: 'max-typer-test-c' })
    services.push(service)

    const session = await service.startSession('basic-practice', 'starter')
    const trainedLetters = 'abcdefghijklmnopqrst'.split('')

    for (const letter of trainedLetters) {
      for (let attempt = 0; attempt < 6; attempt += 1) {
        await service.recordKeyStroke({
          sessionId: session.id,
          letter,
          expected: letter,
          input: letter,
          correct: true,
          reactionMs: 240,
          mode: 'basic-practice',
          difficulty: 'starter',
        })
      }
    }

    await service.finishSession(session.id, {
      endedAt: session.startedAt + 30_000,
      durationMs: 30_000,
      score: 240,
      accuracy: 1,
      keystrokes: trainedLetters.length * 6,
      completed: true,
    })

    const profile = await service.getProfile()

    expect(profile.currentStreakDays).toBe(1)
    expect(profile.longestStreakDays).toBe(1)
    expect(profile.unlockedDifficulties).toEqual(['starter', 'standard'])
  })

  it('excludes incomplete sessions from keyboard snapshot and completed keystroke totals', async () => {
    const service = createDataService({ databaseName: 'max-typer-test-d' })
    services.push(service)

    const completedSession = await service.startSession('basic-practice', 'starter')

    await service.recordKeyStroke({
      sessionId: completedSession.id,
      letter: 'a',
      expected: 'a',
      input: 'a',
      correct: true,
      reactionMs: 180,
      mode: 'basic-practice',
      difficulty: 'starter',
    })

    await service.finishSession(completedSession.id, {
      endedAt: completedSession.startedAt + 6_000,
      durationMs: 6_000,
      score: 10,
      accuracy: 1,
      keystrokes: 1,
      completed: true,
    })

    const abortedSession = await service.startSession('basic-practice', 'starter')

    await service.recordKeyStroke({
      sessionId: abortedSession.id,
      letter: 'b',
      expected: 'b',
      input: 'x',
      correct: false,
      reactionMs: 260,
      mode: 'basic-practice',
      difficulty: 'starter',
    })

    await service.finishSession(abortedSession.id, {
      endedAt: abortedSession.startedAt + 3_000,
      durationMs: 3_000,
      score: 0,
      accuracy: 0,
      keystrokes: 1,
      completed: false,
    })

    const snapshot = await service.getKeyboardSnapshot()
    const profile = await service.getProfile()
    const exported = await service.exportData()

    expect(snapshot.a.attempts).toBe(1)
    expect(snapshot.b.attempts).toBe(0)
    expect(profile.totalKeystrokes).toBe(1)
    expect(exported.keyStrokes).toHaveLength(2)
  })
})
