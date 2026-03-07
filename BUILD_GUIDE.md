# Klondike Solitaire - Complete Build Guide

## Quick Start

```bash
# Navigate to project directory
cd C:\andyserver\solataire

# Run Claude Code with auto-permissions (no confirmation prompts)
claude --dangerously-skip-permissions

# Then paste this prompt:
# "Implement the Klondike Solitaire app following BUILD_GUIDE.md"
```

---

## Overview

Build a full-featured Klondike Solitaire web app. Mobile-first (Android), deployed on Vercel as a static Next.js app.

## Tech Stack

- **Next.js** (latest, App Router, TypeScript) with `output: 'export'` for static deployment
- **CSS Modules** with CSS custom properties for styling (no Tailwind)
- **useReducer** for game state management
- **Pointer Events API** for unified touch + mouse drag/drop
- **Unicode suits** (♠♥♦♣) - no image assets needed
- **PWA** via manifest.ts + service worker for "Add to Home Screen"

---

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout, meta tags, viewport
│   ├── page.tsx            # Renders <Game />
│   └── manifest.ts         # PWA manifest
├── components/
│   ├── Game.tsx            # Top-level: wires state, timer, stats
│   ├── Board.tsx           # CSS Grid layout for all piles
│   ├── Card.tsx            # Single card (face/back, suit symbols)
│   ├── StockPile.tsx       # Draw pile (click to draw)
│   ├── WastePile.tsx       # Drawn cards
│   ├── FoundationPile.tsx  # 4 foundation slots (A→K by suit)
│   ├── TableauPile.tsx     # 7 fanned columns
│   ├── DragOverlay.tsx     # Floating card(s) during drag
│   ├── Toolbar.tsx         # Undo, new game, timer, score
│   ├── WinCelebration.tsx  # Confetti + card cascade on win
│   ├── NewGameDialog.tsx   # New game options
│   └── StatsDialog.tsx     # Lifetime stats display
├── game/
│   ├── types.ts            # All TypeScript interfaces
│   ├── constants.ts        # Suits, ranks, symbols, scoring values
│   ├── deck.ts             # Deck creation, Fisher-Yates shuffle, dealing
│   ├── moves.ts            # Move validation, findBestTarget for tap-to-move
│   ├── scoring.ts          # Score calculations (standard + Vegas)
│   ├── solver.ts           # Win detection, auto-complete detection
│   └── reducer.ts          # Game reducer: all state transitions + undo
├── hooks/
│   ├── useGameState.ts     # useReducer + localStorage persistence
│   ├── useDragAndDrop.ts   # Pointer Events, drag threshold, drop zone hit-testing
│   ├── useTimer.ts         # Start/pause/reset timer
│   └── useStats.ts         # Stats read/write to localStorage
├── styles/
│   ├── globals.css         # CSS reset, custom properties, responsive breakpoints
│   ├── card.module.css     # Card face/back, suit colors, flip animation
│   ├── board.module.css    # Grid layout
│   └── animations.module.css # Keyframes (flip, confetti, cascade)
└── lib/
    └── storage.ts          # localStorage abstraction
```

---

## Phase 1: Scaffold

### Step 1 - Create Next.js App

```bash
cd C:\andyserver\solataire
npx create-next-app@latest . --typescript --app --no-tailwind --no-eslint --src-dir --import-alias "@/*" --use-npm
# When asked about React Compiler, select "No"
```

### Step 2 - Configure Static Export

**`next.config.ts`:**
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
```

### Step 3 - Clean Up Defaults

