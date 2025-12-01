import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';

export type MenuItemKey = 'ace' | 'magic' | 'phoenix';
export type MenuChangeHandler = (key: MenuItemKey) => void;

interface MenuItem {
  key: MenuItemKey;
  label: string;
  text: Text;
  hitArea: Graphics;
}

export class Menu extends Container {
  private items: MenuItem[] = [];
  private activeKey: MenuItemKey;

  constructor(private app:Application, onChange: MenuChangeHandler, initial: MenuItemKey = 'ace') {
    super();
    this.sortableChildren = true;
    this.activeKey = initial;

    const labels: { key: MenuItemKey; label: string }[] = [
      { key: 'ace', label: 'Ace of Shadows' },
      { key: 'magic', label: 'Magic Words' },
      { key: 'phoenix', label: 'Phoenix Flame' },
    ];

    let x = 0;
    const gap = 16;

    for (const info of labels) {
      const text = new Text(
        info.label,
        new TextStyle({
          fill: info.key === this.activeKey ? '#ffd54f' : '#ffffff',
          fontSize: 16,
        }),
      );

      text.x = x;
      text.y = 0;

      const hit = new Graphics();
      hit.beginFill(0xffffff, 0.1);
      hit.drawRect(text.x - 4, text.y - 4, text.width + 8, text.height + 8);
      hit.endFill();

      hit.eventMode = 'static';
      hit.cursor = 'pointer';
      hit.on('pointertap', () => {
        this.setActive(info.key);
        onChange(info.key);
      });

      this.addChild(hit, text);

      this.items.push({ key: info.key, label: info.label, text, hitArea: hit });
      x += text.width + gap;
    }

    app.stage.addChild(this);
  }

  private setActive(key: MenuItemKey): void {
    this.activeKey = key;

    for (const item of this.items) {
      const style = item.text.style as TextStyle;
      style.fill = item.key === key ? '#ffd54f' : '#ffffff';
      item.text.dirty = true;
    }
  }

  layout(screenWidth: number): void {
    const totalWidth =
      this.items.reduce((sum, item) => sum + item.text.width, 0) +
      (this.items.length - 1) * 16;

    this.x = (screenWidth - totalWidth) / 2;
    this.y = 8;
  }
  
  resize = (): void => {
    const w = window.innerWidth;
    this.layout(w);
  };
}
