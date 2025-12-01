import { Assets, Container, Graphics, Sprite, Text, TextStyle, Texture } from 'pixi.js';
import type { Scene } from '../core/Scene';

interface DialogueEntry {
  name: string;
  text: string;
}

interface EmojiData {
  name: string;
  url: string;
}

interface AvatarData {
  name: string;
  url: string;
  position: 'left' | 'right';
}

interface ChatData {
  dialogue: DialogueEntry[];
  emojies: EmojiData[];
  avatars: AvatarData[];
}

const API_URL = 'https://private-624120-softgamesassignment.apiary-mock.com/v2/magicwords';
const MESSAGE_DELAY = 2;
const MAX_VISIBLE_MESSAGES = 12;

const CHARACTER_COLORS: number[] = [
  0x2a4d6e,
  0x6e2a4d,
  0x4d6e2a,
  0x6e4d2a,
  0x2a6e4d,
  0x4d2a6e,
  0x6e5a2a,
  0x2a5a6e,
];

export class MagicWordsScene implements Scene {
  public readonly container = new Container();

  private chatData: ChatData | null = null;
  private loaded = false;
  private emojiTextures: Map<string, Texture> = new Map();
  private avatarTextures: Map<string, Texture> = new Map();
  private avatarPositions: Map<string, 'left' | 'right'> = new Map();

  private chatContainer: Container = new Container();
  private messages: Container[] = [];
  private currentMessageIndex = 0;
  private timeSinceLastMessage = 0;
  private dialogueComplete = false;
  private characterColors: Map<string, number> = new Map();

  private screenWidth = 0;
  private screenHeight = 0;

  // Responsive sizes calculated from screen dimensions
  private get baseUnit(): number {
    return Math.min(this.screenWidth, this.screenHeight) / 100;
  }

  private get chatPadding(): number {
    return this.baseUnit * 2;
  }

  private get bubblePadding(): number {
    return this.baseUnit * 1.5;
  }

  private get avatarSize(): number {
    return this.baseUnit * 10;
  }

  private get emojiSize(): number {
    return this.baseUnit * 3;
  }

  private get fontSize(): number {
    return this.baseUnit * 2.5;
  }

  private get nameFontSize(): number {
    return this.baseUnit * 2.2;
  }

  constructor() {
    this.container.addChild(this.chatContainer);
    this.loadData();
  }

  private async loadData(): Promise<void> {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('API request failed');
      this.chatData = await response.json();
    } catch (e) {
      console.error('Failed to load chat data:', e);
      return;
    }

    if (!this.chatData) return;

    // Load emoji textures with proper loader hints for URLs without extensions
    for (const emoji of this.chatData.emojies) {
      try {
        const texture = await Assets.load({
          src: emoji.url,
          loadParser: 'loadTextures',
        });
        this.emojiTextures.set(emoji.name, texture);
      } catch (e) {
        console.warn(`Failed to load emoji: ${emoji.name}`, e);
      }
    }

    // Load avatar textures and positions with proper loader hints
    for (const avatar of this.chatData.avatars) {
      try {
        const texture = await Assets.load({
          src: avatar.url,
          loadParser: 'loadTextures',
        });
        this.avatarTextures.set(avatar.name, texture);
        this.avatarPositions.set(avatar.name, avatar.position);
        const randomColor = CHARACTER_COLORS[Math.floor(Math.random() * CHARACTER_COLORS.length)];
        this.characterColors.set(avatar.name, randomColor);
      } catch (e) {
        console.warn(`Failed to load avatar: ${avatar.name}`, e);
      }
    }

    this.loaded = true;

    // Show first message
    if (this.chatData.dialogue.length > 0) {
      this.showNextMessage();
    }

