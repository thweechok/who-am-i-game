'use client';
// Synthesized sounds using Web Audio API - no audio files needed
let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return ctx;
  } catch { return null; }
}

function tone(freq: number, start: number, duration: number, vol = 0.3, type: OscillatorType = 'sine') {
  const c = getCtx(); if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain); gain.connect(c.destination);
  osc.frequency.value = freq;
  osc.type = type;
  gain.gain.setValueAtTime(vol, c.currentTime + start);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + duration);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + duration + 0.01);
}

export function playSound(type: 'question' | 'correct' | 'wrong' | 'tick' | 'timeup' | 'join' | 'reveal') {
  try {
    switch (type) {
      case 'question': tone(440, 0, 0.12); tone(660, 0.13, 0.12); break;
      case 'correct': tone(523, 0, 0.15); tone(659, 0.05, 0.15); tone(784, 0.1, 0.4); break;
      case 'wrong': tone(300, 0, 0.15, 0.4, 'sawtooth'); tone(150, 0.15, 0.2, 0.3, 'sawtooth'); break;
      case 'tick': tone(800, 0, 0.04, 0.15); break;
      case 'timeup': [0,0.15,0.3,0.45].forEach(t => tone(880, t, 0.1, 0.4)); break;
      case 'join': tone(600, 0, 0.1); tone(900, 0.1, 0.15); break;
      case 'reveal': [400,500,600,700,800].forEach((f,i) => tone(f, i*0.06, 0.15, 0.2)); break;
    }
  } catch {}
}
