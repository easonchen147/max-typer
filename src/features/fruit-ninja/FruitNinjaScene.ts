import Phaser from 'phaser'

import type { FruitSpawn } from '@/features/fruit-ninja/fruitNinjaModel'
import type { PracticeDifficulty } from '@/shared/types/domain'

interface FruitSceneEvent {
  kind: 'fruit' | 'bomb' | 'miss'
  expected: string
  input: string
  reactionMs: number
}

interface FruitSceneConfig {
  difficulty: PracticeDifficulty
  sequence: FruitSpawn[]
  timedSession: boolean
  onEvent: (event: FruitSceneEvent) => void
  onComplete: (payload?: { reason: 'natural' | 'timeout' }) => void
}

interface ActiveFruit {
  id: string
  type: 'fruit' | 'bomb'
  letter: string
  bornAt: number
  container: Phaser.GameObjects.Container
  label: Phaser.GameObjects.Text
  vx: number
  vy: number
}

const settingsByDifficulty: Record<PracticeDifficulty, { spawnEveryMs: number }> = {
  starter: { spawnEveryMs: 900 },
  standard: { spawnEveryMs: 700 },
  challenge: { spawnEveryMs: 520 },
}

export class FruitNinjaScene extends Phaser.Scene {
  private readonly config: FruitSceneConfig
  private activeItems: ActiveFruit[] = []
  private elapsedSinceSpawn = 0
  private nextSpawnIndex = 0
  private completed = false

  public constructor(config: FruitSceneConfig) {
    super({ key: 'FruitNinjaScene' })
    this.config = config
  }

  public create() {
    this.cameras.main.setBackgroundColor('#10233f')

    const accent = this.add.graphics()
    accent.fillGradientStyle(0x219ebc, 0xef6c57, 0x264653, 0x10233f, 0.85, 0.75, 0.5, 1)
    accent.fillRect(0, 0, this.scale.width, this.scale.height)
    accent.setAlpha(0.2)

    this.add.text(26, 22, '按下对应字母切开水果，炸弹会清空连击。', {
      color: '#f8fafc',
      fontFamily: 'Trebuchet MS',
      fontSize: '18px',
      fontStyle: 'bold',
    })
  }

  public handleKey(key: string) {
    if (this.completed || key.length !== 1) {
      return
    }

    const match = this.activeItems
      .filter((item) => item.letter === key)
      .sort((left, right) => left.bornAt - right.bornAt)[0]

    if (!match) {
      const expected = this.activeItems.find((item) => item.type === 'fruit')?.letter ?? key
      this.config.onEvent({
        kind: 'miss',
        expected,
        input: key,
        reactionMs: 0,
      })
      return
    }

    const reactionMs = Math.max(50, Math.round(performance.now() - match.bornAt))
    this.removeItem(match, match.type === 'bomb' ? 0xdd6b20 : 0x90be6d)

    if (match.type === 'bomb') {
      this.cameras.main.shake(160, 0.008)
    }

    this.config.onEvent({
      kind: match.type,
      expected: match.letter,
      input: key,
      reactionMs,
    })
  }

  public update(_: number, delta: number) {
    if (this.completed) {
      return
    }

    const { spawnEveryMs } = settingsByDifficulty[this.config.difficulty]

    this.elapsedSinceSpawn += delta
    if (
      this.nextSpawnIndex < this.config.sequence.length &&
      this.elapsedSinceSpawn >= spawnEveryMs
    ) {
      this.spawnItem(this.config.sequence[this.nextSpawnIndex])
      this.nextSpawnIndex += 1
      this.elapsedSinceSpawn = 0
    }

    const gravity = 420
    const width = this.scale.width
    const height = this.scale.height

    for (const item of [...this.activeItems]) {
      item.vy += gravity * (delta / 1000)
      item.container.x += item.vx * (delta / 1000)
      item.container.y += item.vy * (delta / 1000)
      item.container.rotation += 0.8 * (delta / 1000)

      if (item.container.x < -60 || item.container.x > width + 60 || item.container.y > height + 100) {
        this.activeItems = this.activeItems.filter((entry) => entry.id !== item.id)
        item.container.destroy()

        if (item.type === 'fruit') {
          this.config.onEvent({
            kind: 'miss',
            expected: item.letter,
            input: '',
            reactionMs: 0,
          })
        }
      }
    }

    if (
      this.nextSpawnIndex >= this.config.sequence.length &&
      this.activeItems.length === 0 &&
      !this.completed
    ) {
      if (this.config.timedSession) {
        this.nextSpawnIndex = 0
        return
      }

      this.completed = true
      this.config.onComplete({ reason: 'natural' })
    }
  }

  public finishEarly() {
    if (this.completed) {
      return
    }

    this.completed = true
    this.config.onComplete({ reason: 'timeout' })
  }

  private spawnItem(spawn: FruitSpawn) {
    const x = Phaser.Math.Between(90, this.scale.width - 90)
    const y = this.scale.height + 64
    const background = this.add.circle(
      0,
      0,
      spawn.type === 'bomb' ? 42 : 38,
      spawn.type === 'bomb' ? 0x403d39 : 0xf4a261,
    )
    background.setStrokeStyle(4, spawn.type === 'bomb' ? 0xe9c46a : 0xf6f4d2)

    const label = this.add.text(0, 0, spawn.letter.toUpperCase(), {
      color: '#0f172a',
      fontFamily: 'Trebuchet MS',
      fontSize: spawn.type === 'bomb' ? '28px' : '30px',
      fontStyle: 'bold',
    })
    label.setOrigin(0.5)

    const container = this.add.container(x, y, [background, label])

    this.activeItems.push({
      id: spawn.id,
      type: spawn.type,
      letter: spawn.letter,
      bornAt: performance.now(),
      container,
      label,
      vx: Phaser.Math.Between(-110, 110),
      vy: Phaser.Math.Between(-620, -520),
    })
  }

  private removeItem(item: ActiveFruit, tint: number) {
    this.activeItems = this.activeItems.filter((entry) => entry.id !== item.id)
    item.label.setColor('#fff7ed')

    this.tweens.add({
      targets: item.container,
      alpha: 0,
      duration: 180,
      scale: 1.45,
      onStart: () => {
        item.container.iterate((child: Phaser.GameObjects.GameObject) => {
          if ('setTint' in child && typeof child.setTint === 'function') {
            child.setTint(tint)
          }
        })
      },
      onComplete: () => {
        item.container.destroy()
      },
    })
  }
}
