import { create } from 'zustand'

import type {
  AppView,
  PracticeDifficulty,
  SessionDurationPreset,
  WordBankId,
} from '@/shared/types/domain'

interface AppState {
  currentView: AppView
  selectedDifficulty: PracticeDifficulty
  selectedDurationPreset: SessionDurationPreset
  selectedWordBankId: WordBankId
  tutorialOpen: boolean
  navigate: (view: AppView) => void
  setDifficulty: (difficulty: PracticeDifficulty) => void
  setDurationPreset: (preset: SessionDurationPreset) => void
  setWordBank: (wordBankId: WordBankId) => void
  showTutorial: () => void
  hideTutorial: () => void
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'landing',
  selectedDifficulty: 'starter',
  selectedDurationPreset: '5-min',
  selectedWordBankId: 'elementary',
  tutorialOpen: false,
  navigate: (currentView) => set({ currentView }),
  setDifficulty: (selectedDifficulty) => set({ selectedDifficulty }),
  setDurationPreset: (selectedDurationPreset) => set({ selectedDurationPreset }),
  setWordBank: (selectedWordBankId) => set({ selectedWordBankId }),
  showTutorial: () => set({ tutorialOpen: true }),
  hideTutorial: () => set({ tutorialOpen: false }),
}))