- Remove default page content from `src/app/page.tsx`
- Remove default styles from `src/app/globals.css`
- Delete `src/app/page.module.css` (we'll use our own CSS modules)

---

## Phase 2: Game Logic

### File: `src/game/types.ts`

All core TypeScript interfaces:

```typescript
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Color = 'red' | 'black';
export type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  id: string;          // e.g., "hearts-A"
  suit: Suit;
  rank: Rank;
  color: Color;
  faceUp: boolean;
}

export type PileType = 'stock' | 'waste' | 'foundation' | 'tableau';

export interface PileLocation {
  type: PileType;
  index: number;       // 0-3 for foundation, 0-6 for tableau, 0 for stock/waste
}

export interface MoveAction {
  from: PileLocation;
  to: PileLocation;
  cards: Card[];       // cards being moved
  flipCard?: string;   // id of card that gets flipped after move
  scoreChange?: number;
}

export type DrawMode = 'draw1' | 'draw3';
export type ScoringMode = 'standard' | 'vegas';

export interface GameState {
  stock: Card[];
  waste: Card[];
  foundations: Card[][];   // 4 piles
  tableau: Card[][];       // 7 piles
  drawMode: DrawMode;
  scoringMode: ScoringMode;
  score: number;
  moves: number;
  history: HistoryEntry[];
  status: 'playing' | 'won' | 'idle';
  autoCompleting: boolean;
  stockPassCount: number;  // for Vegas scoring
}

export interface HistoryEntry {
  action: GameAction;
  previousState: Omit<GameState, 'history'>; // snapshot for undo
}

export type GameAction =
  | { type: 'DRAW_CARD' }
  | { type: 'RECYCLE_WASTE' }
  | { type: 'MOVE_CARDS'; from: PileLocation; to: PileLocation; cardIndex: number }
  | { type: 'TAP_CARD'; pileLocation: PileLocation; cardIndex: number }
  | { type: 'UNDO' }
  | { type: 'NEW_GAME'; drawMode?: DrawMode; scoringMode?: ScoringMode }
  | { type: 'AUTO_COMPLETE_STEP' }
  | { type: 'RESTORE_STATE'; state: GameState }
  | { type: 'FLIP_CARD'; pileLocation: PileLocation; cardIndex: number };

export interface DropZone {
  location: PileLocation;
  rect: DOMRect;
}

export interface DragState {
  cards: Card[];
  from: PileLocation;
  cardIndex: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  isDragging: boolean; // true once threshold crossed
}

export interface GameStats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  longestStreak: number;
  bestTime: number | null;    // seconds
  bestScore: number | null;
  totalTimePlayed: number;    // seconds
}
```

### File: `src/game/constants.ts`

```typescript
import { Suit, Rank, Color } from './types';

export const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];

export const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const SUIT_SYMBOLS: Record<Suit, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

export const SUIT_COLORS: Record<Suit, Color> = {
  hearts: 'red',
  diamonds: 'red',
  clubs: 'black',
  spades: 'black',
};

export const RANK_VALUES: Record<Rank, number> = {
  'A': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13,
};

// Standard scoring
export const SCORE = {
  WASTE_TO_TABLEAU: 5,
  WASTE_TO_FOUNDATION: 10,
  TABLEAU_TO_FOUNDATION: 10,
  FOUNDATION_TO_TABLEAU: -15,
  FLIP_TABLEAU_CARD: 5,
  RECYCLE_WASTE: -100, // draw 3 only (after first pass in draw 1)
};

export const DRAG_THRESHOLD = 8; // pixels before drag starts
export const TABLEAU_COUNT = 7;
export const FOUNDATION_COUNT = 4;
```

### File: `src/game/deck.ts`

```typescript
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
```

### File: `src/game/moves.ts`

Key move validation logic:

```typescript
import { Card, PileLocation, GameState } from './types';
import { RANK_VALUES, RANKS } from './constants';

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
```

### File: `src/game/scoring.ts`

```typescript
import { PileLocation, ScoringMode } from './types';
import { SCORE } from './constants';

export function calculateMoveScore(
  from: PileLocation,
  to: PileLocation,
  flippedCard: boolean,
  scoringMode: ScoringMode
): number {
  let score = 0;

  if (scoringMode === 'vegas') {
    // Vegas: only score foundation moves (+$5 each)
    if (to.type === 'foundation') score += 5;
    if (from.type === 'foundation') score -= 5;
    return score;
  }

  // Standard scoring
  if (from.type === 'waste' && to.type === 'tableau') score += SCORE.WASTE_TO_TABLEAU;
  else if (from.type === 'waste' && to.type === 'foundation') score += SCORE.WASTE_TO_FOUNDATION;
  else if (from.type === 'tableau' && to.type === 'foundation') score += SCORE.TABLEAU_TO_FOUNDATION;
  else if (from.type === 'foundation' && to.type === 'tableau') score += SCORE.FOUNDATION_TO_TABLEAU;

  if (flippedCard) score += SCORE.FLIP_TABLEAU_CARD;

  return score;
}

export function calculateRecycleScore(scoringMode: ScoringMode, drawMode: string, passCount: number): number {
  if (scoringMode === 'vegas') return 0;
  if (drawMode === 'draw3') return passCount >= 1 ? SCORE.RECYCLE_WASTE : 0;
  return passCount >= 1 ? SCORE.RECYCLE_WASTE : 0;
}
```

### File: `src/game/solver.ts`

```typescript
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
```

### File: `src/game/reducer.ts`

The game reducer handles all state transitions:

```typescript
import { GameState, GameAction, PileLocation } from './types';
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

function applyPileChange(state: GameState, location: PileLocation, newPile: any[]): GameState {
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
```

---

## Phase 3: Visual Cards & Board

### File: `src/styles/globals.css`

```css
:root {
  --card-width: min(70px, 12vw);
  --card-height: calc(var(--card-width) * 1.4);
  --card-radius: calc(var(--card-width) * 0.08);
  --card-gap: calc(var(--card-width) * 0.15);
  --tableau-offset: calc(var(--card-height) * 0.22);
  --tableau-offset-facedown: calc(var(--card-height) * 0.08);
  --board-padding: 8px;

  --color-felt: #0d7a3e;
  --color-felt-dark: #0a6331;
  --color-card-back: #1a5276;
  --color-card-face: #ffffff;
  --color-red: #d63031;
  --color-black: #2d3436;
  --color-empty-pile: rgba(255, 255, 255, 0.15);
  --color-toolbar: rgba(0, 0, 0, 0.3);
  --color-text-light: #ffffff;

  --font-card: 'Segoe UI', system-ui, -apple-system, sans-serif;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  overflow: hidden;
  font-family: var(--font-card);
  background: var(--color-felt);
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  -webkit-touch-callout: none;
}

/* Prevent pull-to-refresh and overscroll */
body {
  overscroll-behavior: none;
}
```

### File: `src/styles/card.module.css`

Card rendering with suit symbols, face/back states, colors:

```css
.card {
  position: absolute;
  width: var(--card-width);
  height: var(--card-height);
  border-radius: var(--card-radius);
  font-family: var(--font-card);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  will-change: transform;
  -webkit-tap-highlight-color: transparent;
}

.cardFace {
  background: var(--color-card-face);
  border: 1px solid #ccc;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  padding: calc(var(--card-width) * 0.06);
  overflow: hidden;
}

.cardBack {
  background: var(--color-card-back);
  border: 1px solid #144a68;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  /* Diamond pattern on back */
  background-image:
    repeating-linear-gradient(
      45deg,
      transparent,
      transparent 5px,
      rgba(255, 255, 255, 0.05) 5px,
      rgba(255, 255, 255, 0.05) 10px
    ),
    repeating-linear-gradient(
      -45deg,
      transparent,
      transparent 5px,
      rgba(255, 255, 255, 0.05) 5px,
      rgba(255, 255, 255, 0.05) 10px
    );
}

.cornerInfo {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
}

.topLeft {
  position: absolute;
  top: calc(var(--card-width) * 0.04);
  left: calc(var(--card-width) * 0.06);
}

.bottomRight {
  position: absolute;
  bottom: calc(var(--card-width) * 0.04);
  right: calc(var(--card-width) * 0.06);
  transform: rotate(180deg);
}

.rank {
  font-size: calc(var(--card-width) * 0.22);
  font-weight: 700;
}

.suitSmall {
  font-size: calc(var(--card-width) * 0.18);
}

.centerSuit {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: calc(var(--card-width) * 0.45);
}

.red {
  color: var(--color-red);
}

.black {
  color: var(--color-black);
}

.dragging {
  opacity: 0.5;
  pointer-events: none;
}

.selected {
  box-shadow: 0 0 0 3px #f1c40f, 0 2px 8px rgba(0, 0, 0, 0.3);
}

/* Flip animation */
.flipping {
  animation: flipCard 0.3s ease-in-out;
}

@keyframes flipCard {
  0% { transform: scaleX(1); }
  50% { transform: scaleX(0); }
  100% { transform: scaleX(1); }
}
```

### File: `src/styles/board.module.css`

```css
.board {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: var(--board-padding);
  gap: calc(var(--card-height) * 0.15);
}

.topRow {
  display: flex;
  gap: var(--card-gap);
  min-height: var(--card-height);
}

.stockWaste {
  display: flex;
  gap: var(--card-gap);
}

.spacer {
  flex: 0 0 var(--card-width);
}

.foundations {
  display: flex;
  gap: var(--card-gap);
  margin-left: auto;
}

.tableauRow {
  display: flex;
  gap: var(--card-gap);
  flex: 1;
  justify-content: center;
}

.pile {
  position: relative;
  width: var(--card-width);
  height: var(--card-height);
}

.emptyPile {
  width: var(--card-width);
  height: var(--card-height);
  border: 2px dashed var(--color-empty-pile);
  border-radius: var(--card-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(var(--card-width) * 0.35);
  color: var(--color-empty-pile);
}

.tableauColumn {
  position: relative;
  width: var(--card-width);
  min-height: var(--card-height);
}

.refreshIcon {
  width: var(--card-width);
  height: var(--card-height);
  border: 2px dashed var(--color-empty-pile);
  border-radius: var(--card-radius);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(var(--card-width) * 0.4);
  color: var(--color-empty-pile);
  cursor: pointer;
}
```

### File: `src/styles/animations.module.css`

```css
/* Confetti animation */
.confettiPiece {
  position: fixed;
  width: 10px;
  height: 10px;
  opacity: 0;
  animation: confettiFall var(--duration, 3s) ease-in var(--delay, 0s) forwards;
}

@keyframes confettiFall {
  0% {
    opacity: 1;
    transform: translateY(0) rotate(0deg);
  }
  100% {
    opacity: 0;
    transform: translateY(100vh) rotate(720deg);
  }
}

/* Card cascade (win animation) */
.cascadeCard {
  position: fixed;
  animation: cascade var(--cascade-duration, 2s) ease-in var(--cascade-delay, 0s) forwards;
}

@keyframes cascade {
  0% {
    transform: translate(var(--start-x, 0), var(--start-y, 0));
    opacity: 1;
  }
  100% {
    transform: translate(var(--end-x, 0), 100vh);
    opacity: 0;
  }
}

/* Smooth move animation */
.moving {
  transition: top 0.2s ease, left 0.2s ease;
}

.fadeIn {
  animation: fadeIn 0.3s ease forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
```

### Component: `src/components/Card.tsx`

```tsx
'use client';
import React from 'react';
import { Card as CardType } from '@/game/types';
import { SUIT_SYMBOLS } from '@/game/constants';
import styles from '@/styles/card.module.css';

interface CardProps {
  card: CardType;
  style?: React.CSSProperties;
  onClick?: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  isDragging?: boolean;
  className?: string;
}

function CardComponent({ card, style, onClick, onPointerDown, isDragging, className }: CardProps) {
  const colorClass = card.color === 'red' ? styles.red : styles.black;

  if (!card.faceUp) {
    return (
      <div
        className={`${styles.card} ${styles.cardBack} ${className || ''}`}
        style={style}
        onClick={onClick}
      />
    );
  }

  return (
    <div
      className={`${styles.card} ${styles.cardFace} ${isDragging ? styles.dragging : ''} ${className || ''}`}
      style={style}
      onClick={onClick}
      onPointerDown={onPointerDown}
    >
      <div className={`${styles.cornerInfo} ${styles.topLeft} ${colorClass}`}>
        <span className={styles.rank}>{card.rank}</span>
        <span className={styles.suitSmall}>{SUIT_SYMBOLS[card.suit]}</span>
      </div>
      <div className={`${styles.centerSuit} ${colorClass}`}>
        {SUIT_SYMBOLS[card.suit]}
      </div>
      <div className={`${styles.cornerInfo} ${styles.bottomRight} ${colorClass}`}>
        <span className={styles.rank}>{card.rank}</span>
        <span className={styles.suitSmall}>{SUIT_SYMBOLS[card.suit]}</span>
      </div>
    </div>
  );
}

export const CardView = React.memo(CardComponent, (prev, next) => {
  return (
    prev.card.id === next.card.id &&
    prev.card.faceUp === next.card.faceUp &&
    prev.isDragging === next.isDragging &&
    prev.style?.top === next.style?.top &&
    prev.style?.left === next.style?.left &&
    prev.style?.zIndex === next.style?.zIndex &&
    prev.className === next.className
  );
});

CardView.displayName = 'CardView';
```

### Component: `src/components/StockPile.tsx`

```tsx
'use client';
import React from 'react';
import { Card } from '@/game/types';
import { CardView } from './Card';
import styles from '@/styles/board.module.css';

interface StockPileProps {
  cards: Card[];
  onDraw: () => void;
  onRecycle: () => void;
}

export function StockPile({ cards, onDraw, onRecycle }: StockPileProps) {
  if (cards.length === 0) {
    return (
      <div className={styles.refreshIcon} onClick={onRecycle}>
        ↻
      </div>
    );
  }

  return (
    <div className={styles.pile} onClick={onDraw}>
      <CardView
        card={{ ...cards[cards.length - 1], faceUp: false }}
        style={{ top: 0, left: 0 }}
      />
    </div>
  );
}
```

### Component: `src/components/WastePile.tsx`

```tsx
'use client';
import React from 'react';
import { Card, PileLocation } from '@/game/types';
import { CardView } from './Card';
import styles from '@/styles/board.module.css';

interface WastePileProps {
  cards: Card[];
  drawMode: 'draw1' | 'draw3';
  onTap: (cardIndex: number) => void;
  onPointerDown: (e: React.PointerEvent, cardIndex: number) => void;
}

export function WastePile({ cards, drawMode, onTap, onPointerDown }: WastePileProps) {
  if (cards.length === 0) {
    return <div className={styles.emptyPile} />;
  }

  // For draw-3, show up to 3 fanned cards
  const visibleCount = drawMode === 'draw3' ? Math.min(3, cards.length) : 1;
  const startIndex = cards.length - visibleCount;

  return (
    <div className={styles.pile}>
      {cards.slice(startIndex).map((card, i) => {
        const actualIndex = startIndex + i;
        const isTop = actualIndex === cards.length - 1;
        const offset = drawMode === 'draw3' ? i * 18 : 0;

        return (
          <CardView
            key={card.id}
            card={card}
            style={{
              top: 0,
              left: offset,
              zIndex: i + 1,
            }}
            onClick={isTop ? () => onTap(actualIndex) : undefined}
            onPointerDown={isTop ? (e) => onPointerDown(e, actualIndex) : undefined}
          />
        );
      })}
    </div>
  );
}
```

### Component: `src/components/FoundationPile.tsx`

```tsx
'use client';
import React from 'react';
import { Card } from '@/game/types';
import { CardView } from './Card';
import { SUIT_SYMBOLS, SUITS } from '@/game/constants';
import styles from '@/styles/board.module.css';

interface FoundationPileProps {
  cards: Card[];
  index: number;
  dropRef: (el: HTMLDivElement | null) => void;
}

export function FoundationPile({ cards, index, dropRef }: FoundationPileProps) {
  if (cards.length === 0) {
    return (
      <div className={styles.emptyPile} ref={dropRef}>
        {SUIT_SYMBOLS[SUITS[index]]}
      </div>
    );
  }

  const topCard = cards[cards.length - 1];
  return (
    <div className={styles.pile} ref={dropRef}>
      <CardView
        card={topCard}
        style={{ top: 0, left: 0, zIndex: 1 }}
      />
    </div>
  );
}
```

### Component: `src/components/TableauPile.tsx`

```tsx
'use client';
import React from 'react';
import { Card, PileLocation } from '@/game/types';
import { CardView } from './Card';
import styles from '@/styles/board.module.css';

interface TableauPileProps {
  cards: Card[];
  pileIndex: number;
  onTap: (cardIndex: number) => void;
  onPointerDown: (e: React.PointerEvent, cardIndex: number) => void;
  dropRef: (el: HTMLDivElement | null) => void;
  draggingCardIds?: Set<string>;
}

export function TableauPile({ cards, pileIndex, onTap, onPointerDown, dropRef, draggingCardIds }: TableauPileProps) {
  if (cards.length === 0) {
    return (
      <div className={`${styles.tableauColumn}`} ref={dropRef}>
        <div className={styles.emptyPile}>K</div>
      </div>
    );
  }

  return (
    <div className={styles.tableauColumn} ref={dropRef}>
      {cards.map((card, i) => {
        const offset = cards.slice(0, i).reduce((acc, c) => {
          return acc + (c.faceUp ? 22 : 8);
        }, 0);

        const isDragging = draggingCardIds?.has(card.id);

        return (
          <CardView
            key={card.id}
            card={card}
            isDragging={isDragging}
            style={{
              top: offset,
              left: 0,
              zIndex: i + 1,
            }}
            onClick={card.faceUp ? () => onTap(i) : undefined}
            onPointerDown={card.faceUp ? (e) => onPointerDown(e, i) : () => onTap(i)}
          />
        );
      })}
    </div>
  );
}
```

### Component: `src/components/Board.tsx`

```tsx
'use client';
import React from 'react';
import { GameState, PileLocation, GameAction } from '@/game/types';
import { StockPile } from './StockPile';
import { WastePile } from './WastePile';
import { FoundationPile } from './FoundationPile';
import { TableauPile } from './TableauPile';
import styles from '@/styles/board.module.css';

interface BoardProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  onPointerDown: (e: React.PointerEvent, location: PileLocation, cardIndex: number) => void;
  registerDropZone: (location: PileLocation) => (el: HTMLDivElement | null) => void;
  draggingCardIds?: Set<string>;
}

export function Board({ state, dispatch, onPointerDown, registerDropZone, draggingCardIds }: BoardProps) {
  return (
    <div className={styles.board}>
      <div className={styles.topRow}>
        <div className={styles.stockWaste}>
          <StockPile
            cards={state.stock}
            onDraw={() => dispatch({ type: 'DRAW_CARD' })}
            onRecycle={() => dispatch({ type: 'RECYCLE_WASTE' })}
          />
          <WastePile
            cards={state.waste}
            drawMode={state.drawMode}
            onTap={(cardIndex) =>
              dispatch({ type: 'TAP_CARD', pileLocation: { type: 'waste', index: 0 }, cardIndex })
            }
            onPointerDown={(e, cardIndex) =>
              onPointerDown(e, { type: 'waste', index: 0 }, cardIndex)
            }
          />
        </div>
        <div className={styles.spacer} />
        <div className={styles.foundations}>
          {state.foundations.map((pile, i) => (
            <FoundationPile
              key={i}
              cards={pile}
              index={i}
              dropRef={registerDropZone({ type: 'foundation', index: i })}
            />
          ))}
        </div>
      </div>
      <div className={styles.tableauRow}>
        {state.tableau.map((pile, i) => (
          <TableauPile
            key={i}
            cards={pile}
            pileIndex={i}
            draggingCardIds={draggingCardIds}
            onTap={(cardIndex) =>
              dispatch({ type: 'TAP_CARD', pileLocation: { type: 'tableau', index: i }, cardIndex })
            }
            onPointerDown={(e, cardIndex) =>
              onPointerDown(e, { type: 'tableau', index: i }, cardIndex)
            }
            dropRef={registerDropZone({ type: 'tableau', index: i })}
          />
        ))}
      </div>
    </div>
  );
}
```

### Component: `src/components/DragOverlay.tsx`

```tsx
'use client';
import React from 'react';
import { Card } from '@/game/types';
import { CardView } from './Card';

interface DragOverlayProps {
  cards: Card[];
  x: number;
  y: number;
  visible: boolean;
}

export function DragOverlay({ cards, x, y, visible }: DragOverlayProps) {
  if (!visible || cards.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 10000,
        pointerEvents: 'none',
        touchAction: 'none',
      }}
    >
      {cards.map((card, i) => (
        <CardView
          key={card.id}
          card={card}
          style={{
            position: 'absolute',
            top: i * 22,
            left: 0,
          }}
        />
      ))}
    </div>
  );
}
```

---

## Phase 4: Interactivity

### Hook: `src/hooks/useTimer.ts`

```tsx
'use client';
import { useState, useRef, useCallback, useEffect } from 'react';

export function useTimer() {
  const [seconds, setSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const start = useCallback(() => {
    if (!isRunning) setIsRunning(true);
  }, [isRunning]);

  const pause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const reset = useCallback(() => {
    setIsRunning(false);
    setSeconds(0);
  }, []);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  const formatTime = useCallback((totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return { seconds, isRunning, start, pause, reset, formatTime };
}
```

### Hook: `src/hooks/useGameState.ts`

```tsx
'use client';
import { useReducer, useEffect, useCallback } from 'react';
import { GameState, GameAction } from '@/game/types';
import { gameReducer } from '@/game/reducer';
import { dealGame } from '@/game/deck';
import { loadState, saveState } from '@/lib/storage';

export function useGameState() {
  const [state, dispatch] = useReducer(gameReducer, null, () => {
    // Try to restore saved state, otherwise deal new game
    const saved = loadState();
    return saved || dealGame();
  });

  // Auto-save on state change
  useEffect(() => {
    saveState(state);
  }, [state]);

  return { state, dispatch };
}
```

### Hook: `src/hooks/useDragAndDrop.ts`

```tsx
'use client';
import { useRef, useCallback, useState } from 'react';
import { Card, PileLocation, DragState, DropZone, GameAction } from '@/game/types';
import { DRAG_THRESHOLD } from '@/game/constants';
import { getPile } from '@/game/moves';
import { GameState } from '@/game/types';

export function useDragAndDrop(
  state: GameState,
  dispatch: React.Dispatch<GameAction>
) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const dropZonesRef = useRef<Map<string, { location: PileLocation; el: HTMLDivElement }>>(new Map());
  const pointerStartRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const dragInfoRef = useRef<{ from: PileLocation; cardIndex: number; cards: Card[]; offsetX: number; offsetY: number } | null>(null);

  const registerDropZone = useCallback((location: PileLocation) => {
    return (el: HTMLDivElement | null) => {
      const key = `${location.type}-${location.index}`;
      if (el) {
        dropZonesRef.current.set(key, { location, el });
      } else {
        dropZonesRef.current.delete(key);
      }
    };
  }, []);

  const handlePointerDown = useCallback((
    e: React.PointerEvent,
    location: PileLocation,
    cardIndex: number
  ) => {
    const pile = getPile(state, location);
    if (cardIndex < 0 || cardIndex >= pile.length) return;
    const card = pile[cardIndex];
    if (!card.faceUp) return;

    const cards = pile.slice(cardIndex);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

    pointerStartRef.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
    dragInfoRef.current = {
      from: location,
      cardIndex,
      cards,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    // Set up move/up listeners on target
    const target = e.currentTarget as HTMLElement;

    const handleMove = (moveEvent: PointerEvent) => {
      if (!pointerStartRef.current || !dragInfoRef.current) return;

      const dx = moveEvent.clientX - pointerStartRef.current.x;
      const dy = moveEvent.clientY - pointerStartRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance >= DRAG_THRESHOLD) {
        setDragState({
          cards: dragInfoRef.current.cards,
          from: dragInfoRef.current.from,
          cardIndex: dragInfoRef.current.cardIndex,
          startX: pointerStartRef.current.x,
          startY: pointerStartRef.current.y,
          currentX: moveEvent.clientX - dragInfoRef.current.offsetX,
          currentY: moveEvent.clientY - dragInfoRef.current.offsetY,
          isDragging: true,
        });
      } else if (dragState?.isDragging) {
        setDragState(prev => prev ? {
          ...prev,
          currentX: moveEvent.clientX - dragInfoRef.current!.offsetX,
          currentY: moveEvent.clientY - dragInfoRef.current!.offsetY,
        } : null);
      }
    };

    const handleUp = (upEvent: PointerEvent) => {
      target.removeEventListener('pointermove', handleMove);
      target.removeEventListener('pointerup', handleUp);
      target.removeEventListener('pointercancel', handleUp);

      if (!pointerStartRef.current || !dragInfoRef.current) {
        setDragState(null);
        return;
      }

      const dx = upEvent.clientX - pointerStartRef.current.x;
      const dy = upEvent.clientY - pointerStartRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < DRAG_THRESHOLD) {
        // It was a tap - dispatch tap action
        dispatch({
          type: 'TAP_CARD',
          pileLocation: dragInfoRef.current.from,
          cardIndex: dragInfoRef.current.cardIndex,
        });
      } else {
        // It was a drag - find drop target
        const dropTarget = findDropTarget(upEvent.clientX, upEvent.clientY);
        if (dropTarget) {
          dispatch({
            type: 'MOVE_CARDS',
            from: dragInfoRef.current.from,
            to: dropTarget,
            cardIndex: dragInfoRef.current.cardIndex,
          });
        }
      }

      setDragState(null);
      pointerStartRef.current = null;
      dragInfoRef.current = null;
    };

    target.addEventListener('pointermove', handleMove);
    target.addEventListener('pointerup', handleUp);
    target.addEventListener('pointercancel', handleUp);
  }, [state, dispatch, dragState]);

  const findDropTarget = useCallback((x: number, y: number): PileLocation | null => {
    let bestTarget: PileLocation | null = null;
    let bestDistance = Infinity;

    dropZonesRef.current.forEach(({ location, el }) => {
      const rect = el.getBoundingClientRect();
      // Check if point is within rect (with some padding)
      const padding = 10;
      if (
        x >= rect.left - padding &&
        x <= rect.right + padding &&
        y >= rect.top - padding &&
        y <= rect.bottom + padding
      ) {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestTarget = location;
        }
      }
    });

    return bestTarget;
  }, []);

  const draggingCardIds = dragState?.isDragging
    ? new Set(dragState.cards.map(c => c.id))
    : undefined;

  return {
    dragState,
    handlePointerDown,
    registerDropZone,
    draggingCardIds,
  };
}
```

### Component: `src/components/Toolbar.tsx`

```tsx
'use client';
import React from 'react';
import { GameAction, GameState } from '@/game/types';

interface ToolbarProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  time: string;
  onNewGame: () => void;
  onShowStats: () => void;
}

const toolbarStyles: Record<string, React.CSSProperties> = {
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 12px',
    backgroundColor: 'rgba(0,0,0,0.3)',
    color: '#fff',
    fontSize: '14px',
    gap: '8px',
    flexShrink: 0,
  },
  button: {
    background: 'rgba(255,255,255,0.15)',
    border: 'none',
    color: '#fff',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    touchAction: 'manipulation',
    WebkitTapHighlightColor: 'transparent',
  },
  stats: {
    display: 'flex',
    gap: '12px',
    fontSize: '13px',
  },
};

export function Toolbar({ state, dispatch, time, onNewGame, onShowStats }: ToolbarProps) {
  return (
    <div style={toolbarStyles.toolbar}>
      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          style={toolbarStyles.button}
          onClick={() => dispatch({ type: 'UNDO' })}
          disabled={state.history.length === 0}
        >
          ↩ Undo
        </button>
        <button style={toolbarStyles.button} onClick={onNewGame}>
          New
        </button>
        <button style={toolbarStyles.button} onClick={onShowStats}>
          Stats
        </button>
      </div>
      <div style={toolbarStyles.stats}>
        <span>⏱ {time}</span>
        <span>Score: {state.score}</span>
        <span>Moves: {state.moves}</span>
      </div>
    </div>
  );
}
```

### Component: `src/components/WinCelebration.tsx`

```tsx
'use client';
import React, { useEffect, useState } from 'react';

interface WinCelebrationProps {
  show: boolean;
  score: number;
  time: string;
  moves: number;
  onNewGame: () => void;
}

export function WinCelebration({ show, score, time, moves, onNewGame }: WinCelebrationProps) {
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; color: string; delay: number; duration: number }>>([]);

  useEffect(() => {
    if (show) {
      const pieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        color: ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'][Math.floor(Math.random() * 6)],
        delay: Math.random() * 2,
        duration: 2 + Math.random() * 3,
      }));
      setConfetti(pieces);
    }
  }, [show]);

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 20000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)',
    }}>
      {/* Confetti */}
      {confetti.map(p => (
        <div
          key={p.id}
          style={{
            position: 'fixed',
            left: `${p.left}%`,
            top: '-10px',
            width: '10px',
            height: '10px',
            background: p.color,
            opacity: 0,
            borderRadius: Math.random() > 0.5 ? '50%' : '0',
            animation: `confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}

      {/* Win dialog */}
      <div style={{
        background: '#fff',
        borderRadius: '16px',
        padding: '32px',
        textAlign: 'center',
        maxWidth: '300px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        zIndex: 20001,
      }}>
        <div style={{ fontSize: '48px', marginBottom: '8px' }}>🎉</div>
        <h2 style={{ margin: '0 0 16px', color: '#2d3436' }}>You Win!</h2>
        <div style={{ color: '#636e72', marginBottom: '24px', lineHeight: 1.8 }}>
          <div>Score: <strong>{score}</strong></div>
          <div>Time: <strong>{time}</strong></div>
          <div>Moves: <strong>{moves}</strong></div>
        </div>
        <button
          onClick={onNewGame}
          style={{
            background: '#0d7a3e',
            color: '#fff',
            border: 'none',
            padding: '12px 32px',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          New Game
        </button>
      </div>

      <style>{`
        @keyframes confettiFall {
          0% { opacity: 1; transform: translateY(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(100vh) rotate(720deg); }
        }
      `}</style>
    </div>
  );
}
```

### Component: `src/components/NewGameDialog.tsx`

```tsx
'use client';
import React, { useState } from 'react';
import { DrawMode, ScoringMode } from '@/game/types';

