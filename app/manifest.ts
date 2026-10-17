import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MyBars",
    short_name: "MyBars",
    description: "Tus bares favoritos, valorados y descubiertos.",
    lang: "es",
    display: "standalone",
    start_url: "/bars",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
