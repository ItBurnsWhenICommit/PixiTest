import { Application } from 'pixi.js';
import { Scene } from './core/Scene';
import { FpsCounter } from './ui/FpsCounter';
import { Menu, MenuItemKey } from './ui/Menu';

class Game {
  private app: Application;
  private scenes: Partial<Record<MenuItemKey, Scene>> = {};

  private menu: Menu;
  private fps: FpsCounter;

  constructor() {
    this.app = new Application({
      resizeTo: window,
      backgroundColor: 0x105101,
    });

    document.body.appendChild(this.app.view as HTMLCanvasElement);

    this.fps = new FpsCounter(this.app);

    this.menu = new Menu(this.app, (key) => {
      // TODO: handle menu change
    });

    this.onResize();

    window.addEventListener('resize', this.onResize);
  }

  onResize = (): void => {
    this.app.resize();
    this.menu.onResize();
    this.fps.onResize();
  };
}

new Game();