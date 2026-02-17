"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { nanoid } from "nanoid";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuthState } from "@/components/auth/useAuthState";
import { presetImageOptions } from "@/lib/data/legacy";
import {
  createDraftRecipe,
  createOrGetShareLink,
  getRecipeById,
  publishRecipe,
  saveRecipeDraft,
} from "@/lib/repository";
import { getBrowserSupabaseClient } from "@/lib/supabase/client";
import styles from "@/styles/form.module.css";
import shell from "@/styles/shell.module.css";
import studio from "@/styles/studio.module.css";
import type { BrewStepType, Recipe, RecipeStep } from "@/lib/types";

interface RecipeEditorProps {
  recipeId?: string;
  createMode?: boolean;
}

const stepTemplates: Array<{ label: string; type: BrewStepType; instruction: string }> = [
  { label: "Prep", type: "prep", instruction: "Heat water and prep brewer." },
  { label: "Pour", type: "pour", instruction: "Pour water to target grams." },
  { label: "Wait", type: "wait", instruction: "Let coffee drain and settle." },
  { label: "Stir", type: "stir", instruction: "Stir gently to even extraction." },
  { label: "Press", type: "press", instruction: "Press slowly and evenly." },
  { label: "Serve", type: "serve", instruction: "Serve immediately." },
];

function reorderSteps(steps: RecipeStep[]): RecipeStep[] {
  return steps.map((step, index) => ({ ...step, stepOrder: index }));
}

