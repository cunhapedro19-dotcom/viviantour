import { notFound } from "next/navigation";
import { formatBRL } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { whatsappRequestUrl } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export default async function ComboPage({ params }: { params: { slug: string } }) {
  const sb = createSupabaseServerClient();
  const { data: combo } = await sb
    .from("combos")
    .select("id,name,summary,description,price_cents,priceRules:listing_price_rules!listing_price_rules_combo_id_fkey(price_cents,starts_on,ends_on,priority),items:combo_items(sort,quantity,property:properties(name,slug),service:services(name,slug))")
    .eq("slug", params.slug)
    .eq("status", "published")
    .maybeSingle();
  if (!combo) notFound();
  const today = new Date().toISOString().slice(0, 10);
  const activePrice = ((combo.priceRules as any[]) ?? []).filter((rule) => rule.starts_on <= today && (!rule.ends_on || today < rule.ends_on)).sort((a, b) => Number(b.priority ?? 0) - Number(a.priority ?? 0) || String(b.starts_on).localeCompare(String(a.starts_on)))[0]?.price_cents ?? combo.price_cents;
  const items = ((combo.items as any[]) ?? []).sort((a, b) => a.sort - b.sort).map((item) => item.property ?? item.service).filter(Boolean);
  const message = `Olá! Vim pelo site Viviantourr e gostaria de consultar o combo:\n\n${combo.name}\nItens: ${items.map((item: any) => item.name).join(" + ")}\n\nQuais datas e condições estão disponíveis?`;
  const href = whatsappRequestUrl(null, message);
  return <div className="container-x py-10"><div className="mx-auto max-w-3xl"><p className="kicker">Pacote Viviantourr</p><h1 className="mt-1 font-display text-3xl font-semibold text-tinta sm:text-4xl">{combo.name}</h1>{combo.summary && <p className="mt-4 text-lg text-tinta-soft">{combo.summary}</p>}<section className="mt-8 rounded-3xl bg-oceano-800 p-6 text-white"><p className="text-sm font-semibold uppercase tracking-wide text-turquesa-200">Este combo inclui</p><ul className="mt-4 space-y-3">{items.map((item: any, index) => <li key={`${item.slug}-${index}`} className="rounded-xl bg-white/10 px-4 py-3">{item.name}</li>)}</ul></section>{combo.description && <p className="mt-8 whitespace-pre-line leading-relaxed text-tinta-soft">{combo.description}</p>}<div className="mt-8 card flex flex-wrap items-center justify-between gap-4 p-6"><div><p className="text-sm text-tinta-mute">Valor do pacote</p><p className="text-2xl font-bold text-tinta">{activePrice ? formatBRL(activePrice) : "Consulte condições"}</p></div>{href && <a href={href} target="_blank" rel="noopener noreferrer" className="btn-turquesa">Consultar pelo WhatsApp</a>}</div></div></div>;
}
