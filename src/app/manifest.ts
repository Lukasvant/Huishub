import type { MetadataRoute } from "next";

export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "HuisHub",
    short_name: "HuisHub",
    description: "Gedeelde taken, boodschappen en agenda.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f6f6f3",
    theme_color: "#51755c",
    lang: "nl-NL",
    icons: [
      {
        src: "/icons/icon.svg",
        sizes: "192x192",
        type: "image/svg+xml",
      },
      {
        src: "/icons/maskable.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
