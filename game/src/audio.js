// WebAudio synthesis for Tidebound Duel. No external files; created on first user gesture.
let ctx = null;
let enabled = true;

export function initAudio() {
  if (ctx) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    ctx = new Ctx();
  } catch (_) {
    ctx = null;
  }
}

export function resumeAudio() {
  initAudio();
  if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
}

function beep({ freq = 440, freq2 = null, dur = 0.12, type = 'sine', gain = 0.08, attack = 0.005, decay = 0.1, detune = 0 }) {
  if (!enabled || !ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (freq2) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq2), now + dur);
    if (detune) osc.detune.value = detune;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(gain, now + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  } catch (_) {}
}

function noise(dur = 0.15, gain = 0.04) {
  if (!enabled || !ctx) return;
  try {
    const n = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const g = ctx.createGain();
    const now = ctx.currentTime;
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(g);
    g.connect(ctx.destination);
    src.start(now);
  } catch (_) {}
}

export function sfxDraw() {
  beep({ freq: 520, freq2: 780, dur: 0.08, type: 'triangle', gain: 0.045 });
}

export function sfxPlay() {
  beep({ freq: 330, freq2: 520, dur: 0.12, type: 'sine', gain: 0.06 });
  beep({ freq: 660, freq2: 440, dur: 0.1, type: 'triangle', gain: 0.03, attack: 0.01 });
}

export function sfxDamage() {
  noise(0.12, 0.05);
  beep({ freq: 160, freq2: 70, dur: 0.18, type: 'sawtooth', gain: 0.05 });
}

export function sfxHeal() {
  beep({ freq: 440, freq2: 880, dur: 0.18, type: 'sine', gain: 0.045 });
}

export function sfxWin() {
  [523, 659, 784, 1047].forEach((f, i) => {
    setTimeout(() => beep({ freq: f, freq2: f * 1.01, dur: 0.25, type: 'triangle', gain: 0.05 }), i * 110);
  });
}

export function sfxLoss() {
  [392, 330, 262, 196].forEach((f, i) => {
    setTimeout(() => beep({ freq: f, freq2: f * 0.98, dur: 0.3, type: 'sawtooth', gain: 0.035 }), i * 130);
  });
}

export function sfxPass() {
  beep({ freq: 220, freq2: 180, dur: 0.08, type: 'square', gain: 0.02 });
}

export function toggleAudio() {
  enabled = !enabled;
  return enabled;
}
