import type { MetadataRoute } from "next";
import { OFFICIAL_SITE_URL } from "@/lib/config";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/", disallow: ["/painel", "/admin", "/entrar", "/cadastro", "/api", "/auth"] }, sitemap: `${OFFICIAL_SITE_URL}/sitemap.xml` };
}
