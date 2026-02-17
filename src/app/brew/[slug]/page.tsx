import { BrewRouteView } from "@/components/brew/BrewRouteView";

export default async function BrewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <BrewRouteView slug={slug} />;
}
