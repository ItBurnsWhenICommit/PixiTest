import { Application, Text, TextStyle, Graphics } from 'pixi.js';

export class FpsCounter {
  private text: Text;
  private background: Graphics;
  private elapsed = 0;
  private frames = 0;
  private padding = 8;
  private scaleFactor = 1;

  constructor(private app: Application) {
    // Create blue background
    this.background = new Graphics();
    this.background.zIndex = 9_999;

    // Create text with thicker font
    this.text = new Text('FPS: 0', new TextStyle({
      fill: '#ffffff',
      fontSize: 14,
      fontWeight: 'bold',
    }));

    this.text.zIndex = 10_000;

    app.stage.addChild(this.background);
    app.stage.addChild(this.text);

    app.ticker.add(this.onTick, this);

    // Initial resize
    this.resize();

    // Listen for window resize
    window.addEventListener('resize', this.onResize);
  }

  private onResize = (): void => {
    this.resize();
  };

  private onTick(): void {
    const dt = this.app.ticker.deltaMS / 1000;
    this.elapsed += dt;
    this.frames++;

    if (this.elapsed >= 0.5) {
      const fps = Math.round(this.frames / this.elapsed);
      this.text.text = `FPS: ${fps}`;
      this.updateBackground();
      this.elapsed = 0;
      this.frames = 0;
    }
  }

  resize(): void {
    // Calculate scale factor based on screen size
    const width = window.innerWidth;
    const height = window.innerHeight;
    const minDimension = Math.min(width, height);

    // Scale based on screen size (mobile vs desktop)
    if (minDimension < 768) {
      // Mobile
      this.scaleFactor = minDimension / 768;
    } else {
      // Desktop
      this.scaleFactor = 1;
    }

    // Apply minimum scale factor to ensure readability
    const minScaleFactor = 0.6; // Don't go below 60% of original size
    this.scaleFactor = Math.max(this.scaleFactor, minScaleFactor);

    // Apply scale to text
    const baseFontSize = 14;
    this.text.style.fontSize = baseFontSize * this.scaleFactor;

    // Update padding based on scale
    this.padding = 8 * this.scaleFactor;

    // Position in top-left with scaled padding
    this.text.x = this.padding;
    this.text.y = this.padding;
    this.background.x = 0;
    this.background.y = 0;

    this.updateBackground();
  }

  private updateBackground(): void {
    this.background.clear();
    this.background.beginFill(0x0000ff, 0.8); // Blue with 80% opacity
    this.background.drawRect(
      0,
      0,
      this.text.width + this.padding * 2,
      this.text.height + this.padding * 2
    );
    this.background.endFill();
  }

  destroy(): void {
    window.removeEventListener('resize', this.onResize);
    this.app.ticker.remove(this.onTick, this);
    this.text.destroy();
    this.background.destroy();
  }
}