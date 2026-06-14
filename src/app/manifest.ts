import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FIRA",
    short_name: "FIRA",
    description: "Fil International Recruitment Agency — Connecting Filipino Talent to the World.",
    start_url: "/",
    display: "standalone",
    background_color: "#0033A0",
    theme_color: "#0033A0",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/favicon.ico",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
