'use client';
import { useRef, useCallback, useState } from 'react';
import { Card, PileLocation, DragState, GameAction } from '@/game/types';
import { DRAG_THRESHOLD } from '@/game/constants';
import { getPile } from '@/game/moves';
import { GameState } from '@/game/types';

export function useDragAndDrop(
  state: GameState,
  dispatch: React.Dispatch<GameAction>
) {
  const [dragState, setDragState] = useState<DragState | null>(null);
  const dropZonesRef = useRef<Map<string, { location: PileLocation; el: HTMLDivElement }>>(new Map());
  const pointerStartRef = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const dragInfoRef = useRef<{ from: PileLocation; cardIndex: number; cards: Card[]; offsetX: number; offsetY: number } | null>(null);

  const registerDropZone = useCallback((location: PileLocation) => {
    return (el: HTMLDivElement | null) => {
      const key = `${location.type}-${location.index}`;
      if (el) {
        dropZonesRef.current.set(key, { location, el });
      } else {
        dropZonesRef.current.delete(key);
      }
    };
  }, []);

  const handlePointerDown = useCallback((
    e: React.PointerEvent,
    location: PileLocation,
    cardIndex: number
  ) => {
    const pile = getPile(state, location);
    if (cardIndex < 0 || cardIndex >= pile.length) return;
    const card = pile[cardIndex];
    if (!card.faceUp) return;

    const cards = pile.slice(cardIndex);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

    pointerStartRef.current = { x: e.clientX, y: e.clientY, pointerId: e.pointerId };
    dragInfoRef.current = {
      from: location,
      cardIndex,
      cards,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    // Set up move/up listeners on target
    const target = e.currentTarget as HTMLElement;

    const handleMove = (moveEvent: PointerEvent) => {
      if (!pointerStartRef.current || !dragInfoRef.current) return;

      const dx = moveEvent.clientX - pointerStartRef.current.x;
      const dy = moveEvent.clientY - pointerStartRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance >= DRAG_THRESHOLD) {
        setDragState({
          cards: dragInfoRef.current.cards,
          from: dragInfoRef.current.from,
          cardIndex: dragInfoRef.current.cardIndex,
          startX: pointerStartRef.current.x,
          startY: pointerStartRef.current.y,
          currentX: moveEvent.clientX - dragInfoRef.current.offsetX,
          currentY: moveEvent.clientY - dragInfoRef.current.offsetY,
          isDragging: true,
        });
      }
    };

    const handleUp = (upEvent: PointerEvent) => {
      target.removeEventListener('pointermove', handleMove);
      target.removeEventListener('pointerup', handleUp);
      target.removeEventListener('pointercancel', handleUp);

      if (!pointerStartRef.current || !dragInfoRef.current) {
        setDragState(null);
        return;
      }

      const dx = upEvent.clientX - pointerStartRef.current.x;
      const dy = upEvent.clientY - pointerStartRef.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < DRAG_THRESHOLD) {
        // It was a tap - dispatch tap action
        dispatch({
          type: 'TAP_CARD',
          pileLocation: dragInfoRef.current.from,
          cardIndex: dragInfoRef.current.cardIndex,
        });
      } else {
        // It was a drag - find drop target
        const dropTarget = findDropTarget(upEvent.clientX, upEvent.clientY);
        if (dropTarget) {
          dispatch({
            type: 'MOVE_CARDS',
            from: dragInfoRef.current.from,
            to: dropTarget,
            cardIndex: dragInfoRef.current.cardIndex,
          });
        }
      }

      setDragState(null);
      pointerStartRef.current = null;
      dragInfoRef.current = null;
    };

    target.addEventListener('pointermove', handleMove);
    target.addEventListener('pointerup', handleUp);
    target.addEventListener('pointercancel', handleUp);
  }, [state, dispatch]);

  const findDropTarget = useCallback((x: number, y: number): PileLocation | null => {
    let bestTarget: PileLocation | null = null;
    let bestDistance = Infinity;

    dropZonesRef.current.forEach(({ location, el }) => {
      const rect = el.getBoundingClientRect();
      // Check if point is within rect (with some padding)
      const padding = 10;
      if (
        x >= rect.left - padding &&
        x <= rect.right + padding &&
        y >= rect.top - padding &&
        y <= rect.bottom + padding
      ) {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestTarget = location;
        }
      }
    });

    return bestTarget;
  }, []);

  const draggingCardIds = dragState?.isDragging
    ? new Set(dragState.cards.map(c => c.id))
    : undefined;

  return {
    dragState,
    handlePointerDown,
    registerDropZone,
    draggingCardIds,
  };
}
