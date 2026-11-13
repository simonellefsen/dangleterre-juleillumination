// Music for the scene.
// If a file exists at audio/music.mp3 (drop in a recording you hold a licence for), it is played.
// Otherwise a soft choir-like arrangement of "Glade jul" / "Silent Night" (Gruber, 1818 —
// public domain) is synthesised live with the Web Audio API.

const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const hz = (name) => {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name);
  const semi = NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) + 1) * 12;
  return 440 * Math.pow(2, (semi - 69) / 12);
};

// Melody in C major, durations in eighth notes (6/8).
const MELODY = [
  ['G4', 3], ['A4', 1], ['G4', 2], ['E4', 6],
  ['G4', 3], ['A4', 1], ['G4', 2], ['E4', 6],
  ['D5', 4], ['D5', 2], ['B4', 6],
  ['C5', 4], ['C5', 2], ['G4', 6],
  ['A4', 4], ['A4', 2], ['C5', 3], ['B4', 1], ['A4', 2],
  ['G4', 3], ['A4', 1], ['G4', 2], ['E4', 6],
  ['A4', 4], ['A4', 2], ['C5', 3], ['B4', 1], ['A4', 2],
  ['G4', 3], ['A4', 1], ['G4', 2], ['E4', 6],
  ['D5', 4], ['D5', 2], ['F5', 3], ['D5', 1], ['B4', 2],
  ['C5', 6], ['E5', 6],
  ['C5', 2], ['G4', 2], ['E4', 2], ['G4', 3], ['F4', 1], ['D4', 2],
  ['C4', 6], [null, 6],
];

const CHORDS = {
  C: { bass: 'C3', pad: ['G3', 'C4', 'E4'] },
  G: { bass: 'G2', pad: ['G3', 'B3', 'D4'] },
  G7: { bass: 'G2', pad: ['F3', 'B3', 'D4'] },
  F: { bass: 'F2', pad: ['A3', 'C4', 'F4'] },
};
// One chord per bar (24 bars).
const BARS = ['C', 'C', 'C', 'C', 'G', 'G', 'C', 'C', 'F', 'F', 'C', 'C',
  'F', 'F', 'C', 'C', 'G', 'G7', 'C', 'C', 'C', 'G7', 'C', 'C'];

const EIGHTH = 0.46; // seconds
const BAR = EIGHTH * 6;

export class Music {
  constructor() {
    this.ctx = null;
    this.el = null;
    this.muted = false;
    this.timer = null;
  }

  static async hasCustomTrack() {
    try {
      const r = await fetch('audio/music.mp3', { method: 'HEAD' });
      return r.ok && !(r.headers.get('content-type') || '').includes('text/html');
    } catch { return false; }
  }

  async start() {
    if (await Music.hasCustomTrack()) {
      this.el = new Audio('audio/music.mp3');
      this.el.loop = true;
      this.el.volume = 0;
      await this.el.play();
      const t0 = performance.now();
      const fade = () => {
        const k = Math.min(1, (performance.now() - t0) / 3000);
        if (!this.muted) this.el.volume = 0.9 * k;
        if (k < 1) requestAnimationFrame(fade);
      };
      fade();
      return;
    }
    const ctx = this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    await ctx.resume();

    this.master = ctx.createGain();
    this.master.gain.value = 0.0;
    this.master.gain.linearRampToValueAtTime(0.85, ctx.currentTime + 3);
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);

    // A big, soft hall: generated impulse response.
    const len = Math.floor(ctx.sampleRate * 4.2);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    const verb = ctx.createConvolver(); verb.buffer = ir;
    const wet = ctx.createGain(); wet.gain.value = 0.55;
    const dry = ctx.createGain(); dry.gain.value = 0.5;
    this.bus = ctx.createGain();
    this.bus.connect(dry).connect(this.master);
    this.bus.connect(verb).connect(wet).connect(this.master);

    this.nextLoop = ctx.currentTime + 0.4;
    const pump = () => {
      while (this.nextLoop < ctx.currentTime + 6) {
        this.scheduleVerse(this.nextLoop);
        this.nextLoop += BARS.length * BAR + BAR; // one bar of breath between verses
      }
    };
    pump();
    this.timer = setInterval(pump, 1500);
  }

  // A treble "ooh": a few detuned voices through vowel formants, with slow vibrato.
  voice(freq, t, dur, { gain = 0.2, voices = 3, bright = 1, attack = 0.18 } = {}) {
    const ctx = this.ctx;
    const out = ctx.createGain();
    const end = t + dur;
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(gain, t + attack);
    out.gain.setValueAtTime(gain, Math.max(t + attack, end - 0.12));
    out.gain.linearRampToValueAtTime(0, end + 0.25);

    const mix = ctx.createGain(); mix.gain.value = 1 / voices;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 4.8 + Math.random() * 0.8;
    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(0, t);
    lfoGain.gain.linearRampToValueAtTime(freq * 0.006, t + Math.min(dur, 0.9));
    lfo.connect(lfoGain);
    lfo.start(t); lfo.stop(end + 0.4);

    for (let i = 0; i < voices; i++) {
      const o = ctx.createOscillator();
      o.type = i === 0 ? 'triangle' : 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = (i - (voices - 1) / 2) * 9 + (Math.random() - 0.5) * 6;
      lfoGain.connect(o.frequency);
      const g = ctx.createGain(); g.gain.value = i === 0 ? 1 : 0.35;
      o.connect(g).connect(mix);
      o.start(t + Math.random() * 0.03); o.stop(end + 0.4);
    }
    // "oo/ah" formants
    const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 520; f1.Q.value = 1.1;
    const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = 1150; f2.Q.value = 1.6;
    const g2 = ctx.createGain(); g2.gain.value = 0.45 * bright;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2600 * bright;
    mix.connect(f1).connect(lp);
    mix.connect(f2).connect(g2).connect(lp);
    lp.connect(out).connect(this.bus);
  }

  bell(freq, t) {
    const ctx = this.ctx;
    [[1, 0.05], [2.76, 0.018], [5.4, 0.008]].forEach(([mult, amp]) => {
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq * mult;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(amp, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3.2 / Math.sqrt(mult));
      o.connect(g).connect(this.bus);
      o.start(t); o.stop(t + 3.4);
    });
  }

  scheduleVerse(t0) {
    let t = t0;
    for (const [n, d] of MELODY) {
      const dur = d * EIGHTH;
      if (n) this.voice(hz(n) * 2, t, dur * 0.96, { gain: 0.36, voices: 3, bright: 1.25 });
      t += dur;
    }
    BARS.forEach((name, i) => {
      const c = CHORDS[name];
      const bt = t0 + i * BAR;
      c.pad.forEach((n) => this.voice(hz(n), bt, BAR * 0.98, { gain: 0.1, voices: 2, bright: 0.7, attack: 0.5 }));
      this.voice(hz(c.bass), bt, BAR * 0.98, { gain: 0.16, voices: 2, bright: 0.5, attack: 0.4 });
      if (i % 2 === 0) this.bell(hz(c.pad[2]) * 4, bt);
    });
  }

  toggle() {
    this.muted = !this.muted;
    if (this.el) this.el.volume = this.muted ? 0 : 0.9;
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.85, this.ctx.currentTime, 0.2);
    return this.muted;
  }
}
