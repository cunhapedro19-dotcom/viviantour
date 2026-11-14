import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { BookingStatus } from "./types";

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatBRLShort(cents: number): string {
  const value = cents / 100;
  if (value >= 1000 && Number.isInteger(value)) {
    return `R$ ${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`;
  }
  return formatBRL(cents);
}

export function formatDate(d: string | Date, pattern = "d 'de' MMM 'de' yyyy"): string {
  const date = typeof d === "string" ? parseISO(d) : d;
  return format(date, pattern, { locale: ptBR });
}

export function formatDateShort(d: string | Date): string {
  return formatDate(d, "dd MMM");
}

export function formatDateRange(a?: string | null, b?: string | null): string {
  if (!a || !b) return "—";
  const da = parseISO(a);
  const db = parseISO(b);
  if (da.getMonth() === db.getMonth()) {
    return `${format(da, "d", { locale: ptBR })} – ${format(db, "d MMM yyyy", { locale: ptBR })}`;
  }
  return `${format(da, "d MMM", { locale: ptBR })} – ${format(db, "d MMM yyyy", { locale: ptBR })}`;
}

export function formatTime(iso?: string | null): string {
  if (!iso) return "—";
  return format(parseISO(iso), "HH'h'mm", { locale: ptBR });
}

export function formatDateTimeShort(d: string | Date): string {
  const date = typeof d === "string" ? parseISO(d) : d;
  const text = format(date, "EEE, dd 'de' MMM", { locale: ptBR });
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function nightsBetween(checkIn?: string | null, checkOut?: string | null): number {
  if (!checkIn || !checkOut) return 0;
  return differenceInCalendarDays(parseISO(checkOut), parseISO(checkIn));
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, "0")}`;
}

export const BOOKING_STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Pendente",
  awaiting_payment: "Aguardando pagamento",
  confirmed: "Confirmada",
  declined: "Recusada",
  cancelled: "Cancelada",
  completed: "Concluída",
};

export const BOOKING_STATUS_TONE: Record<
  BookingStatus,
  "warning" | "info" | "success" | "danger" | "neutral"
> = {
  pending: "warning",
  awaiting_payment: "info",
  confirmed: "success",
  declined: "danger",
  cancelled: "neutral",
  completed: "info",
};

export const LISTING_STATUS_LABEL: Record<string, string> = {
  draft: "Rascunho",
  pending_review: "Em análise",
  published: "Publicado",
  rejected: "Recusado",
  paused: "Pausado",
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
