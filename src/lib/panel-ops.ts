"use client";

import { normalizeCalendarUrl } from "./calendar-url";

// ============================================================================
// OPERAÇÕES DO PAINEL — funciona nos dois modos:
//  · Demonstração: grava no demo-store (localStorage)
//  · Supabase: usa o cliente do navegador + RLS + RPCs
// ============================================================================

import { DEMO_MODE } from "./config";
import { demoStays, demoTours, getDemoDepartures } from "./demo-data";
import {
  addCreatedDeparture,
  addCreatedStay,
  addCreatedTour,
  addExternalCalendar as addExternalCalendarToStore,
  addManualBlock,
  createPayment,
  getBooking,
  getCreatedStay,
  getCreatedTour,
  getPaymentByBooking,
  listBookings,
  listCreatedDepartures,
  listCreatedStays,
  listCreatedTours,
  removeExternalCalendar,
  removeManualBlock,
  setCreatedDepartureStatus,
  updateBookingStatus,
  updateCreatedStay,
  updateCreatedTour,
} from "./demo-store";
import { slugify } from "./format";
import { getSupabaseBrowserClient } from "./supabase/client";
import type {
  Booking,
  DemoUser,
  Departure,
  ExternalCalendarView,
  ListingStatus,
  NewStayInput,
  NewTourInput,
  PaymentStatus,
  PropertyBlock,
  Stay,
  Tour,
  TourKind,
} from "./types";

type Result = { ok: true } | { ok: false; error: string };

// ---------------------------------------------------------------------------
// RESERVAS
// ---------------------------------------------------------------------------
export async function respondBooking(id: string, accept: boolean, reason?: string): Promise<Result> {
  if (DEMO_MODE) {
    // espelha a RPC respond_booking (migração 0002): aceitar gera cobrança
    updateBookingStatus(id, accept ? "awaiting_payment" : "declined", reason);
    if (accept) {
      const booking = getBooking(id);
      if (booking && !getPaymentByBooking(id)) {
        createPayment({
          id: `pay-${Date.now()}`,
          bookingId: id,
          status: "pending",
          method: null,
          provider: "demo",
          providerRef: null,
          amountCents: booking.totalCents,
          createdAt: new Date().toISOString(),
        });
      }
    }
    return { ok: true };
  }
  const sb = getSupabaseBrowserClient();
  const { error } = await sb.rpc("respond_booking", {
    p_booking_id: id,
    p_action: accept ? "accept" : "decline",
    p_reason: reason ?? null,
  });
  if (error) {
    return { ok: false, error: friendly(error.message) };
  }
  return { ok: true };
}

export async function cancelBookingAsProvider(id: string, reason?: string): Promise<Result> {
  if (DEMO_MODE) {
    updateBookingStatus(id, "cancelled", reason);
    return { ok: true };
  }
  const sb = getSupabaseBrowserClient();
  const { error } = await sb.rpc("cancel_booking", {
    p_booking_id: id,
    p_reason: reason ?? null,
  });
  if (error) {
    return { ok: false, error: friendly(error.message) };
  }
  return { ok: true };
}

export async function markBookingPaid(id: string): Promise<Result> {
  if (DEMO_MODE) {
    updateBookingStatus(id, "confirmed");
    return { ok: true };
  }
  const { error } = await getSupabaseBrowserClient().rpc("mark_booking_paid", { p_booking_id: id });
  return error ? { ok: false, error: friendly(error.message) } : { ok: true };
}

function friendly(message: string): string {
  if (message.includes("NOT_AVAILABLE")) return "As datas do período já não estão mais disponíveis.";
  if (message.includes("NO_SEATS")) return "As vagas desta saída acabaram de esgotar.";
  if (message.includes("INVALID_STATUS")) return "Esta reserva já foi processada.";
  if (message.includes("DEPARTURE_UNAVAILABLE")) return "A saída não está mais disponível.";
  if (message.includes("FORBIDDEN")) return "Você não tem permissão para esta ação.";
  return "Não foi possível concluir a operação. Tente novamente.";
}

