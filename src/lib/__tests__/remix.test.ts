import { beforeEach, describe, expect, it } from "vitest";
import { buildSeedRecipes } from "@/lib/data/legacy";
import { remixRecipe } from "@/lib/repository";

beforeEach(() => {
  window.localStorage.clear();
});

describe("remixRecipe", () => {
  it("creates a new owner-scoped draft copy", async () => {
    const seed = buildSeedRecipes()[0];
    const remixed = await remixRecipe(seed, "test-user-1");

    expect(remixed.id).not.toBe(seed.id);
    expect(remixed.ownerId).toBe("test-user-1");
    expect(remixed.isPublic).toBe(false);
    expect(remixed.title).toContain("Remix");
    expect(remixed.versions[0].steps.length).toBeGreaterThan(0);
  });
});
