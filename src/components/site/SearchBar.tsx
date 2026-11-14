"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SearchBar({ variant = "hero" }: { variant?: "hero" | "compact" }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [pessoas, setPessoas] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (pessoas) params.set("pessoas", pessoas);
    router.push(`/buscar?${params.toString()}`);
  }

  return (
    <form
      onSubmit={submit}
      className={`flex w-full items-stretch gap-1 rounded-full border border-areia-200 bg-white p-1.5 shadow-widget ${
        variant === "hero" ? "flex-col sm:flex-row sm:items-center" : "flex-row items-center"
      }`}
      role="search"
    >
      <label className={`flex flex-1 items-center gap-2 rounded-full px-4 ${variant === "hero" ? "py-2" : "py-1"}`}>
        <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0 fill-turquesa-500" aria-hidden="true">
          <path d="M10 2a6 6 0 016 6c0 2.6-1.6 4.8-3.9 5.6L11 20H9l-1.1-6.4A6 6 0 0110 2zm0 2a4 4 0 100 8 4 4 0 000-8z" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Praia, bairro ou passeio…"
          className="w-full bg-transparent text-sm text-tinta placeholder:text-tinta-mute focus:outline-none"
          aria-label="Onde você quer ir?"
        />
      </label>
      <label className={`flex items-center gap-2 rounded-full px-4 ${variant === "hero" ? "border-t border-areia-200 py-2 sm:border-0 sm:border-l" : "border-l border-areia-200 py-1"}`}>
        <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0 fill-oceano-500" aria-hidden="true">
          <path d="M10 2a4 4 0 110 8 4 4 0 010-8zM3 18c0-3.3 3.1-6 7-6s7 2.7 7 6H3z" />
        </svg>
        <select
          value={pessoas}
          onChange={(e) => setPessoas(e.target.value)}
          className="w-full bg-transparent text-sm text-tinta focus:outline-none"
          aria-label="Hóspedes"
        >
          <option value="">Hóspedes</option>
          {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "pessoa" : "pessoas"}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        className="btn-turquesa shrink-0 rounded-full px-6"
        aria-label="Buscar"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4 fill-white" aria-hidden="true">
          <path d="M8.5 3a5.5 5.5 0 014.4 8.8l3.6 3.7-1.4 1.4-3.7-3.6A5.5 5.5 0 118.5 3zm0 2a3.5 3.5 0 100 7 3.5 3.5 0 000-7z" />
        </svg>
        Buscar
      </button>
    </form>
  );
}
