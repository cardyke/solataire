import { Card, PileLocation, GameState } from './types';
import { RANK_VALUES } from './constants';

export function canPlaceOnFoundation(card: Card, foundationPile: Card[]): boolean {
  if (foundationPile.length === 0) {
    return card.rank === 'A';
  }
  const topCard = foundationPile[foundationPile.length - 1];
  return (
    card.suit === topCard.suit &&
    RANK_VALUES[card.rank] === RANK_VALUES[topCard.rank] + 1
  );
}

export function canPlaceOnTableau(cards: Card[], tableauPile: Card[]): boolean {
  if (cards.length === 0) return false;
  const bottomCard = cards[0]; // bottom card of the stack being moved

  if (tableauPile.length === 0) {
    return bottomCard.rank === 'K'; // only Kings on empty tableau
  }

  const topCard = tableauPile[tableauPile.length - 1];
  if (!topCard.faceUp) return false;

  return (
    bottomCard.color !== topCard.color &&
    RANK_VALUES[bottomCard.rank] === RANK_VALUES[topCard.rank] - 1
  );
}

export function isValidMove(state: GameState, from: PileLocation, to: PileLocation, cardIndex: number): boolean {
  const sourcePile = getPile(state, from);
  if (cardIndex < 0 || cardIndex >= sourcePile.length) return false;

  const card = sourcePile[cardIndex];
  if (!card.faceUp) return false;

  const cardsToMove = sourcePile.slice(cardIndex);

  if (to.type === 'foundation') {
    // Can only move single cards to foundation
    if (cardsToMove.length !== 1) return false;
    return canPlaceOnFoundation(card, state.foundations[to.index]);
  }

  if (to.type === 'tableau') {
    return canPlaceOnTableau(cardsToMove, state.tableau[to.index]);
  }

  return false;
}

export function getPile(state: GameState, location: PileLocation): Card[] {
  switch (location.type) {
    case 'stock': return state.stock;
    case 'waste': return state.waste;
    case 'foundation': return state.foundations[location.index];
    case 'tableau': return state.tableau[location.index];
  }
}

// Find the best target for tap-to-move
export function findBestTarget(state: GameState, from: PileLocation, cardIndex: number): PileLocation | null {
  const sourcePile = getPile(state, from);
  const card = sourcePile[cardIndex];
  const cardsToMove = sourcePile.slice(cardIndex);

  // Priority 1: Foundation (only single cards)
  if (cardsToMove.length === 1) {
    for (let i = 0; i < 4; i++) {
      if (canPlaceOnFoundation(card, state.foundations[i])) {
        return { type: 'foundation', index: i };
      }
    }
  }

  // Priority 2: Tableau (prefer non-empty piles, then empty piles)
  let emptyTableau: number | null = null;
  for (let i = 0; i < 7; i++) {
    if (from.type === 'tableau' && from.index === i) continue;
    if (state.tableau[i].length === 0) {
      if (emptyTableau === null && card.rank === 'K') {
        emptyTableau = i;
      }
      continue;
    }
    if (canPlaceOnTableau(cardsToMove, state.tableau[i])) {
      return { type: 'tableau', index: i };
    }
  }

  // Use empty tableau for Kings only
  if (emptyTableau !== null) {
    return { type: 'tableau', index: emptyTableau };
  }

  return null;
}
