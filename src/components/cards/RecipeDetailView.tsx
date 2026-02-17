"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthState } from "@/components/auth/useAuthState";
import {
  createOrGetShareLink,
  getRecipeBySlug,
  remixRecipe,
  saveRecipeDraft,
} from "@/lib/repository";
import { formatSeconds } from "@/lib/brew/format";
import styles from "@/styles/cards.module.css";
import shell from "@/styles/shell.module.css";
import type { Recipe } from "@/lib/types";

interface RecipeDetailViewProps {
  slug: string;
}

export function RecipeDetailView({ slug }: RecipeDetailViewProps) {
  const router = useRouter();
  const { user } = useAuthState();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let ignore = false;
    void getRecipeBySlug(slug).then((data) => {
      if (ignore) return;
      setRecipe(data);
      setIsLoading(false);
    });

    return () => {
      ignore = true;
    };
  }, [slug]);

  const activeVersion = useMemo(
    () => recipe?.versions.find((version) => version.id === recipe.activeVersionId) ?? recipe?.versions[0],
    [recipe],
  );

  async function handleRemix() {
    if (!recipe || !user) {
      setMessage("Sign in to remix this recipe into your studio.");
      return;
    }

    const remixed = await remixRecipe(recipe, user.id);
    router.push(`/studio/${remixed.id}/edit`);
  }

  async function handlePublishAndShare() {
    if (!recipe || !user || recipe.ownerId !== user.id) {
      setMessage("Only the owner can publish and share this recipe.");
      return;
    }

    const published = await saveRecipeDraft({ ...recipe, isPublic: true }, user.id);
    const link = await createOrGetShareLink(published.id, user.id);
    if (!link) {
      setMessage("Share link creation failed.");
      return;
    }

    const url = `${window.location.origin}/share/${link.token}`;
    setShareUrl(url);
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Share URL copied to clipboard.");
    } catch {
      setMessage("Share URL ready.");
    }
    setRecipe(published);
  }

  if (isLoading) {
    return <p>Loading recipe card...</p>;
  }

  if (!recipe || !activeVersion) {
    return <p>Recipe not found.</p>;
  }

  return (
    <section>
      <div className={shell.introPanel}>
        <h1 className={shell.pageTitle}>Recipe Card</h1>
        <p className={shell.pageSubtitle}>
          Review the full step timeline, then launch a guided brew session with live pour and timer checkpoints.
        </p>
      </div>

      <div className={`${shell.sectionGap} ${styles.hero}`}>
        <article className={styles.heroCard}>
          <div className={styles.heroImage}>
            <Image src={recipe.coverImageUrl} alt={recipe.title} fill sizes="(max-width: 900px) 90vw, 340px" />
          </div>
          <div className={styles.heroBody}>
            <h1>{recipe.title}</h1>
            <div className={styles.heroMeta}>
              <span className={styles.stat}>{recipe.brewer}</span>
              <span className={styles.stat}>{recipe.difficulty}</span>
              <span className={styles.stat}>{recipe.brewTimeMin} min</span>
              <span className={styles.stat}>{activeVersion.baseWaterGrams}g water</span>
              <span className={styles.stat}>{activeVersion.baseDoseGrams}g dose</span>
            </div>
            <p className={styles.quote}>{recipe.quote}</p>

            <div className={styles.cardActions}>
              <Link className={styles.actionPrimary} href={`/brew/${recipe.slug}`}>
                Start Guided Brew
              </Link>
              <button className={styles.actionGhost} data-testid="detail-remix-button" type="button" onClick={handleRemix}>
                Remix Card
              </button>
              {recipe.ownerId && user?.id === recipe.ownerId ? (
                <button
                  className={styles.actionSubtle}
                  data-testid="detail-publish-share-button"
                  type="button"
                  onClick={handlePublishAndShare}
                >
                  Publish + Share
                </button>
              ) : null}
            </div>

            {message ? <p data-testid="detail-message" className={styles.statusMessage}>{message}</p> : null}
            {shareUrl ? <p data-testid="detail-share-url" className={styles.statusShare}>{shareUrl}</p> : null}
          </div>
        </article>

        <article className={shell.panel}>
          <h2>Step Timeline</h2>
          <div className={styles.timeline}>
            {activeVersion.steps.map((step, index) => (
              <div key={step.id} className={styles.timelineItem}>
                <h4>
                  {index + 1}. {step.type.toUpperCase()}
                </h4>
                <p>{step.instruction}</p>
                <div className={styles.statRow}>
                  {typeof step.targetWaterGrams === "number" ? (
                    <span className={styles.stat}>{step.targetWaterGrams}g target</span>
                  ) : null}
                  {typeof step.durationSec === "number" ? (
                    <span className={styles.stat}>{formatSeconds(step.durationSec)}</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}
