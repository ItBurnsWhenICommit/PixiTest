import { Container, Text, TextStyle } from 'pixi.js';
import type { Scene } from '../core/Scene';

export class MagicWordsScene implements Scene {
  public readonly container = new Container();
  private label: Text;

  constructor() {
    this.label = new Text(
      'Magic Words\n(Coming Soon)',
      new TextStyle({
        fill: '#ffffff',
        fontSize: 32,
        fontWeight: 'bold',
        align: 'center',
      })
    );
    this.label.anchor.set(0.5);
    this.container.addChild(this.label);
  }

  update(_dt: number): void {
    // Placeholder - no updates needed
  }

  resize(width: number, height: number): void {
    this.label.x = width / 2;
    this.label.y = height / 2;
  }

  reset(): void {
    // Nothing to reset for placeholder
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}

