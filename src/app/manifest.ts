import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Extrack — Personal finance tracker",
    short_name: "Extrack",
    description: "Track wallets, expenses, savings and debt in one clear dashboard.",
    // No locale prefix: the proxy redirects to the visitor's locale, and to /login when signed out.
    start_url: "/dashboard",
    id: "/",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1c3a5e",
    icons: [
      { src: "/pwa-icon/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
