export const createId = (prefix: string) => {
  const globalCrypto = globalThis.crypto

  if (globalCrypto?.randomUUID) {
    return `${prefix}-${globalCrypto.randomUUID()}`
  }

  return `${prefix}-${Math.random().toString(36).slice(2)}`
}
