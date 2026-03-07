'use client';
import { useReducer, useEffect } from 'react';
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
