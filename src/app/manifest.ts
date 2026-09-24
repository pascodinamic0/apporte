import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Apporte",
    short_name: "Apporte",
    description:
      "Apporte — On te l’apporte. Commande nourriture et trouvailles à Kinshasa.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#047857",
    lang: "fr",
    icons: [
      {
        src: "/icons/apporte.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
      {
        src: "/icons/apporte.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
  };
}

