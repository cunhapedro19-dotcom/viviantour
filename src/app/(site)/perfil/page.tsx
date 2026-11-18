"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { DEMO_MODE } from "@/lib/config";
import { getDemoUser, setDemoUser } from "@/lib/demo-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type ProfileState = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
};

export default function PerfilPage() {
  const [profile, setProfile] = useState<ProfileState | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (DEMO_MODE) {
        const demo = getDemoUser();
        if (!demo) {
          window.location.href = "/entrar?next=/perfil";
          return;
        }
        const loaded = { id: demo.id, name: demo.name, email: demo.email, phone: "", role: demo.role };
        setProfile(loaded);
        setName(loaded.name);
        return;
      }

      const sb = getSupabaseBrowserClient();
      const { data: { user } } = await sb.auth.getUser();
      if (!user) {
        window.location.href = "/entrar?next=/perfil";
        return;
      }
      const { data } = await sb
        .from("profiles")
        .select("full_name, email, phone, role")
        .eq("id", user.id)
        .single();
      if (!data) {
        window.location.href = "/entrar?erro=perfil";
        return;
      }
      const loaded = { id: user.id, name: data.full_name, email: data.email, phone: data.phone ?? "", role: data.role };
      setProfile(loaded);
      setName(loaded.name);
      setPhone(loaded.phone);
    }
    load();
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!profile) return;
    setBusy(true);
    setMessage(null);
    if (DEMO_MODE) {
      const demo = getDemoUser();
      if (demo) setDemoUser({ ...demo, name: name.trim() });
      setMessage("Dados atualizados no modo demonstração.");
      setBusy(false);
      return;
    }
    const sb = getSupabaseBrowserClient();
    const { error } = await sb
      .from("profiles")
      .update({ full_name: name.trim(), phone: phone.trim() })
      .eq("id", profile.id);
    setBusy(false);
    setMessage(error ? "Não foi possível salvar seus dados. Tente novamente." : "Dados atualizados com sucesso.");
    if (!error) setProfile({ ...profile, name: name.trim(), phone: phone.trim() });
  }

  if (!profile) {
    return <div className="container-x py-20 text-center text-sm text-tinta-mute">Carregando perfil…</div>;
  }

  return (
    <div className="container-x max-w-2xl py-10">
      <Logo />
      <header className="mt-7">
        <p className="kicker">Minha conta</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-tinta">Dados do perfil</h1>
        <p className="mt-2 text-sm text-tinta-mute">Mantenha seus dados atualizados para contatos e reservas futuras.</p>
      </header>
      <form onSubmit={submit} className="card mt-7 space-y-4 p-6">
        <div>
          <label className="label" htmlFor="name">Nome completo</label>
          <input id="name" required className="input" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input id="email" className="input bg-areia-50" value={profile.email} disabled />
        </div>
        <div>
          <label className="label" htmlFor="profile-phone">Celular / WhatsApp</label>
          <input id="profile-phone" type="tel" required minLength={10} className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(22) 99999-0000" />
        </div>
        {message && <p className={`rounded-xl px-3 py-2 text-sm ${message.includes("sucesso") || message.includes("demonstração") ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}>{message}</p>}
        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={busy} className="btn-primary">{busy ? "Salvando…" : "Salvar alterações"}</button>
          {profile.role === "customer" && <Link href="/minhas-viagens" className="btn-outline">Minhas viagens</Link>}
          {profile.role === "owner" && <Link href="/painel/owner" className="btn-outline">Meu painel</Link>}
          {profile.role === "provider" && <Link href="/painel/provider" className="btn-outline">Meu painel</Link>}
          {profile.role === "admin" && <Link href="/admin" className="btn-outline">Administração</Link>}
        </div>
      </form>
    </div>
  );
}
