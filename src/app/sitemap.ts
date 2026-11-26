import type { MetadataRoute } from "next";
import { OFFICIAL_SITE_URL } from "@/lib/config";
import { searchListings } from "@/lib/queries";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = ["/", "/buscar?tipo=stay", "/buscar?tipo=tour", "/combos", "/sobre", "/anuncie"];
  const urls: MetadataRoute.Sitemap = paths.map((path) => ({ url: `${OFFICIAL_SITE_URL}${path}`, changeFrequency: "daily", priority: path === "/" ? 1 : 0.7 }));
  const listings = await searchListings({});
  for (const stay of listings.stays) urls.push({ url: `${OFFICIAL_SITE_URL}/hospedagem/${stay.slug}`, changeFrequency: "daily", priority: 0.8 });
  for (const tour of listings.tours) urls.push({ url: `${OFFICIAL_SITE_URL}/passeio/${tour.slug}`, changeFrequency: "daily", priority: 0.8 });
  return urls;
}
