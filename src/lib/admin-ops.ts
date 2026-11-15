"use client";

// Operações do painel administrativo (modo demo + Supabase).

import { DEMO_MODE } from "./config";
import { demoOrganizations, demoStays, demoTours } from "./demo-data";
import { listBookings, listCreatedStays, listCreatedTours } from "./demo-store";
import { getSupabaseBrowserClient } from "./supabase/client";
import type { Booking, ListingStatus, Organization, Stay, Tour } from "./types";

export interface AdminOrgRow {
  id: string;
  name: string;
  kind: "host" | "operator";
  status: Organization["status"];
  city: string;
  listingsCount: number;
  createdAt?: string;
}

export interface AdminListingRow {
  id: string;
  kind: "stay" | "tour";
  name: string;
  orgName: string;
  status: ListingStatus;
  slug: string;
}

async function countOf(sb: ReturnType<typeof getSupabaseBrowserClient>, table: string, eq?: [string, string]) {
  let q = sb.from(table).select("id", { count: "exact", head: true });
  if (eq) q = q.eq(eq[0], eq[1]);
  const { count } = await q;
  return count ?? 0;
}

export async function fetchAdminKpis(): Promise<{
  orgsActive: number;
  orgsPending: number;
  listingsPublished: number;
  listingsPending: number;
  bookingsCount: number;
  awaitingPayment: number;
  gmvCents: number;
  commissionCents: number;
}> {
  if (DEMO_MODE) {
    const bookings = listBookings();
    const confirmed = bookings.filter((b) => ["confirmed", "completed"].includes(b.status));
    return {
      orgsActive: demoOrganizations.filter((o) => o.status === "active").length,
      orgsPending: demoOrganizations.filter((o) => o.status === "pending").length,
      listingsPublished:
        demoStays.filter((s) => s.status === "published").length +
        demoTours.filter((t) => t.status === "published").length,
      listingsPending: 2, // fila simulada na demonstração
      bookingsCount: bookings.length,
      awaitingPayment: bookings.filter((b) => b.status === "awaiting_payment").length,
      gmvCents: confirmed.reduce((s, b) => s + b.totalCents, 0),
      commissionCents: confirmed.reduce((s, b) => s + b.commissionCents, 0),
    };
  }

  const sb = getSupabaseBrowserClient();
  const [
    orgsActive,
    orgsPending,
    staysPublished,
    toursPublished,
    staysPending,
    toursPending,
    awaitingPayment,
    bookingsRes,
  ] = await Promise.all([
    countOf(sb, "organizations", ["status", "active"]),
    countOf(sb, "organizations", ["status", "pending"]),
    countOf(sb, "properties", ["status", "published"]),
    countOf(sb, "services", ["status", "published"]),
    countOf(sb, "properties", ["status", "pending_review"]),
    countOf(sb, "services", ["status", "pending_review"]),
    countOf(sb, "bookings", ["status", "awaiting_payment"]),
    sb.from("bookings").select("total_cents, commission_cents, status"),
  ]);

  const bookings = (bookingsRes.data ?? []) as { total_cents: number; commission_cents: number; status: string }[];
  const confirmed = bookings.filter((b) => ["confirmed", "completed"].includes(b.status));

  return {
    orgsActive,
    orgsPending,
    listingsPublished: staysPublished + toursPublished,
    listingsPending: staysPending + toursPending,
    bookingsCount: bookings.length,
    awaitingPayment,
    gmvCents: confirmed.reduce((s, b) => s + Number(b.total_cents), 0),
    commissionCents: confirmed.reduce((s, b) => s + Number(b.commission_cents), 0),
  };
}

export async function fetchAdminOrgs(): Promise<AdminOrgRow[]> {
  if (DEMO_MODE) {
    return demoOrganizations.map((o) => ({
      id: o.id,
      name: o.name,
      kind: o.kind,
      status: o.status,
      city: o.city,
      listingsCount:
        demoStays.filter((s) => s.orgId === o.id).length + demoTours.filter((t) => t.orgId === o.id).length,
    }));
  }
  const sb = getSupabaseBrowserClient();
  const { data } = await sb
    .from("organizations")
    .select("id, name, kind, status, city, created_at, properties(count), services(count)")
    .order("created_at", { ascending: false });

  return (data ?? []).map((o: Record<string, unknown>) => ({
    id: String(o.id),
    name: String(o.name),
    kind: o.kind as "host" | "operator",
    status: o.status as Organization["status"],
    city: String(o.city ?? "Arraial do Cabo"),
    listingsCount:
      ((o.properties as { count?: number }[] | null)?.[0]?.count ?? 0) +
      ((o.services as { count?: number }[] | null)?.[0]?.count ?? 0),
    createdAt: (o.created_at as string) ?? undefined,
  }));
}

