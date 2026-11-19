"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatBRL, slugify } from "@/lib/format";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type Item = { id: string; kind: "stay" | "tour"; name: string; slug: string };
type Combo = { id: string; name: string; slug: string; summary: string; description: string; priceCents: number | null; status: string; itemIds: string[]; itemNames: string[] };

export default function AdminCombosPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState(""); const [summary, setSummary] = useState(""); const [description, setDescription] = useState(""); const [price, setPrice] = useState(""); const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);

  async function load() {
    const sb = getSupabaseBrowserClient();
    const [stays, tours, comboRows] = await Promise.all([
      sb.from("properties").select("id,name,slug").order("name"),
      sb.from("services").select("id,name,slug").order("name"),
      sb.from("combos").select("id,name,slug,summary,description,price_cents,status,items:combo_items(property:properties(id,name),service:services(id,name))").order("created_at", { ascending: false }),
    ]);
    setItems([...(stays.data ?? []).map((x) => ({ ...x, kind: "stay" as const })), ...(tours.data ?? []).map((x) => ({ ...x, kind: "tour" as const }))]);
    setCombos((comboRows.data ?? []).map((row: any) => {
      const comboItems = row.items ?? [];
      const mapped = comboItems.map((item: any) => item.property ?? item.service).filter(Boolean);
      return { id: row.id, name: row.name, slug: row.slug, summary: row.summary ?? "", description: row.description ?? "", priceCents: row.price_cents, status: row.status, itemIds: mapped.map((item: any) => item.id), itemNames: mapped.map((item: any) => item.name) };
    }));
  }
  useEffect(() => { load(); }, []);

  function clear() { setEditing(null); setName(""); setSummary(""); setDescription(""); setPrice(""); setSelected([]); setError(null); }
  function toggle(id: string) { setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]); }
  function edit(combo: Combo) { setEditing(combo.id); setName(combo.name); setSummary(combo.summary); setDescription(combo.description); setPrice(combo.priceCents ? String(combo.priceCents / 100) : ""); setSelected(combo.itemIds); window.scrollTo({ top: 0, behavior: "smooth" }); }

  async function save(event: React.FormEvent) {
    event.preventDefault(); setError(null);
    if (!name.trim() || selected.length < 2) return setError("Dê um nome ao combo e escolha pelo menos dois anúncios.");
    setBusy(true); const sb = getSupabaseBrowserClient();
    const payload = { name: name.trim(), slug: `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`, summary: summary.trim() || null, description: description.trim() || null, price_cents: price ? Math.round(Number(price.replace(",", ".")) * 100) : null, status: "draft" };
    let comboId = editing;
    if (editing) {
      const { error: updateError } = await sb.from("combos").update({ ...payload, slug: undefined }).eq("id", editing);
      if (updateError) { setBusy(false); setError("Não foi possível salvar o combo."); return; }
      await sb.from("combo_items").delete().eq("combo_id", editing);
    } else {
      const { data, error: insertError } = await sb.from("combos").insert(payload).select("id").single();
      if (insertError || !data) { setBusy(false); setError("Não foi possível criar o combo."); return; }
      comboId = data.id;
    }
    const records = selected.map((id, sort) => ({ combo_id: comboId, property_id: items.find((item) => item.id === id)?.kind === "stay" ? id : null, service_id: items.find((item) => item.id === id)?.kind === "tour" ? id : null, sort }));
    const { error: itemsError } = await sb.from("combo_items").insert(records);
    setBusy(false);
    if (itemsError) { setError("O combo foi salvo, mas não foi possível associar todos os anúncios."); return; }
    clear(); await load();
  }
  async function publish(combo: Combo) { await getSupabaseBrowserClient().from("combos").update({ status: combo.status === "published" ? "paused" : "published" }).eq("id", combo.id); await load(); }

  return <div className="space-y-6">
    <header><h1 className="font-display text-2xl font-semibold text-tinta">Combos e pacotes</h1><p className="mt-1 text-sm text-tinta-mute">Monte pacotes com mais de um passeio ou com hospedagem + passeios.</p></header>
    <form onSubmit={save} className="card space-y-4 p-6"><div className="flex items-center justify-between gap-3"><h2 className="font-display text-lg font-semibold text-tinta">{editing ? "Editar combo" : "Novo combo"}</h2>{editing && <button type="button" onClick={clear} className="btn-outline btn-sm">Cancelar edição</button>}</div><div className="grid gap-3 sm:grid-cols-2"><div><label className="label">Nome *</label><input required className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Arraial completo" /></div><div><label className="label">Preço do pacote (R$)</label><input type="number" min="0" step="0.01" className="input" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Opcional — consultar valor" /></div></div><div><label className="label">Resumo</label><input className="input" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Uma frase para vender o pacote" /></div><div><label className="label">Descrição</label><textarea className="input min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Explique como funciona o pacote e o que pode variar." /></div><div><p className="label">Inclua os anúncios *</p><div className="grid max-h-64 gap-2 overflow-y-auto rounded-xl border border-areia-200 p-3 sm:grid-cols-2">{items.map((item) => <label key={item.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-areia-50"><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} /><span className="font-medium text-tinta">{item.name}</span><span className="text-xs text-tinta-mute">{item.kind === "stay" ? "Hospedagem" : "Passeio"}</span></label>)}</div></div>{error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}<button disabled={busy} className="btn-turquesa btn-sm">{busy ? "Salvando…" : editing ? "Salvar combo" : "Criar combo"}</button></form>
    <section className="card divide-y divide-areia-200"><div className="p-5"><h2 className="font-semibold text-tinta">Pacotes criados</h2></div>{combos.length === 0 ? <p className="p-5 text-sm text-tinta-mute">Nenhum combo criado ainda.</p> : combos.map((combo) => <div key={combo.id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="font-semibold text-tinta">{combo.name} {combo.priceCents ? <span className="text-oceano-700">· {formatBRL(combo.priceCents)}</span> : null}</p><p className="mt-1 text-sm text-tinta-mute">{combo.itemNames.join(" + ")}</p><p className="mt-1 text-xs text-tinta-mute">{combo.status === "published" ? "Publicado" : combo.status === "paused" ? "Pausado" : "Rascunho"}</p></div><div className="flex gap-2">{combo.status === "published" && <Link href={`/combo/${combo.slug}`} target="_blank" className="btn-outline btn-sm">Ver página</Link>}<button onClick={() => edit(combo)} className="btn-outline btn-sm">Editar</button><button onClick={() => publish(combo)} className="btn-turquesa btn-sm">{combo.status === "published" ? "Pausar" : "Publicar"}</button></div></div>)}</section>
  </div>;
}
