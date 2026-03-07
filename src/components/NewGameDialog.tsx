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
