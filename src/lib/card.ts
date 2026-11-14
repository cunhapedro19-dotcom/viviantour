import type { Stay, Tour } from "./types";
import { formatBRL, formatDuration } from "./format";

export interface CardData {
  kind: "stay" | "tour";
  id: string;
  slug: string;
  name: string;
  label: string;
  location: string;
  priceLabel: string;
  rating: number;
  reviewsCount: number;
  images: string[];
  featured?: boolean;
}

export function stayToCard(s: Stay): CardData {
  return {
    kind: "stay",
    id: s.id,
    slug: s.slug,
    name: s.name,
    label: s.categoryLabel,
    location: `${s.neighborhood}, ${s.city}`,
    priceLabel: `${formatBRL(s.basePriceCents)} / noite`,
    rating: s.rating,
    reviewsCount: s.reviewsCount,
    images: s.images,
    featured: s.featured,
  };
}

export function tourToCard(t: Tour): CardData {
  return {
    kind: "tour",
    id: t.id,
    slug: t.slug,
    name: t.name,
    label: t.categoryLabel,
    location: `Arraial do Cabo · ${formatDuration(t.durationMinutes)}`,
    priceLabel: `${formatBRL(t.pricePerPersonCents)} / pessoa`,
    rating: t.rating,
    reviewsCount: t.reviewsCount,
    images: t.images,
    featured: t.featured,
  };
}
