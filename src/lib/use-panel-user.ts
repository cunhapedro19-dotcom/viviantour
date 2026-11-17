"use client";

import { useEffect, useState } from "react";
import { DEMO_MODE } from "./config";
import { getDemoUser } from "./demo-store";
import { getSupabaseBrowserClient } from "./supabase/client";
import type { DemoUser, Role } from "./types";

/**
 * Resolve o usuário do painel:
 *  · Demo: perfil simulado do demo-store (proprietário/prestador/admin)
 *  · Supabase: sessão + perfil + organização (via RLS)
 * Redireciona para /entrar quando não autenticado ou sem papel permitido.
 */
export function usePanelUser(allowed: Role[] = ["owner", "provider", "admin"]) {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      const adminPropertyMode =
        window.location.pathname.startsWith("/painel/imoveis/") &&
        new URLSearchParams(window.location.search).get("asAdmin") === "1";

      if (DEMO_MODE) {
        const demo = getDemoUser();
        if (!active) return;
        if (!demo || !allowed.includes(demo.role)) {
          window.location.href = "/entrar?next=/painel";
          return;
        }
        if (demo.role === "admin" && !adminPropertyMode) {
          window.location.href = "/admin";
          return;
        }
        setUser(demo);
        setLoading(false);
        return;
      }

      const sb = getSupabaseBrowserClient();
      const {
        data: { user: authUser },
      } = await sb.auth.getUser();
      if (!authUser) {
        window.location.href = "/entrar?next=/painel";
        return;
      }

      const { data: profile } = await sb
        .from("profiles")
        .select("full_name, role")
        .eq("id", authUser.id)
        .single();

      const role = ((profile?.role as Role) ?? "customer") satisfies Role;
      if (role === "admin" && !adminPropertyMode) {
        window.location.href = "/admin";
        return;
      }
      if (!allowed.includes(role)) {
        window.location.href = "/";
        return;
      }

      const { data: membership } = await sb
        .from("organization_members")
        .select("organization:organizations(id,name)")
        .eq("profile_id", authUser.id)
        .limit(1);

      const org = (membership?.[0] as { organization?: { id: string; name: string } } | undefined)?.organization;

      if (!active) return;
      setUser({
        id: authUser.id,
        name: profile?.full_name || authUser.email || "Fornecedor",
        email: authUser.email ?? "",
        role,
        orgId: org?.id,
        orgName: org?.name,
      });
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { user, loading };
}
