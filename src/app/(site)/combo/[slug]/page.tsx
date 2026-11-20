import Link from "next/link";
import { notFound } from "next/navigation";
import { ComboPriceSelector, type ComboPriceOption } from "@/components/booking/ComboPriceSelector";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ItineraryStop = { title?: string; description?: string };

export default async function ComboPage({ params }: { params: { slug: string } }) {
  const sb = createSupabaseServerClient();
  const { data: combo } = await sb
    .from("combos")
    .select("id,name,summary,description,price_cents,weekend_price_cents,promo_price_cents,promo_ends_on,price_label,additional_fees,itinerary,price_options,booking_whatsapp,cover_url,priceRules:listing_price_rules!listing_price_rules_combo_id_fkey(id,price_cents,starts_on,ends_on,priority,rule_kind,label,details),items:combo_items(sort,quantity,property:properties(name,slug),service:services(name,slug))")
    .eq("slug", params.slug)
    .eq("status", "published")
    .maybeSingle();

  if (!combo) notFound();

  const items = ((combo.items as any[]) ?? []).sort((a, b) => a.sort - b.sort).map((item) => {
    const listing = item.property ?? item.service;
    return listing ? { ...listing, href: item.property ? `/hospedagem/${listing.slug}` : `/passeio/${listing.slug}` } : null;
  }).filter(Boolean);
  const priceRules = ((combo.priceRules as any[]) ?? []).map((rule) => ({
    id: String(rule.id), startsOn: String(rule.starts_on), endsOn: rule.ends_on ? String(rule.ends_on) : null,
    priceCents: Number(rule.price_cents), priority: Number(rule.priority ?? 0), ruleKind: rule.rule_kind ?? "seasonal", label: rule.label ?? null, details: rule.details ?? null,
  }));
  const itinerary = ((combo.itinerary as ItineraryStop[] | null) ?? []).filter((stop) => stop?.title);
  const fees = (combo.additional_fees as string[] | null) ?? [];
  const priceOptions = ((combo.price_options as ComboPriceOption[] | null) ?? []).filter((option) => option?.label && Number.isFinite(option.priceCents));

  return (
    <div className="container-x py-10">
      <div className="mx-auto max-w-3xl">
        <p className="kicker">Combo Viviantourr</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-tinta sm:text-4xl">{combo.name}</h1>
        {combo.summary && <p className="mt-4 text-lg text-tinta-soft">{combo.summary}</p>}
        {combo.cover_url && <img src={combo.cover_url} alt={`Imagem do ${combo.name}`} className="mt-6 max-h-[720px] w-full rounded-3xl object-contain object-top" />}

        <section className="mt-8 rounded-3xl bg-oceano-800 p-6 text-white">
          <p className="text-sm font-semibold uppercase tracking-wide text-turquesa-200">Este combo inclui</p>
          <ul className="mt-4 space-y-3">
            {items.map((item: any, index) => <li key={`${item.slug}-${index}`} className="rounded-xl bg-white/10 px-4 py-3"><Link href={item.href} className="font-medium hover:underline">{item.name}</Link></li>)}
          </ul>
        </section>

        {combo.description && <section className="mt-8"><h2 className="section-title text-2xl">Como funciona</h2><p className="mt-3 whitespace-pre-line leading-relaxed text-tinta-soft">{combo.description}</p></section>}

        {itinerary.length > 0 && <section className="mt-8"><h2 className="section-title text-2xl">Roteiro do combo</h2><ol className="mt-4 space-y-3 border-l-2 border-turquesa-200 pl-5">{itinerary.map((stop, index) => <li key={`${stop.title}-${index}`}><p className="font-semibold text-tinta">{index + 1}. {stop.title}</p>{stop.description && <p className="mt-1 text-sm text-tinta-soft">{stop.description}</p>}</li>)}</ol></section>}

        {fees.length > 0 && <section className="mt-8 rounded-2xl border border-areia-200 bg-areia-50 p-5"><h2 className="font-semibold text-tinta">Taxas e informações importantes</h2><ul className="mt-3 space-y-2 text-sm leading-relaxed text-tinta-soft">{fees.map((fee, index) => <li key={`${fee}-${index}`}>• {fee}</li>)}</ul></section>}

        <ComboPriceSelector name={combo.name} itemNames={items.map((item: any) => item.name)} basePriceCents={combo.price_cents} weekendPriceCents={combo.weekend_price_cents} priceRules={priceRules} promoPriceCents={combo.promo_price_cents} promoEndsOn={combo.promo_ends_on} priceLabel={combo.price_label} additionalFees={fees} priceOptions={priceOptions} bookingWhatsapp={combo.booking_whatsapp} />
      </div>
    </div>
  );
}
