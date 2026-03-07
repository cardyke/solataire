'use client';
import React from 'react';
import { Card } from '@/game/types';
import { CardView } from './Card';

interface DragOverlayProps {
  cards: Card[];
  x: number;
  y: number;
  visible: boolean;
}

export function DragOverlay({ cards, x, y, visible }: DragOverlayProps) {
  if (!visible || cards.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        zIndex: 10000,
        pointerEvents: 'none',
        touchAction: 'none',
      }}
    >
      {cards.map((card, i) => (
        <CardView
          key={card.id}
          card={card}
          style={{
            position: 'absolute',
            top: i * 22,
            left: 0,
          }}
        />
      ))}
    </div>
  );
}
