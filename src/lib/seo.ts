import { OFFICIAL_SITE_URL } from "@/lib/config";
export function officialImage(value?: string | null): string { try { return new URL(value || "/img/og.png", OFFICIAL_SITE_URL).toString(); } catch { return `${OFFICIAL_SITE_URL}/img/og.png`; } }
export function officialPage(path: string): string { return new URL(path, OFFICIAL_SITE_URL).toString(); }
