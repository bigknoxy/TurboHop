import { ISystem } from '../interfaces/ISystem';
import { EventBus } from '../utils/EventBus';

export class AudioSystem implements ISystem {
  private scene: Phaser.Scene;
  private muted = false;
  private audioContext: AudioContext | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    try {
      this.audioContext = new AudioContext();
    } catch {
      this.audioContext = null;
    }

    EventBus.on('player:jump', () => this.playJump());
    EventBus.on('coin:collect', () => this.playCoin());
    EventBus.on('player:hit', () => this.playHit());
    EventBus.on('player:dead', () => this.playDeath());
    EventBus.on('enemy:stomp', () => this.playStomp());
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

  private playJump() {
    this.playTone(440, 0.1, 'square', 0.1);
    setTimeout(() => this.playTone(580, 0.08, 'square', 0.08), 50);
  }

  private playCoin() {
    this.playTone(880, 0.08, 'square', 0.1);
    setTimeout(() => this.playTone(1200, 0.12, 'square', 0.08), 60);
  }

  private playHit() {
    this.playTone(150, 0.2, 'sawtooth', 0.15);
  }

  private playDeath() {
    this.playTone(400, 0.15, 'square', 0.12);
    setTimeout(() => this.playTone(300, 0.15, 'square', 0.1), 150);
    setTimeout(() => this.playTone(200, 0.3, 'square', 0.08), 300);
  }

  private playStomp() {
    this.playTone(300, 0.05, 'square', 0.1);
    setTimeout(() => this.playTone(600, 0.1, 'square', 0.08), 40);
  }

  update(_delta: number): void {}

  destroy(): void {
    EventBus.off('player:jump');
    EventBus.off('coin:collect');
    EventBus.off('player:hit');
    EventBus.off('player:dead');
    EventBus.off('enemy:stomp');
  }
}
