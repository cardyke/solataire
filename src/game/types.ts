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
