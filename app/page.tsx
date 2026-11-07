import Link from "next/link";
import { listEpisodes } from "@/data/load";

export default function Home() {
  const episodes = listEpisodes();
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <p className="text-xs uppercase tracking-[0.3em] text-accent">Animated map documentary</p>
      <h1 className="mt-2 font-serif text-4xl leading-tight sm:text-5xl">The Ahom Kingdom, 1228–1826</h1>
      <p className="mt-4 max-w-2xl text-ink-dim">
        Every event on these maps cites a source and a page. Approximate places, routes and areas are drawn as approximate.
        Occupations are shown separately from annexations, and no modern borders are used.
      </p>

      <ol className="mt-8 divide-y divide-chrome-line rounded-xl border border-chrome-line bg-chrome-2/40">
        {episodes.map((e) => (
          <li key={e.number} className="flex flex-wrap items-center gap-3 px-4 py-3">
            <span className="w-8 font-serif text-xl text-ink-dim">{e.number === 13 ? "Ep." : e.number}</span>
            <div className="min-w-0 flex-1">
              <div className="font-serif text-lg">{e.title}</div>
              <div className="text-xs text-ink-dim">{e.eventCount} sourced events</div>
            </div>
            {e.built ? (
              <div className="flex gap-2">
                <Link className="btn" href={`/watch/${e.number}`}>Reel 9:16</Link>
                <Link className="btn" href={`/watch/${e.number}?format=16x9`}>16:9</Link>
              </div>
            ) : (
              <span className="rounded border border-chrome-line px-2 py-1 text-xs text-ink-dim">Researched; not yet animated</span>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-8 flex flex-wrap gap-3 text-sm">
        <Link className="btn" href="/present">iPad presenter remote</Link>
      </div>
      <p className="mt-6 text-xs text-ink-dim">
        Rivers © OpenStreetMap contributors (ODbL). Land: Natural Earth. Terrain: AWS Terrain Tiles (SRTM and others). Map rendering: MapLibre GL JS.
      </p>
    </main>
  );
}
