import Phaser from 'phaser';
import { IComponent } from '../interfaces/IComponent';

export class JumpComponent implements IComponent {
  private body: Phaser.Physics.Arcade.Body;
  private jumpCount = 0;
  private isHolding = false;
  private holdTime = 0;
  private maxHoldTime = 300;
  private baseJumpVelocity = -350;
  private maxJumpVelocity = -500;
  private doubleJumpVelocity = -300;
  private hasReleasedAfterJump = true;
  private coyoteTimer = 0;
  private bufferTimer = 0;
  private wasOnGround = false;

  constructor(body: Phaser.Physics.Arcade.Body) {
    this.body = body;
  }

  setDoubleJumpBoost(percent: number): void {
    this.doubleJumpVelocity = this.doubleJumpVelocity * (1 + percent / 100);
  }

  tryJump(): boolean {
    if (!this.hasReleasedAfterJump) return false;

    // Allow first jump if on ground OR within coyote time
    const canFirstJump = this.jumpCount === 0 && (this.isOnGround || this.coyoteTimer > 0);
    const canDoubleJump = this.jumpCount === 1;

    if (canFirstJump) {
      this.body.setVelocityY(this.baseJumpVelocity);
      this.isHolding = true;
      this.holdTime = 0;
      this.jumpCount = 1;
      this.coyoteTimer = 0;
      this.hasReleasedAfterJump = false;
      return true;
    } else if (canDoubleJump) {
      this.body.setVelocityY(this.doubleJumpVelocity);
      this.isHolding = false;
      this.jumpCount = 2;
      this.hasReleasedAfterJump = false;
      return true;
    }

    // Buffer the jump attempt for when we land
    this.bufferTimer = 100;
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

  /** Returns true if a buffered jump was executed (caller should emit jump event) */
  update(delta: number): boolean {
    const onGround = this.isOnGround;

    if (onGround) {
      this.jumpCount = 0;
      this.isHolding = false;
      this.coyoteTimer = 0;

      // Execute buffered jump
      if (this.bufferTimer > 0 && this.hasReleasedAfterJump) {
        this.bufferTimer = 0;
        this.body.setVelocityY(this.baseJumpVelocity);
        this.isHolding = true;
        this.holdTime = 0;
        this.jumpCount = 1;
        this.hasReleasedAfterJump = false;
        return true; // buffered jump executed
      }
    } else {
      // Start coyote timer when leaving ground (not from jumping)
      if (this.wasOnGround && this.jumpCount === 0) {
        this.coyoteTimer = 80;
      }
      if (this.coyoteTimer > 0) {
        this.coyoteTimer -= delta;
      }
    }

    if (this.bufferTimer > 0) {
      this.bufferTimer -= delta;
    }

    this.wasOnGround = onGround;
    return false;
  }

  destroy(): void {}
}