interface NewGameDialogProps {
  show: boolean;
  onStart: (drawMode: DrawMode, scoringMode: ScoringMode) => void;
  onCancel: () => void;
}

export function NewGameDialog({ show, onStart, onCancel }: NewGameDialogProps) {
  const [drawMode, setDrawMode] = useState<DrawMode>('draw1');
  const [scoringMode, setScoringMode] = useState<ScoringMode>('standard');

  if (!show) return null;

  const btnStyle = (active: boolean): React.CSSProperties => ({
    flex: 1,
    padding: '10px',
    border: '2px solid',
    borderColor: active ? '#0d7a3e' : '#ddd',
    background: active ? '#e8f5e9' : '#fff',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: active ? 600 : 400,
    fontSize: '14px',
    color: '#2d3436',
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 15000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)',
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px', padding: '24px',
        maxWidth: '320px', width: '90%',
      }}>
        <h3 style={{ margin: '0 0 16px', color: '#2d3436' }}>New Game</h3>

        <label style={{ display: 'block', marginBottom: '8px', color: '#636e72', fontSize: '13px' }}>
          Draw Mode
        </label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button style={btnStyle(drawMode === 'draw1')} onClick={() => setDrawMode('draw1')}>Draw 1</button>
          <button style={btnStyle(drawMode === 'draw3')} onClick={() => setDrawMode('draw3')}>Draw 3</button>
        </div>

        <label style={{ display: 'block', marginBottom: '8px', color: '#636e72', fontSize: '13px' }}>
          Scoring
        </label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
          <button style={btnStyle(scoringMode === 'standard')} onClick={() => setScoringMode('standard')}>Standard</button>
          <button style={btnStyle(scoringMode === 'vegas')} onClick={() => setScoringMode('vegas')}>Vegas</button>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={onCancel} style={{
            flex: 1, padding: '10px', border: '1px solid #ddd',
            background: '#fff', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', color: '#636e72',
          }}>Cancel</button>
          <button onClick={() => onStart(drawMode, scoringMode)} style={{
            flex: 1, padding: '10px', border: 'none',
            background: '#0d7a3e', color: '#fff', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 600,
          }}>Deal</button>
        </div>
      </div>
    </div>
  );
}
```

### Component: `src/components/StatsDialog.tsx`

```tsx
'use client';
import React from 'react';
import { GameStats } from '@/game/types';

