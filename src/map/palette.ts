/**
 * Map-reel palette: bold flat polity colours on a dark sea, in the style of popular
 * animated history maps. Colours are arbitrary identifiers, never modern flags.
 */
export const PALETTE = {
  sea: "#1d3a63",
  land: "#7b8656",
  shadow: "#3e4229",
  highlight: "#b9bf93",
  accent: "#5d6440",
  river: "#3f5fae",
  arrow: "#e2433b",
  arrowCasing: "#ffd9d2",
} as const;

/** One colour per polity id, stable across all episodes. */
export const POLITY_COLORS: Record<string, string> = {
  ahom: "#e07b2e",
  "mong-mao-polity": "#8a62c4",
  chutia: "#2f9c95",
  kachari: "#5e9a3a",
  koch: "#4a78c2",
  "koch-hajo": "#4a78c2",
  "bengal-sultanate": "#2e7d5b",
  mughal: "#2e7d5b",
  jaintia: "#b5527a",
  manipur: "#7b4fa8",
  burma: "#d4b13a",
  eic: "#b52b2b",
  moran: "#c9a227",
  borahi: "#c9a227",
  "naga-communities": "#3e8f63",
  moamoria: "#9b3d8a",
  bhutan: "#a0663a",
};

export const polityColor = (id: string) => POLITY_COLORS[id] ?? "#999999";
