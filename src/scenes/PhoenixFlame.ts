import { Assets, Container, Texture } from 'pixi.js';
import type { Scene } from '../core/Scene';
import { FireParticle } from '../core/FireParticle';

const MAX_PARTICLES = 10;
const SPAWN_INTERVAL = 0.15;

export class PhoenixFlameScene implements Scene {
  public readonly container = new Container();
  private particles: FireParticle[] = [];
  private textures: Texture[] = [];
  private loaded = false;
  private spawnTimer = 0;
  private emitterX = 0;
  private emitterY = 0;

  constructor() {
    this.loadAssets();
  }

  private async loadAssets(): Promise<void> {
    await Assets.load({ alias: 'fire', src: '/assets/fire.json' });

    // Get frames in order (1_0.png to 1_14.png)
    const frameNames: string[] = [];
    for (let i = 0; i <= 14; i++) {
      frameNames.push(`1_${i}.png`);
    }

    this.textures = frameNames.map(name => Texture.from(name));

    // Create particle pool
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const particle = new FireParticle(this.textures);
      this.particles.push(particle);
      this.container.addChild(particle);
    }

    this.loaded = true;
    this.resize(window.innerWidth, window.innerHeight);
  }

  private getInactiveParticle(): FireParticle | null {
    for (const particle of this.particles) {
      if (!particle.isActive) {
        return particle;
      }
    }
    return null;
  }

  update(dt: number): void {
    if (!this.loaded) return;

    // Update existing particles
    for (const particle of this.particles) {
      particle.updateParticle(dt);
    }

    // Spawn new particles
    this.spawnTimer += dt;
    if (this.spawnTimer >= SPAWN_INTERVAL) {
      this.spawnTimer = 0;

      const particle = this.getInactiveParticle();
      if (particle) {
        particle.spawn(this.emitterX, this.emitterY);
      }
    }
  }

  resize(width: number, height: number): void {
    this.emitterX = width / 2;
    this.emitterY = height * 0.65;
  }

  reset(): void {
    for (const particle of this.particles) {
      particle.visible = false;
      particle.stop();
    }
    this.spawnTimer = 0;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}

