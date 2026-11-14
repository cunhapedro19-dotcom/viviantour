import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { addDays } from "date-fns";
import { Artwork } from "@/components/Artwork";
import { FavoriteButton } from "@/components/booking/FavoriteButton";
import { StayBookingWidget } from "@/components/booking/StayBookingWidget";
import { ListingCard } from "@/components/ListingCard";
import { StarRating } from "@/components/StarRating";
import { DEMO_MODE } from "@/lib/config";
import { getDemoBlocks } from "@/lib/demo-data";
import { stayToCard } from "@/lib/card";
import { getReviewsFor, getStayBySlugSafe, searchListings } from "@/lib/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const stay = await getStayBySlugSafe(params.slug);
  return { title: stay?.name ?? "Hospedagem" };
}

function expandBlocks(blocks: { startDate: string; endDate: string }[]): string[] {
  const out: string[] = [];
  for (const b of blocks) {
    let d = new Date(`${b.startDate}T12:00:00`);
    const end = new Date(`${b.endDate}T12:00:00`);
    while (d < end && out.length < 400) {
      out.push(d.toISOString().slice(0, 10));
      d = new Date(d.getTime() + 24 * 3600 * 1000);
    }
  }
  return out;
}

export default async function StayPage({ params }: Props) {
  const stay = await getStayBySlugSafe(params.slug);
  if (!stay || stay.status !== "published") notFound();

  const reviews = await getReviewsFor("stay", stay.id);

  let blockedDates: string[] = [];
  if (DEMO_MODE) {
    blockedDates = expandBlocks(getDemoBlocks(stay.id));
  } else {
    const supabase = createSupabaseServerClient();
    const from = new Date();
    const to = addDays(from, 120);
    const { data } = await supabase.rpc("get_property_blocked_dates", {
      p_property: stay.id,
      p_from: from.toISOString().slice(0, 10),
      p_to: to.toISOString().slice(0, 10),
    });
    blockedDates = (data ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((r: any) => !r.available)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((r: any) => String(r.day).slice(0, 10));
  }

  const similar = (await searchListings({ tipo: "stay" }))
    .stays.filter((s) => s.id !== stay.id)
    .slice(0, 3);

  return (
    <div className="container-x py-8">
      <header className="mb-5">
        <h1 className="font-display text-3xl font-semibold text-tinta sm:text-4xl">{stay.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-tinta-mute">
          <StarRating rating={stay.rating} count={stay.reviewsCount} />
          <span aria-hidden>·</span>
          <span className="font-medium text-oceano-700">
            {stay.neighborhood}, {stay.city} — {stay.state}
          </span>
        </div>
      </header>

      {/* GALERIA */}
      <div className="mb-8 grid h-[300px] grid-cols-3 gap-3 overflow-hidden rounded-3xl sm:h-[440px]">
        <div className="col-span-2 row-span-2">
          <Artwork seed={stay.images[0] ?? ""} alt={stay.name} className="h-full w-full object-cover" eager />
        </div>
        <Artwork seed={stay.images[1] ?? stay.images[0] ?? ""} alt="" className="h-full w-full rounded-tl-none object-cover" />
        <Artwork seed={stay.images[2] ?? stay.images[0] ?? ""} alt="" className="h-full w-full object-cover" />
      </div>

      <div className="grid gap-10 lg:grid-cols-3">
        {/* INFORMAÇÕES */}
        <div className="space-y-8 lg:col-span-2">
          <section className="flex flex-wrap items-center justify-between gap-4 border-b border-areia-200 pb-6">
            <div>
              <h2 className="text-lg font-semibold text-tinta">
                {stay.categoryLabel} hospedado por {stay.orgName}
              </h2>
              <p className="text-sm text-tinta-mute">
                {stay.capacity} hóspedes · {stay.bedrooms} quarto(s) ·{" "}
                {String(stay.bathrooms).replace(".", ",")} banheiro(s)
              </p>
            </div>
            <FavoriteButton kind="stay" id={stay.id} />
          </section>

          <section className="prose-content max-w-none">
            <p className="text-base font-medium text-tinta">{stay.summary}</p>
            {stay.description.split("\n\n").map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </section>

          <section>
            <h3 className="section-title mb-4 text-xl">O que este lugar oferece</h3>
            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {stay.amenityLabels.map((a) => (
                <li key={a} className="flex items-center gap-2.5 text-sm text-tinta-soft">
                  <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 fill-turquesa-500">
                    <path d="M10 1.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17zm4 6.6l-5 5-3-3 1.4-1.4 1.6 1.6 3.6-3.6L14 8.1z" />
                  </svg>
                  {a}
                </li>
              ))}
            </ul>
          </section>

          {stay.rules && (
            <section>
              <h3 className="section-title mb-3 text-xl">Regras da casa</h3>
              <p className="rounded-2xl bg-areia-100 p-4 text-sm leading-relaxed text-tinta-soft">{stay.rules}</p>
            </section>
          )}

          <section className="border-y border-areia-200 py-6">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-oceano-600 font-display text-xl font-semibold text-white">
                {stay.orgName.charAt(0)}
              </span>
              <div>
                <p className="font-semibold text-tinta">{stay.orgName}</p>
                <p className="text-sm text-tinta-mute">Proprietário verificado pela Viviantourr</p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="section-title mb-5 text-xl">
              Avaliações {stay.reviewsCount > 0 && <span className="text-base font-normal text-tinta-mute">({stay.reviewsCount})</span>}
            </h3>
            {reviews.length === 0 ? (
              <p className="text-sm text-tinta-mute">Este anúncio ainda não tem avaliações publicadas.</p>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {reviews.map((r) => (
                  <figure key={r.id} className="card p-5">
                    <StarRating rating={r.rating} />
                    <blockquote className="mt-2 text-sm leading-relaxed text-tinta-soft">“{r.comment}”</blockquote>
                    <figcaption className="mt-3 text-xs text-tinta-mute">
                      <strong className="text-tinta-soft">{r.authorName}</strong> ·{" "}
                      {new Date(r.date).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                    </figcaption>
                    {r.reply && (
                      <p className="mt-3 border-l-2 border-turquesa-300 pl-3 text-xs text-tinta-mute">
                        <strong className="text-tinta-soft">Resposta do anfitrião:</strong> {r.reply}
                      </p>
                    )}
                  </figure>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* WIDGET DE RESERVA */}
        <aside>
          <StayBookingWidget
            stay={{
              id: stay.id,
              slug: stay.slug,
              name: stay.name,
              basePriceCents: stay.basePriceCents,
              cleaningFeeCents: stay.cleaningFeeCents,
              minNights: stay.minNights,
              capacity: stay.capacity,
              orgId: stay.orgId,
              orgName: stay.orgName,
            }}
            blockedDates={blockedDates}
          />
        </aside>
      </div>

      {/* SIMILARES */}
      {similar.length > 0 && (
        <section className="mt-16">
          <h2 className="section-title mb-6">Hospedagens parecidas</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((s) => (
              <ListingCard key={s.id} data={stayToCard(s)} />
            ))}
          </div>
        </section>
      )}

      <p className="mt-10 text-center text-xs text-tinta-mute">
        Quer anunciar sua hospedagem também?{" "}
        <Link href="/anuncie" className="font-semibold text-oceano-600 underline-offset-2 hover:underline">
          Conheça o Viviantourr para fornecedores
        </Link>
      </p>
    </div>
  );
}
