import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { canAccessPath, PANEL_HOME } from "@/lib/access-control";
import type { Role } from "@/lib/types";

// Rotas que exigem sessão no modo Supabase.
// No modo demonstração o acesso é liberado e os painéis fazem a guarda
// própria no cliente (usuários simulados por papel).
const PROTECTED_PREFIXES = ["/painel", "/admin", "/minhas-viagens", "/favoritos", "/perfil"];

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const needsAuth = PROTECTED_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`)
  );

  if (needsAuth && !user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/entrar";
    redirect.searchParams.set("next", path);
    return NextResponse.redirect(redirect);
  }

  if (!needsAuth || !user) return response;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const role = profile?.role as Role | undefined;

  // Sem um perfil válido não há autorização. A conta volta ao login em vez de
  // ganhar acesso pelo simples fato de possuir uma sessão.
  if (!role) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/entrar";
    redirect.searchParams.set("erro", "perfil");
    return NextResponse.redirect(redirect);
  }

  if (!canAccessPath(role, path)) {
    return NextResponse.redirect(new URL(PANEL_HOME[role], request.url));
  }

  // URLs comerciais antigas continuam funcionando, mas sempre apontam para o
  // painel independente do papel autenticado.
  const legacyPanelPath = path === "/painel" || /^\/painel\/(?!owner(?:\/|$)|provider(?:\/|$))/.test(path);
  if (legacyPanelPath) {
    const suffix = path === "/painel" ? "" : path.slice("/painel".length);
    return NextResponse.redirect(new URL(`/painel/${role === "provider" ? "provider" : "owner"}${suffix}`, request.url));
  }

  // Os painéis independentes compartilham as páginas existentes durante a
  // transição, sem expor a rota legada ao navegador.
  if (path.startsWith("/painel/owner") || path.startsWith("/painel/provider")) {
    const suffix = path.replace(/^\/painel\/(owner|provider)/, "") || "/";
    const rewrite = request.nextUrl.clone();
    rewrite.pathname = `/painel${suffix === "/" ? "" : suffix}`;
    return NextResponse.rewrite(rewrite, { request });
  }

  return response;
}

export const config = {
  matcher: [
    "/painel/:path*",
    "/admin/:path*",
    "/minhas-viagens/:path*",
    "/favoritos/:path*",
    "/perfil/:path*",
  ],
};
