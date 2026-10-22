import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "AquaNest™ Water Refilling Station & Delivery",
    short_name: "AquaNest",
    description: "Pure Water. Happy Home. Order water refills and track delivery live.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F0F8FF",
    theme_color: "#0C6DB5",
    categories: ["food", "shopping", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Place Order", url: "/order", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Delivery Status", url: "/tracking", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Rider App", url: "/rider", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
