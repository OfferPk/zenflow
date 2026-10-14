/**
 * ZenFlow - Synthesized Web Audio & Haptics Engine
 * 100% offline procedural audio using standard Web Audio API.
 */

class ZenFlowAudio {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    try {
      const saved = localStorage.getItem('zenflow_sound_enabled');
      if (saved !== null) {
        this.enabled = saved === 'true';
      }
    } catch (e) {
      this.enabled = true;
    }

    // Pentatonic scale frequencies for colors 0..9 (C4 to E5)
    this.frequencies = [
      261.63, // C4 - Coral Red
      293.66, // D4 - Cerulean Blue
      329.63, // E4 - Emerald Green
      392.00, // G4 - Golden Amber
      440.00, // A4 - Electric Orange
      523.25, // C5 - Orchid Purple
      587.33, // D5 - Vibrant Cyan
      659.25, // E5 - Hot Pink
      783.99, // G5 - Mint Lime
      880.00  // A5 - Pure White
    ];
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    try {
      localStorage.setItem('zenflow_sound_enabled', String(this.enabled));
    } catch (e) {}
    if (this.enabled) {
      this.playTap();
    }
    return this.enabled;
  }

  vibrate(ms = 15) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(ms);
      } catch (e) {}
    }
  }

  /**
   * Subtle bubble pop when dragging into adjacent cell
   */
  playStep(colorId = 0) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const baseFreq = (this.frequencies[colorId % this.frequencies.length] || 300) * 0.75;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, this.ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.04);
      this.vibrate(8);
    } catch (e) {}
  }

  /**
   * Resonant bell chime when flow is connected
   */
  playConnect(colorId = 0) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const freq = this.frequencies[colorId % this.frequencies.length] || 440;
      const now = this.ctx.currentTime;

      // Dual harmonic sine bell
      [1, 2.76].forEach((harmonic, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = idx === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq * harmonic, now);

        const vol = idx === 0 ? 0.22 : 0.08;
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now);
        osc.stop(now + 0.45);
      });

      this.vibrate(35);
    } catch (e) {}
  }

  /**
   * Soft descending tone when a flow is broken
   */
  playDisconnect(colorId = 0) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const freq = this.frequencies[colorId % this.frequencies.length] || 400;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * 0.9, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.6, now + 0.12);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.12);
    } catch (e) {}
  }

  /**
   * Button click / tap sound
   */
  playTap() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
      this.vibrate(12);
    } catch (e) {}
  }

  /**
   * Gentle hint chime
   */
  playHint() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.50].forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const start = now + idx * 0.07;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, start);

        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.25);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(start);
        osc.stop(start + 0.25);
      });
      this.vibrate(25);
    } catch (e) {}
  }

  /**
   * Victory fanfare on completing the level
   */
  playVictory(isPerfect = true) {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const chords = [
        [261.63, 329.63, 392.00], // C major
        [329.63, 392.00, 523.25], // E min / C inv
        [392.00, 523.25, 659.25], // G - C - E
        [523.25, 659.25, 783.99, 1046.50] // C5 chord with high sparkle
      ];

      chords.forEach((chord, step) => {
        const stepTime = now + step * 0.14;
        chord.forEach((freq) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = isPerfect ? 'sine' : 'triangle';
          osc.frequency.setValueAtTime(freq, stepTime);

          const dur = step === chords.length - 1 ? 0.75 : 0.25;
          gain.gain.setValueAtTime(0.14, stepTime);
          gain.gain.exponentialRampToValueAtTime(0.0001, stepTime + dur);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start(stepTime);
          osc.stop(stepTime + dur);
        });
      });

      this.vibrate(isPerfect ? [50, 40, 70, 50, 120] : [40, 40, 80]);
    } catch (e) {}
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ZenFlowAudio };
}
if (typeof window !== 'undefined') {
  window.ZenFlowAudio = ZenFlowAudio;
}
