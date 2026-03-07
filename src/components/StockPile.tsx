'use client';
import React from 'react';
import { Card } from '@/game/types';
import { CardView } from './Card';
import styles from '@/styles/board.module.css';

interface StockPileProps {
  cards: Card[];
  onDraw: () => void;
  onRecycle: () => void;
}

export function StockPile({ cards, onDraw, onRecycle }: StockPileProps) {
  if (cards.length === 0) {
    return (
      <div className={styles.refreshIcon} onClick={onRecycle}>
        ↻
      </div>
    );
  }

  return (
    <div className={styles.pile} onClick={onDraw}>
      <CardView
        card={{ ...cards[cards.length - 1], faceUp: false }}
        style={{ top: 0, left: 0 }}
      />
    </div>
  );
}
