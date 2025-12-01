import type { Container } from 'pixi.js';

export interface Scene {
  container: Container;

  update(dt: number): void;

  resize(width: number, height: number): void;

  reset(): void;

  destroy(): void;
}
