/**
 * Audio System using Web Audio API
 * Provides synthesized 8-bit / retro sound effects without external audio files.
 */
export class SoundManager {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;
  public volume: number = 0.3;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('snake_sound_enabled');
        if (saved !== null) {
          this.enabled = saved !== 'false';
        }
      } catch {
        this.enabled = true;
      }
    }
  }

  public init(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public toggle(): boolean {
    this.enabled = !this.enabled;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('snake_sound_enabled', String(this.enabled));
      } catch {}
    }
    return this.enabled;
  }

  public playTone(
    frequency: number,
    type: OscillatorType,
    duration: number,
    endFreq: number | null = null,
    gainMultiplier: number = 1
  ): void {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(frequency, now);

      if (endFreq !== null) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 10), now + duration);
      }

      const targetGain = this.volume * gainMultiplier;
      gain.gain.setValueAtTime(targetGain, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + duration);
    } catch (e) {
      console.warn('Audio tone error:', e);
    }
  }

  public playEat(): void {
    if (!this.enabled) return;
    this.init();
    this.playTone(330, 'square', 0.08, 660, 0.8);
  }

  public playGoldenEat(): void {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        this.playTone(freq, 'triangle', 0.12, freq * 1.05, 0.9);
      }, idx * 60);
    });
  }

  public playGameOver(): void {
    if (!this.enabled) return;
    this.init();
    this.playTone(280, 'sawtooth', 0.35, 70, 1.0);
  }

  public playMove(): void {
    if (!this.enabled) return;
    this.init();
    this.playTone(180, 'sine', 0.03, 140, 0.2);
  }

  public playHighScore(): void {
    if (!this.enabled) return;
    this.init();
    const fanfares = [
      { freq: 440, delay: 0 },
      { freq: 554.37, delay: 100 },
      { freq: 659.25, delay: 200 },
      { freq: 880, delay: 320 },
      { freq: 880, delay: 460 },
      { freq: 880, delay: 580 },
      { freq: 1108.73, delay: 720 }
    ];

    fanfares.forEach(item => {
      setTimeout(() => {
        this.playTone(item.freq, 'square', 0.16, item.freq, 0.8);
      }, item.delay);
    });
  }

  public playClick(): void {
    if (!this.enabled) return;
    this.init();
    this.playTone(500, 'sine', 0.04, 300, 0.3);
  }
}

export const soundManager = new SoundManager();
