import Phaser from 'phaser'

import type { InvaderShip } from '@/features/space-invaders/spaceInvadersModel'
import {
  advanceWordInput,
  buildInvaderWave,
  createInvaderState,
  getInvaderCadence,
  getInvaderPacingProfile,
} from '@/features/space-invaders/spaceInvadersModel'
import type { KeyboardSnapshot, PracticeDifficulty, WordEntry } from '@/shared/types/domain'

interface SpaceStrokeEvent {
  expected: string
  input: string
  correct: boolean
  reactionMs: number
  score: number
}

interface EncounterStatus {
  title: string
  detail: string
  tone: 'pace' | 'warning' | 'boss'
}

interface SceneCallbacks {
  difficulty: PracticeDifficulty
  snapshot: KeyboardSnapshot
  timedSession: boolean
  words: WordEntry[]
  onStroke: (event: SpaceStrokeEvent) => void
  onStatusChange: (status: EncounterStatus) => void
  onComplete: (payload: {
    destroyed: number
    score: number
    bossDefeated: boolean
    reason?: 'natural' | 'timeout'
  }) => void
}

interface ShipVisual {
  id: string
  container: Phaser.GameObjects.Container
  body: Phaser.GameObjects.Rectangle
  text: Phaser.GameObjects.Text
  y: number
  speed: number
  laneIndex: number
  isBoss: boolean
}

export class SpaceInvadersScene extends Phaser.Scene {
  private readonly callbacks: SceneCallbacks
  private visuals = new Map<string, ShipVisual>()
  private state = createInvaderState([])
  private pendingShips: InvaderShip[] = []
  private lastInputAt = performance.now()
  private lastSpawnAt = 0
  private bossSpawned = false
  private destroyed = 0
  private completed = false
  private launchedShips = 0
  private totalShips = 0

  public constructor(callbacks: SceneCallbacks) {
    super({ key: 'SpaceInvadersScene' })
    this.callbacks = callbacks
  }

  public create() {
    this.cameras.main.setBackgroundColor('#08111f')

    const stars = this.add.graphics()
    stars.fillStyle(0xffffff, 0.1)
    for (let index = 0; index < 80; index += 1) {
      stars.fillCircle(
        Phaser.Math.Between(0, this.scale.width),
        Phaser.Math.Between(0, this.scale.height),
        Phaser.Math.Between(1, 2),
      )
    }

    this.add.text(24, 22, '输入完整单词击落飞船，敌机会按节奏逐步压进，Boss 会在最后登场。', {
      color: '#f8fafc',
      fontFamily: 'Trebuchet MS',
      fontSize: '18px',
      fontStyle: 'bold',
    })

    this.startNormalCycle()
  }

  public handleKey(key: string) {
    if (this.completed || key.length !== 1 || this.state.ships.length === 0) {
      return
    }

    const currentState = this.state
    const focusShip =
      (currentState.focusId &&
        currentState.ships.find((ship) => ship.id === currentState.focusId)) ||
      currentState.ships.find((ship) => ship.value[0]?.toLowerCase() === key) ||
      currentState.ships[0]

    const expected = focusShip.value[focusShip.progress]?.toLowerCase() ?? key
    this.state = advanceWordInput(currentState, key)
    this.syncShips()

    const reactionMs = Math.max(50, Math.round(performance.now() - this.lastInputAt))
    this.lastInputAt = performance.now()
    const destroyedThisTurn = this.state.destroyedIds.length > currentState.destroyedIds.length

    if (destroyedThisTurn) {
      this.destroyed += 1
      this.cameras.main.shake(120, 0.004)
    }

    this.callbacks.onStroke({
      expected,
      input: key,
      correct: expected === key,
      reactionMs,
      score: this.state.score,
    })

    this.refreshEncounterFlow(this.state.ships.length === 0)
    this.emitStatus()
  }

