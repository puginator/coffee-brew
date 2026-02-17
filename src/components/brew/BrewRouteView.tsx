"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BrewSessionPlayer } from "@/components/brew/BrewSessionPlayer";
import { getRecipeBySlug } from "@/lib/repository";
import shell from "@/styles/shell.module.css";
import type { Recipe } from "@/lib/types";

interface BrewRouteViewProps {
  slug: string;
}

export function BrewRouteView({ slug }: BrewRouteViewProps) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    void getRecipeBySlug(slug).then((data) => {
      if (ignore) return;
      setRecipe(data);
      setLoading(false);
    });

    return () => {
      ignore = true;
    };
  }, [slug]);

  if (loading) {
    return <p>Loading brew session...</p>;
  }

  if (!recipe) {
    return (
      <section className={shell.panel}>
        <h1>Recipe Missing</h1>
        <p>This recipe could not be loaded for brewing.</p>
        <Link href="/">Back to library</Link>
      </section>
    );
  }

  return (
    <section>
      <div className={shell.introPanel}>
        <h1 className={shell.pageTitle}>Guided Brew Session</h1>
        <p className={shell.pageSubtitle}>
          Adjust water and ratio, then follow each step with live timers and pour targets.
        </p>
        <div className={shell.chipRow}>
          <span className={shell.chip}>Live Scale Input</span>
          <span className={shell.chip}>Timer Cues</span>
          <span className={shell.chip}>Step-by-Step Coach</span>
        </div>
      </div>
      <div className={shell.sectionGap}>
        <BrewSessionPlayer recipe={recipe} />
      </div>
    </section>
  );
}
