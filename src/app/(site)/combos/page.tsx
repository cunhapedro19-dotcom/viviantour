import Link from "next/link";
import { Artwork } from "@/components/Artwork";
import { formatBRL } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type PriceOption = { label?: string; priceCents?: number; promoEndsOn?: string };

export const dynamic = "force-dynamic";

function displayDate(iso: string) { return iso.split("-").reverse().join("/"); }

function todayInBrazil() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export default async function CombosPage() {
  const today = todayInBrazil();
  const sb = createSupabaseServerClient();
  const { data: combos } = await sb
    .from("combos")
    .select("id,name,slug,summary,price_cents,promo_price_cents,promo_ends_on,price_label,price_options,cover_url,items:combo_items(sort,property:properties(name,slug),service:services(name,slug))")
    .eq("status", "published")
    .order("created_at", { ascending: false });

  return <div className="container-x py-10">
    <header className="max-w-2xl"><p className="kicker">Mais experiências em uma reserva</p><h1 className="mt-1 font-display text-3xl font-semibold text-tinta sm:text-4xl">Combos Viviantourr</h1><p className="mt-3 leading-relaxed text-tinta-soft">Escolha uma combinação de experiências, confira o que está incluso e envie seu pedido direto pelo WhatsApp.</p></header>
    {!combos?.length ? <div className="card mt-8 p-8 text-center"><h2 className="font-display text-xl font-semibold text-tinta">Novos combos chegando</h2><p className="mt-2 text-sm text-tinta-mute">Estamos organizando ofertas especiais para você aproveitar mais Arraial do Cabo.</p></div> : <section className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{combos.map((combo: any) => {
      const items = ((combo.items ?? []) as any[]).sort((a, b) => a.sort - b.sort).map((item) => item.property ?? item.service).filter(Boolean);
      const allOptions = ((combo.price_options ?? []) as PriceOption[]).filter((option) => typeof option.priceCents === "number");
      const options = allOptions.filter((option) => !option.promoEndsOn || option.promoEndsOn >= today);
      const firstPrice = options.length
        ? Math.min(...options.map((option) => option.priceCents as number))
        : allOptions.length > 0
          ? null
          : combo.promo_price_cents != null && combo.promo_ends_on && combo.promo_ends_on < today
            ? combo.price_cents
            : combo.promo_price_cents ?? combo.price_cents;
      const optionPromoEnd = options.find((option) => option.promoEndsOn)?.promoEndsOn;
      const promoIsCurrent = combo.promo_price_cents != null && combo.promo_ends_on && combo.promo_ends_on >= today;
      return <Link key={combo.id} href={`/combo/${combo.slug}`} className="group overflow-hidden rounded-3xl border border-areia-200 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-pop"><div className="relative aspect-[4/3]">{combo.cover_url ? <img src={combo.cover_url} alt={`Imagem do ${combo.name}`} className="h-full w-full object-cover" /> : <Artwork seed={`combo-${combo.slug}`} alt="" className="h-full w-full object-cover" />}<span className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-oceano-700 shadow-sm">Combo especial</span></div><div className="p-5"><h2 className="font-display text-xl font-semibold text-tinta">{combo.name}</h2>{combo.summary && <p className="mt-2 text-sm leading-relaxed text-tinta-soft">{combo.summary}</p>}<p className="mt-3 text-sm text-tinta-mute">{items.map((item: any) => item.name).join(" + ")}</p>{firstPrice != null ? <p className="mt-4 font-semibold text-oceano-700">{options.length > 1 ? "A partir de " : "Por "}{formatBRL(firstPrice)}{combo.price_label ? <span className="font-normal text-tinta-mute"> · {combo.price_label}</span> : null}</p> : <p className="mt-4 font-semibold text-oceano-700">Consulte condições</p>}{optionPromoEnd && <p className="mt-1 text-xs font-medium text-coral-600">Valores promocionais até {displayDate(optionPromoEnd)}.</p>}{promoIsCurrent && <p className="mt-1 text-xs font-medium text-coral-600">Oferta válida até {displayDate(combo.promo_ends_on)}.</p>}</div></Link>;
    })}</section>}
  </div>;
}
