interface DownloadTextFileInput {
  filename: string
  content: string
  type?: string
}

export const downloadTextFile = ({
  filename,
  content,
  type = 'text/plain;charset=utf-8',
}: DownloadTextFileInput) => {
  if (typeof document === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined') {
    return false
  }

  const blob = new Blob([content], { type })
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')

  anchor.href = objectUrl
  anchor.download = filename
  anchor.rel = 'noopener'
  anchor.style.display = 'none'

  document.body.append(anchor)
  anchor.click()
  anchor.remove()

  setTimeout(() => {
    URL.revokeObjectURL(objectUrl)
  }, 0)

  return true
}
