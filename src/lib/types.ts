// Tipos compartilhados entre modo demonstração e modo Supabase.

export type Role = "admin" | "owner" | "provider" | "customer";

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

export type TourKind = "boat_tour" | "experience" | "guide";

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
  neighborhood: string;
  city: string;
  state: string;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  basePriceCents: number;
  cleaningFeeCents: number;
  minNights: number;
  rules?: string | null;
  status: ListingStatus;
  rating: number;
  reviewsCount: number;
  images: string[]; // nomes de arquivo em /img (sem extensão)
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
  durationMinutes: number;
  meetingPoint: string;
  itinerary: { order: number; title: string; description?: string }[];
  included: string[];
  pricePerPersonCents: number;
  childPriceCents?: number | null;
  minGuests: number;
  maxGuests: number;
  vesselName?: string | null;
  status: ListingStatus;
  rating: number;
  reviewsCount: number;
  images: string[];
  featured?: boolean;
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
  customerNote?: string | null;
  cancellationReason?: string | null;
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
};

export type NewTourInput = {
  name: string;
  categoryId: string;
  categoryLabel: string;
  kind: TourKind;
  durationMinutes: number;
  meetingPoint: string;
  pricePerPersonCents: number;
  maxGuests: number;
  minGuests: number;
  summary: string;
  description: string;
  itinerary: string[];
  included: string[];
  imageSeeds: string[];
};
