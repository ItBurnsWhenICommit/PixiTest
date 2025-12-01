import { Container, Sprite, Texture } from 'pixi.js';

export interface CardAnimation {
  startX: number;
  startY: number;
  controlX: number;
  controlY: number;
  endX: number;
  endY: number;
  startRotation: number;
  endRotation: number;
  startZIndex: number;
  endZIndex: number;
  elapsed: number;
  duration: number;
  onComplete?: () => void;
}

export class Card extends Container {
  private sprite: Sprite;
  public animation: CardAnimation | null = null;

  constructor(texture: Texture) {
    super();

    this.sprite = new Sprite(texture);
    this.sprite.anchor.set(0.5);
    this.addChild(this.sprite);
  }

  get cardWidth(): number {
    return this.sprite.width;
  }

  get cardHeight(): number {
    return this.sprite.height;
  }

  get currentScale(): number {
    return this.sprite.scale.x;
  }

  setScale(scale: number): void {
    this.sprite.scale.set(scale);
  }

  animateTo(endX: number, endY: number, duration: number, startZIndex: number, endZIndex: number, onComplete?: () => void): void {
    const midX = (this.x + endX) / 2;
    const midY = (this.y + endY) / 2;

    // Random curve offset
    const curveStrength = 100 + Math.random() * 150;
    const curveDirection = Math.random() > 0.5 ? 1 : -1;

    // Perpendicular offset for the control point
    const dx = endX - this.x;
    const dy = endY - this.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const perpX = -dy / len;
    const perpY = dx / len;

    // Add some randomness to the control point
    const randomOffsetX = (Math.random() - 0.5) * 50;
    const randomOffsetY = (Math.random() - 0.5) * 50;

    // Random end rotation between -3 and +3 degrees
    const endRotation = (Math.random() * 6 - 3) * (Math.PI / 180);

    this.zIndex = startZIndex;

    this.animation = {
      startX: this.x,
      startY: this.y,
      controlX: midX + perpX * curveStrength * curveDirection + randomOffsetX,
      controlY: midY + perpY * curveStrength * curveDirection + randomOffsetY - 80,
      endX,
      endY,
      startRotation: this.rotation,
      endRotation,
      startZIndex,
      endZIndex,
      elapsed: 0,
      duration,
      onComplete,
    };
  }

  update(dt: number): void {
    if (!this.animation) return;

    this.animation.elapsed += dt;
    const t = Math.min(this.animation.elapsed / this.animation.duration, 1);

    // Bell curve easing: fast at start/end, slow in middle
    // Using sine curve: sin(t * PI) gives 0->1->0, we integrate for position
    const bellCurve = (1 - Math.cos(t * Math.PI)) / 2;

    // Quadratic bezier curve for position
    const oneMinusT = 1 - bellCurve;
    this.x = oneMinusT * oneMinusT * this.animation.startX
           + 2 * oneMinusT * bellCurve * this.animation.controlX
           + bellCurve * bellCurve * this.animation.endX;
    this.y = oneMinusT * oneMinusT * this.animation.startY
           + 2 * oneMinusT * bellCurve * this.animation.controlY
           + bellCurve * bellCurve * this.animation.endY;

    // Smooth rotation interpolation
    this.rotation = this.animation.startRotation
                  + (this.animation.endRotation - this.animation.startRotation) * bellCurve;

    // Interpolate zIndex - switch at halfway point
    if (t < 0.5) {
      this.zIndex = this.animation.startZIndex;
    } else {
      this.zIndex = this.animation.endZIndex;
    }

    if (t >= 1) {
      const onComplete = this.animation.onComplete;
      this.animation = null;
      onComplete?.();
    }
  }

  get isAnimating(): boolean {
    return this.animation !== null;
  }

  destroy(): void {
    super.destroy({ children: true });
  }
}

