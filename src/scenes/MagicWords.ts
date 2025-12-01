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
const MAX_VISIBLE_MESSAGES = 12;
const CHAR_DELAY = 0.03;
const POST_MESSAGE_DELAY = 0.5;

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
  private dialogueComplete = false;
  private characterColors: Map<string, number> = new Map();

  private screenWidth = 0;
  private screenHeight = 0;

  // Typewriter state
  private isTyping = false;
  private typewriterTime = 0;
  private currentCharIndex = 0;
  private currentTextElements: (Text | Sprite)[] = [];
  private postMessageTime = 0;
  private currentBubbleBg: Graphics | null = null;
  private currentBubbleData: { nameHeight: number; bubbleWidth: number; contentContainer: Container; bubbleColor: number } | null = null;

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
    const shuffledColors = [...CHARACTER_COLORS].sort(() => Math.random() - 0.5);
    let colorIndex = 0;

    for (const avatar of this.chatData.avatars) {
      try {
        const texture = await Assets.load({
          src: avatar.url,
          loadParser: 'loadTextures',
        });
        this.avatarTextures.set(avatar.name, texture);
        this.avatarPositions.set(avatar.name, avatar.position);
        // Assign unique color, cycling if more characters than colors
        const uniqueColor = shuffledColors[colorIndex % shuffledColors.length];
        colorIndex++;
        this.characterColors.set(avatar.name, uniqueColor);
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
      this.isTyping = false;
      return;
    }

    const dialogue = this.chatData.dialogue[this.currentMessageIndex];
    const { bubble, elements, bg, contentContainer, nameHeight, bubbleWidth, bubbleColor } = this.createMessageBubble(dialogue, true);
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

    // Start typewriter effect
    this.currentTextElements = elements;
    this.currentCharIndex = 0;
    this.typewriterTime = 0;
    this.isTyping = true;
    this.currentBubbleBg = bg;
    this.currentBubbleData = { nameHeight, bubbleWidth, contentContainer, bubbleColor };

    this.currentMessageIndex++;
    this.layoutMessages();
  }

  private createMessageBubble(dialogue: DialogueEntry, hidden = false): { bubble: Container; elements: (Text | Sprite)[]; bg: Graphics; contentContainer: Container; nameHeight: number; bubbleWidth: number; bgX: number; bubbleColor: number } {
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

    const { container: contentContainer, elements } = this.createTextWithEmojis(
      dialogue.text,
      maxBubbleWidth - this.bubblePadding * 2 - this.baseUnit,
      hidden
    );
    bubble.addChild(contentContainer);

    const avatarGap = this.baseUnit;
    let bgX = 0;
    if (isLeft) {
      if (avatar) {
        avatar.x = 0;
        avatar.y = 0;
      }
      bgX = avatar ? this.avatarSize + avatarGap : 0;
    } else {
      bgX = 0;
      if (avatar) {
        avatar.y = 0;
      }
    }

    bg.x = bgX;
    bg.y = 0;
    nameText.x = bgX + this.bubblePadding;
    nameText.y = this.bubblePadding;
    contentContainer.x = bgX + this.bubblePadding;
    contentContainer.y = nameText.y + nameText.height + this.baseUnit * 0.5;

    // Calculate bubble dimensions based on visible content
    const bubbleColor = this.characterColors.get(dialogue.name) ?? 0x2a4d6e;
    const bubbleWidth = maxBubbleWidth;

    // Draw initial bubble (will be redrawn as content appears)
    this.drawBubbleBackground(bg, bubbleWidth, nameText.height, contentContainer, bubbleColor, hidden);

    // Position avatar for right-side bubbles (after we know bubble width)
    if (!isLeft && avatar) {
      avatar.x = bubbleWidth + avatarGap;
    }

    return { bubble, elements, bg, contentContainer, nameHeight: nameText.height, bubbleWidth, bgX, bubbleColor };
  }

  private drawBubbleBackground(bg: Graphics, bubbleWidth: number, nameHeight: number, contentContainer: Container, bubbleColor: number, hidden: boolean): void {
    bg.clear();

    // Calculate visible content height
    let visibleHeight = 0;
    for (const child of contentContainer.children) {
      if (child.visible) {
        visibleHeight = Math.max(visibleHeight, child.y + (child as Text | Sprite).height);
      }
    }

    // Minimum height shows just the name if no content visible yet
    const minHeight = nameHeight + this.bubblePadding * 2 + this.baseUnit * 0.5;
    const bubbleHeight = hidden || visibleHeight === 0
      ? minHeight
      : nameHeight + visibleHeight + this.bubblePadding * 2 + this.baseUnit;

    const borderRadius = this.baseUnit * 1.5;
    bg.beginFill(bubbleColor, 0.9);
    bg.lineStyle(Math.max(1, this.baseUnit * 0.2), 0xffffff, 0.4);
    bg.drawRoundedRect(0, 0, bubbleWidth, bubbleHeight, borderRadius);
    bg.endFill();
  }

  private createTextWithEmojis(text: string, maxWidth: number, hidden = false): { container: Container; elements: (Text | Sprite)[] } {
    const container = new Container();
    const elements: (Text | Sprite)[] = [];
    const emojiSz = this.emojiSize;
    const lineGap = this.baseUnit * 0.5;
    const charGap = this.baseUnit * 0.05;

    const style = new TextStyle({
      fontFamily: "Comic Relief",
      fill: '#ffffff',
      fontSize: this.fontSize,
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

    // Layout the parts - word by word, then character by character within words
    let x = 0;
    let y = 0;
    let lineHeight = emojiSz;

    // Measure space width
    const spaceText = new Text(' ', style);
    const spaceWidth = spaceText.width + this.baseUnit * 0.3;
    spaceText.destroy();

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
          sprite.visible = !hidden;
          container.addChild(sprite);
          elements.push(sprite);
          x += emojiSz + charGap;
        }
      } else {
        // Text part - split into words first for proper word wrap
        const content = part.content;
        // Split by spaces but keep track of spacing
        const tokens = content.split(/(\s+)/);

        for (const token of tokens) {
          // Handle whitespace tokens
          if (/^\s+$/.test(token)) {
            for (const char of token) {
              if (char === '\n') {
                x = 0;
                y += lineHeight + lineGap;
              } else {
                x += spaceWidth;
              }
            }
            continue;
          }

          // It's a word - measure the whole word first
          const wordMeasure = new Text(token, style);
          const wordWidth = wordMeasure.width;
          wordMeasure.destroy();

          // Check if word needs to wrap to next line
          if (x + wordWidth > maxWidth && x > 0) {
            x = 0;
            y += lineHeight + lineGap;
          }

          // Now render each character of the word
          for (const char of token) {
            const charText = new Text(char, style);
            charText.x = x;
            charText.y = y;
            charText.visible = !hidden;
            container.addChild(charText);
            elements.push(charText);

            x += charText.width + charGap;
            lineHeight = Math.max(lineHeight, charText.height);
          }
        }
      }
    }

    return { container, elements };
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

    if (this.isTyping) {
      // Typewriter effect
      this.typewriterTime += dt;
      let needsRedraw = false;

      while (this.typewriterTime >= CHAR_DELAY && this.currentCharIndex < this.currentTextElements.length) {
        this.currentTextElements[this.currentCharIndex].visible = true;
        this.currentCharIndex++;
        this.typewriterTime -= CHAR_DELAY;
        needsRedraw = true;
      }

      // Redraw bubble background to fit content
      if (needsRedraw && this.currentBubbleBg && this.currentBubbleData) {
        this.drawBubbleBackground(
          this.currentBubbleBg,
          this.currentBubbleData.bubbleWidth,
          this.currentBubbleData.nameHeight,
          this.currentBubbleData.contentContainer,
          this.currentBubbleData.bubbleColor,
          false
        );
        this.layoutMessages();
      }

      // Finished typing current message
      if (this.currentCharIndex >= this.currentTextElements.length) {
        this.isTyping = false;
        this.postMessageTime = 0;
        this.currentBubbleBg = null;
        this.currentBubbleData = null;
      }
    } else {
      // Wait before showing next message
      this.postMessageTime += dt;
      if (this.postMessageTime >= POST_MESSAGE_DELAY) {
        this.showNextMessage();
      }
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

    // Remember if we were typing (need to restart current message)
    const wasTyping = this.isTyping;

    // Clear existing messages
    for (const msg of this.messages) {
      msg.destroy({ children: true });
    }
    this.messages = [];
    this.chatContainer.removeChildren();

    // Reset typewriter state since bubbles are destroyed
    this.isTyping = false;
    this.currentBubbleBg = null;
    this.currentBubbleData = null;
    this.currentTextElements = [];

    // Rebuild all completed messages (all visible, no typewriter)
    // If we were typing, rebuild up to the previous message only
    const endIndex = wasTyping ? this.currentMessageIndex - 1 : this.currentMessageIndex;
    const startIndex = Math.max(0, endIndex - MAX_VISIBLE_MESSAGES);

    for (let i = startIndex; i < endIndex; i++) {
      const dialogue = this.chatData.dialogue[i];
      const { bubble } = this.createMessageBubble(dialogue, false);
      this.messages.push(bubble);
      this.chatContainer.addChild(bubble);
    }

    this.layoutMessages();

    // If we were typing, restart the current message
    if (wasTyping && this.currentMessageIndex > 0) {
      this.currentMessageIndex--; // Back up to re-show the current message
      this.showNextMessage();
    }
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
    this.isTyping = false;
    this.typewriterTime = 0;
    this.currentCharIndex = 0;
    this.currentTextElements = [];
    this.postMessageTime = 0;
    this.currentBubbleBg = null;
    this.currentBubbleData = null;
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

