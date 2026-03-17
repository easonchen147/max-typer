import { VirtualKeyboard } from '@/shared/components/VirtualKeyboard'
import { useKeyboard } from '@/shared/hooks/useKeyboard'

interface LandingScreenProps {
  onEnter: () => void
}

const featureChips = ['完整主键区', '三种模式全开放', '数据驱动专项练习'] as const

const flowSteps = [
  '先进入训练主界面，选择今天的难度与时长。',
  '完成一轮训练后，回到个人数据页查看最不稳定的键位。',
  '再从键盘地图直接开启专项练习，形成持续升级的闭环。',
] as const

export const LandingScreen = ({ onEnter }: LandingScreenProps) => {
  useKeyboard({
    onKey: (key) => {
      if (key === 'enter') {
        onEnter()
      }
    },
  })

  return (
    <section className="landing-screen">
      <div className="landing-screen__content">
        <div className="landing-screen__copy">
          <p className="eyebrow">Max Typer</p>
          <h1>把键盘训练做成一套能持续升级的小游戏系统。</h1>
          <p className="landing-screen__lead">
            三种训练模式共享同一张键盘地图和同一套结算节奏，孩子不会只是在“玩一个小游戏”，而是在一条完整训练路径里持续进步。
          </p>

          <div className="landing-screen__chips">
            {featureChips.map((chip) => (
              <span className="landing-screen__chip" key={chip}>
                {chip}
              </span>
            ))}
          </div>

          <div className="landing-screen__actions">
            <button
              className="cta-button"
              data-testid="landing-enter-button"
              onClick={onEnter}
              type="button"
            >
              进入主界面
            </button>
            <p className="landing-screen__hint">桌面端支持直接按 Enter 进入，移动端保留显式入口。</p>
          </div>
        </div>

        <div className="landing-screen__preview">
          <div className="landing-screen__preview-card">
            <p className="eyebrow">训练路径</p>
            <h2>先训练，再诊断，再回到专项练习。</h2>
            <ol className="landing-screen__steps">
              {flowSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="landing-screen__preview-card">
            <p className="eyebrow">实时反馈预览</p>
            <p>
              目标键会持续发光，按错的物理键也会立刻出现错误脉冲，帮助玩家建立真实键位的空间感和手指路线。
            </p>
          </div>

          <VirtualKeyboard activeKey="x" pressedKey="x" variant="hero" wrongKey=";" />
        </div>
      </div>
    </section>
  )
}