export async function fetchOrgBookings(orgId: string): Promise<Booking[]> {
  if (DEMO_MODE) {
    return listBookings()
      .filter((b) => b.orgId === orgId)
      .map((b) => {
        const p = getPaymentByBooking(b.id);
        return { ...b, paymentStatus: p?.status ?? null, paymentMethod: p?.method ?? null };
      });
  }
  const sb = getSupabaseBrowserClient();
  const { data } = await sb
    .from("bookings")
    .select(
      "*, customer:profiles!bookings_customer_id_fkey(full_name,phone), property:properties(name,slug), service:services(name,slug), payments(status, method)"
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((b: Record<string, unknown>) => {
    const pay = ((b.payments as { status?: string; method?: string }[] | null) ?? [])[0];
    return {
      id: String(b.id),
      code: String(b.code),
      kind: b.kind as "stay" | "tour",
      itemId: String(b.property_id ?? b.service_id ?? ""),
      itemSlug: String((b.property as { slug?: string } | null)?.slug ?? (b.service as { slug?: string } | null)?.slug ?? ""),
      itemName: String((b.property as { name?: string } | null)?.name ?? (b.service as { name?: string } | null)?.name ?? "Reserva"),
      orgId: String(b.org_id),
      orgName: "",
      status: b.status as Booking["status"],
      checkIn: (b.check_in as string) ?? null,
      checkOut: (b.check_out as string) ?? null,
      nights: (b.nights as number) ?? null,
      startsAt: (b.starts_at as string) ?? null,
      endsAt: (b.ends_at as string) ?? null,
      adults: Number(b.adults),
      children: Number(b.children),
      guestsTotal: Number(b.guests_total),
      totalCents: Number(b.total_cents),
      commissionCents: Number(b.commission_cents),
      netCents: Number(b.net_cents),
      customerName: String((b.customer as { full_name?: string } | null)?.full_name ?? "Cliente"),
      contactPhone: String((b.contact_phone as string | null) ?? (b.customer as { phone?: string } | null)?.phone ?? "") || null,
      customerNote: (b.customer_note as string) ?? null,
      cancellationReason: (b.cancellation_reason as string) ?? null,
      paymentStatus: (pay?.status as PaymentStatus) ?? null,
      paymentMethod: pay?.method ?? null,
      createdAt: String(b.created_at),
    };
  });
}

// ---------------------------------------------------------------------------
// ANÚNCIOS — HOSPEDAGENS
// ---------------------------------------------------------------------------
export async function fetchOrgStays(orgId: string): Promise<Stay[]> {
  if (DEMO_MODE) {
    return [...listCreatedStays().filter((s) => s.orgId === orgId), ...demoStays.filter((s) => s.orgId === orgId)];
  }
  const sb = getSupabaseBrowserClient();
  const { data } = await sb
    .from("properties")
    .select(
      "*, organization:organizations(id,name,slug), category:categories(id,slug,label), photos:property_photos(url,sort), amenities:property_amenities(amenity:amenities(label))"
    )
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row: Record<string, unknown>) => {
    const photos = ((row.photos as { url: string; sort?: number }[] | null) ?? []).slice().sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
    return {
      id: String(row.id),
      slug: String(row.slug),
      name: String(row.name),
      summary: String(row.summary ?? ""),
      description: String(row.description ?? ""),
      categorySlug: String((row.category as { slug?: string } | null)?.slug ?? ""),
      categoryLabel: String((row.category as { label?: string } | null)?.label ?? "Hospedagem"),
      orgId: String(row.org_id),
      orgName: String((row.organization as { name?: string } | null)?.name ?? ""),
      orgSlug: String((row.organization as { slug?: string } | null)?.slug ?? ""),
      neighborhood: String(row.neighborhood ?? ""),
      city: String(row.city ?? "Arraial do Cabo"),
      state: String(row.state ?? "RJ"),
      capacity: Number(row.capacity),
      bedrooms: Number(row.bedrooms),
      bathrooms: Number(row.bathrooms),
      basePriceCents: Number(row.base_price_cents),
      weekendPriceCents: (row.weekend_price_cents as number) ?? null,
      cleaningFeeCents: Number(row.cleaning_fee_cents ?? 0),
      minNights: Number(row.min_nights ?? 1),
      showPublicPrices: Boolean(row.show_public_prices),
      rules: (row.rules as string) ?? null,
      status: row.status as Stay["status"],
      rating: Number(row.rating_avg ?? 0),
      reviewsCount: Number(row.reviews_count ?? 0),
      images: photos.length ? photos.map((p) => p.url) : [`${row.slug}-1`],
      amenityLabels: ((row.amenities as { amenity?: { label?: string } }[] | null) ?? [])
        .map((pa) => pa?.amenity?.label ?? "")
        .filter(Boolean),
    } satisfies Stay;
  });
}

