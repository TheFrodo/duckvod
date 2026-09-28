import type { MetadataRoute } from "next";
import { getSiteUrl } from "./util/siteUrl";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = await getSiteUrl();
  const now = new Date();

  return [
    { url: `${siteUrl}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/channels`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/videos`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${siteUrl}/impressum`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${siteUrl}/datenschutz`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