export function RecipeEditor({ recipeId, createMode = false }: RecipeEditorProps) {
  const router = useRouter();
  const { user, isLoading, isSupabaseEnabled } = useAuthState();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isLoading) return;

    const currentUser = user;

    if (!currentUser) {
      setLoading(false);
      return;
    }
    const currentUserId = currentUser.id;

    let ignore = false;

    async function load() {
      if (createMode) {
        const draft = await createDraftRecipe(currentUserId);
        if (!ignore) {
          setRecipe(draft);
          setLoading(false);
          router.replace(`/studio/${draft.id}/edit`);
        }
        return;
      }

      if (!recipeId) {
        setLoading(false);
        return;
      }

      const found = await getRecipeById(recipeId);
      if (!ignore) {
        setRecipe(found);
        setLoading(false);
      }
    }

    void load();

    return () => {
      ignore = true;
    };
  }, [createMode, isLoading, recipeId, router, user]);

  const activeVersion = useMemo(
    () => recipe?.versions.find((version) => version.id === recipe.activeVersionId) ?? recipe?.versions[0],
    [recipe],
  );

  function updateRecipe(partial: Partial<Recipe>) {
    setRecipe((prev) => (prev ? { ...prev, ...partial, updatedAt: new Date().toISOString() } : prev));
  }

  function updateVersionStep(nextSteps: RecipeStep[]) {
    setRecipe((prev) => {
      if (!prev) return prev;
      const nextVersions = prev.versions.map((version) =>
        version.id === prev.activeVersionId
          ? {
              ...version,
              steps: reorderSteps(nextSteps),
            }
          : version,
      );

      return {
        ...prev,
        versions: nextVersions,
        brewTimeMin: Math.max(
          1,
          Math.round(
            (nextSteps.reduce((sum, step) => sum + (step.durationSec ?? 30), 0) || 180) / 60,
          ),
        ),
      };
    });
  }

  function updateVersionField<K extends keyof NonNullable<typeof activeVersion>>(
    key: K,
    value: NonNullable<typeof activeVersion>[K],
  ) {
    setRecipe((prev) => {
      if (!prev || !activeVersion) return prev;
      const nextVersions = prev.versions.map((version) =>
        version.id === activeVersion.id ? { ...version, [key]: value } : version,
      );
      return { ...prev, versions: nextVersions, updatedAt: new Date().toISOString() };
    });
  }

  async function uploadCustomImage(file: File) {
    if (!user) return;

    const supabase = getBrowserSupabaseClient();
    if (!supabase || !isSupabaseEnabled) {
      setMessage("Supabase storage not configured. Use preset images in local mode.");
      return;
    }

    const filename = `${user.id}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const { error } = await supabase.storage.from("recipe-images").upload(filename, file, {
      cacheControl: "3600",
      upsert: false,
    });

    if (error) {
      setMessage("Image upload failed.");
      return;
    }

    const { data } = supabase.storage.from("recipe-images").getPublicUrl(filename);
    updateRecipe({ coverImageUrl: data.publicUrl });
    setMessage("Cover image uploaded.");
  }

  async function handleSave() {
    if (!recipe || !user) return;
    setIsSaving(true);

    const saved = await saveRecipeDraft(recipe, user.id);
    setRecipe(saved);
    setIsSaving(false);
    setMessage("Recipe saved.");
  }

  async function handlePublish() {
    if (!recipe || !user) return;
    setIsSaving(true);
    const published = await publishRecipe(recipe.id, user.id);
    setIsSaving(false);
    if (!published) {
      setMessage("Publish failed.");
      return;
    }

    setRecipe(published);
    const link = await createOrGetShareLink(published.id, user.id);
    if (link) {
      const url = `${window.location.origin}/share/${link.token}`;
      setShareUrl(url);
      try {
        await navigator.clipboard.writeText(url);
        setMessage(`Published. Share URL copied: ${url}`);
      } catch {
        setMessage(`Published. Share URL: ${url}`);
      }
    } else {
      setMessage("Published, but share URL could not be generated.");
    }
  }

  function addTemplateStep(type: BrewStepType) {
    if (!activeVersion || !recipe) return;

    const template = stepTemplates.find((entry) => entry.type === type) ?? stepTemplates[0];
    const newStep: RecipeStep = {
      id: `${activeVersion.id}-${nanoid(6)}`,
      versionId: activeVersion.id,
      stepOrder: activeVersion.steps.length,
      type,
      instruction: template.instruction,
      targetWaterGrams: type === "pour" ? activeVersion.baseWaterGrams : null,
      durationSec: type === "wait" ? 30 : null,
      windowStartSec: null,
      windowEndSec: null,
      tips: null,
    };

    updateVersionStep([...activeVersion.steps, newStep]);
  }

  if (isLoading || loading) {
    return <p>Loading editor...</p>;
  }

  if (!user) {
    return <AuthGate title="Sign in to create and share cards" subtitle="Magic link auth unlocks studio editing and publishing." />;
  }

  if (!recipe || !activeVersion) {
    return <p>Recipe draft could not be loaded.</p>;
  }

  return (
    <section>
      <div className={studio.toolbar}>
        <button
          className={studio.toolbarGhost}
          type="button"
          data-testid="save-draft-button"
          onClick={handleSave}
          disabled={isSaving}
        >
          Save Draft
        </button>
        <button
          className={studio.toolbarPrimary}
          type="button"
          data-testid="publish-share-button"
          onClick={handlePublish}
          disabled={isSaving}
        >
          Publish + Copy Share URL
        </button>
        <Link className={studio.toolbarGhost} data-testid="view-card-link" href={`/recipes/${recipe.slug}`}>View Card</Link>
        <Link className={studio.toolbarGhost} href={`/brew/${recipe.slug}`}>Test Brew</Link>
      </div>
      {message ? <p data-testid="editor-message" className={studio.statusMessage}>{message}</p> : null}
      {shareUrl ? <p data-testid="editor-share-url" className={shell.bannerSuccess}>{shareUrl}</p> : null}

      <div className={studio.layout}>
        <article className={styles.formSection}>
          <h2>Card Settings</h2>
          <div className={styles.formGrid}>
            <label>
              Title
              <input
                data-testid="recipe-title-input"
                value={recipe.title}
                onChange={(event) => updateRecipe({ title: event.target.value })}
              />
            </label>
            <label>
              Brewer
              <input
                value={recipe.brewer}
                onChange={(event) => updateRecipe({ brewer: event.target.value })}
              />
            </label>
            <label>
              Slug
              <input
                data-testid="recipe-slug-input"
                value={recipe.slug}
                onChange={(event) => updateRecipe({ slug: event.target.value.toLowerCase().replace(/\s+/g, "-") })}
              />
            </label>
            <label>
              Difficulty
              <select
                value={recipe.difficulty}
                onChange={(event) => updateRecipe({ difficulty: event.target.value as Recipe["difficulty"] })}
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Advanced">Advanced</option>
              </select>
            </label>
            <label>
              Brew Time (min)
              <input
                type="number"
                min={1}
                value={recipe.brewTimeMin}
                onChange={(event) => updateRecipe({ brewTimeMin: Number(event.target.value) })}
              />
            </label>
            <label>
              Water (g)
              <input
                type="number"
                min={100}
                value={activeVersion.baseWaterGrams}
                onChange={(event) => updateVersionField("baseWaterGrams", Number(event.target.value))}
              />
            </label>
            <label>
              Dose (g)
              <input
                type="number"
                min={1}
                value={activeVersion.baseDoseGrams}
                onChange={(event) => updateVersionField("baseDoseGrams", Number(event.target.value))}
              />
            </label>
            <label>
              Temp (C)
              <input
                type="number"
                min={70}
                max={100}
                value={activeVersion.targetTempC}
                onChange={(event) => updateVersionField("targetTempC", Number(event.target.value))}
              />
            </label>
            <label>
              Grind
              <input
                value={activeVersion.grindLabel}
                onChange={(event) => updateVersionField("grindLabel", event.target.value)}
              />
            </label>
          </div>

          <label>
            Description
            <textarea
              rows={3}
              value={recipe.description}
              onChange={(event) => updateRecipe({ description: event.target.value })}
            />
          </label>
          <label>
            Quote
            <textarea
              rows={2}
              value={recipe.quote}
              onChange={(event) => updateRecipe({ quote: event.target.value })}
            />
          </label>

          <div className={styles.formGrid}>
            <label>
              Preset Image
              <select
                value={recipe.coverImageUrl}
                onChange={(event) => updateRecipe({ coverImageUrl: event.target.value })}
              >
                {presetImageOptions.map((option) => (
                  <option value={option} key={option}>
                    {option.split("/").at(-1)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Upload Custom Cover
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event: ChangeEvent<HTMLInputElement>) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    void uploadCustomImage(file);
                  }
                }}
              />
            </label>
          </div>
        </article>

        <aside className={studio.previewCard}>
          <div className={studio.previewImage}>
            <Image src={recipe.coverImageUrl} alt={recipe.title} fill sizes="(max-width: 900px) 90vw, 320px" />
          </div>
          <div className={studio.previewBody}>
            <h3>{recipe.title}</h3>
            <p>{recipe.description}</p>
            <p>
              {activeVersion.baseWaterGrams}g water / {activeVersion.baseDoseGrams}g dose / {activeVersion.targetTempC}
              °C
            </p>
          </div>
        </aside>
      </div>

      <article className={styles.formSection}>
        <h2>Step Specs</h2>
        <div className={styles.row}>
          {stepTemplates.map((template) => (
            <button
              key={template.type}
              type="button"
              data-testid={`add-step-${template.type}`}
              onClick={() => addTemplateStep(template.type)}
            >
              Add {template.label}
            </button>
          ))}
        </div>

        <div className={styles.stepList}>
          {activeVersion.steps.map((step, index) => (
            <div className={styles.stepItem} key={step.id}>
              <h4>
                Step {index + 1} · {step.type.toUpperCase()}
              </h4>
              <div className={styles.formGrid}>
                <label>
                  Step Type
                  <select
                    value={step.type}
                    onChange={(event) => {
                      const next = [...activeVersion.steps];
                      next[index] = {
                        ...next[index],
                        type: event.target.value as BrewStepType,
                      };
                      updateVersionStep(next);
                    }}
                  >
                    {stepTemplates.map((template) => (
                      <option key={template.type} value={template.type}>
                        {template.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Water Target (g)
                  <input
                    className={styles.inlineInput}
                    type="number"
                    min={0}
                    value={step.targetWaterGrams ?? ""}
                    onChange={(event) => {
                      const next = [...activeVersion.steps];
                      next[index] = {
                        ...next[index],
                        targetWaterGrams: event.target.value ? Number(event.target.value) : null,
                      };
                      updateVersionStep(next);
                    }}
                  />
                </label>
                <label>
                  Duration (sec)
                  <input
                    className={styles.inlineInput}
                    type="number"
                    min={0}
                    value={step.durationSec ?? ""}
                    onChange={(event) => {
                      const next = [...activeVersion.steps];
                      next[index] = {
                        ...next[index],
                        durationSec: event.target.value ? Number(event.target.value) : null,
                      };
                      updateVersionStep(next);
                    }}
                  />
                </label>
              </div>

              <label>
                Instruction
                <textarea
                  rows={2}
                  value={step.instruction}
                  onChange={(event) => {
                    const next = [...activeVersion.steps];
                    next[index] = { ...next[index], instruction: event.target.value };
                    updateVersionStep(next);
                  }}
                />
              </label>

              <label>
                Tips
                <input
                  value={step.tips ?? ""}
                  onChange={(event) => {
                    const next = [...activeVersion.steps];
                    next[index] = {
                      ...next[index],
                      tips: event.target.value ? event.target.value : null,
                    };
                    updateVersionStep(next);
                  }}
                />
              </label>

              <div className={styles.row}>
                <button
                  type="button"
                  onClick={() => {
                    if (index === 0) return;
                    const next = [...activeVersion.steps];
                    const current = next[index];
                    next[index] = next[index - 1];
                    next[index - 1] = current;
                    updateVersionStep(next);
                  }}
                >
                  Move Up
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (index === activeVersion.steps.length - 1) return;
                    const next = [...activeVersion.steps];
                    const current = next[index];
                    next[index] = next[index + 1];
                    next[index + 1] = current;
                    updateVersionStep(next);
                  }}
                >
                  Move Down
                </button>
                <button
                  type="button"
                  className={styles.warning}
                  onClick={() => {
                    const next = activeVersion.steps.filter((candidate) => candidate.id !== step.id);
                    updateVersionStep(next);
                  }}
                  disabled={activeVersion.steps.length <= 1}
                >
                  Delete Step
                </button>
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
