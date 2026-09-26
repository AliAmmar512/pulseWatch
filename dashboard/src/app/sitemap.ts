import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://your-domain.com",
      lastModified: new Date(),
      priority: 1,
    },
    {
      url: "https://your-domain.com/login",
      lastModified: new Date(),
      priority: 0.5,
    },
    {
      url: "https://your-domain.com/signup",
      lastModified: new Date(),
      priority: 0.8,
    },
  ];
}