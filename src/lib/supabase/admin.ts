import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Cliente com service_role — SOMENTE servidor.
 * Usado em rotinas de cron (sincronização iCal) e tarefas administrativas.
 * A chave SUPABASE_SERVICE_ROLE_KEY ignora o RLS; nunca importe em código cliente.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!url || !serviceKey) {
    throw new Error(
      "Supabase admin requer NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY"
    );
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
