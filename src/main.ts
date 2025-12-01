import { Application } from 'pixi.js';
import { FpsCounter } from './ui/FpsCounter';

const app = new Application({
    resizeTo: window,
    backgroundColor: 0x105101,
});

document.body.appendChild(app.view as HTMLCanvasElement);

new FpsCounter(app);