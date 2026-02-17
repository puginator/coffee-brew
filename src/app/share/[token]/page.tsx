import { SharedRecipeView } from "@/components/shared/SharedRecipeView";

export default async function SharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SharedRecipeView token={token} />;
}
