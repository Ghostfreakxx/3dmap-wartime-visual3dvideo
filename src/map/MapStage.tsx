"use client";

import { useEffect, useRef } from "react";
import { Map as MLMap, Marker, setWorkerUrl, type ExpressionSpecification, type GeoJSONSource, type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Beat, EpisodeBundle, LngLat } from "@/domain/episode";
import type { Place } from "@/domain/types";
import { kmToPxAtZoom0, pointAlong, routeLine, routeProgressAt } from "./geo";
import { PALETTE, polityColor } from "./palette";

export interface LayerState {
  terrain: boolean;
  rivers: boolean;
  places: boolean;
  zones: boolean;
  routes: boolean;
  units: boolean;
}

export const DEFAULT_LAYERS: LayerState = { terrain: true, rivers: true, places: true, zones: true, routes: true, units: true };

interface Props {
  bundle: EpisodeBundle;
  beatIndex: number;
  localT: number; // 0..1 within the beat
  layers: LayerState;
  vertical: boolean;
  manual: boolean;
  speed: number;
  onReady?: (map: MLMap) => void;
}

const EMPTY: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] };
const DEM_TILES = ["/tiles/terrarium/{z}/{x}/{y}.png"];
/** Must match the outer bbox in scripts/fetch-terrain.mjs so no tiles are requested outside it. */
const DEM_BOUNDS: [number, number, number, number] = [76, 10, 110, 36];

const progressGradient = (p: number, color: string): ExpressionSpecification => {
  if (p <= 0.0005) return ["interpolate", ["linear"], ["line-progress"], 0, "rgba(0,0,0,0)", 1, "rgba(0,0,0,0)"];
  if (p >= 0.9995) return ["interpolate", ["linear"], ["line-progress"], 0, color, 1, color];
  return ["step", ["line-progress"], color, p, "rgba(0,0,0,0)"];
};

function baseStyle(routeIds: string[]): StyleSpecification {
  const routeLayers = routeIds.flatMap((id) => [
    {
      id: `route-${id}-casing`, type: "line", source: `route-${id}`,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-width": ["interpolate", ["linear"], ["zoom"], 4, 7, 9, 12], "line-gradient": progressGradient(0, PALETTE.arrowCasing) },
    },
    {
      id: `route-${id}-core`, type: "line", source: `route-${id}`,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: { "line-width": ["interpolate", ["linear"], ["zoom"], 4, 4, 9, 7], "line-gradient": progressGradient(0, PALETTE.arrow) },
    },
  ]);
  return {
    version: 8,
    sources: {
      land: { type: "geojson", data: "/geo/land.geojson" },
      rivers: { type: "geojson", data: "/geo/rivers.geojson" },
      dem: { type: "raster-dem", tiles: DEM_TILES, tileSize: 256, maxzoom: 8, encoding: "terrarium", bounds: DEM_BOUNDS },
      zones: { type: "geojson", data: EMPTY },
      ...Object.fromEntries(routeIds.map((id) => [`route-${id}`, { type: "geojson", data: EMPTY, lineMetrics: true }])),
    },
    layers: [
      { id: "sea", type: "background", paint: { "background-color": PALETTE.sea } },
      { id: "land", type: "fill", source: "land", paint: { "fill-color": PALETTE.land } },
      {
        id: "hillshade", type: "hillshade", source: "dem",
        paint: {
          "hillshade-exaggeration": 0.35,
          "hillshade-shadow-color": PALETTE.shadow,
          "hillshade-highlight-color": PALETTE.highlight,
          "hillshade-accent-color": PALETTE.accent,
        },
      },
      {
        id: "zones", type: "circle", source: "zones",
        paint: {
          "circle-color": ["get", "color"],
          "circle-opacity": 0.78,
          "circle-blur": 0.32,
          "circle-radius": ["interpolate", ["exponential", 2], ["zoom"], 0, ["get", "r0"], 22, ["*", ["get", "r0"], 4194304]],
        },
      },
      {
        id: "rivers", type: "line", source: "rivers",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": PALETTE.river,
          "line-width": ["interpolate", ["linear"], ["zoom"], 4, ["match", ["get", "rank"], 1, 1.8, 2, 1, 0.6], 9, ["match", ["get", "rank"], 1, 4, 2, 2.2, 1.4]],
        },
      },
      ...routeLayers,
    ],
  } as unknown as StyleSpecification;
}

/** MapLibre writes inline opacity on the marker root, so visibility is toggled on an inner element. */
function wrap(inner: HTMLElement) {
  const root = document.createElement("div");
  root.appendChild(inner);
  return root;
}

