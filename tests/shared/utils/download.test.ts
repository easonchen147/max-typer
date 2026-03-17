import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { downloadTextFile } from '@/shared/utils/download'

describe('downloadTextFile', () => {
  const originalCreateObjectURL = URL.createObjectURL
  const originalRevokeObjectURL = URL.revokeObjectURL

  beforeEach(() => {
    vi.useFakeTimers()
    URL.createObjectURL = vi.fn(() => 'blob:max-typer-export')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
    URL.createObjectURL = originalCreateObjectURL
    URL.revokeObjectURL = originalRevokeObjectURL
    vi.restoreAllMocks()
  })

  it('creates and revokes an object url after triggering the download', () => {
    const appendSpy = vi.spyOn(document.body, 'append')
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    const downloaded = downloadTextFile({
      filename: 'export.json',
      content: '{"ok":true}',
      type: 'application/json',
    })

    expect(downloaded).toBe(true)
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    expect(appendSpy).toHaveBeenCalledTimes(1)

    const anchor = appendSpy.mock.calls[0][0] as HTMLAnchorElement
    expect(anchor.download).toBe('export.json')
    expect(anchor.href).toBe('blob:max-typer-export')
    expect(clickSpy).toHaveBeenCalledTimes(1)

    vi.runAllTimers()

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:max-typer-export')
  })
})
