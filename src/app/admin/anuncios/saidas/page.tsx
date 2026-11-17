"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  createTourDeparture,
  DEMO_UNAVAILABLE,
  fetchAdminTours,
  fetchTourDepartures,
  setTourDepartureStatus,
} from "@/lib/admin-ops";
import type { AdminDepartureRow } from "@/lib/admin-ops";
import { DEMO_MODE } from "@/lib/config";
import { formatBRL, formatDate, formatTime } from "@/lib/format";

const STATUS_LABEL: Record<AdminDepartureRow["status"], string> = {
  open: "Aberta",
  blocked: "Bloqueada",
  cancelled: "Cancelada",
};

export default function AdminSaidasPage() {
  const [tours, setTours] = useState<{ id: string; name: string; orgName: string }[] | null>(null);
  const [tourId, setTourId] = useState("");
  const [departures, setDepartures] = useState<AdminDepartureRow[] | null>(null);
  const [startsAt, setStartsAt] = useState("");
  const [capacity, setCapacity] = useState(20);
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchAdminTours().then((t) => {
      if (active) setTours(t);
    });
    return () => {
      active = false;
    };
  }, []);

  const load = useCallback(async (id: string) => {
    if (!id) {
      setDepartures(null);
      return;
    }
    setDepartures(await fetchTourDepartures(id));
  }, []);

  useEffect(() => {
    load(tourId);
  }, [tourId, load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!tourId || !startsAt) {
      setError("Escolha o passeio e informe a data e o horário da saída.");
      return;
    }
    setBusy(true);
    const priceCents = price.trim() ? Math.round(Number(price.replace(",", ".")) * 100) : null;
    const result = await createTourDeparture(tourId, {
      startsAt: new Date(startsAt).toISOString(),
      capacity,
      priceOverrideCents: priceCents && priceCents > 0 ? priceCents : null,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStartsAt("");
    await load(tourId);
  }

  async function changeStatus(dep: AdminDepartureRow, status: AdminDepartureRow["status"]) {
    const result = await setTourDepartureStatus(dep.id, status);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    await load(tourId);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-tinta">Saídas dos passeios</h1>
          <p className="mt-1 text-sm text-tinta-mute">
            Cada passeio só pode ser reservado nas datas em que existe uma saída aberta.
          </p>
        </div>
        <Link href="/admin/anuncios" className="btn-outline btn-sm">
          Voltar aos anúncios
        </Link>
      </header>

      {DEMO_MODE && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">{DEMO_UNAVAILABLE}</p>
      )}

      <div className="card max-w-xl space-y-5 p-6">
        <div>
          <label className="label" htmlFor="tour">
            Passeio
          </label>
          {tours === null ? (
            <div className="h-11 animate-pulse rounded-xl bg-areia-100" />
          ) : (
            <select id="tour" className="input" value={tourId} onChange={(e) => setTourId(e.target.value)}>
              <option value="">Selecione…</option>
              {tours.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} — {t.orgName}
                </option>
              ))}
            </select>
          )}
        </div>

        {tourId && (
          <form onSubmit={create} className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-3">
              <label className="label" htmlFor="startsAt">
                Data e horário
              </label>
              <input
                id="startsAt"
                type="datetime-local"
                className="input"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label" htmlFor="capacity">
                Vagas
              </label>
              <input
                id="capacity"
                type="number"
                min={1}
                className="input"
                value={capacity}
                onChange={(e) => setCapacity(Math.max(1, Number(e.target.value) || 1))}
              />
            </div>
            <div>
              <label className="label" htmlFor="price">
                Preço desta saída (R$)
              </label>
              <input
                id="price"
                className="input"
                inputMode="decimal"
                placeholder="Igual ao do passeio"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <button type="submit" className="btn-primary w-full" disabled={busy || DEMO_MODE}>
                {busy ? "Criando…" : "Criar saída"}
              </button>
            </div>
            {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-3">{error}</p>}
          </form>
        )}
      </div>

      {tourId && departures !== null && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-areia-100 text-left text-xs font-semibold uppercase tracking-wide text-tinta-mute">
              <tr>
                <th className="px-5 py-3">Saída</th>
                <th className="px-5 py-3">Vagas</th>
                <th className="px-5 py-3">Preço</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-areia-200">
              {departures.map((d) => (
                <tr key={d.id}>
                  <td className="px-5 py-3.5 font-medium text-tinta">
                    {formatDate(d.startsAt, "EEE, d 'de' MMM")} · {formatTime(d.startsAt)}
                  </td>
                  <td className="px-5 py-3.5 text-tinta-soft">
                    {d.seatsBooked}/{d.capacity}
                  </td>
                  <td className="px-5 py-3.5 text-tinta-soft">
                    {d.priceOverrideCents ? formatBRL(d.priceOverrideCents) : "Padrão"}
                  </td>
                  <td className="px-5 py-3.5 text-tinta-soft">{STATUS_LABEL[d.status]}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-2">
                      {d.status === "open" && (
                        <button type="button" onClick={() => changeStatus(d, "blocked")} className="btn-outline btn-sm">
                          Bloquear
                        </button>
                      )}
                      {d.status === "blocked" && (
                        <button type="button" onClick={() => changeStatus(d, "open")} className="btn-turquesa btn-sm">
                          Reabrir
                        </button>
                      )}
                      {d.status !== "cancelled" && (
                        <button type="button" onClick={() => changeStatus(d, "cancelled")} className="btn-danger btn-sm">
                          Cancelar
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {departures.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-tinta-mute">
                    Nenhuma saída futura. Crie a primeira acima.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
