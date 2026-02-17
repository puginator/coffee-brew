import { describe, expect, it } from "vitest";
import { buildSeedRecipes } from "@/lib/data/legacy";
import { scaleRecipeVersion } from "@/lib/brew/scaling";

describe("scaleRecipeVersion", () => {
  it("scales water, dose, and pour targets", () => {
    const recipe = buildSeedRecipes().find((item) => item.slug === "hario-v60");
    if (!recipe) throw new Error("seed recipe missing");

    const version = recipe.versions[0];
    const scaled = scaleRecipeVersion(version, {
      targetWaterGrams: 500,
      targetRatio: 15,
    });

    expect(scaled.baseWaterGrams).toBe(500);
    expect(scaled.baseDoseGrams).toBe(33);

    const originalTarget = version.steps.find((step) => typeof step.targetWaterGrams === "number")?.targetWaterGrams;
    const scaledTarget = scaled.steps.find((step) => typeof step.targetWaterGrams === "number")?.targetWaterGrams;

    if (!originalTarget || !scaledTarget) throw new Error("missing pour target");

    expect(scaledTarget).toBe(Math.round((500 / version.baseWaterGrams) * originalTarget));
  });
});
