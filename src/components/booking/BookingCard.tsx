"use client";

import Link from "next/link";
import { useState } from "react";
import { BookingStatusBadge } from "@/components/StatusBadge";
import { cancelBookingRequest } from "@/lib/booking-client";
import { DEMO_MODE } from "@/lib/config";
import { getStayById, getTourById } from "@/lib/demo-data";
import { updateBookingStatus } from "@/lib/demo-store";
import { formatDateRange, formatTime, formatBRL } from "@/lib/format";
import type { Booking } from "@/lib/types";

function coverFor(b: Booking): string {
  const stay = b.kind === "stay" ? getStayById(b.itemId) : null;
  const tour = b.kind === "tour" ? getTourById(b.itemId) : null;
  if (stay) return stay.images[0];
  if (tour) return tour.images[0];
  return `${b.itemSlug}-1`;
}

function dateLine(b: Booking): string {
  if (b.kind === "stay") return formatDateRange(b.checkIn, b.checkOut);
  const dia = b.startsAt
    ? new Date(b.startsAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    : "—";
  return `${dia} · ${formatTime(b.startsAt)}`;
}

export function BookingCard({
  booking,
  onChange,
  perspective = "customer",
}: {
  booking: Booking;
  onChange?: (b: Booking) => void;
  perspective?: "customer" | "provider";
}) {
  const [busy, setBusy] = useState(false);
  const cover = coverFor(booking);
  const href = booking.kind === "stay" ? `/hospedagem/${booking.itemSlug}` : `/passeio/${booking.itemSlug}`;

  async function cancel(reason: string) {
    if (!window.confirm("Confirmar o cancelamento desta reserva?")) return;
    setBusy(true);
    try {
      if (DEMO_MODE) {
        updateBookingStatus(booking.id, "cancelled", reason);
        onChange?.({ ...booking, status: "cancelled", cancellationReason: reason });
      } else {
        const result = await cancelBookingRequest(booking.id, reason);
        if (result.ok) onChange?.({ ...booking, status: "cancelled" });
      }
    } finally {
      setBusy(false);
    }
  }

  const cancellable = ["pending", "awaiting_payment", "confirmed"].includes(booking.status);

  return (
    <div className="card flex flex-col gap-4 overflow-hidden sm:flex-row">
      <Link href={href} className="relative block h-40 shrink-0 sm:h-auto sm:w-52">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <img
          src={`/img/${cover}.jpg`}
          alt={booking.itemName}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(e: any) => {
            e.currentTarget.src = "/img/hero-1.jpg";
          }}
        />
      </Link>
      <div className="flex flex-1 flex-col justify-between gap-3 p-4 pt-0 sm:py-4 sm:pl-0">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <BookingStatusBadge status={booking.status} />
            <span className="rounded-full bg-areia-100 px-2.5 py-1 text-xs font-semibold text-tinta-soft">
              {booking.code}
            </span>
          </div>
          <Link href={href} className="mt-2 block font-semibold leading-snug text-tinta hover:text-oceano-700">
            {booking.itemName}
          </Link>
          <p className="mt-1 text-sm text-tinta-mute">
            {booking.kind === "stay" ? "Hospedagem" : "Passeio"} · {dateLine(booking)} ·{" "}
            {booking.guestsTotal} {booking.guestsTotal === 1 ? "hóspede" : "hóspedes"}
          </p>
          {perspective === "provider" && (
            <p className="mt-1 text-sm text-tinta-mute">
              Cliente: <strong className="text-tinta-soft">{booking.customerName}</strong>
            </p>
          )}
          {booking.customerNote && perspective === "provider" && (
            <p className="mt-1 text-sm italic text-tinta-mute">“{booking.customerNote}”</p>
          )}
          {booking.cancellationReason && ["declined", "cancelled"].includes(booking.status) && (
            <p className="mt-1 text-xs text-tinta-mute">Motivo: {booking.cancellationReason}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <span className="font-bold text-tinta">{formatBRL(booking.totalCents)}</span>
            {perspective === "provider" && booking.commissionCents > 0 && (
              <span className="ml-2 text-xs text-tinta-mute">
                líquido {formatBRL(booking.netCents)}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {perspective === "customer" && cancellable && (
              <button
                type="button"
                disabled={busy}
                onClick={() => cancel("Cancelada pelo cliente.")}
                className="btn-danger btn-sm"
              >
                {busy ? "…" : "Cancelar"}
              </button>
            )}
            <Link href={href} className="btn-outline btn-sm">
              Ver anúncio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