interface StatsDialogProps {
  show: boolean;
  stats: GameStats;
  onClose: () => void;
}

export function StatsDialog({ show, stats, onClose }: StatsDialogProps) {
  if (!show) return null;

  const winPct = stats.gamesPlayed > 0
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
    : 0;

  const formatTime = (seconds: number | null) => {
    if (seconds === null) return '—';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const rows = [
    ['Games Played', stats.gamesPlayed],
    ['Games Won', stats.gamesWon],
    ['Win %', `${winPct}%`],
    ['Current Streak', stats.currentStreak],
    ['Longest Streak', stats.longestStreak],
    ['Best Time', formatTime(stats.bestTime)],
    ['Best Score', stats.bestScore ?? '—'],
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 15000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)',
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px', padding: '24px',
        maxWidth: '300px', width: '90%',
      }}>
        <h3 style={{ margin: '0 0 16px', color: '#2d3436' }}>Statistics</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={String(label)}>
                <td style={{ padding: '6px 0', color: '#636e72', fontSize: '14px' }}>{label}</td>
                <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 600, color: '#2d3436', fontSize: '14px' }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button onClick={onClose} style={{
          width: '100%', marginTop: '20px', padding: '10px',
          background: '#0d7a3e', color: '#fff', border: 'none',
          borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 600,
        }}>Close</button>
      </div>
    </div>
  );
}
```

### Library: `src/lib/storage.ts`

```typescript
import { GameState, GameStats } from '@/game/types';

