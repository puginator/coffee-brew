import { describe, expect, it } from "vitest";
import {
  createInitialSession,
  getNextStepIndex,
  getPrevStepIndex,
  isPourStepComplete,
  isTimedStepComplete,
  updateElapsed,
} from "@/lib/brew/session";
import { buildSeedRecipes } from "@/lib/data/legacy";

describe("brew session helpers", () => {
  const recipe = buildSeedRecipes()[0];
  const version = recipe.versions[0];

  it("creates initial state", () => {
    const session = createInitialSession(recipe.id, version);
    expect(session.currentStepIndex).toBe(0);
    expect(session.elapsedSec).toBe(0);
    expect(session.isPaused).toBe(true);
  });

  it("moves index safely", () => {
    expect(getNextStepIndex(1, 5)).toBe(2);
    expect(getNextStepIndex(4, 5)).toBe(4);
    expect(getPrevStepIndex(0)).toBe(0);
    expect(getPrevStepIndex(3)).toBe(2);
  });

  it("completes timed and pour steps based on thresholds", () => {
    expect(isTimedStepComplete(30, 29)).toBe(false);
    expect(isTimedStepComplete(30, 30)).toBe(true);
    expect(isPourStepComplete(50, 45)).toBe(false);
    expect(isPourStepComplete(50, 50)).toBe(true);
  });

  it("increments elapsed counters only when running", () => {
    const paused = createInitialSession(recipe.id, version);
    const same = updateElapsed(paused);
    expect(same.elapsedSec).toBe(0);

    const running = { ...paused, isPaused: false };
    const next = updateElapsed(running);
    expect(next.elapsedSec).toBe(1);
    expect(next.stepElapsedSec).toBe(1);
  });
});
