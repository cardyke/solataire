'use client';
import React from 'react';
import { Card } from '@/game/types';
import { CardView } from './Card';
import styles from '@/styles/board.module.css';

interface WastePileProps {
  cards: Card[];
  drawMode: 'draw1' | 'draw3';
  onTap: (cardIndex: number) => void;
  onPointerDown: (e: React.PointerEvent, cardIndex: number) => void;
}

export function WastePile({ cards, drawMode, onTap, onPointerDown }: WastePileProps) {
  if (cards.length === 0) {
    return <div className={styles.emptyPile} />;
  }

  // For draw-3, show up to 3 fanned cards
  const visibleCount = drawMode === 'draw3' ? Math.min(3, cards.length) : 1;
  const startIndex = cards.length - visibleCount;

  return (
    <div className={styles.pile}>
      {cards.slice(startIndex).map((card, i) => {
        const actualIndex = startIndex + i;
        const isTop = actualIndex === cards.length - 1;
        const offset = drawMode === 'draw3' ? i * 18 : 0;

        return (
          <CardView
            key={card.id}
            card={card}
            style={{
              top: 0,
              left: offset,
              zIndex: i + 1,
            }}
            onClick={isTop ? () => onTap(actualIndex) : undefined}
            onPointerDown={isTop ? (e) => onPointerDown(e, actualIndex) : undefined}
          />
        );
      })}
    </div>
  );
}
