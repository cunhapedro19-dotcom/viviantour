"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/EmptyState";
import { ListingCard } from "@/components/ListingCard";
import { stayToCard, tourToCard } from "@/lib/card";
import { DEMO_MODE } from "@/lib/config";
import { getStayById, getTourById } from "@/lib/demo-data";
import { listFavorites, type FavoriteEntry } from "@/lib/demo-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { CardData } from "@/lib/card";

export default function FavoritosPage() {
  const [cards, setCards] = useState<CardData[] | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (DEMO_MODE) {
        const favs = listFavorites();
        const result: CardData[] = [];
        for (const f of favs) {
          if (f.kind === "stay") {
            const s = getStayById(f.id);
            if (s) result.push(stayToCard(s));
          } else {
            const t = getTourById(f.id);
            if (t) result.push(tourToCard(t));
          }
        }
        if (active) setCards(result);
        return;
      }
      const sb = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await sb.auth.getUser();
      if (!user) {
        window.location.href = "/entrar?next=/favoritos";
        return;
      }
      const { data } = await sb
        .from("favorites")
        .select("property:properties(*, organization:organizations(name,slug), category:categories(label,slug), photos:property_photos(url,sort), amenities:property_amenities(amenity:amenities(label))), service:services(*, organization:organizations(name,slug), category:categories(label,slug))")
        .eq("profile_id", user.id);
      const result: CardData[] = [];
      for (const row of data ?? []) {
        const prop = (row as { property: unknown }).property as Record<string, unknown> | null;
        const serv = (row as { service: unknown }).service as Record<string, unknown> | null;
        if (prop && prop.id) {
          result.push(
            stayToCard({
              id: String(prop.id),
              slug: String(prop.slug),
              name: String(prop.name),
              summary: String(prop.summary ?? ""),
              description: String(prop.description ?? ""),
              categorySlug: String((prop.category as { slug?: string } | null)?.slug ?? ""),
              categoryLabel: String((prop.category as { label?: string } | null)?.label ?? "Hospedagem"),
              orgId: String(prop.org_id),
              orgName: String((prop.organization as { name?: string } | null)?.name ?? ""),
              orgSlug: String((prop.organization as { slug?: string } | null)?.slug ?? ""),
              neighborhood: String(prop.neighborhood ?? ""),
              city: String(prop.city ?? "Arraial do Cabo"),
              state: String(prop.state ?? "RJ"),
              capacity: Number(prop.capacity),
              bedrooms: Number(prop.bedrooms),
              bathrooms: Number(prop.bathrooms),
              basePriceCents: Number(prop.base_price_cents),
              cleaningFeeCents: Number(prop.cleaning_fee_cents ?? 0),
              minNights: Number(prop.min_nights ?? 1),
              rules: (prop.rules as string) ?? null,
              status: "published",
              rating: Number(prop.rating_avg ?? 0),
              reviewsCount: Number(prop.reviews_count ?? 0),
              images: [String((prop.photos as { url: string }[] | null)?.[0]?.url ?? `${prop.slug}-1`)],
              amenityLabels: [],
            })
          );
        }
        if (serv && serv.id) {
          result.push(
            tourToCard({
              id: String(serv.id),
              slug: String(serv.slug),
              name: String(serv.name),
              summary: String(serv.summary ?? ""),
              description: String(serv.description ?? ""),
              categorySlug: String((serv.category as { slug?: string } | null)?.slug ?? ""),
              categoryLabel: String((serv.category as { label?: string } | null)?.label ?? "Passeio"),
              kind: (serv.kind as "boat_tour") ?? "boat_tour",
              orgId: String(serv.org_id),
              orgName: String((serv.organization as { name?: string } | null)?.name ?? ""),
              orgSlug: String((serv.organization as { slug?: string } | null)?.slug ?? ""),
              durationMinutes: Number(serv.duration_minutes),
              meetingPoint: String(serv.meeting_point ?? ""),
              itinerary: [],
              included: [],
              pricePerPersonCents: Number(serv.price_per_person_cents),
              childPriceCents: null,
              minGuests: Number(serv.min_guests ?? 1),
              maxGuests: Number(serv.max_guests ?? 10),
              vesselName: null,
              status: "published",
              rating: Number(serv.rating_avg ?? 0),
              reviewsCount: Number(serv.reviews_count ?? 0),
              images: [`${serv.slug}-1`],
            })
          );
        }
      }
      if (active) setCards(result);
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="container-x py-10">
      <header className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-tinta">Favoritos</h1>
        <p className="mt-1 text-sm text-tinta-mute">Os anúncios que você salvou para voltar depois.</p>
      </header>

      {cards === null ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card h-72 animate-pulse" />
          ))}
        </div>
      ) : cards.length === 0 ? (
        <EmptyState
          title="Nenhum favorito ainda"
          description="Toque no coração dos anúncios que você amar para guardá-los aqui."
          actionHref="/buscar"
          actionLabel="Explorar Arraial"
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <ListingCard key={`${c.kind}-${c.id}`} data={c} />
          ))}
        </div>
      )}
    </div>
  );
}
