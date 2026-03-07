'use client';
import React from 'react';
import { Card } from '@/game/types';
import { CardView } from './Card';
import { SUIT_SYMBOLS, SUITS } from '@/game/constants';
import styles from '@/styles/board.module.css';

interface FoundationPileProps {
  cards: Card[];
  index: number;
  dropRef: (el: HTMLDivElement | null) => void;
}

export function FoundationPile({ cards, index, dropRef }: FoundationPileProps) {
  if (cards.length === 0) {
    return (
      <div className={styles.emptyPile} ref={dropRef}>
        {SUIT_SYMBOLS[SUITS[index]]}
      </div>
    );
  }

  const topCard = cards[cards.length - 1];
  return (
    <div className={styles.pile} ref={dropRef}>
      <CardView
        card={topCard}
        style={{ top: 0, left: 0, zIndex: 1 }}
      />
    </div>
  );
}
