"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGate } from "@/components/auth/AuthGate";
import { useAuthState } from "@/components/auth/useAuthState";
import {
  createOrGetShareLink,
  listRecipesByOwner,
  publishRecipe,
  revokeShareLink,
} from "@/lib/repository";
import shell from "@/styles/shell.module.css";
import studio from "@/styles/studio.module.css";
import type { Recipe } from "@/lib/types";

export function StudioDashboard() {
  const { user, isLoading } = useAuthState();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    let ignore = false;

    void listRecipesByOwner(user.id).then((items) => {
      if (ignore) return;
      setRecipes(items);
      setLoading(false);
    });

    return () => {
      ignore = true;
    };
  }, [isLoading, user]);

  if (loading) {
    return <p>Loading studio...</p>;
  }

  if (!user) {
    return (
      <AuthGate
        title="Sign in to manage your brew cards"
        subtitle="Create drafts, publish share links, and remix recipes into your own profile."
      />
    );
  }

  return (
    <section>
      <div className={shell.introPanel}>
        <h1 className={shell.pageTitle}>My Recipe Studio</h1>
        <p className={shell.pageSubtitle}>
          Build and iterate on brew cards, then publish a shareable link for anyone to brew from.
        </p>
      </div>
      <div className={studio.toolbar}>
        <Link data-testid="create-new-card-link" className={studio.toolbarPrimary} href="/studio/new">Create New Card</Link>
      </div>
      {message ? <p data-testid="studio-message" className={studio.statusMessage}>{message}</p> : null}

      <div className={studio.dashGrid}>
        {recipes.map((recipe) => (
          <article key={recipe.id} className={studio.dashCard} data-testid={`studio-recipe-${recipe.id}`}>
            <h3>{recipe.title}</h3>
            <p>{recipe.description}</p>
            <p>
              Status: <strong>{recipe.isPublic ? "Published" : "Draft"}</strong>
            </p>
            <div className={studio.toolbar}>
              <Link className={studio.toolbarGhost} href={`/studio/${recipe.id}/edit`}>Edit</Link>
              <Link className={studio.toolbarGhost} href={`/brew/${recipe.slug}`}>Test Brew</Link>
              <button
                data-testid={`publish-share-${recipe.id}`}
                className={studio.toolbarPrimary}
                type="button"
                onClick={async () => {
                  const published = await publishRecipe(recipe.id, user.id);
                  if (!published) {
                    setMessage("Publish failed.");
                    return;
                  }

                  const link = await createOrGetShareLink(recipe.id, user.id);
                  if (!link) {
                    setMessage("Published, but no share link was created.");
                    return;
                  }

                  const url = `${window.location.origin}/share/${link.token}`;
                  try {
                    await navigator.clipboard.writeText(url);
                    setMessage(`Share URL copied: ${url}`);
                  } catch {
                    setMessage(`Share URL: ${url}`);
                  }

                  const updated = await listRecipesByOwner(user.id);
                  setRecipes(updated);
                }}
              >
                Publish + Share
              </button>
              <button
                data-testid={`revoke-share-${recipe.id}`}
                type="button"
                className={studio.toolbarGhost}
                onClick={async () => {
                  const link = await createOrGetShareLink(recipe.id, user.id);
                  if (!link) {
                    setMessage("No active share link to revoke.");
                    return;
                  }
                  await revokeShareLink(link.token, user.id);
                  setMessage("Share link revoked.");
                }}
              >
                Revoke Share
              </button>
            </div>
          </article>
        ))}
        {!recipes.length ? (
          <article className={studio.dashCard}>
            <h3>No recipes yet</h3>
            <p>Create your first custom card in the studio.</p>
          </article>
        ) : null}
      </div>
    </section>
  );
}
