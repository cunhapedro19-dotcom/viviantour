"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { KpiCard } from "@/components/panel/KpiCard";
import { BookingStatusBadge } from "@/components/StatusBadge";
import { DEMO_MODE } from "@/lib/config";
import { formatBRL, formatTime, nightsBetween } from "@/lib/format";
import { fetchOrgBookings, respondBooking } from "@/lib/panel-ops";
import { usePanelUser } from "@/lib/use-panel-user";
import type { Booking } from "@/lib/types";

export default function PainelOverviewPage() {
  const { user } = usePanelUser();
  const [bookings, setBookings] = useState<Booking[] | null>(null);
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

  async function act(booking: Booking, accept: boolean) {
    if (!user?.orgId) return;
    setBusyId(booking.id);
    const reason = accept ? undefined : window.prompt("Motivo da recusa (opcional):") ?? undefined;
    const result = await respondBooking(booking.id, accept, reason);
    setBusyId(null);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    const updated = await fetchOrgBookings(user.orgId!);
    setBookings(updated);
  }

  if (!user || bookings === null) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-56 animate-pulse rounded-xl bg-areia-200" />
        <div className="grid gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card h-24 animate-pulse" />
          ))}
        </div>
        <div className="card h-64 animate-pulse" />
      </div>
    );
  }

  const pending = bookings.filter((b) => b.status === "pending");
  const confirmedFuture = bookings.filter((b) => {
    if (b.status !== "confirmed") return false;
    const date = b.kind === "stay" ? b.checkIn : b.startsAt;
    return date ? date >= new Date().toISOString().slice(0, 10) : false;
  });
  const netRevenue = bookings
    .filter((b) => ["confirmed", "completed"].includes(b.status))
    .reduce((sum, b) => sum + b.netCents, 0);
  const commissionTotal = bookings
    .filter((b) => ["confirmed", "completed"].includes(b.status))
    .reduce((sum, b) => sum + b.commissionCents, 0);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-tinta">Olá, {user.name.split(" ")[0]} 👋</h1>
          <p className="mt-1 text-sm text-tinta-mute">
            {DEMO_MODE ? "Estes são dados de demonstração da sua operação." : "Acompanhe sua operação em tempo real."}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/painel/imoveis/novo" className="btn-outline btn-sm">
            + Hospedagem
          </Link>
          <Link href="/painel/passeios/novo" className="btn-primary btn-sm">
            + Passeio
          </Link>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Solicitações pendentes" value={String(pending.length)} tone={pending.length > 0 ? "warning" : "default"} hint="Respondam em até 24h" />
        <KpiCard label="Reservas confirmadas" value={String(confirmedFuture.length)} tone="success" hint="Próximas chegadas" />
        <KpiCard label="Receita líquida" value={formatBRL(netRevenue)} hint="Confirmada + concluída" />
        <KpiCard label="Comissões Viviantourr" value={formatBRL(commissionTotal)} tone="info" hint="10% sobre confirmadas" />
      </div>

      {/* SOLICITAÇÕES PENDENTES */}
      <section>
        <h2 className="section-title mb-4 text-lg">Aguardando sua resposta</h2>
        {pending.length === 0 ? (
          <p className="card p-6 text-sm text-tinta-mute">Nenhuma solicitação pendente. 👌</p>
        ) : (
          <div className="space-y-3">
            {pending.slice(0, 5).map((b) => (
              <div key={b.id} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <BookingStatusBadge status={b.status} />
                    <span className="text-xs font-semibold text-tinta-mute">{b.code}</span>
                  </div>
                  <p className="mt-1.5 font-semibold text-tinta">{b.itemName}</p>
                  <p className="text-sm text-tinta-mute">
                    {b.customerName} ·{" "}
                    {b.kind === "stay"
                      ? `${b.nights} noite(s) · check-in ${b.checkIn?.split("-").reverse().join("/")}`
                      : `${formatTime(b.startsAt)}`}{" "}
                    · {b.guestsTotal} hóspede(s) · {formatBRL(b.totalCents)}
                  </p>
                  {b.customerNote && <p className="mt-1 text-sm italic text-tinta-mute">“{b.customerNote}”</p>}
                </div>
                <div className="flex gap-2">
                  <button type="button" disabled={busyId === b.id} onClick={() => act(b, false)} className="btn-danger btn-sm">
                    Recusar
                  </button>
                  <button type="button" disabled={busyId === b.id} onClick={() => act(b, true)} className="btn-turquesa btn-sm">
                    Aceitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* PRÓXIMAS */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="section-title text-lg">Próximas reservas confirmadas</h2>
          <Link href="/painel/reservas" className="text-sm font-semibold text-oceano-600 hover:underline">
            Ver todas
          </Link>
        </div>
        {confirmedFuture.length === 0 ? (
          <p className="card p-6 text-sm text-tinta-mute">Sem reservas confirmadas futuras ainda.</p>
        ) : (
          <div className="card divide-y divide-areia-200">
            {confirmedFuture.slice(0, 6).map((b) => (
              <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
                <div>
                  <p className="font-semibold text-tinta">{b.itemName}</p>
                  <p className="text-sm text-tinta-mute">
                    {b.customerName} ·{" "}
                    {b.kind === "stay"
                      ? `${b.checkIn?.split("-").reverse().join("/")} → ${b.checkOut?.split("-").reverse().join("/")} (${nightsBetween(b.checkIn, b.checkOut)} noites)`
                      : `${b.startsAt ? new Date(b.startsAt).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-tinta-mute">{b.guestsTotal} pax</span>
                  <span className="font-semibold text-tinta">{formatBRL(b.totalCents)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
