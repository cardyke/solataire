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
    setShowNewGame(true);
  }, []);

  const startNewGame = useCallback((drawMode: DrawMode, scoringMode: ScoringMode) => {
    if (state.status === 'playing' && state.moves > 0 && !hasRecordedRef.current) {
      recordLoss(timer.seconds);
    }
    hasRecordedRef.current = false;
    dispatch({ type: 'NEW_GAME', drawMode, scoringMode });
    timer.reset();
    setShowNewGame(false);
  }, [dispatch, timer, recordLoss, state.status, state.moves]);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js');
    }
  }, []);

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
