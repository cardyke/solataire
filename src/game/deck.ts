import { Card, GameState, DrawMode, ScoringMode } from './types';
import { SUITS, RANKS, SUIT_COLORS } from './constants';

export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({
        id: `${suit}-${rank}`,
        suit,
        rank,
        color: SUIT_COLORS[suit],
        faceUp: false,
      });
    }
  }
  return deck;
}

// Fisher-Yates shuffle
export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function dealGame(drawMode: DrawMode = 'draw1', scoringMode: ScoringMode = 'standard'): GameState {
  const deck = shuffleDeck(createDeck());
  const tableau: Card[][] = [];
  let cardIndex = 0;

  // Deal 7 tableau piles: pile i gets i+1 cards, top card face up
  for (let i = 0; i < 7; i++) {
    const pile: Card[] = [];
    for (let j = 0; j <= i; j++) {
      const card = { ...deck[cardIndex] };
      card.faceUp = j === i; // only top card face up
      pile.push(card);
      cardIndex++;
    }
    tableau.push(pile);
  }

  // Remaining cards go to stock (all face down)
  const stock = deck.slice(cardIndex).map(c => ({ ...c, faceUp: false }));

  return {
    stock,
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    drawMode,
    scoringMode,
    score: scoringMode === 'vegas' ? -52 : 0,
    moves: 0,
    history: [],
    status: 'playing',
    autoCompleting: false,
    stockPassCount: 0,
  };
}
