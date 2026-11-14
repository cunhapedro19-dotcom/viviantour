"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { KpiCard } from "@/components/panel/KpiCard";
import { BookingStatusBadge, OrgStatusBadge } from "@/components/StatusBadge";
import { DEMO_MODE } from "@/lib/config";
import { formatBRL, formatDateShort } from "@/lib/format";
import { fetchAdminBookings, fetchAdminKpis, fetchAdminListings, fetchAdminOrgs, setListingStatus, setOrgStatus } from "@/lib/admin-ops";
import type { AdminListingRow, AdminOrgRow, Booking } from "@/lib/types";

export default function AdminDashboardPage() {
  const [kpis, setKpis] = useState<Awaited<ReturnType<typeof fetchAdminKpis>> | null>(null);
  const [pendingOrgs, setPendingOrgs] = useState<AdminOrgRow[]>([]);
  const [pendingListings, setPendingListings] = useState<AdminListingRow[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    let active = true;
    (async () => {
      const [k, orgs, listings, bks] = await Promise.all([
        fetchAdminKpis(),
        fetchAdminOrgs(),
        fetchAdminListings(),
        fetchAdminBookings(),
      ]);
      if (!active) return;
      setKpis(k);
      setPendingOrgs(orgs.filter((o) => o.status === "pending"));
      setPendingListings(listings.filter((l) => l.status === "pending_review"));
      setBookings(bks);
    })();
    return () => {
      active = false;
    };
  }, []);

  async function approveOrg(org: AdminOrgRow, status: "active" | "rejected") {
    await setOrgStatus(org.id, status);
    setPendingOrgs((list) => list.filter((o) => o.id !== org.id));
    setKpis((k) => (k ? { ...k, orgsPending: Math.max(0, k.orgsPending - 1), orgsActive: status === "active" ? k.orgsActive + 1 : k.orgsActive } : k));
  }

  async function moderateListing(listing: AdminListingRow, status: "published" | "rejected") {
    await setListingStatus(listing.kind, listing.id, status);
    setPendingListings((list) => list.filter((l) => l.id !== listing.id));
    setKpis((k) => (k ? { ...k, listingsPending: Math.max(0, k.listingsPending - 1), listingsPublished: status === "published" ? k.listingsPublished + 1 : k.listingsPublished } : k));
  }

  if (!kpis) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="card h-24 animate-pulse" />
          ))}
        </div>
        <div className="card h-64 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl font-semibold text-tinta">Dashboard geral</h1>
        <p className="mt-1 text-sm text-tinta-mute">
          Visão completa do marketplace {DEMO_MODE ? "(dados de demonstração)" : ""}.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Fornecedores ativos" value={String(kpis.orgsActive)} hint={`${kpis.orgsPending} aguardando aprovação`} />
        <KpiCard label="Anúncios publicados" value={String(kpis.listingsPublished)} hint={`${kpis.listingsPending} em análise`} />
        <KpiCard label="Reservas na plataforma" value={String(kpis.bookingsCount)} tone="info" />
        <KpiCard label="GMV confirmado" value={formatBRL(kpis.gmvCents)} tone="success" hint={`comissões ${formatBRL(kpis.commissionCents)}`} />
      </div>

      {/* FILAS DE APROVAÇÃO */}
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-areia-200 bg-areia-50 px-5 py-3">
            <h2 className="text-sm font-bold text-tinta">Fornecedores aguardando aprovação</h2>
            <Link href="/admin/fornecedores" className="text-xs font-semibold text-oceano-600 hover:underline">Ver todos</Link>
          </div>
          {pendingOrgs.length === 0 ? (
            <p className="p-5 text-sm text-tinta-mute">Nenhum fornecedor na fila. 👌</p>
          ) : (
            <div className="divide-y divide-areia-200">
              {pendingOrgs.map((org) => (
                <div key={org.id} className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold text-tinta">{org.name}</p>
                    <p className="text-xs text-tinta-mute">
                      {org.kind === "host" ? "Hospedagens" : "Operador de passeios"} · {org.city}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => approveOrg(org, "rejected")} className="btn-danger btn-sm">Recusar</button>
                    <button type="button" onClick={() => approveOrg(org, "active")} className="btn-turquesa btn-sm">Aprovar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-areia-200 bg-areia-50 px-5 py-3">
            <h2 className="text-sm font-bold text-tinta">Anúncios aguardando aprovação</h2>
            <Link href="/admin/anuncios" className="text-xs font-semibold text-oceano-600 hover:underline">Ver todos</Link>
          </div>
          {pendingListings.length === 0 ? (
            <p className="p-5 text-sm text-tinta-mute">Nenhum anúncio na fila. 👌</p>
          ) : (
            <div className="divide-y divide-areia-200">
              {pendingListings.map((l) => (
                <div key={l.id} className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="font-semibold text-tinta">{l.name}</p>
                    <p className="text-xs text-tinta-mute">
                      {l.orgName} · {l.kind === "stay" ? "Hospedagem" : "Passeio"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => moderateListing(l, "rejected")} className="btn-danger btn-sm">Recusar</button>
                    <button type="button" onClick={() => moderateListing(l, "published")} className="btn-turquesa btn-sm">Publicar</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* RESERVAS RECENTES */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-areia-200 bg-areia-50 px-5 py-3">
          <h2 className="text-sm font-bold text-tinta">Movimentação recente de reservas</h2>
          <Link href="/admin/reservas" className="text-xs font-semibold text-oceano-600 hover:underline">Ver todas</Link>
        </div>
        <div className="divide-y divide-areia-200">
          {bookings.slice(0, 8).map((b) => (
            <div key={b.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 text-sm">
              <div className="flex items-center gap-3">
                <BookingStatusBadge status={b.status} />
                <div>
                  <p className="font-medium text-tinta">{b.itemName}</p>
                  <p className="text-xs text-tinta-mute">
                    {b.orgName || "—"} · {b.customerName} · {formatDateShort(b.createdAt)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-tinta">{formatBRL(b.totalCents)}</p>
                {b.commissionCents > 0 && (
                  <p className="text-xs text-tinta-mute">comissão {formatBRL(b.commissionCents)}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
