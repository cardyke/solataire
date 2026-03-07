'use client';
import React from 'react';
import { GameState, PileLocation, GameAction } from '@/game/types';
import { StockPile } from './StockPile';
import { WastePile } from './WastePile';
import { FoundationPile } from './FoundationPile';
import { TableauPile } from './TableauPile';
import styles from '@/styles/board.module.css';

interface BoardProps {
  state: GameState;
  dispatch: React.Dispatch<GameAction>;
  onPointerDown: (e: React.PointerEvent, location: PileLocation, cardIndex: number) => void;
  registerDropZone: (location: PileLocation) => (el: HTMLDivElement | null) => void;
  draggingCardIds?: Set<string>;
}

export function Board({ state, dispatch, onPointerDown, registerDropZone, draggingCardIds }: BoardProps) {
  return (
    <div className={styles.board}>
      <div className={styles.topRow}>
        <div className={styles.stockWaste}>
          <StockPile
            cards={state.stock}
            onDraw={() => dispatch({ type: 'DRAW_CARD' })}
            onRecycle={() => dispatch({ type: 'RECYCLE_WASTE' })}
          />
          <WastePile
            cards={state.waste}
            drawMode={state.drawMode}
            onTap={(cardIndex) =>
              dispatch({ type: 'TAP_CARD', pileLocation: { type: 'waste', index: 0 }, cardIndex })
            }
            onPointerDown={(e, cardIndex) =>
              onPointerDown(e, { type: 'waste', index: 0 }, cardIndex)
            }
          />
        </div>
        <div className={styles.spacer} />
        <div className={styles.foundations}>
          {state.foundations.map((pile, i) => (
            <FoundationPile
              key={i}
              cards={pile}
              index={i}
              dropRef={registerDropZone({ type: 'foundation', index: i })}
            />
          ))}
        </div>
      </div>
      <div className={styles.tableauRow}>
        {state.tableau.map((pile, i) => (
          <TableauPile
            key={i}
            cards={pile}
            pileIndex={i}
            draggingCardIds={draggingCardIds}
            onTap={(cardIndex) =>
              dispatch({ type: 'TAP_CARD', pileLocation: { type: 'tableau', index: i }, cardIndex })
            }
            onPointerDown={(e, cardIndex) =>
              onPointerDown(e, { type: 'tableau', index: i }, cardIndex)
            }
            dropRef={registerDropZone({ type: 'tableau', index: i })}
          />
        ))}
      </div>
    </div>
  );
}
