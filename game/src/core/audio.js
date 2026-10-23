// Звук целиком синтезируется Web Audio API: ни одного внешнего файла.
const MUSIC = {
  title:  { root: 174.61, scale: [0, 2, 4, 6, 9], wave: 'triangle', cutoff: 1300, bell: 0.5 },
  vale:   { root: 146.83, scale: [0, 2, 4, 7, 9], wave: 'triangle', cutoff: 1200, bell: 0.45 },
  forest: { root: 164.81, scale: [0, 2, 3, 7, 9], wave: 'sawtooth', cutoff: 700, bell: 0.35 },
  swamp:  { root: 110.0,  scale: [0, 1, 3, 7, 8], wave: 'sawtooth', cutoff: 520, bell: 0.2 },
  storm:  { root: 130.81, scale: [0, 2, 4, 7, 10], wave: 'sawtooth', cutoff: 900, bell: 0.3 },
  frost:  { root: 123.47, scale: [0, 2, 3, 7, 10], wave: 'triangle', cutoff: 1600, bell: 0.6 },
  ash:    { root: 92.5,   scale: [0, 1, 4, 7, 8], wave: 'sawtooth', cutoff: 600, bell: 0.2 },
  astral: { root: 174.61, scale: [0, 2, 4, 6, 9], wave: 'triangle', cutoff: 1400, bell: 0.55 },
};

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.vol = { master: 0.8, music: 0.5, sfx: 0.8 };
    this.muted = false;
    this.region = 'title';
    this.combat = false;
    this.nextChord = 0;
    this.nextBell = 0;
    this.nextBeat = 0;
    this.listener = { x: 0, y: 0, z: 0 };
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const c = this.ctx;
    this.master = c.createGain();
    this.master.connect(c.destination);
    this.musicBus = c.createGain(); this.musicBus.connect(this.master);
    this.sfxBus = c.createGain(); this.sfxBus.connect(this.master);
    // «Зал»: задержка с обратной связью придаёт объём и музыке, и эффектам
    this.delay = c.createDelay(1.5); this.delay.delayTime.value = 0.38;
    this.fb = c.createGain(); this.fb.gain.value = 0.38;
    this.wet = c.createGain(); this.wet.gain.value = 0.35;
    this.delay.connect(this.fb); this.fb.connect(this.delay); this.delay.connect(this.wet); this.wet.connect(this.master);
    const len = c.sampleRate * 1.5;
    this.noise = c.createBuffer(1, len, c.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.applyVolumes();
  }

  applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.vol.master, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.vol.music * 0.5, t, 0.2);
    this.sfxBus.gain.setTargetAtTime(this.vol.sfx, t, 0.05);
  }
  setVolumes(v) { Object.assign(this.vol, v); this.applyVolumes(); }

  // ---------- примитивы ----------
  _env(g, t, a, peak, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }
  tone(f, dur, { type = 'sine', vol = 0.3, slide = null, a = 0.005, delay = 0, bus = null, wet = false } = {}) {
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(); const g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(slide, 20), t + dur);
    this._env(g, t, a, vol, dur);
    o.connect(g); g.connect(bus || this.sfxBus); if (wet) g.connect(this.delay);
    o.start(t); o.stop(t + dur + 0.05);
  }
  noiseBurst(dur, { vol = 0.3, type = 'bandpass', f = 1000, f2 = null, q = 1, a = 0.005, delay = 0, wet = false } = {}) {
    const c = this.ctx, t = c.currentTime + delay;
    const s = c.createBufferSource(); s.buffer = this.noise;
    const fl = c.createBiquadFilter(); fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f, t);
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
    const g = c.createGain(); this._env(g, t, a, vol, dur);
    s.connect(fl); fl.connect(g); g.connect(this.sfxBus); if (wet) g.connect(this.delay);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
  }

  // ---------- эффекты ----------
  play(name, opts = {}) {
    if (!this.ctx || this.muted) return;
    let vol = opts.vol ?? 1;
    if (opts.pos) {
      const d = Math.hypot(opts.pos.x - this.listener.x, opts.pos.z - this.listener.z);
      vol *= Math.max(0, 1 - d / 60);
      if (vol < 0.02) return;
    }
    const p = (opts.pitch ?? 1) * (0.95 + Math.random() * 0.1);
    const v = (x) => x * vol;
    switch (name) {
      case 'arcane': this.tone(620 * p, 0.14, { type: 'triangle', vol: v(0.16), slide: 980 * p }); break;
      case 'fire':
        this.noiseBurst(0.35, { vol: v(0.3), f: 500, f2: 2200, q: 0.8 });
        this.tone(200 * p, 0.3, { type: 'sawtooth', vol: v(0.08), slide: 90 }); break;
      case 'frost':
        this.tone(1300 * p, 0.22, { type: 'triangle', vol: v(0.14), slide: 2000 * p, wet: true });
        this.noiseBurst(0.15, { vol: v(0.12), type: 'highpass', f: 4500 }); break;
      case 'storm':
        this.noiseBurst(0.22, { vol: v(0.3), type: 'highpass', f: 2500, q: 0.5 });
        this.tone(90 * p, 0.2, { type: 'square', vol: v(0.08), slide: 60 }); break;
      case 'thunder':
        this.noiseBurst(1.4, { vol: v(0.5), type: 'lowpass', f: 900, f2: 120, a: 0.01, wet: true });
        this.tone(55, 0.8, { type: 'sine', vol: v(0.3), slide: 35 }); break;
      case 'life':
        [523, 659, 784].forEach((f, i) => this.tone(f * p, 0.5, { vol: v(0.07), a: 0.04, delay: i * 0.05, wet: true })); break;
      case 'heal':
        this.tone(440 * p, 0.6, { vol: v(0.12), slide: 880 * p, a: 0.05, wet: true });
        this.tone(1320 * p, 0.4, { vol: v(0.05), a: 0.1, delay: 0.1, wet: true }); break;
      case 'shadow':
        this.tone(150 * p, 0.45, { type: 'sawtooth', vol: v(0.12), slide: 65 });
        this.noiseBurst(0.4, { vol: v(0.12), type: 'lowpass', f: 600, f2: 200 }); break;
      case 'explode':
        this.noiseBurst(0.7, { vol: v(0.5), type: 'lowpass', f: 1600, f2: 120, wet: true });
        this.tone(95, 0.5, { vol: v(0.35), slide: 38 }); break;
      case 'hit':
        this.noiseBurst(0.09, { vol: v(0.28), f: 1600, q: 1.2 });
        this.tone(220 * p, 0.07, { type: 'square', vol: v(0.07), slide: 120 }); break;
      case 'crit':
        this.noiseBurst(0.14, { vol: v(0.35), f: 2400, q: 2 });
        this.tone(880 * p, 0.12, { type: 'square', vol: v(0.08), slide: 440 }); break;
      case 'hurt': this.tone(230 * p, 0.16, { type: 'sawtooth', vol: v(0.16), slide: 130 }); break;
      case 'swing': this.noiseBurst(0.16, { vol: v(0.2), f: 500, f2: 1800, q: 2 }); break;
      case 'dodge': this.noiseBurst(0.22, { vol: v(0.18), f: 700, f2: 1800, q: 1 }); break;
      case 'step': this.noiseBurst(0.05, { vol: v(0.05), type: 'lowpass', f: 380 }); break;
      case 'jump': this.tone(300 * p, 0.12, { type: 'triangle', vol: v(0.07), slide: 480 }); break;
      case 'pickup': this.tone(880 * p, 0.1, { vol: v(0.16), slide: 1320 * p }); break;
      case 'gold':
        this.tone(1400 * p, 0.08, { type: 'triangle', vol: v(0.1) });
        this.tone(1900 * p, 0.1, { type: 'triangle', vol: v(0.08), delay: 0.06 }); break;
      case 'levelup':
        [523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.5, { type: 'triangle', vol: v(0.12), delay: i * 0.09, wet: true })); break;
      case 'quest':
        [392, 523, 659].forEach((f, i) => this.tone(f, 0.45, { vol: v(0.12), delay: i * 0.12, wet: true })); break;
      case 'ui': this.tone(720, 0.05, { vol: v(0.07) }); break;
      case 'error': this.tone(160, 0.14, { type: 'square', vol: v(0.08) }); break;
      case 'open': this.tone(120, 0.35, { type: 'sawtooth', vol: v(0.08), slide: 190 }); this.play('gold', { vol }); break;
      case 'waystone':
        [330, 495, 660, 990].forEach((f, i) => this.tone(f, 1.2, { vol: v(0.08), a: 0.1, delay: i * 0.15, wet: true })); break;
      case 'death':
        this.tone(300, 1.3, { type: 'sawtooth', vol: v(0.15), slide: 55 });
        this.noiseBurst(1.2, { vol: v(0.2), type: 'lowpass', f: 800, f2: 100 }); break;
      case 'enemy_die': this.tone(180 * p, 0.35, { type: 'triangle', vol: v(0.12), slide: 70 }); break;
      case 'enemy_cast': this.tone(320 * p, 0.25, { vol: v(0.08), slide: 540 * p }); break;
      case 'boss':
        this.tone(55, 1.4, { vol: v(0.4), slide: 40 });
        this.noiseBurst(1.0, { vol: v(0.25), type: 'lowpass', f: 300, wet: true }); break;
      case 'shard':
        [261, 392, 523, 784, 1046, 1568].forEach((f, i) => this.tone(f, 1.6, { type: 'triangle', vol: v(0.1), a: 0.05, delay: i * 0.12, wet: true })); break;
      default: break;
    }
  }

  // ---------- генеративная музыка ----------
  setRegion(id) { if (MUSIC[id]) this.region = id; }
  setCombat(on) { this.combat = on; }

  update() {
    if (!this.ctx || this.muted || this.vol.music <= 0) return;
    const now = this.ctx.currentTime;
    const m = MUSIC[this.region] || MUSIC.vale;
    if (now >= this.nextChord) {
      this.nextChord = now + 7;
      const deg = [0, 3, 4, 2, 1][Math.floor(Math.random() * 5)];
      const notes = [deg, deg + 2, deg + 4].map((d) => {
        const oct = Math.floor(d / m.scale.length);
        return m.root * Math.pow(2, (m.scale[d % m.scale.length] + 12 * oct) / 12);
      });
      this._pad(notes, m, now, 8.5);
    }
    if (now >= this.nextBell && Math.random() < m.bell) {
      this.nextBell = now + 1.2 + Math.random() * 3;
      const d = Math.floor(Math.random() * m.scale.length);
      const f = m.root * 4 * Math.pow(2, m.scale[d] / 12);
      this.tone(f, 2.2, { vol: 0.05, a: 0.01, bus: this.musicBus, wet: true });
    } else if (now >= this.nextBell) this.nextBell = now + 2;
    if (this.combat && now >= this.nextBeat) {
      this.nextBeat = now + 0.6;
      this.tone(m.root / 2, 0.25, { vol: 0.22, slide: m.root / 3, bus: this.musicBus });
    }
  }

  _pad(freqs, m, t0, dur) {
    const c = this.ctx;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.06, t0 + 2.2);
    g.gain.setValueAtTime(0.06, t0 + dur - 3);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = m.cutoff; fl.Q.value = 0.7;
    g.connect(fl); fl.connect(this.musicBus); fl.connect(this.delay);
    for (const f of freqs) {
      for (const det of [-6, 6]) {
        const o = c.createOscillator(); o.type = m.wave; o.frequency.value = f; o.detune.value = det;
        o.connect(g); o.start(t0); o.stop(t0 + dur + 0.1);
      }
    }
  }
}
