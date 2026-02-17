import type { RecipeVersion } from "@/lib/types";

export interface ScaleOptions {
  targetWaterGrams: number;
  targetRatio: number;
}

export function scaleRecipeVersion(
  version: RecipeVersion,
  options: ScaleOptions,
): RecipeVersion {
  const targetWater = Math.max(1, Math.round(options.targetWaterGrams));
  const ratio = Math.max(1, options.targetRatio);
  const scaledDose = Math.max(1, Math.round(targetWater / ratio));
  const factor = targetWater / Math.max(1, version.baseWaterGrams);

  const scaledSteps = version.steps.map((step) => ({
    ...step,
    targetWaterGrams:
      typeof step.targetWaterGrams === "number"
        ? Math.round(step.targetWaterGrams * factor)
        : step.targetWaterGrams,
  }));

  return {
    ...version,
    baseWaterGrams: targetWater,
    baseDoseGrams: scaledDose,
    steps: scaledSteps,
  };
}
