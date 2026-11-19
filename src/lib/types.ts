// Tipos compartilhados entre modo demonstração e modo Supabase.
import type { MediaItem } from "./media-ops";

export type Role = "admin" | "owner" | "provider" | "customer";

// Modelo de monetização definido pela equipe em /admin/configuracoes.
export type MonetizationModel = "free" | "commission" | "subscription" | "hybrid";

export interface Monetization {
  model: MonetizationModel;
  percent: number; // comissão por reserva (%), usada em commission e hybrid
  monthlyFeeCents: number; // mensalidade, usada em subscription e hybrid
}

export type ListingStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "rejected"
  | "paused";

export type BookingStatus =
  | "pending"
  | "awaiting_payment"
  | "confirmed"
  | "declined"
  | "cancelled"
  | "completed";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type TourKind = "boat_tour" | "experience" | "guide";
export type TourPriceMode = "per_person" | "per_group";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  kind: "host" | "operator";
  status: "pending" | "active" | "suspended" | "rejected";
  bio?: string | null;
  city: string;
  state: string;
}

export interface Category {
  id: string;
  slug: string;
  label: string;
  kind: "stay" | "tour";
  icon?: string | null;
}

export interface Stay {
  id: string;
  slug: string;
  name: string;
  summary: string;
  description: string;
  categorySlug: string;
  categoryLabel: string;
  orgId: string;
  orgName: string;
  orgSlug: string;
  orgWhatsapp?: string | null;
  neighborhood: string;
  city: string;
  state: string;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  basePriceCents: number;
  /** Tarifa de sábado e domingo. Vazio = mesma tarifa de dias úteis. */
  weekendPriceCents?: number | null;
  cleaningFeeCents: number;
  minNights: number;
  /** Só é usado quando o anfitrião autoriza mostrar valores ao público. */
  showPublicPrices?: boolean;
  priceRules?: SeasonalPriceRule[];
  rules?: string | null;
  status: ListingStatus;
  rating: number;
  reviewsCount: number;
  images: string[]; // nomes de arquivo em /img (sem extensão) ou URLs do Storage
  videos?: string[]; // URLs de vídeos enviados
  amenityLabels: string[];
  featured?: boolean;
}

export interface Tour {
  id: string;
  slug: string;
  name: string;
  summary: string;
  description: string;
  categorySlug: string;
  categoryLabel: string;
  kind: TourKind;
  orgId: string;
  orgName: string;
  orgSlug: string;
  orgWhatsapp?: string | null;
  durationMinutes: number;
  meetingPoint: string;
  itinerary: { order: number; title: string; description?: string }[];
  included: string[];
  pricePerPersonCents: number;
  /** Define se o valor � individual ou fechado para um grupo. */
  priceMode?: TourPriceMode;
  /** Pessoas inclu�das no valor fechado do grupo. */
  priceGroupSize?: number | null;
  /** Tarifa de sábado e domingo. Vazio = mesma tarifa de dias úteis. */
  weekendPriceCents?: number | null;
  /** Menor valor entre o preço base e as temporadas publicadas. */
  startingPriceCents?: number;
  priceRules?: SeasonalPriceRule[];
  /** Última data que o operador aceita reservas, inclusiva. */
  bookingAvailableThrough?: string | null;
  childPriceCents?: number | null;
  minGuests: number;
  maxGuests: number;
  vesselName?: string | null;
  status: ListingStatus;
  rating: number;
  reviewsCount: number;
  images: string[];
  videos?: string[];
  featured?: boolean;
}

export interface SeasonalPriceRule {
  id: string;
  startsOn: string;
  /** Data exclusiva: 2027-01-06 representa disponibilidade até 05/01. */
  endsOn?: string | null;
  priceCents: number;
  priority?: number;
  ruleKind?: "seasonal" | "holiday" | "special";
  label?: string | null;
  details?: string | null;
}

export interface Departure {
  id: string;
  serviceId: string;
  startsAt: string; // ISO
  endsAt?: string | null;
  capacity: number;
  seatsBooked: number;
  status: "open" | "blocked" | "cancelled";
  priceOverrideCents?: number | null;
}

export interface Review {
  id: string;
  authorName: string;
  rating: number;
  title?: string | null;
  comment: string;
  date: string; // ISO
  reply?: string | null;
}

export interface Booking {
  id: string;
  code: string;
  kind: "stay" | "tour";
  itemId: string;
  itemSlug: string;
  itemName: string;
  orgId: string;
  orgName: string;
  status: BookingStatus;
  checkIn?: string | null;
  checkOut?: string | null;
  nights?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  adults: number;
  children: number;
  guestsTotal: number;
  totalCents: number;
  commissionCents: number;
  netCents: number;
  customerName: string;
  contactPhone?: string | null;
  customerNote?: string | null;
  cancellationReason?: string | null;
  paymentStatus?: PaymentStatus | null;
  paymentMethod?: string | null;
  createdAt: string;
}

/** Pagamento de uma reserva (vista simplificada para a UI). */
export interface PaymentView {
  id: string;
  bookingId: string;
  status: PaymentStatus;
  method: string | null; // pix | cartao | manual | payment_method_id do gateway
  provider: string | null; // mercadopago | demo | null (manual)
  providerRef: string | null; // id da cobrança no gateway
  amountCents: number;
  createdAt: string;
}

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  orgId?: string;
  orgName?: string;
}

export interface ExternalCalendarView {
  id: string;
  propertyId: string;
  source: string;
  label: string;
  active: boolean;
  nextSyncAt?: string | null;
  importedCount?: number;
  lastSyncedAt?: string | null;
  lastStatus?: string | null;
  lastError?: string | null;
}

export interface PropertyBlock {
  id: string;
  propertyId: string;
  startDate: string; // yyyy-MM-dd
  endDate: string; // yyyy-MM-dd (exclusivo)
  reason?: string | null;
}

export interface BookingRequestPayload {
  kind: "stay" | "tour";
  stayId?: string;
  tourId?: string;
  departureId?: string;
  checkIn?: string;
  checkOut?: string;
  startsAt?: string;
  adults: number;
  children: number;
  note?: string;
  phone?: string;
}

export type NewStayInput = {
  name: string;
  categoryId: string;
  categoryLabel: string;
  neighborhood: string;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  basePriceCents: number;
  cleaningFeeCents: number;
  minNights: number;
  summary: string;
  description: string;
  amenities: string[];
  imageSeeds: string[];
  media?: MediaItem[];
};

export type NewTourInput = {
  name: string;
  categoryId: string;
  categoryLabel: string;
  kind: TourKind;
  durationMinutes: number;
  meetingPoint: string;
  pricePerPersonCents: number;
  priceMode: TourPriceMode;
  priceGroupSize?: number | null;
  maxGuests: number;
  minGuests: number;
  summary: string;
  description: string;
  itinerary: string[];
  included: string[];
  imageSeeds: string[];
  media?: MediaItem[];
};
