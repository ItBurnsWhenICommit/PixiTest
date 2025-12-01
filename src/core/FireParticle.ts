import { AnimatedSprite, Texture } from 'pixi.js';

export class FireParticle extends AnimatedSprite {
  public life = 0;
  public maxLife = 2;
  public velocityX = 0;
  public velocityY = 0;
  public rotationSpeed = 0;
  public startScale = 0.3;
  public endScale = 0.8;

  constructor(textures: Texture[]) {
    super(textures);
    this.anchor.set(0.5);
    this.animationSpeed = 0.4;
    this.loop = true;
    this.visible = false;
  }

  spawn(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.life = 0;
    this.maxLife = 1 + Math.random() * 0.8;

    this.velocityX = (Math.random() - 0.5) * 20;
    this.velocityY = -(80 + Math.random() * 60);

    this.rotationSpeed = (Math.random() - 0.5) * 12;
    this.rotation = Math.random() * Math.PI * 2;

    // Scale range (3x size)
    this.startScale = 1.9 + Math.random() * 0.3;
    this.endScale = 2.8 + Math.random() * 0.9;
    this.scale.set(0);

    this.tint = 0xffffff;
    this.alpha = 1;

    // Start from random frame
    this.gotoAndPlay(Math.floor(Math.random() * this.totalFrames));

    this.visible = true;
  }

  updateParticle(dt: number): boolean {
    if (!this.visible) return false;

    this.life += dt;
    const lifeRatio = this.life / this.maxLife;

    if (lifeRatio >= 1) {
      this.visible = false;
      this.stop();
      return false;
    }

    // Move upward
    this.x += this.velocityX * dt;
    this.y += this.velocityY * dt;
    // Slow down velocities
    this.velocityX *= 0.98;
    this.velocityY *= 0.99;
    // Rotation slows down over time
    this.rotation += this.rotationSpeed * dt;
    this.rotationSpeed *= 0.97;

    // Scale: grow quickly from 0 to startScale, then gradually to endScale
    let currentScale: number;
    const growPhase = 0.15; // First 15% of life is quick growth
    if (lifeRatio < growPhase) {
      // Quick growth from 0 to startScale
      const t = lifeRatio / growPhase;
      const eased = 1 - Math.pow(1 - t, 3); // Ease out
      currentScale = this.startScale * eased;
    } else {
      // Gradual growth from startScale to endScale
      const t = (lifeRatio - growPhase) / (1 - growPhase);
      currentScale = this.startScale + (this.endScale - this.startScale) * t;
    }
    this.scale.set(currentScale);

    // Turn gray in last 50%
    if (lifeRatio > 0.5) {
      const t = (lifeRatio - 0.5) / 0.5;
      const gray = Math.floor(180 - t * 80); // Desaturate to gray
      this.tint = (gray << 16) | (gray << 8) | gray;
    } else {
      this.tint = 0xffffff;
    }

    // Fade out in last 30%
    this.alpha = lifeRatio < 0.7 ? 1 : 1 - (lifeRatio - 0.7) / 0.3;

    return true;
  }

  get isActive(): boolean {
    return this.visible;
  }
}