const STORAGE_KEY = 'klondike-solitaire-state';
const STATS_KEY = 'klondike-solitaire-stats';

export function saveState(state: GameState): void {
  try {
    // Don't save history to keep localStorage smaller
    const { history, ...stateWithoutHistory } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stateWithoutHistory));
  } catch (e) {
    // localStorage might be full or unavailable
  }
}

export function loadState(): GameState | null {
  try {
    const json = localStorage.getItem(STORAGE_KEY);
    if (!json) return null;
    const state = JSON.parse(json);
    // Restore empty history since we don't persist it
    state.history = [];
    return state;
  } catch (e) {
    return null;
  }
}

export function clearState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {}
}

const defaultStats: GameStats = {
  gamesPlayed: 0,
  gamesWon: 0,
  currentStreak: 0,
  longestStreak: 0,
  bestTime: null,
  bestScore: null,
  totalTimePlayed: 0,
};

export function loadStats(): GameStats {
  try {
    const json = localStorage.getItem(STATS_KEY);
    if (!json) return { ...defaultStats };
    return { ...defaultStats, ...JSON.parse(json) };
  } catch (e) {
    return { ...defaultStats };
  }
}

export function saveStats(stats: GameStats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (e) {}
}
```

### Hook: `src/hooks/useStats.ts`

```tsx
'use client';
import { useState, useCallback } from 'react';
import { GameStats } from '@/game/types';
import { loadStats, saveStats } from '@/lib/storage';

