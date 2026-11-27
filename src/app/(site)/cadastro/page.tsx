"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/Logo";
import { DEMO_MODE } from "@/lib/config";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { PANEL_HOME } from "@/lib/access-control";

type RoleChoice = "customer" | "owner" | "provider";

const ROLE_OPTIONS: { value: RoleChoice; title: string; description: string }[] = [
  { value: "customer", title: "Viajante", description: "Pesquisar e reservar hospedagens, passeios e experiências." },
  { value: "owner", title: "Proprietário", description: "Anunciar casas, apartamentos e pousadas com painel de gestão." },
  { value: "provider", title: "Prestador de serviços", description: "Anunciar passeios, embarcações, mergulho e experiências." },
];

export default function CadastroPage() {
  return <Suspense fallback={<div className="container-x py-24" />}><CadastroPageContent /></Suspense>;
}

function CadastroPageContent() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "";
  const [role, setRole] = useState<RoleChoice>(params.get("role") === "owner" ? "owner" : "customer");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
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
          data: {
            full_name: fullName, phone, role,
            address_postal_code: postalCode, address_street: street, address_number: number,
            address_complement: complement, address_neighborhood: neighborhood,
            address_city: city, address_state: state.toUpperCase(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}`,
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
        router.push(next.startsWith("/") && !next.startsWith("//") ? next : PANEL_HOME[role]);
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
          <label className="label" htmlFor="phone">Celular / WhatsApp</label>
          <input id="phone" type="tel" required minLength={10} className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(22) 99999-0000" />
        </div>
        <fieldset className="space-y-4 rounded-xl border border-areia-200 p-4">
          <legend className="px-1 text-sm font-semibold text-tinta">Endereço (opcional)</legend>
          <p className="text-xs text-tinta-mute">Ajuda a planejar futuras saídas e pontos de embarque, como São Gonçalo → Arraial do Cabo.</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className="label" htmlFor="postalCode">CEP</label><input id="postalCode" inputMode="numeric" className="input" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="00000-000" /></div>
            <div className="sm:col-span-2"><label className="label" htmlFor="street">Rua / avenida</label><input id="street" className="input" value={street} onChange={(e) => setStreet(e.target.value)} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className="label" htmlFor="number">Número</label><input id="number" className="input" value={number} onChange={(e) => setNumber(e.target.value)} /></div>
            <div className="sm:col-span-2"><label className="label" htmlFor="complement">Complemento</label><input id="complement" className="input" value={complement} onChange={(e) => setComplement(e.target.value)} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className="label" htmlFor="neighborhood">Bairro</label><input id="neighborhood" className="input" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} /></div>
            <div><label className="label" htmlFor="city">Cidade</label><input id="city" className="input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="São Gonçalo" /></div>
            <div><label className="label" htmlFor="state">UF</label><input id="state" maxLength={2} className="input uppercase" value={state} onChange={(e) => setState(e.target.value.toUpperCase())} placeholder="RJ" /></div>
          </div>
        </fieldset>
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
          <Link href={next ? `/entrar?next=${encodeURIComponent(next)}` : "/entrar"} className="font-semibold text-oceano-600 hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}
