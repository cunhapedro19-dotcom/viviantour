"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarMonth } from "./CalendarMonth";
import { formatBRL, nightsBetween } from "@/lib/format";
import { DEMO_MODE } from "@/lib/config";
import { addBooking, listBookings } from "@/lib/demo-store";
import { createBookingRequest } from "@/lib/booking-client";

interface StayLite {
  id: string;
  slug: string;
  name: string;
  basePriceCents: number;
  cleaningFeeCents: number;
  minNights: number;
  capacity: number;
  orgId: string;
  orgName: string;
}

export function StayBookingWidget({
  stay,
  blockedDates,
}: {
  stay: StayLite;
  blockedDates: string[];
}) {
  const blocked = useMemo(() => new Set(blockedDates), [blockedDates]);
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [note, setNote] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCode, setSuccessCode] = useState<string | null>(null);

  const nights = nightsBetween(checkIn, checkOut);
  const guests = adults + children;
  const total = nights > 0 ? nights * stay.basePriceCents + stay.cleaningFeeCents : 0;

  const rangeHasBlocked = useMemo(() => {
    if (!checkIn || !checkOut) return false;
    let d = new Date(`${checkIn}T12:00:00`);
    const end = new Date(`${checkOut}T12:00:00`);
    while (d < end) {
      if (blocked.has(d.toISOString().slice(0, 10))) return true;
      d = new Date(d.getTime() + 24 * 3600 * 1000);
    }
    return false;
  }, [checkIn, checkOut, blocked]);

  function pickDate(iso: string) {
    setError(null);
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(iso);
      setCheckOut(null);
      return;
    }
    if (iso <= checkIn) {
      setCheckIn(iso);
      setCheckOut(null);
      return;
    }
    setCheckOut(iso);
  }

  function validation(): string | null {
    if (!checkIn || !checkOut) return "Escolha as datas de check-in e check-out no calendário.";
    if (nights < stay.minNights) return `Estadia mínima de ${stay.minNights} noite(s).`;
    if (guests < 1) return "Informe a quantidade de hóspedes.";
    if (guests > stay.capacity) return `Máximo de ${stay.capacity} hóspedes.`;
    if (rangeHasBlocked) return "Há datas ocupadas no período selecionado.";
    return null;
  }

  async function submit() {
    const problem = validation();
    if (problem) {
      setError(problem);
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      if (DEMO_MODE) {
        const conflict = listBookings().some(
          (b) =>
            b.kind === "stay" &&
            b.itemId === stay.id &&
            ["pending", "awaiting_payment", "confirmed"].includes(b.status) &&
            b.checkIn && b.checkOut &&
            checkIn! < b.checkOut && checkOut! > b.checkIn
        );
        if (conflict) {
          setError("Há uma solicitação em andamento para esse período. Tente outras datas.");
          return;
        }
        const booking = addBooking({
          kind: "stay",
          item: { id: stay.id, slug: stay.slug, name: stay.name },
          orgId: stay.orgId,
          orgName: stay.orgName,
          checkIn: checkIn!,
          checkOut: checkOut!,
          nights,
          adults,
          children,
          totalCents: total,
          note,
        });
        setSuccessCode(booking.code);
        return;
      }

      // Modo Supabase — a checagem definitiva acontece no banco (RPC)
      const result = await createBookingRequest({
        kind: "stay",
        propertyId: stay.id,
        adults,
        children,
        checkIn: checkIn!,
        checkOut: checkOut!,
        note,
        phone,
      });
      if (!result.ok) {
        if (result.needsAuth) {
          window.location.href = `/entrar?next=/hospedagem/${stay.slug}`;
          return;
        }
        setError(result.error);
        return;
      }
      setSuccessCode("—");
    } finally {
      setSubmitting(false);
    }
  }

  if (successCode) {
    return (
      <div className="card sticky top-24 p-6 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-turquesa-100">
          <svg viewBox="0 0 24 24" className="h-7 w-7 fill-turquesa-600">
            <path d="M9 16.2l-3.5-3.5-1.4 1.4L9 19 20 8l-1.4-1.4z" />
          </svg>
        </span>
        <h3 className="mt-3 font-display text-xl font-semibold text-tinta">Solicitação enviada!</h3>
        <p className="mt-2 text-sm text-tinta-mute">
          {DEMO_MODE ? (
            <>
              Código <strong className="text-tinta">{successCode}</strong>. O fornecedor recebeu sua
              solicitação e vai responder em breve — acompanhe em “Minhas viagens”.
            </>
          ) : (
            <>O fornecedor recebeu sua solicitação e vai responder em breve.</>
          )}
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <Link href="/minhas-viagens" className="btn-primary btn-sm">
            Ver minhas viagens
          </Link>
          <button type="button" className="btn-ghost btn-sm" onClick={() => setSuccessCode(null)}>
            Fazer outra solicitação
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card sticky top-24 overflow-hidden">
      <div className="border-b border-areia-200 bg-areia-50 px-5 py-4">
        <p className="text-lg">
          <span className="font-bold text-tinta">{formatBRL(stay.basePriceCents)}</span>
          <span className="text-tinta-mute"> / noite</span>
        </p>
        {!DEMO_MODE && (
          <p className="text-xs text-tinta-mute">Reserva mediante confirmação do anfitrião</p>
        )}
        {DEMO_MODE && <p className="text-xs text-tinta-mute">Demonstração — solicitação simulada</p>}
      </div>

      <div className="space-y-4 p-5">
        <CalendarMonth blockedDates={blocked} checkIn={checkIn} checkOut={checkOut} onPick={pickDate} />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="w-adults">Adultos</label>
            <select id="w-adults" className="input" value={adults} onChange={(e) => setAdults(Number(e.target.value))}>
              {Array.from({ length: Math.max(1, stay.capacity) }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="w-children">Crianças</label>
            <select id="w-children" className="input" value={children} onChange={(e) => setChildren(Number(e.target.value))}>
              {Array.from({ length: Math.max(1, stay.capacity) }, (_, i) => i).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="w-note">Mensagem ao anfitrião (opcional)</label>
          <textarea
            id="w-note"
            className="input min-h-[70px]"
            placeholder="Horário de chegada, dúvidas…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="space-y-1.5 border-t border-areia-200 pt-4 text-sm">
          <Row label={`${formatBRL(stay.basePriceCents)} × ${nights || "—"} noite(s)`} value={nights > 0 ? formatBRL(nights * stay.basePriceCents) : "—"} />
          {stay.cleaningFeeCents > 0 && <Row label="Taxa de limpeza" value={formatBRL(stay.cleaningFeeCents)} />}
          <div className="flex justify-between border-t border-areia-200 pt-2 text-base font-bold text-tinta">
            <span>Total</span>
            <span>{total > 0 ? formatBRL(total) : "—"}</span>
          </div>
        </div>

        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        <button type="button" onClick={submit} disabled={submitting} className="btn-turquesa w-full">
          {submitting ? "Enviando…" : "Solicitar reserva"}
        </button>
        <p className="text-center text-xs text-tinta-mute">
          Você não será cobrado agora. O anfitrião confirma em até 24h.
        </p>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-tinta-soft">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