  public update(_: number, delta: number) {
    if (this.completed) {
      return
    }

    this.refreshEncounterFlow()

    const cadence = this.bossSpawned
      ? null
      : getInvaderCadence({
          difficulty: this.callbacks.difficulty,
          launchedShips: this.launchedShips,
          totalShips: this.totalShips,
        })

    for (const ship of this.visuals.values()) {
      if (!ship.isBoss && cadence) {
        ship.speed = cadence.speed
      }

      ship.y += ship.speed * (delta / 1000)
      ship.container.y = ship.y

      if (ship.y >= this.scale.height - 80) {
        if (this.callbacks.timedSession) {
          this.startNormalCycle()
        } else {
          this.finish(false, 'natural')
        }
        return
      }
    }
  }

  public finishEarly() {
    this.finish(false, 'timeout')
  }

  private startNormalCycle() {
    const { difficulty, snapshot, words } = this.callbacks
    const { waveSize } = getInvaderPacingProfile(difficulty)
    const ships = buildInvaderWave({
      snapshot,
      words,
      difficulty,
      size: waveSize,
    })

    this.bossSpawned = false
    this.pendingShips = ships
    this.launchedShips = 0
    this.totalShips = ships.length
    this.lastSpawnAt = 0
    this.setShips([])
    this.syncShips()
    this.maybeSpawnNextShip(true)
    this.emitStatus()
  }

  private spawnBoss() {
    this.bossSpawned = true
    const bossWord =
      [...this.callbacks.words]
        .filter((entry) => entry.difficulty === 'challenge')
        .sort((left, right) => right.value.length - left.value.length)[0] ?? {
        value: 'rocket',
        difficulty: 'challenge',
        tags: ['fallback'],
      }

    const boss: InvaderShip = {
      id: 'boss-1',
      value: bossWord.value,
      progress: 0,
      isBoss: true,
    }

    this.setShips([boss])
    this.mountShip(boss, getInvaderPacingProfile(this.callbacks.difficulty).maxSpeed * 0.75, true)
    this.syncShips()
    this.emitStatus()
  }

  private setShips(ships: InvaderShip[]) {
    this.state = {
      ...createInvaderState(ships),
      score: this.state.score,
      destroyedIds: this.state.destroyedIds,
    }
    this.lastInputAt = performance.now()
  }

  private refreshEncounterFlow(forceSpawn = false) {
    if (this.completed) {
      return
    }

    if (!this.bossSpawned) {
      this.maybeSpawnNextShip(forceSpawn)

      if (this.state.ships.length === 0 && this.pendingShips.length === 0) {
        this.spawnBoss()
      }

      return
    }

    if (this.state.ships.length === 0) {
      if (this.callbacks.timedSession) {
        this.startNormalCycle()
      } else {
        this.finish(true, 'natural')
      }
    }
  }

  private maybeSpawnNextShip(forceSpawn = false) {
    if (this.bossSpawned || this.pendingShips.length === 0) {
      return
    }

    const cadence = getInvaderCadence({
      difficulty: this.callbacks.difficulty,
      launchedShips: this.launchedShips,
      totalShips: this.totalShips,
    })

    if (this.state.ships.length >= cadence.activeLimit) {
      return
    }

    const now = performance.now()
    const shouldSpawn =
      forceSpawn ||
      this.state.ships.length === 0 ||
      this.lastSpawnAt === 0 ||
      now - this.lastSpawnAt >= cadence.spawnIntervalMs

    if (!shouldSpawn) {
      return
    }

    const nextShip = this.pendingShips.shift()

    if (!nextShip) {
      return
    }

    this.lastSpawnAt = now
    this.launchedShips += 1
    this.state = {
      ...this.state,
      ships: [...this.state.ships, nextShip],
    }
    this.mountShip(nextShip, cadence.speed)
    this.syncShips()
    this.emitStatus()
  }

