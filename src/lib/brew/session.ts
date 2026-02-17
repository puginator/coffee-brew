import type { BrewSessionState, RecipeVersion } from "@/lib/types";

export function createInitialSession(
  recipeId: string,
  version: RecipeVersion,
): BrewSessionState {
  return {
    recipeId,
    recipeVersionId: version.id,
    startedAt: new Date().toISOString(),
    currentStepIndex: 0,
    elapsedSec: 0,
    stepElapsedSec: 0,
    currentWaterGrams: 0,
    isPaused: true,
    autoAdvance: true,
    isComplete: false,
  };
}

export function getNextStepIndex(
  currentStepIndex: number,
  stepCount: number,
): number {
  return Math.min(stepCount - 1, currentStepIndex + 1);
}

export function getPrevStepIndex(currentStepIndex: number): number {
  return Math.max(0, currentStepIndex - 1);
}

export function isTimedStepComplete(durationSec: number | null | undefined, elapsedSec: number): boolean {
  if (!durationSec || durationSec <= 0) return false;
  return elapsedSec >= durationSec;
}

export function isPourStepComplete(targetWaterGrams: number | null | undefined, currentWaterGrams: number): boolean {
  if (!targetWaterGrams || targetWaterGrams <= 0) return false;
  return currentWaterGrams >= targetWaterGrams;
}

export function updateElapsed(state: BrewSessionState): BrewSessionState {
  if (state.isPaused || state.isComplete) {
    return state;
  }

  return {
    ...state,
    elapsedSec: state.elapsedSec + 1,
    stepElapsedSec: state.stepElapsedSec + 1,
  };
}
