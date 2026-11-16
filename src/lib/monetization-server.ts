// Leitura do modelo de monetização no SERVIDOR (Server Components).
// Separado de monetization.ts para não arrastar next/headers para o bundle cliente.

import { DEMO_MODE } from "./config";
import { REAL_FALLBACK, parseMonetizationValue } from "./monetization";
import { createSupabaseServerClient } from "./supabase/server";
import type { Monetization } from "./types";

export async function fetchMonetizationServer(): Promise<Monetization> {
  if (DEMO_MODE) return { model: "commission", percent: 10, monthlyFeeCents: 0 };
  const sb = createSupabaseServerClient();
  const { data } = await sb
    .from("platform_settings")
    .select("value")
    .eq("key", "monetization")
    .maybeSingle();
  if (!data) return REAL_FALLBACK;
  return parseMonetizationValue(data.value);
}
