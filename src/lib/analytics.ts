export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? "";
export type AnalyticsParams = Record<string, string | number | boolean | undefined>;
export function analyticsAllowed() { return typeof window !== "undefined" && window.localStorage.getItem("vivian.analytics.consent") === "granted"; }
export function isOfficialHost() { return typeof window !== "undefined" && (window.location.hostname === "viviantour.com.br" || window.location.hostname === "www.viviantour.com.br"); }
export function trackEvent(name: string, params: AnalyticsParams = {}) {
  if (!analyticsAllowed() || typeof window === "undefined" || typeof window.gtag !== "function" || !isOfficialHost()) return;
  window.gtag("event", name, Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined)));
}
declare global { interface Window { gtag?: (...args: unknown[]) => void; dataLayer?: unknown[]; } }
