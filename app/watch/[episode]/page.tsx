import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { builtEpisodes, loadEpisode } from "@/data/load";
import Player from "@/ui/Player";

export function generateStaticParams() {
  return builtEpisodes().map((n) => ({ episode: String(n) }));
}

export async function generateMetadata({ params }: { params: Promise<{ episode: string }> }): Promise<Metadata> {
  const { episode } = await params;
  const b = loadEpisode(Number(episode));
  return { title: b ? `Ep. ${b.script.episode}: ${b.script.title}` : "Episode" };
}

export default async function WatchPage({
  params,
  searchParams,
}: {
  params: Promise<{ episode: string }>;
  searchParams: Promise<{ format?: string; present?: string; render?: string }>;
}) {
  const { episode } = await params;
  const sp = await searchParams;
  const bundle = loadEpisode(Number(episode));
  if (!bundle) notFound();
  return <Player bundle={bundle} initialFormat={sp.format === "9x16" || sp.format === "16x9" ? sp.format : undefined} initialPresentation={sp.present === "1"} renderMode={sp.render === "1"} />;
}
