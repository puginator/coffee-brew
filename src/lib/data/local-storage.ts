import { STORAGE_KEYS } from "@/lib/config";
import type { Recipe, ShareLink } from "@/lib/types";

function canUseStorage(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function safeParse<T>(input: string | null, fallback: T): T {
  if (!input) return fallback;

  try {
    return JSON.parse(input) as T;
  } catch {
    return fallback;
  }
}

export function loadCustomRecipes(): Recipe[] {
  if (!canUseStorage()) return [];
  return safeParse<Recipe[]>(window.localStorage.getItem(STORAGE_KEYS.recipes), []);
}

export function saveCustomRecipes(recipes: Recipe[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEYS.recipes, JSON.stringify(recipes));
}

export function loadShareLinks(): ShareLink[] {
  if (!canUseStorage()) return [];
  return safeParse<ShareLink[]>(window.localStorage.getItem(STORAGE_KEYS.shares), []);
}

export function saveShareLinks(links: ShareLink[]): void {
  if (!canUseStorage()) return;
  window.localStorage.setItem(STORAGE_KEYS.shares, JSON.stringify(links));
}
