"use client";

import { useEffect, useState } from "react";
import { formatBRL } from "@/lib/format";
import { DEMO_MODE } from "@/lib/config";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SeasonalPriceRule } from "@/lib/types";

type Kind = "stay" | "tour" | "combo";
type RuleKind = "seasonal" | "holiday" | "special";
type FormRuleKind = RuleKind | "weekend";

function lastIncludedDate(endsOn?: string | null) { if (!endsOn) return ""; const date = new Date(`${endsOn}T12:00:00`); date.setDate(date.getDate() - 1); return date.toISOString().slice(0, 10); }
function nextDate(iso: string) { const date = new Date(`${iso}T12:00:00`); date.setDate(date.getDate() + 1); return date.toISOString().slice(0, 10); }
function ruleLabel(kind?: RuleKind) { return kind === "holiday" ? "Feriado" : kind === "special" ? "Data especial" : "Temporada"; }

export function SeasonalPricingPanel({ kind, listingId, basePriceCents, weekendPriceCents = null, showPublicPrices = false, onVisibilityChange, onWeekendPriceChange, priceUnit }: { kind: Kind; listingId: string; basePriceCents: number; weekendPriceCents?: number | null; showPublicPrices?: boolean; onVisibilityChange?: (value: boolean) => void; onWeekendPriceChange?: (value: number | null) => void; priceUnit?: string; }) {
  const [rules, setRules] = useState<SeasonalPriceRule[]>([]);
  const [loaded, setLoaded] = useState(DEMO_MODE); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  const [ruleKind, setRuleKind] = useState<FormRuleKind>("seasonal"); const [label, setLabel] = useState(""); const [price, setPrice] = useState(""); const [priority, setPriority] = useState("0"); const [startsOn, setStartsOn] = useState(""); const [endsOn, setEndsOn] = useState(""); const [details, setDetails] = useState(""); const [editingId, setEditingId] = useState<string | null>(null);
  const column = kind === "stay" ? "property_id" : kind === "tour" ? "service_id" : "combo_id";
  const table = kind === "stay" ? "properties" : kind === "tour" ? "services" : "combos";
  const unit = priceUnit ?? (kind === "stay" ? "por noite" : kind === "tour" ? "por pessoa" : "no pacote");

  function reset() { setRuleKind("seasonal"); setLabel(""); setPrice(""); setPriority("0"); setStartsOn(""); setEndsOn(""); setDetails(""); setEditingId(null); }
  function editRule(rule: SeasonalPriceRule) { setError(null); setRuleKind(rule.ruleKind ?? "seasonal"); setLabel(rule.label ?? ""); setPrice((rule.priceCents / 100).toFixed(2)); setPriority(String(rule.priority ?? 0)); setStartsOn(rule.startsOn); setEndsOn(lastIncludedDate(rule.endsOn)); setDetails(rule.details ?? ""); setEditingId(rule.id); }
  function editWeekend() { setError(null); setRuleKind("weekend"); setPrice(weekendPriceCents == null ? "" : (weekendPriceCents / 100).toFixed(2)); setEditingId(null); }

  async function load() {
    if (DEMO_MODE) return;
    const { data, error: loadError } = await getSupabaseBrowserClient().from("listing_price_rules").select("id,starts_on,ends_on,price_cents,priority,rule_kind,label,details").eq(column, listingId).order("starts_on");
    if (loadError) setError("Não foi possível carregar as regras de preço.");
    else setRules((data ?? []).map((row) => ({ id: row.id, startsOn: row.starts_on, endsOn: row.ends_on, priceCents: row.price_cents, priority: row.priority, ruleKind: row.rule_kind ?? "seasonal", label: row.label, details: row.details })));
    setLoaded(true);
  }
  useEffect(() => { load(); }, [listingId, kind]);

  async function save(event: React.FormEvent) {
    event.preventDefault(); setError(null);
    const priceCents = Math.round(Number(price.replace(",", ".")) * 100);
    if (!price || !Number.isFinite(priceCents) || priceCents < 0) return setError("Informe um valor válido.");
    if (DEMO_MODE) return setError("As regras ficam disponíveis quando o banco estiver conectado.");
    setSaving(true);
    if (ruleKind === "weekend") {
      const { data, error: updateError } = await getSupabaseBrowserClient().from(table).update({ weekend_price_cents: priceCents }).eq("id", listingId).select("id").maybeSingle();
      setSaving(false); if (updateError || !data) return setError(updateError?.message || "Sem permissão para alterar esta regra.");
      onWeekendPriceChange?.(priceCents); reset(); return;
    }
    if (!startsOn) { setSaving(false); return setError("Informe o primeiro dia da regra."); }
    if (endsOn && endsOn < startsOn) { setSaving(false); return setError("O último dia não pode ser anterior ao início."); }
    const payload = { [column]: listingId, starts_on: startsOn, ends_on: endsOn ? nextDate(endsOn) : null, price_cents: priceCents, priority: Number(priority), rule_kind: ruleKind, label: label.trim() || null, details: details.trim() || null };
    const { error: saveError } = editingId ? await getSupabaseBrowserClient().from("listing_price_rules").update(payload).eq("id", editingId) : await getSupabaseBrowserClient().from("listing_price_rules").insert(payload);
    setSaving(false); if (saveError) return setError("Não foi possível salvar esta regra.");
    reset(); await load();
  }
  async function removeRule(id: string) { if (DEMO_MODE) return; const { error: deleteError } = await getSupabaseBrowserClient().from("listing_price_rules").delete().eq("id", id); if (deleteError) return setError("Não foi possível remover esta regra."); await load(); }
  async function clearWeekend() { if (DEMO_MODE) return; setSaving(true); const { data, error: updateError } = await getSupabaseBrowserClient().from(table).update({ weekend_price_cents: null }).eq("id", listingId).select("id").maybeSingle(); setSaving(false); if (updateError || !data) return setError(updateError?.message || "Sem permissão para remover esta regra."); onWeekendPriceChange?.(null); reset(); }
  async function changeVisibility(value: boolean) { if (DEMO_MODE) return; setSaving(true); const { error: updateError } = await getSupabaseBrowserClient().from("properties").update({ show_public_prices: value }).eq("id", listingId); setSaving(false); if (updateError) return setError("Não foi possível atualizar a visibilidade dos preços."); onVisibilityChange?.(value); }

  const isWeekend = ruleKind === "weekend";
  return <div className="space-y-5">
    <div className="card p-6"><h2 className="font-display text-lg font-semibold text-tinta">Preços e regras</h2><p className="mt-1 text-sm text-tinta-mute">Dias úteis usam o valor padrão: <strong className="text-tinta">{formatBRL(basePriceCents)} {unit}</strong>. A regra de feriado ou temporada por data sempre tem prioridade.</p>{kind === "stay" && <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-areia-50 p-3 text-sm text-tinta-soft"><input type="checkbox" className="mt-0.5 h-4 w-4" checked={showPublicPrices} disabled={saving} onChange={(e) => changeVisibility(e.target.checked)} /><span><strong className="text-tinta">Mostrar preços publicamente</strong><br />Deixe desligado até autorizar a divulgação desta hospedagem.</span></label>}</div>
    <form onSubmit={save} className="card space-y-4 p-6"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold text-tinta">{editingId ? "Editar regra" : isWeekend ? "Regra de fim de semana" : "Nova regra"}</h3>{(editingId || isWeekend) && <button type="button" onClick={reset} className="btn-secondary btn-sm">Cancelar</button>}</div><div className={`grid gap-3 ${isWeekend ? "sm:grid-cols-2" : "sm:grid-cols-4"}`}><div><label className="label" htmlFor="rule-kind">Tipo</label><select id="rule-kind" className="input" value={ruleKind} onChange={(e) => { const value = e.target.value as FormRuleKind; setRuleKind(value); if (value === "holiday" && Number(priority) < 20) setPriority("20"); if (value === "weekend") { setPrice(weekendPriceCents == null ? "" : (weekendPriceCents / 100).toFixed(2)); setEditingId(null); } }}><option value="seasonal">Temporada</option><option value="holiday">Feriado</option><option value="weekend">Fim de semana</option><option value="special">Data especial</option></select></div>{!isWeekend && <><div><label className="label" htmlFor="rule-name">Nome</label><input id="rule-name" className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: Réveillon" /></div><div><label className="label" htmlFor="rule-priority">Prioridade</label><select id="rule-priority" className="input" value={priority} onChange={(e) => setPriority(e.target.value)}><option value="0">Normal</option><option value="10">Preferencial</option><option value="20">Máxima (feriado)</option></select></div></>}<div><label className="label" htmlFor="rule-price">Valor (R$) *</label><input id="rule-price" type="number" min="0" step="0.01" required className="input" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="180,00" /></div></div>{isWeekend ? <p className="rounded-xl bg-areia-50 p-3 text-sm text-tinta-soft">Esta regra se aplica automaticamente a todos os sábados e domingos, sem precisar informar datas.</p> : <><div className="grid gap-3 sm:grid-cols-2"><div><label className="label" htmlFor="rule-start">Primeiro dia *</label><input id="rule-start" type="date" required className="input" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} /></div><div><label className="label" htmlFor="rule-end">Último dia</label><input id="rule-end" type="date" min={startsOn || undefined} className="input" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} /><p className="mt-1 text-xs text-tinta-mute">Vazio = até nova alteração.</p></div></div><div><label className="label" htmlFor="rule-details">Inclusões / observação</label><input id="rule-details" className="input" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Ex.: Com almoço incluso" /></div></>}{error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}<button disabled={saving} className="btn-primary btn-sm">{saving ? "Salvando…" : isWeekend ? "Salvar fim de semana" : editingId ? "Salvar alterações" : "Adicionar regra"}</button></form>
    <div className="card divide-y divide-areia-200"><div className="p-5"><h3 className="font-semibold text-tinta">Regras cadastradas</h3></div>{weekendPriceCents != null && <div className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm"><div><p className="font-semibold text-tinta">Fim de semana · {formatBRL(weekendPriceCents)} {unit}</p><p className="mt-1 text-tinta-mute">Recorrente em todos os sábados e domingos.</p></div><div className="flex gap-2"><button type="button" onClick={editWeekend} className="btn-outline btn-sm">Editar</button><button type="button" onClick={clearWeekend} className="btn-danger btn-sm">Remover</button></div></div>}{!loaded ? <div className="h-16 animate-pulse" /> : rules.length === 0 ? <p className="p-5 text-sm text-tinta-mute">Nenhuma regra por data cadastrada.</p> : rules.map((rule) => <div key={rule.id} className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm"><div><p className="font-semibold text-tinta">{ruleLabel(rule.ruleKind)} · {rule.label || "Sem nome"} · {formatBRL(rule.priceCents)} {unit}</p><p className="mt-1 text-tinta-mute">{rule.startsOn.split("-").reverse().join("/")} até {rule.endsOn ? lastIncludedDate(rule.endsOn).split("-").reverse().join("/") : "nova alteração"}{rule.details ? ` · ${rule.details}` : ""}</p></div><div className="flex gap-2"><button type="button" onClick={() => editRule(rule)} className="btn-outline btn-sm">Editar</button><button type="button" onClick={() => removeRule(rule.id)} className="btn-danger btn-sm">Remover</button></div></div>)}</div>
  </div>;
}
