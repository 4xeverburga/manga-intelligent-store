import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return [
    { url: base, lastModified: new Date(), priority: 1 },
    { url: `${base}/catalogue`, lastModified: new Date(), priority: 0.9 },
    { url: `${base}/app`, lastModified: new Date(), priority: 0.8 },
    { url: `${base}/checkout`, lastModified: new Date(), priority: 0.5 },
  ];
}
