import Phaser from 'phaser';
import { IComponent } from '../interfaces/IComponent';

export class JumpComponent implements IComponent {
  private body: Phaser.Physics.Arcade.Body;
  private jumpCount = 0;
  private maxJumps = 2;
  private isHolding = false;
  private holdTime = 0;
  private maxHoldTime = 300;
  private baseJumpVelocity = -350;
  private maxJumpVelocity = -500;
  private doubleJumpVelocity = -300;
  private hasReleasedAfterJump = true;

  constructor(body: Phaser.Physics.Arcade.Body) {
    this.body = body;
  }

  resetJumps(): void {
    this.jumpCount = 0;
    this.isHolding = false;
    this.holdTime = 0;
    this.hasReleasedAfterJump = true;
  }

  tryJump(): boolean {
    if (!this.hasReleasedAfterJump) return false;

    if (this.jumpCount < this.maxJumps) {
      if (this.jumpCount === 0) {
        this.body.setVelocityY(this.baseJumpVelocity);
        this.isHolding = true;
        this.holdTime = 0;
      } else {
        this.body.setVelocityY(this.doubleJumpVelocity);
        this.isHolding = false;
      }
      this.jumpCount++;
      this.hasReleasedAfterJump = false;
      return true;
    }
    return false;
  }

  holdJump(delta: number): void {
    if (!this.isHolding) return;
    this.holdTime += delta;
    if (this.holdTime < this.maxHoldTime) {
      const t = this.holdTime / this.maxHoldTime;
      const velocity = this.baseJumpVelocity + (this.maxJumpVelocity - this.baseJumpVelocity) * t;
      this.body.setVelocityY(velocity);
    } else {
      this.isHolding = false;
    }
  }

  releaseJump(): void {
    this.isHolding = false;
    this.hasReleasedAfterJump = true;
  }

  get isOnGround(): boolean {
    return this.body.blocked.down || this.body.touching.down;
  }

  update(_delta: number): void {
    if (this.isOnGround) {
      this.jumpCount = 0;
      this.isHolding = false;
    }
  }

  destroy(): void {}
}
