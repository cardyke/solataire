import { PileLocation, ScoringMode } from './types';
import { SCORE } from './constants';

export function calculateMoveScore(
  from: PileLocation,
  to: PileLocation,
  flippedCard: boolean,
  scoringMode: ScoringMode
): number {
  let score = 0;

  if (scoringMode === 'vegas') {
    // Vegas: only score foundation moves (+$5 each)
    if (to.type === 'foundation') score += 5;
    if (from.type === 'foundation') score -= 5;
    return score;
  }

  // Standard scoring
  if (from.type === 'waste' && to.type === 'tableau') score += SCORE.WASTE_TO_TABLEAU;
  else if (from.type === 'waste' && to.type === 'foundation') score += SCORE.WASTE_TO_FOUNDATION;
  else if (from.type === 'tableau' && to.type === 'foundation') score += SCORE.TABLEAU_TO_FOUNDATION;
  else if (from.type === 'foundation' && to.type === 'tableau') score += SCORE.FOUNDATION_TO_TABLEAU;

  if (flippedCard) score += SCORE.FLIP_TABLEAU_CARD;

  return score;
}

export function calculateRecycleScore(scoringMode: ScoringMode, drawMode: string, passCount: number): number {
  if (scoringMode === 'vegas') return 0;
  if (drawMode === 'draw3') return passCount >= 1 ? SCORE.RECYCLE_WASTE : 0;
  return passCount >= 1 ? SCORE.RECYCLE_WASTE : 0;
}
