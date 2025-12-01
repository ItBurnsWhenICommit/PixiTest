import { Assets, Container } from 'pixi.js';
import { Card } from '../core/Card';
import { Deck } from '../core/Deck';
import type { Scene } from '../core/Scene';

const CARDS_PER_DECK = 144;
const MOVE_INTERVAL = 1000; // 1 second between card moves
const ANIMATION_DURATION = 2; // 2 seconds animation

export class AceOfShadowsScene implements Scene {
  public readonly container = new Container();
  private decks: Deck[] = [];
  private loaded = false;
  private movingCards: Card[] = [];
  private timeSinceLastMove = 0;

  constructor() {
    this.container.sortableChildren = true;
    this.loadAssets();
  }

  private async loadAssets(): Promise<void> {
    await Assets.load([
      { alias: 'card_blue', src: '/assets/card_blue.png' },
      { alias: 'card_red', src: '/assets/card_red.png' },
      { alias: 'card_yellow', src: '/assets/card_yellow.png' },
    ]);

    const blueTexture = Assets.get('card_blue');
    const redTexture = Assets.get('card_red');
    const yellowTexture = Assets.get('card_yellow');

    const blueDeck = new Deck(blueTexture, CARDS_PER_DECK);
    const redDeck = new Deck(redTexture, CARDS_PER_DECK);
    const yellowDeck = new Deck(yellowTexture, CARDS_PER_DECK);

    this.decks.push(blueDeck, redDeck, yellowDeck);
    this.container.addChild(blueDeck, redDeck, yellowDeck);

    this.loaded = true;
    this.resize(window.innerWidth, window.innerHeight);
  }

  private moveTopCard(fromDeck: Deck, toDeck: Deck): void {
    const card = fromDeck.removeTopCard();
    if (!card) return;

    // Convert card position from source deck to container coordinates
    const globalPos = fromDeck.toGlobal(card.position);
    const localPos = this.container.toLocal(globalPos);

    card.x = localPos.x;
    card.y = localPos.y;

    // Calculate target position in container coordinates
    const targetLocalY = toDeck.getTopY();
    const targetGlobal = toDeck.toGlobal({ x: 0, y: targetLocalY });
    const targetLocal = this.container.toLocal(targetGlobal);

    // Set zIndex to target deck's top Y so card appears on top when it lands
    card.zIndex = targetLocal.y;

    this.container.addChild(card);
    this.movingCards.push(card);

    card.animateTo(targetLocal.x, targetLocal.y, ANIMATION_DURATION, () => {
      const idx = this.movingCards.indexOf(card);
      if (idx !== -1) this.movingCards.splice(idx, 1);

      this.container.removeChild(card);
      toDeck.addCard(card);
    });
  }

  update(dt: number): void {
    if (!this.loaded) return;

    for (const card of this.movingCards) {
      card.update(dt);
    }

    this.timeSinceLastMove += dt * 1000;
    if (this.timeSinceLastMove >= MOVE_INTERVAL) {
      this.timeSinceLastMove = 0;

      // Move cards: blue->red, red->yellow, yellow->blue
      if (this.decks[0].cardCount > 0) {
        this.moveTopCard(this.decks[0], this.decks[1]);
      }
      if (this.decks[1].cardCount > 0) {
        this.moveTopCard(this.decks[1], this.decks[2]);
      }
      if (this.decks[2].cardCount > 0) {
        this.moveTopCard(this.decks[2], this.decks[0]);
      }
    }
  }

  resize(width: number, height: number): void {
    if (!this.loaded) return;

    const minDimension = Math.min(width, height);
    const cardScale = minDimension < 768 ? minDimension / 768 : 1;
    const clampedScale = Math.max(cardScale, 0.4);

    const thirdWidth = width / 3;
    const startY = height / 3;

    for (let i = 0; i < this.decks.length; i++) {
      const deck = this.decks[i];
      deck.setCardScale(clampedScale);
      deck.x = thirdWidth * i + thirdWidth / 2;
      deck.y = startY;
    }
  }

  reset(): void {
    for (const card of this.movingCards) {
      card.destroy();
    }
    this.movingCards = [];

    for (const deck of this.decks) {
      deck.destroy();
    }
    this.decks = [];
    this.container.removeChildren();

    this.timeSinceLastMove = 0;
    this.loaded = false;
    this.loadAssets();
  }

  destroy(): void {
    for (const card of this.movingCards) {
      card.destroy();
    }
    this.movingCards = [];

    for (const deck of this.decks) {
      deck.destroy();
    }
    this.decks = [];
    this.container.destroy({ children: true });
  }
}