export async function fetchStayById(id: string): Promise<Stay | null> {
  if (DEMO_MODE) {
    return getCreatedStay(id) ?? demoStays.find((s) => s.id === id) ?? null;
  }
  const sb = getSupabaseBrowserClient();
  const { data: row } = await sb
    .from("properties")
    .select("*, category:categories(id,slug,label), photos:property_photos(url,sort)")
    .eq("id", id)
    .maybeSingle();
  if (!row) return null;
  const photos = ((row.photos as { url: string; sort?: number }[] | null) ?? []).slice().sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    summary: String(row.summary ?? ""),
    description: String(row.description ?? ""),
    categorySlug: String((row.category as { slug?: string } | null)?.slug ?? ""),
    categoryLabel: String((row.category as { label?: string } | null)?.label ?? "Hospedagem"),
    orgId: String(row.org_id),
    orgName: "",
    orgSlug: "",
    neighborhood: String(row.neighborhood ?? ""),
    city: String(row.city ?? "Arraial do Cabo"),
    state: String(row.state ?? "RJ"),
    capacity: Number(row.capacity),
    bedrooms: Number(row.bedrooms),
    bathrooms: Number(row.bathrooms),
    basePriceCents: Number(row.base_price_cents),
    weekendPriceCents: (row.weekend_price_cents as number) ?? null,
    cleaningFeeCents: Number(row.cleaning_fee_cents ?? 0),
    minNights: Number(row.min_nights ?? 1),
    showPublicPrices: Boolean(row.show_public_prices),
    rules: (row.rules as string) ?? null,
    status: row.status as Stay["status"],
    rating: Number(row.rating_avg ?? 0),
    reviewsCount: Number(row.reviews_count ?? 0),
    images: photos.length ? photos.map((p) => p.url) : [`${row.slug}-1`],
    amenityLabels: [],
  };
}

export async function createStay(user: DemoUser, input: NewStayInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (DEMO_MODE) {
    const id = `stay-user-${Date.now()}`;
    const stay: Stay = {
      id,
      slug: slugify(input.name) || id,
      name: input.name,
      summary: input.summary,
      description: input.description,
      categorySlug: input.categoryId,
      categoryLabel: input.categoryLabel,
      orgId: user.orgId ?? "org-host-1",
      orgName: user.orgName ?? "Minha hospedagem",
      orgSlug: "minha-hospedagem",
      neighborhood: input.neighborhood,
      city: "Arraial do Cabo",
      state: "RJ",
      capacity: input.capacity,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      basePriceCents: input.basePriceCents,
      cleaningFeeCents: input.cleaningFeeCents,
      minNights: input.minNights,
      rules: "",
      status: "published",
      rating: 0,
      reviewsCount: 0,
      images: input.imageSeeds.length ? input.imageSeeds : [`${slugify(input.name)}-1`],
      amenityLabels: input.amenities,
      featured: false,
    };
    addCreatedStay(stay);
    return { ok: true, id };
  }

  const sb = getSupabaseBrowserClient();
  const slug = `${slugify(input.name) || "imovel"}-${Math.random().toString(36).slice(2, 6)}`;
  const { data: cat } = await sb.from("categories").select("id").eq("slug", input.categoryId).single();
  const { data: created, error } = await sb
    .from("properties")
    .insert({
      org_id: user.orgId,
      owner_id: user.id,
      category_id: cat?.id ?? null,
      name: input.name,
      slug,
      summary: input.summary,
      description: input.description,
      neighborhood: input.neighborhood,
      city: "Arraial do Cabo",
      state: "RJ",
      capacity: input.capacity,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      base_price_cents: input.basePriceCents,
      cleaning_fee_cents: input.cleaningFeeCents,
      min_nights: input.minNights,
      status: "draft",
      cover_url: input.imageSeeds[0] ? `/img/${input.imageSeeds[0]}.jpg` : null,
    })
    .select("id")
    .single();

  if (error || !created) {
    return { ok: false, error: "Não foi possível criar o anúncio. Verifique os dados." };
  }

  if (input.imageSeeds.length > 0) {
    await sb.from("property_photos").insert(
      input.imageSeeds.map((seed, i) => ({ property_id: created.id, url: `/img/${seed}.jpg`, sort: i, alt: input.name }))
    );
  }

  if (input.media?.length) {
    const media = input.media.map((item, sort) => ({ property_id: created.id, url: item.url, type: item.type, sort, alt: input.name }));
    const { error: mediaError } = await sb.from("property_photos").insert(media);
    if (mediaError) return { ok: false, error: "O anúncio foi criado, mas não foi possível vincular as mídias." };
    await sb.from("properties").update({ cover_url: input.media[0].url }).eq("id", created.id);
  }

  if (input.amenities.length > 0) {
    const { data: am } = await sb.from("amenities").select("id,key").in("key", input.amenities);
    if (am && am.length > 0) {
      await sb.from("property_amenities").insert(am.map((a: { id: string }) => ({ property_id: created.id, amenity_id: a.id })));
    }
  }

  return { ok: true, id: String(created.id) };
}

