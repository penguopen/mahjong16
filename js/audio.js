
// ============================================================
// AudioManager - Web Audio API 即時合成音效系統
// ============================================================
class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.bgmGain = null;
    this.bgmSource = null;
    this.bgmPlaying = false;
    this.enabled = true;
  }

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = 0.7;
      this.masterGain.connect(this.ctx.destination);
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.25;
      this.bgmGain.connect(this.masterGain);
      console.log('[Audio] Initialized, sampleRate:', this.ctx.sampleRate);
    } catch (e) {
      console.warn('[Audio] Init failed:', e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // 單一頻率音調
  tone(freq, duration, type = 'sine', vol = 0.5, attack = 0.01, decay = 0.1, sustain = 0.3, release = 0.2) {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + attack);
    gain.gain.linearRampToValueAtTime(vol * sustain / Math.max(sustain, 1), now + attack + decay);
    gain.gain.setValueAtTime(vol * sustain / Math.max(sustain, 1), now + duration - release);
    gain.gain.linearRampToValueAtTime(0, now + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  // 白色噪音（短促）
  noise(duration, vol = 0.3) {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const bufSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    src.connect(gain);
    gain.connect(this.masterGain);
    src.start(now);
  }

  // 摸牌聲 - 清脆短促的點擊
  playDraw() {
    if (!this.ctx) this.init();
    this.resume();
    this.tone(880, 0.06, 'square', 0.15, 0.005, 0.02, 0.1, 0.03);
    this.tone(1200, 0.05, 'sine', 0.2, 0.005, 0.015, 0.05, 0.02);
    this.noise(0.03, 0.08);
  }

  // 出牌聲 - 輕柔放下
  playDiscard() {
    if (!this.ctx) this.init();
    this.resume();
    this.tone(330, 0.08, 'triangle', 0.2, 0.005, 0.03, 0.1, 0.04);
    this.noise(0.04, 0.06);
  }

  // 碰牌聲 - 兩短促音
  playPong() {
    if (!this.ctx) this.init();
    this.resume();
    this.tone(440, 0.12, 'square', 0.35, 0.005, 0.03, 0.5, 0.06);
    this.tone(550, 0.12, 'square', 0.35, 0.005, 0.03, 0.5, 0.06);
    this.tone(660, 0.20, 'triangle', 0.3, 0.01, 0.05, 0.4, 0.10);
  }

  // 槓牌聲 - 低沉共鳴
  playKong() {
    if (!this.ctx) this.init();
    this.resume();
    this.tone(196, 0.15, 'sawtooth', 0.25, 0.01, 0.05, 0.4, 0.10);
    this.tone(262, 0.15, 'sawtooth', 0.20, 0.01, 0.05, 0.4, 0.10);
    this.tone(330, 0.20, 'triangle', 0.3, 0.01, 0.06, 0.5, 0.12);
    this.noise(0.08, 0.1);
  }

  // 聽牌提示聲
  playTing() {
    if (!this.ctx) this.init();
    this.resume();
    const notes = [523, 659, 784];
    notes.forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.18, 'sine', 0.25, 0.01, 0.04, 0.6, 0.10), i * 120);
    });
  }

  // 胡牌聲 - 勝利旋律
  playWin() {
    if (!this.ctx) this.init();
    this.resume();
    // 主旋律
    const melody = [
      [523, 0.15], [659, 0.15], [784, 0.15], [1047, 0.4],
    ];
    melody.forEach(([f, d], i) => {
      setTimeout(() => {
        this.tone(f, d, 'triangle', 0.35, 0.01, 0.04, 0.7, 0.15);
        this.tone(f * 1.25, d, 'sine', 0.15, 0.01, 0.04, 0.6, 0.15);
      }, i * 160);
    });
    // 和弦
    setTimeout(() => {
      this.tone(523, 0.6, 'sine', 0.12, 0.02, 0.1, 0.5, 0.3);
      this.tone(659, 0.6, 'sine', 0.10, 0.02, 0.1, 0.5, 0.3);
      this.tone(784, 0.6, 'sine', 0.08, 0.02, 0.1, 0.5, 0.3);
    }, 500);
  }

  // 背景音樂 - 舒緩的中國風旋律循環
  startBGM() {
    if (!this.ctx) this.init();
    this.resume();
    if (this.bgmPlaying) return;
    this.bgmPlaying = true;
    this._playBGMLoop();
  }

  _playBGMLoop() {
    if (!this.bgmPlaying || !this.ctx) return;
    // 五聲音階旋律片段
    const scale = [262, 294, 330, 392, 440, 523, 587, 659];
    const patterns = [
      [0,2,4,2], [2,4,5,4], [4,5,7,5], [5,7,4,5],
      [0,4,2,4], [2,5,4,2], [4,7,5,4], [7,5,4,2],
    ];
    const pattern = patterns[Math.floor(Math.random() * patterns.length)];
    const beatDur = 0.5;
    let time = this.ctx.currentTime + 0.1;

    pattern.forEach(noteIdx => {
      const freq = scale[noteIdx] || 330;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, time);
      g.gain.linearRampToValueAtTime(0.15, time + 0.05);
      g.gain.setValueAtTime(0.15, time + beatDur * 0.7);
      g.gain.linearRampToValueAtTime(0, time + beatDur);
      osc.connect(g);
      g.connect(this.bgmGain);
      osc.start(time);
      osc.stop(time + beatDur + 0.05);
      time += beatDur;
    });

    // 4拍後重複
    const loopDur = pattern.length * beatDur * 1000;
    setTimeout(() => this._playBGMLoop(), loopDur);
  }

  stopBGM() {
    this.bgmPlaying = false;
    if (this.bgmSource) { try { this.bgmSource.stop(); } catch(e){} }
  }

  setEnabled(v) { this.enabled = v; if (!v) this.stopBGM(); }
  setVolume(v) { if (this.masterGain) this.masterGain.gain.value = Math.max(0, Math.min(1, v)); }
  setBGMVolume(v) { if (this.bgmGain) this.bgmGain.gain.value = Math.max(0, Math.min(1, v)); }
}

// 全域音效管理器
window.audioManager = new AudioManager();
