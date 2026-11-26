import { DemoBanner } from "@/components/site/DemoBanner";
import { Footer } from "@/components/site/Footer";
import { Header } from "@/components/site/Header";
import { AnalyticsProvider, CookieConsent } from "@/components/analytics/AnalyticsProvider";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <DemoBanner />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <AnalyticsProvider />
      <CookieConsent />
    </div>
  );
}
