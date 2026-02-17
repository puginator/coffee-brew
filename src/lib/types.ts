export type BrewStepType = "prep" | "pour" | "wait" | "stir" | "press" | "serve";

export interface RecipeStep {
  id: string;
  versionId: string;
  stepOrder: number;
  type: BrewStepType;
  instruction: string;
  targetWaterGrams?: number | null;
  durationSec?: number | null;
  windowStartSec?: number | null;
  windowEndSec?: number | null;
  tips?: string | null;
}

export interface RecipeVersion {
  id: string;
  recipeId: string;
  versionNumber: number;
  baseWaterGrams: number;
  baseDoseGrams: number;
  targetTempC: number;
  grindLabel: string;
  notes: string;
  equipment: string[];
  steps: RecipeStep[];
  createdAt: string;
}

export interface Recipe {
  id: string;
  ownerId: string | null;
  slug: string;
  title: string;
  brewer: string;
  description: string;
  quote: string;
  coverImageUrl: string;
  isPublic: boolean;
  difficulty: "Easy" | "Medium" | "Advanced";
  brewTimeMin: number;
  activeVersionId: string;
  versions: RecipeVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface ShareLink {
  id: string;
  recipeId: string;
  token: string;
  publishedVersionId: string;
  createdBy: string;
  revokedAt?: string | null;
  createdAt: string;
}

export interface BrewSessionState {
  recipeId: string;
  recipeVersionId: string;
  startedAt: string;
  currentStepIndex: number;
  elapsedSec: number;
  stepElapsedSec: number;
  currentWaterGrams: number;
  isPaused: boolean;
  autoAdvance: boolean;
  isComplete: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
}
