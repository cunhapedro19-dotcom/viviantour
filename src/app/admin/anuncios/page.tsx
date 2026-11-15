"use client";

import { useEffect, useState } from "react";
import { ListingStatusBadge } from "@/components/StatusBadge";
import { DEMO_MODE } from "@/lib/config";
import { fetchAdminListings, setListingStatus } from "@/lib/admin-ops";
import type { AdminListingRow } from "@/lib/admin-ops";

export default function AdminAnunciosPage() {
  const [listings, setListings] = useState<AdminListingRow[] | null>(null);

  useEffect(() => {
    let active = true;
    fetchAdminListings().then((l) => {
      if (active) setListings(l);
    });
    return () => {
      active = false;
    };
  }, []);

  async function moderate(listing: AdminListingRow, status: AdminListingRow["status"]) {
    if (!DEMO_MODE) {
      const ok = await setListingStatus(listing.kind, listing.id, status);
      if (!ok) {
        window.alert("Não foi possível atualizar o anúncio.");
        return;
      }
    }
    setListings((list) => (list ?? []).map((l) => (l.id === listing.id ? { ...l, status } : l)));
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-tinta">Anúncios</h1>
        <p className="mt-1 text-sm text-tinta-mute">
          Moderação de hospedagens e passeios: aprovação, pausa e recusa.
        </p>
      </header>

      {listings === null ? (
        <div className="card h-72 animate-pulse" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-areia-100 text-left text-xs font-semibold uppercase tracking-wide text-tinta-mute">
              <tr>
                <th className="px-5 py-3">Anúncio</th>
                <th className="px-5 py-3">Fornecedor</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-areia-200">
              {listings.map((l) => (
                <tr key={l.id}>
                  <td className="px-5 py-3.5 font-medium text-tinta">{l.name}</td>
                  <td className="px-5 py-3.5 text-tinta-soft">{l.orgName}</td>
                  <td className="px-5 py-3.5 text-tinta-soft">{l.kind === "stay" ? "Hospedagem" : "Passeio"}</td>
                  <td className="px-5 py-3.5">
                    <ListingStatusBadge status={l.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-2">
                      {(l.status === "pending_review" || l.status === "rejected" || l.status === "paused") && (
                        <button type="button" onClick={() => moderate(l, "published")} className="btn-turquesa btn-sm">
                          {l.status === "pending_review" ? "Publicar" : "Reativar"}
                        </button>
                      )}
                      {l.status === "pending_review" && (
                        <button type="button" onClick={() => moderate(l, "rejected")} className="btn-danger btn-sm">Recusar</button>
                      )}
                      {l.status === "published" && (
                        <button type="button" onClick={() => moderate(l, "paused")} className="btn-outline btn-sm">Pausar</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {DEMO_MODE && (
        <p className="text-xs text-tinta-mute">
          Na demonstração, as moderações valem apenas nesta sessão.
        </p>
      )}
    </div>
  );
}
