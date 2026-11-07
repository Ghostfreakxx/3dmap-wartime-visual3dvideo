import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ahom Kingdom Map Documentary",
    short_name: "Ahom Map",
    description: "Source-first animated historical map of the Ahom Kingdom (1228–1826).",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#16130f",
    theme_color: "#16130f",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
