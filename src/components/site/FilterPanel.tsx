"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { Category } from "@/lib/types";

export function FilterPanel({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  const tipo = params.get("tipo") ?? "";
  const categoria = params.get("categoria") ?? "";
  const pessoas = params.get("pessoas") ?? "";
  const precoMax = params.get("precoMax") ?? "";
  const ordem = params.get("ordem") ?? "relevancia";

  const relevantCategories = categories.filter((c) => (tipo ? c.kind === tipo : true));

  function apply(next: Record<string, string>) {
    const sp = new URLSearchParams(params.toString());
    Object.entries(next).forEach(([k, v]) => {
      if (v) sp.set(k, v);
      else sp.delete(k);
    });
    router.push(`/buscar?${sp.toString()}`);
  }

  function clearAll() {
    router.push("/buscar");
  }

  return (
    <div className="card space-y-4 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="label" htmlFor="f-q">
            Buscar
          </label>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              apply({ q });
            }}
          >
            <input
              id="f-q"
              className="input"
              placeholder="Praia, bairro, passeio…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </form>
        </div>
        <div className="w-full sm:w-56">
          <label className="label" htmlFor="f-ordem">
            Ordenar por
          </label>
          <select
            id="f-ordem"
            className="input"
            value={ordem}
            onChange={(e) => apply({ ordem: e.target.value })}
          >
            <option value="relevancia">Relevância</option>
            <option value="preco_asc">Menor preço</option>
            <option value="preco_desc">Maior preço</option>
            <option value="avaliacao">Melhor avaliados</option>
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          options={[
            { value: "", label: "Todos" },
            { value: "stay", label: "Hospedagens" },
            { value: "tour", label: "Passeios" },
          ]}
          value={tipo}
          onChange={(v) => apply({ tipo: v, categoria: "" })}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="f-cat">
            Categoria
          </label>
          <select
            id="f-cat"
            className="input"
            value={categoria}
            onChange={(e) => apply({ categoria: e.target.value })}
          >
            <option value="">Todas</option>
            {relevantCategories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="f-pessoas">
            Quantidade de pessoas
          </label>
          <select
            id="f-pessoas"
            className="input"
            value={pessoas}
            onChange={(e) => apply({ pessoas: e.target.value })}
          >
            <option value="">Qualquer</option>
            {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
              <option key={n} value={n}>
                {n}+
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="f-preco">
            Preço máximo: {precoMax ? `R$ ${precoMax}` : "qualquer"}
          </label>
          <input
            id="f-preco"
            type="range"
            min={100}
            max={2000}
            step={50}
            value={precoMax || 2000}
            onChange={(e) => apply({ precoMax: e.target.value === "2000" ? "" : e.target.value })}
            className="mt-2 w-full accent-turquesa-500"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={clearAll} className="btn-ghost btn-sm">
          Limpar filtros
        </button>
      </div>
    </div>
  );
}

function Segmented({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-areia-300 bg-white p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
            value === o.value ? "bg-oceano-600 text-white" : "text-tinta-soft hover:bg-areia-100"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
