'use client';
import React from 'react';
import { Card } from '@/game/types';
import { CardView } from './Card';
import styles from '@/styles/board.module.css';

interface TableauPileProps {
  cards: Card[];
  pileIndex: number;
  onTap: (cardIndex: number) => void;
  onPointerDown: (e: React.PointerEvent, cardIndex: number) => void;
  dropRef: (el: HTMLDivElement | null) => void;
  draggingCardIds?: Set<string>;
}

export function TableauPile({ cards, pileIndex, onTap, onPointerDown, dropRef, draggingCardIds }: TableauPileProps) {
  if (cards.length === 0) {
    return (
      <div className={`${styles.tableauColumn}`} ref={dropRef}>
        <div className={styles.emptyPile}>K</div>
      </div>
    );
  }

  return (
    <div className={styles.tableauColumn} ref={dropRef}>
      {cards.map((card, i) => {
        const offset = cards.slice(0, i).reduce((acc, c) => {
          return acc + (c.faceUp ? 22 : 8);
        }, 0);

        const isDragging = draggingCardIds?.has(card.id);

        return (
          <CardView
            key={card.id}
            card={card}
            isDragging={isDragging}
            style={{
              top: offset,
              left: 0,
              zIndex: i + 1,
            }}
            onClick={card.faceUp ? () => onTap(i) : undefined}
            onPointerDown={card.faceUp ? (e) => onPointerDown(e, i) : () => onTap(i)}
          />
        );
      })}
    </div>
  );
}
