"use client";

import { useEffect, useMemo, useState } from "react";
import { listPublicRecipes } from "@/lib/repository";
import { RecipeCard } from "@/components/cards/RecipeCard";
import styles from "@/styles/cards.module.css";
import shell from "@/styles/shell.module.css";
import type { Recipe } from "@/lib/types";

export function RecipeLibraryView() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;

    void listPublicRecipes().then((items) => {
      if (ignore) return;
      setRecipes(items);
      setLoading(false);
    });

    return () => {
      ignore = true;
    };
  }, []);

  const filtered = useMemo(
    () => recipes.filter((recipe) => recipe.title.toLowerCase().includes(query.toLowerCase().trim())),
    [query, recipes],
  );

  return (
    <section>
      <div className={shell.introPanel}>
        <h1 className={shell.pageTitle}>Brew Card Library</h1>
        <p className={shell.pageSubtitle}>
          Browse a cleaner trading-card style deck, open any recipe card, then run the guided brew flow step by step.
        </p>
        <div className={shell.chipRow}>
          <span className={shell.chip}>{recipes.length} Cards</span>
          <span className={shell.chip}>Deck View</span>
        </div>
      </div>

      <div className={shell.sectionGap}>
        <div className={shell.searchWrap}>
          <input
            className={shell.searchInput}
            aria-label="Search brew cards"
            placeholder="Search card title"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      </div>

      <section className={shell.sectionGap}>
        {loading ? <p>Loading cards...</p> : null}
        {!loading && !filtered.length ? (
          <div className={styles.emptyState}>No cards matched your search. Try a different brew method.</div>
        ) : null}
        <div className={styles.grid}>
          {filtered.map((recipe, index) => (
            <RecipeCard key={recipe.id} recipe={recipe} index={index} />
          ))}
        </div>
      </section>
    </section>
  );
}
