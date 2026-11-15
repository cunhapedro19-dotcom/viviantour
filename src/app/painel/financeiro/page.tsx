"use client";

import { useEffect, useState } from "react";
import { KpiCard } from "@/components/panel/KpiCard";
import { BookingStatusBadge } from "@/components/StatusBadge";
import { formatBRL, formatDateRange, formatDateTimeShort } from "@/lib/format";
import { fetchOrgBookings } from "@/lib/panel-ops";
import { usePanelUser } from "@/lib/use-panel-user";
import type { Booking, PaymentStatus } from "@/lib/types";

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  pending: "pendente",
  paid: "pago",
  failed: "recusado",
  refunded: "reembolsado",
};

export default function FinanceiroPage() {
  const { user } = usePanelUser();
  const [bookings, setBookings] = useState<Booking[] | null>(null);

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

  if (!user || bookings === null) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card h-24 animate-pulse" />
          ))}
        </div>
        <div className="card h-64 animate-pulse" />
      </div>
    );
  }

  const relevant = bookings.filter((b) => ["confirmed", "completed"].includes(b.status));
  const gross = relevant.reduce((s, b) => s + b.totalCents, 0);
  const commission = relevant.reduce((s, b) => s + b.commissionCents, 0);
  const net = relevant.reduce((s, b) => s + b.netCents, 0);
  const toReceive = relevant
    .filter((b) => {
      const date = b.kind === "stay" ? b.checkIn : (b.startsAt ?? "").slice(0, 10);
      return b.status === "confirmed" && date && date >= new Date().toISOString().slice(0, 10);
    })
    .reduce((s, b) => s + b.netCents, 0);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-tinta">Financeiro</h1>
        <p className="mt-1 text-sm text-tinta-mute">
          Valores das reservas confirmadas e concluídas, com comissões discriminadas.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Receita bruta" value={formatBRL(gross)} />
        <KpiCard label="Comissões Viviantourr" value={formatBRL(commission)} tone="info" />
        <KpiCard label="Receita líquida" value={formatBRL(net)} tone="success" />
        <KpiCard label="A receber (próximas)" value={formatBRL(toReceive)} hint="Reservas confirmadas futuras" />
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-areia-200 bg-areia-50 px-5 py-3">
          <h2 className="text-sm font-bold text-tinta">Transações</h2>
        </div>
        {relevant.length === 0 ? (
          <p className="p-6 text-sm text-tinta-mute">Nenhuma transação ainda.</p>
        ) : (
          <div className="divide-y divide-areia-200">
            {relevant.map((b) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <BookingStatusBadge status={b.status} />
                    <span className="text-xs font-semibold text-tinta-mute">{b.code}</span>
                  </div>
                  <p className="mt-1 font-medium text-tinta">{b.itemName}</p>
                  <p className="text-xs text-tinta-mute">
                    {b.customerName} ·{" "}
                    {b.kind === "stay" ? formatDateRange(b.checkIn, b.checkOut) : formatDateTimeShort(b.startsAt ?? "")}
                  </p>
                  {b.paymentStatus && (
                    <p className="mt-0.5 text-xs text-tinta-mute">
                      Pagamento: {b.paymentMethod ?? "manual"} · {PAYMENT_LABEL[b.paymentStatus]}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-tinta">{formatBRL(b.totalCents)}</p>
                  <p className="text-xs text-tinta-mute">
                    comissão −{formatBRL(b.commissionCents)} · líquido {formatBRL(b.netCents)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl bg-oceano-50 p-5 text-sm text-oceano-900">
        <strong>Sobre pagamentos:</strong> ao aceitar uma reserva, as datas ficam bloqueadas e o
        cliente recebe o link de pagamento — Checkout Pro do Mercado Pago (quando configurado) ou
        confirmação manual. A reserva é confirmada automaticamente quando o pagamento é aprovado, e
        o valor líquido já desconta a comissão. Repasses automáticos (split) e extratos por período
        são a próxima etapa.
      </div>
    </div>
  );
}
