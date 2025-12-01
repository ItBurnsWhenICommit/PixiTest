import { Application, Container, Graphics, Text, TextStyle } from 'pixi.js';

export type MenuItemKey = 'ace' | 'magic' | 'phoenix' | 'phoenixShader';
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
  private onChange: MenuChangeHandler;
  private gap = 16;
  private padding = 8;
  private menuHeight = 0;

  constructor(private app: Application, onChange: MenuChangeHandler, initial: MenuItemKey = 'ace') {
    super();
    this.sortableChildren = true;
    this.activeKey = initial;
    this.onChange = onChange;

    const labels: { key: MenuItemKey; label: string }[] = [
      { key: 'ace', label: 'Ace of Shadows' },
      { key: 'magic', label: 'Magic Words' },
      { key: 'phoenix', label: 'Phoenix Flame' },
      { key: 'phoenixShader', label: 'Phoenix Flame (Shader)' },
    ];

    for (const info of labels) {
      const text = new Text(
        info.label,
        new TextStyle({
          fill: info.key === this.activeKey ? '#ffd54f' : '#ffffff',
          fontSize: 16,
        }),
      );

      const hit = new Graphics();
      hit.eventMode = 'static';
      hit.cursor = 'pointer';
      hit.on('pointertap', () => {
        this.setActive(info.key);
        this.onChange(info.key);
      });

      this.addChild(hit, text);
      this.items.push({ key: info.key, label: info.label, text, hitArea: hit });
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

  getMenuHeight(): number {
    return this.menuHeight;
  }

  resize = (): void => {
    const screenWidth = window.innerWidth;
    const maxWidth = screenWidth - this.padding * 2;

    // First pass: calculate positions and row breaks
    const positions: { x: number; y: number }[] = [];
    const rowRanges: { start: number; end: number; width: number }[] = [];

    let x = 0;
    let y = 0;
    let rowHeight = 0;
    let rowStartIndex = 0;

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];

      // Check if item fits on current row
      if (x > 0 && x + item.text.width > maxWidth) {
        // Save completed row info
        rowRanges.push({ start: rowStartIndex, end: i, width: x - this.gap });

        // Move to next row
        x = 0;
        y += rowHeight + this.gap;
        rowHeight = 0;
        rowStartIndex = i;
      }

      positions.push({ x, y });
      x += item.text.width + this.gap;
      rowHeight = Math.max(rowHeight, item.text.height + 8);
    }

    // Save last row
    rowRanges.push({ start: rowStartIndex, end: this.items.length, width: x - this.gap });

    // Second pass: center rows and apply positions
    for (const row of rowRanges) {
      const offsetX = (maxWidth - row.width) / 2;
      for (let i = row.start; i < row.end; i++) {
        positions[i].x += offsetX;
      }
    }

    for (let i = 0; i < this.items.length; i++) {
      const item = this.items[i];
      const pos = positions[i];

      item.text.x = pos.x;
      item.text.y = pos.y;

      item.hitArea.clear();
      item.hitArea.beginFill(0xffffff, 0.1);
      item.hitArea.drawRect(pos.x - 4, pos.y - 4, item.text.width + 8, item.text.height + 8);
      item.hitArea.endFill();

      rowHeight = Math.max(rowHeight, item.text.height + 8);
    }

    this.menuHeight = y + rowHeight + this.padding;
    this.x = this.padding;
    this.y = this.padding;
  };
}
