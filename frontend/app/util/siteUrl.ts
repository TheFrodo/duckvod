import { headers } from "next/headers";

// Resolve the public base URL of the site for SEO metadata, robots.txt and sitemap.xml.
// Uses the SITE_URL env variable if set, otherwise falls back to the request host.
export async function getSiteUrl(): Promise<string> {
  const configured = process.env.SITE_URL;
  if (configured) return configured.replace(/\/+$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
