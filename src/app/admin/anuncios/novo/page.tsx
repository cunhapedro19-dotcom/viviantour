"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PropertyForm } from "@/components/panel/PropertyForm";
import { ServiceForm } from "@/components/panel/ServiceForm";
import { createStayAsAdmin, createTourAsAdmin, DEMO_UNAVAILABLE, fetchAdminOrgs } from "@/lib/admin-ops";
import type { AdminOrgRow } from "@/lib/admin-ops";
import { DEMO_MODE } from "@/lib/config";
import type { NewStayInput, NewTourInput } from "@/lib/types";

export default function NovoAnuncioAdminPage() {
  const router = useRouter();
  const [orgs, setOrgs] = useState<AdminOrgRow[] | null>(null);
  const [kind, setKind] = useState<"stay" | "tour">("stay");
  const [orgId, setOrgId] = useState("");
  const [publishNow, setPublishNow] = useState(true);

  useEffect(() => {
    let active = true;
    fetchAdminOrgs().then((list) => {
      if (active) setOrgs(list.filter((o) => o.status === "active" || o.status === "pending"));
    });
    return () => {
      active = false;
    };
  }, []);

  const options = (orgs ?? []).filter((o) => (kind === "stay" ? o.kind === "host" : o.kind === "operator"));
  const org = options.find((o) => o.id === orgId);

  function changeKind(next: "stay" | "tour") {
    setKind(next);
    setOrgId("");
  }

  async function submitStay(input: NewStayInput) {
    if (!org) {
      window.alert("Escolha o fornecedor do anúncio.");
      return false;
    }
    const result = await createStayAsAdmin({ id: org.id, name: org.name }, input, publishNow);
    if (!result.ok) {
      window.alert(result.error);
      return false;
    }
    router.push(`/admin/anuncios/midia/hospedagem/${result.id}`);
    return true;
  }

  async function submitTour(input: NewTourInput) {
    if (!org) {
      window.alert("Escolha o fornecedor do anúncio.");
      return false;
    }
    const result = await createTourAsAdmin({ id: org.id, name: org.name }, input, publishNow);
    if (!result.ok) {
      window.alert(result.error);
      return false;
    }
    router.push(`/admin/anuncios/midia/passeio/${result.id}`);
    return true;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-tinta">Novo anúncio</h1>
        <p className="mt-1 text-sm text-tinta-mute">
          Cadastre uma hospedagem ou um passeio em nome de um fornecedor. Ao criar, você já vai para o envio de fotos e vídeos.
        </p>
      </header>

      {DEMO_MODE && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">{DEMO_UNAVAILABLE}</p>
      )}

      <div className="card max-w-xl space-y-5 p-6">
        <div className="flex gap-2">
          {(
            [
              ["stay", "Hospedagem"],
              ["tour", "Passeio"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => changeKind(value)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                kind === value
                  ? "bg-oceano-600 text-white"
                  : "border border-areia-200 bg-white text-tinta-soft hover:bg-areia-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div>
          <label className="label" htmlFor="org">
            Fornecedor
          </label>
          {orgs === null ? (
            <div className="h-11 animate-pulse rounded-xl bg-areia-100" />
          ) : (
            <select id="org" className="input" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
              <option value="">Selecione…</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          )}
          {orgs !== null && options.length === 0 && (
            <p className="mt-2 text-xs text-tinta-mute">
              Nenhum fornecedor {kind === "stay" ? "de hospedagens" : "de passeios"} ainda.{" "}
              <Link href="/admin/fornecedores/novo" className="font-semibold text-oceano-700 underline">
                Cadastrar fornecedor
              </Link>
            </p>
          )}
        </div>

        <label className="flex items-start gap-3 text-sm text-tinta-soft">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4"
            checked={publishNow}
            onChange={(e) => setPublishNow(e.target.checked)}
          />
          <span>
            Publicar assim que criar
            <span className="block text-xs text-tinta-mute">
              Desmarcado, o anúncio fica como rascunho até você publicar em Anúncios.
            </span>
          </span>
        </label>
      </div>

      {org ? (
        kind === "stay" ? (
          <PropertyForm key={`stay-${org.id}`} submitLabel="Criar hospedagem" onSubmit={submitStay} />
        ) : (
          <ServiceForm key={`tour-${org.id}`} submitLabel="Criar passeio" onSubmit={submitTour} />
        )
      ) : (
        <p className="text-sm text-tinta-mute">Escolha o fornecedor para abrir o formulário do anúncio.</p>
      )}
    </div>
  );
}
