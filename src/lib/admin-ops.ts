"use client";

// Operações do painel administrativo (modo demo + Supabase).

import { DEMO_MODE } from "./config";
import { demoOrganizations, demoStays, demoTours } from "./demo-data";
import { listBookings, listCreatedStays, listCreatedTours } from "./demo-store";
import { slugify } from "./format";
import { createDeparture, createStay, createTour, setDepartureStatus } from "./panel-ops";
import { getSupabaseBrowserClient } from "./supabase/client";
import type {
  Booking,
  DemoUser,
  ListingStatus,
  Monetization,
  NewStayInput,
  NewTourInput,
  Organization,
  Stay,
  Tour,
} from "./types";

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

/** Grava o modelo de monetização definido pela equipe (só admin, via RLS). */
export async function saveMonetization(m: Monetization): Promise<string | null> {
  if (DEMO_MODE) return null; // nada a gravar em demonstração
  const sb = getSupabaseBrowserClient();
  const { error } = await sb.from("platform_settings").upsert({
    key: "monetization",
    value: {
      model: m.model,
      percent: m.percent,
      monthly_fee_cents: m.monthlyFeeCents,
    },
  });
  return error ? error.message : null;
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

// ============================================================================
// CADASTROS PELO PAINEL (fornecedor, anúncio, reserva)
// Só funcionam no modo real: dependem das permissões de administrador criadas
// na migração supabase/migrations/0005_admin_panel.sql.
// ============================================================================

export const DEMO_UNAVAILABLE =
  "Este cadastro grava no banco e só funciona no modo real (com o Supabase configurado).";

const SESSION_EXPIRED = "Sua sessão expirou. Entre novamente para continuar.";

export type OpResult<T extends object = object> = ({ ok: true } & T) | { ok: false; error: string };

async function currentUser() {
  const sb = getSupabaseBrowserClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  return user;
}

// ---------------------------------------------------------------------------
// FORNECEDORES
// ---------------------------------------------------------------------------
export interface NewSupplierInput {
  name: string;
  kind: "host" | "operator";
  bio: string;
  phone: string;
  email: string;
  /** E-mail de uma conta já cadastrada que passa a administrar o fornecedor (opcional). */
  linkEmail: string;
}

export async function createSupplier(
  input: NewSupplierInput
): Promise<OpResult<{ orgId: string; linkWarning?: string }>> {
  if (DEMO_MODE) return { ok: false, error: DEMO_UNAVAILABLE };

  const admin = await currentUser();
  if (!admin) return { ok: false, error: SESSION_EXPIRED };

  const sb = getSupabaseBrowserClient();
  const slug = `${slugify(input.name) || "fornecedor"}-${Math.random().toString(36).slice(2, 6)}`;
  const { data: org, error } = await sb
    .from("organizations")
    .insert({
      name: input.name,
      slug,
      kind: input.kind,
      status: "active",
      bio: input.bio || null,
      phone: input.phone || null,
      email: input.email || null,
      created_by: admin.id,
    })
    .select("id")
    .single();

  if (error || !org) {
    return { ok: false, error: "Não foi possível criar o fornecedor. Verifique os dados e tente de novo." };
  }

  const orgId = String(org.id);
  const linkEmail = input.linkEmail.trim().toLowerCase();
  if (!linkEmail) return { ok: true, orgId };

  const { data: profile } = await sb.from("profiles").select("id, role").eq("email", linkEmail).maybeSingle();
  if (!profile) {
    return {
      ok: true,
      orgId,
      linkWarning: `Fornecedor criado, mas não existe conta com o e-mail ${linkEmail}. Peça para a pessoa se cadastrar no site e vincule depois.`,
    };
  }

  const { error: memberError } = await sb.from("organization_members").insert({
    organization_id: orgId,
    profile_id: profile.id,
    member_role: "owner",
  });
  if (memberError) {
    return { ok: true, orgId, linkWarning: "Fornecedor criado, mas não foi possível vincular a conta informada." };
  }

  // Quem administra um fornecedor precisa de um papel que dê acesso ao /painel.
  if (profile.role === "customer") {
    await sb
      .from("profiles")
      .update({ role: input.kind === "host" ? "owner" : "provider" })
      .eq("id", profile.id);
  }

  return { ok: true, orgId };
}

// ---------------------------------------------------------------------------
// ANÚNCIOS (em nome de um fornecedor)
// ---------------------------------------------------------------------------
async function adminAsPanelUser(org: { id: string; name: string }): Promise<DemoUser | null> {
  const user = await currentUser();
  if (!user) return null;
  return {
    id: user.id,
    name: "Administração",
    email: user.email ?? "",
    role: "admin",
    orgId: org.id,
    orgName: org.name,
  };
}

export async function createStayAsAdmin(
  org: { id: string; name: string },
  input: NewStayInput,
  publishNow: boolean
): Promise<OpResult<{ id: string }>> {
  if (DEMO_MODE) return { ok: false, error: DEMO_UNAVAILABLE };
  const user = await adminAsPanelUser(org);
  if (!user) return { ok: false, error: SESSION_EXPIRED };

  const created = await createStay(user, input);
  if (!created.ok) return created;

  if (publishNow) {
    const published = await setListingStatus("stay", created.id, "published");
    if (!published) {
      return {
        ok: false,
        error: "O anúncio foi criado como rascunho, mas não foi possível publicar. Publique em Admin → Anúncios.",
      };
    }
  }
  return { ok: true, id: created.id };
}

export async function createTourAsAdmin(
  org: { id: string; name: string },
  input: NewTourInput,
  publishNow: boolean
): Promise<OpResult<{ id: string }>> {
  if (DEMO_MODE) return { ok: false, error: DEMO_UNAVAILABLE };
  const user = await adminAsPanelUser(org);
  if (!user) return { ok: false, error: SESSION_EXPIRED };

  const created = await createTour(user, input);
  if (!created.ok) return created;

  if (publishNow) {
    const published = await setListingStatus("tour", created.id, "published");
    if (!published) {
      return {
        ok: false,
        error: "O passeio foi criado como rascunho, mas não foi possível publicar. Publique em Admin → Anúncios.",
      };
    }
  }
  return { ok: true, id: created.id };
}

// ---------------------------------------------------------------------------
// RESERVAS (criadas pelo painel, em nome de um cliente)
// ---------------------------------------------------------------------------
export interface AdminProfileRow {
  id: string;
  name: string;
  email: string;
  role: string;
}

export async function fetchAdminProfiles(): Promise<AdminProfileRow[]> {
  if (DEMO_MODE) return [];
  const sb = getSupabaseBrowserClient();
  const { data } = await sb
    .from("profiles")
    .select("id, full_name, email, role")
    .order("full_name", { ascending: true })
    .limit(500);
  return ((data ?? []) as Record<string, unknown>[]).map((p) => ({
    id: String(p.id),
    name: String(p.full_name || p.email || "Sem nome"),
    email: String(p.email ?? ""),
    role: String(p.role ?? ""),
  }));
}

export interface BookableStay {
  id: string;
  name: string;
  orgName: string;
  status: ListingStatus;
  capacity: number;
  minNights: number;
  basePriceCents: number;
  cleaningFeeCents: number;
}

export interface BookableDeparture {
  id: string;
  startsAt: string;
  seatsLeft: number;
  pricePerPersonCents: number;
  serviceName: string;
  orgName: string;
}

export async function fetchBookableItems(): Promise<{ stays: BookableStay[]; departures: BookableDeparture[] }> {
  if (DEMO_MODE) return { stays: [], departures: [] };
  const sb = getSupabaseBrowserClient();
  const [staysRes, depRes] = await Promise.all([
    sb
      .from("properties")
      .select("id, name, status, capacity, min_nights, base_price_cents, cleaning_fee_cents, organization:organizations(name)")
      .order("name", { ascending: true })
      .limit(300),
    sb
      .from("departures")
      .select(
        "id, starts_at, capacity, seats_booked, price_override_cents, service:services(name, price_per_person_cents, organization:organizations(name))"
      )
      .eq("status", "open")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
      .limit(300),
  ]);

  const stays = ((staysRes.data ?? []) as Record<string, unknown>[]).map((s) => ({
    id: String(s.id),
    name: String(s.name),
    orgName: String((s.organization as { name?: string } | null)?.name ?? "—"),
    status: String(s.status) as ListingStatus,
    capacity: Number(s.capacity),
    minNights: Number(s.min_nights),
    basePriceCents: Number(s.base_price_cents),
    cleaningFeeCents: Number(s.cleaning_fee_cents),
  }));

  const departures = ((depRes.data ?? []) as Record<string, unknown>[]).map((d) => {
    const service = d.service as {
      name?: string;
      price_per_person_cents?: number;
      organization?: { name?: string } | null;
    } | null;
    return {
      id: String(d.id),
      startsAt: String(d.starts_at),
      seatsLeft: Number(d.capacity) - Number(d.seats_booked),
      pricePerPersonCents: Number(d.price_override_cents ?? service?.price_per_person_cents ?? 0),
      serviceName: String(service?.name ?? "Passeio"),
      orgName: String(service?.organization?.name ?? "—"),
    };
  });

  return { stays, departures };
}

export interface AdminBookingInput {
  kind: "stay" | "tour";
  propertyId?: string;
  departureId?: string;
  adults: number;
  children: number;
  checkIn?: string;
  checkOut?: string;
  /** Vazio = reserva no nome do próprio administrador. */
  customerId?: string;
  note?: string;
  phone?: string;
  /** Confirma na hora (bloqueia datas/vagas e calcula a comissão). */
  autoConfirm: boolean;
}

function bookingError(message: string): string {
  const map: [string, string][] = [
    ["CUSTOMER_NOT_FOUND", "O cliente escolhido não tem perfil na plataforma."],
    ["PROPERTY_NOT_FOUND", "Hospedagem não encontrada."],
    ["MIN_NIGHTS", "O período é menor que o mínimo de noites desta hospedagem."],
    ["CAPACITY_EXCEEDED", "O número de hóspedes passa da capacidade da hospedagem."],
    ["INVALID_DATES", "A saída precisa ser depois da entrada."],
    ["INVALID_GUESTS", "Informe ao menos 1 hóspede."],
    ["MISSING_FIELDS", "Preencha todos os campos obrigatórios da reserva."],
    ["NOT_AVAILABLE", "Essas datas não estão livres (reserva, bloqueio ou calendário externo)."],
    ["DEPARTURE_NOT_FOUND", "Saída não encontrada."],
    ["DEPARTURE_UNAVAILABLE", "A saída não está mais aberta."],
    ["DEPARTURE_PAST", "Essa saída já passou."],
    ["SERVICE_NOT_FOUND", "Passeio não encontrado."],
    ["NO_SEATS", "Não há vagas suficientes nesta saída."],
    ["FORBIDDEN", "Apenas administradores podem criar reservas pelo painel."],
  ];
  const hit = map.find(([code]) => message.includes(code));
  return hit ? hit[1] : "Não foi possível criar a reserva. Tente novamente.";
}

export async function adminCreateBooking(input: AdminBookingInput): Promise<OpResult<{ id: string }>> {
  if (DEMO_MODE) return { ok: false, error: DEMO_UNAVAILABLE };
  const sb = getSupabaseBrowserClient();
  const isStay = input.kind === "stay";
  const { data, error } = await sb.rpc("admin_create_booking", {
    p_kind: input.kind,
    p_property_id: isStay ? input.propertyId || null : null,
    p_departure_id: isStay ? null : input.departureId || null,
    p_adults: input.adults,
    p_children: input.children,
    p_check_in: isStay ? input.checkIn || null : null,
    p_check_out: isStay ? input.checkOut || null : null,
    p_customer_id: input.customerId || null,
    p_customer_note: input.note || null,
    p_contact_phone: input.phone || null,
    p_auto_confirm: input.autoConfirm,
  });
  if (error) return { ok: false, error: bookingError(error.message) };
  return { ok: true, id: String(data) };
}

// ---------------------------------------------------------------------------
// SAÍDAS DE PASSEIOS (necessárias para existir reserva de passeio)
// ---------------------------------------------------------------------------
export interface AdminDepartureRow {
  id: string;
  startsAt: string;
  capacity: number;
  seatsBooked: number;
  status: "open" | "blocked" | "cancelled";
  priceOverrideCents: number | null;
}

export async function fetchAdminTours(): Promise<{ id: string; name: string; orgName: string }[]> {
  if (DEMO_MODE) return [];
  const sb = getSupabaseBrowserClient();
  const { data } = await sb
    .from("services")
    .select("id, name, organization:organizations(name)")
    .order("name", { ascending: true })
    .limit(300);
  return ((data ?? []) as Record<string, unknown>[]).map((t) => ({
    id: String(t.id),
    name: String(t.name),
    orgName: String((t.organization as { name?: string } | null)?.name ?? "—"),
  }));
}

export async function fetchTourDepartures(serviceId: string): Promise<AdminDepartureRow[]> {
  if (DEMO_MODE) return [];
  const sb = getSupabaseBrowserClient();
  const { data } = await sb
    .from("departures")
    .select("id, starts_at, capacity, seats_booked, status, price_override_cents")
    .eq("service_id", serviceId)
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(120);
  return ((data ?? []) as Record<string, unknown>[]).map((d) => ({
    id: String(d.id),
    startsAt: String(d.starts_at),
    capacity: Number(d.capacity),
    seatsBooked: Number(d.seats_booked),
    status: d.status as AdminDepartureRow["status"],
    priceOverrideCents: (d.price_override_cents as number) ?? null,
  }));
}

export async function createTourDeparture(
  serviceId: string,
  input: { startsAt: string; capacity: number; priceOverrideCents?: number | null }
): Promise<OpResult> {
  if (DEMO_MODE) return { ok: false, error: DEMO_UNAVAILABLE };
  return createDeparture(serviceId, input);
}

export async function setTourDepartureStatus(id: string, status: AdminDepartureRow["status"]): Promise<OpResult> {
  if (DEMO_MODE) return { ok: false, error: DEMO_UNAVAILABLE };
  return setDepartureStatus(id, status);
}
