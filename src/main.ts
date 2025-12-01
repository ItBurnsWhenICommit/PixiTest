import { Application } from 'pixi.js';
import { Scene } from './core/Scene';
import { AceOfShadowsScene } from './scenes/AceOfShadows';
import { MagicWordsScene } from './scenes/MagicWords';
import { PhoenixFlameScene } from './scenes/PhoenixFlame';
import { PhoenixFlameShaderScene } from './scenes/PhoenixFlameShader';
import { FpsCounter } from './ui/FpsCounter';
import { Menu, MenuItemKey } from './ui/Menu';

class Game {
  private app: Application;
  private scenes: Record<MenuItemKey, Scene>;
  private currentScene: Scene;

  private menu: Menu;
  private fps: FpsCounter;

  constructor() {
    this.app = new Application({
      resizeTo: window,
      backgroundColor: 0x050101,
    });

    document.body.appendChild(this.app.view as HTMLCanvasElement);

    this.fps = new FpsCounter(this.app);

    this.menu = new Menu(this.app, (key) => {
      this.switchScene(key);
    });

    this.scenes = {
      ace: new AceOfShadowsScene(),
      magic: new MagicWordsScene(),
      phoenix: new PhoenixFlameScene(),
      phoenixShader: new PhoenixFlameShaderScene(),
    };

    this.currentScene = this.scenes.ace;
    this.app.stage.addChild(this.currentScene.container);

    this.app.ticker.add(this.update, this);
    window.addEventListener('resize', this.resize);
    this.resize();
  }

  private update(): void {
    const dt = this.app.ticker.deltaMS / 1000;
    this.currentScene.update(dt);
  }

  private switchScene(key: MenuItemKey): void {
    this.currentScene.reset();
    this.app.stage.removeChild(this.currentScene.container);

    this.currentScene = this.scenes[key];
    this.currentScene.reset();
    this.app.stage.addChild(this.currentScene.container);

    this.currentScene.resize(window.innerWidth, window.innerHeight);
  }

  resize = (): void => {
    this.app.resize();
    this.menu.resize();
    this.fps.setMenuHeight(this.menu.getMenuHeight());
    this.fps.resize();

    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;

    this.currentScene.resize(screenWidth, screenHeight);
  };
}

new Game();