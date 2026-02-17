import { nanoid } from "nanoid";
import legacyCards from "@/data/legacyCards.json";
import type { BrewStepType, Recipe, RecipeStep, RecipeVersion } from "@/lib/types";

interface LegacyCard {
  name: string;
  image: string;
  recipe: string;
  instructions: Record<string, string>;
  quote: string;
}

const imageByBrewer: Record<string, string> = {
  Chemex: "/assets/images/Chemex.png",
  "Clever Dripper": "/assets/images/Clever.png",
  Aeropress: "/assets/images/AeroPress.png",
  "French Press": "/assets/images/FrenchPress.png",
  "Kalita Wave": "/assets/images/KalitaWave.png",
  "Hario V60": "/assets/images/HarioV60.png",
  "Coffee Brewer": "/assets/images/MrCoffee.png",
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

function recipeTokenize(spec: string): string[] {
  return spec
    .split("/")
    .map((token) => token.trim())
    .filter(Boolean);
}

function parseWater(spec: string): number {
  const gramMatch = spec.match(/(\d+(?:\.\d+)?)\s*g\s*water/i);
  if (gramMatch) return Math.round(Number(gramMatch[1]));

  const cupMatch = spec.match(/(\d+(?:\.\d+)?)\s*cups?\s*of\s*water/i);
  if (cupMatch) {
    return Math.round(Number(cupMatch[1]) * 236.6);
  }

  return 350;
}

function parseDose(spec: string): number {
  const gramMatch = spec.match(/(\d+(?:\.\d+)?)\s*g\s*coffee/i);
  if (gramMatch) return Math.round(Number(gramMatch[1]));

  const tbspMatch = spec.match(/(\d+(?:\.\d+)?)\s*tablespoons?\s*of\s*coffee/i);
  if (tbspMatch) {
    return Math.round(Number(tbspMatch[1]) * 5.3);
  }

  return 22;
}

function parseDurationSeconds(instruction: string): number | null {
  const minuteSecondMatch = instruction.match(/(\d+)\s*:\s*(\d+)/);
  if (minuteSecondMatch) {
    return Number(minuteSecondMatch[1]) * 60 + Number(minuteSecondMatch[2]);
  }

  const minutesMatch = instruction.match(/(\d+(?:\.\d+)?)\s*minutes?/i);
  const secondsMatch = instruction.match(/(\d+(?:\.\d+)?)\s*seconds?/i);
  if (minutesMatch || secondsMatch) {
    const minutes = minutesMatch ? Number(minutesMatch[1]) : 0;
    const seconds = secondsMatch ? Number(secondsMatch[1]) : 0;
    return Math.round(minutes * 60 + seconds);
  }

  return null;
}

function parseTargetWater(instruction: string): number | null {
  const match = instruction.match(/(\d+(?:\.\d+)?)\s*g\b/i);
  if (!match) return null;
  return Math.round(Number(match[1]));
}

function inferStepType(instruction: string, index: number): BrewStepType {
  const lower = instruction.toLowerCase();
  if (lower.includes("press") || lower.includes("plunge")) return "press";
  if (lower.includes("stir")) return "stir";
  if (index === 0 || lower.includes("heat") || lower.includes("grind") || lower.includes("filter")) {
    return "prep";
  }
  if (lower.includes("wait") || lower.includes("timer") || lower.includes("brew") || lower.includes("drain")) {
    return "wait";
  }
  if (lower.includes("bloom") || lower.includes("pour") || lower.includes("add") || lower.includes("water")) {
    return "pour";
  }
  if (lower.includes("enjoy") || lower.includes("serve") || lower.includes("decant")) return "serve";
  return "prep";
}

function inferDifficulty(stepCount: number): Recipe["difficulty"] {
  if (stepCount <= 5) return "Easy";
  if (stepCount <= 7) return "Medium";
  return "Advanced";
}

function buildSteps(
  recipeId: string,
  versionId: string,
  instructions: Record<string, string>,
): RecipeStep[] {
  const ordered = Object.keys(instructions)
    .sort((a, b) => Number(a) - Number(b))
    .map((key) => instructions[key]);

  return ordered.map((instruction, index) => ({
    id: `${recipeId}-step-${index + 1}`,
    versionId,
    stepOrder: index,
    type: inferStepType(instruction, index),
    instruction,
    targetWaterGrams: parseTargetWater(instruction),
    durationSec: parseDurationSeconds(instruction),
    windowStartSec: null,
    windowEndSec: null,
    tips: null,
  }));
}

function buildVersion(recipeId: string, card: LegacyCard): RecipeVersion {
  const versionId = `${recipeId}-v1`;
  const tokens = recipeTokenize(card.recipe);
  const equipment = tokens.filter((token) =>
    !token.toLowerCase().includes("water") &&
    !token.toLowerCase().includes("coffee") &&
    !token.match(/\d/),
  );

  const targetTempF = card.instructions["1"]?.match(/(\d+)\s*°f/i);
  const targetTempC = targetTempF ? Math.round((Number(targetTempF[1]) - 32) * (5 / 9)) : 96;

  return {
    id: versionId,
    recipeId,
    versionNumber: 1,
    baseWaterGrams: parseWater(card.recipe),
    baseDoseGrams: parseDose(card.recipe),
    targetTempC,
    grindLabel: "Medium",
    notes: card.recipe,
    equipment,
    steps: buildSteps(recipeId, versionId, card.instructions),
    createdAt: new Date(2024, 0, 1).toISOString(),
  };
}

export function buildSeedRecipes(): Recipe[] {
  const cards = legacyCards as LegacyCard[];

  return cards.map((card) => {
    const slug = slugify(card.name);
    const recipeId = `seed-${slug}`;
    const version = buildVersion(recipeId, card);
    const now = new Date(2024, 0, 1).toISOString();

    return {
      id: recipeId,
      ownerId: null,
      slug,
      title: card.name,
      brewer: card.name,
      description: `Classic ${card.name} recipe with guided pour and timing targets.`,
      quote: card.quote,
      coverImageUrl: imageByBrewer[card.name] ?? "/assets/images/Chemex.png",
      isPublic: true,
      difficulty: inferDifficulty(version.steps.length),
      brewTimeMin: Math.max(
        2,
        Math.round(
          version.steps.reduce((total, step) => total + (step.durationSec ?? 25), 0) / 60,
        ),
      ),
      activeVersionId: version.id,
      versions: [version],
      createdAt: now,
      updatedAt: now,
    };
  });
}

export const presetImageOptions = [
  "/assets/images/Chemex.png",
  "/assets/images/Clever.png",
  "/assets/images/AeroPress.png",
  "/assets/images/FrenchPress.png",
  "/assets/images/KalitaWave.png",
  "/assets/images/HarioV60.png",
  "/assets/images/MrCoffee.png",
];

export function createBlankRecipe(ownerId: string): Recipe {
  const recipeId = nanoid(12);
  const versionId = `${recipeId}-v1`;
  const now = new Date().toISOString();

  const steps: RecipeStep[] = [
    {
      id: `${recipeId}-step-1`,
      versionId,
      stepOrder: 0,
      type: "prep",
      instruction: "Heat water and rinse filter.",
      targetWaterGrams: null,
      durationSec: 45,
      windowStartSec: null,
      windowEndSec: null,
      tips: "Use hot water to preheat brewer and mug.",
    },
    {
      id: `${recipeId}-step-2`,
      versionId,
      stepOrder: 1,
      type: "pour",
      instruction: "Add water to 60g for bloom.",
      targetWaterGrams: 60,
      durationSec: 30,
      windowStartSec: null,
      windowEndSec: null,
      tips: "Saturate all grounds evenly.",
    },
    {
      id: `${recipeId}-step-3`,
      versionId,
      stepOrder: 2,
      type: "pour",
      instruction: "Continue pouring to final target.",
      targetWaterGrams: 350,
      durationSec: null,
      windowStartSec: null,
      windowEndSec: null,
      tips: null,
    },
  ];

  return {
    id: recipeId,
    ownerId,
    slug: `recipe-${recipeId.slice(0, 6)}`,
    title: "Untitled Brew Card",
    brewer: "Pour Over",
    description: "A custom brew recipe built in Coffee Brew Lab.",
    quote: "Dial it in and share it.",
    coverImageUrl: presetImageOptions[0],
    isPublic: false,
    difficulty: "Medium",
    brewTimeMin: 4,
    activeVersionId: versionId,
    versions: [
      {
        id: versionId,
        recipeId,
        versionNumber: 1,
        baseWaterGrams: 350,
        baseDoseGrams: 22,
        targetTempC: 96,
        grindLabel: "Medium",
        notes: "",
        equipment: ["Dripper", "Paper Filter", "Scale", "Timer"],
        steps,
        createdAt: now,
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}
