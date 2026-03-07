import { GameState } from './types';

export function checkWin(state: GameState): boolean {
  return state.foundations.every(pile => pile.length === 13);
}

// Auto-complete is available when all tableau cards are face-up
// and stock + waste are empty
export function canAutoComplete(state: GameState): boolean {
  if (state.stock.length > 0) return false;
  if (state.waste.length > 0 && state.waste.some(c => !c.faceUp)) return false;

  return state.tableau.every(pile =>
    pile.every(card => card.faceUp)
  );
}

// Find the next card that can be moved to foundation for auto-complete
export function findAutoCompleteMove(state: GameState): { from: { type: 'waste' | 'tableau'; index: number }; cardIndex: number } | null {
  // Check waste pile first
  if (state.waste.length > 0) {
    const topWaste = state.waste[state.waste.length - 1];
    for (let f = 0; f < 4; f++) {
      const foundation = state.foundations[f];
      if (foundation.length === 0 && topWaste.rank === 'A') {
        return { from: { type: 'waste', index: 0 }, cardIndex: state.waste.length - 1 };
      }
      if (foundation.length > 0) {
        const topF = foundation[foundation.length - 1];
        if (topWaste.suit === topF.suit) {
          const RANK_VALUES: Record<string, number> = {
            'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
            '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13,
          };
          if (RANK_VALUES[topWaste.rank] === RANK_VALUES[topF.rank] + 1) {
            return { from: { type: 'waste', index: 0 }, cardIndex: state.waste.length - 1 };
          }
        }
      }
    }
  }

  // Check tableau piles
  for (let t = 0; t < 7; t++) {
    const pile = state.tableau[t];
    if (pile.length === 0) continue;
    const topCard = pile[pile.length - 1];
    for (let f = 0; f < 4; f++) {
      const foundation = state.foundations[f];
      if (foundation.length === 0 && topCard.rank === 'A') {
        return { from: { type: 'tableau', index: t }, cardIndex: pile.length - 1 };
      }
      if (foundation.length > 0) {
        const topF = foundation[foundation.length - 1];
        if (topCard.suit === topF.suit) {
          const RANK_VALUES: Record<string, number> = {
            'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
            '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13,
          };
          if (RANK_VALUES[topCard.rank] === RANK_VALUES[topF.rank] + 1) {
            return { from: { type: 'tableau', index: t }, cardIndex: pile.length - 1 };
          }
        }
      }
    }
  }

  return null;
}
