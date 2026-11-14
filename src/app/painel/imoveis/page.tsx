"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Artwork } from "@/components/Artwork";
import { ListingStatusBadge } from "@/components/StatusBadge";
import { formatBRL } from "@/lib/format";
import { fetchOrgStays, setStayStatus } from "@/lib/panel-ops";
import { usePanelUser } from "@/lib/use-panel-user";
import type { Stay } from "@/lib/types";

export default function ImoveisPage() {
  const { user } = usePanelUser();
  const [stays, setStays] = useState<Stay[] | null>(null);

  useEffect(() => {
    if (!user?.orgId) return;
    let active = true;
    fetchOrgStays(user.orgId).then((s) => {
      if (active) setStays(s);
    });
    return () => {
      active = false;
    };
  }, [user?.orgId]);

  async function changeStatus(stay: Stay, status: Stay["status"]) {
    const result = await setStayStatus(stay.id, status);
    if (!result.ok) {
      window.alert(result.error);
      return;
    }
    if (user?.orgId) setStays(await fetchOrgStays(user.orgId));
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-tinta">Hospedagens</h1>
          <p className="mt-1 text-sm text-tinta-mute">Cadastre e gerencie os imóveis da sua conta.</p>
        </div>
        <Link href="/painel/imoveis/novo" className="btn-primary btn-sm">
          + Novo imóvel
        </Link>
      </header>

      {stays === null ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card h-24 animate-pulse" />
          ))}
        </div>
      ) : stays.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="font-display text-xl font-semibold text-tinta">Nenhum imóvel cadastrado</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-tinta-mute">
            Crie seu primeiro anúncio com fotos, tarifas, comodidades e calendário. Ele passa por
            curadoria antes de ser publicado no marketplace.
          </p>
          <Link href="/painel/imoveis/novo" className="btn-primary btn-sm mt-5">
            Cadastrar imóvel
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {stays.map((stay) => (
            <div key={stay.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <div className="h-24 w-full shrink-0 overflow-hidden rounded-xl sm:w-36">
                <Artwork seed={stay.images[0] ?? ""} alt={stay.name} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <ListingStatusBadge status={stay.status} />
                  <span className="text-xs text-tinta-mute">{stay.categoryLabel}</span>
                </div>
                <h2 className="mt-1 truncate font-semibold text-tinta">{stay.name}</h2>
                <p className="text-sm text-tinta-mute">
                  {formatBRL(stay.basePriceCents)}/noite · {stay.capacity} hóspedes · {stay.bedrooms} quarto(s) ·{" "}
                  {stay.neighborhood || "—"}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {stay.status === "draft" && (
                  <button type="button" onClick={() => changeStatus(stay, "pending_review")} className="btn-turquesa btn-sm">
                    Enviar para aprovação
                  </button>
                )}
                {stay.status === "published" && (
                  <button type="button" onClick={() => changeStatus(stay, "paused")} className="btn-outline btn-sm">
                    Pausar
                  </button>
                )}
                {stay.status === "paused" && (
                  <button type="button" onClick={() => changeStatus(stay, "published")} className="btn-turquesa btn-sm">
                    Publicar
                  </button>
                )}
                {stay.status === "pending_review" && (
                  <span className="inline-flex items-center rounded-full bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
                    Em análise pela curadoria
                  </span>
                )}
                <Link href={`/painel/imoveis/${stay.id}`} className="btn-outline btn-sm">
                  Gerenciar
                </Link>
                <Link href={`/hospedagem/${stay.slug}`} className="btn-ghost btn-sm">
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
