let audioCtx = null;
function getCtx() {
    if (!audioCtx)
        audioCtx = new AudioContext();
    return audioCtx;
}
function beep(frequency, durationMs, volume = 0.15) {
    try {
        const ctx = getCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = frequency;
        gain.gain.value = volume;
        osc.start();
        osc.stop(ctx.currentTime + durationMs / 1000);
    }
    catch {
        // sin audio en algunos entornos
    }
}
export function playScanSound() {
    beep(880, 80);
}
export function playSuccessSound() {
    beep(523, 100);
    setTimeout(() => beep(659, 120), 110);
}
export function playErrorSound() {
    beep(220, 200);
}
