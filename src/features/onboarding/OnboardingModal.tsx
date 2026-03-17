interface OnboardingModalProps {
  open: boolean
  onClose: () => void
}

const onboardingSteps = [
  '先在训练模式里选好难度和时长，完成今天的第一轮训练。',
  '训练结束后去个人数据页看键盘地图，确认最不稳定的字母。',
  '再从数据页直接进入专项练习，把薄弱点重新带回训练闭环。',
] as const

export const OnboardingModal = ({ onClose, open }: OnboardingModalProps) => {
  if (!open) {
    return null
  }

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true">
      <section className="onboarding-modal">
        <p className="eyebrow">欢迎登岛</p>
        <h2 data-testid="onboarding-title">这不是单个小游戏，而是一套会持续升级的训练循环。</h2>
        <ol className="onboarding-modal__list">
          {onboardingSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        <div className="onboarding-modal__actions">
          <button className="toolbar-toggle" onClick={onClose} type="button">
            开始训练
          </button>
          <button
            className="toolbar-toggle toolbar-toggle--ghost"
            data-testid="onboarding-skip"
            onClick={onClose}
            type="button"
          >
            稍后再看
          </button>
        </div>
      </section>
    </div>
  )
}
