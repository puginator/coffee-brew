import { RecipeDetailView } from "@/components/cards/RecipeDetailView";

export default async function RecipePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <RecipeDetailView slug={slug} />;
}
