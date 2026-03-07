'use client';
import React from 'react';
import { Card as CardType } from '@/game/types';
import { SUIT_SYMBOLS } from '@/game/constants';
import styles from '@/styles/card.module.css';

interface CardProps {
  card: CardType;
  style?: React.CSSProperties;
  onClick?: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  isDragging?: boolean;
  className?: string;
}

function CardComponent({ card, style, onClick, onPointerDown, isDragging, className }: CardProps) {
  const colorClass = card.color === 'red' ? styles.red : styles.black;

  if (!card.faceUp) {
    return (
      <div
        className={`${styles.card} ${styles.cardBack} ${className || ''}`}
        style={style}
        onClick={onClick}
      />
    );
  }

  return (
    <div
      className={`${styles.card} ${styles.cardFace} ${isDragging ? styles.dragging : ''} ${className || ''}`}
      style={style}
      onClick={onClick}
      onPointerDown={onPointerDown}
    >
      <div className={`${styles.cornerInfo} ${styles.topLeft} ${colorClass}`}>
        <span className={styles.rank}>{card.rank}</span>
        <span className={styles.suitSmall}>{SUIT_SYMBOLS[card.suit]}</span>
      </div>
      <div className={`${styles.centerSuit} ${colorClass}`}>
        {SUIT_SYMBOLS[card.suit]}
      </div>
      <div className={`${styles.cornerInfo} ${styles.bottomRight} ${colorClass}`}>
        <span className={styles.rank}>{card.rank}</span>
        <span className={styles.suitSmall}>{SUIT_SYMBOLS[card.suit]}</span>
      </div>
    </div>
  );
}

export const CardView = React.memo(CardComponent, (prev, next) => {
  return (
    prev.card.id === next.card.id &&
    prev.card.faceUp === next.card.faceUp &&
    prev.isDragging === next.isDragging &&
    prev.style?.top === next.style?.top &&
    prev.style?.left === next.style?.left &&
    prev.style?.zIndex === next.style?.zIndex &&
    prev.className === next.className
  );
});

CardView.displayName = 'CardView';
