import type { MetadataRoute } from "next";

const baseUrl = "https://sparras-funko-pop-up-shop.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: baseUrl,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/marvel`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/disney`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/starwars`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/dc`,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/anime`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/games`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/movies`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/television`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/sports`,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/rocks`,
      changeFrequency: "daily",
      priority: 0.8,
    },
  ];
}