export async function updateStay(id: string, input: NewStayInput): Promise<Result> {
  if (DEMO_MODE) {
    updateCreatedStay(id, {
      name: input.name,
      summary: input.summary,
      description: input.description,
      neighborhood: input.neighborhood,
      capacity: input.capacity,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      basePriceCents: input.basePriceCents,
      cleaningFeeCents: input.cleaningFeeCents,
      minNights: input.minNights,
      images: input.imageSeeds.length ? input.imageSeeds : undefined,
      amenityLabels: input.amenities,
      categorySlug: input.categoryId,
      categoryLabel: input.categoryLabel,
    });
    return { ok: true };
  }
  const sb = getSupabaseBrowserClient();
  const { error } = await sb
    .from("properties")
    .update({
      name: input.name,
      summary: input.summary,
      description: input.description,
      neighborhood: input.neighborhood,
      capacity: input.capacity,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      base_price_cents: input.basePriceCents,
      cleaning_fee_cents: input.cleaningFeeCents,
      min_nights: input.minNights,
    })
    .eq("id", id);
  if (error) return { ok: false, error: "Não foi possível salvar as alterações." };

  // Só troca as artes do projeto (/img/...). Fotos e vídeos enviados pela galeria
  // (URLs do Storage) são gerenciados na aba "Fotos e vídeos" e não são tocados aqui.
  const artSeeds = input.imageSeeds.filter((seed) => !seed.startsWith("http"));
  if (artSeeds.length > 0) {
    await sb.from("property_photos").delete().eq("property_id", id).like("url", "/img/%");
    await sb.from("property_photos").insert(
      artSeeds.map((seed, i) => ({
        property_id: id,
        url: seed.startsWith("/") ? seed : `/img/${seed}.jpg`,
        sort: i,
        alt: input.name,
      }))
    );
  }

  if (input.amenities.length > 0) {
    await sb.from("property_amenities").delete().eq("property_id", id);
    const { data: am } = await sb.from("amenities").select("id,key").in("key", input.amenities);
    if (am && am.length > 0) {
      await sb.from("property_amenities").insert(am.map((a: { id: string }) => ({ property_id: id, amenity_id: a.id })));
    }
  }
  return { ok: true };
}

export async function setStayStatus(id: string, status: ListingStatus): Promise<Result> {
  if (DEMO_MODE) {
    updateCreatedStay(id, { status });
    return { ok: true };
  }
  const sb = getSupabaseBrowserClient();
  const { error } = await sb.from("properties").update({ status }).eq("id", id);
  return error ? { ok: false, error: "Não foi possível atualizar o status." } : { ok: true };
}

