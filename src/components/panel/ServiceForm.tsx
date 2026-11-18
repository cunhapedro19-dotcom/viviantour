"use client";

import { useState } from "react";
import { Artwork } from "@/components/Artwork";
import { CreationMediaPicker } from "@/components/panel/CreationMediaPicker";
import type { MediaItem } from "@/lib/media-ops";
import { demoStays, demoTours } from "@/lib/demo-data";
import type { NewTourInput, Tour } from "@/lib/types";

export const TOUR_CATEGORIES = [
  { slug: "passeio-de-barco", label: "Passeio de barco" },
  { slug: "escuna", label: "Passeio de escuna" },
  { slug: "mergulho", label: "Mergulho" },
  { slug: "experiencia-nautica", label: "Experiência náutica" },
  { slug: "city-tour", label: "City tour" },
  { slug: "pesca-esportiva", label: "Pesca esportiva" },
];

const IMAGE_POOL = [...demoTours, ...demoStays].flatMap((i) => i.images).slice(0, 18);

export function ServiceForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Tour | null;
  submitLabel: string;
  onSubmit: (input: NewTourInput) => Promise<boolean>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.categorySlug ?? TOUR_CATEGORIES[0].slug);
  const [kind, setKind] = useState<Tour["kind"]>(initial?.kind ?? "boat_tour");
  const [duration, setDuration] = useState(initial?.durationMinutes ?? 180);
  const [meetingPoint, setMeetingPoint] = useState(initial?.meetingPoint ?? "");
  const [price, setPrice] = useState(initial ? initial.pricePerPersonCents / 100 : 120);
  const [minGuests, setMinGuests] = useState(initial?.minGuests ?? 1);
  const [maxGuests, setMaxGuests] = useState(initial?.maxGuests ?? 20);
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [itinerary, setItinerary] = useState((initial?.itinerary ?? []).map((s) => s.title).join("\n"));
  const [included, setIncluded] = useState((initial?.included ?? []).join("\n"));
  const [seeds, setSeeds] = useState<string[]>(initial?.images ?? []);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleSeed(seed: string) {
    setSeeds((l) => (l.includes(seed) ? l.filter((s) => s !== seed) : [...l, seed]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || price <= 0) {
      setError("Informe ao menos o nome e o preço por pessoa.");
      return;
    }
    setBusy(true);
    const ok = await onSubmit({
      name: name.trim(),
      categoryId: category,
      categoryLabel: TOUR_CATEGORIES.find((c) => c.slug === category)?.label ?? "Passeio",
      kind,
      durationMinutes: duration,
      meetingPoint: meetingPoint.trim(),
      pricePerPersonCents: Math.round(price * 100),
      minGuests,
      maxGuests,
      summary: summary.trim(),
      description: description.trim(),
      itinerary: itinerary.split("\n").map((l) => l.trim()).filter(Boolean),
      included: included.split("\n").map((l) => l.trim()).filter(Boolean),
      imageSeeds: seeds,
      media,
    });
    if (!ok) setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <section className="card space-y-4 p-6">
        <h2 className="font-display text-lg font-semibold text-tinta">Informações do passeio</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="t-name">Nome do passeio *</label>
            <input id="t-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Escuna: 6 praias e ilhas com parada na Fenda" />
          </div>
          <div>
            <label className="label" htmlFor="t-cat">Categoria</label>
            <select id="t-cat" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {TOUR_CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="t-kind">Tipo</label>
            <select id="t-kind" className="input" value={kind} onChange={(e) => setKind(e.target.value as Tour["kind"])}>
              <option value="boat_tour">Passeio de barco</option>
              <option value="experience">Experiência</option>
              <option value="guide">Guia / city tour</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="t-summary">Resumo (aparece nos cartões)</label>
            <input id="t-summary" className="input" value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="t-desc">Descrição completa</label>
            <textarea id="t-desc" className="input min-h-[120px]" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="font-display text-lg font-semibold text-tinta">Operação</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="t-dur">Duração (minutos)</label>
            <input id="t-dur" type="number" min={15} step={15} className="input" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
          </div>
          <div>
            <label className="label" htmlFor="t-price">Preço por pessoa (R$) *</label>
            <input id="t-price" type="number" min={1} className="input" value={price} onChange={(e) => setPrice(Number(e.target.value))} />
          </div>
          <div>
            <label className="label" htmlFor="t-max">Capacidade máxima</label>
            <input id="t-max" type="number" min={1} max={200} className="input" value={maxGuests} onChange={(e) => setMaxGuests(Number(e.target.value))} />
          </div>
          <div>
            <label className="label" htmlFor="t-min">Mínimo de hóspedes</label>
            <input id="t-min" type="number" min={1} className="input" value={minGuests} onChange={(e) => setMinGuests(Number(e.target.value))} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="t-meet">Local de embarque / encontro</label>
            <input id="t-meet" className="input" value={meetingPoint} onChange={(e) => setMeetingPoint(e.target.value)} placeholder="Ex.: Cais Turístico — Praia dos Anjos (chegar 30 min antes)" />
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="font-display text-lg font-semibold text-tinta">Roteiro e inclusões</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="t-itin">Roteiro (uma etapa por linha, em ordem)</label>
            <textarea id="t-itin" className="input min-h-[120px]" value={itinerary} onChange={(e) => setItinerary(e.target.value)} placeholder={"Embarque na Praia dos Anjos\nVolta da Ilha do Farol\nParada na Fenda"} />
          </div>
          <div>
            <label className="label" htmlFor="t-inc">Incluído (um item por linha)</label>
            <textarea id="t-inc" className="input min-h-[120px]" value={included} onChange={(e) => setIncluded(e.target.value)} placeholder={"Guia credenciado\nMáscara de snorkel\nColete salva-vidas"} />
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-6">
        {!initial && <CreationMediaPicker onChange={setMedia} />}
        <h2 className="font-display text-lg font-semibold text-tinta">Fotos</h2>
        <p className="text-sm text-tinta-mute">
          Selecione as imagens (a primeira é a capa). Upload direto entra na próxima fase.
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {IMAGE_POOL.map((seed) => (
            <button
              key={seed}
              type="button"
              onClick={() => toggleSeed(seed)}
              className={`relative aspect-square overflow-hidden rounded-xl border-2 transition ${
                seeds.includes(seed) ? "border-turquesa-500" : "border-transparent opacity-80 hover:opacity-100"
              }`}
            >
              <Artwork seed={seed} alt="" className="h-full w-full object-cover" />
              {seeds.includes(seed) && (
                <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-turquesa-500 text-[10px] font-bold text-white">
                  ✓
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex justify-end">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "Salvando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
