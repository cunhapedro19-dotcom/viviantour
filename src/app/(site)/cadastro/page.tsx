"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { DEMO_MODE } from "@/lib/config";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type RoleChoice = "customer" | "owner" | "provider";

const ROLE_OPTIONS: { value: RoleChoice; title: string; description: string }[] = [
  { value: "customer", title: "Viajante", description: "Pesquisar e reservar hospedagens, passeios e experiências." },
  { value: "owner", title: "Proprietário", description: "Anunciar casas, apartamentos e pousadas com painel de gestão." },
  { value: "provider", title: "Prestador de serviços", description: "Anunciar passeios, embarcações, mergulho e experiências." },
];

export default function CadastroPage() {
  const router = useRouter();
  const [role, setRole] = useState<RoleChoice>("customer");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const sb = getSupabaseBrowserClient();
      const { data, error: err } = await sb.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, phone, role },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (err) {
        setError(
          err.message.includes("already registered")
            ? "Este e-mail já está cadastrado. Tente entrar."
            : err.message.includes("Password")
            ? "A senha deve ter pelo menos 6 caracteres."
            : "Não foi possível concluir o cadastro. Tente novamente."
        );
        return;
      }
      if (data.session) {
        router.push(role === "customer" ? "/" : "/painel");
        router.refresh();
        return;
      }
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  if (DEMO_MODE) {
    return (
      <div className="container-x flex flex-col items-center py-16">
        <Logo />
        <h1 className="mt-6 font-display text-3xl font-semibold text-tinta">Criar conta</h1>
        <div className="card mt-8 max-w-lg p-8 text-center">
          <p className="text-sm leading-relaxed text-tinta-soft">
            No <strong>modo demonstração</strong> o cadastro real está desativado. Você já pode
            explorar todos os painéis com perfis de exemplo — e quando o projeto Supabase for
            conectado (guia no README), este formulário passa a criar contas de verdade.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/entrar" className="btn-primary">
              Explorar com perfis demo
            </Link>
            <Link href="/sobre#supabase" className="btn-outline">
              Como ativar o modo real
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="container-x flex flex-col items-center py-16">
        <Logo />
        <div className="card mt-8 max-w-md p-8 text-center">
          <h1 className="font-display text-2xl font-semibold text-tinta">Confirme seu e-mail</h1>
          <p className="mt-3 text-sm text-tinta-mute">
            Enviamos um link de confirmação para <strong>{email}</strong>. Depois de confirmar, faça
            login para começar.
          </p>
          <Link href="/entrar" className="btn-primary mt-6 inline-flex">
            Ir para o login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-x flex flex-col items-center py-14">
      <Logo />
      <h1 className="mt-6 font-display text-3xl font-semibold text-tinta">Criar sua conta</h1>
      <p className="mt-2 text-sm text-tinta-mute">Escolha como você vai usar o Viviantourr.</p>

      <div className="mt-7 grid w-full max-w-2xl gap-3 sm:grid-cols-3">
        {ROLE_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => setRole(o.value)}
            className={`rounded-2xl border p-4 text-left transition ${
              role === o.value
                ? "border-oceano-600 bg-oceano-50 shadow-card"
                : "border-areia-300 bg-white hover:border-oceano-300"
            }`}
          >
            <p className="font-semibold text-tinta">{o.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-tinta-mute">{o.description}</p>
          </button>
        ))}
      </div>

      <form onSubmit={signUp} className="card mt-6 w-full max-w-md space-y-4 p-6">
        <div>
          <label className="label" htmlFor="fullName">Nome completo</label>
          <input id="fullName" required className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Seu nome" />
        </div>
        <div>
          <label className="label" htmlFor="phone">WhatsApp (opcional)</label>
          <input id="phone" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(22) 99999-0000" />
        </div>
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
        </div>
        <div>
          <label className="label" htmlFor="password">Senha</label>
          <input id="password" type="password" required minLength={6} className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
        </div>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? "Criando conta…" : "Criar conta"}
        </button>
        <p className="text-center text-sm text-tinta-mute">
          Já tem conta?{" "}
          <Link href="/entrar" className="font-semibold text-oceano-600 hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}
