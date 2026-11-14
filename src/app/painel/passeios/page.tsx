"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Artwork } from "@/components/Artwork";
import { ListingStatusBadge } from "@/components/StatusBadge";
import { formatBRL, formatDuration } from "@/lib/format";
import { fetchOrgTours, setTourStatus } from "@/lib/panel-ops";
import { usePanelUser } from "@/lib/use-panel-user";
import type { Tour } from "@/lib/types";

export default function PasseiosPage() {
  const { user } = usePanelUser();
  const [tours, setTours] = useState<Tour[] | null>(null);

  useEffect(() => {
    if (!user?.orgId) return;
    let active = true;
    fetchOrgTours(user.orgId).then((t) => {
      if (active) setTours(t);
    });
    return () => {
      active = false;
    };
  }, [user?.orgId]);

  async function changeStatus(tour: Tour, status: Tour["status"]) {
    const result = await setTourStatus(tour.id, status);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    if (user?.orgId) setTours(await fetchOrgTours(user.orgId));
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-tinta">Passeios e experiências</h1>
          <p className="mt-1 text-sm text-tinta-mute">Cadastre serviços, embarcações e a agenda de saídas.</p>
        </div>
        <Link href="/painel/passeios/novo" className="btn-primary btn-sm">
          + Novo passeio
        </Link>
      </header>

      {tours === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card h-24 animate-pulse" />
          ))}
        </div>
      ) : tours.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-display text-xl font-semibold text-tinta">Nenhum passeio cadastrado</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-tinta-mute">
            Cadastre seu passeio ou experiência, defina preços e capacidade e crie a agenda de
            saídas operacionais.
          </p>
          <Link href="/painel/passeios/novo" className="btn-primary btn-sm mt-5">
            Cadastrar passeio
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {tours.map((tour) => (
            <div key={tour.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <div className="h-24 w-full shrink-0 overflow-hidden rounded-xl sm:w-36">
                <Artwork seed={tour.images[0] ?? ""} alt={tour.name} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <ListingStatusBadge status={tour.status} />
                  <span className="text-xs text-tinta-mute">{tour.categoryLabel}</span>
                </div>
                <h2 className="mt-1 truncate font-semibold text-tinta">{tour.name}</h2>
                <p className="text-sm text-tinta-mute">
                  {formatBRL(tour.pricePerPersonCents)}/pessoa · {formatDuration(tour.durationMinutes)} · até{" "}
                  {tour.maxGuests} hóspedes
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {tour.status === "draft" && (
                  <button type="button" onClick={() => changeStatus(tour, "pending_review")} className="btn-turquesa btn-sm">
                    Enviar para aprovação
                  </button>
                )}
                {tour.status === "published" && (
                  <button type="button" onClick={() => changeStatus(tour, "paused")} className="btn-outline btn-sm">
                    Pausar
                  </button>
                )}
                {tour.status === "paused" && (
                  <button type="button" onClick={() => changeStatus(tour, "published")} className="btn-turquesa btn-sm">
                    Publicar
                  </button>
                )}
                <Link href={`/painel/passeios/${tour.id}`} className="btn-outline btn-sm">
                  Gerenciar
                </Link>
                <Link href={`/passeio/${tour.slug}`} className="btn-ghost btn-sm">
                  Ver no site ↗
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