export function useStats() {
  const [stats, setStats] = useState<GameStats>(() => loadStats());

  const recordWin = useCallback((score: number, time: number) => {
    setStats(prev => {
      const newStats: GameStats = {
        ...prev,
        gamesPlayed: prev.gamesPlayed + 1,
        gamesWon: prev.gamesWon + 1,
        currentStreak: prev.currentStreak + 1,
        longestStreak: Math.max(prev.longestStreak, prev.currentStreak + 1),
        bestTime: prev.bestTime === null ? time : Math.min(prev.bestTime, time),
        bestScore: prev.bestScore === null ? score : Math.max(prev.bestScore, score),
        totalTimePlayed: prev.totalTimePlayed + time,
      };
      saveStats(newStats);
      return newStats;
    });
  }, []);

  const recordLoss = useCallback((time: number) => {
    setStats(prev => {
      const newStats: GameStats = {
        ...prev,
        gamesPlayed: prev.gamesPlayed + 1,
        currentStreak: 0,
        totalTimePlayed: prev.totalTimePlayed + time,
      };
      saveStats(newStats);
      return newStats;
    });
  }, []);

  return { stats, recordWin, recordLoss };
}
```

### Component: `src/components/Game.tsx`

Main game component wiring everything together:

```tsx
'use client';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Board } from './Board';
import { Toolbar } from './Toolbar';
import { DragOverlay } from './DragOverlay';
import { WinCelebration } from './WinCelebration';
import { NewGameDialog } from './NewGameDialog';
import { StatsDialog } from './StatsDialog';
import { useGameState } from '@/hooks/useGameState';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { useTimer } from '@/hooks/useTimer';
import { useStats } from '@/hooks/useStats';
import { DrawMode, ScoringMode } from '@/game/types';

