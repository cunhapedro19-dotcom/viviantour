import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import { OFFICIAL_SITE_URL, SITE } from "@/lib/config";
import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(OFFICIAL_SITE_URL),
  alternates: { canonical: "/" },
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description:
    "O marketplace de turismo de Arraial do Cabo: hospedagens, passeios de barco, mergulho e experiências inesquecíveis, de fornecedores locais verificados.",
  openGraph: {
    title: `${SITE.name} — ${SITE.tagline}`,
    description:
      "Hospedagens, passeios de barco, mergulho e experiências em Arraial do Cabo, de fornecedores locais verificados.",
    url: OFFICIAL_SITE_URL,
    images: [{ url: `${OFFICIAL_SITE_URL}/img/og.png`, alt: SITE.name }],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    images: [`${OFFICIAL_SITE_URL}/img/og.png`],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
