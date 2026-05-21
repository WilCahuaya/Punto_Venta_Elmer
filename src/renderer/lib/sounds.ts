let audioCtx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  return audioCtx
}

function beep(frequency: number, durationMs: number, volume = 0.15): void {
  try {
    const ctx = getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = frequency
    gain.gain.value = volume
    osc.start()
    osc.stop(ctx.currentTime + durationMs / 1000)
  } catch {
    // sin audio en algunos entornos
  }
}

export function playScanSound(): void {
  beep(880, 80)
}

export function playSuccessSound(): void {
  beep(523, 100)
  setTimeout(() => beep(659, 120), 110)
}

export function playErrorSound(): void {
  beep(220, 200)
}
