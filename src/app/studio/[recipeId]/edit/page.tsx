import { RecipeEditor } from "@/components/studio/RecipeEditor";

export default async function StudioEditPage({
  params,
}: {
  params: Promise<{ recipeId: string }>;
}) {
  const { recipeId } = await params;
  return <RecipeEditor recipeId={recipeId} />;
}