// ---------------------------------------------------------------------------
// ANÚNCIOS — PASSEIOS
// ---------------------------------------------------------------------------
export async function fetchOrgTours(orgId: string): Promise<Tour[]> {
  if (DEMO_MODE) {
    return [...listCreatedTours().filter((t) => t.orgId === orgId), ...demoTours.filter((t) => t.orgId === orgId)];
  }
  const sb = getSupabaseBrowserClient();
  const { data } = await sb
    .from("services")
    .select("*, organization:organizations(id,name,slug), category:categories(id,slug,label), vessel:vessels(name)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    summary: String(row.summary ?? ""),
    description: String(row.description ?? ""),
    categorySlug: String((row.category as { slug?: string } | null)?.slug ?? ""),
    categoryLabel: String((row.category as { label?: string } | null)?.label ?? "Passeio"),
    kind: (row.kind as TourKind) ?? "boat_tour",
    orgId: String(row.org_id),
    orgName: String((row.organization as { name?: string } | null)?.name ?? ""),
    orgSlug: String((row.organization as { slug?: string } | null)?.slug ?? ""),
    durationMinutes: Number(row.duration_minutes),
    meetingPoint: String(row.meeting_point ?? ""),
    itinerary: (row.itinerary as Tour["itinerary"]) ?? [],
    included: (row.included as string[]) ?? [],
    pricePerPersonCents: Number(row.price_per_person_cents),
    priceMode: (row.price_mode as Tour["priceMode"]) ?? "per_person",
    priceGroupSize: (row.price_group_size as number) ?? null,
    weekendPriceCents: (row.weekend_price_cents as number) ?? null,
    childPriceCents: (row.child_price_cents as number) ?? null,
    minGuests: Number(row.min_guests ?? 1),
    maxGuests: Number(row.max_guests ?? 10),
    vesselName: (row.vessel as { name?: string } | null)?.name ?? null,
    status: row.status as Tour["status"],
    rating: Number(row.rating_avg ?? 0),
    reviewsCount: Number(row.reviews_count ?? 0),
    images: [`${row.slug}-1`, `${row.slug}-2`],
  })) satisfies Tour[];
}

export async function fetchTourById(id: string): Promise<Tour | null> {
  if (DEMO_MODE) {
    return getCreatedTour(id) ?? demoTours.find((t) => t.id === id) ?? null;
  }
  const sb = getSupabaseBrowserClient();
  const { data: row } = await sb
    .from("services")
    .select("*, category:categories(id,slug,label)")
    .eq("id", id)
    .maybeSingle();
  if (!row) return null;
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    summary: String(row.summary ?? ""),
    description: String(row.description ?? ""),
    categorySlug: String((row.category as { slug?: string } | null)?.slug ?? ""),
    categoryLabel: String((row.category as { label?: string } | null)?.label ?? "Passeio"),
    kind: (row.kind as TourKind) ?? "boat_tour",
    orgId: String(row.org_id),
    orgName: "",
    orgSlug: "",
    durationMinutes: Number(row.duration_minutes),
    meetingPoint: String(row.meeting_point ?? ""),
    itinerary: (row.itinerary as Tour["itinerary"]) ?? [],
    included: (row.included as string[]) ?? [],
    pricePerPersonCents: Number(row.price_per_person_cents),
    priceMode: (row.price_mode as Tour["priceMode"]) ?? "per_person",
    priceGroupSize: (row.price_group_size as number) ?? null,
    weekendPriceCents: (row.weekend_price_cents as number) ?? null,
    childPriceCents: (row.child_price_cents as number) ?? null,
    minGuests: Number(row.min_guests ?? 1),
    maxGuests: Number(row.max_guests ?? 10),
    vesselName: null,
    status: row.status as Tour["status"],
    rating: Number(row.rating_avg ?? 0),
    reviewsCount: Number(row.reviews_count ?? 0),
    images: [`${row.slug}-1`, `${row.slug}-2`],
  };
}

