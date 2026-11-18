import { Suspense } from "react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/EmptyState";
import { ListingCard } from "@/components/ListingCard";
import { FilterPanel } from "@/components/site/FilterPanel";
import { stayToCard, tourToCard } from "@/lib/card";
import { getHomeData, searchListings, type SearchFilters } from "@/lib/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Buscar hospedagens e passeios em Arraial do Cabo",
};

interface Props {
  searchParams: Record<string, string | string[] | undefined>;
}

function sp(searchParams: Props["searchParams"], key: string): string | undefined {
  const v = searchParams[key];
  return typeof v === "string" ? v : undefined;
}

export default async function BuscarPage({ searchParams }: Props) {
  const filters: SearchFilters = {
    q: sp(searchParams, "q"),
    tipo: sp(searchParams, "tipo") === "stay" || sp(searchParams, "tipo") === "tour" ? (sp(searchParams, "tipo") as "stay" | "tour") : undefined,
    categoria: sp(searchParams, "categoria"),
    pessoas: sp(searchParams, "pessoas") ? Number(sp(searchParams, "pessoas")) : undefined,
    ordem: (sp(searchParams, "ordem") as SearchFilters["ordem"]) ?? "relevancia",
  };

  const [result, { categories }] = await Promise.all([searchListings(filters), getHomeData()]);

  const showStays = !filters.tipo || filters.tipo === "stay";
  const showTours = !filters.tipo || filters.tipo === "tour";

  return (
    <div className="container-x py-8">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold text-tinta">
          {filters.q ? `Resultados para “${filters.q}”` : "Explore Arraial do Cabo"}
        </h1>
        <p className="mt-1 text-sm text-tinta-mute">
          {result.total} {result.total === 1 ? "anúncio encontrado" : "anúncios encontrados"}
          {filters.categoria ? ` na categoria selecionada` : ""}
        </p>
      </header>

      <Suspense fallback={<div className="card h-40 animate-pulse" />}>
        <FilterPanel categories={categories} />
      </Suspense>

      {result.total === 0 ? (
        <div className="mt-8">
          <EmptyState
            title="Nada encontrado por aqui"
            description="Tente remover alguns filtros ou buscar por outro termo — Arraial tem muito a oferecer."
            actionHref="/buscar"
            actionLabel="Limpar a busca"
          />
        </div>
      ) : (
        <div className="mt-10 space-y-12">
          {showStays && result.stays.length > 0 && (
            <section>
              <h2 className="section-title mb-5">
                Hospedagens <span className="text-base font-normal text-tinta-mute">({result.stays.length})</span>
              </h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {result.stays.map((stay) => (
                  <ListingCard key={stay.id} data={stayToCard(stay)} />
                ))}
              </div>
            </section>
          )}
          {showTours && result.tours.length > 0 && (
            <section>
              <h2 className="section-title mb-5">
                Passeios e experiências <span className="text-base font-normal text-tinta-mute">({result.tours.length})</span>
              </h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {result.tours.map((tour) => (
                  <ListingCard key={tour.id} data={tourToCard(tour)} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
