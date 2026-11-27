"use client";

import { useEffect, useState } from "react";
import { DEMO_MODE } from "./config";
import { getDemoUser } from "./demo-store";
import { getSupabaseBrowserClient } from "./supabase/client";
import { PANEL_HOME } from "./access-control";
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
      if (DEMO_MODE) {
        const demo = getDemoUser();
        if (!active) return;
        if (!demo || !allowed.includes(demo.role)) {
          window.location.href = "/entrar?next=/painel";
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
      if (!allowed.includes(role)) {
        window.location.href = PANEL_HOME[role];
        return;
      }

      const { data: membership } = await sb
        .from("organization_members")
        .select("member_role,organization:organizations(id,name,kind)")
        .eq("profile_id", authUser.id);

      type Membership = {
        member_role: "owner" | "manager" | "staff";
        organization?: { id: string; name: string; kind: "host" | "operator" } | null;
      };
      const expectedKind = role === "owner" ? "host" : role === "provider" ? "operator" : null;
      const matches = ((membership ?? []) as Membership[])
        .filter((item) => item.organization && (!expectedKind || item.organization.kind === expectedKind));
      const rank = { owner: 0, manager: 1, staff: 2 };
      matches.sort((a, b) => rank[a.member_role] - rank[b.member_role]);
      const org = matches[0]?.organization;

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
