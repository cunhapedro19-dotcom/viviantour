import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ListingGallery } from "@/components/site/ListingGallery";
import { FavoriteButton } from "@/components/booking/FavoriteButton";
import { TourInquiryWidget } from "@/components/booking/InquiryWidgets";
import { ListingCard } from "@/components/ListingCard";
import { ExtraMedia } from "@/components/site/ExtraMedia";
import { StarRating } from "@/components/StarRating";
import { tourToCard } from "@/lib/card";
import { formatDuration } from "@/lib/format";
import { getDeparturesForTour, getReviewsFor, getTourBySlugSafe, searchListings } from "@/lib/queries";

export const dynamic = "force-dynamic";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const tour = await getTourBySlugSafe(params.slug);
  if (!tour) return { title: "Passeio" };
  const image = tour.images[0];
  const imageUrl = image?.startsWith("http") || image?.startsWith("/") ? image : image ? `/img/${image}.jpg` : "/img/og.png";
  return {
    title: tour.name,
    description: tour.summary || `${tour.categoryLabel} em Arraial do Cabo.`,
    openGraph: { type: "website", locale: "pt_BR", title: tour.name, description: tour.summary, images: [{ url: imageUrl, alt: tour.name }] },
    twitter: { card: "summary_large_image", title: tour.name, description: tour.summary, images: [imageUrl] },
  };
}

export default async function TourPage({ params }: Props) {
  const tour = await getTourBySlugSafe(params.slug);
  if (!tour || tour.status !== "published") notFound();

  const [departures, reviews] = await Promise.all([
    getDeparturesForTour(tour),
    getReviewsFor("tour", tour.id),
  ]);

  const similar = (await searchListings({ tipo: "tour" }))
    .tours.filter((t) => t.id !== tour.id)
    .slice(0, 3);

  return (
    <div className="container-x py-8">
      <header className="mb-5">
        <p className="kicker mb-1">{tour.categoryLabel}</p>
        <h1 className="font-display text-3xl font-semibold text-tinta sm:text-4xl">{tour.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-tinta-mute">
          <StarRating rating={tour.rating} count={tour.reviewsCount} />
          <span aria-hidden>·</span>
          <span>Arraial do Cabo, RJ</span>
          <span aria-hidden>·</span>
          <span>Operado por <strong className="text-oceano-700">{tour.orgName}</strong></span>
        </div>
      </header>

      <ListingGallery images={tour.images} name={tour.name} variant="tour" />

      <ExtraMedia images={tour.images} videos={tour.videos} skip={2} name={tour.name} />

      <div className="grid gap-10 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {/* FATOS */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Fact title="Duração" value={formatDuration(tour.durationMinutes)} icon="🕒" />
            <Fact title="Capacidade" value={`até ${tour.maxGuests}`} icon="👥" />
            <Fact title="Embarcação" value={tour.vesselName ?? "—"} icon="⛵" />
            <Fact title="Embarque" value={tour.meetingPoint.split("—")[0]?.trim() ?? "A combinar"} icon="📍" />
          </section>

          <section className="flex flex-wrap items-center justify-between gap-4 border-b border-areia-200 pb-6">
            <p className="max-w-lg text-base font-medium text-tinta">{tour.summary}</p>
            <FavoriteButton kind="tour" id={tour.id} />
          </section>

          <section className="prose-content max-w-none">
            {tour.description.split("\n\n").map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </section>

          {/* ROTEIRO */}
          {tour.itinerary.length > 0 && (
            <section>
              <h2 className="section-title mb-5 text-xl">Roteiro do passeio</h2>
              <ol className="space-y-0">
                {tour.itinerary.map((step, idx) => (
                  <li key={idx} className="relative flex gap-4 pb-6 last:pb-0">
                    {idx < tour.itinerary.length - 1 && (
                      <span className="absolute left-[15px] top-8 h-full w-0.5 bg-areia-300" aria-hidden />
                    )}
                    <span className="z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-turquesa-500 text-sm font-bold text-white">
                      {idx + 1}
                    </span>
                    <div>
                      <h3 className="font-semibold text-tinta">{step.title}</h3>
                      {step.description && <p className="mt-0.5 text-sm text-tinta-mute">{step.description}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* INCLUSOS */}
          {tour.included.length > 0 && (
            <section>
              <h2 className="section-title mb-4 text-xl">O que está incluído</h2>
              <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {tour.included.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-tinta-soft">
                    <svg viewBox="0 0 20 20" className="h-4 w-4 shrink-0 fill-turquesa-500">
                      <path d="M10 1.5a8.5 8.5 0 100 17 8.5 8.5 0 000-17zm4 6.6l-5 5-3-3 1.4-1.4 1.6 1.6 3.6-3.6L14 8.1z" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* PONTO DE EMBARQUE */}
          <section className="rounded-2xl bg-areia-100 p-5">
            <h3 className="font-semibold text-tinta">Ponto de encontro</h3>
            <p className="mt-1 text-sm text-tinta-soft">{tour.meetingPoint}</p>
            <p className="mt-2 text-xs text-tinta-mute">
              Chegue com antecedência. O roteiro pode mudar conforme as condições do mar — segurança em primeiro lugar.
            </p>
          </section>

          {/* AVALIAÇÕES */}
          <section>
            <h2 className="section-title mb-5 text-xl">
              Avaliações {tour.reviewsCount > 0 && <span className="text-base font-normal text-tinta-mute">({tour.reviewsCount})</span>}
            </h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-tinta-mute">Este passeio ainda não tem avaliações publicadas.</p>
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
                  </figure>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* WIDGET */}
        <aside>
          <TourInquiryWidget
            name={tour.name}
            phone={tour.orgWhatsapp}
            departures={departures}
            maxGuests={tour.maxGuests}
          />
        </aside>
      </div>

      {similar.length > 0 && (
        <section className="mt-16">
          <h2 className="section-title mb-6">Outros passeios para curtir</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((t) => (
              <ListingCard key={t.id} data={tourToCard(t)} />
            ))}
          </div>
        </section>
      )}

      <p className="mt-10 text-center text-xs text-tinta-mute">
        Opera embarcações ou experiências?{" "}
        <Link href="/anuncie" className="font-semibold text-oceano-600 underline-offset-2 hover:underline">
          Publique seus passeios no Viviantourr
        </Link>
      </p>
    </div>
  );
}

function Fact({ title, value, icon }: { title: string; value: string; icon: string }) {
  return (
    <div className="card p-4">
      <p className="text-lg">{icon}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-tinta-mute">{title}</p>
      <p className="text-sm font-medium text-tinta">{value}</p>
    </div>
  );
}
