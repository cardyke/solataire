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
