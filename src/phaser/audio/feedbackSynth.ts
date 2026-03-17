type FeedbackTone = 'success' | 'error' | 'milestone'

interface LegacyAudioWindow extends Window {
  webkitAudioContext?: typeof AudioContext
}

let audioContext: AudioContext | null = null

const getAudioContext = () => {
  if (typeof window === 'undefined') {
    return null
  }

  const contextConstructor =
    window.AudioContext ?? (window as LegacyAudioWindow).webkitAudioContext

  if (!contextConstructor) {
    return null
  }

  audioContext ??= new contextConstructor()
  return audioContext
}

const toneProfiles: Record<FeedbackTone, { frequencies: number[]; durationMs: number; gain: number }> = {
  success: { frequencies: [523.25], durationMs: 90, gain: 0.035 },
  error: { frequencies: [196, 164.81], durationMs: 140, gain: 0.045 },
  milestone: { frequencies: [523.25, 659.25, 783.99], durationMs: 220, gain: 0.04 },
}

export const playFeedbackTone = (tone: FeedbackTone, enabled = true) => {
  if (!enabled) {
    return
  }

  const context = getAudioContext()

  if (!context) {
    return
  }

  if (context.state === 'suspended') {
    void context.resume().catch(() => undefined)
  }

  const profile = toneProfiles[tone]
  const now = context.currentTime
  const gainNode = context.createGain()

  gainNode.gain.setValueAtTime(0.0001, now)
  gainNode.gain.exponentialRampToValueAtTime(profile.gain, now + 0.01)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + profile.durationMs / 1000)
  gainNode.connect(context.destination)

  profile.frequencies.forEach((frequency, index) => {
    const oscillator = context.createOscillator()
    oscillator.type = tone === 'error' ? 'sawtooth' : 'sine'
    oscillator.frequency.setValueAtTime(frequency, now + index * 0.045)
    oscillator.connect(gainNode)
    oscillator.start(now + index * 0.045)
    oscillator.stop(now + profile.durationMs / 1000)
  })
}
