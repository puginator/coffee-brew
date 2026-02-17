#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");
const sourcePath = path.join(projectRoot, "src/data/legacyCards.json");
const targetPath = path.join(projectRoot, "supabase/seed.sql");

const imageByBrewer = {
  Chemex: "/assets/images/Chemex.png",
  "Clever Dripper": "/assets/images/Clever.png",
  Aeropress: "/assets/images/AeroPress.png",
  "French Press": "/assets/images/FrenchPress.png",
  "Kalita Wave": "/assets/images/KalitaWave.png",
  "Hario V60": "/assets/images/HarioV60.png",
  "Coffee Brewer": "/assets/images/MrCoffee.png",
};

const SEED_TIMESTAMP = "2024-01-01T00:00:00.000Z";

function sqlString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function sqlNullable(value) {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "null";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return sqlString(value);
}

function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

function recipeTokenize(spec) {
  return spec
    .split("/")
    .map((token) => token.trim())
    .filter(Boolean);
}

function parseWater(spec) {
  const gramMatch = spec.match(/(\d+(?:\.\d+)?)\s*g\s*water/i);
  if (gramMatch) return Math.round(Number(gramMatch[1]));

  const cupMatch = spec.match(/(\d+(?:\.\d+)?)\s*cups?\s*of\s*water/i);
  if (cupMatch) return Math.round(Number(cupMatch[1]) * 236.6);

  return 350;
}

function parseDose(spec) {
  const gramMatch = spec.match(/(\d+(?:\.\d+)?)\s*g\s*coffee/i);
  if (gramMatch) return Math.round(Number(gramMatch[1]));

  const tbspMatch = spec.match(/(\d+(?:\.\d+)?)\s*tablespoons?\s*of\s*coffee/i);
  if (tbspMatch) return Math.round(Number(tbspMatch[1]) * 5.3);

  return 22;
}

