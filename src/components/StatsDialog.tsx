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
