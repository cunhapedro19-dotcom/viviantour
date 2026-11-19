"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { adminCreateBooking, DEMO_UNAVAILABLE, fetchAdminProfiles, fetchBookableItems } from "@/lib/admin-ops";
import type { AdminProfileRow, BookableDeparture, BookableStay } from "@/lib/admin-ops";
import { DEMO_MODE } from "@/lib/config";
import { formatBRL, formatDate, formatTime, nightsBetween } from "@/lib/format";

export default function NovaReservaAdminPage() {
  const router = useRouter();
  const [kind, setKind] = useState<"stay" | "tour">("stay");
  const [items, setItems] = useState<{ stays: BookableStay[]; departures: BookableDeparture[] } | null>(null);
  const [profiles, setProfiles] = useState<AdminProfileRow[]>([]);

  const [propertyId, setPropertyId] = useState("");
  const [departureId, setDepartureId] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [customerId, setCustomerId] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [autoConfirm, setAutoConfirm] = useState(true);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([fetchBookableItems(), fetchAdminProfiles()]).then(([bookable, people]) => {
      if (!active) return;
      setItems(bookable);
      setProfiles(people);
    });
    return () => {
      active = false;
    };
  }, []);

  const stay = items?.stays.find((s) => s.id === propertyId);
  const departure = items?.departures.find((d) => d.id === departureId);
  const guests = adults + children;
  const today = new Date().toISOString().slice(0, 10);

  const estimateCents = useMemo(() => {
    if (kind === "stay") {
      const nights = nightsBetween(checkIn, checkOut);
      if (!stay || nights <= 0) return null;
      return nights * stay.basePriceCents + stay.cleaningFeeCents;
    }
    if (!departure) return null;
    return departure.priceMode === "per_group" ? departure.pricePerPersonCents : guests * departure.pricePerPersonCents;
  }, [kind, stay, departure, checkIn, checkOut, guests]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (guests < 1) {
      setError("Informe ao menos 1 hóspede.");
      return;
    }
    if (kind === "stay") {
      if (!propertyId || !checkIn || !checkOut) {
        setError("Escolha a hospedagem e as datas de entrada e saída.");
        return;
      }
      if (nightsBetween(checkIn, checkOut) <= 0) {
        setError("A saída precisa ser depois da entrada.");
        return;
      }
    } else if (!departureId) {
      setError("Escolha a saída do passeio.");
      return;
    }

    setBusy(true);
    const result = await adminCreateBooking({
      kind,
      propertyId,
      departureId,
      adults,
      children,
      checkIn,
      checkOut,
      customerId,
      note: note.trim(),
      phone: phone.trim(),
      autoConfirm,
    });
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push("/admin/reservas");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-tinta">Nova reserva</h1>
        <p className="mt-1 text-sm text-tinta-mute">
          Registre uma reserva feita por telefone, WhatsApp ou balcão. As mesmas regras de disponibilidade do site
          valem aqui.
        </p>
      </header>

      {DEMO_MODE && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">{DEMO_UNAVAILABLE}</p>
      )}

      <form onSubmit={submit} className="card max-w-xl space-y-5 p-6">
        <div className="flex gap-2">
          {(
            [
              ["stay", "Hospedagem"],
              ["tour", "Passeio"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setKind(value);
                setError(null);
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                kind === value
                  ? "bg-oceano-600 text-white"
                  : "border border-areia-200 bg-white text-tinta-soft hover:bg-areia-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {items === null ? (
          <div className="h-11 animate-pulse rounded-xl bg-areia-100" />
        ) : kind === "stay" ? (
          <>
            <div>
              <label className="label" htmlFor="property">
                Hospedagem
              </label>
              <select id="property" className="input" value={propertyId} onChange={(e) => setPropertyId(e.target.value)}>
                <option value="">Selecione…</option>
                {items.stays.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.orgName}
                    {s.status !== "published" ? " (não publicada)" : ""}
                  </option>
                ))}
              </select>
              {stay && (
                <p className="mt-2 text-xs text-tinta-mute">
                  {formatBRL(stay.basePriceCents)} por noite · taxa de limpeza {formatBRL(stay.cleaningFeeCents)} ·
                  mínimo de {stay.minNights} {stay.minNights === 1 ? "noite" : "noites"} · até {stay.capacity} hóspedes
                </p>
              )}
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="checkIn">
                  Entrada
                </label>
                <input
                  id="checkIn"
                  type="date"
                  className="input"
                  min={today}
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="checkOut">
                  Saída
                </label>
                <input
                  id="checkOut"
                  type="date"
                  className="input"
                  min={checkIn || today}
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                />
              </div>
            </div>
          </>
        ) : (
          <div>
            <label className="label" htmlFor="departure">
              Saída do passeio
            </label>
            <select id="departure" className="input" value={departureId} onChange={(e) => setDepartureId(e.target.value)}>
              <option value="">Selecione…</option>
              {items.departures.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.serviceName} — {formatDate(d.startsAt, "EEE, d MMM")} às {formatTime(d.startsAt)} ({d.seatsLeft}{" "}
                  {d.seatsLeft === 1 ? "vaga" : "vagas"})
                </option>
              ))}
            </select>
            {items.departures.length === 0 && (
              <p className="mt-2 text-xs text-tinta-mute">
                Nenhuma saída aberta.{" "}
                <Link href="/admin/anuncios/saidas" className="font-semibold text-oceano-700 underline">
                  Criar uma saída
                </Link>
              </p>
            )}
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="adults">
              Adultos
            </label>
            <input
              id="adults"
              type="number"
              min={1}
              className="input"
              value={adults}
              onChange={(e) => setAdults(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
          <div>
            <label className="label" htmlFor="children">
              Crianças
            </label>
            <input
              id="children"
              type="number"
              min={0}
              className="input"
              value={children}
              onChange={(e) => setChildren(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="customer">
            Cliente
          </label>
          <select id="customer" className="input" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Eu mesmo (conta de administração)</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {p.email}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-tinta-mute">
            A reserva precisa de um cliente com conta. Se o hóspede não tem cadastro, deixe “Eu mesmo” e anote o nome
            e o contato dele na observação.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="phone">
              Telefone de contato
            </label>
            <input
              id="phone"
              className="input"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(22) 99999-9999"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="note">
            Observação
          </label>
          <textarea
            id="note"
            className="input min-h-[80px]"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Nome do hóspede, pedidos especiais, forma de pagamento combinada…"
          />
        </div>

        <label className="flex items-start gap-3 text-sm text-tinta-soft">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4"
            checked={autoConfirm}
            onChange={(e) => setAutoConfirm(e.target.checked)}
          />
          <span>
            Confirmar agora
            <span className="block text-xs text-tinta-mute">
              Bloqueia as datas ou vagas e calcula a comissão. Desmarcado, a reserva fica pendente até alguém
              aceitar.
            </span>
          </span>
        </label>

        {estimateCents !== null && (
          <div className="flex items-center justify-between rounded-xl bg-areia-100 px-4 py-3">
            <span className="text-sm text-tinta-soft">Valor da reserva</span>
            <span className="font-display text-lg font-semibold text-tinta">{formatBRL(estimateCents)}</span>
          </div>
        )}

        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn-primary" disabled={busy || DEMO_MODE}>
            {busy ? "Registrando…" : "Registrar reserva"}
          </button>
          <Link href="/admin/reservas" className="btn-ghost">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
