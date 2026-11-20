"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatBRL, slugify } from "@/lib/format";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { SeasonalPricingPanel } from "@/components/panel/SeasonalPricingPanel";
import { removeUploadedFiles, uploadMediaFile } from "@/lib/media-ops";

type Item = { id: string; kind: "stay" | "tour"; name: string; slug: string };
type Combo = {
  id: string; name: string; slug: string; summary: string; description: string; priceCents: number | null; promoPriceCents: number | null;
  promoEndsOn: string | null; priceLabel: string; additionalFees: string[]; itinerary: { title?: string; description?: string }[];
  priceOptions: { label: string; priceCents: number; details?: string; promoEndsOn?: string }[]; bookingWhatsapp: string | null;
  weekendPriceCents: number | null; coverUrl: string | null; status: string; itemIds: string[]; itemNames: string[];
};

const linesToList = (value: string) => value.split("\n").map((line) => line.trim()).filter(Boolean);

function parsePriceCents(value: string): number | null {
  const clean = value.trim();
  if (!clean) return null;
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : null;
}

export default function AdminCombosPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [combos, setCombos] = useState<Combo[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [promoPrice, setPromoPrice] = useState("");
  const [promoEndsOn, setPromoEndsOn] = useState("");
  const [priceLabel, setPriceLabel] = useState("");
  const [priceOptionsText, setPriceOptionsText] = useState("");
  const [bookingWhatsapp, setBookingWhatsapp] = useState("");
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [fees, setFees] = useState("");
  const [itinerary, setItinerary] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function load() {
    const sb = getSupabaseBrowserClient();
    const [stays, tours, comboRows] = await Promise.all([
      sb.from("properties").select("id,name,slug").order("name"),
      sb.from("services").select("id,name,slug").order("name"),
      sb.from("combos").select("id,name,slug,summary,description,price_cents,promo_price_cents,promo_ends_on,price_label,additional_fees,itinerary,price_options,booking_whatsapp,weekend_price_cents,cover_url,status,items:combo_items(property:properties(id,name),service:services(id,name))").order("created_at", { ascending: false }),
    ]);

    setItems([...(stays.data ?? []).map((row) => ({ ...row, kind: "stay" as const })), ...(tours.data ?? []).map((row) => ({ ...row, kind: "tour" as const }))]);
    setCombos((comboRows.data ?? []).map((row: any) => {
      const mapped = (row.items ?? []).map((item: any) => item.property ?? item.service).filter(Boolean);
      return {
        id: row.id, name: row.name, slug: row.slug, summary: row.summary ?? "", description: row.description ?? "", priceCents: row.price_cents,
        promoPriceCents: row.promo_price_cents ?? null, promoEndsOn: row.promo_ends_on ?? null, priceLabel: row.price_label ?? "",
        additionalFees: row.additional_fees ?? [], itinerary: row.itinerary ?? [], priceOptions: row.price_options ?? [], bookingWhatsapp: row.booking_whatsapp ?? "", weekendPriceCents: row.weekend_price_cents ?? null, status: row.status,
        coverUrl: row.cover_url ?? null, itemIds: mapped.map((item: any) => item.id), itemNames: mapped.map((item: any) => item.name),
      };
    }));
  }

  useEffect(() => { load(); }, []);

  function clear() {
    setEditing(null); setName(""); setSummary(""); setDescription(""); setPrice(""); setPromoPrice(""); setPromoEndsOn(""); setPriceLabel(""); setPriceOptionsText(""); setBookingWhatsapp(""); setCoverUrl(null); setCoverFile(null); setFees(""); setItinerary(""); setSelected([]); setError(null);
  }

  function toggle(id: string) {
    setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  }

  function edit(combo: Combo) {
    setEditing(combo.id); setName(combo.name); setSummary(combo.summary); setDescription(combo.description); setCoverUrl(combo.coverUrl); setCoverFile(null); setPrice(combo.priceCents == null ? "" : String(combo.priceCents / 100));
    setPromoPrice(combo.promoPriceCents == null ? "" : String(combo.promoPriceCents / 100)); setPromoEndsOn(combo.promoEndsOn ?? ""); setPriceLabel(combo.priceLabel); setPriceOptionsText(combo.priceOptions.map((option) => `${option.label} | ${(option.priceCents / 100).toFixed(2).replace(".", ",")}${option.details ? ` | ${option.details}` : ""}${option.promoEndsOn ? ` | ${option.promoEndsOn}` : ""}`).join("\n")); setBookingWhatsapp(combo.bookingWhatsapp ?? "");
    setFees(combo.additionalFees.join("\n")); setItinerary(combo.itinerary.map((stop) => stop.title ?? "").filter(Boolean).join("\n")); setSelected(combo.itemIds); setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim() || selected.length < 2) return setError("Dê um nome ao combo e escolha pelo menos dois anúncios.");
    const priceCents = parsePriceCents(price);
    const promoPriceCents = parsePriceCents(promoPrice);
    if (price && priceCents == null) return setError("Informe um preço normal válido.");
    if (promoPrice && promoPriceCents == null) return setError("Informe um preço promocional válido.");
    if (promoPriceCents != null && !promoEndsOn) return setError("Informe até que dia o preço promocional vale.");
    const priceOptions = linesToList(priceOptionsText).map((line) => {
      const [label, rawPrice, details, promoEndsOn] = line.split("|").map((part) => part.trim());
      return { label, priceCents: parsePriceCents(rawPrice ?? ""), details: details || undefined, promoEndsOn: promoEndsOn || undefined };
    });
    if (priceOptions.some((option) => !option.label || option.priceCents == null)) return setError("Nas modalidades, use uma linha no formato: nome | 550,00 | observação opcional.");

    setBusy(true);
    const sb = getSupabaseBrowserClient();
    const payload = {
      name: name.trim(), summary: summary.trim() || null, description: description.trim() || null, price_cents: priceCents,
      promo_price_cents: promoPriceCents, promo_ends_on: promoPriceCents == null ? null : promoEndsOn, price_label: priceLabel.trim() || null,
      additional_fees: linesToList(fees), itinerary: linesToList(itinerary).map((title) => ({ title })), price_options: priceOptions,
      booking_whatsapp: bookingWhatsapp.trim() || null,
    };

    let comboId = editing;
    if (editing) {
      const { error: updateError } = await sb.from("combos").update(payload).eq("id", editing);
      if (updateError) { setBusy(false); setError("Não foi possível salvar o combo. Confira os campos e tente novamente."); return; }
      const { error: deleteItemsError } = await sb.from("combo_items").delete().eq("combo_id", editing);
      if (deleteItemsError) { setBusy(false); setError("O combo foi salvo, mas não foi possível atualizar os anúncios incluídos."); return; }
    } else {
      const { data, error: insertError } = await sb.from("combos").insert({ ...payload, slug: `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`, status: "draft" }).select("id").single();
      if (insertError || !data) { setBusy(false); setError("Não foi possível criar o combo."); return; }
      comboId = data.id;
    }

    if (coverFile && comboId) {
      const { data: { user } } = await sb.auth.getUser();
      if (!user) { setBusy(false); setError("Entre novamente antes de enviar a imagem do combo."); return; }
      const uploaded = await uploadMediaFile(coverFile, `${user.id}/combos/${comboId}`);
      if (!uploaded.ok) { setBusy(false); setError(uploaded.error); return; }
      const { error: coverError } = await sb.from("combos").update({ cover_url: uploaded.url }).eq("id", comboId);
      if (coverError) { await removeUploadedFiles([uploaded.url]); setBusy(false); setError("A imagem foi enviada, mas não foi possível vinculá-la ao combo."); return; }
      setCoverUrl(uploaded.url);
    }

    const records = selected.map((id, sort) => ({
      combo_id: comboId,
      property_id: items.find((item) => item.id === id)?.kind === "stay" ? id : null,
      service_id: items.find((item) => item.id === id)?.kind === "tour" ? id : null,
      sort,
    }));
    const { error: itemsError } = await sb.from("combo_items").insert(records);
    setBusy(false);
    if (itemsError) { setError("O combo foi salvo, mas não foi possível associar todos os anúncios."); return; }
    clear(); await load();
  }

  async function publish(combo: Combo) {
    const { error: updateError } = await getSupabaseBrowserClient().from("combos").update({ status: combo.status === "published" ? "paused" : "published" }).eq("id", combo.id);
    if (updateError) return setError("Não foi possível alterar o status do combo.");
    await load();
  }

  async function remove(combo: Combo) {
    if (!window.confirm(`Excluir definitivamente o combo "${combo.name}"? Esta ação não pode ser desfeita.`)) return;
    setDeletingId(combo.id);
    const { error: deleteError } = await getSupabaseBrowserClient().from("combos").delete().eq("id", combo.id);
    if (deleteError) { setError("Não foi possível excluir o combo."); setDeletingId(null); return; }
    if (editing === combo.id) clear();
    await load(); setDeletingId(null);
  }

  return <div className="space-y-6">
    <header><h1 className="font-display text-2xl font-semibold text-tinta">Combos e pacotes</h1><p className="mt-1 text-sm text-tinta-mute">Cadastre o valor normal, a campanha temporária, roteiro, taxas e os anúncios que compõem cada oferta.</p></header>
    <form onSubmit={save} className="card space-y-4 p-6">
      <div className="flex items-center justify-between gap-3"><h2 className="font-display text-lg font-semibold text-tinta">{editing ? "Editar combo" : "Novo combo"}</h2>{editing && <button type="button" onClick={clear} className="btn-outline btn-sm">Cancelar edição</button>}</div>
      <div className="grid gap-3 sm:grid-cols-2"><div><label className="label">Nome *</label><input required className="input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Barco + buggy para casal" /></div><div><label className="label">Complemento do preço</label><input className="input" value={priceLabel} onChange={(event) => setPriceLabel(event.target.value)} placeholder="Ex.: para 2 pessoas" /></div></div>
      <div className="grid gap-3 sm:grid-cols-3"><div><label className="label">Preço normal (R$)</label><input type="number" min="0" step="0.01" className="input" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="500,00" /></div><div><label className="label">Preço promocional (R$)</label><input type="number" min="0" step="0.01" className="input" value={promoPrice} onChange={(event) => setPromoPrice(event.target.value)} placeholder="350,00" /></div><div><label className="label">Promoção válida até</label><input type="date" className="input" value={promoEndsOn} onChange={(event) => setPromoEndsOn(event.target.value)} /></div></div>
      <div className="grid gap-3 sm:grid-cols-2"><div><label className="label">Modalidades de valor</label><textarea className="input min-h-[94px]" value={priceOptionsText} onChange={(event) => setPriceOptionsText(event.target.value)} placeholder={"Uma modalidade por linha\nSegunda a quinta | 350,00 | Promoção | 2026-12-25\nSexta a domingo | 370,00 | Promoção | 2026-12-25"} /><p className="mt-1 text-xs text-tinta-mute">Formato: período | preço | observação opcional | último dia da promoção (AAAA-MM-DD). Preços expirados deixam de ser apresentados como válidos.</p></div><div><label className="label">WhatsApp de reserva</label><input inputMode="tel" className="input" value={bookingWhatsapp} onChange={(event) => setBookingWhatsapp(event.target.value)} placeholder="Ex.: 21964372540" /><p className="mt-1 text-xs text-tinta-mute">Opcional. Vazio usa o WhatsApp geral da Viviantourr.</p></div></div>
      <div><label className="label">Resumo</label><input className="input" value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Duas experiências para aproveitar Arraial em um só dia." /></div>
      <div><label className="label">Descrição</label><textarea className="input min-h-[100px]" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Explique como funciona o pacote, a duração e como as experiências podem ser feitas." /></div>
      <div><label className="label">Imagem do anúncio</label><input type="file" accept="image/jpeg,image/png,image/webp" className="input" onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)} /><p className="mt-1 text-xs text-tinta-mute">A imagem selecionada será enviada ao salvar. {coverFile ? `Arquivo: ${coverFile.name}` : coverUrl ? "Este combo já tem uma imagem; selecione outra para substituí-la." : "Envie JPG, PNG ou WebP para a capa do combo."}</p></div>
      <div className="grid gap-3 sm:grid-cols-2"><div><label className="label">Roteiro do combo</label><textarea className="input min-h-[120px]" value={itinerary} onChange={(event) => setItinerary(event.target.value)} placeholder={"Uma parada ou etapa por linha\nEx.: Passeio de barco pelas praias de Arraial\nEx.: Buggy tradicional"} /><p className="mt-1 text-xs text-tinta-mute">Uma etapa por linha.</p></div><div><label className="label">Taxas e informações adicionais</label><textarea className="input min-h-[120px]" value={fees} onChange={(event) => setFees(event.target.value)} placeholder={"Uma informação por linha\nEx.: Taxa de embarque não inclusa\nEx.: Sujeito à disponibilidade"} /><p className="mt-1 text-xs text-tinta-mute">Elas aparecem separadas do preço do pacote.</p></div></div>
      <div><p className="label">Inclua os anúncios *</p><div className="grid max-h-64 gap-2 overflow-y-auto rounded-xl border border-areia-200 p-3 sm:grid-cols-2">{items.map((item) => <label key={item.id} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-areia-50"><input type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} /><span className="font-medium text-tinta">{item.name}</span><span className="text-xs text-tinta-mute">{item.kind === "stay" ? "Hospedagem" : "Passeio"}</span></label>)}</div></div>
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <button disabled={busy} className="btn-turquesa btn-sm">{busy ? "Salvando…" : editing ? "Salvar combo" : "Criar combo"}</button>
    </form>
    {editing && <SeasonalPricingPanel kind="combo" listingId={editing} basePriceCents={combos.find((combo) => combo.id === editing)?.priceCents ?? 0} weekendPriceCents={combos.find((combo) => combo.id === editing)?.weekendPriceCents ?? null} onWeekendPriceChange={(value) => setCombos((current) => current.map((combo) => combo.id === editing ? { ...combo, weekendPriceCents: value } : combo))} />}
    <section className="card divide-y divide-areia-200"><div className="p-5"><h2 className="font-semibold text-tinta">Pacotes criados</h2></div>{combos.length === 0 ? <p className="p-5 text-sm text-tinta-mute">Nenhum combo criado ainda.</p> : combos.map((combo) => <div key={combo.id} className="flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="font-semibold text-tinta">{combo.name} {combo.promoPriceCents != null ? <><span className="ml-1 text-sm font-normal text-tinta-mute line-through">{combo.priceCents != null ? formatBRL(combo.priceCents) : ""}</span><span className="text-oceano-700"> · {formatBRL(combo.promoPriceCents)}</span></> : combo.priceCents != null ? <span className="text-oceano-700"> · {formatBRL(combo.priceCents)}</span> : null}</p>{combo.promoEndsOn && <p className="mt-1 text-xs text-coral-600">Oferta até {combo.promoEndsOn.split("-").reverse().join("/")}</p>}<p className="mt-1 text-sm text-tinta-mute">{combo.itemNames.join(" + ")}</p><p className="mt-1 text-xs text-tinta-mute">{combo.status === "published" ? "Publicado" : combo.status === "paused" ? "Pausado" : "Rascunho"}</p></div><div className="flex flex-wrap gap-2">{combo.status === "published" && <Link href={`/combo/${combo.slug}`} target="_blank" className="btn-outline btn-sm">Ver página</Link>}<button onClick={() => edit(combo)} className="btn-outline btn-sm">Editar</button><button onClick={() => publish(combo)} className="btn-turquesa btn-sm">{combo.status === "published" ? "Desativar" : combo.status === "paused" ? "Ativar" : "Publicar"}</button><button disabled={deletingId === combo.id} onClick={() => remove(combo)} className="btn-danger btn-sm">{deletingId === combo.id ? "Excluindo…" : "Excluir"}</button></div></div>)}</section>
  </div>;
}
