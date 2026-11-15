"use client";

import { useEffect, useState } from "react";
import { OrgStatusBadge } from "@/components/StatusBadge";
import { DEMO_MODE } from "@/lib/config";
import { formatDateShort } from "@/lib/format";
import { fetchAdminOrgs, setOrgStatus } from "@/lib/admin-ops";
import type { AdminOrgRow } from "@/lib/admin-ops";

export default function AdminFornecedoresPage() {
  const [orgs, setOrgs] = useState<AdminOrgRow[] | null>(null);

  useEffect(() => {
    let active = true;
    fetchAdminOrgs().then((o) => {
      if (active) setOrgs(o);
    });
    return () => {
      active = false;
    };
  }, []);

  async function changeStatus(org: AdminOrgRow, status: AdminOrgRow["status"]) {
    if (!DEMO_MODE) {
      const ok = await setOrgStatus(org.id, status);
      if (!ok) {
        window.alert("Não foi possível atualizar o fornecedor.");
        return;
      }
    }
    setOrgs((list) => (list ?? []).map((o) => (o.id === org.id ? { ...o, status } : o)));
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-tinta">Fornecedores</h1>
        <p className="mt-1 text-sm text-tinta-mute">
          Aprove, suspenda e acompanhe os perfis comerciais da plataforma.
        </p>
      </header>

      {orgs === null ? (
        <div className="card h-72 animate-pulse" />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-areia-100 text-left text-xs font-semibold uppercase tracking-wide text-tinta-mute">
              <tr>
                <th className="px-5 py-3">Fornecedor</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3">Anúncios</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-areia-200">
              {orgs.map((org) => (
                <tr key={org.id}>
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-tinta">{org.name}</p>
                    <p className="text-xs text-tinta-mute">{org.city}</p>
                  </td>
                  <td className="px-5 py-3.5 text-tinta-soft">{org.kind === "host" ? "Hospedagens" : "Operador"}</td>
                  <td className="px-5 py-3.5 text-tinta-soft">{org.listingsCount}</td>
                  <td className="px-5 py-3.5">
                    <OrgStatusBadge status={org.status} />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-2">
                      {org.status === "pending" && (
                        <>
                          <button type="button" onClick={() => changeStatus(org, "active")} className="btn-turquesa btn-sm">Aprovar</button>
                          <button type="button" onClick={() => changeStatus(org, "rejected")} className="btn-danger btn-sm">Recusar</button>
                        </>
                      )}
                      {org.status === "active" && (
                        <button type="button" onClick={() => changeStatus(org, "suspended")} className="btn-danger btn-sm">Suspender</button>
                      )}
                      {org.status === "suspended" && (
                        <button type="button" onClick={() => changeStatus(org, "active")} className="btn-turquesa btn-sm">Reativar</button>
                      )}
                      {org.status === "rejected" && (
                        <button type="button" onClick={() => changeStatus(org, "active")} className="btn-outline btn-sm">Aprovar</button>
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
          Na demonstração, as mudanças de status valem apenas nesta sessão.
        </p>
      )}
    </div>
  );
}
