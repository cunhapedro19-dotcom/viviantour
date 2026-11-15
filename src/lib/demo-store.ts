"use client";

// ============================================================================
// DEMO STORE — persistência no navegador para o MODO DEMONSTRAÇÃO.
// Simula o ciclo de vida real (solicitação → aceitação → confirmação →
// cancelamento/conclusão) usando localStorage. No modo Supabase, todo esse
// fluxo acontece de verdade via RPCs e Row Level Security.
// ============================================================================

import { addDays } from "date-fns";
import { demoOrganizations, getStayById, getTourById } from "./demo-data";
import type {
  Booking,
  BookingStatus,
  DemoUser,
  Departure,
  ExternalCalendarView,
  PaymentStatus,
  PaymentView,
  PropertyBlock,
  Review,
  Stay,
  Tour,
} from "./types";

const KEYS = {
  user: "vt:user",
  bookings: "vt:bookings",
  payments: "vt:payments",
  favorites: "vt:favs",
  stays: "vt:stays",
  tours: "vt:tours",
  departures: "vt:departures",
  blocks: "vt:blocks",
  icals: "vt:icals",
} as const;

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function randomCode(): string {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `VT-${s}`;
}

// ---------------------------------------------------------------------------
// Usuário demonstração
// ---------------------------------------------------------------------------
export function getDemoUser(): DemoUser | null {
  return read<DemoUser | null>(KEYS.user, null);
}

export function setDemoUser(user: DemoUser | null): void {
  write(KEYS.user, user);
}

