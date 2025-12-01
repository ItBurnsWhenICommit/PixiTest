import { Container, Text, TextStyle, Graphics, Application } from 'pixi.js';

export class FpsCounter extends Container {
  private text: Text;
  private background: Graphics;

  private elapsed = 0;
  private frames = 0;

  private padding = 8;
  private scaleFactor = 1;
  private menuHeight = 0;

  constructor(private app: Application) {
    super();

    this.background = new Graphics();
    this.addChild(this.background);

    this.text = new Text('FPS: 0', new TextStyle({
      fill: '#ffffff',
      fontSize: 14,
      fontWeight: 'bold',
    }));
    this.addChild(this.text);

    this.zIndex = 10_000;

    app.stage.addChild(this);
    app.ticker.add(this.update, this);

    this.resize();
  }

  private update(): void {
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

  setMenuHeight(height: number): void {
    this.menuHeight = height;
    this.y = this.menuHeight;
  }

  resize = (): void => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const minDimension = Math.min(w, h);
    const minScaleFactor = 0.6;
    const baseFontSize = 14;

    if (minDimension < 768) {
      this.scaleFactor = minDimension / 768;
    } else {
      this.scaleFactor = 1;
    }

    this.scaleFactor = Math.max(this.scaleFactor, minScaleFactor);
    this.text.style.fontSize = baseFontSize * this.scaleFactor;
    this.padding = 8 * this.scaleFactor;

    this.text.x = this.padding;
    this.text.y = this.padding;

    this.x = 0;
    this.y = this.menuHeight;

    this.updateBackground();
  }

  private updateBackground(): void {
    this.background.clear();
    this.background.beginFill(0x1122bb, 0.8);
    this.background.drawRect(
      0,
      0,
      this.text.width + this.padding * 2,
      this.text.height + this.padding * 2
    );
    this.background.endFill();
  }

  destroy(): void {
    try {
      this.app.stage.removeChild(this);
    } catch (e) {
      console.warn(e)
    } finally {
      super.destroy({ children: true });
    }
  }
}