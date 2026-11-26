"use client";
import Script from "next/script";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { GA_MEASUREMENT_ID } from "@/lib/analytics";
const CONSENT_KEY = "vivian.analytics.consent";
export function AnalyticsProvider() {
  const [consent, setConsent] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  useEffect(() => setConsent(window.localStorage.getItem(CONSENT_KEY)), []);
  useEffect(() => {
    if (consent !== "granted" || !GA_MEASUREMENT_ID) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || ((...args) => window.dataLayer?.push(args));
    window.gtag("js", new Date());
    window.gtag("consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", wait_for_update: 500 });
    window.gtag("consent", "update", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    window.gtag("config", GA_MEASUREMENT_ID, { anonymize_ip: true, send_page_view: false });
  }, [consent]);
  useEffect(() => { if (consent && window.gtag) window.gtag("consent", "update", { analytics_storage: consent === "granted" ? "granted" : "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" }); }, [consent]);
  useEffect(() => {
    if (consent !== "granted" || !ready || !pathname) return;
    const event = pathname.startsWith("/hospedagem/") ? "view_property" : pathname.startsWith("/passeio/") ? "view_tour" : pathname.startsWith("/combo/") ? "view_combo" : null;
    if (event) window.setTimeout(() => window.gtag?.("event", event, { page_path: pathname }), 0);
    const onClick = (e: MouseEvent) => { const target = e.target as HTMLElement; const link = target.closest<HTMLAnchorElement>("a[href^='https://wa.me/']"); if (link) window.gtag?.("event", "whatsapp_click", { link_origin: pathname }); };
    const onChange = (e: Event) => { const target = e.target as HTMLInputElement; if (target.type === "date") window.gtag?.("event", "select_dates", { page_path: pathname }); };
    document.addEventListener("click", onClick); document.addEventListener("change", onChange);
    return () => { document.removeEventListener("click", onClick); document.removeEventListener("change", onChange); };
  }, [consent, ready, pathname]);
  if (!GA_MEASUREMENT_ID || consent !== "granted") return null;
  return <>
    <Script id="vivian-ga4-init" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};window.gtag("js",new Date());window.gtag("consent","default",{analytics_storage:"denied",ad_storage:"denied",ad_user_data:"denied",ad_personalization:"denied",wait_for_update:500});window.gtag("config","${GA_MEASUREMENT_ID}",{anonymize_ip:true,send_page_view:false});`}</Script>
    <Script id="vivian-ga4" strategy="afterInteractive" src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} onLoad={() => { window.gtag?.("consent", "update", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" }); setReady(true); }} />
  </>;
}
export function CookieConsent() {
  const [visible, setVisible] = useState(false);
  useEffect(() => setVisible(!window.localStorage.getItem(CONSENT_KEY)), []);
  if (!visible) return <button type="button" className="fixed bottom-3 right-3 z-40 rounded-full border border-areia-300 bg-white px-3 py-2 text-xs text-tinta-soft shadow" onClick={() => setVisible(true)}>Preferências de cookies</button>;
  const save = (value: "granted" | "denied") => { window.localStorage.setItem(CONSENT_KEY, value); if (value === "denied") { document.cookie.split(";").forEach((cookie) => { const name = cookie.split("=")[0]?.trim(); if (name?.startsWith("_ga")) document.cookie = `${name}=; Max-Age=0; path=/`; }); } setVisible(false); };
  return <aside className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-3xl rounded-2xl border border-areia-300 bg-white p-4 shadow-xl" aria-label="Preferências de cookies"><p className="text-sm text-tinta">Usamos cookies analíticos opcionais para entender a navegação e melhorar o site. Eles não são necessários para consultar anúncios ou falar pelo WhatsApp.</p><div className="mt-3 flex flex-wrap justify-end gap-2"><button className="btn-ghost btn-sm" onClick={() => save("denied")}>Recusar</button><button className="btn-turquesa btn-sm" onClick={() => save("granted")}>Aceitar cookies analíticos</button></div></aside>;
}
