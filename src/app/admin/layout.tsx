"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { DEMO_MODE } from "@/lib/config";
import { setDemoUser } from "@/lib/demo-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/admin", label: "Dashboard geral", exact: true },
  { href: "/admin/fornecedores", label: "Fornecedores" },
  { href: "/admin/anuncios", label: "Anúncios" },
  { href: "/admin/reservas", label: "Reservas" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [state, setState] = useState<"loading" | "ok" | "denied">("loading");
  const [name, setName] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (DEMO_MODE) {
        const stored = window.localStorage.getItem("vt:user");
        if (!stored) {
          window.location.href = "/entrar?next=/admin";
          return;
        }
        const user = JSON.parse(stored) as { role: string; name: string };
        if (user.role !== "admin") {
          if (active) setState("denied");
          return;
        }
        if (active) {
          setName(user.name);
          setState("ok");
        }
        return;
      }
      const sb = getSupabaseBrowserClient();
      const {
        data: { user: authUser },
      } = await sb.auth.getUser();
      if (!authUser) {
        window.location.href = "/entrar?next=/admin";
        return;
      }
      const { data: profile } = await sb.from("profiles").select("full_name, role").eq("id", authUser.id).single();
      if (profile?.role !== "admin") {
        if (active) setState("denied");
        return;
      }
      if (active) {
        setName(profile.full_name || authUser.email || "Admin");
        setState("ok");
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

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

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-areia-50">
        <div className="text-center">
          <Logo />
          <p className="mt-4 text-sm text-tinta-mute">Verificando credenciais…</p>
        </div>
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-areia-50 p-6">
        <div className="card max-w-md p-8 text-center">
          <h1 className="font-display text-xl font-semibold text-tinta">Acesso restrito</h1>
          <p className="mt-2 text-sm text-tinta-mute">
            Esta área é exclusiva da administração Viviantourr. Para virar administrador no modo
            real, rode o SQL de promoção presente no arquivo seed.sql.
          </p>
          <Link href="/" className="btn-outline btn-sm mt-5">
            Voltar ao site
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-areia-50 lg:flex">
      <aside className="border-b border-areia-200 bg-tinta lg:min-h-screen lg:w-64 lg:shrink-0 lg:border-b-0">
        <div className="p-4">
          <Logo light />
          <p className="mt-1 text-xs text-oceano-200">Administração master</p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:mt-2 lg:flex-col lg:pb-6" aria-label="Menu administrativo">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-xl px-3.5 py-2.5 text-sm font-medium transition ${
                  active ? "bg-turquesa-500 text-white" : "text-oceano-100 hover:bg-tinta-soft"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden border-t border-tinta-soft p-4 lg:block">
          <Link href="/" className="text-xs font-medium text-turquesa-300 hover:underline">
            ← Ver o marketplace
          </Link>
          <button type="button" onClick={signOut} className="mt-3 block text-xs text-oceano-200 hover:text-white">
            Sair da conta
          </button>
        </div>
      </aside>

      <div className="flex-1">
        <header className="flex items-center justify-between border-b border-areia-200 bg-white px-5 py-3.5">
          <p className="text-sm font-semibold text-tinta">Painel Viviantourr</p>
          <div className="flex items-center gap-3">
            {DEMO_MODE && (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700">
                Demo
              </span>
            )}
            <span className="hidden text-xs text-tinta-mute sm:block">{name}</span>
          </div>
        </header>
        <div className="mx-auto max-w-5xl p-5 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
