"use client";

import { nanoid } from "nanoid";
import { buildSeedRecipes, createBlankRecipe } from "@/lib/data/legacy";
import {
  loadCustomRecipes,
  loadShareLinks,
  saveCustomRecipes,
  saveShareLinks,
} from "@/lib/data/local-storage";
import { isSupabaseConfigured } from "@/lib/config";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import { recipeSchema } from "@/lib/schemas";
import type { Recipe, RecipeStep, RecipeVersion, ShareLink } from "@/lib/types";

interface DbRecipeRow {
  id: string;
  owner_id: string | null;
  slug: string;
  title: string;
  brewer: string;
  description: string;
  quote: string;
  cover_image_url: string;
  is_public: boolean;
  difficulty: Recipe["difficulty"];
  brew_time_min: number;
  active_version_id: string;
  created_at: string;
  updated_at: string;
}

interface DbVersionRow {
  id: string;
  recipe_id: string;
  version_number: number;
  base_water_grams: number;
  base_dose_grams: number;
  target_temp_c: number;
  grind_label: string;
  notes: string;
  equipment: string[] | null;
  created_at: string;
}

interface DbStepRow {
  id: string;
  version_id: string;
  step_order: number;
  type: RecipeStep["type"];
  instruction: string;
  target_water_grams: number | null;
  duration_sec: number | null;
  window_start_sec: number | null;
  window_end_sec: number | null;
  tips: string | null;
}

interface DbShareRow {
  id: string;
  recipe_id: string;
  token: string;
  published_version_id: string;
  created_by: string;
  revoked_at: string | null;
  created_at: string;
}

const seedRecipes = buildSeedRecipes();

function getAllLocalRecipes(): Recipe[] {
  const custom = loadCustomRecipes();
  return [...seedRecipes, ...custom];
}

function getPublicLocalRecipes(): Recipe[] {
  return getAllLocalRecipes().filter((recipe) => recipe.isPublic);
}

function mapVersion(rows: DbVersionRow[], stepRows: DbStepRow[]): RecipeVersion[] {
  return rows.map((row) => ({
    id: row.id,
    recipeId: row.recipe_id,
    versionNumber: row.version_number,
    baseWaterGrams: row.base_water_grams,
    baseDoseGrams: row.base_dose_grams,
    targetTempC: row.target_temp_c,
    grindLabel: row.grind_label,
    notes: row.notes,
    equipment: row.equipment ?? [],
    createdAt: row.created_at,
    steps: stepRows
      .filter((step) => step.version_id === row.id)
      .sort((a, b) => a.step_order - b.step_order)
      .map((step) => ({
        id: step.id,
        versionId: step.version_id,
        stepOrder: step.step_order,
        type: step.type,
        instruction: step.instruction,
        targetWaterGrams: step.target_water_grams,
        durationSec: step.duration_sec,
        windowStartSec: step.window_start_sec,
        windowEndSec: step.window_end_sec,
        tips: step.tips,
      })),
  }));
}

function mapRecipe(row: DbRecipeRow, versions: RecipeVersion[]): Recipe {
  return {
    id: row.id,
    ownerId: row.owner_id,
    slug: row.slug,
    title: row.title,
    brewer: row.brewer,
    description: row.description,
    quote: row.quote,
    coverImageUrl: row.cover_image_url,
    isPublic: row.is_public,
    difficulty: row.difficulty,
    brewTimeMin: row.brew_time_min,
    activeVersionId: row.active_version_id,
    versions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function hydrateRecipe(row: DbRecipeRow): Promise<Recipe | null> {
  const supabase = getBrowserSupabaseClient();
  if (!supabase) return null;

  const { data: versionRows, error: versionError } = await supabase
    .from("recipe_versions")
    .select("*")
    .eq("recipe_id", row.id)
    .order("version_number", { ascending: false });

  if (versionError || !versionRows?.length) {
    return null;
  }

  const versionIds = versionRows.map((version) => version.id);
  const { data: stepRows, error: stepError } = await supabase
    .from("recipe_steps")
    .select("*")
    .in("version_id", versionIds)
    .order("step_order", { ascending: true });

  if (stepError || !stepRows) {
    return null;
  }

  return mapRecipe(
    row,
    mapVersion(versionRows as DbVersionRow[], stepRows as DbStepRow[]),
  );
}

function dedupeById(recipes: Recipe[]): Recipe[] {
  const map = new Map<string, Recipe>();
  recipes.forEach((recipe) => map.set(recipe.id, recipe));
  return Array.from(map.values());
}

export async function listPublicRecipes(): Promise<Recipe[]> {
  if (isSupabaseConfigured) {
    const supabase = getBrowserSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .eq("is_public", true)
        .order("updated_at", { ascending: false });

      if (!error && data) {
        const hydrated = (
          await Promise.all(data.map((row) => hydrateRecipe(row as DbRecipeRow)))
        ).filter(Boolean) as Recipe[];

        if (hydrated.length) {
          return dedupeById([...seedRecipes, ...hydrated]);
        }
      }
    }
  }

  return getPublicLocalRecipes();
}

export async function listRecipesByOwner(ownerId: string): Promise<Recipe[]> {
  if (isSupabaseConfigured) {
    const supabase = getBrowserSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .eq("owner_id", ownerId)
        .order("updated_at", { ascending: false });

      if (!error && data) {
        const hydrated = (
          await Promise.all(data.map((row) => hydrateRecipe(row as DbRecipeRow)))
        ).filter(Boolean) as Recipe[];

        return hydrated;
      }
    }
  }

  return loadCustomRecipes().filter((recipe) => recipe.ownerId === ownerId);
}