// ---------------------------------------------------------------------------
// Reservas (com seed inicial narrado)
// ---------------------------------------------------------------------------
function seedBookings(): Booking[] {
  const now = new Date();
  const iso = (d: Date) => d.toISOString();
  const day = (n: number) => iso(addDays(now, n));
  const daysAgo = (n: number) => iso(addDays(now, -n));
  const at = (d: Date, h: number, m: number) => {
    const x = new Date(d);
    x.setHours(h, m, 0, 0);
    return x;
  };

  const ana = "Ana Costa";
  const escuna = getTourById("tour-1");
  const saveiro = getTourById("tour-5");
  const lancha = getTourById("tour-2");
  const casaPeNaAreia = getStayById("stay-4");
  const casaVista = getStayById("stay-1");
  const flat = getStayById("stay-5");
  const studio = getStayById("stay-8");
  const orgOp1 = demoOrganizations.find((o) => o.id === "org-op-1")?.name ?? "";
  const orgOp2 = demoOrganizations.find((o) => o.id === "org-op-2")?.name ?? "";
  const orgHost1 = demoOrganizations.find((o) => o.id === "org-host-1")?.name ?? "";
  const orgHost2 = demoOrganizations.find((o) => o.id === "org-host-2")?.name ?? "";

  const d2 = at(addDays(now, 2), 10, 0);
  const d5 = at(addDays(now, 5), 10, 0);
  const dm3 = at(addDays(now, -3), 16, 30);
  const d3 = at(addDays(now, 3), 9, 0);

  return [
    {
      id: "bk-1", code: "VT-KM7Q2P4X", kind: "tour",
      itemId: "tour-1", itemSlug: "escuna-6-praias", itemName: escuna?.name ?? "Escuna 6 praias",
      orgId: "org-op-1", orgName: orgOp1, status: "pending",
      startsAt: iso(d2), endsAt: iso(new Date(d2.getTime() + 210 * 60000)),
      adults: 2, children: 0, guestsTotal: 2, totalCents: 24000, commissionCents: 0, netCents: 0,
      customerName: ana, customerNote: "É a nossa primeira vez em Arraial — podemos sentar na parte da frente?", createdAt: daysAgo(1),
    },
    {
      id: "bk-2", code: "VT-QR93TZ7A", kind: "tour",
      itemId: "tour-1", itemSlug: "escuna-6-praias", itemName: escuna?.name ?? "Escuna 6 praias",
      orgId: "org-op-1", orgName: orgOp1, status: "confirmed",
      startsAt: iso(d5), endsAt: iso(new Date(d5.getTime() + 210 * 60000)),
      adults: 4, children: 1, guestsTotal: 5, totalCents: 54000, commissionCents: 5400, netCents: 48600,
      customerName: ana, createdAt: daysAgo(3),
    },
    {
      id: "bk-3", code: "VT-BX41MW8K", kind: "tour",
      itemId: "tour-5", itemSlug: "por-do-sol-saveiro", itemName: saveiro?.name ?? "Pôr do sol de saveiro",
      orgId: "org-op-1", orgName: orgOp1, status: "completed",
      startsAt: iso(dm3), endsAt: iso(new Date(dm3.getTime() + 105 * 60000)),
      adults: 2, children: 0, guestsTotal: 2, totalCents: 30000, commissionCents: 3000, netCents: 27000,
      customerName: ana, createdAt: daysAgo(9),
    },
    {
      id: "bk-4", code: "VT-HD52RC6N", kind: "stay",
      itemId: "stay-4", itemSlug: "casa-pe-na-areia-praia-grande", itemName: casaPeNaAreia?.name ?? "Casa pé na areia",
      orgId: "org-host-1", orgName: orgHost1, status: "completed",
      checkIn: day(-20), checkOut: day(-14), nights: 6,
      adults: 8, children: 2, guestsTotal: 10, totalCents: 608000, commissionCents: 60800, netCents: 547200,
      customerName: ana, createdAt: daysAgo(40),
    },
    {
      id: "bk-5", code: "VT-JP88FD3T", kind: "stay",
      itemId: "stay-1", itemSlug: "casa-vista-atalaia", itemName: casaVista?.name ?? "Casa Vista Atalaia",
      orgId: "org-host-1", orgName: orgHost1, status: "confirmed",
      checkIn: day(10), checkOut: day(14), nights: 4,
      adults: 6, children: 0, guestsTotal: 6, totalCents: 315000, commissionCents: 31500, netCents: 283500,
      customerName: ana, customerNote: "Comemorando aniversário de casamento! Podemos chegar por volta das 15h?", createdAt: daysAgo(2),
    },
    {
      id: "bk-6", code: "VT-CT65BQ9L", kind: "stay",
      itemId: "stay-5", itemSlug: "flat-das-prainhas", itemName: flat?.name ?? "Flat das Prainhas",
      orgId: "org-host-2", orgName: orgHost2, status: "pending",
      checkIn: day(7), checkOut: day(9), nights: 2,
      adults: 2, children: 0, guestsTotal: 2, totalCents: 71000, commissionCents: 0, netCents: 0,
      customerName: ana, createdAt: daysAgo(0.5),
    },
    {
      id: "bk-7", code: "VT-VN19XY5S", kind: "tour",
      itemId: "tour-2", itemSlug: "lancha-gruta-azul", itemName: lancha?.name ?? "Lancha privativa",
      orgId: "org-op-1", orgName: orgOp1, status: "declined",
      startsAt: iso(d3), endsAt: iso(new Date(d3.getTime() + 120 * 60000)),
      adults: 4, children: 0, guestsTotal: 4, totalCents: 76000, commissionCents: 0, netCents: 0,
      customerName: ana, cancellationReason: "Sem disponibilidade na data solicitada — a lancha está em manutenção.", createdAt: daysAgo(4),
    },
    {
      id: "bk-8", code: "VT-GF37KL2D", kind: "stay",
      itemId: "stay-8", itemSlug: "studio-praia-do-pontal", itemName: studio?.name ?? "Studio Praia do Pontal",
      orgId: "org-host-1", orgName: orgHost1, status: "cancelled",
      checkIn: day(12), checkOut: day(13), nights: 1,
      adults: 2, children: 0, guestsTotal: 2, totalCents: 47000, commissionCents: 0, netCents: 0,
      customerName: ana, cancellationReason: "Imprevisto no trabalho.", createdAt: daysAgo(5),
    },
  ];
}

export function listBookings(): Booking[] {
  const existing = read<Booking[] | null>(KEYS.bookings, null);
  if (existing && existing.length > 0) return existing;
  const seeded = seedBookings();
  write(KEYS.bookings, seeded);
  return seeded;
}

