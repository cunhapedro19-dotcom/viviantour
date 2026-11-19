// Camada de consulta do marketplace (Server Components).
// Modo demonstração: dados de lib/demo-data.
// Modo Supabase: consultas reais respeitando o RLS (apenas status published).

import { DEMO_MODE } from "./config";
import {
  demoCategories,
  demoReviewsByItem,
  demoStays,
  demoTours,
  getDemoDepartures,
  getStayBySlug,
  getTourBySlug,
} from "./demo-data";
import { createSupabaseServerClient } from "./supabase/server";
import type { Category, Departure, Review, SeasonalPriceRule, Stay, Tour } from "./types";

export interface SearchFilters {
  q?: string;
  tipo?: "stay" | "tour";
  categoria?: string;
  pessoas?: number;
  ordem?: "relevancia" | "avaliacao";
}

interface PhotoRow { url: string; sort?: number; type?: string }

function mapPriceRules(rows: Row[] | null | undefined): SeasonalPriceRule[] {
  return (rows ?? [])
    .map((rule) => ({
      id: String(rule.id),
      startsOn: String(rule.starts_on),
      endsOn: rule.ends_on ? String(rule.ends_on) : null,
      priceCents: Number(rule.price_cents),
      priority: Number(rule.priority ?? 0),
      ruleKind: rule.rule_kind ?? "seasonal",
      label: rule.label ?? null,
      details: rule.details ?? null,
    }))
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn) || (b.priority ?? 0) - (a.priority ?? 0));
}

function textMatches(item: Stay | Tour, q?: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase();
  const neighborhood = "neighborhood" in item ? item.neighborhood : "";
  return [item.name, item.summary, item.description, item.orgName, neighborhood, item.categoryLabel]
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

function filterStays(stays: Stay[], f: SearchFilters): Stay[] {
  return stays.filter((s) => {
    if (s.status !== "published") return false;
    if (f.tipo && f.tipo !== "stay") return false;
    if (f.categoria && s.categorySlug !== f.categoria) return false;
    if (f.pessoas && s.capacity < f.pessoas) return false;
    return textMatches(s, f.q);
  });
}

function filterTours(tours: Tour[], f: SearchFilters): Tour[] {
  return tours.filter((t) => {
    if (t.status !== "published") return false;
    if (f.tipo && f.tipo !== "tour") return false;
    if (f.categoria && t.categorySlug !== f.categoria) return false;
    if (f.pessoas && t.maxGuests < f.pessoas) return false;
    return textMatches(t, f.q);
  });
}

function sortListings<T extends Stay | Tour>(items: T[], ordem?: SearchFilters["ordem"]): T[] {
  const copy = [...items];
  switch (ordem) {
    case "avaliacao":
      copy.sort((a, b) => b.rating - a.rating);
      break;
    default:
      copy.sort((a, b) => Number(b.featured ?? false) - Number(a.featured ?? false));
  }
  return copy;
}

// ---------------------------------------------------------------------------
// MODO DEMONSTRAÇÃO
// ---------------------------------------------------------------------------
function demoHomeData() {
  const stays = sortListings(demoStays.filter((s) => s.featured));
  const tours = sortListings(demoTours.filter((t) => t.featured));
  return { stays, tours, categories: demoCategories };
}

function demoSearch(f: SearchFilters) {
  const stays = sortListings(filterStays(demoStays, f), f.ordem);
  const tours = sortListings(filterTours(demoTours, f), f.ordem);
  return { stays, tours, total: stays.length + tours.length, categories: demoCategories };
}

function demoReviewsFor(id: string): Review[] {
  return demoReviewsByItem[id] ?? [];
}

// ---------------------------------------------------------------------------
// MODO SUPABASE
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any;

function mapStayRow(row: Row): Stay {
  const sorted: PhotoRow[] = (row.photos ?? []).slice().sort((a: PhotoRow, b: PhotoRow) => (a.sort ?? 0) - (b.sort ?? 0));
  const photos = sorted.filter((p) => p.type !== "video");
  const videos = sorted.filter((p) => p.type === "video").map((p) => p.url);
  const amenityLabels: string[] = (row.amenities ?? [])
    .map((pa: Row) => pa?.amenity?.label)
    .filter(Boolean);
  const priceRules = mapPriceRules(row.priceRules);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    summary: row.summary ?? "",
    description: row.description ?? "",
    categorySlug: row.category?.slug ?? "",
    categoryLabel: row.category?.label ?? "Hospedagem",
    orgId: row.org_id,
    orgName: row.organization?.name ?? "",
    orgSlug: row.organization?.slug ?? "",
    orgWhatsapp: row.organization?.whatsapp ?? row.organization?.phone ?? null,
    neighborhood: row.neighborhood ?? "",
    city: row.city ?? "Arraial do Cabo",
    state: row.state ?? "RJ",
    capacity: row.capacity,
    bedrooms: row.bedrooms,
    bathrooms: Number(row.bathrooms),
    basePriceCents: row.base_price_cents,
    weekendPriceCents: row.weekend_price_cents ?? null,
    cleaningFeeCents: row.cleaning_fee_cents ?? 0,
    minNights: row.min_nights ?? 1,
    showPublicPrices: Boolean(row.show_public_prices),
    priceRules,
    rules: row.rules,
    status: row.status,
    rating: Number(row.rating_avg ?? 0),
    reviewsCount: row.reviews_count ?? 0,
    images: photos.length
      ? photos.map((p) => p.url)
      : [`${row.slug}-1`, `${row.slug}-2`, `${row.slug}-3`],
    videos,
    amenityLabels,
  };
}

