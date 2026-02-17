"use client";

import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import { createInitialSession, getNextStepIndex, getPrevStepIndex } from "@/lib/brew/session";
import { formatSeconds, toRatioLabel } from "@/lib/brew/format";
import { scaleRecipeVersion } from "@/lib/brew/scaling";
import styles from "@/styles/brew.module.css";
import type { Recipe, RecipeStep } from "@/lib/types";

interface BrewSessionPlayerProps {
  recipe: Recipe;
}

interface PlannedStep {
  index: number;
  step: RecipeStep;
  startSec: number;
  endSec: number;
  durationSec: number;
  prevPourTarget: number | null;
  pourDelta: number | null;
}

interface PrepChecklistItem {
  id: string;
  instruction: string;
}

type PromptStyle = "barista" | "plain";

const heatPrepPattern = /\b(heat|preheat|boil|kettle|temperature|temp)\b/i;
const filterPrepPattern = /\b(filter|rinse)\b/i;

function getStorageKey(recipeId: string) {
  return `coffee-brew.session.${recipeId}`;
}

function toPositiveNumber(value: number | null | undefined) {
  return typeof value === "number" && value >= 0 ? value : null;
}

function isPrepLikeInstruction(instruction: string) {
  return heatPrepPattern.test(instruction) || filterPrepPattern.test(instruction);
}

function isPrepLikeStep(step: RecipeStep) {
  if (step.type === "prep") return true;
  return isPrepLikeInstruction(step.instruction);
}

function buildPrepChecklist(
  prepLikeSteps: RecipeStep[],
  allSteps: RecipeStep[],
  targetTempC: number,
): PrepChecklistItem[] {
  const uniqueItems = new Map<string, PrepChecklistItem>();

  prepLikeSteps.forEach((step, index) => {
    uniqueItems.set(step.id, {
      id: step.id,
      instruction: step.instruction || `Prep task ${index + 1}`,
    });
  });

  const allInstructions = [
    ...prepLikeSteps.map((step) => step.instruction),
    ...allSteps.map((step) => step.instruction),
  ];

  const hasHeatTask = allInstructions.some((instruction) => heatPrepPattern.test(instruction));
  const hasFilterTask = allInstructions.some((instruction) => filterPrepPattern.test(instruction));

  if (!hasHeatTask) {
    uniqueItems.set("prep-default-heat-water", {
      id: "prep-default-heat-water",
      instruction: `Heat water to about ${targetTempC}°C before brewing.`,
    });
  }

  if (!hasFilterTask) {
    uniqueItems.set("prep-default-filter-placement", {
      id: "prep-default-filter-placement",
      instruction: "Place and rinse your filter before adding coffee.",
    });
  }

  return Array.from(uniqueItems.values());
}

function buildStepPlan(steps: RecipeStep[]): PlannedStep[] {
  const plan: PlannedStep[] = [];
  let cursor = 0;
  let lastPourTarget: number | null = null;

  steps.forEach((step, index) => {
    const nextStep = steps[index + 1];
    const explicitStart = toPositiveNumber(step.windowStartSec);
    const startSec = explicitStart ?? cursor;

    const explicitEnd = toPositiveNumber(step.windowEndSec);
    const durationFromStep = toPositiveNumber(step.durationSec);
    const nextStart = toPositiveNumber(nextStep?.windowStartSec);

    const fallbackDuration = step.type === "pour" ? 18 : 30;
    const endByDuration = durationFromStep !== null ? startSec + durationFromStep : null;
    const endByNextStart = nextStart !== null && nextStart > startSec ? nextStart : null;
    const rawEnd = explicitEnd ?? endByDuration ?? endByNextStart ?? startSec + fallbackDuration;
    const endSec = Math.max(startSec + 1, rawEnd);

    const targetWater = toPositiveNumber(step.targetWaterGrams);
    const pourDelta = targetWater !== null ? Math.max(0, targetWater - (lastPourTarget ?? 0)) : null;

    plan.push({
      index,
      step,
      startSec,
      endSec,
      durationSec: endSec - startSec,
      prevPourTarget: lastPourTarget,
      pourDelta,
    });

    if (targetWater !== null) {
      lastPourTarget = targetWater;
    }
    cursor = endSec;
  });

  return plan;
}

