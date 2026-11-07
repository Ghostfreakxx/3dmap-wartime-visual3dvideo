import "server-only";
import eventsJson from "@data/chronology/events.json";
import gazetteerJson from "@data/gazetteer/places.json";
import registryJson from "@data/sources/registry.json";
import ep02 from "@data/episodes/ep02.json";
import type { EpisodeBundle, EpisodeScript } from "@/domain/episode";
import type { HistoricalEvent, Place, Polity, SourceRecord } from "@/domain/types";

const SCRIPTS: Record<number, EpisodeScript> = {
  2: ep02 as unknown as EpisodeScript,
};

const allEvents = (eventsJson as unknown as { events: HistoricalEvent[] }).events;
const episodeMeta = (eventsJson as unknown as {
  episodes: Array<{ number: number; title: string; range: { start: string; end: string } }>;
}).episodes;
const places = (gazetteerJson as unknown as { places: Place[] }).places;
const polities = (gazetteerJson as unknown as { polities: Polity[] }).polities;
const sources = (registryJson as unknown as { sources: SourceRecord[] }).sources;

export const builtEpisodes = () => Object.keys(SCRIPTS).map(Number);

export function listEpisodes() {
  return episodeMeta.map((e) => ({
    ...e,
    eventCount: allEvents.filter((x) => x.episode === e.number).length,
    built: e.number in SCRIPTS,
  }));
}

const byId = <T extends { id: string }>(xs: T[], ids: Iterable<string>) => {
  const want = new Set(ids);
  return Object.fromEntries(xs.filter((x) => want.has(x.id)).map((x) => [x.id, x]));
};

export function loadEpisode(n: number): EpisodeBundle | null {
  const script = SCRIPTS[n];
  if (!script) return null;

  const eventIds = new Set(script.beats.map((b) => b.eventId).filter((x): x is string => !!x));
  const events = byId(allEvents, eventIds);

  const placeIds = new Set<string>();
  const polityIds = new Set<string>(script.legend.map((l) => l.polity));
  for (const b of script.beats) {
    const s = b.show;
    [...(s.cities ?? []), ...(s.flood ?? []), ...(s.capital ? [s.capital] : [])].forEach((p) => placeIds.add(p));
    (s.zones ?? []).forEach((z) => { placeIds.add(z.placeId); polityIds.add(z.polity); });
    (s.units ?? []).forEach((u) => { polityIds.add(u.polity); if (!u.at.startsWith("route:")) placeIds.add(u.at); });
  }
  Object.values(script.routes).forEach((r) => r.via.forEach((p) => placeIds.add(p)));
  Object.values(events).forEach((e) => e.locations.forEach((p) => placeIds.add(p)));

  const sourceIds = new Set<string>();
  Object.values(events).forEach((e) => e.sourceRefs.forEach((r) => sourceIds.add(r.sourceId)));
  sourceIds.add("gait1906");

  Object.values(events).forEach((e) => e.participants.forEach((p) => polityIds.add(p)));

  const timeline = allEvents
    .map((e) => ({ id: e.id, episode: e.episode, title: e.title, year: Number((e.date.start ?? "").slice(0, 4)) }))
    .filter((e) => Number.isFinite(e.year) && e.year > 0);

  return {
    script,
    events,
    places: byId(places, placeIds),
    polities: byId(polities, polityIds),
    sources: byId(sources, sourceIds),
    timeline,
    episodeTitles: episodeMeta.map(({ number, title, range }) => ({ number, title, range })),
  };
}