function mapTourRow(row: Row): Tour {
  const sorted: PhotoRow[] = (row.media ?? []).slice().sort((a: PhotoRow, b: PhotoRow) => (a.sort ?? 0) - (b.sort ?? 0));
  const photos = sorted.filter((p) => p.type !== "video");
  const videos = sorted.filter((p) => p.type === "video").map((p) => p.url);
  const priceRules = mapPriceRules(row.priceRules);
  const startingPriceCents = Math.min(
    Number(row.price_per_person_cents),
    ...(row.weekend_price_cents != null ? [Number(row.weekend_price_cents)] : []),
    ...priceRules.map((rule) => rule.priceCents)
  );
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    summary: row.summary ?? "",
    description: row.description ?? "",
    categorySlug: row.category?.slug ?? "",
    categoryLabel: row.category?.label ?? "Passeio",
    kind: row.kind ?? "boat_tour",
    orgId: row.org_id,
    orgName: row.organization?.name ?? "",
    orgSlug: row.organization?.slug ?? "",
    orgWhatsapp: row.organization?.whatsapp ?? row.organization?.phone ?? null,
    durationMinutes: row.duration_minutes,
    meetingPoint: row.meeting_point ?? "",
    itinerary: row.itinerary ?? [],
    included: row.included ?? [],
    pricePerPersonCents: row.price_per_person_cents,
    weekendPriceCents: row.weekend_price_cents ?? null,
    startingPriceCents,
    priceRules,
    bookingAvailableThrough: row.booking_available_through ?? null,
    childPriceCents: row.child_price_cents,
    minGuests: row.min_guests ?? 1,
    maxGuests: row.max_guests ?? 10,
    vesselName: row.vessel?.name ?? null,
    status: row.status,
    rating: Number(row.rating_avg ?? 0),
    reviewsCount: row.reviews_count ?? 0,
    images: photos.length ? photos.map((p) => p.url) : [`${row.slug}-1`, `${row.slug}-2`],
    videos,
  };
}

const STAY_SELECT =
  "*, organization:organizations(id,name,slug,phone,whatsapp), category:categories(id,slug,label), photos:property_photos(url,sort,type), amenities:property_amenities(amenity:amenities(label)), priceRules:listing_price_rules!listing_price_rules_property_id_fkey(*)";
const TOUR_SELECT = "*, organization:organizations(id,name,slug,phone,whatsapp), category:categories(id,slug,label), vessel:vessels(name), media:service_media(url,type,sort), priceRules:listing_price_rules!listing_price_rules_service_id_fkey(*)";