export function Game() {
  const { state, dispatch } = useGameState();
  const { dragState, handlePointerDown, registerDropZone, draggingCardIds } = useDragAndDrop(state, dispatch);
  const timer = useTimer();
  const { stats, recordWin, recordLoss } = useStats();
  const [showNewGame, setShowNewGame] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const hasRecordedRef = useRef(false);

  // Start timer on first move
  useEffect(() => {
    if (state.moves > 0 && !timer.isRunning && state.status === 'playing') {
      timer.start();
    }
  }, [state.moves, timer.isRunning, state.status]);

  // Auto-complete
  useEffect(() => {
    if (state.autoCompleting && state.status === 'playing') {
      const timeout = setTimeout(() => {
        dispatch({ type: 'AUTO_COMPLETE_STEP' });
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [state.autoCompleting, state.status, state, dispatch]);

  // Handle win
  useEffect(() => {
    if (state.status === 'won' && !hasRecordedRef.current) {
      timer.pause();
      hasRecordedRef.current = true;
      recordWin(state.score, timer.seconds);
    }
  }, [state.status]);

  const handleNewGame = useCallback(() => {
    if (state.status === 'playing' && state.moves > 0) {
      setShowNewGame(true);
    } else {
      setShowNewGame(true);
    }
  }, [state.status, state.moves]);

  const startNewGame = useCallback((drawMode: DrawMode, scoringMode: ScoringMode) => {
    if (state.status === 'playing' && state.moves > 0 && !hasRecordedRef.current) {
      recordLoss(timer.seconds);
    }
    hasRecordedRef.current = false;
    dispatch({ type: 'NEW_GAME', drawMode, scoringMode });
    timer.reset();
    setShowNewGame(false);
  }, [dispatch, timer, recordLoss, state.status, state.moves]);

  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--color-felt)' }}>
      <Toolbar
        state={state}
        dispatch={dispatch}
        time={timer.formatTime(timer.seconds)}
        onNewGame={handleNewGame}
        onShowStats={() => setShowStats(true)}
      />
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <Board
          state={state}
          dispatch={dispatch}
          onPointerDown={handlePointerDown}
          registerDropZone={registerDropZone}
          draggingCardIds={draggingCardIds}
        />
        <DragOverlay
          cards={dragState?.cards || []}
          x={dragState?.currentX || 0}
          y={dragState?.currentY || 0}
          visible={dragState?.isDragging || false}
        />
      </div>
      <WinCelebration
        show={state.status === 'won'}
        score={state.score}
        time={timer.formatTime(timer.seconds)}
        moves={state.moves}
        onNewGame={() => {
          hasRecordedRef.current = false;
          dispatch({ type: 'NEW_GAME' });
          timer.reset();
        }}
      />
      <NewGameDialog
        show={showNewGame}
        onStart={startNewGame}
        onCancel={() => setShowNewGame(false)}
      />
      <StatsDialog
        show={showStats}
        stats={stats}
        onClose={() => setShowStats(false)}
      />
    </div>
  );
}
```

### Page: `src/app/page.tsx`

```tsx
'use client';
import { Game } from '@/components/Game';

export default function Home() {
  return <Game />;
}
```

### Layout: `src/app/layout.tsx`

```tsx
import type { Metadata, Viewport } from "next";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "Klondike Solitaire",
  description: "Classic Klondike Solitaire card game",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Solitaire",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0d7a3e",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

---

## Phase 6: PWA

### File: `src/app/manifest.ts`

```typescript
import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Klondike Solitaire',
    short_name: 'Solitaire',
    description: 'Classic Klondike Solitaire card game',
    start_url: '/',
    display: 'standalone',
    background_color: '#0d7a3e',
    theme_color: '#0d7a3e',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
```

### File: `public/sw.js`

```javascript
const CACHE_NAME = 'solitaire-v1';
const ASSETS = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
```

Register in layout or page:
```tsx
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
}, []);
```

---

## Build & Verify

```bash
# Build static export
npm run build

# Test locally
npx serve out

# Deploy to Vercel
vercel
```

---

## Running Claude Code for Automated Implementation

To let Claude Code implement this without permission prompts:

```bash
claude --dangerously-skip-permissions
```

Then provide the instruction:
> "Implement the Klondike Solitaire app following BUILD_GUIDE.md. Create all files as specified."

**WARNING**: `--dangerously-skip-permissions` allows Claude to execute ANY command without confirmation. Only use in trusted environments.

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| **Pointer Events** (not separate touch/mouse) | Unified API, `setPointerCapture()` for reliable tracking |
| **8px drag threshold** | Distinguishes tap from drag intent |
| **`touch-action: none`** on board | Prevents browser scroll/zoom during card drag |
| **`React.memo`** on Card | Avoids re-rendering unchanged cards |
| **CSS custom properties** | Responsive card sizing: `--card-width: min(70px, 12vw)` |
| **`useReducer`** | Complex interdependent state transitions with undo |
| **State snapshots for undo** | Simple, reliable - snapshot before each action |
| **`output: 'export'`** | Static site on Vercel, no server needed |
