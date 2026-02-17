"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuthState } from "@/components/auth/useAuthState";
import { getRecipeByShareToken, remixRecipeFromShareToken } from "@/lib/repository";
import { formatSeconds } from "@/lib/brew/format";
import cards from "@/styles/cards.module.css";
import shell from "@/styles/shell.module.css";
import type { Recipe } from "@/lib/types";

interface SharedRecipeViewProps {
  token: string;
}

export function SharedRecipeView({ token }: SharedRecipeViewProps) {
  const router = useRouter();
  const { user } = useAuthState();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let ignore = false;
    void getRecipeByShareToken(token).then((data) => {
      if (ignore) return;
      setRecipe(data);
      setLoading(false);
    });

    return () => {
      ignore = true;
    };
  }, [token]);

  const activeVersion = useMemo(
    () => recipe?.versions.find((version) => version.id === recipe.activeVersionId) ?? recipe?.versions[0],
    [recipe],
  );

  async function handleRemix() {
    if (!user) {
      setMessage("Sign in to remix this brew card.");
      return;
    }

    const remixed = await remixRecipeFromShareToken(token, user.id);
    if (!remixed) {
      setMessage("Remix failed.");
      return;
    }

    router.push(`/studio/${remixed.id}/edit`);
  }

  if (loading) {
    return <p>Loading shared brew card...</p>;
  }

  if (!recipe || !activeVersion) {
    return (
      <section className={shell.panel}>
        <h1>Recipe not available</h1>
        <p>The shared link is invalid or has been revoked.</p>
      </section>
    );
  }

  return (
    <section>
      <div className={shell.introPanel}>
        <h1 className={shell.pageTitle}>Shared Brew Card</h1>
        <p className={shell.pageSubtitle}>View-only recipe card. Start brewing now or remix it into your studio.</p>
        <div className={shell.chipRow}>
          <span className={shell.chip}>Public Snapshot</span>
          <span className={shell.chip}>{activeVersion.steps.length} Steps</span>
          <span className={shell.chip}>Remix Available</span>
        </div>
      </div>

      <div className={`${shell.sectionGap} ${cards.hero}`}>
        <article className={cards.heroCard}>
          <div className={cards.heroImage}>
            <Image src={recipe.coverImageUrl} alt={recipe.title} fill sizes="(max-width: 900px) 90vw, 600px" />
          </div>
          <div className={cards.heroBody}>
            <h2>{recipe.title}</h2>
            <div className={cards.statRow}>
              <span className={cards.stat}>{recipe.brewer}</span>
              <span className={cards.stat}>{recipe.brewTimeMin} min</span>
              <span className={cards.stat}>{activeVersion.baseWaterGrams}g water</span>
              <span className={cards.stat}>{activeVersion.baseDoseGrams}g dose</span>
            </div>
            <p className={cards.quote}>{recipe.quote}</p>

            <div className={cards.cardActions}>
              <Link className={cards.actionPrimary} href={`/brew/${recipe.slug}`}>
                Start Brew
              </Link>
              <button className={cards.actionGhost} data-testid="share-remix-button" type="button" onClick={handleRemix}>
                Remix Into My Studio
              </button>
            </div>
            {message ? <p data-testid="share-message" className={cards.statusMessage}>{message}</p> : null}
          </div>
        </article>

        <article className={shell.panel}>
          <h2>Published Steps</h2>
          <div className={cards.timeline}>
            {activeVersion.steps.slice(0, 8).map((step, index) => (
              <div key={step.id} className={cards.timelineItem}>
                <h4>
                  {index + 1}. {step.type.toUpperCase()}
                </h4>
                <p>{step.instruction}</p>
                <div className={cards.statRow}>
                  {typeof step.targetWaterGrams === "number" ? (
                    <span className={cards.stat}>{step.targetWaterGrams}g target</span>
                  ) : null}
                  {typeof step.durationSec === "number" ? (
                    <span className={cards.stat}>{formatSeconds(step.durationSec)}</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>

      {!user ? (
        <div className={shell.sectionGap}>
          <AuthGate
            title="Want to remix this card?"
            subtitle="Sign in to duplicate this recipe and customize your own step-by-step specs."
          />
        </div>
      ) : null}
    </section>
  );
}
