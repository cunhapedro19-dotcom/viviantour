"use client";

import { useState } from "react";
import { Artwork } from "@/components/Artwork";
import { CreationMediaPicker } from "@/components/panel/CreationMediaPicker";
import type { MediaItem } from "@/lib/media-ops";
import { demoStays, demoTours } from "@/lib/demo-data";
import type { NewStayInput, Stay } from "@/lib/types";

export const STAY_CATEGORIES = [
  { slug: "casa", label: "Casa" },
  { slug: "apartamento", label: "Apartamento" },
  { slug: "cobertura", label: "Cobertura" },
  { slug: "pousada", label: "Pousada" },
  { slug: "loft", label: "Loft" },
  { slug: "flat-pe-na-areia", label: "Flat pé na areia" },
];

const AMENITY_OPTIONS = [
  { key: "wifi", label: "Wi-Fi" },
  { key: "ar_condicionado", label: "Ar-condicionado" },
  { key: "cozinha", label: "Cozinha equipada" },
  { key: "piscina", label: "Piscina" },
  { key: "churrasqueira", label: "Churrasqueira" },
  { key: "estacionamento", label: "Estacionamento" },
  { key: "vista_mar", label: "Vista para o mar" },
  { key: "varanda", label: "Varanda" },
  { key: "maquina_lavar", label: "Máquina de lavar" },
  { key: "tv_streaming", label: "Smart TV com streaming" },
  { key: "berco_bebe", label: "Berço para bebê" },
  { key: "aceita_pets", label: "Aceita pets" },
  { key: "roupa_cama", label: "Roupa de cama e banho" },
  { key: "praia_proxima", label: "Praia a poucos passos" },
];

// Galeria de artes disponíveis (geradas no projeto — veja scripts/generate-artwork.py)
const IMAGE_POOL = [...demoStays, ...demoTours].flatMap((i) => i.images).slice(0, 18);

