type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const shouldLog = (level: LogLevel) => {
  if (import.meta.env.DEV) {
    return true
  }

  return level === 'warn' || level === 'error'
}

const formatPrefix = (module: string) => `[${module}]`

const write = (level: LogLevel, module: string, message: string, error?: unknown) => {
  if (!shouldLog(level)) {
    return
  }

  const prefix = formatPrefix(module)
  const payload = error ? [prefix, message, error] : [prefix, message]

  switch (level) {
    case 'debug':
    case 'info':
      console.info(...payload)
      break
    case 'warn':
      console.warn(...payload)
      break
    case 'error':
      console.error(...payload)
      break
  }
}

export const logger = {
  debug: (module: string, message: string, error?: unknown) => write('debug', module, message, error),
  info: (module: string, message: string, error?: unknown) => write('info', module, message, error),
  warn: (module: string, message: string, error?: unknown) => write('warn', module, message, error),
  error: (module: string, message: string, error?: unknown) => write('error', module, message, error),
}