export async function getRecipeBySlug(slug: string): Promise<Recipe | null> {
  if (isSupabaseConfigured) {
    const supabase = getBrowserSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (!error && data) {
        return hydrateRecipe(data as DbRecipeRow);
      }
    }
  }

  const allRecipes = getAllLocalRecipes();
  return allRecipes.find((recipe) => recipe.slug === slug) ?? null;
}

export async function getRecipeById(id: string): Promise<Recipe | null> {
  if (isSupabaseConfigured) {
    const supabase = getBrowserSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.from("recipes").select("*").eq("id", id).maybeSingle();
      if (!error && data) {
        return hydrateRecipe(data as DbRecipeRow);
      }
    }
  }

  return getAllLocalRecipes().find((recipe) => recipe.id === id) ?? null;
}

function normalizeRecipe(recipe: Recipe): Recipe {
  const sortedVersions = recipe.versions
    .map((version) => ({
      ...version,
      steps: [...version.steps].sort((a, b) => a.stepOrder - b.stepOrder),
    }))
    .sort((a, b) => b.versionNumber - a.versionNumber);

  return recipeSchema.parse({
    ...recipe,
    versions: sortedVersions,
    updatedAt: new Date().toISOString(),
  });
}

export async function saveRecipeDraft(recipe: Recipe, ownerId: string): Promise<Recipe> {
  const normalized = normalizeRecipe({ ...recipe, ownerId });

  if (isSupabaseConfigured) {
    const supabase = getBrowserSupabaseClient();
    if (supabase) {
      const recipePayload = {
        id: normalized.id,
        owner_id: ownerId,
        slug: normalized.slug,
        title: normalized.title,
        brewer: normalized.brewer,
        description: normalized.description,
        quote: normalized.quote,
        cover_image_url: normalized.coverImageUrl,
        is_public: normalized.isPublic,
        difficulty: normalized.difficulty,
        brew_time_min: normalized.brewTimeMin,
        active_version_id: normalized.activeVersionId,
        updated_at: normalized.updatedAt,
      };

      const { error: recipeError } = await supabase
        .from("recipes")
        .upsert(recipePayload, { onConflict: "id" });

      if (!recipeError) {
        const versionPayload = normalized.versions.map((version) => ({
          id: version.id,
          recipe_id: normalized.id,
          version_number: version.versionNumber,
          base_water_grams: version.baseWaterGrams,
          base_dose_grams: version.baseDoseGrams,
          target_temp_c: version.targetTempC,
          grind_label: version.grindLabel,
          notes: version.notes,
          equipment: version.equipment,
        }));

        const { error: versionError } = await supabase
          .from("recipe_versions")
          .upsert(versionPayload, { onConflict: "id" });

        if (!versionError) {
          const versionIds = normalized.versions.map((version) => version.id);
          await supabase.from("recipe_steps").delete().in("version_id", versionIds);

          const stepPayload = normalized.versions.flatMap((version) =>
            version.steps.map((step) => ({
              id: step.id,
              version_id: version.id,
              step_order: step.stepOrder,
              type: step.type,
              instruction: step.instruction,
              target_water_grams: step.targetWaterGrams ?? null,
              duration_sec: step.durationSec ?? null,
              window_start_sec: step.windowStartSec ?? null,
              window_end_sec: step.windowEndSec ?? null,
              tips: step.tips ?? null,
            })),
          );

          const { error: stepError } = await supabase.from("recipe_steps").upsert(stepPayload, {
            onConflict: "id",
          });

          if (!stepError) {
            return normalized;
          }
        }
      }
    }
  }

  const custom = loadCustomRecipes();
  const existing = custom.findIndex((entry) => entry.id === normalized.id);
  if (existing >= 0) {
    custom[existing] = normalized;
  } else {
    custom.unshift(normalized);
  }
  saveCustomRecipes(custom);
  return normalized;
}

export async function publishRecipe(recipeId: string, ownerId: string): Promise<Recipe | null> {
  const recipe = await getRecipeById(recipeId);
  if (!recipe || recipe.ownerId !== ownerId) return null;

  const published = await saveRecipeDraft({ ...recipe, isPublic: true }, ownerId);
  return published;
}

