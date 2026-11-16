// Modelo de monetização da plataforma — definido pela equipe em /admin/configuracoes
// e guardado em platform_settings (key = "monetization").
//
//   free         → gratuito inicialmente (construir a rede antes de monetizar)
//   commission   → comissão por reserva
//   subscription → mensalidade dos fornecedores
//   hybrid       → mensalidade + comissão por reserva
//
// Nos dois modos (demonstração e Supabase) a leitura retorna sempre algo válido;
// no modo demonstração o padrão é comissão de 10%, como no marketing original.
//
// Este arquivo é usado por componentes CLIENTE (não pode tocar next/headers).
// Server Components importam fetchMonetizationServer de ./monetization-server.

import { DEMO_MODE } from "./config";
import type { Monetization, MonetizationModel } from "./types";

export const MONETIZATION_LABEL: Record<MonetizationModel, string> = {
  free: "Gratuito",
  commission: "Comissão por reserva",
  subscription: "Mensalidade dos fornecedores",
  hybrid: "Modelo híbrido",
};

export const MONETIZATION_DESCRIPTION: Record<MonetizationModel, string> = {
  free:
    "Publicar e usar a plataforma está gratuito. Estamos construindo a rede de fornecedores e viajantes — você não paga nada por enquanto.",
  commission:
    "A plataforma retém uma porcentagem de cada reserva confirmada. Sem mensalidade e sem taxa de publicação: você paga só quando vende.",
  subscription:
    "Fornecedores pagam uma mensalidade fixa para anunciar e utilizar o sistema, sem comissão sobre as reservas.",
  hybrid:
    "Mensalidade fixa para usar o sistema + uma porcentagem pequena sobre cada reserva confirmada.",
};

export function modelAppliesCommission(model: MonetizationModel): boolean {
  return model === "commission" || model === "hybrid";
}

export function modelAppliesMonthlyFee(model: MonetizationModel): boolean {
  return model === "subscription" || model === "hybrid";
}

const DEMO_FALLBACK: Monetization = {
  model: "commission",
  percent: 10,
  monthlyFeeCents: 0,
};

export const REAL_FALLBACK: Monetization = {
  model: "free",
  percent: 10,
  monthlyFeeCents: 0,
};

export function parseMonetizationValue(value: unknown): Monetization {
  const v = (value ?? {}) as Record<string, unknown>;
  const model = (["free", "commission", "subscription", "hybrid"] as const).includes(
    v.model as MonetizationModel
  )
    ? (v.model as MonetizationModel)
    : "free";
  return {
    model,
    percent: Number(v.percent ?? 10),
    monthlyFeeCents: Number(v.monthly_fee_cents ?? 0),
  };
}

/** Leitura no navegador (componentes cliente do painel). */
export async function fetchMonetizationBrowser(): Promise<Monetization> {
  if (DEMO_MODE) return DEMO_FALLBACK;
  const { getSupabaseBrowserClient } = await import("./supabase/client");
  const sb = getSupabaseBrowserClient();
  const { data } = await sb
    .from("platform_settings")
    .select("value")
    .eq("key", "monetization")
    .maybeSingle();
  if (!data) return REAL_FALLBACK;
  return parseMonetizationValue(data.value);
}
