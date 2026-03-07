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