export async function setOrgStatus(id: string, status: Organization["status"]): Promise<boolean> {
  if (DEMO_MODE) return true; // simulado no estado da página
  const sb = getSupabaseBrowserClient();
  const { error } = await sb.from("organizations").update({ status }).eq("id", id);
  return !error;
}

export async function fetchAdminListings(): Promise<AdminListingRow[]> {
  if (DEMO_MODE) {
    const all: AdminListingRow[] = [
      ...[...listCreatedStays(), ...demoStays].map((s: Stay) => ({
        id: s.id,
        kind: "stay" as const,
        name: s.name,
        orgName: s.orgName,
        status: s.status,
        slug: s.slug,
      })),
      ...[...listCreatedTours(), ...demoTours].map((t: Tour) => ({
        id: t.id,
        kind: "tour" as const,
        name: t.name,
        orgName: t.orgName,
        status: t.status,
        slug: t.slug,
      })),
    ];
    // na demonstração, simula dois anúncios aguardando aprovação
    return [
      { id: "fake-stay-1", kind: "stay", name: "Kitnet do Farol (novo fornecedor)", orgName: "Pousada Bella Vista", status: "pending_review", slug: "" },
      { id: "fake-tour-1", kind: "tour", name: "Speed boat das ilhas (novo fornecedor)", orgName: "Arraial Speedboats", status: "pending_review", slug: "" },
      ...all,
    ];
  }
  const sb = getSupabaseBrowserClient();
  const [staysRes, toursRes] = await Promise.all([
    sb
      .from("properties")
      .select("id, name, slug, status, organization:organizations(name)")
      .order("created_at", { ascending: false })
      .limit(100),
    sb
      .from("services")
      .select("id, name, slug, status, organization:organizations(name)")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const rows: AdminListingRow[] = [
    ...((staysRes.data ?? []) as Record<string, unknown>[]).map((s) => ({
      id: String(s.id),
      kind: "stay" as const,
      name: String(s.name),
      orgName: String((s.organization as { name?: string } | null)?.name ?? "—"),
      status: String(s.status) as ListingStatus,
      slug: String(s.slug),
    })),
    ...((toursRes.data ?? []) as Record<string, unknown>[]).map((t) => ({
      id: String(t.id),
      kind: "tour" as const,
      name: String(t.name),
      orgName: String((t.organization as { name?: string } | null)?.name ?? "—"),
      status: String(t.status) as ListingStatus,
      slug: String(t.slug),
    })),
  ];
  return rows;
}

export async function setListingStatus(
  kind: "stay" | "tour",
  id: string,
  status: ListingStatus
): Promise<boolean> {
  if (DEMO_MODE) return true;
  const sb = getSupabaseBrowserClient();
  const table = kind === "stay" ? "properties" : "services";
  const { error } = await sb.from(table).update({ status }).eq("id", id);
  return !error;
}

export async function fetchAdminBookings(): Promise<Booking[]> {
  if (DEMO_MODE) {
    return listBookings();
  }
  const sb = getSupabaseBrowserClient();
  const { data } = await sb
    .from("bookings")
    .select(
      "*, customer:profiles!bookings_customer_id_fkey(full_name), property:properties(name,slug), service:services(name,slug), organization:organizations(name)"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  return (data ?? []).map((b: Record<string, unknown>) => ({
    id: String(b.id),
    code: String(b.code),
    kind: b.kind as "stay" | "tour",
    itemId: String(b.property_id ?? b.service_id ?? ""),
    itemSlug: String((b.property as { slug?: string } | null)?.slug ?? (b.service as { slug?: string } | null)?.slug ?? ""),
    itemName: String((b.property as { name?: string } | null)?.name ?? (b.service as { name?: string } | null)?.name ?? "Reserva"),
    orgId: String(b.org_id),
    orgName: String((b.organization as { name?: string } | null)?.name ?? ""),
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
    customerNote: (b.customer_note as string) ?? null,
    cancellationReason: (b.cancellation_reason as string) ?? null,
    createdAt: String(b.created_at),
  }));
}
