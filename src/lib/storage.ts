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
