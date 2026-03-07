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
