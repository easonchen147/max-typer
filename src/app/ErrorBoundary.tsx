import { Component, type ErrorInfo, type ReactNode } from 'react'

import { logger } from '@/shared/utils/logger'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
  }

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  public componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('ErrorBoundary', '界面发生异常', { error, info })
  }

  public render() {
    if (this.state.hasError) {
      return (
        <main className="error-fallback">
          <p className="eyebrow">系统调整中</p>
          <h1>我们正在把训练台重新点亮</h1>
          <p>刷新页面后继续练习，已记录调试信息。</p>
        </main>
      )
    }

    return this.props.children
  }
}
