import { Container, Texture } from 'pixi.js';
import { Card } from './Card';

export class Deck extends Container {
  private cards: Card[] = [];
  private cardScale = 1;

  constructor(texture: Texture, cardCount: number) {
    super();

    for (let i = 0; i < cardCount; i++) {
      const card = new Card(texture);
      card.y = card.cardHeight * 0.01 * i + (Math.random() * card.cardHeight * 0.05);
      card.x = card.cardWidth * 0.01 + (Math.random() * card.cardHeight * 0.05);
      card.rotation = (Math.random() * 6 - 3) * (Math.PI / 180);
      this.cards.push(card);
      this.addChild(card);
    }
  }

  get cardCount(): number {
    return this.cards.length;
  }

  getCard(index: number): Card | undefined {
    return this.cards[index];
  }

  getTopCard(): Card | undefined {
    return this.cards[this.cards.length - 1];
  }

  getBottomY(): number {
    if (this.cards.length > 0) {
      return this.cards[0].y;
    }
    return 0;
  }

  removeTopCard(): Card | null {
    if (this.cards.length === 0) return null;
    const card = this.cards.pop()!;
    this.removeChild(card);
    return card;
  }

  addCardToBottom(card: Card): void {
    const bottomY = this.getBottomY();
    card.y = bottomY;
    card.x = card.cardWidth * 0.01 + (Math.random() * card.cardHeight * 0.05);
    card.rotation = (Math.random() * 6 - 3) * (Math.PI / 180);
    card.setScale(this.cardScale);

    // Shift all existing cards up by one position
    const offsetY = card.cardHeight * 0.01 + (Math.random() * card.cardHeight * 0.05);
    for (const existingCard of this.cards) {
      existingCard.y += offsetY;
    }

    // Insert at bottom of array and display list
    this.cards.unshift(card);
    this.addChildAt(card, 0);
  }

  setCardScale(scale: number): void {
    this.cardScale = scale;
    for (const card of this.cards) {
      card.setScale(scale);
    }
  }

  destroy(): void {
    for (const card of this.cards) {
      card.destroy();
    }
    this.cards = [];
    super.destroy({ children: true });
  }
}

