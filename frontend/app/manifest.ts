import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DuckVOD",
    short_name: "DuckVOD",
    description: "Archiv für Twitch-VODs und Livestreams der DuckSquad Community – mit gerendertem Echtzeit-Chat.",
    lang: "de",
    start_url: "/",
    display: "standalone",
    background_color: "#0d0c15",
    theme_color: "#7152f5",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
