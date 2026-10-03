/** Extrae un mensaje usable de errores serializados por IPC / Electron. */
export function errorMessage(e: unknown, fallback: string): string {
  if (e instanceof Error && e.message.trim()) return e.message
  if (typeof e === 'string' && e.trim()) return e
  if (e && typeof e === 'object' && 'message' in e) {
    const m = String((e as { message: unknown }).message ?? '').trim()
    if (m) return m
  }
  return fallback
}