export function addBooking(input: {
  kind: "stay" | "tour";
  item: { id: string; slug: string; name: string };
  orgId: string;
  orgName: string;
  checkIn?: string;
  checkOut?: string;
  nights?: number;
  startsAt?: string;
  endsAt?: string;
  adults: number;
  children: number;
  totalCents: number;
  note?: string;
}): Booking {
  const booking: Booking = {
    id: `bk-${Date.now()}`,
    code: randomCode(),
    kind: input.kind,
    itemId: input.item.id,
    itemSlug: input.item.slug,
    itemName: input.item.name,
    orgId: input.orgId,
    orgName: input.orgName,
    status: "pending",
    checkIn: input.checkIn ?? null,
    checkOut: input.checkOut ?? null,
    nights: input.nights ?? null,
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
    adults: input.adults,
    children: input.children,
    guestsTotal: input.adults + input.children,
    totalCents: input.totalCents,
    commissionCents: 0,
    netCents: 0,
    customerName: getDemoUser()?.name ?? "Você",
    customerNote: input.note ?? null,
    createdAt: new Date().toISOString(),
  };
  const all = listBookings();
  write(KEYS.bookings, [booking, ...all]);
  return booking;
}

export function updateBookingStatus(id: string, status: BookingStatus, reason?: string): void {
  const all = listBookings();
  const next = all.map((b) => {
    if (b.id !== id) return b;
    const updated = { ...b, status, cancellationReason: reason ?? b.cancellationReason };
    if (status === "awaiting_payment" || status === "confirmed") {
      // espelha a regra da RPC respond_booking: comissão padrão de 10%,
      // calculada quando o fornecedor aceita (antes do pagamento)
      if (updated.commissionCents === 0) {
        const commission = Math.round(b.totalCents * 0.1);
        updated.commissionCents = commission;
        updated.netCents = b.totalCents - commission;
      }
    }
    if (status === "cancelled" || status === "declined") {
      // pagamento pago vira reembolso (espelha cancel_booking na migração 0002)
      const payment = getPaymentByBooking(id);
      if (payment && payment.status === "paid") {
        updatePaymentStatus(id, "refunded", null);
      }
    }
    return updated;
  });
  write(KEYS.bookings, next);
}

export function getBooking(id: string): Booking | undefined {
  return listBookings().find((b) => b.id === id);
}

// ---------------------------------------------------------------------------
// Pagamentos (ciclo: pendente → pago/recusado; pago vira reembolso no cancelamento)
// ---------------------------------------------------------------------------
function seedPayments(): PaymentView[] {
  const mk = (
    id: string,
    bookingId: string,
    status: PaymentStatus,
    method: string,
    daysAgo: number
  ): PaymentView => {
    const booking = listBookings().find((b) => b.id === bookingId);
    return {
      id,
      bookingId,
      status,
      method,
      provider: "demo",
      providerRef: `demo-${id}`,
      amountCents: booking?.totalCents ?? 0,
      createdAt: new Date(Date.now() - daysAgo * 86400000).toISOString(),
    };
  };
  return [
    mk("pay-1", "bk-2", "paid", "pix", 3),
    mk("pay-2", "bk-3", "paid", "cartao", 9),
    mk("pay-3", "bk-4", "paid", "pix", 40),
    mk("pay-4", "bk-5", "paid", "cartao", 2),
  ];
}

export function listPayments(): PaymentView[] {
  const existing = read<PaymentView[] | null>(KEYS.payments, null);
  if (existing) return existing;
  const seeded = seedPayments();
  write(KEYS.payments, seeded);
  return seeded;
}

export function getPaymentByBooking(bookingId: string): PaymentView | undefined {
  return listPayments().find((p) => p.bookingId === bookingId);
}

export function createPayment(payment: PaymentView): void {
  write(KEYS.payments, [payment, ...listPayments()]);
}

