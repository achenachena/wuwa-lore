import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wuwa Lore",
    short_name: "WuwaLore",
    description: "Wuthering Waves character archives and voice line analytics",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#18181b",
    icons: [],
  };
}
