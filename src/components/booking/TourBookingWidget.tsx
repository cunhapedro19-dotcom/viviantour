"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatBRL, formatDuration, formatTime } from "@/lib/format";
import { DEMO_MODE } from "@/lib/config";
import { addBooking } from "@/lib/demo-store";
import { createBookingRequest } from "@/lib/booking-client";
import type { Departure } from "@/lib/types";
import { tourPriceLabel } from "@/lib/tour-price";

interface TourLite {
  id: string;
  slug: string;
  name: string;
  pricePerPersonCents: number;
  priceMode?: "per_person" | "per_group";
  priceGroupSize?: number | null;
  childPriceCents?: number | null;
  minGuests: number;
  maxGuests: number;
  orgId: string;
  orgName: string;
  durationMinutes: number;
}

export function TourBookingWidget({ tour, departures }: { tour: TourLite; departures: Departure[] }) {
  const [selectedDepartureId, setSelectedDepartureId] = useState<string | null>(null);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [note, setNote] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCode, setSuccessCode] = useState<string | null>(null);

  const byDate = useMemo(() => {
    const map = new Map<string, Departure[]>();
    for (const d of departures) {
      if (d.status !== "open") continue;
      const key = d.startsAt.slice(0, 10);
      (map.get(key) ?? map.set(key, []).get(key)!).push(d);
    }
    return map;
  }, [departures]);

  const [activeDate, setActiveDate] = useState<string | null>(() => byDate.keys().next().value ?? null);

  const departure = departures.find((d) => d.id === selectedDepartureId) ?? null;
  const guests = adults + children;
  const priceMode = tour.priceMode ?? "per_person";
  const maxGuestsForPrice = priceMode === "per_group" ? Math.min(tour.maxGuests, Math.max(1, Number(tour.priceGroupSize) || tour.maxGuests)) : tour.maxGuests;
  const priceLabel = tourPriceLabel(priceMode, tour.priceGroupSize);
  const childPrice = tour.childPriceCents ?? tour.pricePerPersonCents;
  const total = departure ? (priceMode === "per_group" ? tour.pricePerPersonCents : adults * tour.pricePerPersonCents + children * childPrice) : 0;
  const seatsLeft = departure ? departure.capacity - departure.seatsBooked : 0;

  function validation(): string | null {
    if (!departure) return "Escolha uma data e horário para a saída.";
    if (guests < tour.minGuests) return `Mínimo de ${tour.minGuests} hóspede(s) por reserva.`;
    if (guests > maxGuestsForPrice) return `Máximo de ${maxGuestsForPrice} hóspedes para este valor.`;
    if (guests > seatsLeft) return `Restam apenas ${seatsLeft} vaga(s) nesta saída.`;
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
        const booking = addBooking({
          kind: "tour",
          item: { id: tour.id, slug: tour.slug, name: tour.name },
          orgId: tour.orgId,
          orgName: tour.orgName,
          startsAt: departure!.startsAt,
          endsAt: departure!.endsAt ?? undefined,
          adults,
          children,
          totalCents: total,
          note,
        });
        setSuccessCode(booking.code);
        return;
      }

      const result = await createBookingRequest({
        kind: "tour",
        serviceId: tour.id,
        departureId: departure!.id,
        adults,
        children,
        note,
        phone,
      });
      if (!result.ok) {
        if (result.needsAuth) {
          window.location.href = `/entrar?next=/passeio/${tour.slug}`;
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
              Código <strong className="text-tinta">{successCode}</strong>. O operador vai confirmar
              sua vaga — acompanhe em “Minhas viagens”.
            </>
          ) : (
            <>O operador recebeu sua solicitação e vai confirmar sua vaga.</>
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
          <span className="font-bold text-tinta">{formatBRL(tour.pricePerPersonCents)}</span>
          <span className="text-tinta-mute"> {priceLabel}</span>
        </p>
        <p className="text-xs text-tinta-mute">
          {formatDuration(tour.durationMinutes)} · máx. {tour.maxGuests} hóspedes
        </p>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <p className="label">Escolha a data</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {[...byDate.keys()].slice(0, 14).map((date) => (
              <button
                key={date}
                type="button"
                onClick={() => {
                  setActiveDate(date);
                  setSelectedDepartureId(null);
                }}
                className={`shrink-0 rounded-xl border px-3.5 py-2 text-center text-xs transition ${
                  activeDate === date
                    ? "border-oceano-600 bg-oceano-600 text-white"
                    : "border-areia-300 bg-white text-tinta-soft hover:border-oceano-400"
                }`}
              >
                <span className="block font-semibold capitalize">
                  {format(parseISO(`${date}T12:00:00`), "EEE dd MMM", { locale: ptBR })}
                </span>
              </button>
            ))}
          </div>
        </div>

        {activeDate && byDate.get(activeDate) && (
          <div>
            <p className="label">Horários e vagas</p>
            <div className="grid gap-2">
              {(byDate.get(activeDate) ?? []).map((d) => {
                const left = d.capacity - d.seatsBooked;
                const selected = d.id === selectedDepartureId;
                return (
                  <button
                    key={d.id}
                    type="button"
                    disabled={left <= 0}
                    onClick={() => setSelectedDepartureId(d.id)}
                    className={`flex items-center justify-between rounded-xl border px-4 py-2.5 text-sm transition ${
                      selected
                        ? "border-oceano-600 bg-oceano-50 text-oceano-800"
                        : left <= 0
                        ? "cursor-not-allowed border-areia-200 text-areia-400 line-through"
                        : "border-areia-300 bg-white text-tinta-soft hover:border-oceano-400"
                    }`}
                  >
                    <span className="font-semibold">{formatTime(d.startsAt)}</span>
                    <span className="text-xs">
                      {left > 0 ? `${left} vaga${left === 1 ? "" : "s"}` : "Esgotado"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="t-adults">Adultos</label>
            <select id="t-adults" className="input" value={adults} onChange={(e) => setAdults(Number(e.target.value))}>
              {Array.from({ length: tour.maxGuests }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="t-children">Crianças</label>
            <select id="t-children" className="input" value={children} onChange={(e) => setChildren(Number(e.target.value))}>
              {Array.from({ length: tour.maxGuests }, (_, i) => i).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="label" htmlFor="t-note">Observações (opcional)</label>
          <textarea
            id="t-note"
            className="input min-h-[60px]"
            placeholder="Restrições alimentares, comemoração…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className="flex justify-between border-t border-areia-200 pt-4 text-base font-bold text-tinta">
          <span>Total</span>
          <span>{departure ? formatBRL(total) : "—"}</span>
        </div>

        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button type="button" onClick={submit} disabled={submitting} className="btn-turquesa w-full">
          {submitting ? "Enviando…" : "Solicitar reserva"}
        </button>
        <p className="text-center text-xs text-tinta-mute">
          {DEMO_MODE ? "Demonstração — solicitação simulada." : "A vaga é confirmada pelo operador."}
        </p>
      </div>
    </div>
  );
}
