import { ISystem } from '../interfaces/ISystem';
import { EventBus } from '../utils/EventBus';

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (!sharedAudioContext) {
    try {
      sharedAudioContext = new AudioContext();
    } catch {
      sharedAudioContext = null;
    }
  }
  return sharedAudioContext;
}

export class AudioSystem implements ISystem {
  private muted = false;
  private audioContext: AudioContext | null;
  private pendingTimeouts: number[] = [];

  private onJump = () => this.playJump();
  private onCoin = () => this.playCoin();
  private onHit = () => this.playHit();
  private onDead = () => this.playDeath();
  private onStomp = () => this.playStomp();
  private onToggle = () => this.toggleMute();

  constructor(_scene: Phaser.Scene) {
    this.audioContext = getAudioContext();

    EventBus.on('player:jump', this.onJump);
    EventBus.on('coin:collect', this.onCoin);
    EventBus.on('player:hit', this.onHit);
    EventBus.on('player:dead', this.onDead);
    EventBus.on('enemy:stomp', this.onStomp);
    EventBus.on('audio:toggle', this.onToggle);
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.15) {
    if (this.muted || !this.audioContext) return;

    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioContext.currentTime);
      gain.gain.setValueAtTime(volume, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioContext.destination);
      osc.start();
      osc.stop(this.audioContext.currentTime + duration);
    } catch {
      // Ignore audio errors
    }
  }

  private delayedTone(delay: number, freq: number, duration: number, type: OscillatorType = 'square', volume = 0.15) {
    const id = window.setTimeout(() => {
      this.playTone(freq, duration, type, volume);
      const idx = this.pendingTimeouts.indexOf(id);
      if (idx !== -1) this.pendingTimeouts.splice(idx, 1);
    }, delay);
    this.pendingTimeouts.push(id);
  }

  private playJump() {
    this.playTone(440, 0.1, 'square', 0.1);
    this.delayedTone(50, 580, 0.08, 'square', 0.08);
  }

  private playCoin() {
    this.playTone(880, 0.08, 'square', 0.1);
    this.delayedTone(60, 1200, 0.12, 'square', 0.08);
  }

  private playHit() {
    this.playTone(150, 0.2, 'sawtooth', 0.15);
  }

  private playDeath() {
    this.playTone(400, 0.15, 'square', 0.12);
    this.delayedTone(150, 300, 0.15, 'square', 0.1);
    this.delayedTone(300, 200, 0.3, 'square', 0.08);
  }

  private playStomp() {
    this.playTone(300, 0.05, 'square', 0.1);
    this.delayedTone(40, 600, 0.1, 'square', 0.08);
  }

  update(_delta: number): void {}

  destroy(): void {
    // Clear pending timeouts
    this.pendingTimeouts.forEach((id) => window.clearTimeout(id));
    this.pendingTimeouts = [];

    // Remove only our listeners
    EventBus.off('player:jump', this.onJump);
    EventBus.off('coin:collect', this.onCoin);
    EventBus.off('player:hit', this.onHit);
    EventBus.off('player:dead', this.onDead);
    EventBus.off('enemy:stomp', this.onStomp);
    EventBus.off('audio:toggle', this.onToggle);
  }
}
