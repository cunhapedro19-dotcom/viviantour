import { BOOKING_STATUS_LABEL, BOOKING_STATUS_TONE, LISTING_STATUS_LABEL } from "@/lib/format";
import type { BookingStatus } from "@/lib/types";

const TONES: Record<string, string> = {
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  info: "bg-sky-50 text-sky-700 border-sky-200",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  danger: "bg-red-50 text-red-700 border-red-200",
  neutral: "bg-areia-100 text-tinta-soft border-areia-300",
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const tone = TONES[BOOKING_STATUS_TONE[status]] ?? TONES.neutral;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}>
      {BOOKING_STATUS_LABEL[status]}
    </span>
  );
}

export function ListingStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    published: TONES.success,
    pending_review: TONES.warning,
    draft: TONES.neutral,
    rejected: TONES.danger,
    paused: TONES.info,
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${map[status] ?? TONES.neutral}`}>
      {LISTING_STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function OrgStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: TONES.success,
    pending: TONES.warning,
    suspended: TONES.danger,
    rejected: TONES.neutral,
  };
  const labels: Record<string, string> = {
    active: "Ativo",
    pending: "Pendente de aprovação",
    suspended: "Suspenso",
    rejected: "Recusado",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${map[status] ?? TONES.neutral}`}>
      {labels[status] ?? status}
    </span>
  );
}
