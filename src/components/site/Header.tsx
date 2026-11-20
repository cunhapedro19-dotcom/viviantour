"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { DEMO_MODE } from "@/lib/config";
import { getDemoUser, setDemoUser } from "@/lib/demo-store";
import type { Role } from "@/lib/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { PANEL_HOME } from "@/lib/access-control";

interface HeaderUser {
  name: string;
  role: Role;
}

const NAV = [
  { href: "/buscar?tipo=stay", label: "Hospedagens" },
  { href: "/buscar?tipo=tour", label: "Passeios" },
  { href: "/combos", label: "Combos" },
  { href: "/buscar?tipo=tour&categoria=bate-e-volta", label: "Bate e volta" },
  { href: "/buscar?tipo=tour&categoria=experiencia-nautica", label: "Experiências" },
  { href: "/anuncie", label: "Seja um parceiro" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<HeaderUser | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (DEMO_MODE) {
        const demo = getDemoUser();
        if (active && demo) setUser({ name: demo.name, role: demo.role });
        return;
      }
      const sb = getSupabaseBrowserClient();
      const {
        data: { user: authUser },
      } = await sb.auth.getUser();
      if (!authUser) return;
      const { data: profile } = await sb
        .from("profiles")
        .select("full_name, role")
        .eq("id", authUser.id)
        .single();
      if (active) {
        setUser({
          name: profile?.full_name || authUser.email || "Conta",
          role: (profile?.role as Role) ?? "customer",
        });
      }
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

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

  const dashboardHref = user?.role === "customer" ? "/perfil" : user ? PANEL_HOME[user.role] : "/entrar";
  const panelLabel = user?.role === "customer" ? "Meu perfil" : user?.role === "admin" ? "Painel Viviantourr" : "Meu painel";

  return (
    <header className="sticky top-0 z-40 border-b border-areia-200 bg-white/95 backdrop-blur">
      <div className="container-x flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Logo />
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Navegação principal">
            {NAV.map((item) => {
              const active = pathname.startsWith(item.href.split("?")[0]);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${
                    active ? "bg-areia-100 text-tinta" : "text-tinta-soft hover:bg-areia-50 hover:text-tinta"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          {user ? (
            <UserMenu name={user.name} role={user.role} onSignOut={signOut} dashboardHref={dashboardHref} panelLabel={panelLabel} />
          ) : (
            <>
              <Link href="/entrar" className="btn-ghost btn-sm">
                Entrar
              </Link>
              <Link href="/cadastro" className="btn-primary btn-sm">
                Criar conta
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-full hover:bg-areia-100 lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Abrir menu"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6 stroke-tinta" strokeWidth="2" fill="none" strokeLinecap="round">
            {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-areia-200 bg-white lg:hidden">
          <div className="container-x flex flex-col gap-1 py-3">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-xl px-3 py-2.5 text-sm font-medium text-tinta-soft hover:bg-areia-50">
                {item.label}
              </Link>
            ))}
            <div className="my-2 h-px bg-areia-200" />
            {user ? (
              <>
                <Link href={dashboardHref} className="rounded-xl px-3 py-2.5 text-sm font-medium text-tinta hover:bg-areia-50">
                  {panelLabel}
                </Link>
                {user.role === "customer" && (
                  <Link href="/minhas-viagens" className="rounded-xl px-3 py-2.5 text-sm font-medium text-tinta-soft hover:bg-areia-50">
                    Minhas viagens
                  </Link>
                )}
                {user.role !== "customer" && (
                  <Link href="/perfil" className="rounded-xl px-3 py-2.5 text-sm font-medium text-tinta-soft hover:bg-areia-50">
                    Meu perfil
                  </Link>
                )}
                <Link href="/favoritos" className="rounded-xl px-3 py-2.5 text-sm font-medium text-tinta-soft hover:bg-areia-50">
                  Favoritos
                </Link>
                <button type="button" onClick={signOut} className="rounded-xl px-3 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50">
                  Sair
                </button>
              </>
            ) : (
              <div className="flex gap-2 px-3 py-2">
                <Link href="/entrar" className="btn-outline btn-sm flex-1">
                  Entrar
                </Link>
                <Link href="/cadastro" className="btn-primary btn-sm flex-1">
                  Criar conta
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function UserMenu({
  name,
  role,
  onSignOut,
  dashboardHref,
  panelLabel,
}: {
  name: string;
  role: Role;
  onSignOut: () => void;
  dashboardHref: string;
  panelLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "V";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-areia-300 bg-white py-1.5 pl-1.5 pr-3 transition hover:shadow-sm"
        aria-expanded={open}
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-oceano-600 text-xs font-bold text-white">
          {initial}
        </span>
        <svg viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-tinta-soft" aria-hidden="true">
          <path d="M5.5 7.5L10 12l4.5-4.5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <>
          <button type="button" className="fixed inset-0 z-10 cursor-default" onClick={() => setOpen(false)} aria-label="Fechar menu" />
          <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-areia-200 bg-white py-1.5 shadow-pop">
            <div className="px-4 pb-2 pt-1">
              <p className="truncate text-sm font-semibold text-tinta">{name}</p>
              <p className="text-xs text-tinta-mute">{roleLabel(role)}</p>
            </div>
            <div className="h-px bg-areia-200" />
            <Link href={dashboardHref} className="block px-4 py-2.5 text-sm text-tinta hover:bg-areia-50">
              {panelLabel}
            </Link>
            {role === "customer" && (
              <Link href="/minhas-viagens" className="block px-4 py-2.5 text-sm text-tinta hover:bg-areia-50">
                Minhas viagens
              </Link>
            )}
            {role !== "customer" && (
              <Link href="/perfil" className="block px-4 py-2.5 text-sm text-tinta hover:bg-areia-50">
                Meu perfil
              </Link>
            )}
            <Link href="/favoritos" className="block px-4 py-2.5 text-sm text-tinta hover:bg-areia-50">
              Favoritos
            </Link>
            <div className="h-px bg-areia-200" />
            <button type="button" onClick={onSignOut} className="block w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50">
              Sair
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function roleLabel(role: Role): string {
  switch (role) {
    case "admin":
      return "Administração Viviantourr";
    case "owner":
      return "Proprietário";
    case "provider":
      return "Prestador de serviços";
    default:
      return "Viajante";
  }
}
