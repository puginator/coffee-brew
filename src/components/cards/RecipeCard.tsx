"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import styles from "@/styles/cards.module.css";
import { formatSeconds } from "@/lib/brew/format";
import type { Recipe } from "@/lib/types";

interface RecipeCardProps {
  recipe: Recipe;
  index: number;
}

export function RecipeCard({ recipe, index }: RecipeCardProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const activeVersion = useMemo(
    () => recipe.versions.find((version) => version.id === recipe.activeVersionId) ?? recipe.versions[0],
    [recipe],
  );
  const seedShareHref = recipe.id.startsWith("seed-") ? `/share/seed-${recipe.slug}` : `/recipes/${recipe.slug}`;

  return (
    <motion.article
      className={styles.cardWrap}
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.045, duration: 0.35, ease: "easeOut" }}
    >
      <div className={styles.card} data-flipped={isFlipped}>
        <section className={styles.face}>
          <header className={styles.cardHeader}>
            <span className={styles.seriesLabel}>Brew League</span>
            <span className={styles.cardNumber}>#{String(index + 1).padStart(2, "0")}</span>
          </header>
          <div className={styles.frontTop}>
            <Image src={recipe.coverImageUrl} alt={recipe.title} fill sizes="(max-width: 800px) 90vw, 300px" />
            <span className={styles.methodRibbon}>{recipe.brewer}</span>
          </div>
          <div className={styles.frontBody}>
            <h3>{recipe.title}</h3>
            <p className={styles.deckCopy}>{recipe.description}</p>
            <div className={styles.statStrip}>
              <div className={styles.statCell}>
                <span className={styles.statLabel}>TIME</span>
                <strong className={styles.statValue}>{recipe.brewTimeMin} min</strong>
              </div>
              <div className={styles.statCell}>
                <span className={styles.statLabel}>WATER</span>
                <strong className={styles.statValue}>{activeVersion.baseWaterGrams}g</strong>
              </div>
              <div className={styles.statCell}>
                <span className={styles.statLabel}>DOSE</span>
                <strong className={styles.statValue}>{activeVersion.baseDoseGrams}g</strong>
              </div>
            </div>
            <div className={styles.cardActions}>
              <Link className={styles.actionPrimary} href={`/recipes/${recipe.slug}`}>Card</Link>
              <Link className={styles.actionGhost} href={`/brew/${recipe.slug}`}>Brew</Link>
              <button className={styles.actionSubtle} type="button" onClick={() => setIsFlipped(true)}>
                Specs
              </button>
            </div>
          </div>
          <footer className={styles.cardFoot}>
            <span>{recipe.difficulty}</span>
            <span>{activeVersion.steps.length} steps</span>
          </footer>
        </section>

        <section className={`${styles.face} ${styles.back}`}>
          <header className={styles.cardHeader}>
            <span className={styles.seriesLabel}>Step Sheet</span>
            <span className={styles.cardNumber}>{recipe.difficulty}</span>
          </header>
          <h3>{recipe.title}</h3>
          <p className={styles.deckCopy}>Follow these brew checkpoints in order.</p>
          <ol className={styles.stepPreview}>
            {activeVersion.steps.slice(0, 5).map((step) => (
              <li key={step.id}>
                {step.instruction}
                {step.durationSec ? ` (${formatSeconds(step.durationSec)})` : ""}
              </li>
            ))}
          </ol>
          <div className={styles.cardActions}>
            <Link className={styles.actionPrimary} href={seedShareHref}>Share</Link>
            <button className={styles.actionGhost} type="button" onClick={() => setIsFlipped(false)}>
              Back
            </button>
            <Link className={styles.actionSubtle} href={`/brew/${recipe.slug}`}>Start</Link>
          </div>
        </section>
      </div>
    </motion.article>
  );
}