function parseDurationSeconds(instruction) {
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

function parseTargetWater(instruction) {
  const match = instruction.match(/(\d+(?:\.\d+)?)\s*g\b/i);
  if (!match) return null;
  return Math.round(Number(match[1]));
}

function inferStepType(instruction, index) {
  const lower = instruction.toLowerCase();
  if (lower.includes("press") || lower.includes("plunge")) return "press";
  if (lower.includes("stir")) return "stir";
  if (index === 0 || lower.includes("heat") || lower.includes("grind") || lower.includes("filter")) return "prep";
  if (lower.includes("wait") || lower.includes("timer") || lower.includes("brew") || lower.includes("drain")) return "wait";
  if (lower.includes("bloom") || lower.includes("pour") || lower.includes("add") || lower.includes("water")) return "pour";
  if (lower.includes("enjoy") || lower.includes("serve") || lower.includes("decant")) return "serve";
  return "prep";
}

function inferDifficulty(stepCount) {
  if (stepCount <= 5) return "Easy";
  if (stepCount <= 7) return "Medium";
  return "Advanced";
}

function buildSeedData(cards) {
  const recipes = [];
  const versions = [];
  const steps = [];

  for (const card of cards) {
    const slug = slugify(card.name);
    const recipeId = `seed-${slug}`;
    const versionId = `${recipeId}-v1`;

    const stepList = Object.keys(card.instructions)
      .sort((a, b) => Number(a) - Number(b))
      .map((key, index) => {
        const instruction = card.instructions[key];
        const step = {
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
        };
        steps.push(step);
        return step;
      });

    const tokens = recipeTokenize(card.recipe);
    const equipment = tokens.filter((token) =>
      !token.toLowerCase().includes("water") &&
      !token.toLowerCase().includes("coffee") &&
      !token.match(/\d/),
    );

    const targetTempF = card.instructions["1"]?.match(/(\d+)\s*°f/i);
    const targetTempC = targetTempF ? Math.round((Number(targetTempF[1]) - 32) * (5 / 9)) : 96;

    const version = {
      id: versionId,
      recipeId,
      versionNumber: 1,
      baseWaterGrams: parseWater(card.recipe),
      baseDoseGrams: parseDose(card.recipe),
      targetTempC,
      grindLabel: "Medium",
      notes: card.recipe,
      equipment,
      createdAt: SEED_TIMESTAMP,
    };

    versions.push(version);

    const recipe = {
      id: recipeId,
      ownerId: null,
      slug,
      title: card.name,
      brewer: card.name,
      description: `Classic ${card.name} recipe with guided pour and timing targets.`,
      quote: card.quote,
      coverImageUrl: imageByBrewer[card.name] ?? "/assets/images/Chemex.png",
      isPublic: true,
      difficulty: inferDifficulty(stepList.length),
      brewTimeMin: Math.max(
        2,
        Math.round(stepList.reduce((total, step) => total + (step.durationSec ?? 25), 0) / 60),
      ),
      activeVersionId: versionId,
      createdAt: SEED_TIMESTAMP,
      updatedAt: SEED_TIMESTAMP,
    };

    recipes.push(recipe);
  }

  return { recipes, versions, steps };
}

function equipmentArraySql(equipment) {
  if (!equipment.length) {
    return "array[]::text[]";
  }
  return `array[${equipment.map((item) => sqlString(item)).join(", ")}]::text[]`;
}

function generateSql(seedData) {
  const recipeValues = seedData.recipes
    .map((recipe) => `  (
    ${sqlString(recipe.id)},
    ${sqlNullable(recipe.ownerId)},
    ${sqlString(recipe.slug)},
    ${sqlString(recipe.title)},
    ${sqlString(recipe.brewer)},
    ${sqlString(recipe.description)},
    ${sqlString(recipe.quote)},
    ${sqlString(recipe.coverImageUrl)},
    ${sqlNullable(recipe.isPublic)},
    ${sqlString(recipe.difficulty)},
    ${sqlNullable(recipe.brewTimeMin)},
    ${sqlString(recipe.activeVersionId)},
    ${sqlString(recipe.createdAt)}::timestamptz,
    ${sqlString(recipe.updatedAt)}::timestamptz
  )`)
    .join(",\n");

  const versionValues = seedData.versions
    .map((version) => `  (
    ${sqlString(version.id)},
    ${sqlString(version.recipeId)},
    ${sqlNullable(version.versionNumber)},
    ${sqlNullable(version.baseWaterGrams)},
    ${sqlNullable(version.baseDoseGrams)},
    ${sqlNullable(version.targetTempC)},
    ${sqlString(version.grindLabel)},
    ${sqlString(version.notes)},
    ${equipmentArraySql(version.equipment)},
    ${sqlString(version.createdAt)}::timestamptz
  )`)
    .join(",\n");

  const stepValues = seedData.steps
    .map((step) => `  (
    ${sqlString(step.id)},
    ${sqlString(step.versionId)},
    ${sqlNullable(step.stepOrder)},
    ${sqlString(step.type)},
    ${sqlString(step.instruction)},
    ${sqlNullable(step.targetWaterGrams)},
    ${sqlNullable(step.durationSec)},
    ${sqlNullable(step.windowStartSec)},
    ${sqlNullable(step.windowEndSec)},
    ${sqlNullable(step.tips)}
  )`)
    .join(",\n");

  return `-- Generated by scripts/generate-seed-sql.mjs
-- Seed baseline brew cards from src/data/legacyCards.json

begin;

delete from public.recipe_steps where version_id like 'seed-%';
delete from public.recipe_versions where recipe_id like 'seed-%';
delete from public.recipes where id like 'seed-%';

insert into public.recipes (
  id,
  owner_id,
  slug,
  title,
  brewer,
  description,
  quote,
  cover_image_url,
  is_public,
  difficulty,
  brew_time_min,
  active_version_id,
  created_at,
  updated_at
)
values
${recipeValues}
on conflict (id) do update set
  slug = excluded.slug,
  title = excluded.title,
  brewer = excluded.brewer,
  description = excluded.description,
  quote = excluded.quote,
  cover_image_url = excluded.cover_image_url,
  is_public = excluded.is_public,
  difficulty = excluded.difficulty,
  brew_time_min = excluded.brew_time_min,
  active_version_id = excluded.active_version_id,
  updated_at = excluded.updated_at;

insert into public.recipe_versions (
  id,
  recipe_id,
  version_number,
  base_water_grams,
  base_dose_grams,
  target_temp_c,
  grind_label,
  notes,
  equipment,
  created_at
)
values
${versionValues}
on conflict (id) do update set
  recipe_id = excluded.recipe_id,
  version_number = excluded.version_number,
  base_water_grams = excluded.base_water_grams,
  base_dose_grams = excluded.base_dose_grams,
  target_temp_c = excluded.target_temp_c,
  grind_label = excluded.grind_label,
  notes = excluded.notes,
  equipment = excluded.equipment;

insert into public.recipe_steps (
  id,
  version_id,
  step_order,
  type,
  instruction,
  target_water_grams,
  duration_sec,
  window_start_sec,
  window_end_sec,
  tips
)
values
${stepValues}
on conflict (id) do update set
  version_id = excluded.version_id,
  step_order = excluded.step_order,
  type = excluded.type,
  instruction = excluded.instruction,
  target_water_grams = excluded.target_water_grams,
  duration_sec = excluded.duration_sec,
  window_start_sec = excluded.window_start_sec,
  window_end_sec = excluded.window_end_sec,
  tips = excluded.tips;

commit;
`;
}

function main() {
  const cards = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  const seedData = buildSeedData(cards);
  const sql = generateSql(seedData);

  if (process.argv.includes("--check")) {
    const current = fs.existsSync(targetPath) ? fs.readFileSync(targetPath, "utf8") : "";
    if (current !== sql) {
      console.error("seed.sql is out of date. Run: npm run seed:generate");
      process.exit(1);
    }

    console.log("seed.sql is up to date.");
    return;
  }

  fs.writeFileSync(targetPath, sql);
  console.log(`Wrote ${path.relative(projectRoot, targetPath)}`);
}

main();
