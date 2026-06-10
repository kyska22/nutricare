import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NutriCare",
    short_name: "NutriCare",
    description: "Nutritional assessment platform",
    start_url: "/",
    display: "standalone",
    background_color: "#f3faf5",
    theme_color: "#247a4b",
    icons: [],
  };
}
