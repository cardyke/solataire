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
