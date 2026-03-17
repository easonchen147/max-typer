# Max Typer Full Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a complete playable `Max Typer` web app from the existing BMAD artifacts, covering all sprint stories with automated tests, review, and sprint status updates.

**Architecture:** The app will use React 19 + TypeScript + Vite for shell/UI, Zustand for application state, Dexie for local persistence, and Phaser 3 for the two arcade modes. Shared services will own data collection, smart content selection, progress unlocking, export/reset, and analytics so feature modules consume a consistent API.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, Zustand, Dexie, Phaser 3, fake-indexeddb

---

### Task 1: Project Skeleton And Shared Foundations

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `vite.config.ts`
- Create: `index.html`
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/app/AppShell.tsx`
- Create: `src/app/ErrorBoundary.tsx`
- Create: `src/styles/global.css`
- Create: `src/shared/constants/*`
- Create: `src/shared/types/*`
- Create: `src/shared/utils/*`
- Create: `src/shared/stores/*`
- Create: `src/shared/db/*`
- Create: `src/shared/services/*`
- Create: `tests/shared/*`

**Step 1: Write the failing tests**

Create service/store tests for logger, question engine, progression, and Dexie-backed data service contracts.

**Step 2: Run tests to verify they fail**

Run: `npm test -- --runInBand`

Expected: test failures due to missing modules.

**Step 3: Write minimal implementation**

Add the Vite app shell, domain types, store primitives, data service abstraction, shared constants, and utility modules needed by every feature.

**Step 4: Run tests to verify they pass**

Run: `npm test -- --runInBand`

Expected: foundational tests pass.

### Task 2: Core Menu, Onboarding, Settings, And Basic Practice

**Files:**
- Create: `src/features/menu/*`
- Create: `src/features/onboarding/*`
- Create: `src/features/basic-practice/*`
- Modify: `src/app/App.tsx`
- Modify: `src/app/AppShell.tsx`
- Test: `tests/features/basic-practice/*`
- Test: `tests/features/menu/*`

**Step 1: Write the failing tests**

Cover initial onboarding visibility, tutorial skip/retrigger, main menu navigation, and basic practice letter/word/phrase flows with feedback states.

**Step 2: Run test to verify it fails**

Run: `npm test -- tests/features/basic-practice`

Expected: failures because feature components do not exist.

**Step 3: Write minimal implementation**

Build the main menu, module cards, tutorial overlay, sound/colorblind settings, and the full basic practice loop with target prompts, keyboard guidance, success/error feedback, and session completion.

**Step 4: Run tests to verify it passes**

Run: `npm test -- tests/features/basic-practice tests/features/menu`

Expected: pass.

### Task 3: Heatmap, Stats, Export/Reset, Smart Questioning, Progression

**Files:**
- Create: `src/features/heatmap/*`
- Modify: `src/shared/services/*`
- Modify: `src/shared/stores/*`
- Modify: `src/shared/constants/*`
- Test: `tests/features/heatmap/*`
- Test: `tests/shared/services/*`

**Step 1: Write the failing tests**

Cover realtime stat aggregation, heatmap rendering inputs, key-level mapping, weakest-key recommendations, unlock conditions, achievement generation, and export/reset behavior.

**Step 2: Run tests to verify they fail**

Run: `npm test -- tests/shared/services tests/features/heatmap`

Expected: failures for missing stats/progression behaviors.

**Step 3: Write minimal implementation**

Implement the Dexie aggregation pipeline, live heatmap data, detail drawer, trend chart, smart selection engine, weakest-key recommendations, unlock rules, achievement list, and import/export/reset controls.

**Step 4: Run tests to verify they pass**

Run: `npm test -- tests/shared/services tests/features/heatmap`

Expected: pass.

### Task 4: Phaser Game Integration And Fruit Ninja

**Files:**
- Create: `src/phaser/*`
- Create: `src/features/fruit-ninja/*`
- Modify: `src/shared/services/*`
- Test: `tests/features/fruit-ninja/*`
- Test: `tests/phaser/*`

**Step 1: Write the failing tests**

Cover scene lifecycle, keyboard bridge registration, fruit spawn selection, scoring/combo rules, bomb penalties, difficulty presets, and game-over summaries.

**Step 2: Run tests to verify they fail**

Run: `npm test -- tests/features/fruit-ninja tests/phaser`

Expected: failures due to missing Phaser integration.

**Step 3: Write minimal implementation**

Add a reusable Phaser wrapper, scene bridge, synthesized audio hooks, and the complete fruit slicing mode with spawn loop, combo scoring, bomb avoidance, smart-letter weighting, animations, and end-of-run stats persistence.

**Step 4: Run tests to verify they pass**

Run: `npm test -- tests/features/fruit-ninja tests/phaser`

Expected: pass.

### Task 5: Space Invaders Typing Mode

**Files:**
- Create: `src/features/space-invaders/*`
- Modify: `src/phaser/*`
- Modify: `src/shared/services/*`
- Test: `tests/features/space-invaders/*`

**Step 1: Write the failing tests**

Cover word selection, typed progress tracking, word completion firing, ship destruction, fail state, boss-level spawning, difficulty routing, and session stats recording.

**Step 2: Run tests to verify they fail**

Run: `npm test -- tests/features/space-invaders`

Expected: failures for missing mode implementation.

**Step 3: Write minimal implementation**

Implement the space-invaders mode with word-based enemies, input lock-on behavior, completion shots, boss rounds, difficulty presets, smart-word weighting, and post-game summary integration.

**Step 4: Run tests to verify they pass**

Run: `npm test -- tests/features/space-invaders`

Expected: pass.

### Task 6: End-To-End Verification, Review, And Sprint Sync

**Files:**
- Modify: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- Create: `_bmad-output/implementation-artifacts/review-report.md`
- Modify: `docs/plans/2026-03-16-max-typer-full-implementation.md`

**Step 1: Write verification checklist**

Create a checklist covering all epic/story acceptance outcomes and commands required for proof.

**Step 2: Run verification**

Run: `npm run test`, `npm run build`, and any lint/typecheck commands added by the implementation.

Expected: clean passing output.

**Step 3: Perform code review**

Execute adversarial review against all created source files, fix every real issue, and record the final findings report.

**Step 4: Sync status**

Update all story statuses and epic statuses to `done` only when implementation, tests, and review are complete.
