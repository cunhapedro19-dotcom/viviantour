"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";
import { DEMO_MODE } from "@/lib/config";
import { setDemoUser } from "@/lib/demo-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function EntrarPage() {
  return (
    <Suspense fallback={<div className="container-x py-24" />}>
      <EntrarInner />
    </Suspense>
  );
}

function EntrarInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const sb = getSupabaseBrowserClient();
      const { error: err } = await sb.auth.signInWithPassword({ email, password });
      if (err) {
        setError(
          err.message === "Invalid login credentials"
            ? "E-mail ou senha incorretos."
            : "Não foi possível entrar. Tente novamente."
        );
        return;
      }
      router.push(next || "/");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function enterDemo(user: { id: string; name: string; email: string; role: "admin" | "owner" | "provider" | "customer"; orgId?: string; orgName?: string }) {
    setDemoUser(user);
    if (user.role === "admin") router.push("/admin");
    else if (user.role === "customer") router.push(next || "/minhas-viagens");
    else router.push(next || "/painel");
  }

  return (
    <div className="container-x flex flex-col items-center py-14">
      <Logo />
      <h1 className="mt-6 font-display text-3xl font-semibold text-tinta">Entrar no Viviantourr</h1>
      <p className="mt-2 text-sm text-tinta-mute">
        {DEMO_MODE
          ? "Você está no modo demonstração — escolha um perfil para explorar a plataforma inteira."
          : "Bem-vindo de volta! Acesse sua conta para gerenciar reservas."}
      </p>

      {DEMO_MODE ? (
        <div className="mt-8 grid w-full max-w-3xl gap-4 sm:grid-cols-2">
          <DemoRoleCard
            title="Viajante"
            name="Ana Costa"
            description="Pesquisar anúncios, favoritar, solicitar e acompanhar reservas."
            onClick={() => enterDemo({ id: "demo-ana", name: "Ana Costa", email: "ana@demo.viviantourr", role: "customer" })}
          />
          <DemoRoleCard
            title="Proprietário"
            name="Carlos Mendes · Vista Mar Imóveis"
            description="Painel com imóveis, calendário, iCal do Airbnb e reservas recebidas."
            onClick={() =>
              enterDemo({ id: "demo-carlos", name: "Carlos Mendes", email: "carlos@demo.viviantourr", role: "owner", orgId: "org-host-1", orgName: "Vista Mar Imóveis" })
            }
          />
          <DemoRoleCard
            title="Prestador de serviços"
            name="Roberto Nunes · Mar Azul Escunas"
            description="Painel com passeios, saídas operacionais, vagas e faturamento."
            onClick={() =>
              enterDemo({ id: "demo-roberto", name: "Roberto Nunes", email: "roberto@demo.viviantourr", role: "provider", orgId: "org-op-1", orgName: "Mar Azul Escunas" })
            }
          />
          <DemoRoleCard
            title="Administração"
            name="Equipe Viviantourr"
            description="Visão geral do marketplace, aprovações, moderação e comissões."
            onClick={() => enterDemo({ id: "demo-admin", name: "Viviantourr Admin", email: "admin@viviantourr.com", role: "admin" })}
          />
        </div>
      ) : (
        <form onSubmit={signIn} className="card mt-8 w-full max-w-md space-y-4 p-6">
          <div>
            <label className="label" htmlFor="email">E-mail</label>
            <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
          </div>
          <div>
            <label className="label" htmlFor="password">Senha</label>
            <input id="password" type="password" required className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? "Entrando…" : "Entrar"}
          </button>
          <p className="text-center text-sm text-tinta-mute">
            Ainda não tem conta?{" "}
            <Link href="/cadastro" className="font-semibold text-oceano-600 hover:underline">
              Cadastre-se
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}

function DemoRoleCard({
  title,
  name,
  description,
  onClick,
}: {
  title: string;
  name: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card group p-6 text-left transition hover:-translate-y-0.5 hover:border-turquesa-300 hover:shadow-pop"
    >
      <p className="kicker">{title}</p>
      <h2 className="mt-1 font-semibold text-tinta">{name}</h2>
      <p className="mt-2 text-sm text-tinta-mute">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-oceano-600 group-hover:gap-2">
        Entrar como este perfil
        <svg viewBox="0 0 20 20" className="h-4 w-4 fill-current">
          <path d="M4 10h9.6l-3.3-3.3L11.7 5.3 16.4 10l-4.7 4.7-1.4-1.4L13.6 10H4z" />
        </svg>
      </span>
    </button>
  );
}
