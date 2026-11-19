"use client";

import { useEffect, useState } from "react";
import { formatBRL } from "@/lib/format";
import { DEMO_MODE } from "@/lib/config";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SeasonalPriceRule } from "@/lib/types";

type Kind = "stay" | "tour" | "combo";

function localDateAfter(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function lastIncludedDate(endsOn?: string | null): string {
  if (!endsOn) return "";
  const date = new Date(`${endsOn}T12:00:00`);
  date.setDate(date.getDate() - 1);
  return date.toISOString().slice(0, 10);
}

export function SeasonalPricingPanel({
  kind,
  listingId,
  basePriceCents,
  showPublicPrices = false,
  onVisibilityChange,
}: {
  kind: Kind;
  listingId: string;
  basePriceCents: number;
  showPublicPrices?: boolean;
  onVisibilityChange?: (value: boolean) => void;
}) {
  const [rules, setRules] = useState<SeasonalPriceRule[]>([]);
  const [loaded, setLoaded] = useState(DEMO_MODE);
  const [label, setLabel] = useState("");
  const [details, setDetails] = useState("");
  const [startsOn, setStartsOn] = useState("");
  const [endsOn, setEndsOn] = useState("");
  const [price, setPrice] = useState("");
  const [priority, setPriority] = useState("0");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (DEMO_MODE) return;
    const column = kind === "stay" ? "property_id" : kind === "tour" ? "service_id" : "combo_id";
    const { data, error: queryError } = await getSupabaseBrowserClient()
      .from("listing_price_rules")
      .select("id,starts_on,ends_on,price_cents,priority,label,details")
      .eq(column, listingId)
      .order("starts_on");
    if (queryError) setError("Não foi possível carregar as regras de preço.");
    else setRules((data ?? []).map((r) => ({ id: r.id, startsOn: r.starts_on, endsOn: r.ends_on, priceCents: r.price_cents, priority: r.priority, label: r.label, details: r.details })));
    setLoaded(true);
  }

  useEffect(() => { load(); }, [listingId, kind]);

  async function addRule(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!startsOn || !price || Number(price) < 0) return setError("Informe o início e o valor da regra.");
    if (endsOn && endsOn < startsOn) return setError("O último dia não pode ser anterior ao início.");
    if (DEMO_MODE) return setError("As regras por período ficam disponíveis quando o banco estiver conectado.");
    setSaving(true);
    const payload = {
      [kind === "stay" ? "property_id" : kind === "tour" ? "service_id" : "combo_id"]: listingId,
      starts_on: startsOn,
      ends_on: endsOn ? localDateAfter(endsOn) : null,
      price_cents: Math.round(Number(price.replace(",", ".")) * 100),
      priority: Number(priority),
      label: label.trim() || null,
      details: details.trim() || null,
    };
    const { error: insertError } = await getSupabaseBrowserClient().from("listing_price_rules").insert(payload);
    setSaving(false);
    if (insertError) {
      setError(insertError.message.includes("PRICE_RULE_OVERLAP") ? "Este período se sobrepõe a uma regra já criada." : "Não foi possível salvar esta regra.");
      return;
    }
    setLabel(""); setDetails(""); setStartsOn(""); setEndsOn(""); setPrice(""); setPriority("0");
    await load();
  }

  async function removeRule(id: string) {
    if (DEMO_MODE) return;
    const { error: deleteError } = await getSupabaseBrowserClient().from("listing_price_rules").delete().eq("id", id);
    if (deleteError) { setError("Não foi possível remover esta regra."); return; }
    await load();
  }

  async function changeVisibility(value: boolean) {
    if (DEMO_MODE) return;
    setSaving(true); setError(null);
    const { error: updateError } = await getSupabaseBrowserClient().from("properties").update({ show_public_prices: value }).eq("id", listingId);
    setSaving(false);
    if (updateError) { setError("Não foi possível atualizar a visibilidade dos preços."); return; }
    onVisibilityChange?.(value);
  }

  const unit = kind === "stay" ? "por noite" : kind === "tour" ? "por pessoa" : "no pacote";
  return <div className="space-y-5">
    <div className="card p-6">
      <h2 className="font-display text-lg font-semibold text-tinta">Preço e temporadas</h2>
      <p className="mt-1 text-sm text-tinta-mute">Valor padrão: <strong className="text-tinta">{formatBRL(basePriceCents)} {unit}</strong>. As regras abaixo substituem esse valor somente dentro do período informado.</p>
      {kind === "stay" && <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-areia-50 p-3 text-sm text-tinta-soft"><input type="checkbox" className="mt-0.5 h-4 w-4" checked={showPublicPrices} disabled={saving} onChange={(e) => changeVisibility(e.target.checked)} /><span><strong className="text-tinta">Mostrar preços publicamente</strong><br />Deixe desligado até autorizar a divulgação desta hospedagem.</span></label>}
      {kind === "tour" && <p className="mt-3 rounded-xl bg-oceano-50 p-3 text-sm text-oceano-800">Os passeios exibem o menor preço como “A partir de”.</p>}
    </div>

    <form onSubmit={addRule} className="card space-y-4 p-6">
      <h3 className="font-semibold text-tinta">Nova regra de período</h3>
      <div className="grid gap-3 sm:grid-cols-3"><div><label className="label" htmlFor="season-label">Nome do período</label><input id="season-label" className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: Feriado" /></div><div><label className="label" htmlFor="season-price">Valor (R$) *</label><input id="season-price" type="number" min="0" step="0.01" required className="input" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="180,00" /></div><div><label className="label" htmlFor="season-priority">Prioridade</label><select id="season-priority" className="input" value={priority} onChange={(e) => setPriority(e.target.value)}><option value="0">Normal</option><option value="10">Preferencial (feriado)</option><option value="20">Máxima</option></select></div></div>
      <div className="grid gap-3 sm:grid-cols-2"><div><label className="label" htmlFor="season-start">Primeiro dia *</label><input id="season-start" type="date" required className="input" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} /></div><div><label className="label" htmlFor="season-end">Último dia</label><input id="season-end" type="date" min={startsOn || undefined} className="input" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} /><p className="mt-1 text-xs text-tinta-mute">Vazio = até nova alteração.</p></div></div>
      <div><label className="label" htmlFor="season-details">O que está incluso / observação</label><input id="season-details" className="input" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Ex.: Com almoço incluso" /></div>
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={saving} className="btn-primary btn-sm">{saving ? "Salvando…" : "Adicionar período"}</button>
    </form>

    <div className="card divide-y divide-areia-200"><div className="p-5"><h3 className="font-semibold text-tinta">Períodos cadastrados</h3></div>{!loaded ? <div className="h-16 animate-pulse" /> : rules.length === 0 ? <p className="p-5 text-sm text-tinta-mute">Nenhuma regra por período. O valor padrão continua valendo.</p> : rules.map((rule) => <div key={rule.id} className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm"><div><p className="font-semibold text-tinta">{rule.label || "Período especial"} · {formatBRL(rule.priceCents)} {unit}</p><p className="mt-1 text-tinta-mute">{rule.startsOn.split("-").reverse().join("/")} até {rule.endsOn ? lastIncludedDate(rule.endsOn).split("-").reverse().join("/") : "nova alteração"}{rule.priority ? ` · prioridade ${rule.priority}` : ""}{rule.details ? ` · ${rule.details}` : ""}</p></div><button type="button" onClick={() => removeRule(rule.id)} className="btn-danger btn-sm">Remover</button></div>)}</div>
  </div>;
}