export async function createTour(user: DemoUser, input: NewTourInput): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (DEMO_MODE) {
    const id = `tour-user-${Date.now()}`;
    const tour: Tour = {
      id,
      slug: slugify(input.name) || id,
      name: input.name,
      summary: input.summary,
      description: input.description,
      categorySlug: input.categoryId,
      categoryLabel: input.categoryLabel,
      kind: input.kind,
      orgId: user.orgId ?? "org-op-1",
      orgName: user.orgName ?? "Meus passeios",
      orgSlug: "meus-passeios",
      durationMinutes: input.durationMinutes,
      meetingPoint: input.meetingPoint,
      itinerary: input.itinerary.map((t, i) => ({ order: i + 1, title: t })),
      included: input.included,
      pricePerPersonCents: input.pricePerPersonCents,
      priceMode: input.priceMode,
      priceGroupSize: input.priceGroupSize ?? null,
      childPriceCents: null,
      minGuests: input.minGuests,
      maxGuests: input.maxGuests,
      vesselName: null,
      status: "published",
      rating: 0,
      reviewsCount: 0,
      images: input.imageSeeds.length ? input.imageSeeds : [`${slugify(input.name)}-1`],
      featured: false,
    };
    addCreatedTour(tour);
    return { ok: true, id };
  }

  const sb = getSupabaseBrowserClient();
  const slug = `${slugify(input.name) || "passeio"}-${Math.random().toString(36).slice(2, 6)}`;
  const { data: cat } = await sb.from("categories").select("id").eq("slug", input.categoryId).single();
  const { data: created, error } = await sb
    .from("services")
    .insert({
      org_id: user.orgId,
      category_id: cat?.id ?? null,
      kind: input.kind,
      name: input.name,
      slug,
      summary: input.summary,
      description: input.description,
      duration_minutes: input.durationMinutes,
      meeting_point: input.meetingPoint,
      itinerary: input.itinerary.map((t, i) => ({ order: i + 1, title: t })),
      included: input.included,
      price_per_person_cents: input.pricePerPersonCents,
      price_mode: input.priceMode,
      price_group_size: input.priceMode === "per_group" ? input.priceGroupSize ?? input.maxGuests : null,
      min_guests: input.minGuests,
      max_guests: input.maxGuests,
      status: "draft",
      cover_url: input.imageSeeds[0] ? `/img/${input.imageSeeds[0]}.jpg` : null,
    })
    .select("id")
    .single();

  if (error || !created) {
    return { ok: false, error: "Não foi possível criar o passeio. Verifique os dados." };
  }
  if (input.media?.length) {
    const media = input.media.map((item, sort) => ({ service_id: created.id, url: item.url, type: item.type, sort }));
    const { error: mediaError } = await sb.from("service_media").insert(media);
    if (mediaError) return { ok: false, error: "O passeio foi criado, mas não foi possível vincular as mídias." };
    await sb.from("services").update({ cover_url: input.media[0].url }).eq("id", created.id);
  }
  return { ok: true, id: String(created.id) };
}

export async function updateTour(id: string, input: NewTourInput): Promise<Result> {
  if (DEMO_MODE) {
    updateCreatedTour(id, {
      name: input.name,
      summary: input.summary,
      description: input.description,
      categorySlug: input.categoryId,
      categoryLabel: input.categoryLabel,
      kind: input.kind,
      durationMinutes: input.durationMinutes,
      meetingPoint: input.meetingPoint,
      itinerary: input.itinerary.map((t, i) => ({ order: i + 1, title: t })),
      included: input.included,
      pricePerPersonCents: input.pricePerPersonCents,
      priceMode: input.priceMode,
      priceGroupSize: input.priceGroupSize ?? null,
      minGuests: input.minGuests,
      maxGuests: input.maxGuests,
      images: input.imageSeeds.length ? input.imageSeeds : undefined,
    });
    return { ok: true };
  }
  const sb = getSupabaseBrowserClient();
  const { error } = await sb
    .from("services")
    .update({
      name: input.name,
      summary: input.summary,
      description: input.description,
      kind: input.kind,
      duration_minutes: input.durationMinutes,
      meeting_point: input.meetingPoint,
      itinerary: input.itinerary.map((t, i) => ({ order: i + 1, title: t })),
      included: input.included,
      price_per_person_cents: input.pricePerPersonCents,
      price_mode: input.priceMode,
      price_group_size: input.priceMode === "per_group" ? input.priceGroupSize ?? input.maxGuests : null,
      min_guests: input.minGuests,
      max_guests: input.maxGuests,
    })
    .eq("id", id);
  return error ? { ok: false, error: "Não foi possível salvar as alterações." } : { ok: true };
}

export async function setTourStatus(id: string, status: ListingStatus): Promise<Result> {
  if (DEMO_MODE) {
    updateCreatedTour(id, { status });
    return { ok: true };
  }
  const sb = getSupabaseBrowserClient();
  const { error } = await sb.from("services").update({ status }).eq("id", id);
  return error ? { ok: false, error: "Não foi possível atualizar o status." } : { ok: true };
}

// ---------------------------------------------------------------------------
// SAÍDAS
// ---------------------------------------------------------------------------
export async function fetchDepartures(tour: Tour): Promise<Departure[]> {
  if (DEMO_MODE) {
    const generated = getDemoDepartures(tour);
    const created = listCreatedDepartures().filter((d) => d.serviceId === tour.id);
    return [...created, ...generated].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }
  const sb = getSupabaseBrowserClient();
  const { data } = await sb
    .from("departures")
    .select("*")
    .eq("service_id", tour.id)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(90);
  return (data ?? []).map((d: Record<string, unknown>) => ({
    id: String(d.id),
    serviceId: String(d.service_id),
    startsAt: String(d.starts_at),
    endsAt: (d.ends_at as string) ?? null,
    capacity: Number(d.capacity),
    seatsBooked: Number(d.seats_booked),
    status: d.status as Departure["status"],
    priceOverrideCents: (d.price_override_cents as number) ?? null,
  }));
}

