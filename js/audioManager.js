/**
 * Audio Manager using Web Audio API for precision timing and low latency.
 * Generates synthetic sounds to avoid external asset dependencies, but can be extended to use files.
 */
export class AudioManager {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.muted = false;
    this.gainNode = this.ctx.createGain();
    this.gainNode.connect(this.ctx.destination);
  }

  /**
   * Toggles mute state
   * @returns {boolean} current mute state
   */
  toggleMute() {
    this.muted = !this.muted;
    this.gainNode.gain.setValueAtTime(
      this.muted ? 0 : 0.5,
      this.ctx.currentTime,
    );
    return this.muted;
  }

  /**
   * Play a short "tick" sound for card passing
   * High frequency short blip
   */
  playTick() {
    if (this.muted) return;
    this._ensureContext();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.gainNode);

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
      400,
      this.ctx.currentTime + 0.05,
    );

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.05);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.05);
  }

  /**
   * Play a "Start" spin sound
   */
  playSpinStart() {
    if (this.muted) return;
    this._ensureContext();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.connect(gain);
    gain.connect(this.gainNode);

    osc.type = "triangle";
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(600, this.ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.1);
    gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }

  /**
   * Play a celebratory win sound
   * Major chord arpeggio
   */
  playWin() {
    if (this.muted) return;
    this._ensureContext();

    const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
    const now = this.ctx.currentTime;

    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.connect(gain);
      gain.connect(this.gainNode);

      osc.type = "sine";
      osc.frequency.value = freq;

      const time = now + i * 0.1;
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.2, time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 1.5);

      osc.start(time);
      osc.stop(time + 1.5);
    });
  }

  /* Resume context if suspended (browser policy) */
  _ensureContext() {
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }
}
