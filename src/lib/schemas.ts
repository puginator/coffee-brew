import { z } from "zod";

export const recipeStepSchema = z.object({
  id: z.string().min(1),
  versionId: z.string().min(1),
  stepOrder: z.number().int().nonnegative(),
  type: z.enum(["prep", "pour", "wait", "stir", "press", "serve"]),
  instruction: z.string().min(2),
  targetWaterGrams: z.number().nonnegative().nullable().optional(),
  durationSec: z.number().int().nonnegative().nullable().optional(),
  windowStartSec: z.number().int().nonnegative().nullable().optional(),
  windowEndSec: z.number().int().nonnegative().nullable().optional(),
  tips: z.string().nullable().optional(),
});

export const recipeVersionSchema = z.object({
  id: z.string().min(1),
  recipeId: z.string().min(1),
  versionNumber: z.number().int().positive(),
  baseWaterGrams: z.number().positive(),
  baseDoseGrams: z.number().positive(),
  targetTempC: z.number().min(70).max(100),
  grindLabel: z.string().min(2),
  notes: z.string().default(""),
  equipment: z.array(z.string().min(1)).default([]),
  steps: z.array(recipeStepSchema).min(1),
  createdAt: z.string().min(1),
});

export const recipeSchema = z.object({
  id: z.string().min(1),
  ownerId: z.string().nullable(),
  slug: z.string().min(1),
  title: z.string().min(2),
  brewer: z.string().min(2),
  description: z.string().min(4),
  quote: z.string().min(2),
  coverImageUrl: z.string().min(1),
  isPublic: z.boolean(),
  difficulty: z.enum(["Easy", "Medium", "Advanced"]),
  brewTimeMin: z.number().int().positive(),
  activeVersionId: z.string().min(1),
  versions: z.array(recipeVersionSchema).min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
