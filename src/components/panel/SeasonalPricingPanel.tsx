"use client";

import { useEffect, useState } from "react";
import { formatBRL } from "@/lib/format";
import { DEMO_MODE } from "@/lib/config";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SeasonalPriceRule } from "@/lib/types";

type Kind = "stay" | "tour" | "combo";
type RuleKind = "seasonal" | "holiday" | "special";

function localDateAfter(iso: string) { const date = new Date(`${iso}T12:00:00`); date.setDate(date.getDate() + 1); return date.toISOString().slice(0, 10); }
function lastIncludedDate(endsOn?: string | null) { if (!endsOn) return ""; const date = new Date(`${endsOn}T12:00:00`); date.setDate(date.getDate() - 1); return date.toISOString().slice(0, 10); }
function ruleTypeLabel(kind?: RuleKind) { return kind === "holiday" ? "Feriado" : kind === "special" ? "Data especial" : "Temporada"; }

export function SeasonalPricingPanel({ kind, listingId, basePriceCents, weekendPriceCents = null, showPublicPrices = false, onVisibilityChange, onWeekendPriceChange }: { kind: Kind; listingId: string; basePriceCents: number; weekendPriceCents?: number | null; showPublicPrices?: boolean; onVisibilityChange?: (value: boolean) => void; onWeekendPriceChange?: (value: number | null) => void; }) {
  const [rules, setRules] = useState<SeasonalPriceRule[]>([]);
  const [loaded, setLoaded] = useState(DEMO_MODE);
  const [label, setLabel] = useState(""); const [details, setDetails] = useState(""); const [startsOn, setStartsOn] = useState(""); const [endsOn, setEndsOn] = useState(""); const [price, setPrice] = useState(""); const [priority, setPriority] = useState("0"); const [ruleKind, setRuleKind] = useState<RuleKind>("seasonal");
  const [weekendPrice, setWeekendPrice] = useState(weekendPriceCents == null ? "" : (weekendPriceCents / 100).toFixed(2));
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null); const [saving, setSaving] = useState(false); const [error, setError] = useState<string | null>(null);
  const column = kind === "stay" ? "property_id" : kind === "tour" ? "service_id" : "combo_id";
  const table = kind === "stay" ? "properties" : kind === "tour" ? "services" : "combos";

  function clearForm() { setLabel(""); setDetails(""); setStartsOn(""); setEndsOn(""); setPrice(""); setPriority("0"); setRuleKind("seasonal"); setEditingRuleId(null); }
  function editRule(rule: SeasonalPriceRule) { setError(null); setEditingRuleId(rule.id); setLabel(rule.label ?? ""); setDetails(rule.details ?? ""); setStartsOn(rule.startsOn); setEndsOn(lastIncludedDate(rule.endsOn)); setPrice((rule.priceCents / 100).toFixed(2)); setPriority(String(rule.priority ?? 0)); setRuleKind(rule.ruleKind ?? "seasonal"); }

  async function load() {
    if (DEMO_MODE) return;
    const { data, error: queryError } = await getSupabaseBrowserClient().from("listing_price_rules").select("id,starts_on,ends_on,price_cents,priority,rule_kind,label,details").eq(column, listingId).order("starts_on");
    if (queryError) setError("Não foi possível carregar as regras de preço.");
    else setRules((data ?? []).map((r) => ({ id: r.id, startsOn: r.starts_on, endsOn: r.ends_on, priceCents: r.price_cents, priority: r.priority, ruleKind: r.rule_kind ?? "seasonal", label: r.label, details: r.details })));
    setLoaded(true);
  }
  useEffect(() => { load(); }, [listingId, kind]);

  async function saveRule(event: React.FormEvent) {
    event.preventDefault(); setError(null);
    if (!startsOn || !price || Number(price) < 0) return setError("Informe o início e o valor da regra.");
    if (endsOn && endsOn < startsOn) return setError("O último dia não pode ser anterior ao início.");
    if (DEMO_MODE) return setError("As regras por período ficam disponíveis quando o banco estiver conectado.");
    setSaving(true);
    const payload = { [column]: listingId, starts_on: startsOn, ends_on: endsOn ? localDateAfter(endsOn) : null, price_cents: Math.round(Number(price.replace(",", ".")) * 100), priority: Number(priority), rule_kind: ruleKind, label: label.trim() || null, details: details.trim() || null };
    const { error: saveError } = editingRuleId ? await getSupabaseBrowserClient().from("listing_price_rules").update(payload).eq("id", editingRuleId) : await getSupabaseBrowserClient().from("listing_price_rules").insert(payload);
    setSaving(false); if (saveError) return setError("Não foi possível salvar esta regra.");
    clearForm(); await load();
  }
  async function removeRule(id: string) { if (DEMO_MODE) return; const { error: deleteError } = await getSupabaseBrowserClient().from("listing_price_rules").delete().eq("id", id); if (deleteError) return setError("Não foi possível remover esta regra."); await load(); }
  async function saveWeekendPrice() {
    if (DEMO_MODE) return setError("As tarifas ficam disponíveis quando o banco estiver conectado.");
    const value = weekendPrice.trim() === "" ? null : Math.round(Number(weekendPrice.replace(",", ".")) * 100);
    if (value != null && (!Number.isFinite(value) || value < 0)) return setError("Informe um valor válido para sábado e domingo.");
    setSaving(true); setError(null); const { error: updateError } = await getSupabaseBrowserClient().from(table).update({ weekend_price_cents: value }).eq("id", listingId); setSaving(false);
    if (updateError) return setError("Não foi possível salvar a tarifa de fim de semana."); onWeekendPriceChange?.(value);
  }
  async function changeVisibility(value: boolean) { if (DEMO_MODE) return; setSaving(true); setError(null); const { error: updateError } = await getSupabaseBrowserClient().from("properties").update({ show_public_prices: value }).eq("id", listingId); setSaving(false); if (updateError) return setError("Não foi possível atualizar a visibilidade dos preços."); onVisibilityChange?.(value); }

  const unit = kind === "stay" ? "por noite" : kind === "tour" ? "por pessoa" : "no pacote";
  return <div className="space-y-5">
    <div className="card p-6"><h2 className="font-display text-lg font-semibold text-tinta">Preços e regras</h2><p className="mt-1 text-sm text-tinta-mute">Dias úteis usam o valor padrão: <strong className="text-tinta">{formatBRL(basePriceCents)} {unit}</strong>. Regras de feriado e temporada por data substituem qualquer outra tarifa.</p><div className="mt-4 rounded-xl bg-areia-50 p-4"><label className="label" htmlFor="weekend-price">Sábado e domingo (R$)</label><div className="mt-1 flex flex-wrap gap-2"><input id="weekend-price" type="number" min="0" step="0.01" className="input max-w-xs" value={weekendPrice} onChange={(e) => setWeekendPrice(e.target.value)} placeholder="Mesmo valor dos dias úteis" /><button type="button" disabled={saving} onClick={saveWeekendPrice} className="btn-secondary btn-sm">Salvar fim de semana</button></div><p className="mt-1.5 text-xs text-tinta-mute">Deixe vazio para usar a tarifa de dias úteis também no fim de semana.</p></div>{kind === "stay" && <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-areia-50 p-3 text-sm text-tinta-soft"><input type="checkbox" className="mt-0.5 h-4 w-4" checked={showPublicPrices} disabled={saving} onChange={(e) => changeVisibility(e.target.checked)} /><span><strong className="text-tinta">Mostrar preços publicamente</strong><br />Deixe desligado até autorizar a divulgação desta hospedagem.</span></label>}{kind === "tour" && <p className="mt-3 rounded-xl bg-oceano-50 p-3 text-sm text-oceano-800">Os passeios exibem o menor preço como “A partir de”.</p>}</div>
    <form onSubmit={saveRule} className="card space-y-4 p-6">{editingRuleId && <div className="flex items-center justify-between gap-3 rounded-xl bg-oceano-50 p-3 text-sm text-oceano-900"><span>Editando esta regra. Salve para atualizar.</span><button type="button" onClick={clearForm} className="btn-secondary btn-sm">Cancelar</button></div>}<h3 className="font-semibold text-tinta">{editingRuleId ? "Editar regra por data" : "Nova regra por data"}</h3><div className="grid gap-3 sm:grid-cols-4"><div><label className="label" htmlFor="rule-kind">Tipo</label><select id="rule-kind" className="input" value={ruleKind} onChange={(e) => { const value = e.target.value as RuleKind; setRuleKind(value); if (value === "holiday" && Number(priority) < 20) setPriority("20"); }}><option value="seasonal">Temporada</option><option value="holiday">Feriado</option><option value="special">Data especial</option></select></div><div><label className="label" htmlFor="season-label">Nome</label><input id="season-label" className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ex.: Réveillon" /></div><div><label className="label" htmlFor="season-price">Valor (R$) *</label><input id="season-price" type="number" min="0" step="0.01" required className="input" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="180,00" /></div><div><label className="label" htmlFor="season-priority">Prioridade</label><select id="season-priority" className="input" value={priority} onChange={(e) => setPriority(e.target.value)}><option value="0">Normal</option><option value="10">Preferencial</option><option value="20">Máxima (feriado)</option></select></div></div><div className="grid gap-3 sm:grid-cols-2"><div><label className="label" htmlFor="season-start">Primeiro dia *</label><input id="season-start" type="date" required className="input" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} /></div><div><label className="label" htmlFor="season-end">Último dia</label><input id="season-end" type="date" min={startsOn || undefined} className="input" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} /><p className="mt-1 text-xs text-tinta-mute">Vazio = até nova alteração.</p></div></div><div><label className="label" htmlFor="season-details">O que está incluso / observação</label><input id="season-details" className="input" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Ex.: Com almoço incluso" /></div>{error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}<button type="submit" disabled={saving} className="btn-primary btn-sm">{saving ? "Salvando…" : editingRuleId ? "Salvar alterações" : "Adicionar regra"}</button></form>
    {rules.length > 0 && <div className="card p-5"><label className="label" htmlFor="season-edit">Editar regra cadastrada</label><select id="season-edit" className="input mt-1" value={editingRuleId ?? ""} onChange={(event) => { const rule = rules.find((item) => item.id === event.target.value); if (rule) editRule(rule); }}><option value="">Selecione uma regra para editar</option>{rules.map((rule) => <option key={rule.id} value={rule.id}>{ruleTypeLabel(rule.ruleKind)} · {rule.label || "Sem nome"} · {formatBRL(rule.priceCents)}</option>)}</select></div>}
    <div className="card divide-y divide-areia-200"><div className="p-5"><h3 className="font-semibold text-tinta">Regras cadastradas</h3></div>{!loaded ? <div className="h-16 animate-pulse" /> : rules.length === 0 ? <p className="p-5 text-sm text-tinta-mute">Nenhuma regra por data. As tarifas padrão continuam valendo.</p> : rules.map((rule) => <div key={rule.id} className="flex flex-wrap items-center justify-between gap-3 p-5 text-sm"><div><p className="font-semibold text-tinta">{ruleTypeLabel(rule.ruleKind)} · {rule.label || "Período especial"} · {formatBRL(rule.priceCents)} {unit}</p><p className="mt-1 text-tinta-mute">{rule.startsOn.split("-").reverse().join("/")} até {rule.endsOn ? lastIncludedDate(rule.endsOn).split("-").reverse().join("/") : "nova alteração"}{rule.priority ? ` · prioridade ${rule.priority}` : ""}{rule.details ? ` · ${rule.details}` : ""}</p></div><button type="button" onClick={() => removeRule(rule.id)} className="btn-danger btn-sm">Remover</button></div>)}</div>
  </div>;
}
