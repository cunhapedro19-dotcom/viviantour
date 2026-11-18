// Configuração global do Viviantourr.
// Sem as variáveis do Supabase o app roda em MODO DEMONSTRAÇÃO
// (dados de exemplo, reservas simuladas no navegador).

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const DEFAULT_WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
export const DEMO_MODE = !isSupabaseConfigured;

export const SITE = {
  name: "Viviantourr",
  tagline: "Hospedagens, passeios e experiências em Arraial do Cabo",
  city: "Arraial do Cabo",
  state: "RJ",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  supportEmail: "contato@viviantourr.com.br",
} as const;

export const DEFAULT_COMMISSION_PERCENT = 10;