function playCompletionChime() {
  if (typeof window === "undefined") return;

  const AudioCtor =
    window.AudioContext ||
    (window as Window & { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext;

  if (!AudioCtor) return;

  const audioContext = new AudioCtor();
  void audioContext.resume();

  const playTone = (frequency: number, startOffset: number, duration: number) => {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = "triangle";
    oscillator.frequency.value = frequency;

    gainNode.gain.setValueAtTime(0.0001, audioContext.currentTime + startOffset);
    gainNode.gain.exponentialRampToValueAtTime(0.07, audioContext.currentTime + startOffset + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(
      0.0001,
      audioContext.currentTime + startOffset + duration,
    );

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(audioContext.currentTime + startOffset);
    oscillator.stop(audioContext.currentTime + startOffset + duration);
  };

  playTone(784, 0, 0.12);
  playTone(1046, 0.14, 0.16);

  window.setTimeout(() => {
    void audioContext.close();
  }, 600);
}

function triggerHapticFeedback() {
  if (typeof navigator === "undefined") return;
  if (!("vibrate" in navigator)) return;
  navigator.vibrate([25, 40, 25]);
}

function getDirective(stepPlan: PlannedStep, promptStyle: PromptStyle): string {
  const { step, pourDelta } = stepPlan;
  const targetWater = toPositiveNumber(step.targetWaterGrams);

  const pourTargetText =
    targetWater !== null
      ? pourDelta && pourDelta > 0
        ? `add ${pourDelta}g more water (to ${targetWater}g total)`
        : `bring total water to ${targetWater}g`
      : null;

  if (promptStyle === "plain") {
    if (pourTargetText) {
      return `Now ${pourTargetText}, then switch at ${formatSeconds(stepPlan.endSec)}.`;
    }
    if (step.type === "wait" || step.type === "prep") {
      return `Hold this step until ${formatSeconds(stepPlan.endSec)}.`;
    }
    return `Complete this move before ${formatSeconds(stepPlan.endSec)}.`;
  }

  if (pourTargetText) {
    return `Barista cue: ${pourTargetText}. Next cue at ${formatSeconds(stepPlan.endSec)}.`;
  }

  switch (step.type) {
    case "wait":
      return `Barista cue: hands off. Let it settle until ${formatSeconds(stepPlan.endSec)}.`;
    case "prep":
      return `Barista cue: prep quickly and lock in by ${formatSeconds(stepPlan.endSec)}.`;
    case "stir":
      return `Barista cue: one gentle stir, then hold to ${formatSeconds(stepPlan.endSec)}.`;
    case "press":
      return `Barista cue: press evenly and finish by ${formatSeconds(stepPlan.endSec)}.`;
    case "serve":
      return `Barista cue: pour and serve. Step wraps at ${formatSeconds(stepPlan.endSec)}.`;
    default:
      return `Barista cue: follow this step through ${formatSeconds(stepPlan.endSec)}.`;
  }
}

function summarizeStep(stepPlan: PlannedStep): string {
  const { step, pourDelta } = stepPlan;
  const parts = [`${formatSeconds(stepPlan.startSec)}`, step.type.toUpperCase()];
  const targetWater = toPositiveNumber(step.targetWaterGrams);

  if (targetWater !== null) {
    if (pourDelta && pourDelta > 0) {
      parts.push(`+${pourDelta}g`);
    }
    parts.push(`${targetWater}g total`);
  }

  return parts.join(" · ");
}

export function BrewSessionPlayer({ recipe }: BrewSessionPlayerProps) {
  const activeVersion =
    recipe.versions.find((version) => version.id === recipe.activeVersionId) ?? recipe.versions[0];

  const [targetWaterGrams, setTargetWaterGrams] = useState(activeVersion.baseWaterGrams);
  const [targetRatio, setTargetRatio] = useState(activeVersion.baseWaterGrams / activeVersion.baseDoseGrams);
  const [session, setSession] = useState(() => createInitialSession(recipe.id, activeVersion));
  const [promptStyle, setPromptStyle] = useState<PromptStyle>("barista");
  const [enableSoundCue, setEnableSoundCue] = useState(true);
  const [enableHapticCue, setEnableHapticCue] = useState(true);
  const [sessionNotice, setSessionNotice] = useState("");
  const [prepChecks, setPrepChecks] = useState<boolean[]>([]);
  const [prepReady, setPrepReady] = useState(false);

  const completionCueStepRef = useRef<string | null>(null);

  const scaledVersion = useMemo(
    () =>
      scaleRecipeVersion(activeVersion, {
        targetWaterGrams,
        targetRatio,
      }),
    [activeVersion, targetRatio, targetWaterGrams],
  );

  const prepLikeSteps = useMemo(
    () => scaledVersion.steps.filter((step) => isPrepLikeStep(step)),
    [scaledVersion.steps],
  );

  const brewSteps = useMemo(
    () => scaledVersion.steps.filter((step) => !isPrepLikeStep(step)),
    [scaledVersion.steps],
  );

  const prepChecklist = useMemo(
    () => buildPrepChecklist(prepLikeSteps, scaledVersion.steps, scaledVersion.targetTempC),
    [prepLikeSteps, scaledVersion.steps, scaledVersion.targetTempC],
  );

  const stepPlan = useMemo(() => buildStepPlan(brewSteps), [brewSteps]);
  const stepCount = stepPlan.length;
  const currentPlannedStep = stepPlan[session.currentStepIndex] ?? null;
  const currentStep = currentPlannedStep?.step ?? null;
  const upcomingSteps = stepPlan.slice(session.currentStepIndex + 1, session.currentStepIndex + 4);
  const nextPlannedStep = upcomingSteps[0] ?? null;
  const totalTimelineSec = stepPlan[stepPlan.length - 1]?.endSec ?? 0;
  const prepStepCount = prepChecklist.length;
  const allPrepChecked = prepChecks.length > 0 && prepChecks.every(Boolean);

  useEffect(() => {
    setPrepChecks(Array.from({ length: prepStepCount }, () => false));
    setPrepReady(prepStepCount === 0);
  }, [prepStepCount, recipe.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = window.localStorage.getItem(getStorageKey(recipe.id));
    if (!stored) return;

    try {
      const parsed = JSON.parse(stored) as {
        session: typeof session;
        targetWaterGrams: number;
        targetRatio: number;
        promptStyle?: PromptStyle;
        enableSoundCue?: boolean;
        enableHapticCue?: boolean;
        prepChecks?: boolean[];
        prepReady?: boolean;
        storedAt: string;
      };

      if (Date.now() - new Date(parsed.storedAt).getTime() < 24 * 60 * 60 * 1000) {
        setSession({
          ...parsed.session,
          autoAdvance: true,
        });
        setTargetWaterGrams(parsed.targetWaterGrams);
        setTargetRatio(parsed.targetRatio);

        if (parsed.promptStyle === "barista" || parsed.promptStyle === "plain") {
          setPromptStyle(parsed.promptStyle);
        }
        if (typeof parsed.enableSoundCue === "boolean") {
          setEnableSoundCue(parsed.enableSoundCue);
        }
        if (typeof parsed.enableHapticCue === "boolean") {
          setEnableHapticCue(parsed.enableHapticCue);
        }
        if (
          Array.isArray(parsed.prepChecks) &&
          parsed.prepChecks.length === prepStepCount &&
          parsed.prepChecks.every((entry) => typeof entry === "boolean")
        ) {
          setPrepChecks(parsed.prepChecks);
        }
        if (typeof parsed.prepReady === "boolean") {
          setPrepReady(parsed.prepReady || prepStepCount === 0);
        }
      }
    } catch {
      // ignore invalid persisted state
    }
  }, [prepStepCount, recipe.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(
      getStorageKey(recipe.id),
      JSON.stringify({
        session: {
          ...session,
          autoAdvance: true,
        },
        targetWaterGrams,
        targetRatio,
        promptStyle,
        enableSoundCue,
        enableHapticCue,
        prepChecks,
        prepReady,
        storedAt: new Date().toISOString(),
      }),
    );
  }, [
    enableHapticCue,
    enableSoundCue,
    prepChecks,
    prepReady,
    promptStyle,
    recipe.id,
    session,
    targetRatio,
    targetWaterGrams,
  ]);

  useEffect(() => {
    const timer = setInterval(() => {
      setSession((prev) => {
        if (!prepReady || prev.isPaused || prev.isComplete) {
          return prev;
        }

        const planned = stepPlan[prev.currentStepIndex];
        if (!planned) return prev;

        const elapsedSec = prev.elapsedSec + 1;
        const stepElapsedSec = Math.max(0, elapsedSec - planned.startSec);

        return {
          ...prev,
          elapsedSec,
          stepElapsedSec,
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [prepReady, stepPlan]);

  useEffect(() => {
    if (!prepReady) return;
    if (!currentStep || !currentPlannedStep) return;
    if (session.elapsedSec < currentPlannedStep.endSec) return;
    if (completionCueStepRef.current === currentStep.id) return;

    completionCueStepRef.current = currentStep.id;

    if (enableSoundCue) {
      playCompletionChime();
    }
    if (enableHapticCue) {
      triggerHapticFeedback();
    }
  }, [currentPlannedStep, currentStep, enableHapticCue, enableSoundCue, prepReady, session.elapsedSec]);

  useEffect(() => {
    if (!prepReady || session.isComplete || session.isPaused || !stepCount) return;

    setSession((prev) => {
      const planned = stepPlan[prev.currentStepIndex];
      if (!planned || prev.elapsedSec < planned.endSec) {
        return prev;
      }

      const nextIndex = getNextStepIndex(prev.currentStepIndex, stepCount);
      if (nextIndex === prev.currentStepIndex) {
        return {
          ...prev,
          isComplete: true,
          isPaused: true,
          stepElapsedSec: planned.durationSec,
        };
      }

      const nextPlanned = stepPlan[nextIndex];
      return {
        ...prev,
        currentStepIndex: nextIndex,
        stepElapsedSec: 0,
        elapsedSec: Math.max(prev.elapsedSec, nextPlanned?.startSec ?? prev.elapsedSec),
      };
    });
  }, [prepReady, session.elapsedSec, session.isComplete, session.isPaused, stepCount, stepPlan]);

  useEffect(() => {
    setSessionNotice("");
  }, [session.currentStepIndex]);

  useEffect(() => {
    if (session.currentStepIndex < stepCount) return;
    setSession((prev) => {
      const nextIndex = Math.max(0, stepCount - 1);
      const nextElapsed = Math.max(0, totalTimelineSec);
      const nextComplete = stepCount === 0;

      if (
        prev.currentStepIndex === nextIndex &&
        prev.elapsedSec === nextElapsed &&
        prev.stepElapsedSec === 0 &&
        prev.isComplete === nextComplete
      ) {
        return prev;
      }

      return {
        ...prev,
        currentStepIndex: nextIndex,
        elapsedSec: nextElapsed,
        stepElapsedSec: 0,
        isComplete: nextComplete,
      };
    });
  }, [session.currentStepIndex, stepCount, totalTimelineSec]);

  useEffect(() => {
    if (!prepReady || stepCount > 0) return;
    setSession((prev) => ({
      ...prev,
      isComplete: true,
      isPaused: true,
    }));
  }, [prepReady, stepCount]);

  function goBack() {
    setSession((prev) => {
      const prevIndex = getPrevStepIndex(prev.currentStepIndex);
      const prevPlanned = stepPlan[prevIndex];
      return {
        ...prev,
        isComplete: false,
        currentStepIndex: prevIndex,
        elapsedSec: prevPlanned?.startSec ?? 0,
        stepElapsedSec: 0,
      };
    });
  }

  function skipStep() {
    setSession((prev) => {
      if (!stepCount) {
        return {
          ...prev,
          isComplete: true,
          isPaused: true,
        };
      }

      const nextIndex = getNextStepIndex(prev.currentStepIndex, stepCount);
      if (nextIndex === prev.currentStepIndex) {
        return {
          ...prev,
          isComplete: true,
          isPaused: true,
        };
      }

      const nextPlanned = stepPlan[nextIndex];
      return {
        ...prev,
        currentStepIndex: nextIndex,
        elapsedSec: Math.max(prev.elapsedSec, nextPlanned?.startSec ?? prev.elapsedSec),
        stepElapsedSec: 0,
      };
    });
    setSessionNotice("Step skipped.");
  }

  function resetSession() {
    completionCueStepRef.current = null;
    setPrepChecks(Array.from({ length: prepStepCount }, () => false));
    setPrepReady(prepStepCount === 0);
    setSession({
      ...createInitialSession(recipe.id, activeVersion),
      autoAdvance: true,
    });
  }

  const currentCountdown = currentPlannedStep
    ? Math.max(0, currentPlannedStep.endSec - session.elapsedSec)
    : 0;

  const progressPct = currentPlannedStep
    ? Math.min(
        100,
        (Math.max(0, session.elapsedSec - currentPlannedStep.startSec) / currentPlannedStep.durationSec) * 100,
      )
    : 0;

  const directive = currentPlannedStep ? getDirective(currentPlannedStep, promptStyle) : "";
  const isCurrentStepComplete = currentPlannedStep ? session.elapsedSec >= currentPlannedStep.endSec : false;

  return (
    <div className={styles.brewLayout}>
      <aside className={styles.sidebar}>
        <h2>Brew Settings</h2>
        {prepStepCount ? (
          <div className={styles.prepPanel}>
            <h3>Before You Start</h3>
            <p>Complete prep setup first, including heating water and filter setup. Timer starts after this checklist.</p>
            <ol className={styles.prepList}>
              {prepChecklist.map((item, index) => (
                <li key={item.id} className={prepChecks[index] ? styles.prepDone : undefined}>
                  <label>
                    <input
                      type="checkbox"
                      checked={Boolean(prepChecks[index])}
                      disabled={prepReady}
                      onChange={(event) => {
                        setPrepChecks((prev) =>
                          prev.map((entry, entryIndex) => (entryIndex === index ? event.target.checked : entry)),
                        );
                      }}
                    />
                    <span>{item.instruction}</span>
                  </label>
                </li>
              ))}
            </ol>
            {prepReady ? (
              <p className={styles.prepReady}>Prep complete. Start brew flow when ready.</p>
            ) : (
              <button
                type="button"
                className={styles.prepStart}
                disabled={!allPrepChecked}
                onClick={() => {
                  setPrepReady(true);
                  setSessionNotice("Prep complete. Start the brew timer.");
                }}
              >
                Start Brew Flow
              </button>
            )}
          </div>
        ) : null}

        <div className={styles.tweakGrid}>
          <label>
            Target Water (g)
            <input
              type="number"
              min={100}
              value={targetWaterGrams}
              onChange={(event) => setTargetWaterGrams(Number(event.target.value))}
            />
          </label>
          <label>
            Ratio (water:dose)
            <input
              type="number"
              min={10}
              max={20}
              step={0.1}
              value={targetRatio.toFixed(1)}
              onChange={(event) => setTargetRatio(Number(event.target.value))}
            />
          </label>
          <label>
            Prompt Style
            <select
              value={promptStyle}
              onChange={(event) => setPromptStyle(event.target.value as PromptStyle)}
            >
              <option value="barista">Barista Coach</option>
              <option value="plain">Simple Prompt</option>
            </select>
          </label>
        </div>

        <div className={styles.toggleGroup}>
          <label className={styles.toggleItem}>
            <input
              type="checkbox"
              checked={enableSoundCue}
              onChange={(event) => setEnableSoundCue(event.target.checked)}
            />
            Step completion sound
          </label>
          <label className={styles.toggleItem}>
            <input
              type="checkbox"
              checked={enableHapticCue}
              onChange={(event) => setEnableHapticCue(event.target.checked)}
            />
            Step completion haptics
          </label>
        </div>

        <p>
          Scaled dose: <strong>{scaledVersion.baseDoseGrams}g</strong>
        </p>
        <p>
          Ratio: <strong>{toRatioLabel(scaledVersion.baseWaterGrams, scaledVersion.baseDoseGrams)}</strong>
        </p>
        <p className={styles.progressText}>
          Timeline: {formatSeconds(Math.min(session.elapsedSec, totalTimelineSec))} / {formatSeconds(totalTimelineSec)}
        </p>

        <div className={styles.progressTrack}>
          <span style={{ width: `${Math.round(((session.currentStepIndex + 1) / Math.max(1, stepCount)) * 100)}%` }} />
        </div>
        <p className={styles.progressText}>
          Step {Math.min(session.currentStepIndex + 1, Math.max(1, stepCount))} of {Math.max(1, stepCount)}
        </p>

        <h3 className={styles.sidebarHeading}>Up Next</h3>
        <ol className={styles.upcomingList}>
          {upcomingSteps.map((planned) => (
            <li key={planned.step.id}>
              <strong>{summarizeStep(planned)}</strong>
              <span>{planned.step.instruction}</span>
            </li>
          ))}
          {!upcomingSteps.length ? (
            <li>
              <span>Final step reached.</span>
            </li>
          ) : null}
        </ol>
      </aside>

      <section className={styles.player}>
        <div className={styles.playerTop}>
          <div>
            <h2>{recipe.title}</h2>
            <p className={styles.sessionMeta}>Live Elapsed {formatSeconds(session.elapsedSec)}</p>
          </div>
          <div className={styles.progressRing} style={{ "--progress": `${progressPct}%` } as CSSProperties}>
            {formatSeconds(currentCountdown)}
          </div>
        </div>

        {session.isComplete ? (
          <div className={styles.completeBanner}>
            <h3>Brew Complete</h3>
            <p>
              Final spec: {scaledVersion.baseWaterGrams}g water / {scaledVersion.baseDoseGrams}g coffee
            </p>
          </div>
        ) : null}

        {!prepReady ? (
          <article className={styles.stepCard}>
            <div className={styles.nowHeader}>
              <h3>Prep Stage</h3>
              <span className={styles.statusPending}>Waiting</span>
            </div>
            <p className={styles.directive}>Finish prep checklist, then start the brew flow.</p>
            <p>Prep steps are intentionally not timed so you can get setup right before brewing.</p>
          </article>
        ) : null}

        {prepReady && currentStep && currentPlannedStep ? (
          <article className={styles.stepCard}>
            <div className={styles.nowHeader}>
              <h3>
                Step {session.currentStepIndex + 1} · {currentStep.type.toUpperCase()}
              </h3>
              <span className={isCurrentStepComplete ? styles.statusDone : styles.statusPending}>
                {isCurrentStepComplete ? "Complete" : "Live"}
              </span>
            </div>
            <p className={styles.directive}>{directive}</p>
            <p>{currentStep.instruction}</p>

            <div className={styles.metaRow}>
              {toPositiveNumber(currentStep.targetWaterGrams) !== null ? (
                <span className={styles.metaItem}>
                  Target {toPositiveNumber(currentStep.targetWaterGrams)}g total
                </span>
              ) : null}
              {currentPlannedStep.pourDelta !== null && currentPlannedStep.pourDelta > 0 ? (
                <span className={styles.metaItem}>Add +{currentPlannedStep.pourDelta}g this step</span>
              ) : null}
              <span className={styles.metaItemDone}>
                {formatSeconds(currentPlannedStep.startSec)} to {formatSeconds(currentPlannedStep.endSec)}
              </span>
              {currentStep.tips ? <span className={styles.metaItem}>Tip: {currentStep.tips}</span> : null}
            </div>
          </article>
        ) : null}

        {prepReady && !stepCount ? (
          <article className={styles.stepCard}>
            <div className={styles.nowHeader}>
              <h3>No Brew Steps</h3>
              <span className={styles.statusDone}>Ready</span>
            </div>
            <p className={styles.directive}>This recipe only contains prep instructions.</p>
          </article>
        ) : null}

        {prepReady && nextPlannedStep ? (
          <article className={styles.nextStepPanel}>
            <h3>Next Step</h3>
            <p className={styles.directive}>{summarizeStep(nextPlannedStep)}</p>
            <p>{nextPlannedStep.step.instruction}</p>
          </article>
        ) : null}

        <div className={styles.controlRow}>
          <button
            type="button"
            className={styles.secondary}
            onClick={goBack}
            disabled={!prepReady || session.currentStepIndex === 0}
          >
            Back
          </button>
          <button
            type="button"
            disabled={!prepReady || !stepCount}
            onClick={() => setSession((prev) => ({ ...prev, isPaused: !prev.isPaused }))}
          >
            {!prepReady ? "Prep First" : session.isPaused ? "Start" : "Pause"}
          </button>
          <button
            type="button"
            className={styles.secondary}
            onClick={skipStep}
            disabled={!prepReady || session.isComplete}
          >
            Skip Step
          </button>
          <button type="button" className={styles.secondary} onClick={resetSession}>
            Restart
          </button>
        </div>
        {sessionNotice ? <p className={styles.sessionNotice}>{sessionNotice}</p> : null}
      </section>
    </div>
  );
}
