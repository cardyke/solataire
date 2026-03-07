import { GameState, GameAction, PileLocation, Card } from './types';
import { dealGame } from './deck';
import { isValidMove, findBestTarget, getPile, canPlaceOnFoundation } from './moves';
import { calculateMoveScore, calculateRecycleScore } from './scoring';
import { checkWin, canAutoComplete, findAutoCompleteMove } from './solver';

function cloneState(state: GameState): Omit<GameState, 'history'> {
  const { history, ...rest } = state;
  return JSON.parse(JSON.stringify(rest));
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'NEW_GAME': {
      return dealGame(
        action.drawMode || state.drawMode,
        action.scoringMode || state.scoringMode
      );
    }

    case 'RESTORE_STATE': {
      return action.state;
    }

    case 'DRAW_CARD': {
      if (state.stock.length === 0) return state;

      const snapshot = cloneState(state);
      const newStock = [...state.stock];
      const newWaste = [...state.waste];
      const drawCount = state.drawMode === 'draw3' ? Math.min(3, newStock.length) : 1;

      for (let i = 0; i < drawCount; i++) {
        const card = newStock.pop()!;
        newWaste.push({ ...card, faceUp: true });
      }

      return {
        ...state,
        stock: newStock,
        waste: newWaste,
        moves: state.moves + 1,
        history: [...state.history, { action, previousState: snapshot }],
      };
    }

    case 'RECYCLE_WASTE': {
      if (state.stock.length > 0 || state.waste.length === 0) return state;

      const snapshot = cloneState(state);
      const scoreChange = calculateRecycleScore(state.scoringMode, state.drawMode, state.stockPassCount);

      // Reverse waste back to stock, all face down
      const newStock = [...state.waste].reverse().map(c => ({ ...c, faceUp: false }));

      return {
        ...state,
        stock: newStock,
        waste: [],
        score: Math.max(0, state.score + scoreChange),
        stockPassCount: state.stockPassCount + 1,
        moves: state.moves + 1,
        history: [...state.history, { action, previousState: snapshot }],
      };
    }

    case 'MOVE_CARDS': {
      const { from, to, cardIndex } = action;
      if (!isValidMove(state, from, to, cardIndex)) return state;

      const snapshot = cloneState(state);
      const sourcePile = [...getPile(state, from)];
      const cardsToMove = sourcePile.splice(cardIndex);
      const destPile = [...getPile(state, to), ...cardsToMove];

      // Check if we need to flip the new top card of the source pile
      let flippedCard = false;
      if (from.type === 'tableau' && sourcePile.length > 0) {
        const newTop = sourcePile[sourcePile.length - 1];
        if (!newTop.faceUp) {
          sourcePile[sourcePile.length - 1] = { ...newTop, faceUp: true };
          flippedCard = true;
        }
      }

      const scoreChange = calculateMoveScore(from, to, flippedCard, state.scoringMode);

      const newState = applyPileChange(state, from, sourcePile);
      const finalState = applyPileChange(newState, to, destPile);

      const updatedState: GameState = {
        ...finalState,
        score: state.scoringMode === 'vegas'
          ? state.score + scoreChange
          : Math.max(0, state.score + scoreChange),
        moves: state.moves + 1,
        history: [...state.history, { action, previousState: snapshot }],
      };

      // Check for win
      if (checkWin(updatedState)) {
        return { ...updatedState, status: 'won' };
      }

      // Check for auto-complete availability
      if (canAutoComplete(updatedState) && !updatedState.autoCompleting) {
        return { ...updatedState, autoCompleting: true };
      }

      return updatedState;
    }

    case 'TAP_CARD': {
      const { pileLocation, cardIndex } = action;
      const pile = getPile(state, pileLocation);

      if (cardIndex < 0 || cardIndex >= pile.length) return state;
      const card = pile[cardIndex];

      // If card is face down and is top of tableau, flip it
      if (!card.faceUp && pileLocation.type === 'tableau' && cardIndex === pile.length - 1) {
        return gameReducer(state, { type: 'FLIP_CARD', pileLocation, cardIndex });
      }

      if (!card.faceUp) return state;

      // Try to find best target
      const target = findBestTarget(state, pileLocation, cardIndex);
      if (target) {
        return gameReducer(state, {
          type: 'MOVE_CARDS',
          from: pileLocation,
          to: target,
          cardIndex,
        });
      }

      return state;
    }

    case 'FLIP_CARD': {
      const { pileLocation, cardIndex } = action;
      if (pileLocation.type !== 'tableau') return state;

      const snapshot = cloneState(state);
      const pile = [...state.tableau[pileLocation.index]];
      pile[cardIndex] = { ...pile[cardIndex], faceUp: true };

      const newTableau = [...state.tableau];
      newTableau[pileLocation.index] = pile;

      return {
        ...state,
        tableau: newTableau,
        score: state.scoringMode === 'standard' ? state.score + 5 : state.score,
        history: [...state.history, { action, previousState: snapshot }],
      };
    }

    case 'UNDO': {
      if (state.history.length === 0) return state;
      const lastEntry = state.history[state.history.length - 1];
      return {
        ...lastEntry.previousState,
        history: state.history.slice(0, -1),
        status: 'playing',
        autoCompleting: false,
      } as GameState;
    }

    case 'AUTO_COMPLETE_STEP': {
      if (!state.autoCompleting) return state;

      const move = findAutoCompleteMove(state);
      if (!move) {
        if (checkWin(state)) {
          return { ...state, status: 'won', autoCompleting: false };
        }
        return { ...state, autoCompleting: false };
      }

      const targetFoundation = findTargetFoundation(state, move);
      if (targetFoundation === null) {
        return { ...state, autoCompleting: false };
      }

      return gameReducer(state, {
        type: 'MOVE_CARDS',
        from: move.from,
        to: { type: 'foundation', index: targetFoundation },
        cardIndex: move.cardIndex,
      });
    }

    default:
      return state;
  }
}

function findTargetFoundation(state: GameState, move: { from: { type: string; index: number }; cardIndex: number }): number | null {
  const pile = move.from.type === 'waste' ? state.waste : state.tableau[move.from.index];
  const card = pile[move.cardIndex];

  for (let f = 0; f < 4; f++) {
    if (canPlaceOnFoundation(card, state.foundations[f])) {
      return f;
    }
  }
  return null;
}

function applyPileChange(state: GameState, location: PileLocation, newPile: Card[]): GameState {
  switch (location.type) {
    case 'stock':
      return { ...state, stock: newPile };
    case 'waste':
      return { ...state, waste: newPile };
    case 'foundation': {
      const newFoundations = [...state.foundations];
      newFoundations[location.index] = newPile;
      return { ...state, foundations: newFoundations };
    }
    case 'tableau': {
      const newTableau = [...state.tableau];
      newTableau[location.index] = newPile;
      return { ...state, tableau: newTableau };
    }
  }
}