export async function createDeparture(
  serviceId: string,
  input: { startsAt: string; capacity: number; priceOverrideCents?: number | null }
): Promise<Result> {
  if (DEMO_MODE) {
    addCreatedDeparture({
      id: `dep-user-${Date.now()}`,
      serviceId,
      startsAt: input.startsAt,
      endsAt: null,
      capacity: input.capacity,
      seatsBooked: 0,
      status: "open",
      priceOverrideCents: input.priceOverrideCents ?? null,
    });
    return { ok: true };
  }
  const sb = getSupabaseBrowserClient();
  const { error } = await sb.from("departures").insert({
    service_id: serviceId,
    starts_at: input.startsAt,
    capacity: input.capacity,
    price_override_cents: input.priceOverrideCents ?? null,
    status: "open",
  });
  if (error) {
    return { ok: false, error: error.message.includes("duplicate") ? "Já existe uma saída nesse horário." : "Não foi possível criar a saída." };
  }
  return { ok: true };
}

export async function setDepartureStatus(id: string, status: Departure["status"]): Promise<Result> {
  if (DEMO_MODE) {
    setCreatedDepartureStatus(id, status);
    return { ok: true };
  }
  const sb = getSupabaseBrowserClient();
  const { error } = await sb.from("departures").update({ status }).eq("id", id);
  return error ? { ok: false, error: "Não foi possível atualizar a saída." } : { ok: true };
}

// ---------------------------------------------------------------------------
// BLOQUEIOS MANUAIS
// ---------------------------------------------------------------------------
export async function addBlock(user: DemoUser, propertyId: string, startDate: string, endDate: string, reason?: string): Promise<Result> {
  if (startDate >= endDate) {
    return { ok: false, error: "A data final deve ser depois da inicial (a noite de check-out fica livre)." };
  }
  if (DEMO_MODE) {
    addManualBlock({ id: `blk-${Date.now()}`, propertyId, startDate, endDate, reason: reason ?? null });
    return { ok: true };
  }
  const sb = getSupabaseBrowserClient();
  const { error } = await sb.from("property_blocks").insert({
    property_id: propertyId,
    start_date: startDate,
    end_date: endDate,
    reason: reason ?? null,
    created_by: user.id,
  });
  return error ? { ok: false, error: "Não foi possível criar o bloqueio." } : { ok: true };
}

export async function removeBlock(id: string): Promise<Result> {
  if (DEMO_MODE) {
    removeManualBlock(id);
    return { ok: true };
  }
  const sb = getSupabaseBrowserClient();
  const { error } = await sb.from("property_blocks").delete().eq("id", id);
  return error ? { ok: false, error: "Não foi possível remover o bloqueio." } : { ok: true };
}

export async function fetchBlocks(propertyId: string): Promise<PropertyBlock[]> {
  if (DEMO_MODE) {
    // bloqueios manuais criados no modo demo (os de exemplo vêm do demo-data)
    const { listManualBlocks } = await import("./demo-store");
    return listManualBlocks().filter((b) => b.propertyId === propertyId);
  }
  const sb = getSupabaseBrowserClient();
  const { data } = await sb.from("property_blocks").select("*").eq("property_id", propertyId).order("start_date");
  return (data ?? []).map((b: Record<string, unknown>) => ({
    id: String(b.id),
    propertyId: String(b.property_id),
    startDate: String(b.start_date),
    endDate: String(b.end_date),
    reason: (b.reason as string) ?? null,
  }));
}

