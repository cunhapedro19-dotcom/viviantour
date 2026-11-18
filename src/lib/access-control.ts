import type { Role } from "./types";

export const PANEL_HOME: Record<Role, string> = {
  customer: "/minhas-viagens",
  owner: "/painel/owner",
  provider: "/painel/provider",
  admin: "/admin",
};

export function isProtectedPath(pathname: string) {
  return ["/painel", "/admin", "/minhas-viagens", "/favoritos"].some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function canAccessPath(role: Role, pathname: string) {
  if (pathname === "/painel" || pathname.startsWith("/painel/")) {
    if (pathname === "/painel") return role === "owner" || role === "provider" || role === "admin";
    if (pathname === "/painel/owner" || pathname.startsWith("/painel/owner/")) {
      return role === "owner" || role === "admin";
    }
    if (pathname === "/painel/provider" || pathname.startsWith("/painel/provider/")) {
      return role === "provider" || role === "admin";
    }
    // Compatibilidade com URLs antigas: serão canonicalizadas pelo middleware.
    return role === "owner" || role === "provider" || role === "admin";
  }
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return role === "admin";
  if (pathname === "/minhas-viagens" || pathname.startsWith("/minhas-viagens/")) return role === "customer";
  return true;
}

export function postLoginPath(role: Role, next?: string | null) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return PANEL_HOME[role];
  return isProtectedPath(next) && !canAccessPath(role, next) ? PANEL_HOME[role] : next;
}