async function supabaseHomeData() {
  const supabase = createSupabaseServerClient();
  const [staysRes, toursRes, catsRes] = await Promise.all([
    supabase.from("properties").select(STAY_SELECT).eq("status", "published").order("rating_avg", { ascending: false }).limit(8),
    supabase.from("services").select(TOUR_SELECT).eq("status", "published").order("rating_avg", { ascending: false }).limit(8),
    supabase.from("categories").select("*").eq("active", true).order("sort"),
  ]);
  return {
    stays: (staysRes.data ?? []).map(mapStayRow) as Stay[],
    tours: (toursRes.data ?? []).map(mapTourRow) as Tour[],
    categories: (catsRes.data ?? []) as Category[],
  };
}

async function supabaseSearch(f: SearchFilters) {
  const supabase = createSupabaseServerClient();
  const [staysRes, toursRes] = await Promise.all([
    supabase.from("properties").select(STAY_SELECT).eq("status", "published"),
    supabase.from("services").select(TOUR_SELECT).eq("status", "published"),
  ]);
  const stays = sortListings(filterStays((staysRes.data ?? []).map(mapStayRow), f), f.ordem);
  const tours = sortListings(filterTours((toursRes.data ?? []).map(mapTourRow), f), f.ordem);
  return { stays, tours, total: stays.length + tours.length, categories: [] as Category[] };
}

async function supabaseStayBySlug(slug: string): Promise<Stay | null> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.from("properties").select(STAY_SELECT).eq("slug", slug).maybeSingle();
  return data ? mapStayRow(data) : null;
}

async function supabaseTourBySlug(slug: string): Promise<Tour | null> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.from("services").select(TOUR_SELECT).eq("slug", slug).maybeSingle();
  return data ? mapTourRow(data) : null;
}

async function supabaseDepartures(tour: Tour): Promise<Departure[]> {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("departures")
    .select("*")
    .eq("service_id", tour.id)
    .gte("starts_at", new Date().toISOString())
    .eq("status", "open")
    .order("starts_at")
    .limit(60);
  return (data ?? [])
    .filter((d: Row) => !tour.bookingAvailableThrough || String(d.starts_at).slice(0, 10) <= tour.bookingAvailableThrough)
    .map((d: Row) => ({
    id: d.id,
    serviceId: d.service_id,
    startsAt: d.starts_at,
    endsAt: d.ends_at,
    capacity: d.capacity,
    seatsBooked: d.seats_booked,
    status: d.status,
      priceOverrideCents: d.price_override_cents,
    }));
}

async function supabaseReviews(kind: "stay" | "tour", id: string): Promise<Review[]> {
  const supabase = createSupabaseServerClient();
  const col = kind === "stay" ? "property_id" : "service_id";
  const { data } = await supabase
    .from("reviews")
    .select("id, rating, title, comment, reply, created_at, author_name")
    .eq(col, id)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []).map((r: Row) => ({
    id: r.id,
    authorName: (r.author_name ?? "").trim() || "Hóspede",
    rating: Number(r.rating),
    title: r.title,
    comment: r.comment ?? "",
    date: r.created_at,
    reply: r.reply,
  }));
}

// ---------------------------------------------------------------------------
// API PÚBLICA
// ---------------------------------------------------------------------------
export async function getHomeData() {
  return DEMO_MODE ? demoHomeData() : supabaseHomeData();
}

export async function searchListings(f: SearchFilters) {
  return DEMO_MODE ? demoSearch(f) : supabaseSearch(f);
}

export async function getStayBySlugSafe(slug: string): Promise<Stay | null> {
  if (DEMO_MODE) return getStayBySlug(slug) ?? null;
  return supabaseStayBySlug(slug);
}

export async function getTourBySlugSafe(slug: string): Promise<Tour | null> {
  if (DEMO_MODE) return getTourBySlug(slug) ?? null;
  return supabaseTourBySlug(slug);
}

export async function getDeparturesForTour(tour: Tour): Promise<Departure[]> {
  if (DEMO_MODE) return getDemoDepartures(tour);
  return supabaseDepartures(tour);
}

export async function getReviewsFor(kind: "stay" | "tour", id: string): Promise<Review[]> {
  if (DEMO_MODE) return demoReviewsFor(id);
  return supabaseReviews(kind, id);
}
