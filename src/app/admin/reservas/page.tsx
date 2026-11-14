"use client";

import { useEffect, useState } from "react";
import { BookingStatusBadge } from "@/components/StatusBadge";
import { DEMO_MODE } from "@/lib/config";
import { formatBRL, formatDateRange, formatDateTimeShort } from "@/lib/format";
import { fetchAdminBookings } from "@/lib/admin-ops";
import type { Booking, BookingStatus } from "@/lib/types";

export default function AdminReservasPage() {
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [filter, setFilter] = useState<"todas" | BookingStatus>("todas");

  useEffect(() => {
    let active = true;
    fetchAdminBookings().then((b) => {
      if (active) setBookings(b);
    });
    return () => {
      active = false;
    };
  }, []);

  const filtered = (bookings ?? []).filter((b) => (filter === "todas" ? true : b.status === filter));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-tinta">Reservas</h1>
        <p className="mt-1 text-sm text-tinta-mute">
          Todas as reservas da plataforma, com comissões calculadas na confirmação.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {(["todas", "pending", "confirmed", "completed", "declined", "cancelled"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              filter === f ? "bg-oceano-600 text-white" : "border border-areia-200 bg-white text-tinta-soft hover:bg-areia-100"
            }`}
          >
            {f === "todas" ? "Todas" : labelOf(f)}
          </button>
        ))}
      </div>

      {bookings === null ? (
        <div className="card h-72 animate-pulse" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-areia-100 text-left text-xs font-semibold uppercase tracking-wide text-tinta-mute">
              <tr>
                <th className="px-5 py-3">Código</th>
                <th className="px-5 py-3">Anúncio</th>
                <th className="px-5 py-3">Fornecedor</th>
                <th className="px-5 py-3">Cliente</th>
                <th className="px-5 py-3">Data</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-areia-200">
              {filtered.map((b) => (
                <tr key={b.id}>
                  <td className="px-5 py-3.5 font-mono text-xs font-semibold text-tinta-soft">{b.code}</td>
                  <td className="px-5 py-3.5 font-medium text-tinta">{b.itemName}</td>
                  <td className="px-5 py-3.5 text-tinta-soft">{b.orgName || "—"}</td>
                  <td className="px-5 py-3.5 text-tinta-soft">{b.customerName}</td>
                  <td className="px-5 py-3.5 text-tinta-soft">
                    {b.kind === "stay" ? formatDateRange(b.checkIn, b.checkOut) : formatDateTimeShort(b.startsAt ?? "")}
                  </td>
                  <td className="px-5 py-3.5">
                    <BookingStatusBadge status={b.status} />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <p className="font-semibold text-tinta">{formatBRL(b.totalCents)}</p>
                    {b.commissionCents > 0 && (
                      <p className="text-xs text-tinta-mute">líquido {formatBRL(b.netCents)}</p>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-tinta-mute">
                    Nenhuma reserva neste filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {DEMO_MODE && (
        <p className="text-xs text-tinta-mute">
          Demonstração: as reservas exibidas são os dados de exemplo compartilhados entre os painéis.
        </p>
      )}
    </div>
  );
}

function labelOf(status: BookingStatus): string {
  const map: Record<BookingStatus, string> = {
    pending: "Pendentes",
    awaiting_payment: "Aguardando pagamento",
    confirmed: "Confirmadas",
    declined: "Recusadas",
    cancelled: "Canceladas",
    completed: "Concluídas",
  };
  return map[status];
}