export function updatePaymentStatus(
  bookingId: string,
  status: PaymentStatus,
  method: string | null
): void {
  write(
    KEYS.payments,
    listPayments().map((p) =>
      p.bookingId === bookingId
        ? { ...p, status, method: method ?? p.method, createdAt: p.createdAt }
        : p
    )
  );
}

// ---------------------------------------------------------------------------
// Favoritos
// ---------------------------------------------------------------------------
export interface FavoriteEntry { kind: "stay" | "tour"; id: string }

export function listFavorites(): FavoriteEntry[] {
  return read<FavoriteEntry[]>(KEYS.favorites, []);
}

export function isFavorite(kind: "stay" | "tour", id: string): boolean {
  return listFavorites().some((f) => f.kind === kind && f.id === id);
}

export function toggleFavorite(kind: "stay" | "tour", id: string): void {
  const list = listFavorites();
  const exists = list.some((f) => f.kind === kind && f.id === id);
  const next = exists ? list.filter((f) => !(f.kind === kind && f.id === id)) : [...list, { kind, id }];
  write(KEYS.favorites, next);
}

// ---------------------------------------------------------------------------
// Anúncios criados no modo demo (painel do fornecedor)
// ---------------------------------------------------------------------------
export function listCreatedStays(): Stay[] {
  return read<Stay[]>(KEYS.stays, []);
}

export function addCreatedStay(stay: Stay): void {
  write(KEYS.stays, [stay, ...listCreatedStays()]);
}

export function updateCreatedStay(id: string, patch: Partial<Stay>): void {
  write(
    KEYS.stays,
    listCreatedStays().map((s) => (s.id === id ? { ...s, ...patch } : s))
  );
}

export function getCreatedStay(id: string): Stay | undefined {
  return listCreatedStays().find((s) => s.id === id);
}

export function listCreatedTours(): Tour[] {
  return read<Tour[]>(KEYS.tours, []);
}

export function addCreatedTour(tour: Tour): void {
  write(KEYS.tours, [tour, ...listCreatedTours()]);
}

export function updateCreatedTour(id: string, patch: Partial<Tour>): void {
  write(
    KEYS.tours,
    listCreatedTours().map((t) => (t.id === id ? { ...t, ...patch } : t))
  );
}

export function getCreatedTour(id: string): Tour | undefined {
  return listCreatedTours().find((t) => t.id === id);
}

// ---------------------------------------------------------------------------
// Saídas operacionais criadas no modo demo
// ---------------------------------------------------------------------------
export function listCreatedDepartures(): Departure[] {
  return read<Departure[]>(KEYS.departures, []);
}

export function addCreatedDeparture(dep: Departure): void {
  write(KEYS.departures, [dep, ...listCreatedDepartures()]);
}

export function setCreatedDepartureStatus(id: string, status: Departure["status"]): void {
  write(
    KEYS.departures,
    listCreatedDepartures().map((d) => (d.id === id ? { ...d, status } : d))
  );
}

// ---------------------------------------------------------------------------
// Bloqueios manuais e calendários externos (modo demo)
// ---------------------------------------------------------------------------
export function listManualBlocks(): PropertyBlock[] {
  return read<PropertyBlock[]>(KEYS.blocks, []);
}

export function addManualBlock(block: PropertyBlock): void {
  write(KEYS.blocks, [...listManualBlocks(), block]);
}

export function removeManualBlock(id: string): void {
  write(KEYS.blocks, listManualBlocks().filter((b) => b.id !== id));
}

export function listExternalCalendars(): ExternalCalendarView[] {
  return read<ExternalCalendarView[]>(KEYS.icals, []);
}

export function addExternalCalendar(cal: ExternalCalendarView): void {
  write(KEYS.icals, [...listExternalCalendars(), cal]);
}

export function removeExternalCalendar(id: string): void {
  write(KEYS.icals, listExternalCalendars().filter((c) => c.id !== id));
}

// ---------------------------------------------------------------------------
// Reset geral (para explorar o modo demo do zero)
// ---------------------------------------------------------------------------
export function resetDemoData(): void {
  if (typeof window === "undefined") return;
  Object.values(KEYS).forEach((k) => window.localStorage.removeItem(k));
}