export function PropertyForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Stay | null;
  submitLabel: string;
  onSubmit: (input: NewStayInput) => Promise<boolean>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.categorySlug ?? STAY_CATEGORIES[0].slug);
  const [neighborhood, setNeighborhood] = useState(initial?.neighborhood ?? "");
  const [beachfront, setBeachfront] = useState(Boolean(initial?.beachfront));
  const [capacity, setCapacity] = useState(initial?.capacity ?? 4);
  const [bedrooms, setBedrooms] = useState(initial?.bedrooms ?? 2);
  const [bathrooms, setBathrooms] = useState(initial?.bathrooms ?? 1);
  const [basePrice, setBasePrice] = useState(initial ? initial.basePriceCents / 100 : 300);
  const [cleaningFee, setCleaningFee] = useState(initial ? initial.cleaningFeeCents / 100 : 80);
  const [minNights, setMinNights] = useState(initial?.minNights ?? 2);
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [amenities, setAmenities] = useState<string[]>(
    initial ? AMENITY_OPTIONS.filter((a) => initial.amenityLabels.includes(a.label)).map((a) => a.key) : []
  );
  const [seeds, setSeeds] = useState<string[]>(initial?.images ?? []);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle<T>(list: T[], item: T): T[] {
    return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || basePrice <= 0) {
      setError("Informe ao menos o nome e o valor da diária.");
      return;
    }
    setBusy(true);
    const ok = await onSubmit({
      name: name.trim(),
      categoryId: category,
      categoryLabel: STAY_CATEGORIES.find((c) => c.slug === category)?.label ?? "Hospedagem",
      neighborhood: neighborhood.trim(),
      beachfront,
      capacity,
      bedrooms,
      bathrooms,
      basePriceCents: Math.round(basePrice * 100),
      cleaningFeeCents: Math.round(cleaningFee * 100),
      minNights,
      summary: summary.trim(),
      description: description.trim(),
      amenities,
      imageSeeds: seeds,
      media,
    });
    if (!ok) setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-8">
      <section className="card space-y-4 p-6">
        <h2 className="font-display text-lg font-semibold text-tinta">Informações básicas</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="p-name">Nome do anúncio *</label>
            <input id="p-name" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Casa Vista Atalaia com piscina" />
          </div>
          <div>
            <label className="label" htmlFor="p-cat">Categoria</label>
            <select id="p-cat" className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {STAY_CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="p-hood">Bairro / região</label>
            <input id="p-hood" className="input" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="Ex.: Ponta do Atalaia" />
          </div>
          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-areia-200 px-4 py-3 text-sm text-tinta-soft sm:col-span-2">
            <span><strong className="block text-tinta">Pé na areia</strong><span className="text-xs text-tinta-mute">Ative somente para imóvel com acesso direto à praia.</span></span>
            <input type="checkbox" className="h-5 w-5 accent-turquesa-500" checked={beachfront} onChange={(e) => setBeachfront(e.target.checked)} />
          </label>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="p-summary">Resumo (aparece nos cartões)</label>
            <input id="p-summary" className="input" value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Uma frase que vende o imóvel." />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="p-desc">Descrição completa</label>
            <textarea id="p-desc" className="input min-h-[140px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Conte como é se hospedar aí. Separe parágrafos com linha em branco." />
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="font-display text-lg font-semibold text-tinta">Capacidade e tarifas</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="p-cap">Hóspedes</label>
            <input id="p-cap" type="number" min={1} max={30} className="input" value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} />
          </div>
          <div>
            <label className="label" htmlFor="p-bed">Quartos</label>
            <input id="p-bed" type="number" min={1} max={15} className="input" value={bedrooms} onChange={(e) => setBedrooms(Number(e.target.value))} />
          </div>
          <div>
            <label className="label" htmlFor="p-bath">Banheiros</label>
            <input id="p-bath" type="number" min={1} max={10} step="0.5" className="input" value={bathrooms} onChange={(e) => setBathrooms(Number(e.target.value))} />
          </div>
          <div>
            <label className="label" htmlFor="p-price">Diária (R$) *</label>
            <input id="p-price" type="number" min={1} className="input" value={basePrice} onChange={(e) => setBasePrice(Number(e.target.value))} />
          </div>
          <div>
            <label className="label" htmlFor="p-clean">Taxa de limpeza (R$)</label>
            <input id="p-clean" type="number" min={0} className="input" value={cleaningFee} onChange={(e) => setCleaningFee(Number(e.target.value))} />
          </div>
          <div>
            <label className="label" htmlFor="p-min">Estadia mínima (noites)</label>
            <input id="p-min" type="number" min={1} max={30} className="input" value={minNights} onChange={(e) => setMinNights(Number(e.target.value))} />
          </div>
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="font-display text-lg font-semibold text-tinta">Comodidades</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {AMENITY_OPTIONS.map((a) => (
            <label key={a.key} className="flex cursor-pointer items-center gap-2 rounded-xl border border-areia-200 px-3 py-2 text-sm text-tinta-soft transition hover:border-turquesa-300">
              <input
                type="checkbox"
                className="accent-turquesa-500"
                checked={amenities.includes(a.key)}
                onChange={() => setAmenities((l) => toggle(l, a.key))}
              />
              {a.label}
            </label>
          ))}
        </div>
      </section>

      <section className="card space-y-4 p-6">
        {!initial && <CreationMediaPicker onChange={setMedia} />}
        <h2 className="font-display text-lg font-semibold text-tinta">Fotos</h2>
        <p className="text-sm text-tinta-mute">
          Selecione as imagens do anúncio (a primeira é a capa). Upload direto para o Supabase
          Storage entra na próxima fase — por enquanto usamos a galeria ilustrada do projeto.
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {IMAGE_POOL.map((seed) => {
            const selected = seeds.includes(seed);
            return (
              <button
                key={seed}
                type="button"
                onClick={() => setSeeds((l) => toggle(l, seed))}
                className={`relative aspect-square overflow-hidden rounded-xl border-2 transition ${
                  selected ? "border-turquesa-500" : "border-transparent opacity-80 hover:opacity-100"
                }`}
              >
                <Artwork seed={seed} alt="" className="h-full w-full object-cover" />
                {selected && (
                  <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-turquesa-500 text-[10px] font-bold text-white">
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex justify-end gap-3">
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "Salvando…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