    this.resize(this.screenWidth, this.screenHeight);
  }

  private showNextMessage(): void {
    if (!this.chatData || this.currentMessageIndex >= this.chatData.dialogue.length) {
      this.dialogueComplete = true;
      return;
    }

    const dialogue = this.chatData.dialogue[this.currentMessageIndex];
    const bubble = this.createMessageBubble(dialogue);
    this.messages.push(bubble);
    this.chatContainer.addChild(bubble);

    // Remove old messages if too many
    while (this.messages.length > MAX_VISIBLE_MESSAGES) {
      const oldBubble = this.messages.shift();
      if (oldBubble) {
        this.chatContainer.removeChild(oldBubble);
        oldBubble.destroy({ children: true });
      }
    }

    this.currentMessageIndex++;
    this.layoutMessages();
  }

  private createMessageBubble(dialogue: DialogueEntry): Container {
    const bubble = new Container();
    const isLeft = this.avatarPositions.get(dialogue.name) === 'left';

    const halfScreen = this.screenWidth / 2 - this.chatPadding * 2;
    const maxBubbleWidth = halfScreen - this.avatarSize - this.baseUnit;

    // Create avatar
    const avatarTexture = this.avatarTextures.get(dialogue.name);
    let avatar: Sprite | null = null;
    if (avatarTexture) {
      avatar = new Sprite(avatarTexture);
      avatar.width = this.avatarSize;
      avatar.height = this.avatarSize;
      bubble.addChild(avatar);
    }

    // Create bubble background
    const bg = new Graphics();
    bubble.addChild(bg);

    // Create name text
    const nameText = new Text(
      dialogue.name,
      new TextStyle({
        fontFamily: "Comic Relief",
        fill: '#ffcc00',
        fontSize: this.nameFontSize
      })
    );
    bubble.addChild(nameText);

    // Parse text and create content with inline emojis
    const contentContainer = this.createTextWithEmojis(dialogue.text, maxBubbleWidth - this.bubblePadding * 2 - this.baseUnit);
    bubble.addChild(contentContainer);

    // Calculate bubble dimensions
    const contentHeight = contentContainer.height;
    const bubbleWidth = maxBubbleWidth;
    const bubbleHeight = nameText.height + contentHeight + this.bubblePadding * 2 + this.baseUnit * 0.5;

    // Draw bubble background with character-specific color
    const bubbleColor = this.characterColors.get(dialogue.name) ?? 0x2a4d6e;
    const borderRadius = this.baseUnit * 1.5;
    bg.beginFill(bubbleColor, 0.9);
    bg.lineStyle(Math.max(1, this.baseUnit * 0.2), 0xffffff, 0.4);
    bg.drawRoundedRect(0, 0, bubbleWidth, bubbleHeight, borderRadius);
    bg.endFill();

    // Position elements
    const avatarGap = this.baseUnit;
    if (isLeft) {
      if (avatar) {
        avatar.x = 0;
        avatar.y = 0;
      }
      bg.x = avatar ? this.avatarSize + avatarGap : 0;
    } else {
      bg.x = 0;
      if (avatar) {
        avatar.x = bubbleWidth + avatarGap;
        avatar.y = 0;
      }
    }

    bg.y = 0;
    nameText.x = bg.x + this.bubblePadding;
    nameText.y = this.bubblePadding;
    contentContainer.x = bg.x + this.bubblePadding;
    contentContainer.y = nameText.y + nameText.height + this.baseUnit * 0.5;

    return bubble;
  }

  private createTextWithEmojis(text: string, maxWidth: number): Container {
    const container = new Container();
    const emojiSz = this.emojiSize;
    const lineGap = this.baseUnit * 0.5;

    const wordGap = this.baseUnit * 0.8;
    const style = new TextStyle({
      fontFamily: "Comic Relief",
      fill: '#ffffff',
      fontSize: this.fontSize,
      wordWrap: true,
      wordWrapWidth: maxWidth,
    });

    // Parse text for emoji patterns like {emoji_name}
    const emojiPattern = /\{([^}]+)\}/g;
    const parts: { type: 'text' | 'emoji'; content: string }[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = emojiPattern.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: text.slice(lastIndex, match.index) });
      }
      parts.push({ type: 'emoji', content: match[1] });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
      parts.push({ type: 'text', content: text.slice(lastIndex) });
    }

    // Layout the parts
    let x = 0;
    let y = 0;
    let lineHeight = emojiSz;
    let maxX = 0;

    for (const part of parts) {
      if (part.type === 'emoji') {
        const texture = this.emojiTextures.get(part.content);
        if (texture) {
          // Check if emoji would overflow
          if (x + emojiSz > maxWidth && x > 0) {
            x = 0;
            y += lineHeight + lineGap;
          }

          const sprite = new Sprite(texture);
          sprite.width = emojiSz;
          sprite.height = emojiSz;
          sprite.x = x;
          sprite.y = y;
          container.addChild(sprite);
          x += emojiSz + lineGap;
          maxX = Math.max(maxX, x);
        }
      } else {
        // Text part - may contain spaces that need trimming at line start
        let content = part.content;
        if (x === 0) {
          content = content.trimStart();
        }

        // Split by words for word wrapping
        const words = content.split(/\s+/).filter(w => w.length > 0);
        for (const word of words) {
          const testText = new Text(word, style);
          const wordWidth = testText.width;

          // Check if word would overflow
          if (x + wordWidth > maxWidth && x > 0) {
            x = 0;
            y += lineHeight + lineGap;
          }

          testText.x = x;
          testText.y = y;
          container.addChild(testText);

          x += wordWidth + wordGap;
          maxX = Math.max(maxX, x);
          lineHeight = Math.max(lineHeight, testText.height);
        }
      }
    }

    return container;
  }

  private layoutMessages(): void {
    let y = this.screenHeight - this.chatPadding;
    const messageGap = this.baseUnit;

    // Layout from bottom to top
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const msg = this.messages[i];
      y -= msg.height + messageGap;
      msg.y = y;

      // Position based on speaker side (check if avatar is at x=0)
      const isLeft = msg.children.some(
        child => child instanceof Sprite && child.x === 0 && Math.abs(child.width - this.avatarSize) < 1
      );

      if (isLeft) {
        msg.x = this.chatPadding;
      } else {
        msg.x = this.screenWidth - msg.width - this.chatPadding;
      }

      // Fade out messages near top
      const fadeStart = this.screenHeight * 0.2;
      if (y < fadeStart) {
        msg.alpha = Math.max(0, y / fadeStart);
      } else {
        msg.alpha = 1;
      }
    }
  }

  update(dt: number): void {
    if (!this.loaded || this.dialogueComplete) return;

    this.timeSinceLastMessage += dt;
    if (this.timeSinceLastMessage >= MESSAGE_DELAY) {
      this.timeSinceLastMessage = 0;
      this.showNextMessage();
    }
  }

  resize(width: number, height: number): void {
    this.screenWidth = width;
    this.screenHeight = height;

    if (this.loaded) {
      // Rebuild messages for new width
      this.rebuildMessages();
    }
  }

  private rebuildMessages(): void {
    if (!this.chatData) return;

    // Clear existing messages
    for (const msg of this.messages) {
      msg.destroy({ children: true });
    }
    this.messages = [];
    this.chatContainer.removeChildren();

    // Rebuild all shown messages
    const endIndex = this.currentMessageIndex;
    const startIndex = Math.max(0, endIndex - MAX_VISIBLE_MESSAGES);

    for (let i = startIndex; i < endIndex; i++) {
      const dialogue = this.chatData.dialogue[i];
      const bubble = this.createMessageBubble(dialogue);
      this.messages.push(bubble);
      this.chatContainer.addChild(bubble);
    }

    this.layoutMessages();
  }

  reset(): void {
    // Clear messages
    for (const msg of this.messages) {
      msg.destroy({ children: true });
    }
    this.messages = [];
    this.chatContainer.removeChildren();

    // Reset state
    this.currentMessageIndex = 0;
    this.timeSinceLastMessage = 0;
    this.dialogueComplete = false;

    // Show first message again if data loaded
    if (this.loaded && this.chatData && this.chatData.dialogue.length > 0) {
      this.showNextMessage();
    }
  }

  destroy(): void {
    for (const msg of this.messages) {
      msg.destroy({ children: true });
    }
    this.messages = [];
    this.emojiTextures.clear();
    this.avatarTextures.clear();
    this.container.destroy({ children: true });
  }
}

