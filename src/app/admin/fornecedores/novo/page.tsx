"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createSupplier, DEMO_UNAVAILABLE } from "@/lib/admin-ops";
import { DEMO_MODE } from "@/lib/config";

export default function NovoFornecedorPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [kind, setKind] = useState<"host" | "operator">("host");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [linkEmail, setLinkEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (name.trim().length < 3) {
      setError("Informe o nome do fornecedor (mínimo de 3 letras).");
      return;
    }
    setBusy(true);
    const result = await createSupplier({
      name: name.trim(),
      kind,
      bio: bio.trim(),
      phone: phone.trim(),
      email: email.trim(),
      linkEmail,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (result.linkWarning) {
      setWarning(result.linkWarning);
      return;
    }
    router.push("/admin/fornecedores");
  }

  if (warning) {
    return (
      <div className="card max-w-xl space-y-4 p-6">
        <h1 className="font-display text-xl font-semibold text-tinta">Fornecedor criado</h1>
        <p className="text-sm text-tinta-soft">{warning}</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/fornecedores" className="btn-primary btn-sm">
            Ver fornecedores
          </Link>
          <Link href="/admin/anuncios/novo" className="btn-outline btn-sm">
            Cadastrar um anúncio para ele
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-tinta">Novo fornecedor</h1>
        <p className="mt-1 text-sm text-tinta-mute">
          O fornecedor é criado já aprovado. Depois você cadastra os anúncios dele em Anúncios → Novo anúncio.
        </p>
      </header>

      {DEMO_MODE && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">{DEMO_UNAVAILABLE}</p>
      )}

      <form onSubmit={submit} className="card max-w-xl space-y-5 p-6">
        <div>
          <label className="label" htmlFor="name">
            Nome do fornecedor
          </label>
          <input
            id="name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Mar Azul Escunas"
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="kind">
            O que ele oferece
          </label>
          <select id="kind" className="input" value={kind} onChange={(e) => setKind(e.target.value as "host" | "operator")}>
            <option value="host">Hospedagens (imóveis)</option>
            <option value="operator">Passeios e experiências</option>
          </select>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="phone">
              Telefone / WhatsApp
            </label>
            <input
              id="phone"
              className="input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(22) 99999-9999"
              inputMode="tel"
            />
          </div>
          <div>
            <label className="label" htmlFor="email">
              E-mail de contato
            </label>
            <input
              id="email"
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contato@fornecedor.com.br"
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="bio">
            Apresentação
          </label>
          <textarea
            id="bio"
            className="input min-h-[96px]"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Quem é o fornecedor e o que oferece em Arraial do Cabo."
          />
        </div>

        <div className="rounded-xl bg-areia-100 p-4">
          <label className="label" htmlFor="linkEmail">
            Conta que vai administrar (opcional)
          </label>
          <input
            id="linkEmail"
            type="email"
            className="input"
            value={linkEmail}
            onChange={(e) => setLinkEmail(e.target.value)}
            placeholder="E-mail com que a pessoa se cadastrou no site"
          />
          <p className="mt-2 text-xs text-tinta-mute">
            Se a conta existir, ela passa a gerenciar este fornecedor em /painel. Sem conta, o fornecedor fica sob
            sua administração e você pode vincular depois.
          </p>
        </div>

        {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn-primary" disabled={busy || DEMO_MODE}>
            {busy ? "Criando…" : "Criar fornecedor"}
          </button>
          <Link href="/admin/fornecedores" className="btn-ghost">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  );
}
