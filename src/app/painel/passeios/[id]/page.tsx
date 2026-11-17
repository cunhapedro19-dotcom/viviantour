"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatBRL, formatDateTimeShort } from "@/lib/format";
import { MediaManager } from "@/components/panel/MediaManager";
import { ServiceForm } from "@/components/panel/ServiceForm";
import { DEMO_MODE } from "@/lib/config";
import { getCreatedTour } from "@/lib/demo-store";
import {
  createDeparture,
  fetchDepartures,
  fetchTourById,
  setDepartureStatus,
  updateTour,
} from "@/lib/panel-ops";
import { usePanelUser } from "@/lib/use-panel-user";
import type { Departure, Tour } from "@/lib/types";

type Tab = "info" | "midia" | "saidas";

export default function PasseioPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("info");
  const [tour, setTour] = useState<Tour | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetchTourById(id).then((t) => {
      if (active) {
        setTour(t);
        setLoaded(true);
      }
    });
    return () => {
      active = false;
    };
  }, [id]);

  async function handleUpdate(input: Parameters<typeof updateTour>[1]) {
    const result = await updateTour(id, input);
    if (!result.ok) {
      window.alert(result.error);
      return false;
    }
    setTour(await fetchTourById(id));
    router.refresh();
    return true;
  }

  if (!loaded) {
    return <div className="card h-96 animate-pulse" />;
  }
  if (!tour) {
    return <p className="card p-8 text-sm text-tinta-mute">Passeio não encontrado.</p>;
  }

  const presetDemo = DEMO_MODE && !getCreatedTour(id);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-tinta">{tour.name}</h1>
        <p className="mt-1 text-sm text-tinta-mute">Gerencie informações e a agenda de saídas.</p>
      </header>

      <div className="flex gap-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setTab("info")}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "info" ? "bg-oceano-600 text-white" : "border border-areia-200 bg-white text-tinta-soft hover:bg-areia-100"
          }`}
        >
          Informações
        </button>
        <button
          type="button"
          onClick={() => setTab("midia")}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "midia" ? "bg-oceano-600 text-white" : "border border-areia-200 bg-white text-tinta-soft hover:bg-areia-100"
          }`}
        >
          Fotos e vídeos
        </button>
        <button
          type="button"
          onClick={() => setTab("saidas")}
          className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
            tab === "saidas" ? "bg-oceano-600 text-white" : "border border-areia-200 bg-white text-tinta-soft hover:bg-areia-100"
          }`}
        >
          Saídas (agenda operacional)
        </button>
      </div>

      {tab === "info" &&
        (presetDemo ? (
          <div className="card p-6 text-sm text-tinta-mute">
            Este é um passeio de <strong>demonstração</strong> — para editar os campos, crie um novo
            passeio. As <strong>saídas</strong> podem ser criadas normalmente na aba ao lado (as
            novas saídas aparecem no calendário público).
          </div>
        ) : (
          <ServiceForm initial={tour} submitLabel="Salvar alterações" onSubmit={handleUpdate} />
        ))}

      {tab === "midia" && <MediaManager kind="tour" id={id} />}
      {tab === "saidas" && <DeparturesTab tour={tour} />}
    </div>
  );
}

function DeparturesTab({ tour }: { tour: Tour }) {
  const [departures, setDepartures] = useState<Departure[] | null>(null);
  const [startsAt, setStartsAt] = useState("");
  const [capacity, setCapacity] = useState(tour.maxGuests);
  const [priceOverride, setPriceOverride] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    fetchDepartures(tour).then((d) => {
      if (active) setDepartures(d);
    });
    return () => {
      active = false;
    };
  }, [tour]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!startsAt) return;
    setBusy(true);
    setError(null);
    const result = await createDeparture(tour.id, {
      startsAt: new Date(startsAt).toISOString(),
      capacity,
      priceOverrideCents: priceOverride ? Math.round(Number(priceOverride) * 100) : null,
    });
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    setStartsAt("");
    setPriceOverride("");
    setDepartures(await fetchDepartures(tour));
    setBusy(false);
  }

  async function changeStatus(dep: Departure, status: Departure["status"]) {
    const result = await setDepartureStatus(dep.id, status);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    setDepartures(await fetchDepartures(tour));
  }

  const grouped = groupByDate(departures ?? []);
  const upcoming = Object.entries(grouped).filter(([date]) => date >= new Date().toISOString().slice(0, 10));

  return (
    <div className="space-y-6">
      <form onSubmit={submit} className="card space-y-3 p-6">
        <h2 className="font-display text-lg font-semibold text-tinta">Criar nova saída</h2>
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="dep-when">Data e hora *</label>
            <input id="dep-when" type="datetime-local" required className="input" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="dep-cap">Capacidade *</label>
            <input id="dep-cap" type="number" min={1} max={200} required className="input" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
          </div>
          <div>
            <label className="label" htmlFor="dep-price">Preço (R$, opcional)</label>
            <input id="dep-price" type="number" min={0} className="input" value={priceOverride} onChange={(e) => setPriceOverride(e.target.value)} placeholder={String(tour.pricePerPersonCents / 100)} />
          </div>
        </div>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary btn-sm">
          {busy ? "Criando…" : "Criar saída"}
        </button>
      </form>

      <div className="space-y-4">
        {departures === null ? (
          <div className="card h-40 animate-pulse" />
        ) : upcoming.length === 0 ? (
          <p className="card p-6 text-sm text-tinta-mute">Nenhuma saída futura. Crie a primeira acima.</p>
        ) : (
          upcoming.map(([date, deps]) => (
            <div key={date} className="card overflow-hidden">
              <div className="border-b border-areia-200 bg-areia-50 px-4 py-2.5">
                <p className="text-sm font-bold capitalize text-tinta">{formatDateTimeShort(`${date}T12:00:00`)}</p>
              </div>
              <div className="divide-y divide-areia-200">
                {deps.map((dep) => {
                  const left = dep.capacity - dep.seatsBooked;
                  const isGenerated = dep.id.startsWith("dep-") && !dep.id.startsWith("dep-user-");
                  return (
                    <div key={dep.id} className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                      <div>
                        <p className="font-semibold text-tinta">
                          {new Date(dep.startsAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          {dep.priceOverrideCents ? ` · ${formatBRL(dep.priceOverrideCents)}/pessoa` : ""}
                        </p>
                        <p className="text-xs text-tinta-mute">
                          {dep.seatsBooked} reserva(s) · {left} vaga(s) disponível(is)
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusChip status={dep.status} />
                        {isGenerated ? (
                          <span className="text-xs text-tinta-mute">exemplo</span>
                        ) : (
                          <>
                            {dep.status === "open" && (
                              <button type="button" onClick={() => changeStatus(dep, "blocked")} className="btn-danger btn-sm">
                                Bloquear
                              </button>
                            )}
                            {dep.status === "blocked" && (
                              <button type="button" onClick={() => changeStatus(dep, "open")} className="btn-turquesa btn-sm">
                                Reabrir
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: Departure["status"] }) {
  const map: Record<Departure["status"], string> = {
    open: "bg-emerald-50 text-emerald-700 border-emerald-200",
    blocked: "bg-red-50 text-red-700 border-red-200",
    cancelled: "bg-areia-100 text-tinta-mute border-areia-300",
  };
  const labels: Record<Departure["status"], string> = { open: "Aberta", blocked: "Bloqueada", cancelled: "Cancelada" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${map[status]}`}>
      {labels[status]}
    </span>
  );
}

function groupByDate(deps: Departure[]): Record<string, Departure[]> {
  const map: Record<string, Departure[]> = {};
  for (const d of deps) {
    const key = d.startsAt.slice(0, 10);
    (map[key] ??= []).push(d);
  }
  for (const key of Object.keys(map)) {
    map[key].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  }
  return map;
}