// ---------------------------------------------------------------------------
// CALENDÁRIOS EXTERNOS (iCal)
// ---------------------------------------------------------------------------
export async function fetchExternalCalendars(propertyId: string): Promise<ExternalCalendarView[]> {
  if (DEMO_MODE) {
    const { listExternalCalendars } = await import("./demo-store");
    return listExternalCalendars().filter((c) => c.propertyId === propertyId);
  }
  const sb = getSupabaseBrowserClient();
  const { data } = await sb.from("external_calendars").select("*").eq("property_id", propertyId).order("created_at", { ascending: false });
  return (data ?? []).map((c: Record<string, unknown>) => ({
    id: String(c.id),
    propertyId: String(c.property_id),
    source: String(c.source),
    label: String(c.label ?? ""),
    active: Boolean(c.active),
    lastSyncedAt: (c.last_synced_at as string) ?? null,
    lastStatus: (c.last_status as string) ?? null,
    nextSyncAt: (c.next_sync_at as string) ?? null,
    importedCount: Number(c.imported_count ?? 0),
    lastError: (c.last_error as string) ?? null,
  }));
}

export async function addExternalCalendar(propertyId: string, input: { source: string; label: string; url: string }): Promise<Result> {
  let normalizedUrl: string;
  try { normalizedUrl = normalizeCalendarUrl(input.url); }
  catch (err) { return { ok: false, error: err instanceof Error ? err.message : "URL inválida." }; }
  if (DEMO_MODE) {
    addExternalCalendarToStore({
      id: `cal-${Date.now()}`,
      propertyId,
      source: input.source,
      label: input.label || input.source,
      active: true,
      lastSyncedAt: null,
      lastStatus: null,
      lastError: null,
    });
    return { ok: true };
  }
  const sb = getSupabaseBrowserClient();
  const { error } = await sb.from("external_calendars").insert({
    property_id: propertyId,
    source: input.source,
    label: input.label || input.source,
    ical_url: normalizedUrl,
    active: true,
  });
  return error ? { ok: false, error: "Não foi possível conectar o calendário." } : { ok: true };
}

export async function removeExternalCalendarById(id: string): Promise<Result> {
  if (DEMO_MODE) {
    removeExternalCalendar(id);
    return { ok: true };
  }
  const sb = getSupabaseBrowserClient();
  const { error } = await sb.from("external_calendars").delete().eq("id", id);
  return error ? { ok: false, error: "Não foi possível remover." } : { ok: true };
}

// ---------------------------------------------------------------------------
// ORGANIZAÇÃO (onboarding no modo real)
// ---------------------------------------------------------------------------
export async function createOrganization(
  user: DemoUser,
  input: { name: string; kind: "host" | "operator"; bio: string; phone: string }
): Promise<{ ok: true; orgId: string; orgName: string } | { ok: false; error: string }> {
  const sb = getSupabaseBrowserClient();
  const slug = `${slugify(input.name) || "fornecedor"}-${Math.random().toString(36).slice(2, 6)}`;
  const { data: org, error } = await sb
    .from("organizations")
    .insert({
      name: input.name,
      slug,
      kind: input.kind,
      status: "pending",
      bio: input.bio || null,
      phone: input.phone || null,
      created_by: user.id,
    })
    .select("id,name")
    .single();

  if (error || !org) {
    return { ok: false, error: "Não foi possível criar seu perfil comercial." };
  }

  await sb.from("organization_members").insert({
    organization_id: org.id,
    profile_id: user.id,
    member_role: "owner",
  });

  return { ok: true, orgId: String(org.id), orgName: String(org.name) };
}

export async function syncExternalCalendar(id: string): Promise<Result> {
  if (DEMO_MODE) return { ok: false, error: "A sincronização real requer conexão com o Supabase." };
  try {
    const response = await fetch(`/api/calendars/${encodeURIComponent(id)}/sync`, { method: "POST" });
    const result = await response.json();
    return response.ok ? { ok: true } : { ok: false, error: result.error ?? "Não foi possível sincronizar." };
  } catch { return { ok: false, error: "Falha de conexão. Tente novamente." }; }
}

export async function fetchPropertyOccupiedDates(propertyId: string): Promise<string[]> {
  if (DEMO_MODE) return [];
  const today = new Date();
  const until = new Date(today);
  until.setFullYear(until.getFullYear() + 3);
  const { data, error } = await getSupabaseBrowserClient().rpc("get_property_blocked_dates", {
    p_property: propertyId, p_from: today.toISOString().slice(0, 10), p_to: until.toISOString().slice(0, 10),
  });
  if (error) throw new Error("Não foi possível carregar a disponibilidade.");
  return (data ?? []).filter((row: { available: boolean }) => !row.available).map((row: { day: string }) => row.day);
}
