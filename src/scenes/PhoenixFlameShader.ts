import { Container, Sprite, Texture } from 'pixi.js';
import type { Scene } from '../core/Scene';
import { FireShader } from '../shaders/FireShader';

export class PhoenixFlameShaderScene implements Scene {
  public readonly container = new Container();
  private fireShader: FireShader;
  private fireSprite: Sprite;

  constructor() {
    this.fireShader = new FireShader();
    this.fireSprite = new Sprite(Texture.WHITE);
    this.fireSprite.tint = 0x000000;
    this.fireSprite.filters = [this.fireShader];
    this.container.addChild(this.fireSprite);
  }

  update(dt: number): void {
    this.fireShader.update(dt);
  }

  resize(width: number, height: number): void {
    this.fireSprite.width = width;
    this.fireSprite.height = height;
    this.fireShader.setResolution(width, height);
  }

  reset(): void {
    this.fireShader.reset();
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}

