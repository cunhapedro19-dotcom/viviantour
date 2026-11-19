import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ComboPriceSelector } from "@/components/booking/ComboPriceSelector";

export const dynamic = "force-dynamic";

export default async function ComboPage({ params }: { params: { slug: string } }) {
  const sb = createSupabaseServerClient();
  const { data: combo } = await sb
    .from("combos")
    .select("id,name,summary,description,price_cents,weekend_price_cents,priceRules:listing_price_rules!listing_price_rules_combo_id_fkey(id,price_cents,starts_on,ends_on,priority,rule_kind,label,details),items:combo_items(sort,quantity,property:properties(name,slug),service:services(name,slug))")
    .eq("slug", params.slug)
    .eq("status", "published")
    .maybeSingle();
  if (!combo) notFound();
  const items = ((combo.items as any[]) ?? []).sort((a, b) => a.sort - b.sort).map((item) => item.property ?? item.service).filter(Boolean);
  const priceRules = ((combo.priceRules as any[]) ?? []).map((rule) => ({ id: String(rule.id), startsOn: String(rule.starts_on), endsOn: rule.ends_on ? String(rule.ends_on) : null, priceCents: Number(rule.price_cents), priority: Number(rule.priority ?? 0), ruleKind: rule.rule_kind ?? "seasonal", label: rule.label ?? null, details: rule.details ?? null }));
  return <div className="container-x py-10"><div className="mx-auto max-w-3xl"><p className="kicker">Pacote Viviantourr</p><h1 className="mt-1 font-display text-3xl font-semibold text-tinta sm:text-4xl">{combo.name}</h1>{combo.summary && <p className="mt-4 text-lg text-tinta-soft">{combo.summary}</p>}<section className="mt-8 rounded-3xl bg-oceano-800 p-6 text-white"><p className="text-sm font-semibold uppercase tracking-wide text-turquesa-200">Este combo inclui</p><ul className="mt-4 space-y-3">{items.map((item: any, index) => <li key={`${item.slug}-${index}`} className="rounded-xl bg-white/10 px-4 py-3">{item.name}</li>)}</ul></section>{combo.description && <p className="mt-8 whitespace-pre-line leading-relaxed text-tinta-soft">{combo.description}</p>}<ComboPriceSelector name={combo.name} itemNames={items.map((item: any) => item.name)} basePriceCents={combo.price_cents} weekendPriceCents={combo.weekend_price_cents} priceRules={priceRules} /></div></div>;
}