  private mountShip(ship: InvaderShip, speed: number, boss = false) {
    if (boss) {
      this.visuals.forEach((visual) => visual.container.destroy())
      this.visuals.clear()
    }

    const laneIndex = boss ? -1 : this.getAvailableLaneIndex()
    const x = boss ? this.scale.width / 2 : this.getLaneX(laneIndex)
    const y = boss ? 120 : 110
    const body = this.add.rectangle(
      0,
      0,
      boss ? 170 : 130,
      boss ? 74 : 58,
      boss ? 0xef476f : 0x264653,
      0.95,
    )
    body.setStrokeStyle(3, boss ? 0xffd166 : 0x8ecae6)

    const text = this.add.text(0, 0, ship.value.toUpperCase(), {
      color: '#f8fafc',
      fontFamily: 'Trebuchet MS',
      fontSize: boss ? '26px' : '20px',
      fontStyle: 'bold',
    })
    text.setOrigin(0.5)

    const container = this.add.container(x, y, [body, text])

    this.visuals.set(ship.id, {
      id: ship.id,
      container,
      body,
      text,
      y,
      speed,
      laneIndex,
      isBoss: boss,
    })
  }

  private syncShips() {
    const activeIds = new Set(this.state.ships.map((ship) => ship.id))

    for (const [id, visual] of this.visuals.entries()) {
      const ship = this.state.ships.find((entry) => entry.id === id)

      if (!ship) {
        this.tweens.add({
          targets: visual.container,
          alpha: 0,
          y: visual.y - 24,
          duration: 220,
          onComplete: () => {
            visual.container.destroy()
          },
        })
        this.visuals.delete(id)
        continue
      }

      const typed = ship.value.slice(0, ship.progress).toUpperCase()
      const remaining = ship.value.slice(ship.progress).toUpperCase()
      visual.text.setText(`${typed}|${remaining}`)
      visual.body.setFillStyle(
        ship.isBoss ? 0xef476f : ship.id === this.state.focusId ? 0x2a9d8f : 0x264653,
      )
    }

    if (activeIds.size === 0) {
      this.visuals.forEach((ship) => ship.container.destroy())
      this.visuals.clear()
    }
  }

  private emitStatus() {
    if (this.completed) {
      return
    }

    if (this.bossSpawned) {
      this.callbacks.onStatusChange({
        title: 'Boss 登场',
        detail: '锁定长单词，稳住输出节奏完成最后收尾。',
        tone: 'boss',
      })
      return
    }

    const cadence = getInvaderCadence({
      difficulty: this.callbacks.difficulty,
      launchedShips: this.launchedShips,
      totalShips: this.totalShips,
    })
    const activeShips = this.state.ships.length
    const remainingShips = this.pendingShips.length
    const bossIncoming = remainingShips === 0 && activeShips <= 1 && this.launchedShips >= this.totalShips

    if (bossIncoming) {
      this.callbacks.onStatusChange({
        title: 'Boss 前过渡波',
        detail: '清掉当前敌机后，Boss 就会登场。',
        tone: 'warning',
      })
      return
    }

    this.callbacks.onStatusChange({
      title: `节奏推进 ${Math.min(this.launchedShips, this.totalShips)} / ${Math.max(1, this.totalShips)}`,
      detail: `同屏上限 ${cadence.activeLimit} 架，后面的敌机会更快更密。`,
      tone: 'pace',
    })
  }

  private getAvailableLaneIndex() {
    const laneCount = getInvaderPacingProfile(this.callbacks.difficulty).maxConcurrent
    const occupied = new Set(
      [...this.visuals.values()]
        .filter((visual) => !visual.isBoss)
        .map((visual) => visual.laneIndex),
    )

    for (let laneIndex = 0; laneIndex < laneCount; laneIndex += 1) {
      if (!occupied.has(laneIndex)) {
        return laneIndex
      }
    }

    return 0
  }

  private getLaneX(laneIndex: number) {
    const laneCount = getInvaderPacingProfile(this.callbacks.difficulty).maxConcurrent
    return (this.scale.width / (laneCount + 1)) * (laneIndex + 1)
  }

  private finish(bossDefeated: boolean, reason: 'natural' | 'timeout') {
    if (this.completed) {
      return
    }

    this.completed = true
    this.callbacks.onComplete({
      destroyed: this.destroyed,
      score: this.state.score,
      bossDefeated,
      reason,
    })
    this.scene.pause()
  }
}
