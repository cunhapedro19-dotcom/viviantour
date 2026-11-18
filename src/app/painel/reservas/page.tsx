"use client";

import { useEffect, useState } from "react";
import { BookingStatusBadge } from "@/components/StatusBadge";
import { formatBRL, formatDateTimeShort, formatDateRange } from "@/lib/format";
import { cancelBookingAsProvider, fetchOrgBookings, markBookingPaid, respondBooking } from "@/lib/panel-ops";
import { usePanelUser } from "@/lib/use-panel-user";
import type { Booking, BookingStatus } from "@/lib/types";

type Filter = "todas" | "pending" | "awaiting_payment" | "confirmed" | "completed" | "cancelled";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "pending", label: "Pendentes" },
  { value: "awaiting_payment", label: "Aguardando pagamento" },
  { value: "confirmed", label: "Confirmadas" },
  { value: "completed", label: "Concluídas" },
  { value: "cancelled", label: "Canceladas / recusadas" },
];

export default function ReservasPage() {
  const { user } = usePanelUser();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [filter, setFilter] = useState<Filter>("todas");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.orgId) return;
    let active = true;
    fetchOrgBookings(user.orgId).then((b) => {
      if (active) setBookings(b);
    });
    return () => {
      active = false;
    };
  }, [user?.orgId]);

  async function reload() {
    if (user?.orgId) setBookings(await fetchOrgBookings(user.orgId));
  }

  async function act(booking: Booking, action: "accept" | "decline" | "cancel" | "paid") {
    setBusyId(booking.id);
    let result;
    if (action === "accept") {
      result = await respondBooking(booking.id, true);
    } else if (action === "decline") {
      const reason = window.prompt("Motivo da recusa (opcional):") ?? undefined;
      result = await respondBooking(booking.id, false, reason);
    } else if (action === "paid") {
      if (!window.confirm("Confirmar que o pagamento desta reserva foi recebido?")) { setBusyId(null); return; }
      result = await markBookingPaid(booking.id);
    } else {
      if (!window.confirm("Cancelar esta reserva? O cliente será notificado.")) {
        setBusyId(null);
        return;
      }
      result = await cancelBookingAsProvider(booking.id, "Cancelada pelo fornecedor.");
    }
    setBusyId(null);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    reload();
  }

  function contact(booking: Booking) {
    const phone = booking.contactPhone?.replace(/\D/g, "");
    if (!phone) { window.alert("Este cliente não informou telefone nesta reserva."); return; }
    window.open(`https://wa.me/${phone.startsWith("55") ? phone : `55${phone}`}?text=${encodeURIComponent(`Olá, ${booking.customerName}! Estou entrando em contato sobre a reserva ${booking.code}.`)}`, "_blank", "noopener,noreferrer");
  }

  const filtered = (bookings ?? []).filter((b) => {
    if (filter === "todas") return true;
    if (filter === "cancelled") return ["cancelled", "declined"].includes(b.status);
    return b.status === (filter as BookingStatus);
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-tinta">Reservas</h1>
        <p className="mt-1 text-sm text-tinta-mute">
          Solicitações chegam como <strong>pendentes</strong>. Ao aceitar, o cliente recebe o
          link de pagamento e a reserva é confirmada automaticamente quando ele paga.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const count =
            f.value === "todas"
              ? bookings?.length ?? 0
              : f.value === "cancelled"
              ? (bookings ?? []).filter((b) => ["cancelled", "declined"].includes(b.status)).length
              : (bookings ?? []).filter((b) => b.status === f.value).length;
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                filter === f.value ? "bg-oceano-600 text-white" : "border border-areia-200 bg-white text-tinta-soft hover:bg-areia-100"
              }`}
            >
              {f.label} ({count})
            </button>
          );
        })}
      </div>

      {bookings === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card h-28 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="card p-8 text-sm text-tinta-mute">Nenhuma reserva neste filtro.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => (
            <div key={b.id} className="card p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <BookingStatusBadge status={b.status} />
                    <span className="rounded-full bg-areia-100 px-2.5 py-1 text-xs font-semibold text-tinta-soft">{b.code}</span>
                    <span className="rounded-full bg-oceano-50 px-2.5 py-1 text-xs font-semibold text-oceano-700">
                      {b.kind === "stay" ? "Hospedagem" : "Passeio"}
                    </span>
                  </div>
                  <h2 className="mt-2 font-semibold text-tinta">{b.itemName}</h2>
                  <p className="text-sm text-tinta-mute">
                    Cliente: <strong className="text-tinta-soft">{b.customerName}</strong> ·{" "}
                    {b.kind === "stay"
                      ? formatDateRange(b.checkIn, b.checkOut)
                      : formatDateTimeShort(b.startsAt ?? "")}{" "}
                    · {b.adults} adulto(s)
                    {b.children > 0 ? `, ${b.children} criança(s)` : ""}
                  </p>
                  {b.customerNote && <p className="mt-1.5 text-sm italic text-tinta-mute">“{b.customerNote}”</p>}
                  {b.cancellationReason && ["declined", "cancelled"].includes(b.status) && (
                    <p className="mt-1.5 text-xs text-tinta-mute">Motivo: {b.cancellationReason}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm text-tinta-mute">Bruto</p>
                  <p className="font-bold text-tinta">{formatBRL(b.totalCents)}</p>
                  {b.commissionCents > 0 && (
                    <>
                      <p className="mt-1 text-xs text-tinta-mute">
                        comissão −{formatBRL(b.commissionCents)}
                      </p>
                      <p className="text-sm font-semibold text-emerald-600">líquido {formatBRL(b.netCents)}</p>
                    </>
                  )}
                </div>
              </div>

              {b.status === "pending" && (
                <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-areia-200 pt-4">
                  <button type="button" disabled={busyId === b.id} onClick={() => act(b, "decline")} className="btn-danger btn-sm">
                    Recusar
                  </button>
                  <button type="button" disabled={busyId === b.id} onClick={() => act(b, "accept")} className="btn-turquesa btn-sm">
                    Aceitar reserva
                  </button>
                </div>
              )}
              {["confirmed", "awaiting_payment"].includes(b.status) && (
                <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-areia-200 pt-4">
                  {b.status === "awaiting_payment" && <button type="button" disabled={busyId === b.id} onClick={() => act(b, "paid")} className="btn-turquesa btn-sm">Marcar como pago</button>}
                  <button type="button" onClick={() => contact(b)} className="btn-outline btn-sm">Falar com cliente</button>
                  <button type="button" disabled={busyId === b.id} onClick={() => act(b, "cancel")} className="btn-danger btn-sm">
                    Cancelar reserva
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
