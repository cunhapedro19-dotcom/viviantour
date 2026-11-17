"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { DEMO_MODE } from "@/lib/config";
import { setDemoUser } from "@/lib/demo-store";
import { createOrganization } from "@/lib/panel-ops";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { usePanelUser } from "@/lib/use-panel-user";

const NAV = [
  { href: "/painel", label: "Visão geral", icon: "🏠", exact: true },
  { href: "/painel/imoveis", label: "Hospedagens", icon: "🏡" },
  { href: "/painel/passeios", label: "Passeios", icon: "⛵" },
  { href: "/painel/reservas", label: "Reservas", icon: "📅" },
  { href: "/painel/financeiro", label: "Financeiro", icon: "💰" },
];

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = usePanelUser();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-areia-50">
        <div className="text-center">
          <Logo />
          <p className="mt-4 text-sm text-tinta-mute">Carregando seu painel…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (!user.orgId && !DEMO_MODE && user.role !== "admin") {
    return <Onboarding userName={user.name} role={user.role} />;
  }

  async function signOut() {
    if (DEMO_MODE) {
      setDemoUser(null);
      window.location.href = "/";
      return;
    }
    const sb = getSupabaseBrowserClient();
    await sb.auth.signOut();
    window.location.href = "/";
  }

  return (
    <div className="min-h-screen bg-areia-50 lg:flex">
      {/* SIDEBAR */}
      <aside className="border-b border-areia-200 bg-white lg:min-h-screen lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between p-4 lg:block">
          <Logo />
          <p className="mt-1 hidden text-xs text-tinta-mute lg:block">{user.orgName ?? (user.role === "admin" ? "Acesso administrativo" : "Painel do fornecedor")}</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:mt-2 lg:flex-col lg:overflow-visible lg:pb-6" aria-label="Menu do painel">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  active ? "bg-oceano-600 text-white" : "text-tinta-soft hover:bg-areia-100"
                }`}
              >
                <span aria-hidden>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden border-t border-areia-200 p-4 lg:block">
          <Link href="/" className="text-xs font-medium text-oceano-600 hover:underline">
            ← Ver o marketplace
          </Link>
          <button type="button" onClick={signOut} className="mt-3 block text-xs text-tinta-mute hover:text-red-600">
            Sair da conta
          </button>
        </div>
      </aside>

      {/* CONTEÚDO */}
      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-areia-200 bg-white px-5 py-3.5">
          <p className="text-sm font-semibold text-tinta">{user.role === "admin" ? "Administração de hospedagem" : "Painel do fornecedor"}</p>
          <div className="flex items-center gap-3">
            {DEMO_MODE && (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700">
                Demo
              </span>
            )}
            <span className="hidden text-xs text-tinta-mute sm:block">{user.name}</span>
            <Link href="/painel/reservas" className="relative" aria-label="Reservas">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-tinta-soft">
                <path d="M12 22a2.5 2.5 0 002.45-2h-4.9A2.5 2.5 0 0012 22zm7-5v-1l-1.7-1.7a2 2 0 01-.59-1.41V10a5 5 0 00-4-4.9V4a1.7 1.7 0 10-3.4 0v1.1a5 5 0 00-4 4.9v2.9a2 2 0 01-.59 1.41L3 16v1z" />
              </svg>
            </Link>
          </div>
        </header>
        <div className="mx-auto max-w-5xl p-5 lg:p-8">{children}</div>
      </div>
    </div>
  );
}

function Onboarding({ userName, role }: { userName: string; role: string }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"host" | "operator">(role === "provider" ? "operator" : "host");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await createOrganization(
      { id: "", name: userName, email: "", role: role === "provider" ? "provider" : "owner" },
      { name, kind, bio, phone }
    );
    if (!result.ok) {
      setError(result.error);
      setBusy(false);
      return;
    }
    window.location.reload();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-areia-50 p-6">
      <form onSubmit={submit} className="card w-full max-w-lg space-y-4 p-8">
        <Logo />
        <h1 className="mt-4 font-display text-2xl font-semibold text-tinta">Criar seu perfil comercial</h1>
        <p className="text-sm text-tinta-mute">
          Antes de anunciar, cadastre sua operação. A curadoria Viviantourr vai revisar e liberar sua
          conta (status inicial: pendente de aprovação).
        </p>
        <div>
          <label className="label" htmlFor="org-name">Nome comercial</label>
          <input id="org-name" required className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Vista Mar Imóveis" />
        </div>
        <div>
          <label className="label" htmlFor="org-kind">Tipo de operação</label>
          <select id="org-kind" className="input" value={kind} onChange={(e) => setKind(e.target.value as "host" | "operator")}>
            <option value="host">Hospedagens (proprietário/pousada)</option>
            <option value="operator">Passeios e experiências (operador)</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="org-bio">Descrição curta</label>
          <textarea id="org-bio" className="input min-h-[80px]" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Conte em uma frase o que você oferece." />
        </div>
        <div>
          <label className="label" htmlFor="org-phone">WhatsApp</label>
          <input id="org-phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(22) 99999-0000" />
        </div>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? "Criando…" : "Criar perfil comercial"}
        </button>
      </form>
    </div>
  );
}