export async function createDraftRecipe(ownerId: string): Promise<Recipe> {
  const draft = createBlankRecipe(ownerId);
  return saveRecipeDraft(draft, ownerId);
}

function normalizeShareFromDb(row: DbShareRow): ShareLink {
  return {
    id: row.id,
    recipeId: row.recipe_id,
    token: row.token,
    publishedVersionId: row.published_version_id,
    createdBy: row.created_by,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  };
}

export async function createOrGetShareLink(
  recipeId: string,
  ownerId: string,
): Promise<ShareLink | null> {
  if (isSupabaseConfigured) {
    const supabase = getBrowserSupabaseClient();
    if (supabase) {
      const { data: existing } = await supabase
        .from("share_links")
        .select("*")
        .eq("recipe_id", recipeId)
        .eq("created_by", ownerId)
        .is("revoked_at", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existing) {
        return normalizeShareFromDb(existing as DbShareRow);
      }

      const recipe = await getRecipeById(recipeId);
      if (!recipe) return null;

      const payload = {
        id: nanoid(12),
        recipe_id: recipeId,
        token: nanoid(10),
        published_version_id: recipe.activeVersionId,
        created_by: ownerId,
      };

      const { data, error } = await supabase
        .from("share_links")
        .insert(payload)
        .select("*")
        .single();

      if (!error && data) {
        return normalizeShareFromDb(data as DbShareRow);
      }
    }
  }

  const allShares = loadShareLinks();
  const existing = allShares.find(
    (link) => link.recipeId === recipeId && link.createdBy === ownerId && !link.revokedAt,
  );
  if (existing) return existing;

  const recipe = await getRecipeById(recipeId);
  if (!recipe) return null;

  const shareLink: ShareLink = {
    id: nanoid(12),
    recipeId,
    token: nanoid(10),
    publishedVersionId: recipe.activeVersionId,
    createdBy: ownerId,
    createdAt: new Date().toISOString(),
    revokedAt: null,
  };

  saveShareLinks([shareLink, ...allShares]);
  return shareLink;
}

export async function revokeShareLink(token: string, ownerId: string): Promise<void> {
  if (isSupabaseConfigured) {
    const supabase = getBrowserSupabaseClient();
    if (supabase) {
      await supabase
        .from("share_links")
        .update({ revoked_at: new Date().toISOString() })
        .eq("token", token)
        .eq("created_by", ownerId);
      return;
    }
  }

  const updated = loadShareLinks().map((link) =>
    link.token === token && link.createdBy === ownerId
      ? { ...link, revokedAt: new Date().toISOString() }
      : link,
  );

  saveShareLinks(updated);
}

export async function getRecipeByShareToken(token: string): Promise<Recipe | null> {
  if (token.startsWith("seed-")) {
    const slug = token.replace("seed-", "");
    return seedRecipes.find((recipe) => recipe.slug === slug) ?? null;
  }

  if (isSupabaseConfigured) {
    const supabase = getBrowserSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase
        .from("share_links")
        .select("*")
        .eq("token", token)
        .is("revoked_at", null)
        .maybeSingle();

      if (!error && data) {
        const recipe = await getRecipeById((data as DbShareRow).recipe_id);
        return recipe;
      }
    }
  }

  const share = loadShareLinks().find((link) => link.token === token && !link.revokedAt);
  if (!share) return null;

  return getRecipeById(share.recipeId);
}

function cloneVersion(version: RecipeVersion, recipeId: string, versionId: string): RecipeVersion {
  const steps = version.steps.map((step, index) => ({
    ...step,
    id: `${recipeId}-step-${index + 1}`,
    versionId,
    stepOrder: index,
  }));

  return {
    ...version,
    id: versionId,
    recipeId,
    steps,
    versionNumber: 1,
    createdAt: new Date().toISOString(),
  };
}

export async function remixRecipe(source: Recipe, ownerId: string): Promise<Recipe> {
  const recipeId = nanoid(12);
  const slug = `${source.slug}-remix-${recipeId.slice(0, 4)}`;
  const versionId = `${recipeId}-v1`;
  const activeVersion = source.versions.find((version) => version.id === source.activeVersionId) ?? source.versions[0];
  const clonedVersion = cloneVersion(activeVersion, recipeId, versionId);

  const remixed: Recipe = {
    ...source,
    id: recipeId,
    ownerId,
    slug,
    title: `${source.title} Remix`,
    isPublic: false,
    activeVersionId: versionId,
    versions: [clonedVersion],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  return saveRecipeDraft(remixed, ownerId);
}

export async function remixRecipeFromShareToken(
  token: string,
  ownerId: string,
): Promise<Recipe | null> {
  const source = await getRecipeByShareToken(token);
  if (!source) return null;
  return remixRecipe(source, ownerId);
}
