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

// Chiptune melody notes (MIDI-style frequencies)
const MELODY_NOTES = [
  523.25, 587.33, 659.25, 783.99, // C5 D5 E5 G5
  659.25, 523.25, 587.33, 783.99, // E5 C5 D5 G5
  880.00, 783.99, 659.25, 587.33, // A5 G5 E5 D5
  523.25, 659.25, 783.99, 523.25, // C5 E5 G5 C5
];

const BASS_NOTES = [
  130.81, 130.81, 164.81, 164.81, // C3 C3 E3 E3
  174.61, 174.61, 196.00, 196.00, // F3 F3 G3 G3
  220.00, 220.00, 196.00, 196.00, // A3 A3 G3 G3
  130.81, 164.81, 196.00, 130.81, // C3 E3 G3 C3
];

export class AudioSystem implements ISystem {
  private muted = false;
  private audioContext: AudioContext | null;
  private pendingTimeouts: number[] = [];
  private musicPlaying = false;
  private musicTimeouts: number[] = [];
  private currentBpm = 140;
  private musicStopped = false;

  private onJump = () => this.playJump();
  private onCoin = () => this.playCoin();
  private onHit = () => this.playHit();
  private onDead = () => this.playDeath();
  private onStomp = () => this.playStomp();
  private onToggle = () => this.toggleMute();
  private onDifficulty = (data: { level: number; speed: number }) => this.updateMusicTempo(data.speed);

  constructor(_scene: Phaser.Scene) {
    this.audioContext = getAudioContext();

    EventBus.on('player:jump', this.onJump);
    EventBus.on('coin:collect', this.onCoin);
    EventBus.on('player:hit', this.onHit);
    EventBus.on('player:dead', this.onDead);
    EventBus.on('enemy:stomp', this.onStomp);
    EventBus.on('audio:toggle', this.onToggle);
    EventBus.on('difficulty:change', this.onDifficulty);

    this.startMusic();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopMusic();
    } else {
      this.startMusic();
    }
    return this.muted;
  }

  get isMuted(): boolean {
    return this.muted;
  }

  private playTone(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.15, varyPitch = false) {
    if (this.muted || !this.audioContext) return;

    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      const finalFreq = varyPitch ? freq * (0.97 + Math.random() * 0.06) : freq;
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(finalFreq, this.audioContext.currentTime);
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
    this.playTone(440, 0.1, 'square', 0.1, true);
    this.delayedTone(50, 580, 0.08, 'square', 0.08);
  }

  private playCoin() {
    this.playTone(880, 0.08, 'square', 0.1, true);
    this.delayedTone(60, 1200, 0.12, 'square', 0.08);
  }

  private playHit() {
    this.playTone(150, 0.2, 'sawtooth', 0.15);
  }

  private playDeath() {
    this.stopMusic();
    this.playTone(400, 0.15, 'square', 0.12);
    this.delayedTone(150, 300, 0.15, 'square', 0.1);
    this.delayedTone(300, 200, 0.3, 'square', 0.08);
  }

  private playStomp() {
    this.playTone(300, 0.05, 'square', 0.1);
    this.delayedTone(40, 600, 0.1, 'square', 0.08);
  }

  // --- Background Music ---

  private startMusic(): void {
    if (this.musicPlaying || this.muted) return;
    this.musicPlaying = true;
    this.musicStopped = false;
    this.scheduleNextBar(0);
  }

  private stopMusic(): void {
    this.musicStopped = true;
    this.musicPlaying = false;
    this.musicTimeouts.forEach((id) => window.clearTimeout(id));
    this.musicTimeouts = [];
  }

  private updateMusicTempo(speed: number): void {
    // Map scroll speed 200-600 to BPM 140-200
    this.currentBpm = 140 + ((speed - 200) / 400) * 60;
  }

  private scheduleNextBar(noteIndex: number): void {
    if (this.musicStopped || this.muted) return;

    const beatDuration = 60000 / this.currentBpm; // ms per beat
    const idx = noteIndex % MELODY_NOTES.length;

    // Play melody note
    this.playTone(MELODY_NOTES[idx], beatDuration / 1200, 'square', 0.04);

    // Play bass note
    this.playTone(BASS_NOTES[idx], beatDuration / 800, 'triangle', 0.06);

    // Schedule next note
    const id = window.setTimeout(() => {
      const tidx = this.musicTimeouts.indexOf(id);
      if (tidx !== -1) this.musicTimeouts.splice(tidx, 1);
      this.scheduleNextBar(noteIndex + 1);
    }, beatDuration);
    this.musicTimeouts.push(id);
  }

  update(_delta: number): void {}

  destroy(): void {
    this.stopMusic();

    // Clear pending SFX timeouts
    this.pendingTimeouts.forEach((id) => window.clearTimeout(id));
    this.pendingTimeouts = [];

    // Remove only our listeners
    EventBus.off('player:jump', this.onJump);
    EventBus.off('coin:collect', this.onCoin);
    EventBus.off('player:hit', this.onHit);
    EventBus.off('player:dead', this.onDead);
    EventBus.off('enemy:stomp', this.onStomp);
    EventBus.off('audio:toggle', this.onToggle);
    EventBus.off('difficulty:change', this.onDifficulty);
  }
}
