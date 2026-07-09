import type { MetadataRoute } from "next";

const baseUrl = "https://juntas-seguras.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: baseUrl, changeFrequency: "monthly", priority: 1 },
    { url: `${baseUrl}/case-study`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/help`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/help/documentation`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${baseUrl}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/terms`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
