"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarMonth } from "@/components/booking/CalendarMonth";
import { MediaManager } from "@/components/panel/MediaManager";
import { PropertyForm } from "@/components/panel/PropertyForm";
import { SeasonalPricingPanel } from "@/components/panel/SeasonalPricingPanel";
import { DEMO_MODE } from "@/lib/config";
import { getDemoBlocks } from "@/lib/demo-data";
import { getCreatedStay } from "@/lib/demo-store";
import { formatDateRange } from "@/lib/format";
import {
  addBlock,
  fetchBlocks,
  fetchPropertyOccupiedDates,
  fetchExternalCalendars,
  fetchStayById,
  removeBlock,
  removeExternalCalendarById,
  addExternalCalendar,
  syncExternalCalendar,
  updateStay,
} from "@/lib/panel-ops";
import { usePanelUser } from "@/lib/use-panel-user";
import type { ExternalCalendarView, PropertyBlock, Stay } from "@/lib/types";

type Tab = "info" | "precos" | "midia" | "calendario" | "ical";

export default function ImovelPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { user } = usePanelUser();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("info");
  const [stay, setStay] = useState<Stay | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    fetchStayById(id).then((s) => {
      if (active) {
        setStay(s);
        setLoaded(true);
      }
    });
    return () => {
      active = false;
    };
  }, [id]);

  async function handleUpdate(input: Parameters<typeof updateStay>[1]) {
    const result = await updateStay(id, input);
    if (!result.ok) {
      window.alert(result.error);
      return false;
    }
    setStay(await fetchStayById(id));
    router.refresh();
    return true;
  }

  if (!loaded) {
    return <div className="card h-96 animate-pulse" />;
  }
  if (!stay) {
    return <p className="card p-8 text-sm text-tinta-mute">Anúncio não encontrado.</p>;
  }

  const presetDemo = DEMO_MODE && !getCreatedStay(id);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-tinta">{stay.name}</h1>
          <p className="mt-1 text-sm text-tinta-mute">Gerencie informações, calendário e sincronização.</p>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto">
        <TabButton active={tab === "precos"} onClick={() => setTab("precos")}>Preços e temporadas</TabButton>
        <TabButton active={tab === "info"} onClick={() => setTab("info")}>Informações</TabButton>
        <TabButton active={tab === "midia"} onClick={() => setTab("midia")}>Fotos e vídeos</TabButton>
        <TabButton active={tab === "calendario"} onClick={() => setTab("calendario")}>Calendário e bloqueios</TabButton>
        <TabButton active={tab === "ical"} onClick={() => setTab("ical")}>Calendário externo (iCal)</TabButton>
      </div>

      {tab === "info" &&
        (presetDemo ? (
          <div className="card p-6 text-sm text-tinta-mute">
            Este é um anúncio de <strong>demonstração</strong> — para editar todos os campos, crie um
            novo imóvel em <em>Hospedagens → + Novo imóvel</em>. O calendário e a integração iCal
            funcionam normalmente nas abas ao lado.
          </div>
        ) : (
          <PropertyForm initial={stay} submitLabel="Salvar alterações" onSubmit={handleUpdate} />
        ))}

      {tab === "precos" && <SeasonalPricingPanel kind="stay" listingId={stay.id} basePriceCents={stay.basePriceCents} showPublicPrices={Boolean(stay.showPublicPrices)} onVisibilityChange={(value) => setStay({ ...stay, showPublicPrices: value })} />}

      {tab === "midia" && <MediaManager kind="stay" id={id} />}
      {tab === "calendario" && <CalendarTab stayId={id} staySlug={stay.slug} />}
      {tab === "ical" && <IcalTab propertyId={id} />}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
        active ? "bg-oceano-600 text-white" : "bg-white text-tinta-soft hover:bg-areia-100 border border-areia-200"
      }`}
    >
      {children}
    </button>
  );
}

function CalendarTab({ stayId, staySlug }: { stayId: string; staySlug: string }) {
  const { user } = usePanelUser();
  const [occupied, setOccupied] = useState<string[]>([]);
  const [manual, setManual] = useState<PropertyBlock[]>([]);
  const [demoBlocks] = useState(() => {
    if (!DEMO_MODE) return [];
    return getDemoBlocks(stayId);
  });
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchPropertyOccupiedDates(stayId).then(days => { if (active) setOccupied(days); }).catch(() => { if (active) setError("Não foi possível carregar a disponibilidade completa."); });
    fetchBlocks(stayId).then((b) => {
      if (active) setManual(b);
    });
    return () => {
      active = false;
    };
  }, [stayId]);

  const blockedDates = useMemo(() => {
    const out: string[] = [...occupied];
    for (const b of [...manual, ...demoBlocks]) {
      let d = new Date(`${b.startDate}T12:00:00`);
      const endD = new Date(`${b.endDate}T12:00:00`);
      while (d < endD && out.length < 400) {
        out.push(d.toISOString().slice(0, 10));
        d = new Date(d.getTime() + 24 * 3600 * 1000);
      }
    }
    return out;
  }, [manual, demoBlocks, occupied]);

  async function submitBlock(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setError(null);
    const result = await addBlock(user, stayId, start, end, reason);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setStart("");
    setEnd("");
    setReason("");
    setManual(await fetchBlocks(stayId));
    try { setOccupied(await fetchPropertyOccupiedDates(stayId)); } catch { setError("Não foi possível atualizar a disponibilidade."); }
  }

  async function remove(id: string) {
    const result = await removeBlock(id);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    setManual(await fetchBlocks(stayId));
    try { setOccupied(await fetchPropertyOccupiedDates(stayId)); } catch { setError("Não foi possível atualizar a disponibilidade."); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="card p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-tinta">Calendário</h2>
        <CalendarMonth blockedDates={new Set(blockedDates)} onPick={() => {}} />
        <p className="mt-3 text-xs text-tinta-mute">
          Datas riscadas estão ocupadas (reservas, bloqueios manuais ou calendários externos).
        </p>
      </div>

      <div className="space-y-4">
        <form onSubmit={submitBlock} className="card space-y-3 p-6">
          <h2 className="font-display text-lg font-semibold text-tinta">Bloquear datas</h2>
          <p className="text-xs text-tinta-mute">
            Para manutenção, uso próprio ou reservas feitas fora da plataforma. A noite de check-out permanece livre.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="blk-start">Início</label>
              <input id="blk-start" type="date" required className="input" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="blk-end">Fim (check-out)</label>
              <input id="blk-end" type="date" required className="input" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="blk-reason">Motivo (opcional)</label>
            <input id="blk-reason" className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: manutenção da piscina" />
          </div>
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button type="submit" className="btn-primary btn-sm">Bloquear período</button>
        </form>

        <div className="card divide-y divide-areia-200">
          <div className="p-4">
            <h2 className="font-display text-lg font-semibold text-tinta">Bloqueios ativos</h2>
          </div>
          {manual.length === 0 && demoBlocks.length === 0 && (
            <p className="p-4 text-sm text-tinta-mute">Nenhum bloqueio registrado.</p>
          )}
          {manual.map((b) => (
            <div key={b.id} className="flex items-center justify-between p-4 text-sm">
              <div>
                <p className="font-medium text-tinta">{formatDateRange(b.startDate, b.endDate)}</p>
                <p className="text-xs text-tinta-mute">{b.reason || "Bloqueio manual"} · criado por você</p>
              </div>
              <button type="button" onClick={() => remove(b.id)} className="btn-danger btn-sm">Remover</button>
            </div>
          ))}
          {demoBlocks.map((b) => (
            <div key={b.id} className="flex items-center justify-between p-4 text-sm">
              <div>
                <p className="font-medium text-tinta">{formatDateRange(b.startDate, b.endDate)}</p>
                <p className="text-xs text-tinta-mute">{b.reason} · exemplo (iCal externo)</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function IcalTab({ propertyId }: { propertyId: string }) {
  const [syncing, setSyncing] = useState<string[]>([]);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [calendars, setCalendars] = useState<ExternalCalendarView[]>([]);
  const [source, setSource] = useState("airbnb");
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetchExternalCalendars(propertyId).then((c) => {
      if (active) setCalendars(c);
    });
    const timer = setInterval(() => {
      fetchExternalCalendars(propertyId).then(c => { if (active) setCalendars(c); });
    }, 10000);
    return () => {
      clearInterval(timer);
      active = false;
    };
  }, [propertyId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await addExternalCalendar(propertyId, { source, label, url });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setUrl("");
    setLabel("");
    setCalendars(await fetchExternalCalendars(propertyId));
  }

  async function sync(id: string) {
    setSyncError(null);
    setSyncing(previous => [...previous, id]);
    try {
      const result = await syncExternalCalendar(id);
      if (!result.ok) setSyncError(result.error);
      setCalendars(await fetchExternalCalendars(propertyId));
    } finally { setSyncing(previous => previous.filter(value => value !== id)); }
  }

  async function remove(id: string) {
    const result = await removeExternalCalendarById(id);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    setCalendars(await fetchExternalCalendars(propertyId));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={submit} className="card space-y-3 p-6">
        <h2 className="font-display text-lg font-semibold text-tinta">Conectar calendário externo</h2>
        <p className="text-xs text-tinta-mute">
          No Airbnb: Anúncio → Calendário → Disponibilidade → Calendário sincronizado → Exportar
          calendário. No Google Agenda: Configurações e compartilhamento → Integrar agenda →
          endereço secreto em formato iCal. Cole aqui a <strong>URL privada (iCal)</strong>. Ela fica
          armazenada no servidor e nunca é exposta publicamente.
        </p>
        <div>
          <label className="label" htmlFor="cal-source">Origem</label>
          <select id="cal-source" className="input" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="airbnb">Airbnb</option>
            <option value="google">Google Agenda</option>
            <option value="vrbo">Vrbo</option>
            <option value="booking">Booking.com</option>
            <option value="other">Outro (iCal compatível)</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="cal-label">Apelido</label>
          <input id="cal-label" className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: Airbnb Casa 1" />
        </div>
        <div>
          <label className="label" htmlFor="cal-url">URL iCal *</label>
          <input id="cal-url" required className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.airbnb.com.br/calendar/ical/…" />
        </div>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button type="submit" className="btn-primary btn-sm">Conectar calendário</button>
        <p className="text-xs text-tinta-mute">
          A sincronização é automática diariamente e importa os períodos ocupados. Não é
          instantânea e não cria reservas automáticas no Airbnb — respeitando os limites do iCal.
        </p>
      </form>

      <div className="card divide-y divide-areia-200 self-start">
        <div className="p-4">
          <h2 className="font-display text-lg font-semibold text-tinta">Calendários conectados</h2>
        </div>
        {syncError && <p role="alert" className="p-4 text-sm text-red-700">{syncError}</p>}
        {calendars.length === 0 && (
          <p className="p-4 text-sm text-tinta-mute">Nenhum calendário conectado ainda.</p>
        )}
        {calendars.map((c) => (
          <div key={c.id} className="flex items-center justify-between p-4 text-sm">
            <div className="min-w-0">
              <p className="font-medium capitalize text-tinta">
                {c.source === "airbnb" ? "Airbnb" : c.source === "google" ? "Google Agenda" : c.source === "vrbo" ? "Vrbo" : c.source === "booking" ? "Booking.com" : c.label || "Calendário"}
              </p>
              <p className="text-xs text-tinta-mute">{c.label || c.source}</p>
              <p role="status" className="text-xs text-tinta-mute">
                {syncing.includes(c.id) || c.lastStatus === "syncing" ? "Sincronizando…" : c.lastStatus === "ok" ? "Sincronizado" : c.lastStatus === "error" ? "Erro" : "Aguardando sincronização"}
              </p>
              {c.lastSyncedAt && <p className="text-xs text-tinta-mute">Última sincronização bem-sucedida: {new Date(c.lastSyncedAt).toLocaleString("pt-BR")}</p>}
              <p className="text-xs text-tinta-mute">Próxima sincronização: {c.nextSyncAt ? new Date(c.nextSyncAt).toLocaleString("pt-BR") : "na próxima execução automática"} (previsão)</p>
              {c.lastSyncedAt && <p className="text-xs text-tinta-mute">{c.importedCount ?? 0} períodos ocupados importados ou atualizados.</p>}
              {c.lastStatus === "error" && <p role="alert" className="text-xs text-red-700">{c.lastError}</p>}
            </div>
            <div className="flex shrink-0 flex-col gap-2">
              <button type="button" disabled={syncing.includes(c.id) || c.lastStatus === "syncing" || !c.active} onClick={() => sync(c.id)} className="btn-primary btn-sm disabled:opacity-50">{syncing.includes(c.id) || c.lastStatus === "syncing" ? "Sincronizando…" : "Sincronizar agora"}</button>
              <button type="button" disabled={syncing.includes(c.id)} onClick={() => remove(c.id)} className="btn-danger btn-sm">Desconectar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