const shortName = (p: Place) => p.name.replace(/\s*\(.*\)/, "");

function cityEl(p: Place) {
  const el = document.createElement("div");
  el.className = "city";
  el.dataset.approx = String(p.precision === "regional");
  el.innerHTML = `<span class="city-name">${shortName(p)}</span><span class="city-dot"></span>`;
  return el;
}

function unitEl(color: string) {
  const el = document.createElement("div");
  el.className = "unit";
  el.innerHTML = `<div class="unit-label"></div><div class="unit-row"><span class="unit-banner" style="background:${color}"></span><span class="unit-count"></span></div><span class="unit-pole"></span>`;
  return el;
}

export default function MapStage({ bundle, beatIndex, localT, layers, vertical, manual, speed, onReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const readyRef = useRef(false);
  const queue = useRef<Array<() => void>>([]);
  const cities = useRef<Record<string, HTMLElement>>({});
  const units = useRef<Record<string, { marker: Marker; el: HTMLElement }>>({});
  const arrowHeads = useRef<Record<string, Marker>>({});
  const floods = useRef<Marker[]>([]);
  const lines = useRef<Record<string, LngLat[]>>({});
  const lastP = useRef<Record<string, number>>({});
  const { script, places } = bundle;
  const beat: Beat = script.beats[beatIndex];
  const routeIds = Object.keys(script.routes);
  const whenReady = (fn: () => void) => (readyRef.current ? fn() : queue.current.push(fn));

  // ---- init once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    setWorkerUrl("/vendor/maplibre/maplibre-gl-worker.mjs");
    const c = script.beats[0].camera;
    const map = new MLMap({
      container: containerRef.current,
      style: baseStyle(routeIds),
      center: c.center,
      zoom: c.zoom - (vertical ? 0.5 : 0),
      attributionControl: false,
      pitchWithRotate: false,
      dragRotate: false,
      fadeDuration: 0,
    });
    mapRef.current = map;

    for (const p of Object.values(places)) {
      if (!p.coord || p.precision === "unidentified") continue;
      const el = cityEl(p);
      new Marker({ element: wrap(el), anchor: "bottom", offset: [0, 5] }).setLngLat(p.coord).addTo(map);
      cities.current[p.id] = el;
    }
    for (const id of routeIds) {
      const head = document.createElement("div");
      head.className = "arrow-head";
      arrowHeads.current[id] = new Marker({ element: wrap(head), anchor: "center", rotationAlignment: "map" }).setLngLat([0, 0]).addTo(map);
    }

    map.on("load", () => {
      for (const id of routeIds) {
        const line = routeLine(script, id, places);
        lines.current[id] = line;
        (map.getSource(`route-${id}`) as GeoJSONSource).setData({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: line } });
      }
      readyRef.current = true;
      queue.current.splice(0).forEach((fn) => fn());
      onReady?.(map);
    });

    const ro = new ResizeObserver(() => map.resize());
    ro.observe(containerRef.current);
    return () => {
      ro.disconnect();
      map.remove();
      mapRef.current = null;
      readyRef.current = false;
      cities.current = {};
      units.current = {};
      arrowHeads.current = {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    [map.dragPan, map.scrollZoom, map.boxZoom, map.keyboard, map.doubleClickZoom, map.touchZoomRotate].forEach((h) => (manual ? h.enable() : h.disable()));
  }, [manual]);

  // ---- camera: flat, top-down
  useEffect(() => {
    const map = mapRef.current;
    if (!map || manual) return;
    whenReady(() => {
      const c = beat.camera;
      const v = vertical ? beat.vertical ?? { center: c.center, zoom: c.zoom - 0.5 } : { center: c.center, zoom: c.zoom };
      // keep the action in the clear band between the headline and the legend/caption
      const { clientWidth: w, clientHeight: h } = map.getContainer();
      const padding = vertical
        ? { top: h * 0.2, bottom: h * 0.4, left: w * 0.04, right: w * 0.14 }
        : { top: h * 0.22, bottom: h * 0.12, left: w * 0.22, right: w * 0.04 };
      map.flyTo({ center: v.center, zoom: v.zoom, pitch: 0, bearing: 0, padding, duration: (c.flyMs ?? 2500) / speed, curve: 1.2, essential: true });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beatIndex, vertical, manual]);

  // ---- per-beat: cities, zones, units, floods
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    whenReady(() => {
      const s = beat.show;
      const shown = new Set([...(s.cities ?? []), ...(s.capital ? [s.capital] : [])]);
      for (const [id, el] of Object.entries(cities.current)) {
        el.classList.toggle("is-visible", layers.places && shown.has(id));
        el.classList.toggle("is-capital", s.capital === id);
      }
      const zones = (s.zones ?? [])
        .filter((z) => places[z.placeId]?.coord)
        .map((z) => {
          const c = places[z.placeId].coord!;
          return { type: "Feature" as const, properties: { color: polityColor(z.polity), r0: kmToPxAtZoom0(z.radiusKm, c[1]) }, geometry: { type: "Point" as const, coordinates: c } };
        });
      (map.getSource("zones") as GeoJSONSource | undefined)?.setData({ type: "FeatureCollection", features: zones });

      const wanted = new Set((s.units ?? []).map((u) => u.id));
      for (const [id, u] of Object.entries(units.current)) {
        if (!wanted.has(id) || !layers.units) {
          u.marker.remove();
          delete units.current[id];
        }
      }
      if (layers.units) {
        for (const u of s.units ?? []) {
          let entry = units.current[u.id];
          if (!entry) {
            const el = unitEl(polityColor(u.polity));
            const marker = new Marker({ element: wrap(el), anchor: "bottom" }).setLngLat(places[u.at]?.coord ?? beat.camera.center).addTo(map);
            entry = units.current[u.id] = { marker, el };
          }
          (entry.el.querySelector(".unit-label") as HTMLElement).textContent = u.label;
          (entry.el.querySelector(".unit-count") as HTMLElement).textContent = u.count ? `${u.count}${u.countNote ? "*" : ""}` : "";
          (entry.el.querySelector(".unit-banner") as HTMLElement).style.background = polityColor(u.polity);
          if (!u.at.startsWith("route:") && places[u.at]?.coord) entry.marker.setLngLat(places[u.at].coord!);
        }
      }

      floods.current.forEach((m) => m.remove());
      floods.current = (s.flood ?? [])
        .filter((id) => places[id]?.coord)
        .map((id) => {
          const el = document.createElement("div");
          el.className = "flood-ripple";
          return new Marker({ element: wrap(el), anchor: "center" }).setLngLat(places[id].coord!).addTo(map);
        });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat, layers.places, layers.units]);

  // ---- layer toggles
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    whenReady(() => {
      const vis = (on: boolean) => (on ? "visible" : "none");
      map.setLayoutProperty("hillshade", "visibility", vis(layers.terrain));
      map.setLayoutProperty("rivers", "visibility", vis(layers.rivers));
      map.setLayoutProperty("zones", "visibility", vis(layers.zones));
      for (const id of routeIds) {
        const on = layers.routes && beat.show.route?.id === id;
        map.setLayoutProperty(`route-${id}-casing`, "visibility", vis(on));
        map.setLayoutProperty(`route-${id}-core`, "visibility", vis(on));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layers, beat]);

  // ---- arrows and moving units (every frame)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    const prog = routeProgressAt(script, beatIndex, localT);
    for (const id of routeIds) {
      const p = prog[id] ?? 0;
      if (Math.abs((lastP.current[id] ?? -1) - p) > 0.0008) {
        map.setPaintProperty(`route-${id}-casing`, "line-gradient", progressGradient(p, PALETTE.arrowCasing));
        map.setPaintProperty(`route-${id}-core`, "line-gradient", progressGradient(p, PALETTE.arrow));
        lastP.current[id] = p;
      }
      const line = lines.current[id] ?? [];
      const head = arrowHeads.current[id];
      if (head && line.length > 1) {
        const tip = pointAlong(line, p);
        const back = pointAlong(line, Math.max(0, p - 0.02));
        const a = map.project(back), b = map.project(tip);
        const deg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + 90;
        head.setLngLat(tip).setRotation(deg);
        (head.getElement().firstElementChild as HTMLElement).classList.toggle("is-visible", layers.routes && beat.show.route?.id === id && p > 0.01);
      }
      for (const u of beat.show.units ?? []) {
        if (u.at === `route:${id}` && units.current[u.id] && line.length > 1) units.current[u.id].marker.setLngLat(pointAlong(line, Math.max(p, 0.001)));
      }
    }
  }, [script, beatIndex, localT, beat, routeIds, layers.routes]);

  return (
    <div className="absolute inset-0" role="img" aria-label={`Map: ${beat.subtitle}`}>
      {/* MapLibre forces position:relative on its container, so it must not carry the absolute inset itself */}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
